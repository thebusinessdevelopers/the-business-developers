export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { createServerClient } from '@/lib/supabase-server'
import { getSubmissionStatus, getStatusLabel, getStatusBadgeClasses } from '@/lib/submission-status'
import ReportFilters from './ReportFilters'
import ExportCSVButton from './ExportCSVButton'
import ReportsTable from './ReportsTable'

interface PageProps {
  searchParams: Promise<{
    department?: string
    from?: string
    to?: string
    late?: string
    reviewed?: string
  }>
}

interface ReportRow {
  id: string
  department_id: string
  submitted_by: string
  report_date: string
  submitted_at: string
  acknowledged_at: string | null
  edited_at: string | null
  edit_history: unknown[] | null
  ai_flags: { top_label?: string; top_score?: number } | null
  hod_departments: { name: string; slug: string }
}

function getUrgencyBadge(flags: ReportRow['ai_flags']): { label: string; classes: string } | null {
  if (!flags?.top_label || !flags.top_score || flags.top_score < 0.4) return null
  if (flags.top_label === 'urgent issue') {
    return { label: 'Urgent', classes: 'bg-red-100 text-red-700 border-red-200' }
  }
  if (flags.top_label === 'maintenance needed') {
    return { label: 'Maintenance', classes: 'bg-amber-100 text-amber-700 border-amber-200' }
  }
  return null
}

type ReviewDot = 'reviewed' | 'needs_rereview' | 'unreviewed'

function getReviewDot(r: ReportRow): ReviewDot {
  if (r.acknowledged_at) return 'reviewed'
  const hasEdits = Array.isArray(r.edit_history) && r.edit_history.length > 0
  if (hasEdits) return 'needs_rereview'
  return 'unreviewed'
}

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('en-GB', {
    timeZone: 'Africa/Kampala',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = createServerClient()

  const { data: departments } = await supabase
    .from('hod_departments')
    .select('name, slug, id')
    .eq('is_active', true)
    .order('sort_order')

  const defaultFrom = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return d.toISOString().split('T')[0]
  })()

  let query = supabase
    .from('hod_daily_reports')
    .select('id, department_id, submitted_by, report_date, submitted_at, acknowledged_at, edited_at, edit_history, ai_flags, hod_departments(name, slug)')
    .order('submitted_at', { ascending: false })
    .limit(200)

  if (params.department) {
    const dept = (departments ?? []).find((d) => d.slug === params.department)
    if (dept) query = query.eq('department_id', dept.id)
  }

  const fromDate = params.from || defaultFrom
  query = query.gte('report_date', fromDate)
  if (params.to) query = query.lte('report_date', params.to)

  const { data: rawReports } = await query

  let reports = (rawReports ?? []) as unknown as ReportRow[]

  if (params.late === 'true') {
    reports = reports.filter((r) => getSubmissionStatus(r.submitted_at, r.report_date) !== 'on_time')
  }

  if (params.reviewed === 'unreviewed') {
    reports = reports.filter((r) => !r.acknowledged_at)
  } else if (params.reviewed === 'reviewed') {
    reports = reports.filter((r) => !!r.acknowledged_at)
  }

  const filterDepts = (departments ?? []).map((d) => ({ name: d.name, slug: d.slug }))

  const csvData = reports.map((r) => ({
    date: r.report_date,
    department: r.hod_departments?.name ?? '',
    submitted_by: r.submitted_by,
    time: formatTime(r.submitted_at),
    status: getStatusLabel(getSubmissionStatus(r.submitted_at, r.report_date)),
    reviewed: r.acknowledged_at ? 'Yes' : 'No',
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">{reports.length} reports found.</p>
        </div>
        <ExportCSVButton data={csvData} />
      </div>

      <Suspense fallback={<div className="h-10" />}>
        <ReportFilters departments={filterDepts} defaultFrom={defaultFrom} />
      </Suspense>

      {reports.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>No reports match your filters.</p>
        </div>
      ) : (
        <ReportsTable
          reports={reports.map((r) => {
            const status = getSubmissionStatus(r.submitted_at, r.report_date)
            const urgency = getUrgencyBadge(r.ai_flags)
            return {
              id: r.id,
              report_date: r.report_date,
              submitted_by: r.submitted_by,
              submitted_at: r.submitted_at,
              edited_at: r.edited_at,
              acknowledged_at: r.acknowledged_at,
              department_name: r.hod_departments?.name ?? '',
              status,
              statusLabel: getStatusLabel(status),
              statusBadgeClasses: getStatusBadgeClasses(status),
              dot: getReviewDot(r),
              urgencyLabel: urgency?.label ?? null,
              urgencyClasses: urgency?.classes ?? null,
            }
          })}
        />
      )}
    </div>
  )
}
