'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { adminLogin, adminLogout, getSessionCookieConfig, logAdminActivity } from '@/lib/admin-auth'

export async function loginAction(_prev: unknown, formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username || !password) {
    return { error: 'Username and password are required.' }
  }

  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for') ?? hdrs.get('x-real-ip') ?? undefined

  const result = await adminLogin(username, password, ip)

  if ('error' in result) {
    return { error: result.error }
  }

  const cookieStore = await cookies()
  cookieStore.set(getSessionCookieConfig(result.token))

  await logAdminActivity(result.user.id, 'admin_login', {
    username: result.user.username,
    admin_title: result.user.admin_title,
    ip,
  }).catch(() => {})

  redirect('/')
}

export async function logoutAction() {
  const { getAdminUser } = await import('@/lib/admin-auth')
  const user = await getAdminUser()

  if (user) {
    await logAdminActivity(user.id, 'admin_logout', {
      username: user.username,
      admin_title: user.admin_title,
    }).catch(() => {})
  }

  await adminLogout()
  redirect('/')
}
