import { NextResponse } from 'next/server'
import { verifyPassword, hashPassword, logActivity } from '@/lib/auth'
import { withAuth } from '@/lib/with-auth'
import { createServerClient } from '@/lib/supabase-server'

export const POST = withAuth(async ({ user, request }) => {
    if (!user) {
      return NextResponse.json({ error: 'Session required' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { currentPassword, newPassword } = body as {
      currentPassword: string
      newPassword: string
    }

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both current and new password are required' }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
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
      .update({ password_hash: newHash, password_display: newPassword })
      .eq('id', user.id)

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
    }

    logActivity(user.id, 'password_changed', {
      ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    }).catch((err) => {
      console.error('Password change activity log failed:', err)
    })

    return NextResponse.json({ success: true })
})
