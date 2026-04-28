'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export function useConnectivity() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const probeReachability = async () => {
      try {
        const res = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-store',
        })
        setIsOnline(res.ok)
      } catch {
        setIsOnline(false)
      }
    }

    void probeReachability()

    intervalRef.current = setInterval(() => {
      void probeReachability()
    }, 60_000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  const onReconnect = useCallback((callback: () => void) => {
    const handler = () => callback()
    window.addEventListener('online', handler)
    return () => window.removeEventListener('online', handler)
  }, [])

  return { isOnline, onReconnect }
}
