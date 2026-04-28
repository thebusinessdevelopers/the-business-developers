'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate, CHANGE_REQUEST_STATUS_LABELS, MEAL_PLAN_LABELS } from '@hod/shared/config/accommodation'
import type { ChangeRequestStatus, RequestedChanges, MealPlan } from '@hod/shared/types'

interface ChangeRequest {
  id: string
  booking_id: string
  reason: string
  requested_changes: RequestedChanges | null
  status: ChangeRequestStatus
  review_note: string | null
  created_at: string
  bookings: { id: string; guest_name: string; check_in: string; check_out: string; status: string; adults: number; children: number; meal_plan: string } | null
  requesting_dept: { name: string } | null
  requesting_user: { hod_name: string } | null
  reviewer: { hod_name: string } | null
  reviewed_at: string | null
}

export default function ChangeRequestQueue() {
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [requests, setRequests] = useState<ChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/accommodation/change-requests?status=${filter}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setRequests([])
        setError(data.error || 'Failed to load change requests.')
        return
      }
      const data = await res.json()
      if (!Array.isArray(data)) {
        setRequests([])
        setError('Unexpected response from server.')
        return
      }
      setRequests(data)
    } catch (err) {
      setRequests([])
      setError(err instanceof Error ? err.message : 'Connection failed.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  async function handleAction(id: string, action: 'approved' | 'denied') {
    setPendingActionId(id)
    setError(null)
    try {
      const res = await fetch('/api/accommodation/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, review_note: reviewNote || null }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Action failed. Please try again.')
        return
      }
      setActionId(null)
      setReviewNote('')
      fetchRequests()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed.')
    } finally {
      setPendingActionId(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
          <button onClick={() => { setError(null); fetchRequests() }} className="ml-2 underline text-xs">Retry</button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('pending')}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
            filter === 'pending' ? 'bg-amber-50 border-amber-300 text-amber-700 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
            filter === 'all' ? 'bg-gray-100 border-gray-300 text-gray-700 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          All
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
      ) : error && requests.length === 0 ? null : requests.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center">
          {filter === 'pending' ? 'No pending change requests.' : 'No change requests found.'}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {req.bookings?.guest_name ?? 'Unknown booking'}
                  </p>
                  {req.bookings && (
                    <p className="text-xs text-gray-500">
                      {formatDate(req.bookings.check_in)} → {formatDate(req.bookings.check_out)}
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded border ${
                  req.status === 'pending' ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : req.status === 'approved' ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {CHANGE_REQUEST_STATUS_LABELS[req.status]}
                </span>
              </div>

              <p className="text-sm text-gray-700">{req.reason}</p>

              {req.requested_changes && req.bookings && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 space-y-0.5 text-xs">
                  {req.requested_changes.check_in && req.requested_changes.check_in !== req.bookings.check_in && (
                    <p><span className="text-gray-500">Check In:</span> <span className="line-through text-gray-400">{formatDate(req.bookings.check_in)}</span> → <span className="font-medium text-gray-800">{formatDate(req.requested_changes.check_in)}</span></p>
                  )}
                  {req.requested_changes.check_out && req.requested_changes.check_out !== req.bookings.check_out && (
                    <p><span className="text-gray-500">Check Out:</span> <span className="line-through text-gray-400">{formatDate(req.bookings.check_out)}</span> → <span className="font-medium text-gray-800">{formatDate(req.requested_changes.check_out)}</span></p>
                  )}
                  {req.requested_changes.adults != null && req.requested_changes.adults !== req.bookings.adults && (
                    <p><span className="text-gray-500">Adults:</span> {req.bookings.adults} → <span className="font-medium text-gray-800">{req.requested_changes.adults}</span></p>
                  )}
                  {req.requested_changes.children != null && req.requested_changes.children !== req.bookings.children && (
                    <p><span className="text-gray-500">Children:</span> {req.bookings.children} → <span className="font-medium text-gray-800">{req.requested_changes.children}</span></p>
                  )}
                  {req.requested_changes.meal_plan && req.requested_changes.meal_plan !== req.bookings.meal_plan && (
                    <p><span className="text-gray-500">Meal Plan:</span> {MEAL_PLAN_LABELS[req.bookings.meal_plan as MealPlan] ?? req.bookings.meal_plan} → <span className="font-medium text-gray-800">{MEAL_PLAN_LABELS[req.requested_changes.meal_plan] ?? req.requested_changes.meal_plan}</span></p>
                  )}
                  {req.requested_changes.special_notes && (
                    <p><span className="text-gray-500">Note:</span> {req.requested_changes.special_notes}</p>
                  )}
                </div>
              )}

              <p className="text-xs text-gray-400">
                {req.requesting_user?.hod_name} · {req.requesting_dept?.name} · {new Date(req.created_at).toLocaleDateString('en-GB')}
              </p>

              {req.review_note && (
                <p className="text-xs text-gray-500 italic">Note: {req.review_note}</p>
              )}

              {req.status === 'pending' && (
                <div className="pt-1">
                  {actionId === req.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Note (optional)"
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleAction(req.id, 'approved')} disabled={pendingActionId === req.id} className="text-xs font-medium text-green-600 border border-green-300 rounded px-3 py-1 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed">Approve</button>
                        <button onClick={() => handleAction(req.id, 'denied')} disabled={pendingActionId === req.id} className="text-xs font-medium text-red-600 border border-red-300 rounded px-3 py-1 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed">Deny</button>
                        <button onClick={() => { setActionId(null); setReviewNote('') }} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setActionId(req.id)} className="text-xs font-medium text-ziwa-600 hover:text-ziwa-700">
                      Review
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
