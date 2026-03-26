import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { reportIds, reviewedBy, reviewComments } = await request.json()

    if (!Array.isArray(reportIds) || reportIds.length === 0 || !reviewedBy) {
      return NextResponse.json(
        { error: 'reportIds (array) and reviewedBy are required' },
        { status: 400 },
      )
    }

    const supabase = createServerClient()
    const now = new Date().toISOString()

    const { error } = await supabase
      .from('hod_daily_reports')
      .update({
        acknowledged_at: now,
        acknowledged_by: reviewedBy,
        review_comments: reviewComments || null,
      })
      .in('id', reportIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, count: reportIds.length })
  } catch {
    return NextResponse.json({ error: 'Failed to batch review' }, { status: 500 })
  }
}
