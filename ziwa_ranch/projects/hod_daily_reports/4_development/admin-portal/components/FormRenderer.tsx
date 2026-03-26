'use client'

import { useState, useEffect, useRef } from 'react'
import { DepartmentFormConfig, FormField, EditHistoryEntry } from '@/types'
import RepeaterField from './RepeaterField'
import NumberStepper from './NumberStepper'
import StockProjectionDisplay from './StockProjectionDisplay'
import { getDeadlineBadge, isWithinEditWindow, formatDateTimeKampala, type DeadlineBadge } from '@/lib/submission-status'
import CalculationHint from './CalculationHint'
import { getCalculationsForSlug, calculateVehicleDistance } from '@/config/calculations'
import RoomGrid, { type RoomsValue } from './RoomGrid'

interface FormRendererProps {
  config: DepartmentFormConfig
  departmentId: string
  onSuccess: (reportId?: string) => void
  stockProjection?: { item: string; quantity: number; unit: string }[] | null
  editMode?: boolean
  editReportId?: string
  initialValues?: Record<string, unknown>
  initialSubmittedBy?: string
  initialReportDate?: string
  editorName?: string
  readOnly?: boolean
}

function isMonday(dateStr: string): boolean {
  return new Date(dateStr + 'T00:00:00').getDay() === 1
}

type FormValues = Record<string, unknown>

interface DraftData {
  values: FormValues
  nameSelection: string
  customName: string
  submittedBy: string
}

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500 focus:border-transparent'

function diffValues(
  oldVals: Record<string, unknown>,
  newVals: Record<string, unknown>,
  config: DepartmentFormConfig
): { field: string; old_value: unknown; new_value: unknown }[] {
  const changes: { field: string; old_value: unknown; new_value: unknown }[] = []
  const allKeys = new Set([...Object.keys(oldVals), ...Object.keys(newVals)])

  const labelMap = new Map<string, string>()
  for (const section of config.sections) {
    for (const field of section.fields) {
      labelMap.set(field.name, field.label)
    }
  }

  for (const key of allKeys) {
    const oldVal = oldVals[key]
    const newVal = newVals[key]
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        field: labelMap.get(key) || key,
        old_value: oldVal ?? null,
        new_value: newVal ?? null,
      })
    }
  }
  return changes
}

