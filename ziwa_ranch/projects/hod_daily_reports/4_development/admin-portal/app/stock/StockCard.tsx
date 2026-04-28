'use client'

import { useState } from 'react'
import StockTable from './StockTable'
import StockActions from './StockActions'

interface StockEntry {
  id: string
  department_id: string
  stock_type: string
  entry_date: string
  items: { item: string; quantity: number; unit: string }[]
  entered_by: string
  created_at: string
  status: string
  admin_notes: string | null
  hod_departments: { name: string; slug: string }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    timeZone: 'Africa/Kampala',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved') {
    return <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5">Approved</span>
  }
  if (status === 'flagged') {
    return <span className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-0.5">Flagged</span>
  }
  return <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">Pending</span>
}

export default function StockCard({ entry }: { entry: StockEntry }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{entry.hod_departments.name}</p>
            <p className="text-xs text-gray-500">
              {formatDate(entry.entry_date)} · {entry.stock_type} · {entry.entered_by} · {entry.items.length} item{entry.items.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={entry.status} />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          <StockTable entryId={entry.id} items={entry.items} />

          {entry.admin_notes && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded p-2">
              <span className="font-medium">Admin note:</span> {entry.admin_notes}
            </p>
          )}

          <StockActions entryId={entry.id} currentStatus={entry.status} />
        </div>
      )}
    </div>
  )
}
