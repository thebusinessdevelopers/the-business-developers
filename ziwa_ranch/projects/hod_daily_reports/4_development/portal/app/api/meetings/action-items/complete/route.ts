import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { createServerClient } from '@/lib/supabase-server'
import { meetingBatchKey } from '@hod/shared/lib/notification-batch'

export const POST = withAuth(async ({ userId, request }) => {
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { actionItemId, explanation, completionDate, mediaId } = await request.json() as {
    actionItemId: string
    explanation: string
    completionDate: string
    mediaId?: string | null
  }

  if (!actionItemId || !explanation || !completionDate) {
    return NextResponse.json({ error: 'actionItemId, explanation, and completionDate are required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: item } = await supabase
    .from('hod_meeting_action_items')
    .select('id, status, meeting_id')
    .eq('id', actionItemId)
    .single()

  if (!item) {
    return NextResponse.json({ error: 'Action item not found' }, { status: 404 })
  }

  if (item.status !== 'open' && item.status !== 'rejected') {
    return NextResponse.json({ error: 'Only open or rejected items can be submitted' }, { status: 400 })
  }

  const { error } = await supabase
    .from('hod_meeting_action_items')
    .update({
      status: 'submitted',
      completion_explanation: explanation,
      completion_date: completionDate,
      completion_media_id: mediaId || null,
      completion_submitted_at: new Date().toISOString(),
      completion_submitted_by: userId,
    })
    .eq('id', actionItemId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: admins } = await supabase
    .from('hod_users')
    .select('id')
    .eq('role', 'admin')

  if (admins && admins.length > 0) {
    const batchKey = meetingBatchKey(item.meeting_id)
    const notifications = admins
      .filter(a => a.id !== userId)
      .map(a => ({
        recipient_user_id: a.id,
        type: 'action_item_submitted',
        triggered_by_user_id: userId,
        body_preview: 'Action item completion submitted for review',
        batch_key: batchKey,
      }))

    if (notifications.length > 0) {
      const { error: notifError } = await Promise.resolve(supabase.from('hod_notifications').insert(notifications))
      if (notifError) {
        console.error('Action item completion notification insert failed:', notifError.message)
        await Promise.resolve(supabase.from('hod_error_log').insert({
          error_code: 'notification_insert',
          error_message: notifError.message,
          error_context: { actionItemId, notificationCount: notifications.length },
        })).catch(() => {})
      }
    }
  }

  return NextResponse.json({ ok: true })
})
