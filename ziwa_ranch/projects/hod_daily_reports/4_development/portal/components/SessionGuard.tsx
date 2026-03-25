'use client'

import { useSessionTimer } from '@/hooks/useSessionTimer'

interface SessionGuardProps {
  children: React.ReactNode
  autoLogoutEnabled: boolean
  logoutTime: string
  idleTimeoutMinutes: number
}

export default function SessionGuard({
  children,
  autoLogoutEnabled,
  logoutTime,
  idleTimeoutMinutes,
}: SessionGuardProps) {
  useSessionTimer({ autoLogoutEnabled, logoutTime, idleTimeoutMinutes })
  return <>{children}</>
}
