'use client'

import { useState } from 'react'
import { endClientSession } from '@/lib/session-client'

export default function LogoutButton() {
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await endClientSession({ source: 'manual_button', reason: 'manual_logout' })
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      className="text-xs text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
    >
      {loggingOut ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
