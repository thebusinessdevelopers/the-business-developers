'use client'

import { useEffect, useState } from 'react'

interface Insight {
  department: string
  title: string
  detail: string
  severity: 'info' | 'warning' | 'alert'
  category: string
}

interface TrendData {
  insights: Insight[]
  week_start?: string
  report_count?: number
  departments_analysed?: number
  cached?: boolean
  generated_at?: string
  error?: string
  degraded?: boolean
  degraded_reason?: string
  message?: string
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; dot: string; text: string }> = {
  alert: { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', text: 'text-red-800' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500', text: 'text-amber-800' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500', text: 'text-blue-800' },
}

const CATEGORY_LABELS: Record<string, string> = {
  stock: 'Stock',
  visitors: 'Visitors',
  compliance: 'Compliance',
  operations: 'Operations',
  financial: 'Financial',
  staffing: 'Staffing',
}

export default function TrendInsightsCard() {
  const [data, setData] = useState<TrendData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/analysis/trends')
      .then((r) => r.json())
      .then((d: TrendData) => {
        setData(d)
        setFetchError(null)
      })
      .catch((err) => {
        setFetchError(err instanceof Error ? err.message : 'Unable to load insights')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Insights</h2>
          <span className="text-xs text-gray-400">Loading&hellip;</span>
        </div>
        <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-full" />
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-100 rounded w-full" />
          </div>
        </div>
      </section>
    )
  }

  const hasInsights = data?.insights && data.insights.length > 0
  const degradedReason = data?.degraded_reason || fetchError
  const emptyMessage = data?.message || data?.error

  if (!hasInsights) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Insights</h2>
          <span className="text-xs text-gray-400">AI-detected trends from recent reports</span>
        </div>
        {degradedReason ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-sm font-medium text-amber-800">Trend analysis unavailable</p>
            <p className="text-xs text-amber-600 mt-0.5">{degradedReason}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">
            {emptyMessage || 'No notable trends detected this week.'}
          </p>
        )}
      </section>
    )
  }

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Insights</h2>
        <span className="text-xs text-gray-400">
          AI-detected trends from recent reports
          {data?.generated_at && (
            <span className="ml-2">
              &middot; {new Date(data.generated_at).toLocaleDateString('en-GB', {
                timeZone: 'Africa/Kampala', day: 'numeric', month: 'short',
              })}
            </span>
          )}
        </span>
      </div>

      {degradedReason && (
        <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <p className="text-xs font-medium text-amber-800">Trend analysis degraded</p>
          <p className="text-xs text-amber-600 mt-0.5">{degradedReason}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data!.insights.map((insight, i) => {
          const styles = SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.info
          return (
            <div
              key={i}
              className={`${styles.bg} ${styles.border} border rounded-xl px-4 py-3`}
            >
              <div className="flex items-start gap-2.5">
                <span className={`inline-block w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${styles.dot}`} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm font-semibold ${styles.text}`}>{insight.title}</p>
                    <span className="text-xs text-gray-400 bg-white/60 px-1.5 py-0.5 rounded">
                      {CATEGORY_LABELS[insight.category] ?? insight.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{insight.department}</p>
                  <p className="text-sm text-gray-700 mt-1">{insight.detail}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
