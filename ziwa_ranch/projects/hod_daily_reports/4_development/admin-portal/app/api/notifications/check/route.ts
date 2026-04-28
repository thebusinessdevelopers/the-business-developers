import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export const GET = withAdminAuth(async ({ admin, request }) => {
  const url = new URL(request.url)
  const since = url.searchParams.get('since')

  const supabase = createServerClient()

  const [newResult, countResult] = await Promise.all([
    since
      ? supabase
          .from('hod_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_user_id', admin.id)
          .eq('is_read', false)
          .gt('created_at', since)
      : Promise.resolve({ count: 0 }),
    supabase
      .from('hod_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_user_id', admin.id)
      .eq('is_read', false),
  ])

  return NextResponse.json({
    hasNew: since ? (newResult.count ?? 0) > 0 : false,
    unread_count: countResult.count ?? 0,
  })
}, { capability: 'report_view' })
