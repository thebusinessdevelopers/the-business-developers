import { NextResponse } from 'next/server'
import { verifyAdminAuth, getAdminUser, logAdminActivity } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const authError = await verifyAdminAuth()
    if (authError) return authError

    const admin = await getAdminUser()
    const { reportId, departmentName } = await request.json()

    if (!reportId || !departmentName) {
      return NextResponse.json({ error: 'reportId and departmentName are required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: report } = await supabase
      .from('hod_daily_reports')
      .select('id, report_date, department_id, hod_departments(name)')
      .eq('id', reportId)
      .single()

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const actual = (report as unknown as { hod_departments: { name: string } }).hod_departments.name
    if (actual.trim().toLowerCase() !== departmentName.trim().toLowerCase()) {
      return NextResponse.json({ error: 'Department name does not match' }, { status: 403 })
    }

    const { error } = await supabase
      .from('hod_daily_reports')
      .delete()
      .eq('id', reportId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (admin) {
      await logAdminActivity(admin.id, 'report_deleted', {
        report_id: reportId,
        department_name: departmentName,
        department_id: report.department_id,
        report_date: report.report_date,
        admin_title: admin.admin_title,
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 })
  }
}
