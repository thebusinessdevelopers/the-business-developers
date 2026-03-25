'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SessionTimerConfig {
  autoLogoutEnabled: boolean
  logoutTime: string
  idleTimeoutMinutes: number
}

export function useSessionTimer(config: SessionTimerConfig) {
  const router = useRouter()
  const lastActivityRef = useRef(Date.now())
  const loggingOutRef = useRef(false)

  const logout = useCallback(async () => {
    if (loggingOutRef.current) return
    loggingOutRef.current = true
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      window.location.href = '/login'
    }
  }, [])

  useEffect(() => {
    if (!config.autoLogoutEnabled) return

    const updateActivity = () => {
      lastActivityRef.current = Date.now()
    }

    window.addEventListener('mousemove', updateActivity, { passive: true })
    window.addEventListener('keydown', updateActivity, { passive: true })
    window.addEventListener('touchstart', updateActivity, { passive: true })
    window.addEventListener('click', updateActivity, { passive: true })

    const checkInterval = setInterval(() => {
      if (loggingOutRef.current) return

      const idleMs = Date.now() - lastActivityRef.current
      if (idleMs >= config.idleTimeoutMinutes * 60 * 1000) {
        logout()
        return
      }

      const kampalaTime = new Date().toLocaleString('en-GB', {
        timeZone: 'Africa/Kampala',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      if (kampalaTime >= config.logoutTime) {
        logout()
      }
    }, 60_000)

    const pollInterval = setInterval(async () => {
      if (loggingOutRef.current) return
      try {
        const res = await fetch('/api/auth/session')
        const data = await res.json()
        if (!data.valid) {
          window.location.href = '/login'
        }
      } catch {
        // Offline — don't force logout, connectivity resilience handles this
      }
    }, 5 * 60 * 1000)

    return () => {
      window.removeEventListener('mousemove', updateActivity)
      window.removeEventListener('keydown', updateActivity)
      window.removeEventListener('touchstart', updateActivity)
      window.removeEventListener('click', updateActivity)
      clearInterval(checkInterval)
      clearInterval(pollInterval)
    }
  }, [config.autoLogoutEnabled, config.idleTimeoutMinutes, config.logoutTime, logout, router])
}
