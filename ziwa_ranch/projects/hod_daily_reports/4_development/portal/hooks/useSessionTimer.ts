'use client'

import { useCallback, useEffect, useRef } from 'react'
import { endClientSession } from '@/lib/session-client'

interface SessionTimerConfig {
  autoLogoutEnabled: boolean
  idleTimeoutMinutes: number
}

interface SessionStatusResponse {
  valid: boolean
  reason?: string
}

type SessionEndReason = 'idle_timeout' | 'invalid_session'

export function useSessionTimer(config: SessionTimerConfig): void {
  const lastActivityRef = useRef(0)
  const loggingOutRef = useRef(false)

  useEffect(() => {
    if (lastActivityRef.current === 0) lastActivityRef.current = Date.now()
  }, [])

  const logout = useCallback(async (reason: SessionEndReason) => {
    if (loggingOutRef.current) return
    loggingOutRef.current = true

    await endClientSession({
      source: reason === 'invalid_session' ? 'invalid_session' : 'auto_timer',
      reason,
    })
  }, [])

  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now()
    }

    const checkSession = async () => {
      if (loggingOutRef.current) return

      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json().catch(
          (): SessionStatusResponse | null => null
        )
        if (!data) return

        if (!data.valid) {
          if (data.reason === 'session_check_failed') return
          await logout('invalid_session')
          return
        }
      } catch {
      }
    }

    const checkIdleTimeout = () => {
      if (loggingOutRef.current) return
      if (!config.autoLogoutEnabled) return

      const idleMs = Date.now() - lastActivityRef.current
      if (idleMs >= config.idleTimeoutMinutes * 60 * 1000) {
        void logout('idle_timeout')
      }
    }

    const handleSurfaceChange = () => {
      lastActivityRef.current = Date.now()
      checkIdleTimeout()
      if (!document.hidden) {
        void checkSession()
      }
    }

    window.addEventListener('mousemove', updateActivity, { passive: true })
    window.addEventListener('keydown', updateActivity, { passive: true })
    window.addEventListener('touchstart', updateActivity, { passive: true })
    window.addEventListener('click', updateActivity, { passive: true })
    window.addEventListener('scroll', updateActivity, { passive: true })
    window.addEventListener('focus', handleSurfaceChange)
    window.addEventListener('blur', handleSurfaceChange)
    document.addEventListener('visibilitychange', handleSurfaceChange)

    checkIdleTimeout()
    void checkSession()

    const checkInterval = setInterval(checkIdleTimeout, 60_000)
    const pollInterval = setInterval(() => {
      void checkSession()
    }, 5 * 60 * 1000)

    return () => {
      window.removeEventListener('mousemove', updateActivity)
      window.removeEventListener('keydown', updateActivity)
      window.removeEventListener('touchstart', updateActivity)
      window.removeEventListener('click', updateActivity)
      window.removeEventListener('scroll', updateActivity)
      window.removeEventListener('focus', handleSurfaceChange)
      window.removeEventListener('blur', handleSurfaceChange)
      document.removeEventListener('visibilitychange', handleSurfaceChange)
      clearInterval(checkInterval)
      clearInterval(pollInterval)
    }
  }, [config.autoLogoutEnabled, config.idleTimeoutMinutes, logout])
}
