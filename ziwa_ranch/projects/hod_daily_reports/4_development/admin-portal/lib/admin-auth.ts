import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from './supabase-server'
import type { AdminUser } from '@/types'

const SESSION_COOKIE = 'admin_session'
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000

export async function verifyAdminAuth(): Promise<NextResponse | null> {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  return null
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const supabase = createServerClient()

  const { data: session } = await supabase
    .from('hod_sessions')
    .select('id, user_id, expires_at')
    .eq('token', token)
    .single()

  if (!session) return null
  if (new Date(session.expires_at) < new Date()) {
    await supabase.from('hod_sessions').delete().eq('id', session.id)
    return null
  }

  await supabase
    .from('hod_sessions')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', session.id)

  const { data: user } = await supabase
    .from('hod_users')
    .select('id, username, hod_name, role, admin_tier, admin_title')
    .eq('id', session.user_id)
    .eq('role', 'admin')
    .single()

  if (!user || !user.admin_tier || !user.admin_title) return null

  return {
    id: user.id,
    username: user.username,
    hod_name: user.hod_name,
    admin_tier: user.admin_tier as 'senior' | 'standard',
    admin_title: user.admin_title,
  }
}

export async function adminLogin(
  username: string,
  password: string,
  ipAddress?: string
): Promise<{ token: string; user: AdminUser } | { error: string }> {
  const supabase = createServerClient()

  const { data: user } = await supabase
    .from('hod_users')
    .select('id, username, password_hash, hod_name, role, admin_tier, admin_title')
    .eq('username', username)
    .eq('role', 'admin')
    .single()

  if (!user) return { error: 'Invalid credentials.' }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return { error: 'Invalid credentials.' }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString()

  const { error } = await supabase.from('hod_sessions').insert({
    user_id: user.id,
    token,
    device_info: { app: 'admin_portal' },
    ip_address: ipAddress ?? null,
    expires_at: expiresAt,
  })

  if (error) return { error: 'Failed to create session.' }

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      hod_name: user.hod_name,
      admin_tier: (user.admin_tier ?? 'standard') as 'senior' | 'standard',
      admin_title: user.admin_title ?? '',
    },
  }
}

export async function adminLogout(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) {
    const supabase = createServerClient()
    await supabase.from('hod_sessions').delete().eq('token', token)
  }
  cookieStore.delete(SESSION_COOKIE)
}

export async function logAdminActivity(
  userId: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = createServerClient()
  await supabase.from('hod_activity_log').insert({
    user_id: userId,
    action,
    metadata: metadata ?? null,
  })
}

export function getSessionCookieConfig(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
  }
}

export const ADMIN_SESSION_COOKIE = SESSION_COOKIE
