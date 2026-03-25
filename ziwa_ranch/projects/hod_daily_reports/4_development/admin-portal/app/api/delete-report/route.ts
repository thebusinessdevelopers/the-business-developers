import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { reportId, departmentName } = await request.json()

    if (!reportId || !departmentName) {
      return NextResponse.json({ error: 'reportId and departmentName are required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: report } = await supabase
      .from('hod_daily_reports')
      .select('id, hod_departments(name)')
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

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 })
  }
}
