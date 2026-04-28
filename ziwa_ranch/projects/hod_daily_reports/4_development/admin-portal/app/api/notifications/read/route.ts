import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export const POST = withAdminAuth(async ({ admin, request }) => {
  const { notification_ids } = await request.json() as {
    notification_ids?: string[]
  }

  const supabase = createServerClient()

  let query = supabase
    .from('hod_notifications')
    .update({ is_read: true })
    .eq('recipient_user_id', admin.id)

  if (notification_ids?.length) {
    query = query.in('id', notification_ids)
  } else {
    query = query.eq('is_read', false)
  }

  const { error } = await query

  if (error) {
    console.error('Mark notifications read error:', error)
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}, { capability: 'report_view' })
