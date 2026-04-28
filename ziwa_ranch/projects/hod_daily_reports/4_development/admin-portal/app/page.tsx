export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'
import { getKampalaDateStr, getExpectedReportingDays } from '@/lib/submission-status'
import DailyDigestCard from '@/components/DailyDigestCard'
import TrendInsightsCard from '@/components/TrendInsightsCard'
import KpiDashboard from '@/components/KpiDashboard'
import ReportingIntelligenceWidget from '@/components/ReportingIntelligenceWidget'

interface DashboardRow {
  department_id: string
  dept_name: string
  dept_slug: string
  dept_sort_order: number
  submitted_today: boolean
  today_submitted_by: string | null
  today_report_id: string | null
  today_ai_top_label: string | null
  today_ai_top_score: number | null
  unique_days_7: number
  unique_days_30: number
  late_count_7: number
  warning_count_7: number
  late_count_30: number
  total_reports_7: number
  total_reports_30: number
  last_report_date: string | null
}

function isUrgent(label: string | null, score: number | null): boolean {
  return label === 'urgent issue' && (score ?? 0) >= 0.4
}

function needsMaintenance(label: string | null, score: number | null): boolean {
  return label === 'maintenance needed' && (score ?? 0) >= 0.4
}

export default async function DashboardHome() {
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

  const stats = rows.map((r) => {
    let daysSinceLast = 0
    if (r.last_report_date) {
      const lastMs = new Date(r.last_report_date + 'T12:00:00Z').getTime()
      const todayMs = new Date(today + 'T12:00:00Z').getTime()
      daysSinceLast = Math.round((todayMs - lastMs) / (86400 * 1000))
    }

    return {
      id: r.department_id,
      name: r.dept_name,
      slug: r.dept_slug,
      sort_order: r.dept_sort_order,
      submittedToday: r.submitted_today,
      todayBy: r.today_submitted_by,
      rate7: expectedDays7.length > 0 ? Math.round((r.unique_days_7 / expectedDays7.length) * 100) : 0,
      rate30: expectedDays30.length > 0 ? Math.round((r.unique_days_30 / expectedDays30.length) * 100) : 0,
      late7: r.late_count_7,
      warning7: r.warning_count_7,
      late30: r.late_count_30,
      missed7: Math.max(0, expectedDays7.length - r.unique_days_7),
      missed30: Math.max(0, expectedDays30.length - r.unique_days_30),
      lastReportDate: r.last_report_date,
      daysSinceLast,
      aiLabel: r.today_ai_top_label,
      aiScore: r.today_ai_top_score,
    }
  })

  const urgentToday = stats.filter((s) => s.submittedToday && isUrgent(s.aiLabel, s.aiScore)).length
  const maintenanceToday = stats.filter((s) => s.submittedToday && needsMaintenance(s.aiLabel, s.aiScore)).length

  return (
    <div className="space-y-10">
      <KpiDashboard />

      {(urgentToday > 0 || maintenanceToday > 0) && (
        <div className="flex flex-col sm:flex-row gap-4">
          {urgentToday > 0 && (
            <div className="bg-red-50 rounded-xl border border-red-200 px-5 py-3 flex items-center gap-3">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
              <div>
                <p className="text-sm font-semibold text-red-800">{urgentToday} urgent report{urgentToday !== 1 ? 's' : ''} today</p>
                <p className="text-xs text-red-500">AI-flagged from HOD notes</p>
              </div>
            </div>
          )}
          {maintenanceToday > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 px-5 py-3 flex items-center gap-3">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
              <div>
                <p className="text-sm font-semibold text-amber-800">{maintenanceToday} maintenance request{maintenanceToday !== 1 ? 's' : ''} today</p>
                <p className="text-xs text-amber-500">AI-flagged from HOD notes</p>
              </div>
            </div>
          )}
        </div>
      )}

      <DailyDigestCard />

      <TrendInsightsCard />

      <div className="text-right -mt-4">
        <Link href="/analysis" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
          Full analysis (daily, weekly, monthly) &rarr;
        </Link>
      </div>

      <ReportingIntelligenceWidget departments={stats} urgentToday={urgentToday} />
    </div>
  )
}
