import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const authError = await verifyAdminAuth()
    if (authError) return authError

    const body = await request.json()
    const { title, bodyText, priority, departmentId, expiresAt } = body as {
      title: string
      bodyText: string
      priority: string
      departmentId: string | null
      expiresAt: string | null
    }

    if (!title?.trim() || !bodyText?.trim()) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('hod_announcements')
      .insert({
        title: title.trim(),
        body: bodyText.trim(),
        priority: priority || 'normal',
        department_id: departmentId || null,
        expires_at: expiresAt || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Create announcement error:', error)
      return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
    }

    return NextResponse.json({ id: data?.id })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authError = await verifyAdminAuth()
    if (authError) return authError

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const supabase = createServerClient()
    await supabase.from('hod_announcements').update({ active: false }).eq('id', id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
