import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateSession, SESSION_COOKIE_NAME, getSessionCookieConfig } from '@/lib/auth'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!token) {
      return NextResponse.json({ valid: false, reason: 'missing_session' })
    }

    const user = await validateSession(token)
    if (!user) {
      return NextResponse.json({ valid: false, reason: 'invalid_session' })
    }

    const response = NextResponse.json({
      valid: true,
      logout_due: false,
      user: {
        id: user.id,
        hod_name: user.hod_name,
        role: user.role,
        department_slug: user.department_slug,
        auto_logout_enabled: user.auto_logout_enabled,
        logout_time: user.logout_time,
        idle_timeout_minutes: user.idle_timeout_minutes,
      },
    })

    const cfg = getSessionCookieConfig(token)
    response.cookies.set(cfg.name, cfg.value, {
      httpOnly: cfg.httpOnly,
      secure: cfg.secure,
      sameSite: cfg.sameSite,
      path: cfg.path,
      maxAge: cfg.maxAge,
    })

    return response
  } catch {
    return NextResponse.json({ valid: false, reason: 'session_check_failed' })
  }
}
