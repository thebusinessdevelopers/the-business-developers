'use client'

import { useState, useEffect } from 'react'
import type { DepartmentFormConfig, FormSection, FormField } from '@/types'

interface ComparisonData {
  id: string
  submitted_by: string
  report_date: string
  submitted_at: string
  report_data: Record<string, unknown>
}

interface ReportComparisonProps {
  currentReport: {
    report_data: Record<string, unknown>
    report_date: string
    department_id: string
  }
  formConfig: DepartmentFormConfig
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined || val === '') return '—'
  if (typeof val === 'number') return val.toLocaleString()
  if (typeof val === 'string') return val
  if (Array.isArray(val)) {
    if (val.length === 0) return '—'
    if (typeof val[0] === 'string') return val.join(', ')
    return `${val.length} item${val.length !== 1 ? 's' : ''}`
  }
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function getNumericDelta(current: unknown, previous: unknown): { delta: number; percent: number } | null {
  const c = typeof current === 'number' ? current : parseFloat(String(current))
  const p = typeof previous === 'number' ? previous : parseFloat(String(previous))
  if (isNaN(c) || isNaN(p)) return null
  const delta = c - p
  const percent = p !== 0 ? (delta / p) * 100 : delta !== 0 ? 100 : 0
  return { delta, percent }
}

