import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'hod_session'
const GUEST_COOKIE = 'hod_guest'

export function middleware(request: NextRequest) {
  const hasSession = !!request.cookies.get(SESSION_COOKIE)?.value
  const hasGuest = !!request.cookies.get(GUEST_COOKIE)?.value
  const path = request.nextUrl.pathname

  const isReportPath = path.startsWith('/report')

  if (isReportPath && (hasSession || hasGuest)) return NextResponse.next()
  if (hasSession) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('redirect', path)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/((?!login|api/|_next/static|_next/image|logo\\.png|favicon\\.ico).*)',
  ],
}
