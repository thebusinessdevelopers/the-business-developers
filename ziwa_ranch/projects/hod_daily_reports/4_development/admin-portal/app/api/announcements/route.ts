import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth, getAdminUser, isMdAdmin } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const authError = await verifyAdminAuth('announcements_manage')
    if (authError) return authError

    const body = await request.json()
    const { title, bodyText, priority, departmentId, expiresAt, recurrenceRule, announcementType } = body as {
      title: string
      bodyText: string
      priority: string
      departmentId: string | null
      expiresAt: string | null
      recurrenceRule?: Record<string, unknown> | null
      announcementType?: string | null
    }

    if (!title?.trim() || !bodyText?.trim()) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
    }

    const validTypes = ['banner', 'forced_ack', 'inbox_broadcast']
    const resolvedType = validTypes.includes(announcementType ?? '') ? announcementType! : 'banner'

    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('hod_announcements')
      .insert({
        title: title.trim(),
        body: bodyText.trim(),
        priority: priority || 'normal',
        department_id: departmentId || null,
        expires_at: expiresAt || null,
        recurrence_rule: recurrenceRule || null,
        announcement_type: resolvedType,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Create announcement error:', error)
      return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
    }

    if (resolvedType === 'inbox_broadcast' && data?.id) {
      const admin = await getAdminUser()
      const { data: hodUsers } = await supabase
        .from('hod_users')
        .select('id')
        .eq('role', 'hod')
        .eq('is_active', true)

      if (hodUsers && hodUsers.length > 0) {
        const notifications = hodUsers.map(u => ({
          recipient_user_id: u.id,
          type: 'announcement_broadcast' as const,
          body_preview: title.trim().slice(0, 200),
          triggered_by_user_id: admin?.id ?? null,
          source_report_id: null,
          source_thread_id: null,
        }))
        const { error: notifError } = await supabase.from('hod_notifications').insert(notifications)
        if (notifError) console.error('Broadcast notification fan-out failed:', notifError)
      }
    }

    return NextResponse.json({ id: data?.id })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await getAdminUser()
    if (!admin || !isMdAdmin(admin)) {
      return NextResponse.json({ error: 'MD access required' }, { status: 403 })
    }

    const { id, action } = await request.json() as { id: string; action: string }
    if (!id || action !== 'reset_acknowledgements') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { error } = await supabase
      .from('announcement_acknowledgements')
      .delete()
      .eq('announcement_id', id)

    if (error) {
      console.error('Reset acknowledgements failed:', error)
      return NextResponse.json({ error: 'Failed to reset' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authError = await verifyAdminAuth('announcements_manage')
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
