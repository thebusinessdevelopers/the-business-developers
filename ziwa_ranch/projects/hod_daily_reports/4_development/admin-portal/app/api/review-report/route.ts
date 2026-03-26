import { NextResponse } from 'next/server'
import { verifyAdminAuth, getAdminUser, logAdminActivity } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const authError = await verifyAdminAuth()
    if (authError) return authError

    const admin = await getAdminUser()
    const { reportId, reviewedBy, reviewComments } = await request.json()

    if (!reportId || !reviewedBy) {
      return NextResponse.json({ error: 'reportId and reviewedBy are required' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { error } = await supabase
      .from('hod_daily_reports')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: reviewedBy,
        review_comments: reviewComments || null,
      })
      .eq('id', reportId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (admin) {
      await logAdminActivity(admin.id, 'report_reviewed', {
        report_id: reportId,
        reviewed_by: reviewedBy,
        admin_title: admin.admin_title,
        has_comments: Boolean(reviewComments),
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to save review' }, { status: 500 })
  }
}
