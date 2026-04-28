'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { MentionData, MentionUserGroup, ThreadMessage } from '../types'
import { addSessionFlushListener } from '../lib/session-flush'
import MentionInput from './MentionInput'

export interface ThreadViewProps {
  messages: ThreadMessage[]
  currentUserId: string
  userGroups: MentionUserGroup[]
  onSend?: (body: string, mentions: MentionData[], parentId?: string | null) => void | Promise<void>
  disabled?: boolean
  loading?: boolean
  draftKey?: string
}

interface ThreadDraftState {
  body: string
  mentions: MentionData[]
  replyingToId: string | null
}

function getThreadDraftStorageKey(draftKey: string): string {
  return `hod_thread_draft:${draftKey}`
}

function readThreadDraft(draftKey: string): ThreadDraftState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(getThreadDraftStorageKey(draftKey))
    if (!raw) return null
    return JSON.parse(raw) as ThreadDraftState
  } catch {
    return null
  }
}

function writeThreadDraft(draftKey: string, draft: ThreadDraftState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getThreadDraftStorageKey(draftKey), JSON.stringify(draft))
  } catch {
    // Ignore quota and transient browser storage errors.
  }
}

function clearThreadDraft(draftKey: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(getThreadDraftStorageKey(draftKey))
  } catch {
    // Ignore transient browser storage errors.
  }
}

