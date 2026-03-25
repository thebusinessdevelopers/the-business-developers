export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'
import { getSubmissionStatus } from '@/lib/submission-status'

interface DeptRow {
  id: string
  name: string
  slug: string
  sort_order: number
}

interface ReportRow {
  id: string
  department_id: string
  submitted_by: string
  report_date: string
  submitted_at: string
}

function countLate(reports: ReportRow[]): number {
  return reports.filter((r) => getSubmissionStatus(r.submitted_at, r.report_date) === 'late').length
}

function countWarning(reports: ReportRow[]): number {
  return reports.filter((r) => getSubmissionStatus(r.submitted_at, r.report_date) === 'warning').length
}

export default async function DashboardHome() {
  const supabase = createServerClient()

  const { data: departments } = await supabase
    .from('hod_departments')
    .select('id, name, slug, sort_order')
    .eq('is_active', true)
    .order('sort_order')

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)

  const { data: reports } = await supabase
    .from('hod_daily_reports')
    .select('id, department_id, submitted_by, report_date, submitted_at')
    .gte('report_date', thirtyDaysAgo.toISOString().split('T')[0])

  const depts = (departments ?? []) as DeptRow[]
  const allReports = (reports ?? []) as ReportRow[]
  const today = new Date().toISOString().split('T')[0]

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const sevenStr = sevenDaysAgo.toISOString().split('T')[0]

  const stats = depts.map((dept) => {
    const dr = allReports.filter((r) => r.department_id === dept.id)
    const todayReport = dr.find((r) => r.report_date === today)
    const last7 = dr.filter((r) => r.report_date >= sevenStr)
    const uniqueDays7 = new Set(last7.map((r) => r.report_date)).size
    const uniqueDays30 = new Set(dr.map((r) => r.report_date)).size
    const late7 = countLate(last7)
    const warning7 = countWarning(last7)
    const late30 = countLate(dr)

    return {
      ...dept,
      submittedToday: !!todayReport,
      todayBy: todayReport?.submitted_by,
      rate7: Math.round((uniqueDays7 / 7) * 100),
      rate30: Math.round((uniqueDays30 / 30) * 100),
      late7,
      warning7,
      late30,
    }
  })

  const submittedCount = stats.filter((s) => s.submittedToday).length
  const totalLate7 = stats.reduce((sum, s) => sum + s.late7, 0)
  const totalWarning7 = stats.reduce((sum, s) => sum + s.warning7, 0)
  const totalLate30 = stats.reduce((sum, s) => sum + s.late30, 0)
  const totalReports7 = allReports.filter((r) => r.report_date >= sevenStr).length
  const totalReports30 = allReports.length

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Reporting performance across all departments.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Today</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{submittedCount}/{depts.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">departments submitted</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">7-day total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalReports7}</p>
          <p className="text-xs text-gray-400 mt-0.5">reports submitted</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Warnings (7d)</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{totalWarning7}</p>
          <p className="text-xs text-gray-400 mt-0.5">12–3 PM submissions</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Late (7 days)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalLate7}</p>
          <p className="text-xs text-gray-400 mt-0.5">{totalReports7 > 0 ? Math.round((totalLate7 / totalReports7) * 100) : 0}% of submissions</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Late (30 days)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalLate30}</p>
          <p className="text-xs text-gray-400 mt-0.5">{totalReports30 > 0 ? Math.round((totalLate30 / totalReports30) * 100) : 0}% of submissions</p>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Today&apos;s Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {stats.map((dept) => (
            <div
              key={dept.id}
              className={`rounded-xl border p-4 ${
                dept.submittedToday
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <p className="font-semibold text-sm text-gray-900">{dept.name}</p>
              {dept.submittedToday ? (
                <p className="text-xs text-green-700 mt-1">Submitted by {dept.todayBy}</p>
              ) : (
                <p className="text-xs text-red-600 mt-1">Not yet submitted</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Submission Rates</h2>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {stats.map((dept) => (
            <div key={dept.id} className="flex items-center gap-4 px-5 py-3">
              <p className="text-sm font-medium text-gray-900 w-44 flex-shrink-0">{dept.name}</p>
              <div className="flex-1 flex items-center gap-3">
                <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-ziwa-500 transition-all"
                    style={{ width: `${Math.min(dept.rate30, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-10 text-right">{dept.rate30}%</span>
              </div>
              <div className="flex gap-4 text-xs text-gray-400 flex-shrink-0">
                <span>7d: {dept.rate7}%</span>
                <span>30d: {dept.rate30}%</span>
                {dept.warning7 > 0 && (
                  <span className="text-amber-600">{dept.warning7} warn</span>
                )}
                {dept.late30 > 0 && (
                  <span className="text-red-500">{dept.late30} late</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="text-center pt-4">
        <Link href="/reports" className="text-sm text-ziwa-600 hover:text-ziwa-700 font-medium">
          View all reports &rarr;
        </Link>
      </div>
    </div>
  )
}
