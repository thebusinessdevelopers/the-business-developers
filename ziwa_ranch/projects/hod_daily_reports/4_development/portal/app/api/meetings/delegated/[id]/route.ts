import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { createServerClient } from '@/lib/supabase-server'

export const PUT = withAuth(async ({ userId, request }, routeContext) => {
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id } = (await (routeContext as { params: Promise<{ id: string }> }).params)
  const body = await request.json()
  const supabase = createServerClient()

  const { data: meeting } = await supabase
    .from('hod_meetings')
    .select('id, secretary_user_id, status')
    .eq('id', id)
    .single()

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
  }

  if (meeting.secretary_user_id !== userId) {
    return NextResponse.json({ error: 'Not authorised — you are not the assigned secretary' }, { status: 403 })
  }

  if (meeting.status !== 'draft') {
    return NextResponse.json({ error: 'Meeting has already been submitted' }, { status: 400 })
  }

  const update = {
    attendance: body.attendance || [],
    additional_attendees: body.additional_attendees || [],
    agenda: body.agenda || [],
    general_notes: body.general_notes || null,
    per_hod_notes: body.per_hod_notes || {},
    decisions: body.decisions || [],
    suggested_next_date: body.suggested_next_date || null,
    closing_notes: body.closing_notes || null,
    end_time: body.end_time || null,
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('hod_meetings')
    .update(update)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (body.action_items && Array.isArray(body.action_items)) {
    const items = (body.action_items as Array<Record<string, unknown>>)
      .filter(ai => (ai.description as string)?.trim())
      .map(ai => ({
        meeting_id: id,
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

  const { data: admins } = await supabase
    .from('hod_users')
    .select('id')
    .eq('role', 'admin')

  if (admins && admins.length > 0) {
    const notifications = admins
      .filter(a => a.id !== userId)
      .map(a => ({
        recipient_user_id: a.id,
        type: 'action_item_submitted' as const,
        triggered_by_user_id: userId,
        body_preview: `Meeting record for ${body.date || 'unknown date'} submitted by secretary`,
        batch_key: `meeting:${id}`,
      }))

    if (notifications.length > 0) {
      const { error: notifError } = await Promise.resolve(supabase.from('hod_notifications').insert(notifications))
      if (notifError) {
        console.error('Secretary submission notification failed:', notifError.message)
        await Promise.resolve(supabase.from('hod_error_log').insert({
          error_code: 'notification_insert',
          error_message: notifError.message,
          error_context: { meetingId: id },
        })).catch(() => {})
      }
    }
  }

  return NextResponse.json({ ok: true })
})
