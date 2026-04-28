import type { Metadata } from 'next'
import Image from 'next/image'
import './globals.css'
import { getAdminUser } from '@/lib/admin-auth'
import { LoginForm } from './LoginForm'
import { LogoutButton } from './LogoutButton'
import AdminNotifications from './AdminNotifications'
import NavMenu from './NavMenu'

export const metadata: Metadata = {
  title: 'Ziwa Admin Dashboard',
  description: 'Admin dashboard for HOD daily reports',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser()

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {user ? (
          <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
              <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image src="/logo.png" alt="Ziwa Rhino And Wildlife Ranch" width={32} height={32} className="rounded-full" />
                  <div>
                    <span className="font-bold text-gray-900">Admin Dashboard</span>
                    <span className="text-xs text-gray-400 ml-2 hidden sm:inline">{user.hod_name} ({user.admin_title})</span>
                  </div>
                </div>
                <NavMenu
                  notifications={user.access_level === 'full' ? <AdminNotifications /> : null}
                  signOut={<LogoutButton />}
                  accessLevel={user.access_level}
                  adminTier={user.admin_tier}
                />
              </div>
            </header>
            <main className="max-w-6xl mx-auto px-4 py-8">
              {children}
            </main>
          </div>
        ) : (
          <div className="min-h-screen flex items-center justify-center px-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm w-full max-w-md">
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Image src="/logo.png" alt="Ziwa Rhino And Wildlife Ranch" width={40} height={40} className="rounded-full" />
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-sm text-gray-500">Select your account to continue</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <LoginForm />
              </div>
            </div>
          </div>
        )}
      </body>
    </html>
  )
}
