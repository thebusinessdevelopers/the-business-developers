import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { destroySession, logActivity, validateSession, SESSION_COOKIE_NAME } from '@/lib/auth'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (token) {
      const user = await validateSession(token)
      if (user) {
        await logActivity(user.id, 'logout', {})
      }
      await destroySession(token)
    }

    const response = NextResponse.json({ success: true, redirectTo: '/login' })
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Logout failed.' }, { status: 500 })
  }
}
