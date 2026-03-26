'use client'

import { useState } from 'react'

interface PasswordResetFormProps {
  userId: string
  userName: string
}

export default function PasswordResetForm({ userId, userName }: PasswordResetFormProps) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')

  async function handleReset() {
    if (password.length < 4) return
    setStatus('saving')
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword: password }),
      })
      if (!res.ok) throw new Error()
      setStatus('done')
      setPassword('')
      setTimeout(() => { setStatus('idle'); setOpen(false) }, 2000)
    } catch {
      setStatus('error')
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-ziwa-600 hover:text-ziwa-700 font-medium border border-ziwa-300 rounded-md px-3 py-1.5 hover:bg-ziwa-50 transition-colors whitespace-nowrap"
      >
        Reset password
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={`New password for ${userName}`}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-ziwa-500"
      />
      <button
        onClick={handleReset}
        disabled={password.length < 4 || status === 'saving'}
        className="text-xs bg-ziwa-500 hover:bg-ziwa-600 disabled:bg-gray-300 text-white font-medium rounded-md px-3 py-1.5 transition-colors whitespace-nowrap"
      >
        {status === 'saving' ? 'Saving...' : status === 'done' ? 'Done' : status === 'error' ? 'Failed' : 'Save'}
      </button>
      <button
        onClick={() => { setOpen(false); setPassword(''); setStatus('idle') }}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        Cancel
      </button>
    </div>
  )
}
