import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, logAdminActivity, verifyAdminAuth } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const authError = await verifyAdminAuth('users_manage')
    if (authError) return authError
    const admin = await getAdminUser()
    if (!admin || admin.admin_tier !== 'senior') {
      return NextResponse.json({ error: 'Only senior admins can reset passwords' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, newPassword } = body as { userId: string; newPassword: string }

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'userId and newPassword required' }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const supabase = createServerClient()
    const hash = await bcrypt.hash(newPassword, 10)
    const { data: targetUser, error: targetUserError } = await supabase
      .from('hod_users')
      .select('id, username, hod_name, role')
      .eq('id', userId)
      .maybeSingle()

    if (targetUserError) {
      console.error('Failed to load password reset target:', targetUserError)
      return NextResponse.json({ error: 'Failed to load user' }, { status: 500 })
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('hod_users')
      .update({ password_hash: hash, password_display: newPassword })
      .eq('id', userId)

    if (error) {
      console.error('Password reset error:', error)
      return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
    }

    logAdminActivity(admin.id, 'password_reset', {
      target_user_id: targetUser.id,
      target_username: targetUser.username,
      target_name: targetUser.hod_name,
      target_role: targetUser.role,
    }).catch((err) => {
      console.error('Password reset activity log failed:', err)
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Reset password route error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
