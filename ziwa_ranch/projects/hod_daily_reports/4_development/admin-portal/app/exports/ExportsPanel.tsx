'use client'

import { useState } from 'react'

type ExportMode = 'single' | 'range' | 'summary'

interface Department {
  id: string
  name: string
  slug: string
}

interface ExportsPanelProps {
  departments: Department[]
}

function getYesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

function getWeekAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
}

export default function ExportsPanel({ departments }: ExportsPanelProps) {
  const [mode, setMode] = useState<ExportMode>('range')
  const [fromDate, setFromDate] = useState(getWeekAgo())
  const [toDate, setToDate] = useState(getYesterday())
  const [selectedDepts, setSelectedDepts] = useState<string[]>([])
  const [singleDeptId, setSingleDeptId] = useState('')
  const [singleDate, setSingleDate] = useState(getYesterday())
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function toggleDept(deptId: string) {
    setSelectedDepts((prev) =>
      prev.includes(deptId) ? prev.filter((d) => d !== deptId) : [...prev, deptId]
    )
  }

  async function generate() {
    setLoading(true)
    setError(null)
    setContent(null)
    setCopied(false)

    try {
      const payload: Record<string, unknown> = { type: mode }

      if (mode === 'single') {
        if (!singleDeptId || !singleDate) {
          setError('Select a department and date.')
          setLoading(false)
          return
        }
        payload.department_id = singleDeptId
        payload.date = singleDate
      } else {
        payload.from = fromDate
        payload.to = toDate
        if (selectedDepts.length > 0) {
          payload.department_ids = selectedDepts
        }
      }

      const res = await fetch('/api/exports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      let data: Record<string, unknown>
      try {
        data = await res.json()
      } catch {
        setError(`Server returned ${res.status} ${res.statusText} — the response could not be read. Try again or choose a shorter date range.`)
        return
      }

      if (!res.ok) {
        setError(String(data.error || `Export failed (${res.status}).`))
        return
      }
      setContent(data.content as string)
    } catch (err) {
      const detail = err instanceof Error ? err.message : ''
      setError(`Network error${detail ? `: ${detail}` : ''}. Please check your connection and try again.`)
    } finally {
      setLoading(false)
    }
  }

  async function copyToClipboard() {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = content
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function printContent() {
    if (!content) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<html><head><title>Ziwa Report Export</title><style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; font-size: 13px; line-height: 1.6; color: #111; max-width: 800px; }
      pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; }
      @media print { body { padding: 20px; } }
    </style></head><body><pre>${content.replace(/</g, '&lt;')}</pre></body></html>`)
    win.document.close()
    win.print()
  }

  const tabs: { mode: ExportMode; label: string; desc: string }[] = [
    { mode: 'single', label: 'Single Report', desc: 'Export one department report' },
    { mode: 'range', label: 'Date Range', desc: 'Compiled summary of multiple reports' },
    { mode: 'summary', label: 'Executive Summary', desc: 'AI-generated executive brief' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.mode}
            onClick={() => { setMode(tab.mode); setContent(null); setError(null) }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === tab.mode
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400">{tabs.find((t) => t.mode === mode)?.desc}</p>

      {mode === 'single' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
              <select
                value={singleDeptId}
                onChange={(e) => setSingleDeptId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {(mode === 'range' || mode === 'summary') && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">
              Departments
              <span className="text-gray-400 font-normal ml-1">
                {selectedDepts.length === 0 ? '(all)' : `(${selectedDepts.length} selected)`}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {departments.map((d) => (
                <button
                  key={d.id}
                  onClick={() => toggleDept(d.id)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                    selectedDepts.includes(d.id)
                      ? 'border-ziwa-500 bg-ziwa-50 text-ziwa-700 font-medium'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {d.name}
                </button>
              ))}
              {selectedDepts.length > 0 && (
                <button
                  onClick={() => setSelectedDepts([])}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={generate}
          disabled={loading}
          className="bg-ziwa-500 hover:bg-ziwa-600 disabled:bg-ziwa-300 text-white font-medium text-sm rounded-lg px-5 py-2 transition-colors"
        >
          {loading ? (mode === 'summary' ? 'Generating summary...' : 'Generating...') : 'Generate Export'}
        </button>
        {mode === 'summary' && (
          <span className="text-xs text-gray-400">Uses AI to create an executive brief</span>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {content && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="text-sm font-medium text-ziwa-600 hover:text-ziwa-700 border border-ziwa-300 rounded-md px-3 py-1.5 hover:bg-ziwa-50 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
            <button
              onClick={printContent}
              className="text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors"
            >
              Print / Save as PDF
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preview</span>
              <span className="text-xs text-gray-400">{content.split('\n').length} lines</span>
            </div>
            <pre className="p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-[70vh] overflow-y-auto font-mono">
              {content}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
