'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NotificationBadge from '@hod/shared/components/NotificationBadge'
import { useAdminNotifications } from '@/hooks/useAdminNotifications'
import type { Notification } from '@/types'

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
    case 'review_comment': return 'reviewed a report'
    case 'reply': return 'replied'
    case 'global_message': return 'broadcast'
    default: return 'notification'
  }
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

export default function AdminNotifications() {
  const { notifications, unreadCount, markRead, markAllRead } = useAdminNotifications()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleNotificationClick(n: Notification) {
    if (!n.is_read) markRead([n.id])
    setOpen(false)
    if (n.source_report_id) {
      router.push(`/reports/${n.source_report_id}`)
    }
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="relative text-gray-500 hover:text-gray-900 transition-colors p-1"
        title="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <NotificationBadge count={unreadCount} className="absolute -top-1 -right-1" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="text-xs text-ziwa-600 hover:text-ziwa-700 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">No notifications yet</p>
                <p className="text-xs text-gray-300 mt-1">HOD replies and mentions will appear here</p>
              </div>
            ) : (
              notifications.slice(0, 30).map(n => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3 ${
                    !n.is_read ? 'bg-ziwa-50/30' : ''
                  }`}
                >
                  <span className="w-2 shrink-0 mt-1.5">
                    {!n.is_read && <span className="block w-2 h-2 rounded-full bg-ziwa-500" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[10px] flex items-center justify-center font-medium shrink-0">
                        {n.triggered_by?.hod_name?.[0] ?? '?'}
                      </span>
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {n.triggered_by?.hod_name ?? 'Someone'}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {notificationLabel(n.type)}
                      </span>
                    </div>
                    {n.body_preview && (
                      <p className="text-xs text-gray-500 truncate mt-0.5 pl-[26px]">{n.body_preview}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 pl-[26px]">
                      {n.report?.report_date && (
                        <span className="text-[10px] text-gray-400">{formatShortDate(n.report.report_date)}</span>
                      )}
                      <span className="text-[10px] text-gray-300">{formatRelativeTime(n.created_at)}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
