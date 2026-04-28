'use client'

import { useState } from 'react'

interface FailedMediaItem {
  id: string
  generated_filename: string
  hod_description: string | null
  context_category: string | null
  ai_status: string
  ai_error_message: string | null
  report_date: string | null
  created_at: string
  department_name: string
}

interface FailedMediaPanelProps {
  items: FailedMediaItem[]
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

export default function FailedMediaPanel({ items: initialItems }: FailedMediaPanelProps) {
  const [items, setItems] = useState(initialItems)
  const [retrying, setRetrying] = useState(false)
  const [result, setResult] = useState<{ succeeded: number; failed: number } | null>(null)

  async function handleRetryAll() {
    setRetrying(true)
    setResult(null)
    try {
      const res = await fetch('/api/media/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_ids: items.map(i => i.id) }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult({ succeeded: data.succeeded, failed: data.failed })
        if (data.succeeded > 0) {
          const retryRes = await fetch('/api/media/failed')
          if (retryRes.ok) {
            const updated = await retryRes.json()
            setItems(updated.items ?? [])
          }
        }
      }
    } catch {
      setResult({ succeeded: 0, failed: items.length })
    } finally {
      setRetrying(false)
    }
  }

  if (items.length === 0 && result) {
    return (
      <div className="bg-green-50 rounded-xl border border-green-200 p-5">
        <p className="text-sm text-green-700 font-medium">All AI processing retries succeeded.</p>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-amber-900">AI Processing Failures</h2>
          <p className="text-xs text-amber-600 mt-0.5">{items.length} photo{items.length !== 1 ? 's' : ''} with failed or pending AI analysis</p>
        </div>
        <button
          type="button"
          onClick={handleRetryAll}
          disabled={retrying}
          className="text-xs bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-medium rounded-lg px-4 py-2 transition-colors"
        >
          {retrying ? 'Retrying...' : `Retry all (${items.length})`}
        </button>
      </div>

      {result && (
        <div className={`text-xs rounded-md px-3 py-2 ${result.failed > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {result.succeeded} succeeded, {result.failed} failed
        </div>
      )}

      <div className="divide-y divide-amber-200">
        {items.slice(0, 10).map(item => (
          <div key={item.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.generated_filename}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.department_name}
                  {item.report_date && <> &middot; {item.report_date}</>}
                  &middot; {formatDateTime(item.created_at)}
                </p>
                {item.ai_error_message && (
                  <p className="text-xs text-red-600 mt-1 line-clamp-2">{item.ai_error_message}</p>
                )}
              </div>
              <span className={`flex-shrink-0 text-xs rounded px-2 py-0.5 font-medium ${
                item.ai_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {item.ai_status}
              </span>
            </div>
          </div>
        ))}
        {items.length > 10 && (
          <p className="text-xs text-amber-600 pt-2">...and {items.length - 10} more</p>
        )}
      </div>
    </div>
  )
}
