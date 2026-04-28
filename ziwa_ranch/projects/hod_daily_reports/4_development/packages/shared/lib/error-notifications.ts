import type { SupabaseClient } from '@supabase/supabase-js'
import type { NotificationType } from '../types'

interface ErrorNotificationParams {
  recipientUserId: string
  type: Extract<NotificationType, 'report_submit_failed' | 'media_upload_failed' | 'booking_save_failed'>
  bodyPreview: string
  batchKey?: string
}

/**
 * Creates a user-facing error notification. Uses batch_key deduplication:
 * skips insert if an unread notification with the same batch_key already exists.
 */
export async function createErrorNotification(
  supabase: SupabaseClient,
  params: ErrorNotificationParams
): Promise<void> {
  const { recipientUserId, type, bodyPreview, batchKey } = params

  if (batchKey) {
    const { count } = await supabase
      .from('hod_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_user_id', recipientUserId)
      .eq('batch_key', batchKey)
      .eq('is_read', false)

    if (count && count > 0) return
  }

  await supabase.from('hod_notifications').insert({
    recipient_user_id: recipientUserId,
    type,
    category: 'error',
    body_preview: bodyPreview,
    batch_key: batchKey ?? null,
  })
}
