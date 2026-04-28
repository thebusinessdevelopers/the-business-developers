'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', label: 'Overview', fullOnly: false },
  { href: '/reports', label: 'Reports', fullOnly: false },
  { href: '/operations', label: 'Operations', fullOnly: false },
  { href: '/analysis', label: 'Analysis', fullOnly: false },
  { href: '/meetings', label: 'Meetings', fullOnly: true },
  { href: '/accommodation', label: 'Rooms', fullOnly: true },
  { href: '/stock', label: 'Stock', fullOnly: true },
  { href: '/compliance', label: 'Compliance', fullOnly: true },
  { href: '/activity', label: 'Activity', fullOnly: true, mdOnly: true },
  { href: '/announcements', label: 'Announce', fullOnly: true },
  { href: '/users', label: 'Users', fullOnly: true, mdOnly: true },
  { href: '/exports', label: 'Exports', fullOnly: true },
  { href: '/errors', label: 'Errors', fullOnly: true, mdOnly: true },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href)
}

interface NavMenuProps {
  notifications: React.ReactNode
  signOut: React.ReactNode
  accessLevel: 'full' | 'viewer'
  adminTier?: string
}

export default function NavMenu({ notifications, signOut, accessLevel, adminTier }: NavMenuProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isMd = adminTier === 'md'
  const menuRef = useRef<HTMLDivElement>(null)
  const navItems = NAV_ITEMS.filter((item) => (!item.fullOnly || accessLevel === 'full') && (!item.mdOnly || isMd))

  const activeLabel = navItems.find((item) => isActive(pathname, item.href))?.label ?? 'Menu'

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(false))
    return () => cancelAnimationFrame(id)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div ref={menuRef}>
      <div className="flex items-center gap-2">
        {notifications}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-2 py-1.5 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
          <span className="text-sm font-medium">{activeLabel}</span>
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full bg-white border-b border-gray-200 shadow-lg z-50">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={`px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive(pathname, item.href)
                    ? isMd ? 'bg-purple-50 text-purple-700 font-medium' : 'bg-ziwa-50 text-ziwa-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-gray-100 mt-2 pt-2 px-3 pb-1">
              {signOut}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
