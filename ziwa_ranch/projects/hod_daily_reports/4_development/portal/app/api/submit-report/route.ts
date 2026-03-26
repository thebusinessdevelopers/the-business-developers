import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateSession, logActivity } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { getHfClient } from '@/lib/hf'

const URGENCY_LABELS = ['urgent issue', 'maintenance needed', 'routine observation', 'positive highlight']

async function detectUrgency(reportId: string, text: string) {
  if (!text || text.trim().length < 10) return
  try {
    const hf = getHfClient()
    const result = await hf.zeroShotClassification({
      model: 'facebook/bart-large-mnli',
      inputs: text.trim(),
      parameters: { candidate_labels: URGENCY_LABELS },
    })

    const top = Array.isArray(result) ? result[0] : null
    if (!top) return

    const labels = (top as { labels?: string[] }).labels ?? []
    const scores = (top as { scores?: number[] }).scores ?? []

    const flags: Record<string, unknown> = {
      top_label: labels[0] ?? null,
      top_score: scores[0] ?? null,
      labels: labels.reduce((acc: Record<string, number>, label: string, i: number) => {
        acc[label] = scores[i] ?? 0
        return acc
      }, {} as Record<string, number>),
      analysed_at: new Date().toISOString(),
    }

    const supabase = createServerClient()
    await supabase
      .from('hod_daily_reports')
      .update({ ai_flags: flags })
      .eq('id', reportId)
  } catch (err) {
    console.error('Urgency detection failed (non-blocking):', err)
  }
}

const SESSION_COOKIE = 'hod_session'
const GUEST_COOKIE = 'hod_guest'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value
    const guestRaw = cookieStore.get(GUEST_COOKIE)?.value

    let userId: string | null = null

    if (sessionToken) {
      const user = await validateSession(sessionToken)
      if (!user) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
      }
      userId = user.id
    } else if (guestRaw) {
      try {
        JSON.parse(guestRaw) as { slug: string; name: string; ts: number }
      } catch {
        return NextResponse.json({ error: 'Invalid guest cookie' }, { status: 401 })
      }
    } else {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { departmentId, reportDate, reportData, submittedBy, stockConfig } = body as {
      departmentId: string
      reportDate: string
      reportData: Record<string, unknown>
      submittedBy: string
      stockConfig?: { stockType: string; stockField: string } | null
    }

    if (!departmentId || !reportDate || !reportData || !submittedBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServerClient()

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
      throw dbError
    }

    if (stockConfig) {
      const dayOfWeek = new Date(reportDate + 'T00:00:00').getDay()
      if (dayOfWeek === 1) {
        const stockItems = reportData[stockConfig.stockField]
        if (stockItems && Array.isArray(stockItems)) {
          try {
            await supabase.from('hod_verified_stock').insert({
              department_id: departmentId,
              stock_type: stockConfig.stockType,
              entry_date: reportDate,
              items: stockItems,
              entered_by: submittedBy,
            })
          } catch { /* stock write is best-effort */ }
        }
      }
    }

    if (reportRow?.id) {
      const origin = request.nextUrl.origin
      fetch(`${origin}/api/harvest-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: reportRow.id }),
      }).catch(() => {})

      // Link uploaded photos to this report
      const photoData = reportData.photos
      if (Array.isArray(photoData) && photoData.length > 0) {
        const mediaIds = photoData
          .map((p: Record<string, unknown>) => p.id)
          .filter(Boolean) as string[]
        if (mediaIds.length > 0) {
          Promise.resolve(
            supabase
              .from('hod_report_media')
              .update({ report_id: reportRow.id })
              .in('id', mediaIds)
          ).catch(() => {})
        }
      }

      const challengesText = String(reportData.challenges_successes ?? '')
      detectUrgency(reportRow.id, challengesText).catch(() => {})
    }

    logActivity(userId, 'report_submitted', {
      report_id: reportRow?.id,
      department_id: departmentId,
      report_date: reportDate,
      submitted_by: submittedBy,
      ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    }).catch(() => {})

    return NextResponse.json({ reportId: reportRow?.id })
  } catch (err: unknown) {
    const errObj = err as { code?: string; message?: string; details?: string } | null
    console.error('Submit report error:', errObj)

    const origin = request.nextUrl.origin
    fetch(`${origin}/api/log-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error_code: errObj?.code ?? 'UNKNOWN',
        error_message: errObj?.message ?? 'Unknown error',
        error_context: { route: 'submit-report', details: errObj?.details },
      }),
    }).catch(() => {})

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.', code: errObj?.code },
      { status: 500 }
    )
  }
}
