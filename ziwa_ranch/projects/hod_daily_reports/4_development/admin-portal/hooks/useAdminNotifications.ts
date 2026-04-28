'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Notification } from '@/types'

const POLL_INTERVAL = 30_000

interface UseAdminNotificationsResult {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  markRead: (ids: string[]) => Promise<void>
  markAllRead: () => Promise<void>
  refresh: () => Promise<void>
}

export function useAdminNotifications(): UseAdminNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)
  const lastKnownCount = useRef(0)
  const lastSeenTimestamp = useRef<string | null>(null)

  const fetchNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      if (!mountedRef.current) return
      const items: Notification[] = data.notifications ?? []
      setNotifications(items)
      setUnreadCount(data.unread_count ?? 0)
      lastKnownCount.current = data.unread_count ?? 0
      if (items.length > 0) lastSeenTimestamp.current = items[0].created_at
    } catch {
      // Next poll will retry
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  const checkForNew = useCallback(async () => {
    try {
      const params = lastSeenTimestamp.current ? `?since=${encodeURIComponent(lastSeenTimestamp.current)}` : ''
      const res = await fetch(`/api/notifications/check${params}`)
      if (!res.ok) return
      const data = await res.json()
      if (!mountedRef.current) return
      if (data.hasNew || data.unread_count !== lastKnownCount.current) {
        await fetchNotifications()
      }
    } catch {
      // Next poll will retry
    }
  }, [fetchNotifications])

  useEffect(() => {
    mountedRef.current = true
    fetchNotifications(true)
    const interval = setInterval(() => checkForNew(), POLL_INTERVAL)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [fetchNotifications, checkForNew])

  const markRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: ids }),
      })
      setNotifications(prev =>
        prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => {
        const next = Math.max(0, prev - ids.length)
        lastKnownCount.current = next
        return next
      })
    } catch {
      // Will be corrected on next poll
    }
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
      lastKnownCount.current = 0
    } catch {
      // Will be corrected on next poll
    }
  }, [])

  return { notifications, unreadCount, loading, markRead, markAllRead, refresh: fetchNotifications }
}
