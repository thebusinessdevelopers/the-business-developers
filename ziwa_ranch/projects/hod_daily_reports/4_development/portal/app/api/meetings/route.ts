import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { createServerClient } from '@/lib/supabase-server'

export const GET = withAuth(async ({ userId, request }) => {
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const supabase = createServerClient()
  const url = new URL(request.url)
  const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 50)
  const offset = Number(url.searchParams.get('offset')) || 0

  const { data, error } = await supabase
    .from('hod_meetings')
    .select('id, meeting_type, special_title, date, status, submitted_at, approved_at, attendance')
    .eq('status', 'approved')
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const meetingIds = (data ?? []).map(m => m.id)
  const actionCounts: Record<string, number> = {}
  if (meetingIds.length > 0) {
    const { data: counts } = await supabase
      .from('hod_meeting_action_items')
      .select('meeting_id')
      .in('meeting_id', meetingIds)

    if (counts) {
      for (const row of counts) {
        actionCounts[row.meeting_id] = (actionCounts[row.meeting_id] || 0) + 1
      }
    }
  }

  const meetings = (data ?? []).map(m => ({
    ...m,
    action_item_count: actionCounts[m.id] || 0,
  }))

  return NextResponse.json({ meetings })
})
