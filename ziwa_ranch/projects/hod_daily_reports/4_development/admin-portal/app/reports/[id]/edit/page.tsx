export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'
import { getFormBySlug } from '@/config/forms'
import AdminEditForm from './AdminEditForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminEditPage({ params }: PageProps) {
  const { id } = await params
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

  const formConfig = getFormBySlug(r.hod_departments.slug)
  if (!formConfig) notFound()

  return (
    <div>
      <Link href={`/reports/${id}`} className="text-sm text-gray-500 hover:text-gray-900 mb-6 inline-block">
        &larr; Back to report
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h1 className="text-xl font-bold text-gray-900">Edit: {r.hod_departments.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Report for {r.report_date} by {r.submitted_by}. Admin edits have no time restriction.
        </p>
      </div>

      <div className="max-w-2xl">
        <AdminEditForm
          config={formConfig}
          departmentId={r.department_id}
          reportId={r.id}
          reportData={r.report_data}
          submittedBy={r.submitted_by}
          reportDate={r.report_date}
        />
      </div>
    </div>
  )
}
