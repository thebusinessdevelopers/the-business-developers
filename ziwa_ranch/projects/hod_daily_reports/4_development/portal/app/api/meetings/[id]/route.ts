import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { createServerClient } from '@/lib/supabase-server'

export const GET = withAuth(async ({ userId }, routeContext) => {
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { id } = (await (routeContext as { params: Promise<{ id: string }> }).params)
  const supabase = createServerClient()

  const { data: meeting, error } = await supabase
    .from('hod_meetings')
    .select('*')
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  if (error || !meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
  }

  const { data: actionItems } = await supabase
    .from('hod_meeting_action_items')
    .select('*, assigned_dept:hod_departments(name, slug), assigned_user:hod_users!hod_meeting_action_items_assigned_user_id_fkey(hod_name)')
    .eq('meeting_id', id)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })

  return NextResponse.json({ meeting, actionItems: actionItems ?? [] })
})
