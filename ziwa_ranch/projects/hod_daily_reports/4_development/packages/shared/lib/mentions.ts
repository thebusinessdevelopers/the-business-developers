import type { SupabaseClient } from '@supabase/supabase-js'
import type { MentionData } from '../types'
import { threadBatchKey } from './notification-batch'

interface ProcessMentionsParams {
  supabase: SupabaseClient
  threadId: string
  reportId: string
  authorUserId: string
  body: string
  mentions: MentionData[]
  parentId: string | null
  isAdminNote: boolean
}

/**
 * After a thread message is inserted, expand mentions into individual
 * notification rows. Priority order (first match wins per recipient):
 *   review_comment → reply → mention → global_message
 */
export async function processMessageMentions({
  supabase,
  threadId,
  reportId,
  authorUserId,
  body,
  mentions,
  parentId,
  isAdminNote,
}: ProcessMentionsParams): Promise<void> {
  const preview = body.slice(0, 120)
  const batchKey = threadBatchKey(threadId)
  const notifications: Array<{
    recipient_user_id: string
    type: string
    source_thread_id: string
    source_report_id: string
    triggered_by_user_id: string
    body_preview: string
    batch_key: string
  }> = []
  const notifiedUserIds = new Set<string>()

  function addNotification(userId: string, type: string) {
    if (userId === authorUserId || notifiedUserIds.has(userId)) return
    notifiedUserIds.add(userId)
    notifications.push({
      recipient_user_id: userId,
      type,
      source_thread_id: threadId,
      source_report_id: reportId,
      triggered_by_user_id: authorUserId,
      body_preview: preview,
      batch_key: batchKey,
    })
  }

  // Admin posts a top-level comment → report author gets review_comment
  if (isAdminNote && !parentId) {
    const { data: report } = await supabase
      .from('hod_daily_reports')
      .select('submitted_by_user_id')
      .eq('id', reportId)
      .single()
    if (report?.submitted_by_user_id) {
      addNotification(report.submitted_by_user_id, 'review_comment')
    }
  }

  // Reply → parent message author gets reply notification
  if (parentId) {
    const { data: parent } = await supabase
      .from('hod_report_threads')
      .select('author_user_id')
      .eq('id', parentId)
      .single()
    if (parent) {
      addNotification(parent.author_user_id, 'reply')
    }
  }

  // Direct user / department mentions
  for (const mention of mentions) {
    if (mention.type === 'user' && mention.user_id) {
      addNotification(mention.user_id, 'mention')
    } else if (mention.type === 'department' && mention.department_id) {
      const { data: deptUsers } = await supabase
        .from('hod_users')
        .select('id')
        .eq('department_id', mention.department_id)
      if (deptUsers) deptUsers.forEach(u => addNotification(u.id, 'mention'))
    }
  }

  // Group mentions (@everyone, @admins) → global_message
  for (const mention of mentions) {
    if (mention.type === 'group') {
      let query = supabase.from('hod_users').select('id')
      if (mention.group === 'admins') query = query.eq('role', 'admin')
      const { data: users } = await query
      if (users) users.forEach(u => addNotification(u.id, 'global_message'))
    }
  }

  if (notifications.length > 0) {
    const { error: notifError } = await Promise.resolve(
      supabase.from('hod_notifications').insert(notifications)
    )
    if (notifError) {
      console.error('Mention notification insert failed:', notifError.message)
    }
  }
}