export default function FormRenderer({
  config,
  departmentId,
  onSuccess,
  stockProjection,
  editMode = false,
  editReportId,
  initialValues,
  initialSubmittedBy,
  initialReportDate,
  editorName,
  readOnly = false,
}: FormRendererProps) {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const kampalaHour = Number(now.toLocaleString('en-GB', { timeZone: 'Africa/Kampala', hour: 'numeric', hour12: false }))
  const defaultDate = (() => {
    if (config.defaultsToYesterday && kampalaHour < 12) {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      return y.toISOString().split('T')[0]
    }
    return today
  })()
  const minDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 2)
    return d.toISOString().split('T')[0]
  })()

  const allNames = [...config.hods, ...(config.substitutes ?? [])]
  const [nameSelection, setNameSelection] = useState(() => {
    if (editMode && initialSubmittedBy) {
      if (allNames.includes(initialSubmittedBy)) return initialSubmittedBy
      return '__other__'
    }
    return config.hods[0]
  })
  const [customName, setCustomName] = useState(() => {
    if (editMode && initialSubmittedBy && !allNames.includes(initialSubmittedBy)) return initialSubmittedBy
    return ''
  })
  const [reportDate, setReportDate] = useState(editMode && initialReportDate ? initialReportDate : defaultDate)
  const [values, setValues] = useState<FormValues>(initialValues ?? {})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saved'>('idle')
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [duplicateReportId, setDuplicateReportId] = useState<string | null>(null)
  const [deadlineBadge, setDeadlineBadge] = useState<DeadlineBadge | null>(null)
  const [existingReport, setExistingReport] = useState<{
    id: string; submitted_by: string; submitted_at: string; report_data: Record<string, unknown>
  } | null>(null)
  const [viewingExisting, setViewingExisting] = useState(false)
  const [inlineEditMode, setInlineEditMode] = useState(false)

  const draftStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const effectiveEditMode = editMode || inlineEditMode
  const effectiveEditReportId = editMode ? editReportId : existingReport?.id

  const submittedBy = nameSelection === '__other__' ? customName.trim() : nameSelection
  const calculations = getCalculationsForSlug(config.slug)
  const hasStockConfig = !!config.stockConfig
  const isStockEntryDay = hasStockConfig && isMonday(reportDate)

  useEffect(() => {
    if (effectiveEditMode) { setDeadlineBadge(null); return }
    const update = () => setDeadlineBadge(getDeadlineBadge(reportDate))
    update()
    const interval = setInterval(update, 60_000)
    return () => clearInterval(interval)
  }, [reportDate, effectiveEditMode])

  useEffect(() => {
    if (editMode) return
    let cancelled = false
    async function checkExisting() {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data } = await supabase
          .from('hod_daily_reports')
          .select('id, submitted_by, submitted_at, report_data')
          .eq('department_id', departmentId)
          .eq('report_date', reportDate)
          .maybeSingle()
        if (cancelled) return
        if (data) {
          setExistingReport(data)
          setValues(data.report_data as FormValues)
          setViewingExisting(true)
          setInlineEditMode(false)
        } else {
          setExistingReport(null)
          setViewingExisting(false)
          setInlineEditMode(false)
        }
      } catch {
        if (!cancelled) {
          setExistingReport(null)
          setViewingExisting(false)
        }
      }
    }
    checkExisting()
    return () => { cancelled = true }
  }, [reportDate, departmentId, editMode])

  useEffect(() => {
    if (editMode || viewingExisting) return
    let cancelled = false
    async function loadDraft() {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data } = await supabase
          .from('hod_drafts')
          .select('draft_data')
          .eq('department_id', departmentId)
          .eq('report_date', reportDate)
          .maybeSingle()
        if (cancelled || !data) return
        const draft = data.draft_data as DraftData
        if (draft.values) setValues(draft.values)
        if (draft.nameSelection) setNameSelection(draft.nameSelection)
        if (draft.customName) setCustomName(draft.customName)
        setDraftLoaded(true)
        setTimeout(() => setDraftLoaded(false), 3000)
      } catch { /* ignore */ }
    }
    loadDraft()
    return () => { cancelled = true }
  }, [departmentId, reportDate, editMode, viewingExisting])

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (effectiveEditMode || viewingExisting) return
    if (Object.keys(values).length === 0) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      const draft: DraftData = { values, nameSelection, customName, submittedBy }
      import('@/lib/supabase').then(({ supabase }) => {
        supabase.from('hod_drafts').upsert({
          department_id: departmentId,
          draft_by: submittedBy || config.hods[0],
          report_date: reportDate,
          draft_data: draft,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'department_id,report_date,draft_by' }).then(() => {})
      }).catch(() => {})
    }, 30_000)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [values, nameSelection, customName, submittedBy, departmentId, reportDate, effectiveEditMode, viewingExisting, config.hods])

  async function handleSaveDraft() {
    const draft: DraftData = { values, nameSelection, customName, submittedBy }
    try {
      const { supabase } = await import('@/lib/supabase')
      await supabase.from('hod_drafts').upsert({
        department_id: departmentId,
        draft_by: submittedBy || config.hods[0],
        report_date: reportDate,
        draft_data: draft,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'department_id,report_date,draft_by' })
      setDraftStatus('saved')
      if (draftStatusTimer.current) clearTimeout(draftStatusTimer.current)
      draftStatusTimer.current = setTimeout(() => setDraftStatus('idle'), 3000)
    } catch { /* ignore */ }
  }

  async function clearDraft() {
    try {
      const { supabase } = await import('@/lib/supabase')
      await supabase.from('hod_drafts')
        .delete()
        .eq('department_id', departmentId)
        .eq('report_date', reportDate)
    } catch { /* ignore */ }
  }

  function setValue(name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  function getStringValue(name: string): string {
    return String(values[name] ?? '')
  }

  function validate(): string | null {
    if (!effectiveEditMode && !submittedBy) return 'Please enter your name.'
    if (!effectiveEditMode && !reportDate) return 'Please select a report date.'

    for (const section of config.sections) {
      for (const field of section.fields) {
        if (field.required) {
          const val = values[field.name]
          if (val === undefined || val === null || val === '') {
            return `"${field.label}" is required.`
          }
        }
      }
    }
    return null
  }

  async function checkDuplicate(): Promise<string | null> {
    if (effectiveEditMode) return null
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase
        .from('hod_daily_reports')
        .select('id')
        .eq('department_id', departmentId)
        .eq('report_date', reportDate)
        .maybeSingle()
      return data?.id ?? null
    } catch {
      return null
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { supabase } = await import('@/lib/supabase')

      if (effectiveEditMode && effectiveEditReportId) {
        const baseValues = inlineEditMode ? (existingReport?.report_data ?? {}) : (initialValues ?? {})
        const changes = diffValues(baseValues, values, config)
        if (changes.length === 0) {
          setError('No changes detected.')
          setSubmitting(false)
          return
        }

        const { data: existing } = await supabase
          .from('hod_daily_reports')
          .select('edit_history')
          .eq('id', effectiveEditReportId)
          .single()

        const prevHistory = (existing?.edit_history as EditHistoryEntry[] | null) ?? []
        const newEntry: EditHistoryEntry = {
          edited_by: editorName ?? submittedBy,
          edited_at: new Date().toISOString(),
          changes,
        }

        const { error: updateError } = await supabase
          .from('hod_daily_reports')
          .update({
            report_data: values,
            edited_at: new Date().toISOString(),
            last_edited_by: editorName ?? submittedBy,
            edit_history: [...prevHistory, newEntry],
            acknowledged_at: null,
            acknowledged_by: null,
            review_comments: null,
          })
          .eq('id', effectiveEditReportId)

        if (updateError) throw updateError
        onSuccess(effectiveEditReportId)
        return
      }

      const existingId = await checkDuplicate()
      if (existingId) {
        setDuplicateReportId(existingId)
        setError(`A report for this department on ${reportDate} already exists. You can edit the existing report instead.`)
        setSubmitting(false)
        return
      }

      const { data: reportRow, error: dbError } = await supabase.from('hod_daily_reports').insert({
        department_id: departmentId,
        submitted_by: submittedBy,
        report_date: reportDate,
        report_data: values,
      }).select('id').single()

      if (dbError) {
        if (dbError.code === '23505') {
          setError(`A report for this department on ${reportDate} already exists.`)
          setSubmitting(false)
          return
        }
        throw dbError
      }

      if (isStockEntryDay && config.stockConfig) {
        try {
          const stockItems = values[config.stockConfig.stockField]
          if (stockItems && Array.isArray(stockItems)) {
            await supabase.from('hod_verified_stock').insert({
              department_id: departmentId,
              stock_type: config.stockConfig.stockType,
              entry_date: reportDate,
              items: stockItems,
              entered_by: submittedBy,
            })
          }
        } catch (stockErr) {
          console.warn('Verified stock write failed (migration may be pending):', stockErr)
        }
      }

      clearDraft()

      if (reportRow?.id) {
        fetch('/api/harvest-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId: reportRow.id }),
        }).catch(() => {})
      }

      onSuccess(reportRow?.id)
    } catch (err: unknown) {
      console.error(err)

      const supaErr = err as { code?: string; message?: string; details?: string } | null
      const code = supaErr?.code ?? 'UNKNOWN'
      const message = supaErr?.message ?? 'Unknown error'

      let userMessage: string
      switch (code) {
        case '23505':
          userMessage = `A report for this department on ${reportDate} already exists.`
          break
        case '42501':
          userMessage = 'Permission denied. The system may be temporarily misconfigured — please contact admin. (Ref: RLS-42501)'
          break
        case 'PGRST116':
          userMessage = 'The report may have been saved but could not be confirmed. Please check before resubmitting. (Ref: PGRST116)'
          break
        case '23503':
          userMessage = 'Invalid department reference. Please go back and select your department again. (Ref: FK-23503)'
          break
        default:
          if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('Load failed')) {
            userMessage = 'Network error — check your internet connection and try again.'
          } else {
            userMessage = `Something went wrong (Ref: ${code}). Please try again or contact admin if this persists.`
          }
      }

      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department_id: departmentId,
          submitted_by: submittedBy,
          report_date: reportDate,
          error_code: code,
          error_message: message,
          error_context: { slug: config.slug, editMode, details: supaErr?.details },
        }),
      }).catch(() => {})

      setError(userMessage)
    } finally {
      setSubmitting(false)
    }
  }

  function renderField(field: FormField) {
    if (field.type === 'room_grid') {
      const roomsVal = (values[field.name] ?? {}) as RoomsValue
      return (
        <RoomGrid
          key={field.name}
          value={roomsVal}
          onChange={(updated) => setValue(field.name, updated)}
          readOnly={readOnly}
        />
      )
    }

    if (field.type === 'repeater') {
      const raw = values[field.name]
      const rows = (Array.isArray(raw) ? raw : []) as Record<string, string | number>[]
      return (
        <RepeaterField
          key={field.name}
          fieldName={field.name}
          label={field.label}
          subFields={field.sub_fields ?? []}
          minRows={field.min_rows ?? 0}
          value={rows}
          onChange={(updated) => setValue(field.name, updated)}
          departmentSlug={config.slug}
        />
      )
    }

    if (field.type === 'checkbox_group') {
      const selected = (Array.isArray(values[field.name]) ? values[field.name] : []) as string[]
      return (
        <div key={field.name} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">{field.label}</label>
          <div className="grid grid-cols-2 gap-2">
            {field.options?.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selected, opt]
                      : selected.filter((s) => s !== opt)
                    setValue(field.name, next)
                  }}
                  className="rounded border-gray-300 text-ziwa-500 focus:ring-ziwa-500"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )
    }

    if (field.type === 'number' && field.stepper) {
      return (
        <NumberStepper
          key={field.name}
          label={field.label}
          value={Number(values[field.name] ?? 0)}
          onChange={(val) => setValue(field.name, val)}
          min={0}
        />
      )
    }

    return (
      <div key={field.name} className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {field.type === 'textarea' && (
          <textarea
            name={field.name}
            value={getStringValue(field.name)}
            onChange={(e) => setValue(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={3}
            className={inputClass}
          />
        )}

        {field.type === 'number' && (
          <>
            <input
              type="number"
              name={field.name}
              value={getStringValue(field.name)}
              onChange={(e) => setValue(field.name, e.target.value === '' ? '' : Number(e.target.value))}
              placeholder={field.placeholder}
              required={field.required}
              min={0}
              className={inputClass}
            />
            {calculations.map((calc) => {
              if (calc.targetField !== field.name || calc.type !== 'simple') return null
              const suggested = calc.formula(values)
              if (suggested === null) return null
              const currentVal = Number(values[field.name])
              return (
                <CalculationHint
                  key={calc.targetField}
                  label={calc.label}
                  suggestedValue={suggested.toLocaleString()}
                  onAccept={() => setValue(field.name, suggested)}
                  visible={!currentVal || currentVal !== suggested}
                />
              )
            })}
          </>
        )}

        {field.type === 'text' && (
          <input
            type="text"
            name={field.name}
            value={getStringValue(field.name)}
            onChange={(e) => setValue(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={inputClass}
          />
        )}

        {field.type === 'select' && (
          <select
            name={field.name}
            value={getStringValue(field.name)}
            onChange={(e) => setValue(field.name, e.target.value)}
            required={field.required}
            className={inputClass}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}
      </div>
    )
  }

  if (readOnly) {
    return (
      <div className="space-y-8">
        {config.sections.map((section) => (
          <div key={section.title} className="space-y-4 mb-8">
            <h2 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2">
              {section.title}
            </h2>
            <div className="space-y-4">
              {section.fields.map((field) => {
                const val = values[field.name]
                if (val === undefined || val === null || val === '') return null

                if (field.type === 'room_grid' && val && typeof val === 'object' && !Array.isArray(val)) {
                  return (
                    <RoomGrid
                      key={field.name}
                      value={val as RoomsValue}
                      onChange={() => {}}
                      readOnly
                    />
                  )
                }

                if (field.type === 'repeater' && Array.isArray(val) && val.length > 0) {
                  return (
                    <div key={field.name}>
                      <p className="text-sm font-medium text-gray-700 mb-2">{field.label}</p>
                      <div className="space-y-2">
                        {(val as Record<string, unknown>[]).map((row, idx) => (
                          <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                            {field.sub_fields?.map((sub) => {
                              const sv = row[sub.name]
                              if (sv === undefined || sv === null || sv === '') return null
                              return (
                                <p key={sub.name}>
                                  <span className="text-gray-500">{sub.label}:</span>{' '}
                                  <span className="text-gray-900">{String(sv)}</span>
                                </p>
                              )
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }

                if (field.type === 'checkbox_group' && Array.isArray(val) && val.length > 0) {
                  return (
                    <div key={field.name}>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{field.label}</p>
                      <p className="text-sm text-gray-900 mt-0.5">{(val as string[]).join(', ')}</p>
                    </div>
                  )
                }

                return (
                  <div key={field.name}>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{field.label}</p>
                    <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">{String(val)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {!editMode && (
        <div className="bg-gray-50 rounded-xl p-5 space-y-4 border border-gray-200">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Your name <span className="text-red-500">*</span>
            </label>
            <select
              value={nameSelection}
              onChange={(e) => {
                setNameSelection(e.target.value)
                if (e.target.value !== '__other__') setCustomName('')
              }}
              className={inputClass}
            >
              {config.hods.map((hod) => (
                <option key={hod} value={hod}>{hod}</option>
              ))}
              {(config.substitutes ?? []).length > 0 && (
                <optgroup label="Team">
                  {config.substitutes!.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </optgroup>
              )}
              <option value="__other__">Someone else</option>
            </select>
            {nameSelection === '__other__' && (
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Type your name here..."
                required
                className={inputClass + ' mt-2'}
              />
            )}
          </div>

          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
            Please confirm the submission date is correct before submitting.
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Report date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              required
              min={minDate}
              max={today}
              className={inputClass}
            />
            {deadlineBadge && (
              <span className={`inline-block text-xs rounded px-2 py-0.5 mt-1 border ${
                deadlineBadge.status === 'on_time' ? 'text-green-700 bg-green-50 border-green-200' :
                deadlineBadge.status === 'warning' ? 'text-amber-700 bg-amber-50 border-amber-200' :
                'text-red-600 bg-red-50 border-red-200'
              }`}>
                {deadlineBadge.message}
              </span>
            )}
          </div>
        </div>
      )}

      {editMode && (
        <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
          <p className="text-sm font-medium text-amber-800">Editing report</p>
          <p className="text-xs text-amber-600 mt-1">
            Submitted by {initialSubmittedBy} for {initialReportDate}. Changes will be logged.
          </p>
        </div>
      )}

      {viewingExisting && !editMode && existingReport && (
        <div className="bg-blue-50 rounded-xl p-5 border border-blue-200 space-y-3">
          <div>
            <p className="text-sm font-medium text-blue-800">
              Report already submitted for {reportDate}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Submitted by {existingReport.submitted_by} at {formatDateTimeKampala(existingReport.submitted_at)}
            </p>
          </div>
          {inlineEditMode ? (
            <p className="text-xs text-amber-700 font-medium">Editing — changes will be logged.</p>
          ) : isWithinEditWindow(reportDate) ? (
            <button
              type="button"
              onClick={() => setInlineEditMode(true)}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg px-4 py-2 transition-colors"
            >
              Edit this report
            </button>
          ) : (
            <p className="text-xs text-gray-500">Editing window closed (deadline: 12:00 the day after).</p>
          )}
        </div>
      )}

      {stockProjection && stockProjection.length > 0 && !isStockEntryDay && (
        <StockProjectionDisplay
          items={stockProjection}
          stockType={config.stockConfig?.stockType ?? 'store'}
        />
      )}

      <div className={viewingExisting && !inlineEditMode ? 'opacity-60 pointer-events-none' : ''}>
        {config.sections.map((section) => {
          const isMondaySection = !!section.mondayOnly
          const isDisabledSection = isMondaySection && !isMonday(reportDate)

          return (
            <div key={section.title} className={`space-y-4 mb-8 ${isDisabledSection ? 'opacity-50 pointer-events-none' : ''}`}>
              <h2 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2">
                {section.title}
              </h2>
              {isDisabledSection && (
                <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-500">
                  {config.slug === 'food-and-beverage'
                    ? 'Bar stock count is due on Mondays'
                    : config.slug === 'kitchen'
                    ? 'Kitchen stock count is due on Mondays'
                    : 'Store stock count is due on Mondays'}
                </div>
              )}
              {!isDisabledSection && (
                <div className="space-y-4">
                  {section.fields.map((field) => renderField(field))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
          {duplicateReportId && (
            <a
              href={`/report/${config.slug}/edit/${duplicateReportId}`}
              className="block mt-2 text-ziwa-600 font-medium hover:underline"
            >
              Edit the existing report &rarr;
            </a>
          )}
        </div>
      )}

      {!(viewingExisting && !inlineEditMode) && (
        <div className="space-y-3">
          <div className="flex gap-3">
            {!effectiveEditMode && (
              <button
                type="button"
                onClick={handleSaveDraft}
                className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
              >
                Save Draft
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-ziwa-500 hover:bg-ziwa-600 disabled:bg-ziwa-300 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
            >
              {submitting
                ? (effectiveEditMode ? 'Saving...' : 'Submitting...')
                : (effectiveEditMode ? 'Save Changes' : 'Submit Report')}
            </button>
          </div>
          {!effectiveEditMode && draftLoaded && (
            <p className="text-xs text-center text-blue-600">Draft restored</p>
          )}
          {!effectiveEditMode && draftStatus === 'saved' && !draftLoaded && (
            <p className="text-xs text-center text-green-600">Draft saved</p>
          )}
        </div>
      )}
    </form>
  )
}
