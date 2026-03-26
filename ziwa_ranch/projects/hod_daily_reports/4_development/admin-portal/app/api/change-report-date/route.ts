import { NextResponse } from 'next/server'
import { verifyAdminAuth, getAdminUser, logAdminActivity } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const authError = await verifyAdminAuth()
    if (authError) return authError

    const admin = await getAdminUser()
    const { reportId, newDate } = await request.json()

    if (!reportId || !newDate) {
      return NextResponse.json({ error: 'reportId and newDate are required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: report } = await supabase
      .from('hod_daily_reports')
      .select('id, department_id, report_date, edit_history')
      .eq('id', reportId)
      .single()

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    if (report.report_date === newDate) {
      return NextResponse.json({ error: 'New date is the same as current date' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('hod_daily_reports')
      .select('id')
      .eq('department_id', report.department_id)
      .eq('report_date', newDate)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: `A report already exists for this department on ${newDate}` },
        { status: 409 },
      )
    }

    const editor = admin?.hod_name ?? 'Admin'
    const prevHistory = (report.edit_history as { edited_by: string; edited_at: string; changes: unknown[] }[] | null) ?? []
    const historyEntry = {
      edited_by: editor,
      edited_at: new Date().toISOString(),
      changes: [{ field: 'Report date', old_value: report.report_date, new_value: newDate }],
    }

    const { error } = await supabase
      .from('hod_daily_reports')
      .update({
        report_date: newDate,
        edited_at: new Date().toISOString(),
        last_edited_by: editor,
        edit_history: [...prevHistory, historyEntry],
      })
      .eq('id', reportId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (admin) {
      await logAdminActivity(admin.id, 'report_date_changed', {
        report_id: reportId,
        department_id: report.department_id,
        old_date: report.report_date,
        new_date: newDate,
        admin_title: admin.admin_title,
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to change date' }, { status: 500 })
  }
}
