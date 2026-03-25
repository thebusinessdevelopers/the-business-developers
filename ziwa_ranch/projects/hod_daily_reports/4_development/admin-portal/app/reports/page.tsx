export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'
import { getSubmissionStatus, getStatusLabel, getStatusBadgeClasses } from '@/lib/submission-status'
import ReportFilters from './ReportFilters'
import ExportCSVButton from './ExportCSVButton'

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
  hod_departments: { name: string; slug: string }
}

type ReviewDot = 'reviewed' | 'needs_rereview' | 'unreviewed'

function getReviewDot(r: ReportRow): ReviewDot {
  if (r.acknowledged_at) return 'reviewed'
  const hasEdits = Array.isArray(r.edit_history) && r.edit_history.length > 0
  if (hasEdits) return 'needs_rereview'
  return 'unreviewed'
}

const DOT_CLASSES: Record<ReviewDot, string> = {
  reviewed: 'bg-green-500',
  needs_rereview: 'bg-amber-500',
  unreviewed: 'bg-red-400',
}

const DOT_TITLES: Record<ReviewDot, string> = {
  reviewed: 'Reviewed',
  needs_rereview: 'Edited — needs re-review',
  unreviewed: 'Not reviewed',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    timeZone: 'Africa/Kampala',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
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
    .select('id, department_id, submitted_by, report_date, submitted_at, acknowledged_at, edited_at, edit_history, hod_departments(name, slug)')
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
        <>
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-green-500" /> Reviewed</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-amber-500" /> Edited (needs re-review)</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-red-400" /> Not reviewed</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  <th className="px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Department</th>
                  <th className="px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Submitted by</th>
                  <th className="px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Time</th>
                  <th className="px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Edited</th>
                  <th className="px-4 py-3 font-medium text-gray-600 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map((r) => {
                  const status = getSubmissionStatus(r.submitted_at, r.report_date)
                  const dot = getReviewDot(r)
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-900">
                        {formatDate(r.report_date)}
                        {status !== 'on_time' && (
                          <span className={`ml-2 inline-block text-xs border rounded px-1.5 py-0.5 ${getStatusBadgeClasses(status)}`}>
                            {getStatusLabel(status)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {r.hod_departments?.name}
                        <span className={`ml-2 inline-block w-2 h-2 rounded-full ${DOT_CLASSES[dot]}`} title={DOT_TITLES[dot]} />
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{r.submitted_by}</td>
                      <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{formatTime(r.submitted_at)}</td>
                      <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">
                        {r.edited_at ? formatTime(r.edited_at) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/reports/${r.id}`}
                          className="text-ziwa-600 hover:text-ziwa-700 font-medium text-xs"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
