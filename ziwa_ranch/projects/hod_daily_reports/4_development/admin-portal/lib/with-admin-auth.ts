import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminUser, hasAdminCapability, logAdminActivity, getSessionCookieConfig, ADMIN_SESSION_COOKIE, type AdminCapability } from './admin-auth'
import type { AdminUser } from '@/types'

export interface AdminAuthContext {
  admin: AdminUser
  request: NextRequest
}

type AdminHandler = (ctx: AdminAuthContext) => Promise<NextResponse>

interface WithAdminAuthOptions {
  capability?: AdminCapability
}

/**
 * Wraps a route handler with admin authentication.
 * Eliminates the repeated verifyAdminAuth + getAdminUser block from every admin route.
 *
 * Usage:
 *   export const POST = withAdminAuth(async ({ admin, request }) => { ... })
 */
export function withAdminAuth(
  handler: AdminHandler,
  options?: WithAdminAuthOptions
): (request: NextRequest | Request) => Promise<NextResponse> {
  const capability = options?.capability
  return async (request: NextRequest | Request) => {
    try {
      const cookieStore = await cookies()
      const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value

      const admin = await getAdminUser()
      if (!admin) {
        return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
      }
      if (capability && !hasAdminCapability(admin, capability)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const req = request instanceof NextRequest ? request : new NextRequest(request)
      const response = await handler({ admin, request: req })

      if (sessionToken) {
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
      const errObj = err as { message?: string } | null
      console.error('Admin route error:', errObj)
      return NextResponse.json(
        { error: 'Something went wrong.' },
        { status: 500 }
      )
    }
  }
}

export { logAdminActivity }
