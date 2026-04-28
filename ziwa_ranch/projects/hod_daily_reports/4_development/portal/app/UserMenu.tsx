'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { endClientSession } from '@/lib/session-client'

interface UserMenuProps {
  hodName: string | null
  isGuest?: boolean
}

export default function UserMenu({ hodName, isGuest }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const initial = hodName?.[0]?.toUpperCase() ?? '?'

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function handleLogout() {
    setLoggingOut(true)
    setOpen(false)
    await endClientSession({ source: 'manual_menu', reason: 'manual_logout' })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-8 h-8 rounded-full bg-ziwa-100 text-ziwa-700 text-sm font-semibold flex items-center justify-center hover:bg-ziwa-200 transition-colors"
        title={hodName ?? 'Account'}
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          {hodName && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">{hodName}</p>
            </div>
          )}
          <div className="py-1">
            {!isGuest && (
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Change password
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
