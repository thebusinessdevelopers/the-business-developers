import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/auth'
import { withAuth } from '@/lib/with-auth'
import { createServerClient } from '@/lib/supabase-server'
import { callOpenRouter, OPENROUTER_MODEL } from '@/lib/openrouter'
import { buildInternalHeaders } from '@hod/shared/lib/internal-route-auth'
import { isAnnouncementRecurringToday, type RecurrenceRule } from '@hod/shared/lib/announcement-recurrence'
import { harvestItemsFromReportId } from '@hod/shared/lib/harvest-items'
import { correctItemName, normaliseUnit } from '@hod/shared/config/stock'
import { toTitleCase } from '@hod/shared/lib/fuzzy-search'
import { createErrorNotification } from '@hod/shared/lib/error-notifications'

const URGENCY_LABELS = ['urgent issue', 'maintenance needed', 'routine observation', 'positive highlight'] as const

function getUniqueMediaIds(photoData: unknown): string[] {
  if (!Array.isArray(photoData)) return []
  const ids = photoData
    .map((p) => (p as Record<string, unknown>)?.id)
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
  return [...new Set(ids)]
}

function collectEntryMediaIds(reportData: Record<string, unknown>): string[] {
  const ids: string[] = []
  for (const value of Object.values(reportData)) {
    if (!Array.isArray(value)) continue
    for (const row of value) {
      if (typeof row !== 'object' || row === null) continue
      for (const field of Object.values(row as Record<string, unknown>)) {
        if (!Array.isArray(field)) continue
        for (const item of field) {
          const id = (item as Record<string, unknown>)?.id
          if (typeof id === 'string' && id.trim().length > 0) ids.push(id)
        }
      }
    }
  }
  return [...new Set(ids)]
}

async function linkPendingMediaToReport(
  supabase: ReturnType<typeof createServerClient>,
  params: {
    reportId: string
    reportDate: string
    departmentId: string
    mediaIds: string[]
    userId: string | null
  }
): Promise<string[]> {
  const { reportId, reportDate, departmentId, mediaIds, userId } = params
  if (mediaIds.length === 0) return []

  let query = supabase
    .from('hod_report_media')
    .update({ report_id: reportId })
    .eq('department_id', departmentId)
    .eq('report_date', reportDate)
    .is('report_id', null)
    .in('id', mediaIds)

  if (userId) {
    query = query.eq('uploaded_by_user_id', userId)
  }

  const { data, error } = await query.select('id')
  if (error) throw error
  return (data ?? []).map((row) => row.id as string)
}

const URGENCY_TOOL = {
  type: 'function' as const,
  function: {
    name: 'classify_urgency',
    description: 'Classify the urgency of an operational note',
    parameters: {
      type: 'object',
      properties: {
        label: {
          type: 'string',
          enum: URGENCY_LABELS as unknown as string[],
          description: 'The urgency category',
        },
        confidence: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Confidence score between 0 and 1',
        },
      },
      required: ['label', 'confidence'],
    },
  },
}

async function detectUrgency(reportId: string, text: string) {
  if (!text || text.trim().length < 10) return
  try {
    const result = await callOpenRouter({
      messages: [
        {
          role: 'system',
          content: `You classify daily operational notes from department heads at Ziwa Rhino And Wildlife Ranch in Uganda. Use the classify_urgency tool to return your classification.

Guidelines:
- "urgent issue": safety risks, equipment failure affecting operations, animal welfare concerns, security incidents, significant financial loss
- "maintenance needed": broken equipment, infrastructure repairs, supply shortages that aren't immediately critical
- "routine observation": normal operations, standard updates, minor notes
- "positive highlight": achievements, guest compliments, efficiency improvements, successful completion of projects

If the note says "nothing", "nil", "okay", or is trivially short, classify as "routine observation" with confidence 0.2.`,
        },
        { role: 'user', content: text.trim() },
      ],
      maxTokens: 100,
      temperature: 0.2,
      tools: [URGENCY_TOOL],
    })

    let parsed: { label: string; confidence: number } | null = null

    if (result.tool_calls?.length) {
      try {
        parsed = JSON.parse(result.tool_calls[0].function.arguments)
      } catch { /* fall through to content parse */ }
    }

    if (!parsed) {
      try {
        const jsonMatch = result.content.match(/\{[^}]+\}/)
        parsed = JSON.parse(jsonMatch?.[0] ?? '{}')
      } catch {
        return
      }
    }

    if (!parsed?.label) return

    const flags: Record<string, unknown> = {
      top_label: parsed.label,
      top_score: parsed.confidence ?? null,
      labels: { [parsed.label]: parsed.confidence ?? 1 },
      analysed_at: new Date().toISOString(),
      model: OPENROUTER_MODEL,
    }

    const supabase = createServerClient()
    await supabase
      .from('hod_daily_reports')
      .update({ ai_flags: flags })
      .eq('id', reportId)
  } catch (err) {
    console.error('Urgency detection failed (non-blocking):', err)
    try {
      const supabase = createServerClient()
      await supabase
        .from('hod_daily_reports')
        .update({ ai_flags: { error: true, error_message: err instanceof Error ? err.message : 'Unknown', attempted_at: new Date().toISOString() } })
        .eq('id', reportId)
    } catch {
      // Best-effort error tracking
    }
  }
}

