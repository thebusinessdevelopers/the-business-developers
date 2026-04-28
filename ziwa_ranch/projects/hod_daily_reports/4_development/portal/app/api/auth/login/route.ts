import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyPassword, createSession, logActivity, getSessionCookieConfig } from '@/lib/auth'

const MAX_ATTEMPTS = 3
const LOCKOUT_MS = 15 * 60 * 1000
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>()

function checkRateLimit(key: string): { blocked: boolean; remainingMs: number } {
  const entry = loginAttempts.get(key)
  if (!entry) return { blocked: false, remainingMs: 0 }
  if (entry.lockedUntil > Date.now()) {
    return { blocked: true, remainingMs: entry.lockedUntil - Date.now() }
  }
  if (entry.lockedUntil <= Date.now() && entry.count >= MAX_ATTEMPTS) {
    loginAttempts.delete(key)
  }
  return { blocked: false, remainingMs: 0 }
}

function recordFailedAttempt(key: string): number {
  const entry = loginAttempts.get(key) ?? { count: 0, lockedUntil: 0 }
  entry.count += 1
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS
  }
  loginAttempts.set(key, entry)
  return Math.max(0, MAX_ATTEMPTS - entry.count)
}

function clearAttempts(key: string): void {
  loginAttempts.delete(key)
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, device_info } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 })
    }

    const normalisedUsername = username.toLowerCase().trim()
    const rateLimit = checkRateLimit(normalisedUsername)
    if (rateLimit.blocked) {
      const mins = Math.ceil(rateLimit.remainingMs / 60_000)
      return NextResponse.json(
        { error: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.` },
        { status: 429 }
      )
    }

    const supabase = createServerClient()
    const { data: user } = await supabase
      .from('hod_users')
      .select('id, username, password_hash, department_id, hod_name, role, is_active, department:hod_departments(slug)')
      .eq('username', normalisedUsername)
      .eq('role', 'hod')
      .single()

    if (!user || user.is_active === false) {
      const remaining = recordFailedAttempt(normalisedUsername)
      return NextResponse.json({
        error: remaining > 0
          ? `Invalid username or password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many failed attempts. Account locked for 15 minutes.',
        remainingAttempts: remaining,
      }, { status: remaining > 0 ? 401 : 429 })
    }

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      const remaining = recordFailedAttempt(normalisedUsername)
      return NextResponse.json({
        error: remaining > 0
          ? `Invalid username or password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many failed attempts. Account locked for 15 minutes.',
        remainingAttempts: remaining,
      }, { status: remaining > 0 ? 401 : 429 })
    }

    clearAttempts(normalisedUsername)

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined
    const token = await createSession(user.id, device_info, ip)

    await logActivity(user.id, 'login', {
      source: 'password_login',
      device_info,
      ip_address: ip,
      user_agent: request.headers.get('user-agent'),
      session_token_suffix: token.slice(-8),
    })

    const dept = user.department as unknown as { slug: string } | null
    const redirectTo = dept?.slug ? `/report/${dept.slug}` : '/'

    const response = NextResponse.json({
      success: true,
      user: { role: user.role, hod_name: user.hod_name, department_slug: dept?.slug },
      redirectTo,
    })

    const cookieConfig = getSessionCookieConfig(token)
    response.cookies.set(cookieConfig.name, cookieConfig.value, {
      httpOnly: cookieConfig.httpOnly,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
      path: cookieConfig.path,
      maxAge: cookieConfig.maxAge,
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
