export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase-server'
import { getKampalaDateStr, getExpectedReportingDays, formatDateKampala } from '@/lib/submission-status'
import { getAdminUser } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'
import CompliancePeriodSelector from './CompliancePeriodSelector'
import WhatsAppComplianceButton from './WhatsAppComplianceButton'
import ComplianceRow from './ComplianceRow'

interface PageProps {
  searchParams: Promise<{ days?: string }>
}

interface DeptRow {
  id: string
  name: string
  slug: string
  sort_order: number
}

interface ReportRow {
  department_id: string
  report_date: string
}

export default async function CompliancePage({ searchParams }: PageProps) {
  const admin = await getAdminUser()
  if (!admin || admin.access_level !== 'full') {
    redirect('/')
  }

  const params = await searchParams
  const days = Number(params.days) || 7
  const supabase = createServerClient()

  const { data: departments } = await supabase
    .from('hod_departments')
    .select('id, name, slug, sort_order')
    .eq('is_active', true)
    .order('sort_order')

  const today = getKampalaDateStr(new Date())
  const fromDate = new Date(today + 'T12:00:00Z')
  fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1))
  const fromStr = fromDate.toISOString().split('T')[0]

  const { data: reports } = await supabase
    .from('hod_daily_reports')
    .select('department_id, report_date')
    .gte('report_date', fromStr)
    .lte('report_date', today)

  const depts = (departments ?? []) as DeptRow[]
  const allReports = (reports ?? []) as ReportRow[]

  const expectedDates = getExpectedReportingDays(fromStr, today)

  const stats = depts.map((dept) => {
    const deptReports = allReports.filter((r) => r.department_id === dept.id)
    const submittedDates = new Set(deptReports.map((r) => r.report_date))
    const submitted = expectedDates.filter((date) => submittedDates.has(date)).length
    const missed = expectedDates.length - submitted
    const rate = expectedDates.length > 0 ? Math.round((submitted / expectedDates.length) * 100) : 0
    const missingDates = expectedDates.filter((date) => !submittedDates.has(date))

    return {
      ...dept,
      submitted,
      missed,
      rate,
      total: expectedDates.length,
      missingDates,
    }
  })

  stats.sort((a, b) => a.rate - b.rate)

  const totalSubmitted = stats.reduce((sum, s) => sum + s.submitted, 0)
  const totalExpected = stats.length * expectedDates.length
  const overallRate = totalExpected > 0 ? Math.round((totalSubmitted / totalExpected) * 100) : 0

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance</h1>
          <p className="text-sm text-gray-500 mt-1">
            Submission rates over {days} days ({expectedDates.length} reporting days, all 7 days/week).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <WhatsAppComplianceButton
            stats={stats}
            days={days}
            reportingDays={expectedDates.length}
            fromDate={formatDateKampala(fromStr)}
            toDate={formatDateKampala(today)}
            totalSubmitted={totalSubmitted}
            totalExpected={totalExpected}
            overallRate={overallRate}
          />
          <CompliancePeriodSelector currentDays={days} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {stats.map((dept) => (
          <ComplianceRow
            key={dept.id}
            slug={dept.slug}
            name={dept.name}
            submitted={dept.submitted}
            missed={dept.missed}
            rate={dept.rate}
            missingDates={dept.missingDates}
            fromStr={fromStr}
            toDate={today}
          />
        ))}
      </div>
    </div>
  )
}
