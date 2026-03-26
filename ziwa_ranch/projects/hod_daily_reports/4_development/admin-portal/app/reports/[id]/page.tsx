export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'
import { getFormBySlug, LEGACY_HOUSEKEEPING_CONFIG } from '@/config/forms'
import { getSubmissionStatus, getStatusLabel, getStatusBadgeClasses } from '@/lib/submission-status'
import { EditHistoryEntry } from '@/types'
import EditHistory from '@/components/EditHistory'
import FormRenderer from '@/components/FormRenderer'
import AcknowledgeButton from './AcknowledgeButton'
import DeleteReportButton from './DeleteReportButton'

interface PageProps {
  params: Promise<{ id: string }>
}

interface ReportData {
  id: string
  submitted_by: string
  report_date: string
  submitted_at: string
  report_data: Record<string, unknown>
  edit_history: EditHistoryEntry[]
  edited_at: string | null
  last_edited_by: string | null
  acknowledged_at: string | null
  acknowledged_by: string | null
  review_comments: string | null
  hod_departments: { name: string; slug: string }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    timeZone: 'Africa/Kampala',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(isoStr: string): string {
  return new Date(isoStr).toLocaleString('en-GB', {
    timeZone: 'Africa/Kampala',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function ReportDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = createServerClient()

  const { data: report } = await supabase
    .from('hod_daily_reports')
    .select('id, submitted_by, report_date, submitted_at, report_data, edit_history, edited_at, last_edited_by, acknowledged_at, acknowledged_by, review_comments, hod_departments(name, slug)')
    .eq('id', id)
    .single()

  if (!report) notFound()

  const r = report as unknown as ReportData
  const status = getSubmissionStatus(r.submitted_at, r.report_date)
  const isLegacyHousekeeping = r.hod_departments.slug === 'housekeeping' && 'room_status' in r.report_data && !('rooms' in r.report_data)
  const formConfig = isLegacyHousekeeping ? LEGACY_HOUSEKEEPING_CONFIG : getFormBySlug(r.hod_departments.slug)

  return (
    <div>
      <Link href="/reports" className="text-sm text-gray-500 hover:text-gray-900 mb-6 inline-block">
        &larr; Back to reports
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{r.hod_departments.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{formatDate(r.report_date)}</p>
            {r.edited_at && (
              <p className="text-xs text-amber-600 mt-1">Last edited by {r.last_edited_by} at {formatDateTime(r.edited_at)}</p>
            )}
          </div>
          <div className="text-right text-sm">
            <p className="text-gray-700">Submitted by <span className="font-medium">{r.submitted_by}</span></p>
            <p className="text-gray-400">{formatDateTime(r.submitted_at)}</p>
            {status !== 'on_time' && (
              <span className={`inline-block text-xs border rounded px-2 py-0.5 mt-1 ${getStatusBadgeClasses(status)}`}>
                {getStatusLabel(status)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-100">
          <Link
            href={`/reports/${r.id}/edit`}
            className="text-xs text-ziwa-600 hover:text-ziwa-700 font-medium border border-ziwa-300 rounded-md px-3 py-1.5 hover:bg-ziwa-50 transition-colors"
          >
            Edit report
          </Link>
          <AcknowledgeButton
            reportId={r.id}
            acknowledgedAt={r.acknowledged_at}
            acknowledgedBy={r.acknowledged_by}
            reviewComments={r.review_comments}
          />
          <DeleteReportButton reportId={r.id} departmentName={r.hod_departments.name} />
        </div>
      </div>

      {formConfig ? (
        <FormRenderer
          config={formConfig}
          departmentId=""
          onSuccess={() => {}}
          readOnly
          initialValues={r.report_data}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Report Data</h2>
          <pre className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4 overflow-auto">
            {JSON.stringify(r.report_data, null, 2)}
          </pre>
        </div>
      )}

      <EditHistory history={r.edit_history ?? []} />
    </div>
  )
}
