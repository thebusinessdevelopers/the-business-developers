import { NextResponse } from 'next/server'
import { withAdminAuth, logAdminActivity } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { meetingBatchKey } from '@hod/shared/lib/notification-batch'

export const GET = withAdminAuth(async ({ request }) => {
  const supabase = createServerClient()
  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 50)
  const offset = Number(url.searchParams.get('offset')) || 0

  let query = supabase
    .from('hod_meetings')
    .select('id, meeting_type, special_title, date, status, submitted_at, approved_at, attendance, created_by, secretary_user_id')
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const meetingIds = (data ?? []).map(m => m.id)
  const actionCounts: Record<string, number> = {}
  if (meetingIds.length > 0) {
    const { data: counts } = await supabase
      .from('hod_meeting_action_items')
      .select('meeting_id')
      .in('meeting_id', meetingIds)

    if (counts) {
      for (const row of counts) {
        actionCounts[row.meeting_id] = (actionCounts[row.meeting_id] || 0) + 1
      }
    }
  }

  const meetings = (data ?? []).map(m => ({
    ...m,
    action_item_count: actionCounts[m.id] || 0,
  }))

  return NextResponse.json({ meetings })
})

export const POST = withAdminAuth(async ({ admin, request }) => {
  const body = await request.json()
  const isDelegation = body.delegate === true

  const supabase = createServerClient()

  const meetingData = {
    meeting_type: body.meeting_type,
    special_title: body.special_title || null,
    date: body.date,
    start_time: body.start_time || null,
    end_time: body.end_time || null,
    secretary_user_id: body.secretary_user_id || null,
    secretary_custom_name: body.secretary_custom_name || null,
    attendance: body.attendance || [],
    additional_attendees: body.additional_attendees || [],
    agenda: body.agenda || [],
    general_notes: body.general_notes || null,
    per_hod_notes: body.per_hod_notes || {},
    decisions: body.decisions || [],
    suggested_next_date: body.suggested_next_date || null,
    closing_notes: body.closing_notes || null,
    media_ids: body.media_ids || [],
    status: isDelegation ? 'draft' : 'submitted',
    submitted_at: isDelegation ? null : new Date().toISOString(),
    created_by: admin.id,
  }

  const { data: meeting, error } = await supabase
    .from('hod_meetings')
    .insert(meetingData)
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!isDelegation && body.action_items && Array.isArray(body.action_items)) {
    const items = body.action_items.map((ai: Record<string, unknown>) => ({
      meeting_id: meeting.id,
      description: ai.description,
      assignee_type: ai.assignee_type,
      assigned_dept_id: ai.assigned_dept_id || null,
      assigned_sub_dept: ai.assigned_sub_dept || null,
      assigned_user_id: ai.assigned_user_id || null,
      deadline: ai.deadline || null,
      priority: ai.priority || 'medium',
    }))

    if (items.length > 0) {
      await supabase.from('hod_meeting_action_items').insert(items)
    }
  }

  if (isDelegation && body.secretary_user_id) {
    const batchKey = meetingBatchKey(meeting.id)
    const { error: notifError } = await Promise.resolve(supabase.from('hod_notifications').insert({
      recipient_user_id: body.secretary_user_id,
      type: 'secretary_invited',
      triggered_by_user_id: admin.id,
      body_preview: `You have been invited to record the ${body.meeting_type} meeting on ${body.date}`,
      batch_key: batchKey,
    }))
    if (notifError) {
      console.error('Secretary invitation notification failed:', notifError.message)
      await Promise.resolve(supabase.from('hod_error_log').insert({
        error_code: 'notification_insert',
        error_message: notifError.message,
        error_context: { meetingId: meeting.id, secretaryUserId: body.secretary_user_id },
      })).catch(() => {})
    }
  }

  await logAdminActivity(admin.id, isDelegation ? 'meeting_delegated' : 'meeting_submitted', {
    meeting_id: meeting.id,
    meeting_type: body.meeting_type,
    date: body.date,
    ...(isDelegation ? { secretary_user_id: body.secretary_user_id } : {}),
  }).catch(() => {})

  return NextResponse.json({ id: meeting.id })
}, { capability: 'meeting_manage' })
