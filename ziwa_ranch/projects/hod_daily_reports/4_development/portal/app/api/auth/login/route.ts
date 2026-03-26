import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyPassword, createSession, logActivity, getSessionCookieConfig } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { username, password, device_info } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: user } = await supabase
      .from('hod_users')
      .select('id, username, password_hash, department_id, hod_name, role, department:hod_departments(slug)')
      .eq('username', username.toLowerCase().trim())
      .single()

    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 })
    }

    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined
    const token = await createSession(user.id, device_info, ip)

    await logActivity(user.id, 'login', {
      device_info,
      ip_address: ip,
      user_agent: request.headers.get('user-agent'),
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
