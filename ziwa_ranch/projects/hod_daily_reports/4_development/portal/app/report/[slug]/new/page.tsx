import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createServerClient } from '@/lib/supabase-server'
import { getFormBySlug } from '@/config/forms'
import { getCurrentUser } from '@/lib/auth'
import { getKampalaDateStr } from '@/lib/submission-status'
import NewReportForm from './NewReportForm'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ date?: string; prefill?: string }>
}

export default async function NewReportPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { date, prefill } = await searchParams

  const formConfig = getFormBySlug(slug)
  if (!formConfig) notFound()

  const todayKampala = getKampalaDateStr(new Date())
  const twoDaysAgo = (() => {
    const d = new Date(todayKampala + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - 2)
    return d.toISOString().split('T')[0]
  })()

  if (!date || date < twoDaysAgo || date > todayKampala) {
    redirect(`/report/${slug}`)
  }

  const supabase = createServerClient()

  const { data: department } = await supabase
    .from('hod_departments')
    .select('id, name, slug, is_active')
    .eq('slug', slug)
    .single()

  if (!department || !department.is_active) notFound()

  const { data: existingReport } = await supabase
    .from('hod_daily_reports')
    .select('id')
    .eq('department_id', department.id)
    .eq('report_date', date)
    .maybeSingle()

  if (existingReport) {
    redirect(`/report/${slug}/edit/${existingReport.id}`)
  }

  let prefillData: Record<string, unknown> | null = null
  if (prefill === '1') {
    const { data: latestReport } = await supabase
      .from('hod_daily_reports')
      .select('report_data')
      .eq('department_id', department.id)
      .order('report_date', { ascending: false })
      .limit(1)
      .single()

    if (latestReport?.report_data) {
      const raw = latestReport.report_data as Record<string, unknown>
      prefillData = { ...raw }
      // Strip photo data — don't carry forward uploaded images
      delete prefillData.photos
    }
  }

  const user = await getCurrentUser()

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/report/${slug}`} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
            <span>&larr;</span> Back
          </Link>
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Ziwa Rhino And Wildlife Ranch" width={28} height={28} className="rounded-full" />
            <span className="text-sm font-semibold text-gray-900">New Report</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{department.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Report for {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
              timeZone: 'Africa/Kampala', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>

        {prefillData && (
          <div className="mb-4 border border-blue-200 bg-blue-50 rounded-lg px-4 py-2">
            <p className="text-sm text-blue-700">Pre-filled from your most recent report. Review and update before submitting.</p>
          </div>
        )}

        <NewReportForm
          config={formConfig}
          departmentId={department.id}
          departmentSlug={slug}
          lockedDate={date}
          prefillData={prefillData}
          currentUserId={user?.id ?? null}
          currentUserName={user?.hod_name ?? null}
        />
      </div>
    </main>
  )
}
