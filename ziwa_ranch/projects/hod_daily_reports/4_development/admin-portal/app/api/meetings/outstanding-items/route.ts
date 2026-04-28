import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export const GET = withAdminAuth(async () => {
  const supabase = createServerClient()

  const { data: latestMeeting } = await supabase
    .from('hod_meetings')
    .select('id, date')
    .in('status', ['submitted', 'approved'])
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestMeeting) {
    return NextResponse.json({ items: [], meetingDate: null })
  }

  const { data: items } = await supabase
    .from('hod_meeting_action_items')
    .select('*, assigned_dept:hod_departments(name, slug), assigned_user:hod_users!hod_meeting_action_items_assigned_user_id_fkey(hod_name)')
    .eq('meeting_id', latestMeeting.id)
    .in('status', ['open', 'submitted', 'rejected'])
    .order('priority', { ascending: true })

  return NextResponse.json({
    items: items ?? [],
    meetingDate: latestMeeting.date,
  })
})
