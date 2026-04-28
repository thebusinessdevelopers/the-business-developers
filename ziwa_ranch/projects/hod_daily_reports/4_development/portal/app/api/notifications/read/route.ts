import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { createServerClient } from '@/lib/supabase-server'

export const POST = withAuth(async ({ userId, request }) => {
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { notification_ids, scope } = await request.json() as {
    notification_ids?: string[]
    scope?: 'messages' | 'meetings' | 'all'
  }

  const supabase = createServerClient()

  let query = supabase
    .from('hod_notifications')
    .update({ is_read: true })
    .eq('recipient_user_id', userId)

  if (notification_ids?.length) {
    query = query.in('id', notification_ids)
  } else {
    query = query.eq('is_read', false)
    if (scope === 'messages') {
      query = query.neq('category', 'meeting')
    } else if (scope === 'meetings') {
      query = query.eq('category', 'meeting')
    }
  }

  const { error } = await query

  if (error) {
    console.error('Mark notifications read error:', error)
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
})
