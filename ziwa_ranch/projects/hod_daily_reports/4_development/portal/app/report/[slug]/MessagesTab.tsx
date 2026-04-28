'use client'

import { useMemo, useState } from 'react'
import type { Notification } from '@/types'
import NotificationBadge from '@hod/shared/components/NotificationBadge'
import ReportThread from './ReportThread'

interface MessagesTabProps {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  currentUserId: string
  onMarkRead: (ids: string[]) => Promise<void>
  onMarkAllRead: (scope?: 'messages' | 'meetings' | 'all') => Promise<void>
}

interface ConversationGroup {
  reportId: string
  reportDate: string
  latestMessage: string
  latestAt: string
  triggeredByName: string
  unreadCount: number
  notificationIds: string[]
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function notificationLabel(type: string): string {
  switch (type) {
    case 'mention': return 'mentioned you'
    case 'review_comment': return 'reviewed your report'
    case 'reply': return 'replied'
    case 'global_message': return 'broadcast message'
    case 'announcement_broadcast': return 'announcement'
    case 'report_submit_failed': return 'Report submission failed'
    case 'media_upload_failed': return 'Photo upload failed'
    case 'booking_save_failed': return 'Booking save failed'
    default: return 'message'
  }
}

const BROADCAST_TYPES = new Set(['global_message', 'announcement_broadcast'])
const ERROR_TYPES = new Set(['report_submit_failed', 'media_upload_failed', 'booking_save_failed'])

export default function MessagesTab({
  notifications,
  unreadCount,
  loading,
  currentUserId,
  onMarkRead,
  onMarkAllRead,
}: MessagesTabProps) {
  const [activeReportId, setActiveReportId] = useState<string | null>(null)

  const conversations = useMemo(() => {
    const groups = new Map<string, ConversationGroup>()

    for (const n of notifications) {
      if (!n.source_report_id) continue

      const existing = groups.get(n.source_report_id)
      if (existing) {
        if (new Date(n.created_at) > new Date(existing.latestAt)) {
          existing.latestMessage = n.body_preview ?? ''
          existing.latestAt = n.created_at
          existing.triggeredByName = n.triggered_by?.hod_name ?? 'Someone'
        }
        if (!n.is_read) existing.unreadCount++
        existing.notificationIds.push(n.id)
      } else {
        groups.set(n.source_report_id, {
          reportId: n.source_report_id,
          reportDate: n.report?.report_date ?? '',
          latestMessage: n.body_preview ?? '',
          latestAt: n.created_at,
          triggeredByName: n.triggered_by?.hod_name ?? 'Someone',
          unreadCount: n.is_read ? 0 : 1,
          notificationIds: [n.id],
        })
      }
    }

    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
    )
  }, [notifications])

  const broadcasts = useMemo(
    () => notifications.filter(n => BROADCAST_TYPES.has(n.type) && !n.source_report_id),
    [notifications]
  )

  const errorNotifs = useMemo(
    () => notifications.filter(n => ERROR_TYPES.has(n.type)),
    [notifications]
  )

  function handleOpenThread(conv: ConversationGroup) {
    const unreadIds = conv.notificationIds.filter(
      id => notifications.find(n => n.id === id && !n.is_read)
    )
    if (unreadIds.length) onMarkRead(unreadIds)
    setActiveReportId(conv.reportId)
  }

  if (activeReportId) {
    const conv = conversations.find(c => c.reportId === activeReportId)
    return (
      <ReportThread
        reportId={activeReportId}
        currentUserId={currentUserId}
        label={conv?.reportDate ? `Report — ${formatShortDate(conv.reportDate)}` : 'Discussion'}
        onBack={() => setActiveReportId(null)}
      />
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-400">Loading messages…</p>
      </div>
    )
  }

  if (conversations.length === 0 && broadcasts.length === 0 && errorNotifs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">No messages yet</p>
        <p className="text-xs text-gray-400 mt-1">
          When someone mentions you or comments on your reports, messages will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onMarkAllRead('messages')}
            className="text-xs text-ziwa-600 hover:text-ziwa-700 font-medium"
          >
            Mark all as read
          </button>
        </div>
      )}

      {/* Error notifications */}
      {errorNotifs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wide">Errors</h3>
          {errorNotifs.map(n => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 ${n.is_read ? 'border-red-200 bg-white' : 'border-red-300 bg-red-50/50'}`}
              onClick={() => { if (!n.is_read) onMarkRead([n.id]) }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' && !n.is_read) onMarkRead([n.id]) }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium rounded px-1.5 py-0.5 text-red-700 bg-red-100">
                  {notificationLabel(n.type)}
                </span>
                {!n.is_read && <span className="size-2 rounded-full bg-red-500 shrink-0" />}
                <span className="text-xs text-gray-400 ml-auto">{formatRelativeTime(n.created_at)}</span>
              </div>
              <p className="text-sm text-gray-700">{n.body_preview}</p>
            </div>
          ))}
        </div>
      )}

      {/* Broadcasts (global messages + announcement broadcasts) */}
      {broadcasts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Broadcasts</h3>
          {broadcasts.map(n => (
            <div key={n.id} className={`rounded-xl border p-4 ${n.is_read ? 'border-gray-200 bg-white' : 'border-ziwa-200 bg-ziwa-50/30'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium rounded px-1.5 py-0.5 ${
                  n.type === 'announcement_broadcast' ? 'text-amber-700 bg-amber-100' : 'text-indigo-600 bg-indigo-100'
                }`}>
                  {n.type === 'announcement_broadcast' ? 'Announcement' : 'Broadcast'}
                </span>
                <span className="text-xs text-gray-400 ml-auto">{formatRelativeTime(n.created_at)}</span>
              </div>
              <p className="text-sm text-gray-700">{n.body_preview}</p>
              <p className="text-xs text-gray-400 mt-1">From {n.triggered_by?.hod_name ?? 'Admin'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Conversations grouped by report */}
      {conversations.map(conv => (
        <button
          key={conv.reportId}
          type="button"
          onClick={() => handleOpenThread(conv)}
          className={`w-full text-left rounded-xl border p-4 transition-colors hover:bg-gray-50 ${
            conv.unreadCount > 0 ? 'border-ziwa-200 bg-ziwa-50/30' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                {conv.reportDate ? formatShortDate(conv.reportDate) : 'Report'}
              </span>
              {conv.unreadCount > 0 && <NotificationBadge count={conv.unreadCount} />}
            </div>
            <span className="text-xs text-gray-400">{formatRelativeTime(conv.latestAt)}</span>
          </div>
          <p className="text-sm text-gray-600 truncate">{conv.triggeredByName} {notificationLabel(notifications.find(n => n.source_report_id === conv.reportId)?.type ?? '')}</p>
          {conv.latestMessage && (
            <p className="text-xs text-gray-400 mt-1 truncate">{conv.latestMessage}</p>
          )}
        </button>
      ))}
    </div>
  )
}
