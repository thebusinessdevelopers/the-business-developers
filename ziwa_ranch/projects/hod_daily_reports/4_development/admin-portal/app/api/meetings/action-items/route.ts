import { NextResponse } from 'next/server'
import { withAdminAuth, logAdminActivity } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { meetingBatchKey } from '@hod/shared/lib/notification-batch'

export const POST = withAdminAuth(async ({ admin, request }) => {
  const { actionItemId, action, note, explanation, completionDate } = await request.json() as {
    actionItemId: string
    action: 'verify' | 'reject' | 'complete' | 'cancel'
    note?: string
    explanation?: string
    completionDate?: string
  }

  if (!actionItemId || !action) {
    return NextResponse.json({ error: 'actionItemId and action are required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: item } = await supabase
    .from('hod_meeting_action_items')
    .select('id, status, meeting_id, assigned_dept_id, assigned_user_id, description')
    .eq('id', actionItemId)
    .single()

  if (!item) {
    return NextResponse.json({ error: 'Action item not found' }, { status: 404 })
  }

  let update: Record<string, unknown> = {}
  let notificationType: string | null = null
  let notificationPreview = ''

  switch (action) {
    case 'verify':
      if (item.status !== 'submitted') {
        return NextResponse.json({ error: 'Only submitted items can be verified' }, { status: 400 })
      }
      update = {
        status: 'verified',
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
        review_note: note || null,
      }
      notificationType = 'action_item_verified'
      notificationPreview = 'Your action item has been verified as complete'
      break

    case 'reject':
      if (item.status !== 'submitted') {
        return NextResponse.json({ error: 'Only submitted items can be rejected' }, { status: 400 })
      }
      if (!note) {
        return NextResponse.json({ error: 'Rejection note is required' }, { status: 400 })
      }
      update = {
        status: 'open',
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
        review_note: note,
        completion_explanation: null,
        completion_date: null,
        completion_media_id: null,
        completion_submitted_at: null,
        completion_submitted_by: null,
      }
      notificationType = 'action_item_rejected'
      notificationPreview = `Action item rejected: ${note.slice(0, 80)}`
      break

    case 'complete':
      if (item.status !== 'open' && item.status !== 'rejected') {
        return NextResponse.json({ error: 'Only open or rejected items can be directly completed' }, { status: 400 })
      }
      if (!explanation || !completionDate) {
        return NextResponse.json({ error: 'explanation and completionDate are required for direct completion' }, { status: 400 })
      }
      update = {
        status: 'verified',
        completion_explanation: explanation,
        completion_date: completionDate,
        completion_submitted_at: new Date().toISOString(),
        completion_submitted_by: admin.id,
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
      }
      notificationType = 'action_item_completed'
      notificationPreview = 'Action item marked complete by admin'
      break

    case 'cancel':
      if (item.status === 'verified') {
        return NextResponse.json({ error: 'Verified items cannot be cancelled' }, { status: 400 })
      }
      update = {
        status: 'cancelled',
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
        review_note: note || null,
      }
      break

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { error } = await supabase
    .from('hod_meeting_action_items')
    .update(update)
    .eq('id', actionItemId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (notificationType) {
    const batchKey = meetingBatchKey(item.meeting_id)
    const recipientIds: string[] = []

    if (item.assigned_user_id && item.assigned_user_id !== admin.id) {
      recipientIds.push(item.assigned_user_id)
    } else if (item.assigned_dept_id) {
      const { data: deptUsers } = await supabase
        .from('hod_users')
        .select('id')
        .eq('department_id', item.assigned_dept_id)
        .eq('role', 'hod')

      if (deptUsers) {
        for (const u of deptUsers) {
          if (u.id !== admin.id) recipientIds.push(u.id)
        }
      }
    }

    if (recipientIds.length > 0) {
      const notifications = recipientIds.map(uid => ({
        recipient_user_id: uid,
        type: notificationType!,
        triggered_by_user_id: admin.id,
        body_preview: notificationPreview,
        batch_key: batchKey,
      }))
      const { error: notifError } = await Promise.resolve(supabase.from('hod_notifications').insert(notifications))
      if (notifError) {
        console.error('Action item notification insert failed:', notifError.message)
        await Promise.resolve(supabase.from('hod_error_log').insert({
          error_code: 'notification_insert',
          error_message: notifError.message,
          error_context: { actionItemId, action, notificationCount: notifications.length },
        })).catch(() => {})
      }
    }
  }

  await logAdminActivity(admin.id, `action_item_${action}`, {
    action_item_id: actionItemId,
    meeting_id: item.meeting_id,
    description: item.description.slice(0, 100),
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}, { capability: 'meeting_manage' })
