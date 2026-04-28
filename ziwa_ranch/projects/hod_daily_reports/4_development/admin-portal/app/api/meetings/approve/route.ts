import { NextResponse } from 'next/server'
import { withAdminAuth, logAdminActivity } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { meetingBatchKey } from '@hod/shared/lib/notification-batch'

export const POST = withAdminAuth(async ({ admin, request }) => {
  const { meetingId } = await request.json() as { meetingId: string }

  if (!meetingId) {
    return NextResponse.json({ error: 'meetingId is required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: meeting } = await supabase
    .from('hod_meetings')
    .select('id, status, date, meeting_type')
    .eq('id', meetingId)
    .single()

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
  }

  if (meeting.status !== 'submitted') {
    return NextResponse.json({ error: 'Only submitted meetings can be approved' }, { status: 400 })
  }

  const { error } = await supabase
    .from('hod_meetings')
    .update({
      status: 'approved',
      approved_by: admin.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', meetingId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: hodUsers } = await supabase
    .from('hod_users')
    .select('id')
    .eq('role', 'hod')

  const batchKey = meetingBatchKey(meetingId)
  const notifications: Array<{
    recipient_user_id: string
    type: string
    triggered_by_user_id: string
    body_preview: string
    batch_key: string
  }> = []

  if (hodUsers) {
    for (const u of hodUsers) {
      notifications.push({
        recipient_user_id: u.id,
        type: 'meeting_approved',
        triggered_by_user_id: admin.id,
        body_preview: `Meeting record for ${meeting.date} has been approved`,
        batch_key: batchKey,
      })
    }
  }

  const { data: actionItems } = await supabase
    .from('hod_meeting_action_items')
    .select('id, assigned_dept_id, assigned_user_id, description')
    .eq('meeting_id', meetingId)

  if (actionItems) {
    for (const item of actionItems) {
      if (item.assigned_user_id) {
        const exists = notifications.find(n => n.recipient_user_id === item.assigned_user_id && n.type === 'action_item_assigned')
        if (!exists) {
          notifications.push({
            recipient_user_id: item.assigned_user_id,
            type: 'action_item_assigned',
            triggered_by_user_id: admin.id,
            body_preview: `Action item assigned: ${item.description.slice(0, 100)}`,
            batch_key: batchKey,
          })
        }
      } else if (item.assigned_dept_id) {
        const { data: deptUsers } = await supabase
          .from('hod_users')
          .select('id')
          .eq('department_id', item.assigned_dept_id)
          .eq('role', 'hod')

        if (deptUsers) {
          for (const u of deptUsers) {
            const exists = notifications.find(n => n.recipient_user_id === u.id && n.type === 'action_item_assigned')
            if (!exists) {
              notifications.push({
                recipient_user_id: u.id,
                type: 'action_item_assigned',
                triggered_by_user_id: admin.id,
                body_preview: `Action item assigned to your department: ${item.description.slice(0, 80)}`,
                batch_key: batchKey,
              })
            }
          }
        }
      }
    }
  }

  if (notifications.length > 0) {
    const { error: notifError } = await Promise.resolve(supabase.from('hod_notifications').insert(notifications))
    if (notifError) {
      console.error('Meeting approval notification insert failed:', notifError.message)
      await Promise.resolve(supabase.from('hod_error_log').insert({
        error_code: 'notification_insert',
        error_message: notifError.message,
        error_context: { meetingId, notificationCount: notifications.length },
      })).catch(() => {})
    }
  }

  await logAdminActivity(admin.id, 'meeting_approved', {
    meeting_id: meetingId,
    date: meeting.date,
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}, { capability: 'meeting_manage' })
