'use client'

import { useState, useEffect } from 'react'

interface GlobalMessage {
  id: string
  body: string
  created_at: string
  author_name: string
  author_title: string | null
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function GlobalMessageBanner() {
  const [messages, setMessages] = useState<GlobalMessage[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/global-messages')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.messages?.length) setMessages(data.messages)
      })
      .catch(() => {})
  }, [])

  const visible = messages.filter(m => !dismissed.has(m.id))
  if (!visible.length) return null

  return (
    <div className="w-full max-w-md mb-4 space-y-2">
      {visible.map(msg => (
        <div
          key={msg.id}
          className="bg-white border border-indigo-200 rounded-xl px-4 py-3 shadow-sm relative"
        >
          <button
            type="button"
            onClick={() => setDismissed(prev => new Set(prev).add(msg.id))}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xs leading-none p-1"
            aria-label="Dismiss"
          >
            &times;
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] flex items-center justify-center font-bold shrink-0">
              {msg.author_name[0]}
            </span>
            <span className="text-xs font-medium text-indigo-700">
              {msg.author_name}
              {msg.author_title && <span className="text-indigo-400 font-normal"> · {msg.author_title}</span>}
            </span>
            <span className="text-[10px] text-gray-400 ml-auto">{formatTime(msg.created_at)}</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed pr-4">{msg.body}</p>
        </div>
      ))}
    </div>
  )
}
