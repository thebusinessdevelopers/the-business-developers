'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { parseDigestSections } from '../lib/daily-brief-sections'
import {
  shouldAutoRegenerateDailyDigest,
  buildDailyDigestRegenerationRequestBody,
} from '../lib/daily-digest-regeneration-policy'

interface DigestData {
  digest: string | null
  report_count: number
  total_departments?: number
  notes_count?: number
  missing_departments?: string[]
  cached?: boolean
  generated_at?: string
  error?: string
  degraded?: boolean
  degraded_reason?: string
  stale?: boolean
  pending?: boolean
  brief_date?: string
}

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('en-GB', {
    timeZone: 'Africa/Kampala',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const REFRESH_INTERVAL_IDLE = 5 * 60 * 1000
const REFRESH_INTERVAL_PENDING = 15 * 1000

export default function DailyDigestCard() {
  const [data, setData] = useState<DigestData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [regenError, setRegenError] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const kickedOffRef = useRef(false)

  const fetchDigest = useCallback(async (): Promise<DigestData | null> => {
    try {
      const res = await fetch('/api/daily-digest')
      const d = (await res.json()) as DigestData
      setData(d)
      setFetchError(null)
      return d
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Unable to load daily brief')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const kickOffRegenerate = useCallback(async () => {
    if (kickedOffRef.current) return
    kickedOffRef.current = true
    try {
      const body = buildDailyDigestRegenerationRequestBody({ manual: false })
      await fetch('/api/daily-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      kickedOffRef.current = false
    }
  }, [])

  const submitRegenerate = useCallback(async () => {
    setRegenerating(true)
    setRegenError(null)
    const trimmed = feedback.trim()
    try {
      const body = buildDailyDigestRegenerationRequestBody({
        manual: true,
        feedback: trimmed.length > 0 ? trimmed : undefined,
      })
      const res = await fetch('/api/daily-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }
        setRegenError(payload.error ?? 'Regeneration failed.')
      } else {
        const payload = (await res.json()) as DigestData
        setData(payload)
        kickedOffRef.current = true
        setFeedback('')
        setShowFeedback(false)
      }
    } catch {
      setRegenError('Network error. Please retry.')
    } finally {
      setRegenerating(false)
    }
  }, [feedback])

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const schedule = async () => {
      if (cancelled) return
      const d = await fetchDigest()
      if (cancelled) return
      const isPending = Boolean(d?.pending)
      const hasReports = (d?.report_count ?? 0) > 0

      if (shouldAutoRegenerateDailyDigest({
        pending: isPending,
        stale: Boolean(d?.stale),
        digest: d?.digest ?? null,
        report_count: d?.report_count ?? 0,
        alreadyKickedOff: kickedOffRef.current,
      })) {
        void kickOffRegenerate()
      } else if (!isPending) {
        kickedOffRef.current = false
      }

      const needsFastPoll = isPending && hasReports
      timer = setTimeout(schedule, needsFastPoll ? REFRESH_INTERVAL_PENDING : REFRESH_INTERVAL_IDLE)
    }

    void schedule()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [fetchDigest, kickOffRegenerate])

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-indigo-600 text-lg">&#9733;</span>
          <h3 className="text-sm font-semibold text-indigo-900">Daily Brief</h3>
          <span className="text-xs text-indigo-400 ml-auto">Loading&hellip;</span>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-indigo-100 rounded w-full" />
          <div className="h-3 bg-indigo-100 rounded w-3/4" />
          <div className="h-3 bg-indigo-100 rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-indigo-600 text-lg">&#9733;</span>
          <h3 className="text-sm font-semibold text-indigo-900">Daily Brief</h3>
        </div>
        <p className="text-sm text-amber-700">
          Could not load the daily brief. It will retry automatically.
        </p>
        <p className="text-xs text-gray-400 mt-1">{fetchError}</p>
      </div>
    )
  }

  if (!data || data.report_count === 0) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-indigo-600 text-lg">&#9733;</span>
          <h3 className="text-sm font-semibold text-indigo-900">Daily Brief</h3>
        </div>
        <p className="text-sm text-gray-400 italic">
          No reports submitted yet today. The brief will appear once departments begin reporting.
        </p>
      </div>
    )
  }

  const sections = data.digest ? parseDigestSections(data.digest) : []

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 p-5">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-indigo-600 text-lg">&#9733;</span>
        <h3 className="text-sm font-semibold text-indigo-900">Daily Brief</h3>
        <span className="text-xs text-indigo-400 ml-auto flex items-center gap-2">
          <span>
            {data.report_count}/{data.total_departments ?? 16} reported
            {data.generated_at && (
              <span className="ml-2">Updated {formatTime(data.generated_at)}</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setShowFeedback((v) => !v)}
            className="text-indigo-500 hover:text-indigo-700 font-medium"
          >
            {showFeedback ? 'Cancel' : 'Regenerate'}
          </button>
        </span>
      </div>

      {showFeedback && (
        <div className="mb-3 rounded-lg border border-indigo-100 bg-white/60 p-3 space-y-2">
          <label htmlFor="daily-digest-feedback" className="block text-xs font-medium text-indigo-700">
            Optional guidance for this regeneration
          </label>
          <textarea
            id="daily-digest-feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="e.g. Lead with urgent stock issues and downplay routine operations."
            className="w-full text-sm border border-indigo-100 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">{feedback.length}/500. Not saved; applied only to the next run.</p>
            <button
              type="button"
              onClick={submitRegenerate}
              disabled={regenerating}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white text-xs font-medium rounded-md px-3 py-1.5"
            >
              {regenerating ? 'Sending…' : 'Start regeneration'}
            </button>
          </div>
          {regenError && <p className="text-xs text-red-600">{regenError}</p>}
        </div>
      )}

      {data.stale && data.digest && (
        <p className="mb-3 text-xs text-amber-600">
          New data may be available. Regenerate to update.
        </p>
      )}

      {data.degraded_reason && (
        <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <p className="text-xs font-medium text-amber-800">AI summarisation degraded</p>
          <p className="text-xs text-amber-600 mt-0.5">{data.degraded_reason}</p>
        </div>
      )}

      {data.digest ? (
        <div className="space-y-3">
          {sections.map((section, i) => (
            <div key={i}>
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-0.5">
                {section.title}
              </p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {section.body}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">
          {data.error ?? 'No substantive notes submitted yet today.'}
        </p>
      )}
    </div>
  )
}
