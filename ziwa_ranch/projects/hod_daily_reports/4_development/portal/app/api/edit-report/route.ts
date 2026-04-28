import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/auth'
import { withAuth } from '@/lib/with-auth'
import { createServerClient } from '@/lib/supabase-server'
import { EditHistoryEntry } from '@/types'
import { isWithinEditWindow } from '@/lib/submission-status'

function getUniqueMediaIds(photoData: unknown): string[] {
  if (!Array.isArray(photoData)) return []
  const ids = photoData
    .map((p) => (p as Record<string, unknown>)?.id)
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
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

export const POST = withAuth(async ({ user, userId, guest, request }) => {
    const body = await request.json()
    const { reportId, reportData, submittedBy } = body as {
      reportId: string
      reportData: Record<string, unknown>
      submittedBy: string
    }

    if (!reportId || !reportData || !submittedBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: existing } = await supabase
      .from('hod_daily_reports')
      .select('id, report_data, edit_history, department_id, report_date, submitted_by, submitted_by_user_id, hod_departments(slug)')
      .eq('id', reportId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }
    const existingDept = existing.hod_departments as unknown as { slug?: string } | { slug?: string }[] | null
    const existingDeptSlug = (Array.isArray(existingDept) ? existingDept[0]?.slug : existingDept?.slug) ?? null

    if (user) {
      if (user.role !== 'hod' || user.department_id !== existing.department_id) {
        return NextResponse.json({ error: 'You are not allowed to edit this report' }, { status: 403 })
      }
    } else if (guest) {
      if (!existingDeptSlug || guest.slug !== existingDeptSlug) {
        return NextResponse.json({ error: 'You are not allowed to edit this report' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (!isWithinEditWindow(existing.report_date as string)) {
      return NextResponse.json({ error: 'Editing window has closed for this report.' }, { status: 403 })
    }

    const prevData = existing.report_data as Record<string, unknown>
    const changes: { field: string; old_value: unknown; new_value: unknown }[] = []

    const allKeys = new Set([...Object.keys(prevData), ...Object.keys(reportData)])
    for (const key of allKeys) {
      const oldVal = prevData[key]
      const newVal = reportData[key]
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ field: key, old_value: oldVal, new_value: newVal })
      }
    }

    const priorSubmittedBy = String(existing.submitted_by ?? '').trim()
    const nextSubmittedBy = submittedBy.trim()
    const submittedByChanged = priorSubmittedBy !== nextSubmittedBy
    if (submittedByChanged) {
      changes.push({
        field: 'submitted_by',
        old_value: priorSubmittedBy,
        new_value: nextSubmittedBy,
      })
    }

    if (changes.length === 0) {
      return NextResponse.json({ reportId, noChanges: true })
    }

    const prevHistory = (existing.edit_history as EditHistoryEntry[] | null) ?? []
    const now = new Date().toISOString()
    const editorName = user?.hod_name ?? guest?.name ?? submittedBy
    const newEntry: EditHistoryEntry = {
      edited_by: editorName,
      edited_at: now,
      changes,
    }

    const normalizedEditor = editorName.trim().toLowerCase()
    const normalizedSubmittedBy = nextSubmittedBy.toLowerCase()
    const submittedByUserId = submittedByChanged
      ? (user && normalizedEditor === normalizedSubmittedBy ? user.id : null)
      : existing.submitted_by_user_id

    const { error: updateError } = await supabase
      .from('hod_daily_reports')
      .update({
        report_data: reportData,
        submitted_by: nextSubmittedBy,
        submitted_by_user_id: submittedByUserId,
        edited_at: now,
        last_edited_by: editorName,
        edit_history: [...prevHistory, newEntry],
        acknowledged_at: null,
        acknowledged_by: null,
        review_comments: null,
      })
      .eq('id', reportId)

    if (updateError) {
      console.error('Edit report DB error:', updateError)
      return NextResponse.json({ error: 'Failed to save edit' }, { status: 500 })
    }

    // Link any new photos
    let requestedMediaCount = 0
    let linkedMediaCount = 0
    const mediaIds = getUniqueMediaIds(reportData.photos)
    requestedMediaCount = mediaIds.length
    if (mediaIds.length > 0) {
      try {
        const linkedIds = await linkPendingMediaToReport(supabase, {
          reportId,
          reportDate: existing.report_date as string,
          departmentId: existing.department_id as string,
          mediaIds,
          userId,
        })
        linkedMediaCount = linkedIds.length
        if (linkedIds.length !== mediaIds.length) {
          console.warn('Some edited-report media IDs were ignored by ownership/date guards', {
            requested: mediaIds.length,
            linked: linkedIds.length,
            reportId,
            departmentId: existing.department_id,
          })
        }
      } catch (mediaErr) {
        console.error('Edit report media link failed:', mediaErr)
      }
    }

    logActivity(userId, 'report_edited', {
      report_id: reportId,
      department_id: existing.department_id,
      report_date: existing.report_date,
      edited_by: editorName,
      submitted_by_changed: submittedByChanged,
      submitted_by_old: submittedByChanged ? priorSubmittedBy : undefined,
      submitted_by_new: submittedByChanged ? nextSubmittedBy : undefined,
      submitted_by_user_id_policy: submittedByChanged
        ? (submittedByUserId ? 'mapped_to_editor' : 'set_null_for_manual_override')
        : 'preserved',
      linked_media_count: linkedMediaCount,
      ignored_media_count: Math.max(0, requestedMediaCount - linkedMediaCount),
      fields_changed: changes.map((c) => c.field),
      ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    }).catch(() => {})

    return NextResponse.json({ reportId })
}, { allowGuest: true })
