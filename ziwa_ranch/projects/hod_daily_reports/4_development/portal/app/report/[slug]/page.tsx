import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createServerClient } from '@/lib/supabase-server'
import { getFormBySlug } from '@/config/forms'
import DepartmentHub from './DepartmentHub'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function ReportPage({ params }: PageProps) {
  const { slug } = await params
  const formConfig = getFormBySlug(slug)
  if (!formConfig) notFound()

  const supabase = createServerClient()

  const { data: department } = await supabase
    .from('hod_departments')
    .select('id, name, slug, is_active')
    .eq('slug', slug)
    .single()

  if (!department) notFound()

  if (!department.is_active) {
    return (
      <main className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">&larr; Back</Link>
          </div>
        </header>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500">This department&apos;s report form is coming soon.</p>
          <Link href="/" className="mt-4 inline-block text-sm text-ziwa-600 hover:underline">Back to departments</Link>
        </div>
      </main>
    )
  }

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const minDate = sevenDaysAgo.toISOString().split('T')[0]

  const { data: recentReports } = await supabase
    .from('hod_daily_reports')
    .select('id, report_date, submitted_by, submitted_at, acknowledged_at, acknowledged_by, review_comments, edited_at, edit_history')
    .eq('department_id', department.id)
    .gte('report_date', minDate)
    .order('report_date', { ascending: false })
    .limit(10)

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
            <span>&larr;</span> Departments
          </Link>
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Ziwa Rhino And Wildlife Ranch" width={28} height={28} className="rounded-full" />
            <span className="text-sm font-semibold text-gray-900">Daily Report</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <DepartmentHub
          departmentName={department.name}
          departmentSlug={slug}
          departmentId={department.id}
          recentReports={recentReports ?? []}
        />
      </div>
    </main>
  )
}
