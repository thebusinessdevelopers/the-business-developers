import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { createServerClient } from './supabase-server'
import type { HodUser } from '@/types'

const SESSION_COOKIE = 'hod_session'
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export async function createSession(
  userId: string,
  deviceInfo?: Record<string, unknown>,
  ipAddress?: string
): Promise<string> {
  const supabase = createServerClient()
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString()

  const { error } = await supabase.from('hod_sessions').insert({
    user_id: userId,
    token,
    device_info: deviceInfo ?? null,
    ip_address: ipAddress ?? null,
    expires_at: expiresAt,
  })

  if (error) throw new Error(`Failed to create session: ${error.message}`)
  return token
}

export async function validateSession(token: string): Promise<(HodUser & { department_slug: string | null }) | null> {
  const supabase = createServerClient()

  const { data: session } = await supabase
    .from('hod_sessions')
    .select('id, user_id, expires_at, last_active_at')
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
    .select('id, username, department_id, hod_name, role, auto_logout_enabled, logout_time, idle_timeout_minutes, department:hod_departments(slug)')
    .eq('id', session.user_id)
    .single()

  if (!user) return null

  const dept = user.department as unknown as { slug: string } | null
  return {
    id: user.id,
    username: user.username,
    department_id: user.department_id,
    hod_name: user.hod_name,
    role: user.role as 'hod' | 'admin',
    auto_logout_enabled: user.auto_logout_enabled,
    logout_time: user.logout_time,
    idle_timeout_minutes: user.idle_timeout_minutes,
    department_slug: dept?.slug ?? null,
  }
}

export async function destroySession(token: string): Promise<void> {
  const supabase = createServerClient()
  await supabase.from('hod_sessions').delete().eq('token', token)
}

export async function logActivity(
  userId: string | null,
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

export async function getCurrentUser(): Promise<(HodUser & { department_slug: string | null }) | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return validateSession(token)
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

export const SESSION_COOKIE_NAME = SESSION_COOKIE
