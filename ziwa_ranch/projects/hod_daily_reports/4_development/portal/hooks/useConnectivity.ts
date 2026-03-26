'use client'

import { useState, useEffect, useCallback } from 'react'

export function useConnectivity() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const onReconnect = useCallback((callback: () => void) => {
    const handler = () => callback()
    window.addEventListener('online', handler)
    return () => window.removeEventListener('online', handler)
  }, [])

  return { isOnline, onReconnect }
}
