'use client'

import { useState, useEffect, useRef } from 'react'
import { DepartmentFormConfig, FormField } from '@/types'
import RepeaterField from './RepeaterField'
import NumberStepper from './NumberStepper'
import StockProjectionDisplay from './StockProjectionDisplay'
import { getDeadlineBadge, isWithinEditWindow, formatDateTimeKampala, getKampalaDateStr, type DeadlineBadge } from '@/lib/submission-status'
import CalculationHint from './CalculationHint'
import { getCalculationsForSlug } from '@/config/calculations'
import { useDraftManager, type DraftData } from '@/hooks/useDraftManager'
import { useSubmissionQueue } from '@/hooks/useSubmissionQueue'
import RoomGrid, { type RoomsValue, type RoomData } from './RoomGrid'
import { ALL_ROOMS } from '@/config/rooms'
import PhotoUploader, { type UploadedPhoto } from './PhotoUploader'
import InventoryGrid, { type ActiveItem, type ExtraFieldDef } from './InventoryGrid'

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
  lockedDate?: string
  readOnly?: boolean
}

function isMonday(dateStr: string): boolean {
  return new Date(dateStr + 'T00:00:00').getDay() === 1
}

type FormValues = Record<string, unknown>

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500 focus:border-transparent'



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
  lockedDate,
  readOnly = false,
}: FormRendererProps) {
  const now = new Date()
  const todayKampala = getKampalaDateStr(now)
  const kampalaHour = Number(now.toLocaleString('en-GB', { timeZone: 'Africa/Kampala', hour: 'numeric', hour12: false }))

  const defaultDate = (() => {
    if (lockedDate) return lockedDate
    if (editMode && initialReportDate) return initialReportDate
    if (config.defaultsToYesterday && kampalaHour < 12) {
      const d = new Date(todayKampala + 'T00:00:00Z')
      d.setUTCDate(d.getUTCDate() - 1)
      return d.toISOString().split('T')[0]
    }
    return todayKampala
  })()

  const minDate = (() => {
    const d = new Date(todayKampala + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - 2)
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
  const [reportDate, setReportDate] = useState(defaultDate)
  const [values, setValues] = useState<FormValues>(initialValues ?? {})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicateReportId, setDuplicateReportId] = useState<string | null>(null)
  const [deadlineBadge, setDeadlineBadge] = useState<DeadlineBadge | null>(null)
  const [existingReport, setExistingReport] = useState<{
    id: string; submitted_by: string; submitted_at: string; report_data: Record<string, unknown>
  } | null>(null)
  const [viewingExisting, setViewingExisting] = useState(false)
  const [inlineEditMode, setInlineEditMode] = useState(false)

  const effectiveEditMode = editMode || inlineEditMode
  const effectiveEditReportId = editMode ? editReportId : existingReport?.id

  const submittedBy = nameSelection === '__other__' ? customName.trim() : nameSelection
  const calculations = getCalculationsForSlug(config.slug)
  const hasStockConfig = !!config.stockConfig
  const isStockEntryDay = hasStockConfig && isMonday(reportDate)

  const [queued, setQueued] = useState(false)

  const draftActive = !effectiveEditMode && !viewingExisting && !readOnly
  const { draftData, draftLoaded, draftStatus, saveDraft, scheduleSave, clearDraft } = useDraftManager({
    departmentId,
    reportDate,
    active: draftActive,
    defaultDraftBy: config.hods[0],
  })

  const { queueSubmission } = useSubmissionQueue((item) => {
    if (item.departmentId === departmentId) {
      clearDraft()
      onSuccess(undefined)
    }
  })

  // Apply loaded draft data once
  const draftApplied = useRef(false)
  useEffect(() => {
    if (draftData && !draftApplied.current) {
      draftApplied.current = true
      if (draftData.values && Object.keys(draftData.values).length > 0) setValues(draftData.values)
      if (draftData.nameSelection) setNameSelection(draftData.nameSelection)
      if (draftData.customName) setCustomName(draftData.customName)
    }
  }, [draftData])

  // Auto-save draft on form changes
  useEffect(() => {
    if (!draftActive || Object.keys(values).length === 0) return
    const draft: DraftData = { values, nameSelection, customName, submittedBy }
    scheduleSave(draft)
  }, [values, nameSelection, customName, submittedBy, draftActive, scheduleSave])

  useEffect(() => {
    if (effectiveEditMode || readOnly) { setDeadlineBadge(null); return }
    const update = () => setDeadlineBadge(getDeadlineBadge(reportDate))
    update()
    const interval = setInterval(update, 60_000)
    return () => clearInterval(interval)
  }, [reportDate, effectiveEditMode, readOnly])

  // Check for existing report when date changes (only when no locked date)
  useEffect(() => {
    if (editMode || readOnly || lockedDate) return
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
  }, [reportDate, departmentId, editMode, readOnly, lockedDate])

  function setValue(name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  function getStringValue(name: string): string {
    return String(values[name] ?? '')
  }

  function validate(): string | null {
    if (!effectiveEditMode && !readOnly && !submittedBy) return 'Please enter your name.'
    if (!effectiveEditMode && !readOnly && !reportDate) return 'Please select a report date.'

    for (const section of config.sections) {
      for (const field of section.fields) {
        if (field.type === 'room_grid' && field.required) {
          const rooms = values[field.name] as RoomsValue | undefined
          if (!rooms) return 'Please set a status for every room.'
          for (const room of ALL_ROOMS) {
            const data = rooms[room.slug] as RoomData | undefined
            if (!data?.status) return `Please set a status for ${room.name}.`
            if (data.status === 'occupied' && !data.condition) {
              return `Please select a condition for ${room.name}.`
            }
          }
          continue
        }
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (readOnly) return

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (effectiveEditMode && effectiveEditReportId) {
        const res = await fetch('/api/edit-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportId: effectiveEditReportId,
            reportData: values,
            submittedBy,
          }),
        })

        const result = await res.json()

        if (!res.ok) {
          setError(result.error || 'Failed to save edit.')
          setSubmitting(false)
          return
        }

        if (result.noChanges) {
          setError('No changes detected.')
          setSubmitting(false)
          return
        }

        onSuccess(effectiveEditReportId)
        return
      }

      // New submission via server API
      const res = await fetch('/api/submit-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId,
          reportDate,
          reportData: values,
          submittedBy,
          stockConfig: config.stockConfig ?? null,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        if (res.status === 409 && result.duplicateId) {
          setDuplicateReportId(result.duplicateId)
        }
        setError(result.error || 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }

      clearDraft()
      onSuccess(result.reportId)
    } catch (err: unknown) {
      console.error(err)
      const message = (err as { message?: string })?.message ?? 'Unknown error'
      const isNetwork = message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('Load failed')

      if (isNetwork && !effectiveEditMode) {
        queueSubmission({
          departmentId,
          reportDate,
          reportData: values,
          submittedBy,
          stockConfig: config.stockConfig ?? null,
          slug: config.slug,
        })
        setQueued(true)
        setError(null)
      } else {
        const userMessage = isNetwork
          ? 'Network error — check your internet connection and try again.'
          : 'Something went wrong. Please try again or contact admin if this persists.'

        fetch('/api/log-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            department_id: departmentId,
            submitted_by: submittedBy,
            report_date: reportDate,
            error_code: 'CLIENT_ERROR',
            error_message: message,
            error_context: { slug: config.slug, editMode },
          }),
        }).catch(() => {})

        setError(userMessage)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleSaveDraft() {
    const draft: DraftData = { values, nameSelection, customName, submittedBy }
    saveDraft(draft)
  }

  function renderField(field: FormField) {
    const disabled = readOnly || (viewingExisting && !inlineEditMode)

    if (field.type === 'inventory_grid') {
      const items = (Array.isArray(values[field.name]) ? values[field.name] : []) as ActiveItem[]
      const cfg = field.inventory_grid_config ?? { category: 'general', showCost: false, showPrevious: true }
      return (
        <div key={field.name} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">{field.label}</label>
          <InventoryGrid
            departmentSlug={config.slug}
            category={cfg.category}
            showCost={cfg.showCost}
            showPrevious={cfg.showPrevious}
            extraFields={(cfg.extraFields ?? []) as ExtraFieldDef[]}
            minItems={field.min_rows ?? 0}
            value={items}
            onChange={disabled ? () => {} : (updated) => setValue(field.name, updated)}
            readOnly={disabled}
          />
        </div>
      )
    }

    if (field.type === 'photo') {
      const photos = (Array.isArray(values[field.name]) ? values[field.name] : []) as UploadedPhoto[]
      const cfg = field.photo_config ?? { maxPhotos: 5, categories: ['Damage', 'Maintenance needed', 'Evidence', 'Record keeping', 'Other'] }
      return (
        <div key={field.name} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">{field.label}</label>
          <PhotoUploader
            departmentSlug={config.slug}
            departmentId={departmentId}
            reportDate={reportDate}
            categories={cfg.categories}
            maxPhotos={cfg.maxPhotos}
            value={photos}
            onChange={disabled ? () => {} : (updated) => setValue(field.name, updated)}
            readOnly={disabled}
          />
        </div>
      )
    }

    if (field.type === 'room_grid') {
      const roomsVal = (values[field.name] ?? {}) as RoomsValue
      return (
        <RoomGrid
          key={field.name}
          value={roomsVal}
          onChange={disabled ? () => {} : (updated) => setValue(field.name, updated)}
          readOnly={disabled}
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
          onChange={disabled ? () => {} : (updated) => setValue(field.name, updated)}
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
                  disabled={disabled}
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
          onChange={disabled ? () => {} : (val) => setValue(field.name, val)}
          min={0}
        />
      )
    }

    return (
      <div key={field.name} className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.required && !readOnly && <span className="text-red-500 ml-1">*</span>}
        </label>

        {field.type === 'textarea' && (
          <textarea
            name={field.name}
            value={getStringValue(field.name)}
            onChange={(e) => setValue(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={disabled}
            rows={3}
            className={inputClass + (disabled ? ' bg-gray-50 text-gray-600' : '')}
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
              disabled={disabled}
              min={0}
              className={inputClass + (disabled ? ' bg-gray-50 text-gray-600' : '')}
            />
            {!disabled && calculations.map((calc) => {
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
            disabled={disabled}
            className={inputClass + (disabled ? ' bg-gray-50 text-gray-600' : '')}
          />
        )}

        {field.type === 'select' && (
          <select
            name={field.name}
            value={getStringValue(field.name)}
            onChange={(e) => setValue(field.name, e.target.value)}
            required={field.required}
            disabled={disabled}
            className={inputClass + (disabled ? ' bg-gray-50 text-gray-600' : '')}
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
              {section.fields.map((field) => renderField(field))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {!editMode && !lockedDate && (
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
              max={todayKampala}
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

      {!editMode && lockedDate && (
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

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Report date</label>
            <p className="text-sm text-gray-900 bg-white border border-gray-200 rounded-md px-3 py-2">
              {new Date(lockedDate + 'T00:00:00').toLocaleDateString('en-GB', {
                timeZone: 'Africa/Kampala', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
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
            <p className="text-xs text-gray-500">Editing window closed (deadline: 6:00 PM the day after).</p>
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

      {queued && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Your report has been saved and will submit automatically when you&apos;re back online.
        </div>
      )}

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
