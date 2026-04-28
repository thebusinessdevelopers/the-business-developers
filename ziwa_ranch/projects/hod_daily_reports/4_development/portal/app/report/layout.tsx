import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth'
import SessionGuard from '@/components/SessionGuard'
import ConnectivityBanner from '@/components/ConnectivityBanner'

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
        idleTimeoutMinutes={user.idle_timeout_minutes}
      >
        <ConnectivityBanner />
        {children}
      </SessionGuard>
    )
  }

  const cookieStore = await cookies()
  const guestRaw = cookieStore.get('hod_guest')?.value
  if (guestRaw) {
    return (
      <>
        <ConnectivityBanner />
        {children}
      </>
    )
  }

  redirect('/login')
}
