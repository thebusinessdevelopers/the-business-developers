import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { createServerClient } from '@/lib/supabase-server'

export const POST = withAuth(async ({ userId, request }) => {
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { announcementId, recurrenceDate } = await request.json() as {
    announcementId: string
    recurrenceDate: string
  }

  if (!announcementId || !recurrenceDate) {
    return NextResponse.json({ error: 'announcementId and recurrenceDate required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { error } = await supabase
    .from('announcement_acknowledgements')
    .upsert(
      {
        announcement_id: announcementId,
        user_id: userId,
        recurrence_date: recurrenceDate,
        acknowledged_at: new Date().toISOString(),
      },
      { onConflict: 'announcement_id,user_id,recurrence_date' }
    )

  if (error) {
    console.error('Acknowledge announcement failed:', error)
    return NextResponse.json({ error: 'Failed to acknowledge' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
})
