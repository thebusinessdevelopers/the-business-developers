import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import Image from 'next/image'
import Link from 'next/link'
import './globals.css'
import { LoginForm } from './LoginForm'
import { LogoutButton } from './LogoutButton'

export const metadata: Metadata = {
  title: 'Ziwa Admin Dashboard',
  description: 'Admin dashboard for HOD daily reports',
}

function getExpectedHash(): string {
  const pw = process.env.ADMIN_PASSWORD ?? ''
  return createHmac('sha256', pw).update(pw).digest('hex')
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('admin_auth')?.value
  const isAuthenticated = authCookie === getExpectedHash()

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {isAuthenticated ? (
          <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200">
              <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image src="/logo.png" alt="Ziwa Rhino And Wildlife Ranch" width={32} height={32} className="rounded-full" />
                  <span className="font-bold text-gray-900">Admin Dashboard</span>
                </div>
                <nav className="flex items-center gap-4 text-sm">
                  <Link href="/" className="text-gray-600 hover:text-gray-900">Overview</Link>
                  <Link href="/reports" className="text-gray-600 hover:text-gray-900">Reports</Link>
                  <Link href="/stock" className="text-gray-600 hover:text-gray-900">Stock</Link>
                  <Link href="/compliance" className="text-gray-600 hover:text-gray-900">Compliance</Link>
                  <Link href="/activity" className="text-gray-600 hover:text-gray-900">Activity</Link>
                  <Link href="/announcements" className="text-gray-600 hover:text-gray-900">Announce</Link>
                  <Link href="/errors" className="text-gray-600 hover:text-gray-900">Errors</Link>
                  <LogoutButton />
                </nav>
              </div>
            </header>
            <main className="max-w-6xl mx-auto px-4 py-8">
              {children}
            </main>
          </div>
        ) : (
          <div className="min-h-screen flex items-center justify-center px-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm w-full max-w-sm">
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Image src="/logo.png" alt="Ziwa Rhino And Wildlife Ranch" width={40} height={40} className="rounded-full" />
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-sm text-gray-500">Enter password to continue</p>
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
