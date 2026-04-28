import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async ({ request }) => {
  const departmentId = request.nextUrl.searchParams.get('departmentId')
  const fieldName = request.nextUrl.searchParams.get('fieldName')

  if (!departmentId || !fieldName) {
    return NextResponse.json({ suggestions: [] })
  }

  const supabase = createServerClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const since = thirtyDaysAgo.toISOString().split('T')[0]

  const { data: reports } = await supabase
    .from('hod_daily_reports')
    .select('report_data')
    .eq('department_id', departmentId)
    .gte('report_date', since)
    .order('report_date', { ascending: false })
    .limit(30)

  if (!reports || reports.length === 0) {
    return NextResponse.json({ suggestions: [] })
  }

  const frequency: Record<string, number> = {}

  for (const report of reports) {
    const data = report.report_data as Record<string, unknown>
    const repeaterVal = data[fieldName]
    if (!Array.isArray(repeaterVal)) continue

    for (const row of repeaterVal) {
      if (typeof row !== 'object' || row === null) continue
      const entries = Object.entries(row as Record<string, unknown>)
      const firstText = entries.find(([, v]) => typeof v === 'string' && v.trim().length > 0)
      if (firstText) {
        const val = (firstText[1] as string).trim()
        frequency[val] = (frequency[val] || 0) + 1
      }
    }
  }

  const suggestions = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([value]) => value)

  return NextResponse.json({ suggestions })
}, { allowGuest: true })
