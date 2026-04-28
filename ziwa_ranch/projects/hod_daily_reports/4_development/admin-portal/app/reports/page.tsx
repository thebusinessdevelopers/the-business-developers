export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'
import { getAdminUser, hasAdminCapability } from '@/lib/admin-auth'
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
    page?: string
    perPage?: string
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
  const admin = await getAdminUser()
  const canManage = Boolean(admin && hasAdminCapability(admin, 'report_manage'))
  const canExport = Boolean(admin && hasAdminCapability(admin, 'exports'))
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const VALID_PAGE_SIZES = [25, 50, 100] as const
  const perPage = VALID_PAGE_SIZES.includes(Number(params.perPage) as 25 | 50 | 100)
    ? (Number(params.perPage) as 25 | 50 | 100)
    : 50
  const supabase = createServerClient()

  const { data: departments } = await supabase
    .from('hod_departments')
    .select('name, slug, id')
    .eq('is_active', true)
    .order('sort_order')

  let query = supabase
    .from('hod_daily_reports')
    .select('id, department_id, submitted_by, report_date, submitted_at, acknowledged_at, edited_at, edit_history, ai_flags, hod_departments(name, slug)', { count: 'exact' })
    .order('submitted_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (params.department) {
    const dept = (departments ?? []).find((d) => d.slug === params.department)
    if (dept) query = query.eq('department_id', dept.id)
  }

  if (params.from) query = query.gte('report_date', params.from)
  if (params.to) query = query.lte('report_date', params.to)

  if (params.late === 'true') {
    query = query.not('submitted_at', 'is', null)
  }

  if (params.reviewed === 'unreviewed') {
    query = query.is('acknowledged_at', null)
  } else if (params.reviewed === 'reviewed') {
    query = query.not('acknowledged_at', 'is', null)
  }

  const { data: rawReports, count } = await query

  let reports = (rawReports ?? []) as unknown as ReportRow[]
  const totalCount = count ?? reports.length
  const totalPages = Math.ceil(totalCount / perPage)

  if (params.late === 'true') {
    reports = reports.filter((r) => getSubmissionStatus(r.submitted_at, r.report_date) !== 'on_time')
  }

  const filterDepts = (departments ?? []).map((d) => ({ name: d.name, slug: d.slug }))

  let unreadThreadReportIds: string[] = []
  if (admin) {
    const { data: unreadNotifs } = await supabase
      .from('hod_notifications')
      .select('source_report_id')
      .eq('recipient_user_id', admin.id)
      .eq('is_read', false)
      .not('source_report_id', 'is', null)
    unreadThreadReportIds = [...new Set(
      (unreadNotifs ?? []).map(n => n.source_report_id).filter(Boolean) as string[]
    )]
  }

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">{totalCount} reports found{totalPages > 1 ? ` — page ${page} of ${totalPages}` : ''}.</p>
        </div>
        {canExport && <ExportCSVButton data={csvData} />}
      </div>

      <Suspense fallback={<div className="h-10" />}>
        <ReportFilters departments={filterDepts} />
      </Suspense>

      {reports.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>No reports match your filters.</p>
        </div>
      ) : (
        <>
        <ReportsTable
          canManage={canManage}
          unreadThreadReportIds={unreadThreadReportIds}
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

        {totalPages > 1 && (() => {
          const qp = new URLSearchParams()
          if (params.department) qp.set('department', params.department)
          if (params.from) qp.set('from', params.from)
          if (params.to) qp.set('to', params.to)
          if (params.late) qp.set('late', params.late)
          if (params.reviewed) qp.set('reviewed', params.reviewed)
          if (perPage !== 50) qp.set('perPage', String(perPage))
          const base = qp.toString()
          const link = (p: number) => `/reports?page=${p}${base ? `&${base}` : ''}`
          return (
            <div className="flex items-center justify-center gap-2 mt-6">
              {page > 1 && (
                <Link href={link(page - 1)} className="text-sm text-ziwa-600 hover:text-ziwa-700 px-3 py-1 border border-gray-200 rounded-md">
                  Previous
                </Link>
              )}
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              {page < totalPages && (
                <Link href={link(page + 1)} className="text-sm text-ziwa-600 hover:text-ziwa-700 px-3 py-1 border border-gray-200 rounded-md">
                  Next
                </Link>
              )}
            </div>
          )
        })()}
        </>
      )}
    </div>
  )
}
