import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/auth'

const GUEST_COOKIE = 'hod_guest'
const GUEST_DURATION_SECONDS = 12 * 60 * 60

export async function POST(request: NextRequest) {
  try {
    const { department_slug, guest_name, device_info } = await request.json()

    if (!department_slug || !guest_name?.trim()) {
      return NextResponse.json(
        { error: 'Department and name are required.' },
        { status: 400 },
      )
    }

    const name = guest_name.trim()

    await logActivity(null, 'guest_login', {
      department_slug,
      guest_name: name,
      device_info,
      user_agent: request.headers.get('user-agent'),
      ip_address:
        request.headers.get('x-forwarded-for') ??
        request.headers.get('x-real-ip'),
    })

    const payload = JSON.stringify({
      slug: department_slug,
      name,
      ts: Date.now(),
    })

    const redirectTo = `/report/${department_slug}`

    const response = NextResponse.json({ success: true, redirectTo })

    response.cookies.set(GUEST_COOKIE, payload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: GUEST_DURATION_SECONDS,
    })

    return response
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }
}
