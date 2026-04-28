import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createServerClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'
import { getFormBySlug } from '@/config/forms'
import { isWithinEditWindow, formatDateTimeKampala, formatDateLongKampala, getSubmissionStatus, getStatusLabel, getStatusBadgeClasses } from '@/lib/submission-status'
import ViewReportContent from './ViewReportContent'
import ReportThread from '../../ReportThread'

interface PageProps {
  params: Promise<{ slug: string; id: string }>
}

export default async function ViewReportPage({ params }: PageProps) {
  const { slug, id } = await params

  const formConfig = getFormBySlug(slug)
  if (!formConfig) notFound()

  const supabase = createServerClient()

  const { data: report } = await supabase
    .from('hod_daily_reports')
    .select('id, department_id, submitted_by, submitted_at, report_date, report_data, acknowledged_at, acknowledged_by, review_comments, edited_at, edit_history, hod_departments(name, slug)')
    .eq('id', id)
    .single()

  if (!report) notFound()

  const r = report as unknown as {
    id: string
    department_id: string
    submitted_by: string
    submitted_at: string
    report_date: string
    report_data: Record<string, unknown>
    acknowledged_at: string | null
    acknowledged_by: string | null
    review_comments: string | null
    edited_at: string | null
    edit_history: unknown[] | null
    hod_departments: { name: string; slug: string }
  }

  if (r.hod_departments.slug !== slug) notFound()

  const user = await getCurrentUser()
  const status = getSubmissionStatus(r.submitted_at, r.report_date)
  const canEdit = isWithinEditWindow(r.report_date)

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/report/${slug}`} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
            <span>&larr;</span> Back
          </Link>
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Ziwa Rhino And Wildlife Ranch" width={28} height={28} className="rounded-full" />
            <span className="text-sm font-semibold text-gray-900">View Report</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{r.hod_departments.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{formatDateLongKampala(r.report_date)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Submitted by {r.submitted_by}</p>
              <p className="text-xs text-gray-500">{formatDateTimeKampala(r.submitted_at)}</p>
            </div>
            <span className={`text-xs border rounded px-2 py-0.5 ${getStatusBadgeClasses(status)}`}>
              {getStatusLabel(status)}
            </span>
          </div>

          {r.acknowledged_at && (
            <div className="flex items-start gap-2 text-xs text-green-700 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 shrink-0" />
              <span className="break-words min-w-0">
                Reviewed by {r.acknowledged_by}
                {r.review_comments && (
                  <span className="text-gray-400"> &mdash; &ldquo;{r.review_comments}&rdquo;</span>
                )}
              </span>
            </div>
          )}

          {(r.edit_history?.length ?? 0) > 0 && (
            <p className="text-xs text-amber-600">
              Edited {r.edit_history!.length} time{r.edit_history!.length > 1 ? 's' : ''}
              {r.edited_at && <> &middot; last at {formatDateTimeKampala(r.edited_at)}</>}
            </p>
          )}

          {canEdit && (
            <Link
              href={`/report/${slug}/edit/${r.id}`}
              className="inline-block text-xs text-amber-600 hover:text-amber-700 font-medium border border-amber-300 rounded-lg px-4 py-2 hover:bg-amber-50 transition-colors"
            >
              Edit this report
            </Link>
          )}
        </div>

        <ViewReportContent
          config={formConfig}
          departmentId={r.department_id}
          reportData={r.report_data}
        />

        {user?.id && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Discussion</h2>
            <ReportThread
              reportId={r.id}
              currentUserId={user.id}
            />
          </div>
        )}
      </div>
    </main>
  )
}
