import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { consumeSession, logActivity, SESSION_COOKIE_NAME } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
    const body = await request.json().catch(() => ({}))
    const source = typeof body?.source === 'string' ? body.source : 'unknown'
    const reason = typeof body?.reason === 'string' ? body.reason : null

    if (token) {
      const consumed = await consumeSession(token)
      if (consumed) {
        await logActivity(consumed.userId, 'logout', {
          source,
          reason,
          session_id: consumed.sessionId,
          session_token_suffix: token.slice(-8),
        })
      }
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
