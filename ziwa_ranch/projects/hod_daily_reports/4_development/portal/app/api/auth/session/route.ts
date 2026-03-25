import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateSession, destroySession, SESSION_COOKIE_NAME } from '@/lib/auth'

const TZ = 'Africa/Kampala'

function getKampalaTimeStr(): string {
  return new Date().toLocaleString('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!token) {
      return NextResponse.json({ valid: false })
    }

    const user = await validateSession(token)
    if (!user) {
      return NextResponse.json({ valid: false })
    }

    if (user.auto_logout_enabled) {
      const kampalaTime = getKampalaTimeStr()
      if (kampalaTime >= user.logout_time) {
        await destroySession(token)
        return NextResponse.json({ valid: false, reason: 'daily_logout' })
      }
    }

    return NextResponse.json({
      valid: true,
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
  } catch {
    return NextResponse.json({ valid: false })
  }
}
