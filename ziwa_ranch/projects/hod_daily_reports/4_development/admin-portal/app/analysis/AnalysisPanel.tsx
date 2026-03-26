'use client'

import { useState } from 'react'

type PeriodType = 'day' | 'week' | 'month'

interface AnalysisData {
  summary: string
  report_count?: number
  notes_count?: number
  period?: { type: string; key: string; from: string; to: string }
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
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  const periods = getRecentPeriods(periodType)

  function handleTypeChange(type: PeriodType) {
    setPeriodType(type)
    setAnalysis(null)
    setError(null)
    if (type === 'day') setSelectedKey(getYesterday())
    else if (type === 'week') setSelectedKey(getLastWeek())
    else setSelectedKey(getLastMonth())
  }

  async function generateAnalysis() {
    setLoading(true)
    setError(null)
    setAnalysis(null)
    try {
      const res = await fetch('/api/analysis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_type: periodType, period_key: selectedKey }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate analysis.')
        return
      }
      setAnalysis(data.analysis)
      setCached(data.cached ?? false)
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
          onClick={generateAnalysis}
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

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {analysis && (
        <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
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
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{analysis.summary}</p>
          {generatedAt && (
            <p className="text-xs text-gray-400">
              Generated {new Date(generatedAt).toLocaleString('en-GB', { timeZone: 'Africa/Kampala', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
