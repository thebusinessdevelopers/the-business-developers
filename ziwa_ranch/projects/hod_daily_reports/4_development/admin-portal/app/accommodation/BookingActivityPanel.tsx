'use client'

import { useState, useEffect } from 'react'
import type { BookingActivityEntry } from '@hod/shared/types'

const ACTION_LABELS: Record<string, string> = {
  created: 'Booking created',
  updated: 'Booking updated',
  deleted: 'Booking deleted',
  hod_created: 'HOD booking created',
  hod_booking_approved: 'HOD booking approved',
  hod_booking_denied: 'HOD booking denied',
  change_request_approved: 'Change request approved',
  change_request_denied: 'Change request denied',
  change_request_submitted: 'Change request submitted',
  status_changed: 'Status changed',
}

interface Props {
  bookingId: string
  onClose: () => void
}

export default function BookingActivityPanel({ bookingId, onClose }: Props) {
  const [entries, setEntries] = useState<BookingActivityEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/accommodation/activity?booking_id=${bookingId}`)
      .then((r) => r.json())
      .then((data) => { setEntries(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [bookingId])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-8">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-900">Booking Activity</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No activity recorded yet.</p>
          ) : (
            <div className="relative pl-4 border-l-2 border-gray-200 space-y-4">
              {entries.map((entry) => (
                <div key={entry.id} className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-gray-300 border-2 border-white" />
                  <p className="text-sm font-medium text-gray-800">
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </p>
                  <p className="text-xs text-gray-400">
                    {entry.actor?.hod_name ?? 'System'} · {new Date(entry.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {entry.details && (
                    <div className="mt-0.5 text-xs text-gray-500">
                      {Array.isArray(entry.details.changed_fields) && (
                        <p>Changed: {(entry.details.changed_fields as string[]).join(', ')}</p>
                      )}
                      {entry.details.auto_applied === true && <p className="text-green-600">Changes auto-applied to booking</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
