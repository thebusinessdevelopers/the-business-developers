'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface RecurrenceRule {
  kind: 'weekly' | 'monthly'
  weekdays?: number[]
  days?: number[]
}

interface AnnouncementRow {
  id: string
  title: string
  body: string
  priority: string
  active: boolean
  department_id: string | null
  created_at: string
  expires_at: string | null
  recurrence_rule: RecurrenceRule | null
  announcement_type: string | null
  hod_departments: { name: string } | null
}

interface DeptRow {
  id: string
  name: string
}

interface AnnouncementManagerProps {
  announcements: AnnouncementRow[]
  departments: DeptRow[]
  isMd?: boolean
}

const WEEKDAY_LABELS: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' }

function formatRecurrence(rule: RecurrenceRule): string {
  if (rule.kind === 'weekly' && rule.weekdays?.length) {
    return `weekly (${rule.weekdays.map(d => WEEKDAY_LABELS[d] ?? d).join(', ')})`
  }
  if (rule.kind === 'monthly' && rule.days?.length) {
    return `monthly (${rule.days.join(', ')})`
  }
  return rule.kind
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'border-red-300 bg-red-50',
  important: 'border-amber-300 bg-amber-50',
  normal: 'border-blue-200 bg-blue-50',
}

export default function AnnouncementManager({ announcements, departments, isMd = false }: AnnouncementManagerProps) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState('normal')
  const [departmentId, setDepartmentId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [announcementType, setAnnouncementType] = useState<'banner' | 'forced_ack' | 'inbox_broadcast'>('banner')
  const [recurrenceKind, setRecurrenceKind] = useState<'' | 'weekly' | 'monthly'>('')
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [monthDays, setMonthDays] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      let recurrenceRule: RecurrenceRule | null = null
      if (recurrenceKind === 'weekly' && weekdays.length > 0) {
        recurrenceRule = { kind: 'weekly', weekdays: [...weekdays].sort() }
      } else if (recurrenceKind === 'monthly') {
        const parsed = monthDays.split(',').map(s => parseInt(s.trim(), 10)).filter(n => n >= 1 && n <= 31)
        if (parsed.length > 0) recurrenceRule = { kind: 'monthly', days: parsed.sort((a, b) => a - b) }
      }

      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          bodyText: body.trim(),
          priority,
          departmentId: departmentId || null,
          expiresAt: expiresAt || null,
          recurrenceRule,
          announcementType: announcementType,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to create.')
        return
      }

      setTitle('')
      setBody('')
      setPriority('normal')
      setDepartmentId('')
      setExpiresAt('')
      setAnnouncementType('banner')
      setRecurrenceKind('')
      setWeekdays([])
      setMonthDays('')
      setShowForm(false)
      router.refresh()
    } catch {
      setError('Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResetAcks(id: string) {
    if (!confirm('Reset all acknowledgements for this announcement? HODs will need to re-acknowledge.')) return
    await fetch('/api/announcements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'reset_acknowledgements' }),
    })
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Deactivate this announcement?')) return

    await fetch('/api/announcements', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    router.refresh()
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => setShowForm(!showForm)}
        className="text-sm bg-ziwa-500 hover:bg-ziwa-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
      >
        {showForm ? 'Cancel' : 'New Announcement'}
      </button>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500"
              placeholder="Brief subject line..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500"
              placeholder="Details..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ziwa-500"
              >
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ziwa-500"
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expires at (optional)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={announcementType}
                onChange={(e) => setAnnouncementType(e.target.value as 'banner' | 'forced_ack' | 'inbox_broadcast')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ziwa-500"
              >
                <option value="banner">Banner</option>
                <option value="forced_ack">Forced Acknowledgement</option>
                <option value="inbox_broadcast">Inbox Broadcast</option>
              </select>
            </div>
          </div>

          {/* Recurrence picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence (optional)</label>
            <select
              value={recurrenceKind}
              onChange={(e) => { setRecurrenceKind(e.target.value as '' | 'weekly' | 'monthly'); setWeekdays([]); setMonthDays('') }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ziwa-500"
            >
              <option value="">Every day (no recurrence)</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          {recurrenceKind === 'weekly' && (
            <div className="flex flex-wrap gap-2">
              {([['Mon',1],['Tue',2],['Wed',3],['Thu',4],['Fri',5],['Sat',6],['Sun',7]] as const).map(([label, val]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setWeekdays(prev => prev.includes(val) ? prev.filter(d => d !== val) : [...prev, val])}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                    weekdays.includes(val)
                      ? 'bg-ziwa-500 text-white border-ziwa-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {recurrenceKind === 'monthly' && (
            <div>
              <input
                type="text"
                value={monthDays}
                onChange={(e) => setMonthDays(e.target.value)}
                placeholder="Day numbers, e.g. 1,15"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500"
              />
              <p className="text-xs text-gray-400 mt-1">Comma-separated day numbers (1–31)</p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="bg-ziwa-500 hover:bg-ziwa-600 disabled:bg-ziwa-300 text-white font-semibold px-6 py-2 rounded-lg transition-colors text-sm"
          >
            {submitting ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      {/* Active announcements */}
      <div className="space-y-3">
        {announcements.length === 0 ? (
          <p className="text-gray-400 text-sm">No active announcements.</p>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className={`border rounded-lg px-4 py-3 flex items-start justify-between gap-3 ${PRIORITY_STYLES[a.priority] ?? PRIORITY_STYLES.normal}`}>
              <div>
                <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                <p className="text-sm text-gray-700 mt-0.5">{a.body}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {a.hod_departments?.name ?? 'All departments'} &middot; {a.priority}
                  {a.announcement_type && a.announcement_type !== 'banner' && (
                    <> &middot; <span className={a.announcement_type === 'forced_ack' ? 'text-red-500 font-medium' : 'text-indigo-500 font-medium'}>{a.announcement_type === 'forced_ack' ? 'Forced Ack' : 'Inbox Broadcast'}</span></>
                  )}
                  {' '}&middot;{' '}
                  {new Date(a.created_at).toLocaleDateString('en-GB', { timeZone: 'Africa/Kampala', day: 'numeric', month: 'short' })}
                  {a.expires_at && (
                    <> &middot; Expires {new Date(a.expires_at).toLocaleDateString('en-GB', { timeZone: 'Africa/Kampala', day: 'numeric', month: 'short', year: 'numeric' })}</>
                  )}
                  {a.recurrence_rule && (
                    <> &middot; Recurs {formatRecurrence(a.recurrence_rule)}</>
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                {isMd && a.announcement_type === 'forced_ack' && (
                  <button
                    onClick={() => handleResetAcks(a.id)}
                    className="text-xs text-amber-600 hover:text-amber-800"
                  >
                    Reset acks
                  </button>
                )}
                <button
                  onClick={() => handleDelete(a.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
