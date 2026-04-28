'use client'

import { useState, useRef, useEffect } from 'react'
import type { MentionData, MentionUserGroup } from '../types'
import MentionDropdown from './MentionDropdown'

export interface MentionInputProps {
  value: string
  mentions: MentionData[]
  onChange: (value: string, mentions: MentionData[]) => void
  userGroups: MentionUserGroup[]
  placeholder?: string
  disabled?: boolean
  className?: string
  rows?: number
  onSubmit?: () => void
}

function getActiveMention(
  text: string,
  cursorPos: number
): { query: string; start: number } | null {
  const before = text.slice(0, cursorPos)
  const atIdx = before.lastIndexOf('@')
  if (atIdx === -1) return null
  if (atIdx > 0 && !/\s/.test(before[atIdx - 1])) return null
  const query = before.slice(atIdx + 1)
  if (query.includes('\n')) return null
  return { query, start: atIdx }
}

function pruneStaleMentions(text: string, mentions: MentionData[]): MentionData[] {
  return mentions.filter(m => text.includes(`@${m.display}`))
}

function deduplicateMentions(mentions: MentionData[]): MentionData[] {
  const seen = new Set<string>()
  return mentions.filter(m => {
    const key = `${m.type}:${m.display}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default function MentionInput({
  value,
  mentions,
  onChange,
  userGroups,
  placeholder = 'Type a message… use @ to mention someone',
  disabled = false,
  className = '',
  rows = 3,
  onSubmit,
}: MentionInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [dropdown, setDropdown] = useState<{
    query: string
    start: number
    cursorPos: number
  } | null>(null)

  function checkMention(el: HTMLTextAreaElement, text: string) {
    const pos = el.selectionStart ?? 0
    const active = getActiveMention(text, pos)
    setDropdown(active ? { ...active, cursorPos: pos } : null)
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    const pruned = pruneStaleMentions(val, mentions)
    onChange(val, pruned)
    checkMention(e.target, val)
  }

  function handleSelect(mention: MentionData) {
    if (!dropdown) return
    const before = value.slice(0, dropdown.start)
    const after = value.slice(dropdown.cursorPos)
    const insert = `@${mention.display} `
    const newValue = before + insert + after
    const newMentions = deduplicateMentions([
      ...pruneStaleMentions(newValue, mentions),
      mention,
    ])
    onChange(newValue, newMentions)
    setDropdown(null)

    const newPos = dropdown.start + insert.length
    requestAnimationFrame(() => {
      ref.current?.focus()
      ref.current?.setSelectionRange(newPos, newPos)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape' && dropdown) {
      e.preventDefault()
      setDropdown(null)
    }
    if (e.key === 'Enter' && !e.shiftKey && !dropdown && onSubmit) {
      e.preventDefault()
      onSubmit()
    }
  }

  useEffect(() => {
    if (!dropdown) return
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current?.contains(e.target as Node)) return
      setDropdown(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdown])

  return (
    <div ref={wrapperRef} className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onSelect={() => ref.current && checkMention(ref.current, value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 resize-none ${className}`}
      />
      {dropdown && (
        <MentionDropdown
          groups={userGroups}
          query={dropdown.query}
          onSelect={handleSelect}
          onClose={() => setDropdown(null)}
        />
      )}
    </div>
  )
}
