import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const authError = await verifyAdminAuth('exports')
  if (authError) return authError

  const departmentId = request.nextUrl.searchParams.get('department_id')
  const date = request.nextUrl.searchParams.get('date')

  if (!departmentId || !date) {
    return NextResponse.json({ error: 'department_id and date required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: report } = await supabase
    .from('hod_daily_reports')
    .select('id')
    .eq('department_id', departmentId)
    .eq('report_date', date)
    .maybeSingle()

  if (!report) {
    return NextResponse.json({ report_id: null })
  }

  return NextResponse.json({ report_id: report.id })
}
