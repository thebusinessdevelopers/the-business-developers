'use client'

import { useState } from 'react'

interface PasswordResetFormProps {
  userId: string
  userName: string
  canResetPasswords: boolean
}

export default function PasswordResetForm({
  userId,
  userName,
  canResetPasswords,
}: PasswordResetFormProps) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleReset() {
    if (password.length < 8) return
    setStatus('saving')
    setMessage('')
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword: password }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to set temporary password')
      }
      setStatus('done')
      setMessage('Temporary password saved.')
      setPassword('')
      setTimeout(() => {
        setStatus('idle')
        setOpen(false)
        setMessage('')
      }, 2000)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Failed to set temporary password')
    }
  }

  if (!canResetPasswords) {
    return <p className="text-xs text-gray-500 whitespace-nowrap">Senior admin required</p>
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true)
          setStatus('idle')
          setMessage('')
        }}
        className="text-xs text-ziwa-600 hover:text-ziwa-700 font-medium border border-ziwa-300 rounded-md px-3 py-1.5 hover:bg-ziwa-50 transition-colors whitespace-nowrap"
      >
        Set temporary password
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={`Temporary password for ${userName}`}
        minLength={8}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm w-full sm:w-44 focus:outline-none focus:ring-2 focus:ring-ziwa-500"
      />
      <button
        onClick={handleReset}
        disabled={password.length < 8 || status === 'saving'}
        className="text-xs bg-ziwa-500 hover:bg-ziwa-600 disabled:bg-gray-300 text-white font-medium rounded-md px-3 py-1.5 transition-colors whitespace-nowrap"
      >
        {status === 'saving' ? 'Saving...' : status === 'done' ? 'Saved' : status === 'error' ? 'Failed' : 'Save'}
      </button>
      <button
        onClick={() => {
          setOpen(false)
          setPassword('')
          setStatus('idle')
          setMessage('')
        }}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        Cancel
      </button>
      {message && (
        <p className={`text-xs w-full ${status === 'error' ? 'text-red-600' : 'text-green-700'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
