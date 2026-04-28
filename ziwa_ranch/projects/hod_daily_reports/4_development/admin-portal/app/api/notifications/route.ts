import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export const GET = withAdminAuth(async ({ admin, request }) => {
  const url = new URL(request.url)
  const since = url.searchParams.get('since')
  const supabase = createServerClient()

  let listQuery = supabase
    .from('hod_notifications')
    .select(`
      id, recipient_user_id, type, source_thread_id, source_report_id,
      triggered_by_user_id, body_preview, is_read, created_at,
      triggered_by:hod_users!triggered_by_user_id(hod_name, role),
      report:hod_daily_reports!source_report_id(department_id, report_date)
    `)
    .eq('recipient_user_id', admin.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (since) {
    listQuery = listQuery.gt('created_at', since)
  }

  const [notifResult, countResult] = await Promise.all([
    listQuery,
    supabase
      .from('hod_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_user_id', admin.id)
      .eq('is_read', false),
  ])

  if (notifResult.error) {
    console.error('Fetch notifications error:', notifResult.error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }

  const formatted = (notifResult.data ?? []).map(n => {
    const triggeredBy = n.triggered_by as unknown as { hod_name: string; role: string } | null
    const report = n.report as unknown as { department_id: string; report_date: string } | null
    return { ...n, triggered_by: triggeredBy, report }
  })

  return NextResponse.json({
    notifications: formatted,
    unread_count: countResult.count ?? 0,
  })
}, { capability: 'report_view' })
