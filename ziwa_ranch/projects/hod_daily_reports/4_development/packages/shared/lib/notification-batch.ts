import type { Notification } from '../types'

export interface NotificationGroup {
  batchKey: string
  latest: Notification
  count: number
  allRead: boolean
  ids: string[]
}

/**
 * Groups notifications by batch_key. Un-batched items remain standalone.
 * Within each group, the most recent notification is surfaced as `latest`.
 */
export function groupNotifications(
  notifications: Notification[]
): (Notification | NotificationGroup)[] {
  const groups = new Map<string, Notification[]>()
  const standalone: Notification[] = []

  for (const n of notifications) {
    if (n.batch_key) {
      const arr = groups.get(n.batch_key)
      if (arr) arr.push(n)
      else groups.set(n.batch_key, [n])
    } else {
      standalone.push(n)
    }
  }

  const result: (Notification | NotificationGroup)[] = []

  for (const n of standalone) {
    result.push(n)
  }

  for (const [batchKey, items] of groups) {
    if (items.length === 1) {
      result.push(items[0])
      continue
    }
    const sorted = items.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    result.push({
      batchKey,
      latest: sorted[0],
      count: sorted.length,
      allRead: sorted.every((n) => n.is_read),
      ids: sorted.map((n) => n.id),
    })
  }

  result.sort((a, b) => {
    const aTime = 'created_at' in a ? a.created_at : a.latest.created_at
    const bTime = 'created_at' in b ? b.created_at : b.latest.created_at
    return new Date(bTime).getTime() - new Date(aTime).getTime()
  })

  return result
}

export function isNotificationGroup(
  item: Notification | NotificationGroup
): item is NotificationGroup {
  return 'batchKey' in item
}

/**
 * Generates a batch_key for thread-based notifications.
 */
export function threadBatchKey(threadId: string): string {
  return `thread:${threadId}`
}

export function reportBatchKey(reportId: string): string {
  return `report:${reportId}`
}

export function meetingBatchKey(meetingId: string): string {
  return `meeting:${meetingId}`
}
