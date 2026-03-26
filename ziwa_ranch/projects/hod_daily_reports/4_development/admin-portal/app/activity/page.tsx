export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'

interface ActivityEntry {
  id: string
  action: string
  metadata: Record<string, unknown> | null
  created_at: string
  hod_users: { hod_name: string } | null
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
}

const ACTION_COLOURS: Record<string, string> = {
  login: 'bg-green-100 text-green-700',
  logout: 'bg-gray-100 text-gray-600',
  report_submitted: 'bg-blue-100 text-blue-700',
  report_edited: 'bg-amber-100 text-amber-700',
  photo_uploaded: 'bg-purple-100 text-purple-700',
  guest_login: 'bg-teal-100 text-teal-700',
  guest_submission: 'bg-teal-100 text-teal-700',
}

interface PageProps {
  searchParams: Promise<{ action?: string; page?: string }>
}

export default async function ActivityPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const actionFilter = sp.action ?? ''
  const page = Math.max(1, parseInt(sp.page ?? '1', 10))
  const perPage = 50

  const supabase = createServerClient()

  let query = supabase
    .from('hod_activity_log')
    .select('id, action, metadata, created_at, hod_users(hod_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (actionFilter) {
    query = query.eq('action', actionFilter)
  }

  const { data: entries, count } = await query

  const activities = (entries ?? []) as unknown as ActivityEntry[]
  const totalPages = Math.ceil((count ?? 0) / perPage)

  const { data: actionTypes } = await supabase
    .from('hod_activity_log')
    .select('action')
    .limit(100)

  const uniqueActions = [...new Set((actionTypes ?? []).map((a: { action: string }) => a.action))].sort()

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold text-gray-900">Activity Log</h1>
        <div className="flex items-center gap-2">
          <select
            defaultValue={actionFilter}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white"
          >
            <option value="">All actions</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
            ))}
          </select>
          <Link
            href={actionFilter ? '/activity' : '#'}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {activities.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No activity found.</div>
        ) : (
          activities.map((entry) => {
            const meta = entry.metadata ?? {}
            const reportId = meta.report_id as string | undefined
            const colourClass = ACTION_COLOURS[entry.action] ?? 'bg-gray-100 text-gray-600'

            return (
              <div key={entry.id} className="px-4 py-3 flex items-start gap-3">
                <span className={`inline-block text-xs font-medium rounded px-2 py-0.5 mt-0.5 whitespace-nowrap ${colourClass}`}>
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    {entry.hod_users?.hod_name ?? (meta.submitted_by as string) ?? (meta.edited_by as string) ?? 'Unknown'}
                    {Boolean(meta.department_id) && Boolean(meta.report_date) && (
                      <span className="text-gray-400 ml-1">
                        &mdash; {String(meta.report_date)}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {page > 1 && (
            <Link
              href={`/activity?page=${page - 1}${actionFilter ? `&action=${actionFilter}` : ''}`}
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
              href={`/activity?page=${page + 1}${actionFilter ? `&action=${actionFilter}` : ''}`}
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