function DeltaBadge({ delta, percent }: { delta: number; percent: number }) {
  if (delta === 0) return null
  const isUp = delta > 0
  const significant = Math.abs(percent) >= 20
  const color = significant
    ? (isUp ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50')
    : 'text-gray-500 bg-gray-50'

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs rounded px-1.5 py-0.5 font-medium ${color}`}>
      {isUp ? '↑' : '↓'} {Math.abs(delta).toLocaleString()}
      {Math.abs(percent) >= 1 && <span className="text-[10px] opacity-70">({Math.abs(Math.round(percent))}%)</span>}
    </span>
  )
}

function InventoryDiff({ current, previous, label }: { current: unknown; previous: unknown; label: string }) {
  const currentItems = Array.isArray(current) ? current as { item: string; quantity?: number; unit?: string }[] : []
  const previousItems = Array.isArray(previous) ? previous as { item: string; quantity?: number; unit?: string }[] : []

  if (currentItems.length === 0 && previousItems.length === 0) return null

  const prevMap = new Map(previousItems.filter(i => i.item).map(i => [i.item, i]))
  const currMap = new Map(currentItems.filter(i => i.item).map(i => [i.item, i]))
  const allItems = [...new Set([...prevMap.keys(), ...currMap.keys()])]

  const diffs = allItems.map(name => {
    const curr = currMap.get(name)
    const prev = prevMap.get(name)
    const cq = curr?.quantity ?? 0
    const pq = prev?.quantity ?? 0
    return { name, current: cq, previous: pq, unit: curr?.unit ?? prev?.unit ?? '', isNew: !prev, isRemoved: !curr }
  }).filter(d => d.current !== d.previous || d.isNew || d.isRemoved)

  if (diffs.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <div className="space-y-1">
        {diffs.map(d => (
          <div key={d.name} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1.5">
            <span className="text-gray-900 font-medium">{d.name}</span>
            <span className="text-gray-600">
              {d.isNew ? (
                <span className="text-blue-600">New: {d.current} {d.unit}</span>
              ) : d.isRemoved ? (
                <span className="text-gray-400 line-through">{d.previous} {d.unit}</span>
              ) : (
                <>
                  {d.previous} → {d.current} {d.unit}
                  {' '}
                  <DeltaBadge delta={d.current - d.previous} percent={d.previous !== 0 ? ((d.current - d.previous) / d.previous) * 100 : 100} />
                </>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ReportComparison({ currentReport, formConfig }: ReportComparisonProps) {
  const [previousReport, setPreviousReport] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!expanded) return
    if (previousReport) return

    let cancelled = false
    async function fetchPrevious() {
      setLoading(true)
      setError(null)
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data } = await supabase
          .from('hod_daily_reports')
          .select('id, submitted_by, report_date, submitted_at, report_data')
          .eq('department_id', currentReport.department_id)
          .lt('report_date', currentReport.report_date)
          .order('report_date', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (cancelled) return
        if (data) {
          setPreviousReport(data as ComparisonData)
        } else {
          setError('No previous report found for this department.')
        }
      } catch {
        if (!cancelled) setError('Could not load previous report.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchPrevious()
    return () => { cancelled = true }
  }, [expanded, previousReport, currentReport.department_id, currentReport.report_date])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-800 hover:text-gray-600 transition-colors w-full text-left"
      >
        <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>&rsaquo;</span>
        Compare with previous report
      </button>

      {expanded && loading && (
        <div className="mt-4 text-sm text-gray-400">Loading previous report...</div>
      )}

      {expanded && error && (
        <div className="mt-4 text-sm text-gray-500">{error}</div>
      )}

      {expanded && previousReport && (
        <div className="mt-4 space-y-6">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Comparing with: <span className="font-medium text-gray-700">{previousReport.report_date}</span></span>
            <span>by {previousReport.submitted_by}</span>
          </div>

          {formConfig.sections.map((section: FormSection) => {
            const diffs = section.fields.map((field: FormField) => {
              const currVal = currentReport.report_data[field.name]
              const prevVal = previousReport.report_data[field.name]
              const currNA = currentReport.report_data[`${field.name}__na`] === true
              const prevNA = previousReport.report_data[`${field.name}__na`] === true

              if (currNA && prevNA) return null
              if (currNA !== prevNA) {
                return {
                  field,
                  type: 'na_change' as const,
                  currNA,
                  prevNA,
                  currVal,
                  prevVal,
                }
              }

              if (field.type === 'inventory_grid') {
                const cArr = Array.isArray(currVal) ? currVal : []
                const pArr = Array.isArray(prevVal) ? prevVal : []
                if (JSON.stringify(cArr) === JSON.stringify(pArr)) return null
                return { field, type: 'inventory' as const, currVal, prevVal }
              }

              const cStr = formatValue(currVal)
              const pStr = formatValue(prevVal)
              if (cStr === pStr) return null

              return { field, type: 'value' as const, currVal, prevVal }
            }).filter(Boolean)

            if (diffs.length === 0) return null

            return (
              <div key={section.title} className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-1">{section.title}</h3>
                <div className="space-y-3">
                  {diffs.map(diff => {
                    if (!diff) return null

                    if (diff.type === 'na_change') {
                      return (
                        <div key={diff.field.name} className="text-xs">
                          <span className="font-medium text-gray-600">{diff.field.label}:</span>{' '}
                          <span className="text-amber-600">
                            {diff.currNA ? 'Marked N/A (was filled previously)' : 'Now filled (was N/A previously)'}
                          </span>
                        </div>
                      )
                    }

                    if (diff.type === 'inventory') {
                      return (
                        <InventoryDiff
                          key={diff.field.name}
                          current={diff.currVal}
                          previous={diff.prevVal}
                          label={diff.field.label}
                        />
                      )
                    }

                    const numDelta = getNumericDelta(diff.currVal, diff.prevVal)

                    return (
                      <div key={diff.field.name} className="text-xs">
                        <span className="font-medium text-gray-600">{diff.field.label}:</span>{' '}
                        {numDelta ? (
                          <span className="text-gray-700">
                            {formatValue(diff.prevVal)} → {formatValue(diff.currVal)}{' '}
                            <DeltaBadge delta={numDelta.delta} percent={numDelta.percent} />
                          </span>
                        ) : (
                          <span className="text-gray-700">
                            <span className="text-gray-400 line-through">{formatValue(diff.prevVal)}</span>
                            {' → '}
                            {formatValue(diff.currVal)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {formConfig.sections.every(section =>
            section.fields.every(field => {
              const cStr = formatValue(currentReport.report_data[field.name])
              const pStr = formatValue(previousReport.report_data[field.name])
              return cStr === pStr
            })
          ) && (
            <p className="text-sm text-gray-400 italic">No differences found between the two reports.</p>
          )}
        </div>
      )}
    </div>
  )
}
