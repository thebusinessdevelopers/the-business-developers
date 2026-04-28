'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ComplianceRowProps {
  slug: string
  name: string
  submitted: number
  missed: number
  rate: number
  missingDates: string[]
  fromStr: string
  toDate: string
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    timeZone: 'Africa/Kampala',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export default function ComplianceRow({ slug, name, submitted, missed, rate, missingDates, fromStr, toDate }: ComplianceRowProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <Link
        href={`/reports?department=${slug}&from=${fromStr}&to=${toDate}`}
        className="block px-5 py-4 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-4 hover:bg-gray-50 transition-colors"
      >
        <p className="text-sm font-medium text-gray-900 sm:w-44 sm:flex-shrink-0">{name}</p>
        <div className="flex-1 flex items-center gap-3">
          <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(rate, 100)}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-gray-900 w-12 text-right">{rate}%</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400 sm:flex-shrink-0">
          <span className="text-green-600">{submitted} submitted</span>
          {missed > 0 && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(!expanded) }}
              className="text-red-500 hover:text-red-700 underline decoration-dotted"
            >
              {missed} missed
            </button>
          )}
        </div>
      </Link>
      {expanded && missingDates.length > 0 && (
        <div className="px-5 pb-4 pt-0">
          <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            <p className="text-xs font-medium text-red-700 mb-2">Missing reports:</p>
            <div className="flex flex-wrap gap-2">
              {missingDates.map((date) => (
                <span key={date} className="text-xs bg-white border border-red-200 rounded px-2 py-1 text-red-600">
                  {formatShortDate(date)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