export const POST = withAuth(async ({ user, userId, guest, request }) => {
    const body = await request.json()
    const { departmentId, reportDate, reportData, submittedBy, stockConfig, confirm_offset } = body as {
      departmentId: string
      reportDate: string
      reportData: Record<string, unknown>
      submittedBy: string
      stockConfig?: { stockType: string; stockField: string } | null
      confirm_offset?: boolean
    }

    if (!departmentId || !reportDate || !reportData || !submittedBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: department } = await supabase
      .from('hod_departments')
      .select('id, slug')
      .eq('id', departmentId)
      .single()

    if (!department) {
      return NextResponse.json({ error: 'Invalid department' }, { status: 400 })
    }

    if (user) {
      if (user.role !== 'hod' || user.department_id !== departmentId) {
        return NextResponse.json({ error: 'You are not allowed to submit for this department' }, { status: 403 })
      }
    } else if (guest) {
      if (guest.slug !== department.slug) {
        return NextResponse.json({ error: 'You are not allowed to submit for this department' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // forced_ack check: block submission if unacknowledged forced_ack announcements exist
    if (userId) {
      const now = new Date()
      const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' })
      const { data: forcedAcks } = await supabase
        .from('hod_announcements')
        .select('id, recurrence_rule')
        .eq('active', true)
        .eq('announcement_type', 'forced_ack')
        .or(`department_id.eq.${departmentId},department_id.is.null`)
        .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`)

      const activeForcedAcks = (forcedAcks ?? []).filter(a =>
        isAnnouncementRecurringToday(a.recurrence_rule as RecurrenceRule | null, now)
      )

      if (activeForcedAcks.length > 0) {
        const { data: acks } = await supabase
          .from('announcement_acknowledgements')
          .select('announcement_id')
          .eq('user_id', userId)
          .eq('recurrence_date', todayStr)
          .in('announcement_id', activeForcedAcks.map(a => a.id))

        const ackedIds = new Set((acks ?? []).map(a => a.announcement_id))
        const unacked = activeForcedAcks.filter(a => !ackedIds.has(a.id))
        if (unacked.length > 0) {
          console.error('Blocked submit: unacknowledged forced_ack announcements', {
            userId, departmentId, reportDate, unackedCount: unacked.length,
            unackedIds: unacked.map(a => a.id),
          })
          return NextResponse.json(
            { error: 'You must acknowledge all required announcements before submitting.' },
            { status: 403 }
          )
        }
      }
    }

    if (!confirm_offset) {
      const kampalaTodayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' })
      const msPerDay = 1000 * 60 * 60 * 24
      const lagDays = Math.round(
        (Date.parse(`${kampalaTodayStr}T00:00:00Z`) - Date.parse(`${reportDate}T00:00:00Z`)) / msPerDay,
      )
      if (lagDays >= 1) {
        return NextResponse.json(
          {
            error: lagDays >= 2
              ? `This report is dated ${lagDays} days before today (${kampalaTodayStr}). Please confirm you want to submit it.`
              : `This report is dated 1 day before today (${kampalaTodayStr}). Please confirm.`,
            needsConfirmOffset: true,
            lagDays,
          },
          { status: 400 },
        )
      }
    }

    const { data: existing } = await supabase
      .from('hod_daily_reports')
      .select('id')
      .eq('department_id', departmentId)
      .eq('report_date', reportDate)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: `A report for this department on ${reportDate} already exists.`, duplicateId: existing.id },
        { status: 409 }
      )
    }

    const { data: reportRow, error: dbError } = await supabase
      .from('hod_daily_reports')
      .insert({
        department_id: departmentId,
        submitted_by: submittedBy,
        submitted_by_user_id: userId,
        report_date: reportDate,
        report_data: reportData,
      })
      .select('id')
      .single()

    if (dbError) {
      if (dbError.code === '23505') {
        return NextResponse.json(
          { error: `A report for this department on ${reportDate} already exists.` },
          { status: 409 }
        )
      }
      if (userId) {
        createErrorNotification(supabase, {
          recipientUserId: userId,
          type: 'report_submit_failed',
          bodyPreview: `Your report for ${reportDate} could not be saved. Please try again.`,
          batchKey: `error:submit:${departmentId}:${reportDate}`,
        }).catch(() => {})
      }
      throw dbError
    }

    if (stockConfig) {
      const dayOfWeek = new Date(reportDate + 'T00:00:00').getDay()
      if (dayOfWeek === 1) {
        const stockItems = reportData[stockConfig.stockField]
        if (!stockItems || !Array.isArray(stockItems) || stockItems.length === 0) {
          return NextResponse.json({ error: 'Monday stock count is required but no items were submitted.' }, { status: 400 })
        }

        for (const entry of stockItems as { item?: string; quantity?: number; unit?: string }[]) {
          if (!entry.item?.trim()) {
            return NextResponse.json({ error: 'Every stock item must have a name.' }, { status: 400 })
          }
          if (typeof entry.quantity !== 'number' || entry.quantity <= 0) {
            return NextResponse.json({ error: `"${entry.item}" needs a quantity greater than zero.` }, { status: 400 })
          }
          if (!entry.unit?.trim()) {
            return NextResponse.json({ error: `"${entry.item}" needs a unit (e.g. kg, pieces, litres).` }, { status: 400 })
          }
        }

        const normalisedStock = (stockItems as { item: string; quantity: number; unit: string; cost_per_unit?: number }[]).map((entry) => ({
          ...entry,
          item: toTitleCase(correctItemName(entry.item)),
          unit: normaliseUnit(entry.unit),
        }))

        try {
          const { error: stockError } = await supabase.from('hod_verified_stock').insert({
            department_id: departmentId,
            stock_type: stockConfig.stockType,
            entry_date: reportDate,
            items: normalisedStock,
            entered_by: submittedBy,
          })
          if (stockError) {
            console.error('Stock insert failed:', stockError)
          }
        } catch (err) {
          console.error('Stock insert failed:', err)
        }
      }
    }

    let requestedMediaCount = 0
    let linkedMediaCount = 0

    if (reportRow?.id) {
      const origin = request.nextUrl.origin
      Promise.resolve(
        harvestItemsFromReportId(supabase, reportRow.id)
      ).catch((err) => {
        console.error('Harvest items failed:', err)
      })

      const entryMediaIds = collectEntryMediaIds(reportData)
      if (entryMediaIds.length > 0) {
        linkPendingMediaToReport(supabase, {
          reportId: reportRow.id,
          reportDate,
          departmentId,
          mediaIds: entryMediaIds,
          userId,
        }).catch((err) => {
          console.error('Entry media link update failed:', err)
        })
      }

      const mediaIds = getUniqueMediaIds(reportData.photos)
      requestedMediaCount = mediaIds.length
      if (mediaIds.length > 0) {
        Promise.resolve(
          linkPendingMediaToReport(supabase, {
            reportId: reportRow.id,
            reportDate,
            departmentId,
            mediaIds,
            userId,
          })
        ).then((linkedIds) => {
          linkedMediaCount = linkedIds.length
          if (linkedIds.length !== mediaIds.length) {
            console.warn('Some submitted media IDs were ignored by ownership/date guards', {
              requested: mediaIds.length,
              linked: linkedIds.length,
              reportId: reportRow.id,
              departmentId,
            })
          }
          for (const mediaId of linkedIds) {
            fetch(`${origin}/api/ai/process-media`, {
              method: 'POST',
              headers: buildInternalHeaders({ 'Content-Type': 'application/json' }),
              body: JSON.stringify({ media_id: mediaId }),
            }).catch((err) => {
              console.error('Queued media processing failed:', err)
            })
          }
        }).catch((err) => {
          console.error('Media link update failed:', err)
        })
      }

      const challengesText = String(reportData.challenges_successes ?? '')
      detectUrgency(reportRow.id, challengesText).catch(() => {})
    }

    logActivity(userId, 'report_submitted', {
      report_id: reportRow?.id,
      department_id: departmentId,
      report_date: reportDate,
      submitted_by: submittedBy,
      linked_media_count: linkedMediaCount,
      ignored_media_count: Math.max(0, requestedMediaCount - linkedMediaCount),
      ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    }).catch(() => {})

    return NextResponse.json({ reportId: reportRow?.id })
}, { allowGuest: true })
