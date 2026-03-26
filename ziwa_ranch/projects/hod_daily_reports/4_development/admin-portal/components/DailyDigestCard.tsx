'use client'

import { useEffect, useState } from 'react'

interface DigestData {
  digest: string | null
  report_count: number
  notes_count?: number
  error?: string
}

export default function DailyDigestCard() {
  const [data, setData] = useState<DigestData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/daily-digest')
      .then((r) => r.json())
      .then((d: DigestData) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-36 mb-3" />
        <div className="h-3 bg-gray-100 rounded w-full mb-2" />
        <div className="h-3 bg-gray-100 rounded w-3/4" />
      </div>
    )
  }

  if (!data || data.report_count === 0) return null

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-indigo-600 text-lg">&#9733;</span>
        <h3 className="text-sm font-semibold text-indigo-900">Today&apos;s Highlights</h3>
        <span className="text-xs text-indigo-400 ml-auto">
          {data.notes_count ?? 0} note{(data.notes_count ?? 0) !== 1 ? 's' : ''} from {data.report_count} report{data.report_count !== 1 ? 's' : ''}
        </span>
      </div>
      {data.digest ? (
        <p className="text-sm text-gray-700 leading-relaxed">{data.digest}</p>
      ) : (
        <p className="text-sm text-gray-400 italic">
          {data.error ?? 'No substantive notes submitted yet today.'}
        </p>
      )}
    </div>
  )
}