function hasThreadDraft(
  body: string,
  mentions: MentionData[],
  replyingTo: ThreadMessage | null
): boolean {
  return Boolean(body.trim() || mentions.length > 0 || replyingTo)
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function renderBody(body: string, mentions: MentionData[]): ReactNode[] {
  if (!mentions || mentions.length === 0) return [body]

  const escaped = mentions.map(
    m => `@${m.display.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
  )
  const pattern = new RegExp(`(${escaped.join('|')})`, 'g')
  const parts = body.split(pattern)
  const mentionSet = new Set(escaped)

  return parts.map((part, i) =>
    mentionSet.has(part) ? (
      <span key={i} className="text-ziwa-600 font-medium">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

function MessageBubble({
  msg,
  isOwn,
  onReply,
}: {
  msg: ThreadMessage
  isOwn: boolean
  onReply: () => void
}) {
  if (msg.deleted_at) {
    return (
      <div className="py-2 px-3 text-xs text-gray-400 italic">
        Message deleted
      </div>
    )
  }

  const author = msg.author
  const isAdmin = msg.is_admin_note
  const isMdAuthor = author?.admin_title === 'MD'

  return (
    <div
      className={`py-3 px-4 rounded-lg ${
        isAdmin
          ? isMdAuthor
            ? 'border-l-2 border-purple-400 bg-purple-50/40'
            : 'border-l-2 border-indigo-300 bg-indigo-50/40'
          : isOwn
            ? 'bg-ziwa-50/40'
            : 'bg-white'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs flex items-center justify-center font-medium shrink-0">
          {author?.hod_name?.[0] ?? '?'}
        </span>
        <span className="text-sm font-medium text-gray-800">
          {author?.hod_name ?? 'Unknown'}
        </span>
        {isAdmin && author?.admin_title && (
          <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${
            isMdAuthor ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-600'
          }`}>
            {author.admin_title}
          </span>
        )}
        {!isAdmin && author?.department_name && (
          <span className="text-xs text-gray-400">{author.department_name}</span>
        )}
        {isOwn && (
          <span className="text-[10px] text-gray-400">You</span>
        )}
        <span className="text-[11px] text-gray-400 ml-auto shrink-0">
          {formatTime(msg.created_at)}
        </span>
      </div>

      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed pl-8">
        {renderBody(msg.body, msg.mentions)}
      </div>

      <div className="pl-8 mt-1">
        <button
          type="button"
          onClick={onReply}
          className="text-[11px] text-gray-400 hover:text-ziwa-600 transition-colors"
        >
          Reply
        </button>
      </div>
    </div>
  )
}

export default function ThreadView({
  messages,
  currentUserId,
  userGroups,
  onSend,
  disabled = false,
  loading = false,
  draftKey,
}: ThreadViewProps) {
  const [body, setBody] = useState('')
  const [composeMentions, setComposeMentions] = useState<MentionData[]>([])
  const [replyingTo, setReplyingTo] = useState<ThreadMessage | null>(null)
  const [sending, setSending] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const [pendingReplyId, setPendingReplyId] = useState<string | null>(null)
  const sendingRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef(body)
  const mentionsRef = useRef(composeMentions)
  const replyingToRef = useRef(replyingTo)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  useEffect(() => {
    bodyRef.current = body
  }, [body])

  useEffect(() => {
    mentionsRef.current = composeMentions
  }, [composeMentions])

  useEffect(() => {
    replyingToRef.current = replyingTo
  }, [replyingTo])

  useEffect(() => {
    if (!draftKey) return
    const draft = readThreadDraft(draftKey)
    if (!draft) return

    setBody(typeof draft.body === 'string' ? draft.body : '')
    setComposeMentions(Array.isArray(draft.mentions) ? draft.mentions : [])
    setPendingReplyId(
      typeof draft.replyingToId === 'string' && draft.replyingToId
        ? draft.replyingToId
        : null
    )
    setDraftRestored(
      Boolean(
        (typeof draft.body === 'string' && draft.body.trim()) ||
        (Array.isArray(draft.mentions) && draft.mentions.length > 0) ||
        draft.replyingToId
      )
    )
  }, [draftKey])

  useEffect(() => {
    if (!pendingReplyId) return
    const target = messages.find((message) => message.id === pendingReplyId) ?? null
    setReplyingTo(target)
    setPendingReplyId(null)
  }, [messages, pendingReplyId])

  useEffect(() => {
    if (!draftRestored) return
    const timeoutId = window.setTimeout(() => setDraftRestored(false), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [draftRestored])

  const persistDraft = useCallback(() => {
    if (!draftKey) return

    if (!hasThreadDraft(bodyRef.current, mentionsRef.current, replyingToRef.current)) {
      clearThreadDraft(draftKey)
      return
    }

    writeThreadDraft(draftKey, {
      body: bodyRef.current,
      mentions: mentionsRef.current,
      replyingToId: replyingToRef.current?.id ?? null,
    })
  }, [draftKey])

  useEffect(() => {
    if (!draftKey) return
    const timeoutId = window.setTimeout(() => persistDraft(), 250)
    return () => window.clearTimeout(timeoutId)
  }, [body, composeMentions, draftKey, persistDraft, replyingTo])

  useEffect(() => {
    if (!draftKey) return
    return addSessionFlushListener(() => persistDraft())
  }, [draftKey, persistDraft])

  useEffect(() => {
    if (!draftKey) return

    window.addEventListener('pagehide', persistDraft)
    window.addEventListener('beforeunload', persistDraft)
    return () => {
      window.removeEventListener('pagehide', persistDraft)
      window.removeEventListener('beforeunload', persistDraft)
    }
  }, [draftKey, persistDraft])

  async function handleSend() {
    const trimmed = body.trim()
    if (!trimmed || sendingRef.current) return

    if (!onSend) return
    sendingRef.current = true
    setSending(true)
    try {
      await onSend(trimmed, composeMentions, replyingTo?.id ?? null)
      setBody('')
      setComposeMentions([])
      setReplyingTo(null)
      setDraftRestored(false)
      if (draftKey) clearThreadDraft(draftKey)
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  const sorted = useMemo(
    () => [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [messages]
  )

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 p-2">
        {loading && messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">Loading messages…</p>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">No messages yet</p>
            <p className="text-xs text-gray-300 mt-1">
              Start the discussion below
            </p>
          </div>
        )}

        {sorted.map(msg => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isOwn={msg.author_user_id === currentUserId}
            onReply={() => setReplyingTo(msg)}
          />
        ))}
      </div>

      {onSend && <div className="border-t border-gray-200 p-3 bg-gray-50/50">
        {draftRestored && (
          <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Unsaved message draft restored.
          </div>
        )}

        {replyingTo && (
          <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
            <span>
              Replying to{' '}
              <span className="font-medium text-gray-700">
                {replyingTo.author?.hod_name ?? 'Unknown'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="text-gray-400 hover:text-gray-600 ml-auto"
            >
              Cancel
            </button>
          </div>
        )}

        <MentionInput
          value={body}
          mentions={composeMentions}
          onChange={(v, m) => {
            setBody(v)
            setComposeMentions(m)
          }}
          userGroups={userGroups}
          disabled={disabled || sending}
          rows={2}
          onSubmit={handleSend}
        />

        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || sending || !body.trim()}
            className="px-4 py-1.5 text-sm font-medium text-white bg-ziwa-600 rounded-md hover:bg-ziwa-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>}
    </div>
  )
}
