export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase-server'

interface ErrorRow {
  id: string
  department_id: string | null
  submitted_by: string | null
  report_date: string | null
  error_code: string | null
  error_message: string
  error_context: Record<string, unknown>
  created_at: string
}

interface DeptRow {
  id: string
  name: string
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Africa/Kampala',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function ErrorsPage() {
  const supabase = createServerClient()

  const { data: errors } = await supabase
    .from('hod_error_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: departments } = await supabase
    .from('hod_departments')
    .select('id, name')

  const deptMap = new Map((departments as DeptRow[] ?? []).map((d) => [d.id, d.name]))
  const rows = (errors ?? []) as ErrorRow[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Error Log</h1>
        <p className="text-sm text-gray-500 mt-1">Submission errors reported by HODs. Most recent first.</p>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No errors logged</p>
          <p className="text-sm mt-1">Errors will appear here when HODs encounter submission problems.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {rows.map((row) => (
            <details key={row.id} className="group">
              <summary className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {row.error_code && <span className="text-red-500 font-mono mr-2">{row.error_code}</span>}
                    {row.error_message}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {row.department_id ? deptMap.get(row.department_id) ?? 'Unknown dept' : 'No department'}
                    {row.submitted_by && <> &middot; {row.submitted_by}</>}
                    {row.report_date && <> &middot; Report for {row.report_date}</>}
                    <> &middot; {formatDateTime(row.created_at)}</>
                  </p>
                </div>
                <span className="text-gray-300 group-open:rotate-90 transition-transform text-sm">&rsaquo;</span>
              </summary>
              <div className="px-5 pb-4 pt-1">
                <pre className="text-xs bg-gray-50 rounded-lg p-3 overflow-x-auto text-gray-600 border border-gray-100">
                  {JSON.stringify(row.error_context, null, 2)}
                </pre>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}
