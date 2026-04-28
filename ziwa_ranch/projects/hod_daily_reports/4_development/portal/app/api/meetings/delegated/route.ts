import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { createServerClient } from '@/lib/supabase-server'

export const GET = withAuth(async ({ userId }) => {
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const supabase = createServerClient()

  const [meetingsResult, deptResult, hodResult, adminResult] = await Promise.all([
    supabase
      .from('hod_meetings')
      .select('id, meeting_type, special_title, date, start_time, end_time, status, created_at')
      .eq('secretary_user_id', userId)
      .eq('status', 'draft')
      .order('date', { ascending: false }),
    supabase
      .from('hod_departments')
      .select('id, name, slug, hods')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('hod_users')
      .select('id, hod_name, username, department_id')
      .eq('role', 'hod')
      .eq('is_active', true),
    supabase
      .from('hod_users')
      .select('id, hod_name, username, admin_title')
      .eq('role', 'admin'),
  ])

  if (meetingsResult.error) {
    return NextResponse.json({ error: meetingsResult.error.message }, { status: 500 })
  }

  return NextResponse.json({
    meetings: meetingsResult.data ?? [],
    departments: deptResult.data ?? [],
    hodUsers: hodResult.data ?? [],
    adminUsers: adminResult.data ?? [],
  })
})
