import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'
import { getFormBySlug } from '@/config/forms'
import { isAnnouncementRecurringToday, type RecurrenceRule } from '@hod/shared/lib/announcement-recurrence'
import DepartmentHub from './DepartmentHub'
import UserMenu from '@/app/UserMenu'

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

  const user = await getCurrentUser()
  const cookieStore = await cookies()
  const isGuest = !user && Boolean(cookieStore.get('hod_guest')?.value)

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

  const now = new Date()
  const nowIso = now.toISOString()
  const { data: rawAnnouncements } = await supabase
    .from('hod_announcements')
    .select('id, title, body, priority, created_at, recurrence_rule, announcement_type')
    .eq('active', true)
    .or(`department_id.eq.${department.id},department_id.is.null`)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(20)

  const announcements = (rawAnnouncements ?? []).filter(a =>
    isAnnouncementRecurringToday(a.recurrence_rule as RecurrenceRule | null, now)
  ).slice(0, 10)

  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' })
  const forcedAckAnnouncements = announcements.filter(a => a.announcement_type === 'forced_ack')

  let unacknowledgedForcedAck: typeof forcedAckAnnouncements = []
  if (user && forcedAckAnnouncements.length > 0) {
    const { data: acks } = await supabase
      .from('announcement_acknowledgements')
      .select('announcement_id')
      .eq('user_id', user.id)
      .eq('recurrence_date', todayStr)
      .in('announcement_id', forcedAckAnnouncements.map(a => a.id))

    const ackedIds = new Set((acks ?? []).map(a => a.announcement_id))
    unacknowledgedForcedAck = forcedAckAnnouncements.filter(a => !ackedIds.has(a.id))
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Ziwa Rhino And Wildlife Ranch" width={28} height={28} className="rounded-full" />
            <span className="text-sm font-semibold text-gray-900">Daily Report</span>
          </div>
          <UserMenu hodName={user?.hod_name ?? (isGuest ? 'Guest' : null)} isGuest={isGuest} />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <DepartmentHub
          departmentName={department.name}
          departmentSlug={slug}
          departmentId={department.id}
          currentUserId={user?.id ?? null}
          recentReports={recentReports ?? []}
          announcements={announcements as { id: string; title: string; body: string; priority: string; created_at: string; announcement_type: string | null }[]}
          unacknowledgedForcedAck={unacknowledgedForcedAck.map(a => ({ id: a.id, title: a.title, body: a.body }))}
        />
      </div>
    </main>
  )
}
