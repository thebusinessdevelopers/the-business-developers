'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ReportForTable {
  id: string
  report_date: string
  submitted_by: string
  submitted_at: string
  edited_at: string | null
  acknowledged_at: string | null
  department_name: string
  status: string
  statusLabel: string
  statusBadgeClasses: string
  dot: 'reviewed' | 'needs_rereview' | 'unreviewed'
  urgencyLabel: string | null
  urgencyClasses: string | null
}

const DOT_CLASSES = {
  reviewed: 'bg-green-500',
  needs_rereview: 'bg-amber-500',
  unreviewed: 'bg-red-400',
}

const DOT_TITLES = {
  reviewed: 'Reviewed',
  needs_rereview: 'Edited — needs re-review',
  unreviewed: 'Not reviewed',
}

const REVIEWER_OPTIONS = ['Managing Director', 'General Manager']

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    timeZone: 'Africa/Kampala',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('en-GB', {
    timeZone: 'Africa/Kampala',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ReportsTable({
  reports,
  unreadThreadReportIds = [],
  canManage = true,
}: {
  reports: ReportForTable[]
  unreadThreadReportIds?: string[]
  canManage?: boolean
}) {
  const unreadThreadSet = new Set(unreadThreadReportIds)
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showBatchForm, setShowBatchForm] = useState(false)
  const [reviewer, setReviewer] = useState('')
  const [customReviewer, setCustomReviewer] = useState('')
  const [comments, setComments] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const unreviewedIds = canManage ? reports.filter((r) => !r.acknowledged_at).map((r) => r.id) : []
  const allUnreviewedSelected = unreviewedIds.length > 0 && unreviewedIds.every((id) => selected.has(id))

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllUnreviewed() {
    if (allUnreviewedSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(unreviewedIds))
    }
  }

  const reviewerName = reviewer === '__other__' ? customReviewer.trim() : reviewer

  async function handleBatchReview() {
    if (!reviewerName) {
      setError('Please select who is reviewing.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/batch-review-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportIds: Array.from(selected),
          reviewedBy: reviewerName,
          reviewComments: comments.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to batch review')
      }

      setSelected(new Set())
      setShowBatchForm(false)
      setReviewer('')
      setCustomReviewer('')
      setComments('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to batch review')
    } finally {
      setLoading(false)
    }
  }

  function closeBatchForm() {
    setShowBatchForm(false)
    setError(null)
    setReviewer('')
    setCustomReviewer('')
    setComments('')
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-green-500" /> Reviewed</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-amber-500" /> Edited (needs re-review)</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-red-400" /> Not reviewed</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-indigo-500" /> Unread discussion</span>
      </div>

      {canManage && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-3 bg-ziwa-50 border border-ziwa-200 rounded-lg px-4 py-2.5">
          <span className="text-sm text-ziwa-800 font-medium">{selected.size} selected</span>
          {!showBatchForm ? (
            <button
              onClick={() => setShowBatchForm(true)}
              className="text-xs bg-green-600 hover:bg-green-700 text-white font-medium rounded-md px-3 py-1.5 transition-colors"
            >
              Batch review
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={reviewer}
                onChange={(e) => {
                  setReviewer(e.target.value)
                  if (e.target.value !== '__other__') setCustomReviewer('')
                }}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ziwa-500"
              >
                <option value="">Reviewer...</option>
                {REVIEWER_OPTIONS.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
                <option value="__other__">Someone else</option>
              </select>
              {reviewer === '__other__' && (
                <input
                  type="text"
                  value={customReviewer}
                  onChange={(e) => setCustomReviewer(e.target.value)}
                  placeholder="Name..."
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs w-28 focus:outline-none focus:ring-2 focus:ring-ziwa-500"
                />
              )}
              <input
                type="text"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Comments (optional)"
                className="rounded-md border border-gray-300 px-2 py-1 text-xs w-40 focus:outline-none focus:ring-2 focus:ring-ziwa-500"
              />
              <button
                onClick={handleBatchReview}
                disabled={loading}
                className="text-xs bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium rounded-md px-3 py-1.5 transition-colors"
              >
                {loading ? 'Saving...' : 'Submit'}
              </button>
              <button onClick={closeBatchForm} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
              {error && <p className="text-xs text-red-600 w-full">{error}</p>}
            </div>
          )}
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-gray-400 hover:text-gray-600 ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="px-3 py-3 w-10">
                {canManage && (
                  <input
                    type="checkbox"
                    checked={allUnreviewedSelected && unreviewedIds.length > 0}
                    onChange={toggleAllUnreviewed}
                    title="Select all unreviewed"
                    className="rounded border-gray-300 text-ziwa-600 focus:ring-ziwa-500"
                  />
                )}
              </th>
              <th className="px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 font-medium text-gray-600">Department</th>
              <th className="px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Submitted by</th>
              <th className="px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Time</th>
              <th className="px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Edited</th>
              <th className="px-4 py-3 font-medium text-gray-600 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reports.map((r) => (
              <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${selected.has(r.id) ? 'bg-ziwa-50/50' : ''}`}>
                <td className="px-3 py-3">
                  {canManage && !r.acknowledged_at && (
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                      className="rounded border-gray-300 text-ziwa-600 focus:ring-ziwa-500"
                    />
                  )}
                </td>
                <td className="px-4 py-3 text-gray-900">
                  {formatDate(r.report_date)}
                  {r.status !== 'on_time' && (
                    <span className={`ml-2 inline-block text-xs border rounded px-1.5 py-0.5 ${r.statusBadgeClasses}`}>
                      {r.statusLabel}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {r.department_name}
                  <span className={`ml-2 inline-block w-2 h-2 rounded-full ${DOT_CLASSES[r.dot]}`} title={DOT_TITLES[r.dot]} />
                  {r.urgencyLabel && (
                    <span className={`ml-2 inline-block text-[10px] font-semibold border rounded px-1.5 py-0.5 ${r.urgencyClasses}`}>
                      {r.urgencyLabel}
                    </span>
                  )}
                  {unreadThreadSet.has(r.id) && (
                    <span className="ml-2 inline-block w-2 h-2 rounded-full bg-indigo-500" title="Unread discussion" />
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{r.submitted_by}</td>
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{formatTime(r.submitted_at)}</td>
                <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">
                  {r.edited_at ? formatTime(r.edited_at) : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/reports/${r.id}`} className="text-ziwa-600 hover:text-ziwa-700 font-medium text-xs">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
