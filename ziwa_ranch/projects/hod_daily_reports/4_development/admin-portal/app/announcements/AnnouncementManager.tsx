'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AnnouncementRow {
  id: string
  title: string
  body: string
  priority: string
  active: boolean
  department_id: string | null
  created_at: string
  expires_at: string | null
  hod_departments: { name: string } | null
}

interface DeptRow {
  id: string
  name: string
}

interface AnnouncementManagerProps {
  announcements: AnnouncementRow[]
  departments: DeptRow[]
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'border-red-300 bg-red-50',
  important: 'border-amber-300 bg-amber-50',
  normal: 'border-blue-200 bg-blue-50',
}

export default function AnnouncementManager({ announcements, departments }: AnnouncementManagerProps) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState('normal')
  const [departmentId, setDepartmentId] = useState('')
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
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          bodyText: body.trim(),
          priority,
          departmentId: departmentId || null,
          expiresAt: null,
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
      setShowForm(false)
      router.refresh()
    } catch {
      setError('Something went wrong.')
    } finally {
      setSubmitting(false)
    }
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
                  {a.hod_departments?.name ?? 'All departments'} &middot; {a.priority} &middot;{' '}
                  {new Date(a.created_at).toLocaleDateString('en-GB', { timeZone: 'Africa/Kampala', day: 'numeric', month: 'short' })}
                </p>
              </div>
              <button
                onClick={() => handleDelete(a.id)}
                className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
