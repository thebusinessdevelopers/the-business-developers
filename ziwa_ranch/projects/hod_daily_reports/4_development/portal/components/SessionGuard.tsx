'use client'

import { useSessionTimer } from '@/hooks/useSessionTimer'

interface SessionGuardProps {
  children: React.ReactNode
  autoLogoutEnabled: boolean
  idleTimeoutMinutes: number
}

export default function SessionGuard({
  children,
  autoLogoutEnabled,
  idleTimeoutMinutes,
}: SessionGuardProps) {
  useSessionTimer({ autoLogoutEnabled, idleTimeoutMinutes })
  return <>{children}</>
}
