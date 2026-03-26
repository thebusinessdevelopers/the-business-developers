import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateSession, verifyPassword, hashPassword, logActivity } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'

const SESSION_COOKIE = 'hod_session'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await validateSession(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body as {
      currentPassword: string
      newPassword: string
    }

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both current and new password are required' }, { status: 400 })
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'New password must be at least 4 characters' }, { status: 400 })
    }

    if (currentPassword === newPassword) {
      return NextResponse.json({ error: 'New password must be different from current' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: dbUser } = await supabase
      .from('hod_users')
      .select('id, password_hash')
      .eq('id', user.id)
      .single()

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const valid = await verifyPassword(currentPassword, dbUser.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 })
    }

    const newHash = await hashPassword(newPassword)

    const { error: updateError } = await supabase
      .from('hod_users')
      .update({ password_hash: newHash })
      .eq('id', user.id)

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
    }

    logActivity(user.id, 'password_changed', {
      ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Change password error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
