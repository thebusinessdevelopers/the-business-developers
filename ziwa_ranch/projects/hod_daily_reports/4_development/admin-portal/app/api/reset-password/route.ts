import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const authError = await verifyAdminAuth()
    if (authError) return authError

    const body = await request.json()
    const { userId, newPassword } = body as { userId: string; newPassword: string }

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'userId and newPassword required' }, { status: 400 })
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 })
    }

    const supabase = createServerClient()
    const hash = await bcrypt.hash(newPassword, 10)

    const { error } = await supabase
      .from('hod_users')
      .update({ password_hash: hash })
      .eq('id', userId)

    if (error) {
      return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
