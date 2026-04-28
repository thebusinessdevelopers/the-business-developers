import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from './supabase-server'
import type { AdminUser } from '@/types'

const SESSION_COOKIE = 'admin_session'
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000
const VIEW_ONLY_ADMINS = new Set(['admin.royfamily'])

export type AdminCapability =
  | 'overview'
  | 'report_view'
  | 'analysis'
  | 'report_manage'
  | 'stock_manage'
  | 'announcements_manage'
  | 'users_manage'
  | 'errors_view'
  | 'activity_view'
  | 'exports'
  | 'meeting_manage'
  | 'accommodation_manage'

const VIEWER_CAPABILITIES = new Set<AdminCapability>([
  'overview',
  'report_view',
  'analysis',
])

function resolveAccessLevel(username: string): 'full' | 'viewer' {
  return VIEW_ONLY_ADMINS.has(username) ? 'viewer' : 'full'
}

export function hasAdminCapability(admin: AdminUser, capability: AdminCapability): boolean {
  if (admin.access_level === 'full') return true
  return VIEWER_CAPABILITIES.has(capability)
}

export function isViewOnlyAdmin(admin: AdminUser | null): boolean {
  return Boolean(admin && admin.access_level === 'viewer')
}

export async function verifyAdminAuth(capability?: AdminCapability): Promise<NextResponse | null> {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (capability && !hasAdminCapability(user, capability)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
    .update({
      last_active_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
    })
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
    admin_tier: user.admin_tier as 'senior' | 'standard' | 'md',
    admin_title: user.admin_title,
    access_level: resolveAccessLevel(user.username),
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
      admin_tier: (user.admin_tier ?? 'standard') as 'senior' | 'standard' | 'md',
      admin_title: user.admin_title ?? '',
      access_level: resolveAccessLevel(user.username),
    },
  }
}

export async function adminLogout(): Promise<{
  sessionId: string
  userId: string
  tokenSuffix: string
  username: string | null
  adminTitle: string | null
} | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) {
    cookieStore.delete(SESSION_COOKIE)
    return null
  }

  const supabase = createServerClient()
  const { data: consumed } = await supabase
    .from('hod_sessions')
    .delete()
    .eq('token', token)
    .select('id, user_id')
    .maybeSingle()

  cookieStore.delete(SESSION_COOKIE)
  if (!consumed) return null

  const { data: user } = await supabase
    .from('hod_users')
    .select('username, admin_title')
    .eq('id', consumed.user_id)
    .maybeSingle()

  return {
    sessionId: consumed.id,
    userId: consumed.user_id,
    tokenSuffix: token.slice(-8),
    username: user?.username ?? null,
    adminTitle: user?.admin_title ?? null,
  }
}

function withinWindow(createdAt: string, windowMs: number): boolean {
  const createdMs = Date.parse(createdAt)
  if (!Number.isFinite(createdMs)) return false
  return Date.now() - createdMs <= windowMs
}

function stringMeta(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = meta?.[key]
  return typeof value === 'string' ? value : null
}

async function isDuplicateAdminAuthActivity(
  userId: string,
  action: string,
  metadata: Record<string, unknown> | undefined
): Promise<boolean> {
  if (!metadata) return false
  if (action !== 'admin_login' && action !== 'admin_logout') return false

  const supabase = createServerClient()
  const { data: lastEntry } = await supabase
    .from('hod_activity_log')
    .select('created_at, metadata')
    .eq('user_id', userId)
    .eq('action', action)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!lastEntry?.created_at) return false
  const lastMeta = (lastEntry.metadata ?? null) as Record<string, unknown> | null
  const source = stringMeta(metadata, 'source')
  const lastSource = stringMeta(lastMeta, 'source')
  if (!source || source !== lastSource) return false

  if (action === 'admin_logout') {
    if (!withinWindow(lastEntry.created_at, 5 * 60 * 1000)) return false
    const suffix = stringMeta(metadata, 'session_token_suffix')
    const lastSuffix = stringMeta(lastMeta, 'session_token_suffix')
    return Boolean(suffix && lastSuffix && suffix === lastSuffix)
  }

  if (!withinWindow(lastEntry.created_at, 60 * 1000)) return false
  const ip = stringMeta(metadata, 'ip')
  const lastIp = stringMeta(lastMeta, 'ip')
  const userAgent = stringMeta(metadata, 'user_agent')
  const lastUserAgent = stringMeta(lastMeta, 'user_agent')
  return ip === lastIp && userAgent === lastUserAgent
}

export async function logAdminActivity(
  userId: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (await isDuplicateAdminAuthActivity(userId, action, metadata)) {
    return
  }

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

export function isMdAdmin(admin: AdminUser): boolean {
  return admin.admin_tier === 'md'
}

export const ADMIN_SESSION_COOKIE = SESSION_COOKIE
