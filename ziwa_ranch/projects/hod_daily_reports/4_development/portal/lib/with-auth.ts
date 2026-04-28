import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateSession, getSessionCookieConfig } from './auth'
import type { HodUser } from '@/types'

const SESSION_COOKIE = 'hod_session'
const GUEST_COOKIE = 'hod_guest'

export interface AuthContext {
  user: (HodUser & { department_slug: string | null }) | null
  userId: string | null
  guest: { slug: string; name: string; ts: number } | null
  request: NextRequest
}

interface WithAuthOptions {
  allowGuest?: boolean
}

/**
 * Wraps a route handler with session/guest authentication.
 * Eliminates the repeated cookie-read + validateSession block from every route.
 *
 * Usage:
 *   export const POST = withAuth(async (ctx) => { ... })
 *   export const POST = withAuth(async (ctx) => { ... }, { allowGuest: true })
 */
export function withAuth<TContext = unknown>(
  handler: (ctx: AuthContext, routeContext?: TContext) => Promise<NextResponse>,
  options?: WithAuthOptions
): (request: NextRequest, routeContext?: TContext) => Promise<NextResponse> {
  const allowGuest = options?.allowGuest ?? false

  return async (request: NextRequest, routeContext?: TContext) => {
    try {
      const cookieStore = await cookies()
      const sessionToken = cookieStore.get(SESSION_COOKIE)?.value
      const guestRaw = cookieStore.get(GUEST_COOKIE)?.value

      let user: AuthContext['user'] = null
      let userId: string | null = null
      let guest: AuthContext['guest'] = null

      if (sessionToken) {
        user = await validateSession(sessionToken)
        if (!user) {
          return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
        }
        userId = user.id
      } else if (allowGuest && guestRaw) {
        try {
          guest = JSON.parse(guestRaw) as { slug: string; name: string; ts: number }
        } catch {
          return NextResponse.json({ error: 'Invalid guest cookie' }, { status: 401 })
        }
      } else {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }

      const response = await handler({ user, userId, guest, request }, routeContext)

      if (sessionToken && user) {
        const cfg = getSessionCookieConfig(sessionToken)
        response.cookies.set(cfg.name, cfg.value, {
          httpOnly: cfg.httpOnly,
          secure: cfg.secure,
          sameSite: cfg.sameSite,
          path: cfg.path,
          maxAge: cfg.maxAge,
        })
      }

      return response
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string } | null
      console.error('Route error:', errObj)
      return NextResponse.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500 }
      )
    }
  }
}
