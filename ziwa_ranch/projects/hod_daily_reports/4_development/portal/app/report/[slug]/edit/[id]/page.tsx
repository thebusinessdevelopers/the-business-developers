import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createServerClient } from '@/lib/supabase-server'
import { getFormBySlug } from '@/config/forms'
import EditReportForm from './EditReportForm'

interface PageProps {
  params: Promise<{ slug: string; id: string }>
}

import { isWithinEditWindow } from '@/lib/submission-status'

export default async function EditReportPage({ params }: PageProps) {
  const { slug, id } = await params

  const formConfig = getFormBySlug(slug)
  if (!formConfig) notFound()

  const supabase = createServerClient()

  const { data: report } = await supabase
    .from('hod_daily_reports')
    .select('id, department_id, submitted_by, report_date, report_data, hod_departments(name, slug)')
    .eq('id', id)
    .single()

  if (!report) notFound()

  const r = report as unknown as {
    id: string
    department_id: string
    submitted_by: string
    report_date: string
    report_data: Record<string, unknown>
    hod_departments: { name: string; slug: string }
  }

  if (r.hod_departments.slug !== slug) notFound()

  const canEdit = isWithinEditWindow(r.report_date)

  if (!canEdit) {
    return (
      <main className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href={`/report/${slug}`} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
              <span>&larr;</span> Back
            </Link>
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="Ziwa Rhino And Wildlife Ranch" width={28} height={28} className="rounded-full" />
              <span className="text-sm font-semibold text-gray-900">Daily Report</span>
            </div>
          </div>
        </header>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Editing window closed</h2>
          <p className="text-sm text-gray-500">
            Reports can only be edited until 12:00 the day after they were due.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm text-ziwa-600 hover:underline">Back to departments</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/report/${slug}`} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
            <span>&larr;</span> Back
          </Link>
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Ziwa Rhino And Wildlife Ranch" width={28} height={28} className="rounded-full" />
            <span className="text-sm font-semibold text-gray-900">Edit Report</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{r.hod_departments.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Edit the report for {r.report_date}.</p>
        </div>

        <EditReportForm
          config={formConfig}
          departmentId={r.department_id}
          reportId={r.id}
          reportData={r.report_data}
          submittedBy={r.submitted_by}
          reportDate={r.report_date}
          slug={slug}
        />
      </div>
    </main>
  )
}
