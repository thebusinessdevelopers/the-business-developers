'use client'

import { useState, useEffect, useRef } from 'react'

const AUTO_HIDE_MS = 30_000

export default function PasswordRevealButton({
  passwordDisplay,
}: {
  passwordDisplay: string | null
}) {
  const [revealed, setRevealed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!passwordDisplay) {
    return <span className="text-xs text-gray-400 italic">No stored password</span>
  }

  const reveal = () => {
    setRevealed(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setRevealed(false), AUTO_HIDE_MS)
  }

  const hide = () => {
    setRevealed(false)
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  const copy = async () => {
    await navigator.clipboard.writeText(passwordDisplay)
    hide()
  }

  if (!revealed) {
    return (
      <button
        onClick={reveal}
        className="text-xs text-purple-600 hover:text-purple-700 font-medium"
      >
        Reveal
      </button>
    )
  }

  return (
    <span className="inline-flex items-center gap-2">
      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">
        {passwordDisplay}
      </code>
      <button
        onClick={copy}
        className="text-xs text-purple-600 hover:text-purple-700 font-medium"
      >
        Copy
      </button>
      <button onClick={hide} className="text-xs text-gray-400 hover:text-gray-600">
        Hide
      </button>
    </span>
  )
}
