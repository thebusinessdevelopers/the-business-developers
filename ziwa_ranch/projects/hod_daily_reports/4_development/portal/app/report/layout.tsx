import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth'
import SessionGuard from '@/components/SessionGuard'

export default async function ReportLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (user) {
    return (
      <SessionGuard
        autoLogoutEnabled={user.auto_logout_enabled}
        logoutTime={user.logout_time}
        idleTimeoutMinutes={user.idle_timeout_minutes}
      >
        {children}
      </SessionGuard>
    )
  }

  const cookieStore = await cookies()
  const guestRaw = cookieStore.get('hod_guest')?.value
  if (guestRaw) {
    return <>{children}</>
  }

  redirect('/login')
}
