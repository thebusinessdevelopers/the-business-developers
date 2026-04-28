'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import ThreadView from '@hod/shared/components/ThreadView'
import type { ThreadMessage, MentionData, MentionUserGroup } from '@/types'

interface ReportThreadProps {
  reportId: string
  currentUserId: string
  label?: string
  onBack?: () => void
  className?: string
}

export default function ReportThread({
  reportId,
  currentUserId,
  label,
  onBack,
  className = '',
}: ReportThreadProps) {
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [userGroups, setUserGroups] = useState<MentionUserGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/threads/${reportId}`)
      if (!res.ok) {
        if (res.status === 403) {
          setError('You don\u2019t have access to this discussion.')
          return
        }
        throw new Error('Failed to load')
      }
      const data = await res.json()
      if (mountedRef.current) setMessages(data.messages ?? [])
    } catch {
      if (mountedRef.current) setError('Could not load messages.')
    }
  }, [reportId])

  useEffect(() => {
    mountedRef.current = true
    async function init() {
      setLoading(true)
      setError(null)

      const [, groupsRes] = await Promise.all([
        fetchMessages(),
        fetch('/api/mention-users').then(r => r.ok ? r.json() : null).catch(() => null),
      ])

      if (mountedRef.current) {
        if (groupsRes?.groups) setUserGroups(groupsRes.groups)
        setLoading(false)
      }
    }
    init()
    return () => { mountedRef.current = false }
  }, [fetchMessages])

  async function handleSend(body: string, mentions: MentionData[], parentId?: string | null) {
    const res = await fetch(`/api/threads/${reportId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, mentions, parent_id: parentId }),
    })
    if (!res.ok) throw new Error('Send failed')
    await fetchMessages()
  }

  if (error) {
    return (
      <div className={className}>
        {onBack && (
          <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-900 mb-3 flex items-center gap-1">
            <span>&larr;</span> Back
          </button>
        )}
        <div className="text-center py-8">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {(onBack || label) && (
        <div className="flex items-center gap-3 mb-3">
          {onBack && (
            <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
              <span>&larr;</span> Back
            </button>
          )}
          {label && <h3 className="text-sm font-semibold text-gray-700">{label}</h3>}
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ minHeight: '320px' }}>
        <ThreadView
          messages={messages}
          currentUserId={currentUserId}
          userGroups={userGroups}
          onSend={handleSend}
          loading={loading}
          draftKey={`report-thread:${reportId}:${currentUserId}`}
        />
      </div>
    </div>
  )
}
