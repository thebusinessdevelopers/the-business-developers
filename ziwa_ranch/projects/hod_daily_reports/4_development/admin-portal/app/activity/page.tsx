export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'
import { getAdminUser, isMdAdmin } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'
import ActivityFilter from './ActivityFilter'

interface ActivityEntry {
  id: string
  action: string
  metadata: Record<string, unknown> | null
  created_at: string
  hod_users: { hod_name: string; admin_title: string | null } | null
}

function formatDateTime(isoStr: string): string {
  return new Date(isoStr).toLocaleString('en-GB', {
    timeZone: 'Africa/Kampala',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const ACTION_LABELS: Record<string, string> = {
  login: 'Logged in',
  logout: 'Logged out',
  report_submitted: 'Submitted report',
  report_edited: 'Edited report',
  photo_uploaded: 'Uploaded photo',
  guest_login: 'Guest login',
  guest_submission: 'Guest submission',
  password_changed: 'Changed password',
  admin_login: 'Admin logged in',
  admin_logout: 'Admin logged out',
  report_reviewed: 'Reviewed report',
  report_viewed: 'Viewed report',
  report_deleted: 'Deleted report',
  report_date_changed: 'Changed report date',
}

const ACTION_COLOURS: Record<string, string> = {
  login: 'bg-green-100 text-green-700',
  logout: 'bg-gray-100 text-gray-600',
  report_submitted: 'bg-blue-100 text-blue-700',
  report_edited: 'bg-amber-100 text-amber-700',
  photo_uploaded: 'bg-purple-100 text-purple-700',
  guest_login: 'bg-teal-100 text-teal-700',
  guest_submission: 'bg-teal-100 text-teal-700',
  password_changed: 'bg-orange-100 text-orange-700',
  admin_login: 'bg-emerald-100 text-emerald-700',
  admin_logout: 'bg-slate-100 text-slate-600',
  report_reviewed: 'bg-indigo-100 text-indigo-700',
  report_viewed: 'bg-sky-100 text-sky-700',
  report_deleted: 'bg-red-100 text-red-700',
  report_date_changed: 'bg-amber-100 text-amber-700',
}

const ADMIN_ACTIONS = new Set([
  'admin_login', 'admin_logout', 'report_reviewed', 'report_viewed',
  'report_deleted', 'report_date_changed',
])

interface PageProps {
  searchParams: Promise<{ action?: string; page?: string; tab?: string }>
}

export default async function ActivityPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const actionFilter = sp.action ?? ''
  const page = Math.max(1, parseInt(sp.page ?? '1', 10))
  const perPage = 50

  const admin = await getAdminUser()
  if (!admin || !isMdAdmin(admin)) {
    redirect('/')
  }
  const isSenior = isMdAdmin(admin)
  const tab = isSenior ? (sp.tab ?? 'hod') : 'hod'

  const supabase = createServerClient()

  let query = supabase
    .from('hod_activity_log')
    .select('id, action, metadata, created_at, hod_users(hod_name, admin_title)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (tab === 'admin') {
    query = query.in('action', [...ADMIN_ACTIONS, 'report_edited'])
    const { data: adminUsers } = await supabase
      .from('hod_users')
      .select('id')
      .eq('role', 'admin')
    if (adminUsers && adminUsers.length > 0) {
      query = query.in('user_id', adminUsers.map((u) => u.id))
    }
  } else {
    query = query.not('action', 'in', `(${[...ADMIN_ACTIONS].join(',')})`)
  }

  if (actionFilter) {
    query = query.eq('action', actionFilter)
  }

  const { data: entries, count } = await query
  const activities = (entries ?? []) as unknown as ActivityEntry[]
  const totalPages = Math.ceil((count ?? 0) / perPage)

  const { data: actionTypes } = await supabase
    .from('hod_activity_log')
    .select('action')
    .limit(200)

  const allActions = [...new Set((actionTypes ?? []).map((a: { action: string }) => a.action))].sort()
  const filteredActions = tab === 'admin'
    ? allActions.filter((a) => ADMIN_ACTIONS.has(a) || a === 'report_edited')
    : allActions.filter((a) => !ADMIN_ACTIONS.has(a))

  const tabParam = tab !== 'hod' ? `&tab=${tab}` : ''

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <h1 className="text-xl font-bold text-gray-900">Activity Log</h1>
          {isSenior && (
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              <Link
                href="/activity?tab=hod"
                className={`px-3 py-1.5 ${tab === 'hod' ? 'bg-ziwa-50 text-ziwa-700 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                HOD Activity
              </Link>
              <Link
                href="/activity?tab=admin"
                className={`px-3 py-1.5 border-l border-gray-200 ${tab === 'admin' ? 'bg-ziwa-50 text-ziwa-700 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Admin Activity
              </Link>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ActivityFilter
            currentAction={actionFilter}
            actions={filteredActions}
            labels={ACTION_LABELS}
          />
          {actionFilter && (
            <Link
              href={`/activity${tab !== 'hod' ? `?tab=${tab}` : ''}`}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {activities.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No activity found.</div>
        ) : (
          activities.map((entry) => {
            const meta = entry.metadata ?? {}
            const reportId = (meta.report_id as string | undefined) ?? (meta.report_ids ? undefined : undefined)
            const defaultColour = ACTION_COLOURS[entry.action] ?? 'bg-gray-100 text-gray-600'
            const colourClass = isSenior && (entry.action === 'admin_login' || entry.action === 'admin_logout')
              ? 'bg-purple-100 text-purple-800'
              : defaultColour

            const displayName = entry.hod_users?.hod_name ?? (meta.submitted_by as string) ?? (meta.edited_by as string) ?? 'Unknown'
            const adminTitle = entry.hod_users?.admin_title

            return (
              <div key={entry.id} className="px-4 py-3 flex items-start gap-3">
                <span className={`inline-block text-xs font-medium rounded px-2 py-0.5 mt-0.5 whitespace-nowrap ${colourClass}`}>
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    {displayName}
                    {adminTitle && (
                      <span className={`text-xs ml-1 ${adminTitle === 'MD' ? 'text-purple-600 font-medium' : 'text-gray-400'}`}>
                        ({adminTitle})
                      </span>
                    )}
                    {Boolean(meta.department_id) && Boolean(meta.report_date) && (
                      <span className="text-gray-400 ml-1">
                        &mdash; {String(meta.report_date)}
                      </span>
                    )}
                    {Boolean(meta.department) && (
                      <span className="text-gray-400 ml-1">
                        &mdash; {String(meta.department)}
                      </span>
                    )}
                    {Boolean(meta.department_name) && (
                      <span className="text-gray-400 ml-1">
                        &mdash; {String(meta.department_name)}
                      </span>
                    )}
                  </p>
                  {entry.action === 'report_edited' && Boolean(meta.fields_changed) && (
                    <p className="text-xs text-gray-400 truncate">
                      Changed: {(meta.fields_changed as string[]).join(', ')}
                    </p>
                  )}
                  {entry.action === 'photo_uploaded' && Boolean(meta.filename) && (
                    <p className="text-xs text-gray-400 truncate">{String(meta.filename)}</p>
                  )}
                  {entry.action === 'report_date_changed' && (
                    <p className="text-xs text-gray-400">
                      {String(meta.old_date)} &rarr; {String(meta.new_date)}
                    </p>
                  )}
                  {entry.action === 'report_reviewed' && Boolean(meta.batch) && (
                    <p className="text-xs text-gray-400">Batch: {String(meta.count)} reports</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">{formatDateTime(entry.created_at)}</p>
                  {reportId && (
                    <Link
                      href={`/reports/${reportId}`}
                      className="text-xs text-ziwa-600 hover:text-ziwa-700"
                    >
                      View report
                    </Link>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {page > 1 && (
            <Link
              href={`/activity?page=${page - 1}${actionFilter ? `&action=${actionFilter}` : ''}${tabParam}`}
              className="text-sm text-ziwa-600 hover:text-ziwa-700 px-3 py-1 border border-gray-200 rounded-md"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/activity?page=${page + 1}${actionFilter ? `&action=${actionFilter}` : ''}${tabParam}`}
              className="text-sm text-ziwa-600 hover:text-ziwa-700 px-3 py-1 border border-gray-200 rounded-md"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
