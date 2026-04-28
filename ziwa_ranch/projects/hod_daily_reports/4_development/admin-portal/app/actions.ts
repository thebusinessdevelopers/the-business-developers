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
    source: 'password_login',
    username: result.user.username,
    admin_title: result.user.admin_title,
    ip,
    user_agent: hdrs.get('user-agent'),
    session_token_suffix: result.token.slice(-8),
  }).catch(() => {})

  redirect('/')
}

export async function logoutAction() {
  const consumed = await adminLogout()
  if (consumed) {
    await logAdminActivity(consumed.userId, 'admin_logout', {
      source: 'manual_action',
      username: consumed.username,
      admin_title: consumed.adminTitle,
      session_id: consumed.sessionId,
      session_token_suffix: consumed.tokenSuffix,
    }).catch(() => {})
  }

  redirect('/')
}
