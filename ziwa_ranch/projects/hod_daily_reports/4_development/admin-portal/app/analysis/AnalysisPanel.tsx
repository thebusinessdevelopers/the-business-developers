'use client'

import { useState } from 'react'

type PeriodType = 'day' | 'week' | 'month'

interface AnalysisData {
  summary: string
  report_count?: number
  notes_count?: number
  period?: { type: string; key: string; from: string; to: string }
}

const ANALYSIS_HEADERS = [
  'SUMMARY', 'BY DEPARTMENT', 'ISSUES REQUIRING ATTENTION',
  'ACTION ITEMS', 'PATTERNS', 'CROSS-DEPARTMENT CONNECTIONS',
  'ISSUES', 'ACTIONS', 'CROSS-DEPARTMENT',
]

function parseAnalysisSections(text: string): { title: string; body: string }[] {
  const sections: { title: string; body: string }[] = []
  const lines = text.split('\n')
  let currentTitle = ''
  let currentLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (ANALYSIS_HEADERS.includes(trimmed)) {
      if (currentTitle) {
        sections.push({ title: currentTitle, body: currentLines.join('\n').trim() })
      }
      currentTitle = trimmed
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }
  if (currentTitle) {
    sections.push({ title: currentTitle, body: currentLines.join('\n').trim() })
  }
  if (sections.length === 0 && text.trim()) {
    sections.push({ title: 'ANALYSIS', body: text.trim() })
  }
  return sections
}

function getYesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

function getLastWeek(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  d.setDate(d.getDate() + (4 - (d.getDay() || 7)))
  const yearStart = new Date(Date.UTC(d.getFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function getLastMonth(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getRecentPeriods(type: PeriodType): string[] {
  const periods: string[] = []
  if (type === 'day') {
    for (let i = 1; i <= 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      periods.push(d.toISOString().split('T')[0])
    }
  } else if (type === 'week') {
    for (let i = 1; i <= 4; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i * 7)
      d.setDate(d.getDate() + (4 - (d.getDay() || 7)))
      const yearStart = new Date(Date.UTC(d.getFullYear(), 0, 1))
      const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
      const key = `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
      if (!periods.includes(key)) periods.push(key)
    }
  } else {
    for (let i = 1; i <= 3; i++) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
  }
  return periods
}

function formatPeriodLabel(type: PeriodType, key: string): string {
  if (type === 'day') {
    return new Date(key + 'T00:00:00').toLocaleDateString('en-GB', {
      timeZone: 'Africa/Kampala', weekday: 'short', day: 'numeric', month: 'short',
    })
  }
  if (type === 'week') return key.replace('-W', ' Week ')
  if (type === 'month') {
    const [y, m] = key.split('-')
    const d = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, 1))
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }
  return key
}

export default function AnalysisPanel() {
  const [periodType, setPeriodType] = useState<PeriodType>('day')
  const [selectedKey, setSelectedKey] = useState(getYesterday())
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cached, setCached] = useState(false)
  const [degraded, setDegraded] = useState(false)
  const [degradedReason, setDegradedReason] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')

  const periods = getRecentPeriods(periodType)

  function handleTypeChange(type: PeriodType) {
    setPeriodType(type)
    setAnalysis(null)
    setError(null)
    if (type === 'day') setSelectedKey(getYesterday())
    else if (type === 'week') setSelectedKey(getLastWeek())
    else setSelectedKey(getLastMonth())
  }

  async function generateAnalysis(force = false) {
    setLoading(true)
    setError(null)
    setAnalysis(null)
    const trimmed = feedback.trim()
    try {
      const res = await fetch('/api/analysis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period_type: periodType,
          period_key: selectedKey,
          force,
          ...(trimmed.length > 0 ? { feedback: trimmed } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate analysis.')
        return
      }
      setAnalysis(data.analysis)
      setCached(data.cached ?? false)
      setDegraded(data.degraded ?? false)
      setDegradedReason(data.degraded_reason ?? null)
      setGeneratedAt(data.generated_at ?? null)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const tabs: { type: PeriodType; label: string }[] = [
    { type: 'day', label: 'Daily' },
    { type: 'week', label: 'Weekly' },
    { type: 'month', label: 'Monthly' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.type}
            onClick={() => handleTypeChange(tab.type)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              periodType === tab.type
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {periods.map((key) => (
          <button
            key={key}
            onClick={() => { setSelectedKey(key); setAnalysis(null); setError(null) }}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              selectedKey === key
                ? 'border-ziwa-500 bg-ziwa-50 text-ziwa-700 font-medium'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {formatPeriodLabel(periodType, key)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => generateAnalysis()}
          disabled={loading}
          className="bg-ziwa-500 hover:bg-ziwa-600 disabled:bg-ziwa-300 text-white font-medium text-sm rounded-lg px-5 py-2 transition-colors"
        >
          {loading ? 'Generating...' : analysis ? 'Regenerate' : 'Generate Analysis'}
        </button>
        <span className="text-xs text-gray-400">
          {periodType === 'day' ? selectedKey
            : periodType === 'week' ? selectedKey.replace('-W', ' Week ')
            : selectedKey}
        </span>
      </div>

      <div>
        <label htmlFor="analysis-feedback" className="block text-xs font-medium text-gray-500 mb-1">
          Optional guidance for this regeneration
        </label>
        <textarea
          id="analysis-feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="e.g. Focus on accommodation discrepancies this week."
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ziwa-400 focus:border-ziwa-400"
        />
        <p className="text-xs text-gray-400 mt-1">{feedback.length}/500 characters. Not saved; applied only to the next run.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {analysis && (
        <div className={`rounded-xl border p-6 space-y-4 ${degraded ? 'bg-gradient-to-br from-amber-50 to-white border-amber-200' : 'bg-gradient-to-br from-indigo-50 to-white border-indigo-100'}`}>
          {degraded && (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              AI analysis ran in degraded mode.{degradedReason ? ` Reason: ${degradedReason}` : ''} Results may be less detailed than usual.
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-indigo-900">
              {formatPeriodLabel(periodType, selectedKey)} Analysis
            </h3>
            <div className="flex items-center gap-2 text-xs text-indigo-400">
              {cached && <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">Cached</span>}
              {analysis.report_count && (
                <span>{analysis.report_count} reports, {analysis.notes_count ?? 0} notes</span>
              )}
            </div>
          </div>
          <div className="overflow-y-auto max-h-[70vh] space-y-3">
            {parseAnalysisSections(analysis.summary).map((section, i) => (
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
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-indigo-100">
            {generatedAt && (
              <p className="text-xs text-gray-400">
                Generated {new Date(generatedAt).toLocaleString('en-GB', { timeZone: 'Africa/Kampala', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            {cached && (
              <button
                onClick={() => { setCached(false); generateAnalysis(true) }}
                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
              >
                Regenerate
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
