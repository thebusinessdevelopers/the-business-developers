export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'
import { getKampalaDateStr, getExpectedReportingDays } from '@/lib/submission-status'
import KpiDashboard from '@/components/KpiDashboard'

interface DashboardRow {
  department_id: string
  dept_name: string
  dept_slug: string
  dept_sort_order: number
  submitted_today: boolean
  today_submitted_by: string | null
  unique_days_7: number
  unique_days_30: number
  late_count_7: number
  warning_count_7: number
  late_count_30: number
  total_reports_7: number
  total_reports_30: number
  last_report_date: string | null
}

export default async function OperationsPage(): Promise<React.JSX.Element> {
  const supabase = createServerClient()
  const today = getKampalaDateStr(new Date())

  const thirtyDate = new Date(today + 'T12:00:00Z')
  thirtyDate.setUTCDate(thirtyDate.getUTCDate() - 29)
  const thirtyStr = thirtyDate.toISOString().split('T')[0]

  const sevenDate = new Date(today + 'T12:00:00Z')
  sevenDate.setUTCDate(sevenDate.getUTCDate() - 6)
  const sevenStr = sevenDate.toISOString().split('T')[0]

  const { data: rpcData } = await supabase.rpc('get_dashboard_stats', {
    p_today: today,
    p_seven_ago: sevenStr,
    p_thirty_ago: thirtyStr,
  })

  const rows = (rpcData ?? []) as DashboardRow[]
  const expectedDays7 = getExpectedReportingDays(sevenStr, today)
  const expectedDays30 = getExpectedReportingDays(thirtyStr, today)

  const depts = rows
    .map((r) => {
      let daysSinceLast = 0
      if (r.last_report_date) {
        const lastMs = new Date(r.last_report_date + 'T12:00:00Z').getTime()
        const todayMs = new Date(today + 'T12:00:00Z').getTime()
        daysSinceLast = Math.round((todayMs - lastMs) / (86400 * 1000))
      }
      return {
        id: r.department_id,
        name: r.dept_name,
        sortOrder: r.dept_sort_order,
        submittedToday: r.submitted_today,
        todayBy: r.today_submitted_by,
        rate7: expectedDays7.length > 0 ? Math.round((r.unique_days_7 / expectedDays7.length) * 100) : 0,
        rate30: expectedDays30.length > 0 ? Math.round((r.unique_days_30 / expectedDays30.length) * 100) : 0,
        late7: r.late_count_7,
        late30: r.late_count_30,
        warning7: r.warning_count_7,
        missed7: Math.max(0, expectedDays7.length - r.unique_days_7),
        missed30: Math.max(0, expectedDays30.length - r.unique_days_30),
        lastReportDate: r.last_report_date,
        daysSinceLast,
      }
    })
    .sort((a, b) => a.rate7 - b.rate7)

  return (
    <div className="space-y-10">
      <KpiDashboard />

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Departmental Reporting</h2>
          <Link href="/reports" className="text-xs text-ziwa-600 hover:text-ziwa-700 font-medium">
            View all reports &rarr;
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Department</th>
                  <th className="px-4 py-3">Today</th>
                  <th className="px-4 py-3">7d rate</th>
                  <th className="px-4 py-3">30d rate</th>
                  <th className="px-4 py-3">Late (7d)</th>
                  <th className="px-4 py-3">Warn (7d)</th>
                  <th className="px-4 py-3">Last report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {depts.map((dept) => (
                  <tr key={dept.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">{dept.name}</td>
                    <td className="px-4 py-3">
                      {dept.submittedToday ? (
                        <span className="inline-flex items-center gap-1 text-green-700">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          {dept.todayBy}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          Missing
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              dept.rate7 >= 80 ? 'bg-green-500' : dept.rate7 >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(dept.rate7, 100)}%` }}
                          />
                        </div>
                        <span className="text-gray-600 w-8 text-right">{dept.rate7}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              dept.rate30 >= 80 ? 'bg-green-500' : dept.rate30 >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(dept.rate30, 100)}%` }}
                          />
                        </div>
                        <span className="text-gray-600 w-8 text-right">{dept.rate30}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {dept.late7 > 0 ? (
                        <span className="text-red-600 font-medium">{dept.late7}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {dept.warning7 > 0 ? (
                        <span className="text-amber-600 font-medium">{dept.warning7}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {dept.lastReportDate ? (
                        <span className="text-gray-600">
                          {new Date(dept.lastReportDate + 'T00:00:00').toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            timeZone: 'Africa/Kampala',
                          })}
                          {dept.daysSinceLast >= 3 && (
                            <span className="text-red-500 font-medium ml-1">({dept.daysSinceLast}d gap)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="text-center">
        <Link href="/compliance" className="text-sm text-ziwa-600 hover:text-ziwa-700 font-medium">
          Detailed compliance view &rarr;
        </Link>
      </div>
    </div>
  )
}
