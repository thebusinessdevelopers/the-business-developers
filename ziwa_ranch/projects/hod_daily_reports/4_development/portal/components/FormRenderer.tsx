'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { DepartmentFormConfig } from '@/types'
import StockProjectionDisplay from './StockProjectionDisplay'
import { getDeadlineBadge, isWithinEditWindow, formatDateTimeKampala, getKampalaDateStr, type DeadlineBadge } from '@/lib/submission-status'
import { useDraftManager, type DraftData } from '@/hooks/useDraftManager'
import { useSubmissionQueue } from '@/hooks/useSubmissionQueue'
import { addSessionFlushListener } from '@hod/shared/lib/session-flush'
import FieldRenderer from './form/FieldRenderer'
import SectionProgress from './form/SectionProgress'
import { validateForm, validateSection } from './form/FormValidation'
import { isSectionMarkedNA } from '@hod/shared/lib/na-markers'

interface FormRendererProps {
  config: DepartmentFormConfig
  departmentId: string
  draftScope?: string
  onSuccess: (reportId?: string) => void
  stockProjection?: { item: string; quantity: number; unit: string }[] | null
  editMode?: boolean
  editReportId?: string
  initialValues?: Record<string, unknown>
  prefillValues?: Record<string, unknown>
  initialSubmittedBy?: string
  initialReportDate?: string
  editorName?: string
  lockedDate?: string
  readOnly?: boolean
  currentUserName?: string
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
  draftScope,
  onSuccess,
  stockProjection,
  editMode = false,
  editReportId,
  initialValues,
  prefillValues,
  initialSubmittedBy,
  initialReportDate,
  lockedDate,
  readOnly = false,
  currentUserName,
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
    if (currentUserName && allNames.includes(currentUserName)) return currentUserName
    return config.hods[0]
  })
  const [customName, setCustomName] = useState(() => {
    if (editMode && initialSubmittedBy && !allNames.includes(initialSubmittedBy)) return initialSubmittedBy
    return ''
  })
  const [reportDate, setReportDate] = useState(defaultDate)
  const [values, setValues] = useState<FormValues>(initialValues ?? {})
  const [naSections, setNaSections] = useState<Record<string, boolean>>(() => {
    if (!initialValues) return {}
    const initial: Record<string, boolean> = {}
    for (const section of config.sections) {
      if (isSectionMarkedNA(section, initialValues)) initial[section.title] = true
    }
    return initial
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicateReportId, setDuplicateReportId] = useState<string | null>(null)
  const [deadlineBadge, setDeadlineBadge] = useState<DeadlineBadge | null>(null)
  const [existingReport, setExistingReport] = useState<{
    id: string; submitted_by: string; submitted_at: string; report_data: Record<string, unknown>
  } | null>(null)
  const [viewingExisting, setViewingExisting] = useState(false)
  const [inlineEditMode, setInlineEditMode] = useState(false)
  const [queued, setQueued] = useState(false)

  const effectiveEditMode = editMode || inlineEditMode
  const effectiveEditReportId = editMode ? editReportId : existingReport?.id
  const submittedBy = nameSelection === '__other__' ? customName.trim() : nameSelection

  useEffect(() => {
    setValues((prev) => ({ ...prev, submitted_by: submittedBy }))
  }, [submittedBy])

  const hasStockConfig = !!config.stockConfig
  const isStockEntryDay = hasStockConfig && isMonday(reportDate)
  const fieldDisabled = readOnly || (viewingExisting && !inlineEditMode)

  const isPaged = config.sectionMode === 'paged' && !readOnly && !viewingExisting
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)

  const visibleSections = config.sections.filter((s) => {
    if (s.mondayOnly && !isMonday(reportDate)) return false
    return true
  })

  const draftActive = !effectiveEditMode && !viewingExisting && !readOnly
  const defaultDraftBy = config.hods[0]
  const { draftData, draftLoaded, draftStatus, saveDraft, scheduleSave, clearDraft } = useDraftManager({
    departmentId,
    reportDate,
    active: draftActive,
    defaultDraftBy,
    draftScope,
  })

  const normaliseSubmitter = (s: string) => s.trim().toLowerCase()
  const { queueSubmission } = useSubmissionQueue((item, reportId) => {
    if (
      item.departmentId === departmentId &&
      item.reportDate === reportDate &&
      normaliseSubmitter(item.submittedBy) === normaliseSubmitter(submittedBy)
    ) {
      clearDraft(item.submittedBy)
      onSuccess(reportId)
    }
  })

  const reportDateLagDays = (() => {
    const msPerDay = 1000 * 60 * 60 * 24
    return Math.round(
      (Date.parse(`${todayKampala}T00:00:00Z`) - Date.parse(`${reportDate}T00:00:00Z`)) / msPerDay,
    )
  })()

  const draftApplied = useRef(false)
  useEffect(() => {
    if (draftData && !draftApplied.current) {
      draftApplied.current = true
      if (draftData.values && Object.keys(draftData.values).length > 0) setValues(draftData.values)
      if (draftData.nameSelection) setNameSelection(draftData.nameSelection)
      if (draftData.customName) setCustomName(draftData.customName)
    }
  }, [draftData])

  useEffect(() => {
    const hasMeaningfulDraftState = (
      Object.keys(values).length > 0 ||
      nameSelection !== defaultDraftBy ||
      customName.trim().length > 0 ||
      submittedBy !== defaultDraftBy
    )
    if (!draftActive || !hasMeaningfulDraftState) return
    const draft: DraftData = { values, nameSelection, customName, submittedBy }
    scheduleSave(draft)
  }, [values, nameSelection, customName, submittedBy, draftActive, scheduleSave, defaultDraftBy])

  const valuesRef = useRef(values)
  const nameSelectionRef = useRef(nameSelection)
  const customNameRef = useRef(customName)
  const submittedByRef = useRef(submittedBy)
  useEffect(() => { valuesRef.current = values }, [values])
  useEffect(() => { nameSelectionRef.current = nameSelection }, [nameSelection])
  useEffect(() => { customNameRef.current = customName }, [customName])
  useEffect(() => { submittedByRef.current = submittedBy }, [submittedBy])

  const hasMeaningfulDraft = useCallback(() => (
    Object.keys(valuesRef.current).length > 0 ||
    nameSelectionRef.current !== defaultDraftBy ||
    customNameRef.current.trim().length > 0 ||
    submittedByRef.current !== defaultDraftBy
  ), [defaultDraftBy])

  const flushDraft = useCallback(async () => {
    if (!draftActive || !hasMeaningfulDraft()) return
    await saveDraft({
      values: valuesRef.current,
      nameSelection: nameSelectionRef.current,
      customName: customNameRef.current,
      submittedBy: submittedByRef.current,
    })
  }, [draftActive, hasMeaningfulDraft, saveDraft])

  useEffect(() => {
    return addSessionFlushListener(flushDraft)
  }, [flushDraft])

  useEffect(() => {
    if (!draftActive) return

    const persistOnUnload = () => {
      if (!hasMeaningfulDraft()) return
      void saveDraft({
        values: valuesRef.current,
        nameSelection: nameSelectionRef.current,
        customName: customNameRef.current,
        submittedBy: submittedByRef.current,
      })
    }

    window.addEventListener('pagehide', persistOnUnload)
    window.addEventListener('beforeunload', persistOnUnload)
    return () => {
      window.removeEventListener('pagehide', persistOnUnload)
      window.removeEventListener('beforeunload', persistOnUnload)
    }
  }, [draftActive, hasMeaningfulDraft, saveDraft])

  useEffect(() => {
    if (effectiveEditMode || readOnly) { setDeadlineBadge(null); return }
    const update = () => setDeadlineBadge(getDeadlineBadge(reportDate))
    update()
    const interval = setInterval(update, 60_000)
    return () => clearInterval(interval)
  }, [reportDate, effectiveEditMode, readOnly])

  const existingReportCache = useRef<Record<string, { id: string; submitted_by: string; submitted_at: string; report_data: Record<string, unknown> } | null>>({})

  useEffect(() => {
    if (editMode || readOnly || lockedDate) return
    let cancelled = false

    const cacheKey = `${departmentId}:${reportDate}`
    if (cacheKey in existingReportCache.current) {
      const cached = existingReportCache.current[cacheKey]
      if (cached) {
        setExistingReport(cached)
        setValues(cached.report_data as FormValues)
        setViewingExisting(true)
        setInlineEditMode(false)
      } else {
        setExistingReport(null)
        setViewingExisting(false)
        setInlineEditMode(false)
      }
      return
    }

    const debounceTimer = setTimeout(async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data } = await supabase
          .from('hod_daily_reports')
          .select('id, submitted_by, submitted_at, report_data')
          .eq('department_id', departmentId)
          .eq('report_date', reportDate)
          .maybeSingle()
        if (cancelled) return
        existingReportCache.current[cacheKey] = data ?? null
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
    }, 300)

    return () => { cancelled = true; clearTimeout(debounceTimer) }
  }, [reportDate, departmentId, editMode, readOnly, lockedDate])

  function setValue(name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const flaggedSections = (Array.isArray(values.hod_flagged_sections) ? values.hod_flagged_sections : []) as string[]

  function toggleSectionFlag(sectionTitle: string) {
    const current = (Array.isArray(values.hod_flagged_sections) ? values.hod_flagged_sections : []) as string[]
    const next = current.includes(sectionTitle)
      ? current.filter((s) => s !== sectionTitle)
      : [...current, sectionTitle]
    setValues((prev) => ({ ...prev, hod_flagged_sections: next }))
  }

  function toggleSectionNA(section: typeof config.sections[number]) {
    const isCurrentlyNA = naSections[section.title] ?? false
    const willBeNA = !isCurrentlyNA

    if (willBeNA) {
      const naSectionsCount = Object.values({ ...naSections, [section.title]: true }).filter(Boolean).length
      const naEligibleSections = config.sections.filter(s => s.allowNA)
      const totalSections = config.sections.filter(s => !s.mondayOnly || isMonday(reportDate)).length
      if (naSectionsCount >= totalSections && naEligibleSections.length >= totalSections) {
        if (!window.confirm("You've marked every section as N/A. Are you sure there's nothing to report today?")) {
          return
        }
      }
    }

    setNaSections(prev => ({ ...prev, [section.title]: willBeNA }))
    setValues(prev => {
      const next = { ...prev }
      for (const field of section.fields) {
        if (willBeNA) {
          next[`${field.name}__na`] = true
        } else {
          delete next[`${field.name}__na`]
        }
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (readOnly) return

    const validationError = validateForm({
      config, values, effectiveEditMode, readOnly, submittedBy, reportDate,
    })
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
        if (!res.ok) { setError(result.error || 'Failed to save edit.'); setSubmitting(false); return }
        if (result.noChanges) { setError('No changes detected.'); setSubmitting(false); return }
        onSuccess(effectiveEditReportId)
        return
      }

      const payload: Record<string, unknown> = {
        departmentId, reportDate, reportData: values, submittedBy,
        stockConfig: config.stockConfig ?? null,
      }
      let res = await fetch('/api/submit-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      let result = await res.json()
      if (!res.ok && result?.needsConfirmOffset) {
        const days = Number(result.lagDays) || 0
        const prompt = days >= 2
          ? `This report is ${days} days behind today (${todayKampala}). Submit anyway?`
          : `This report is 1 day behind today (${todayKampala}). Submit anyway?`
        if (!window.confirm(prompt)) {
          setSubmitting(false)
          return
        }
        res = await fetch('/api/submit-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, confirm_offset: true }),
        })
        result = await res.json()
      }
      if (!res.ok) {
        if (res.status === 409 && result.duplicateId) setDuplicateReportId(result.duplicateId)
        setError(result.error || 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }
      clearDraft(submittedBy)
      onSuccess(result.reportId)
    } catch (err: unknown) {
      console.error(err)
      const message = (err as { message?: string })?.message ?? 'Unknown error'
      const isNetwork = message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('Load failed')

      if (isNetwork && !effectiveEditMode) {
        queueSubmission({
          departmentId, reportDate, reportData: values, submittedBy,
          stockConfig: config.stockConfig ?? null, slug: config.slug,
        })
        setQueued(true)
        setError(null)
      } else {
        fetch('/api/log-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            department_id: departmentId, submitted_by: submittedBy, report_date: reportDate,
            error_code: 'CLIENT_ERROR', error_message: message,
            error_context: { slug: config.slug, editMode },
          }),
        }).catch(() => {})
        setError(isNetwork
          ? 'Network error — check your internet connection and try again.'
          : 'Something went wrong. Please try again or contact admin if this persists.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleSaveDraft() {
    const draft: DraftData = { values, nameSelection, customName, submittedBy }
    saveDraft(draft)
  }

  function handlePagedNext() {
    const section = visibleSections[currentSectionIndex]
    if (section) {
      const err = validateSection(section, values, isStockEntryDay)
      if (err) { setError(err); return }
    }
    setError(null)
    if (draftActive) {
      const draft: DraftData = { values, nameSelection, customName, submittedBy }
      saveDraft(draft)
    }
    setCurrentSectionIndex((i) => Math.min(i + 1, visibleSections.length - 1))
  }

  function handlePagedPrevious() {
    setError(null)
    setCurrentSectionIndex((i) => Math.max(i - 1, 0))
  }

  if (readOnly) {
    return (
      <div className="space-y-8">
        {config.sections.map((section) => {
          const isNA = isSectionMarkedNA(section, values)
          return (
            <div key={section.title} className="space-y-4 mb-8">
              <h2 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2">
                {section.title}
              </h2>
              {isNA ? (
                <p className="text-sm text-gray-400 italic">Nothing to report — marked N/A</p>
              ) : (
                <div className="space-y-4">
                  {section.fields.map((field) => (
                    <FieldRenderer
                      key={field.name}
                      field={field} values={values} setValue={setValue}
                      disabled readOnly slug={config.slug}
                      departmentId={departmentId} reportDate={reportDate}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const nameSelector = (
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
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {!editMode && !lockedDate && (
        <div className="bg-gray-50 rounded-xl p-5 space-y-4 border border-gray-200">
          {nameSelector}
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
            Please confirm the submission date is correct before submitting.
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Report date <span className="text-red-500">*</span>
            </label>
            <input
              type="date" value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              required min={minDate} max={todayKampala}
              className={inputClass}
            />
            {deadlineBadge && (
              <span className={`inline-block text-xs rounded px-2 py-0.5 mt-1 border ${
                deadlineBadge.status === 'on_time' ? 'text-green-700 bg-green-50 border-green-200' :
                deadlineBadge.status === 'warning' ? 'text-amber-700 bg-amber-50 border-amber-200' :
                'text-red-600 bg-red-50 border-red-200'
              }`}>{deadlineBadge.message}</span>
            )}
            {reportDateLagDays >= 1 && (
              <div className={`mt-2 rounded-md px-3 py-2 text-xs border ${
                reportDateLagDays >= 2
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}>
                This report is dated {reportDateLagDays} day{reportDateLagDays !== 1 ? 's' : ''} before today ({todayKampala}).
                You will be asked to confirm before it submits.
              </div>
            )}
          </div>
        </div>
      )}

      {!editMode && lockedDate && (
        <div className="bg-gray-50 rounded-xl p-5 space-y-4 border border-gray-200">
          {nameSelector}
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
              }`}>{deadlineBadge.message}</span>
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
            <p className="text-sm font-medium text-blue-800">Report already submitted for {reportDate}</p>
            <p className="text-xs text-blue-600 mt-1">
              Submitted by {existingReport.submitted_by} at {formatDateTimeKampala(existingReport.submitted_at)}
            </p>
          </div>
          {inlineEditMode ? (
            <p className="text-xs text-amber-700 font-medium">Editing — changes will be logged.</p>
          ) : isWithinEditWindow(reportDate) ? (
            <button type="button" onClick={() => setInlineEditMode(true)}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg px-4 py-2 transition-colors">
              Edit this report
            </button>
          ) : (
            <p className="text-xs text-gray-500">Editing window closed (deadline: 6:00 PM the day after).</p>
          )}
        </div>
      )}

      {stockProjection && stockProjection.length > 0 && !isStockEntryDay && (
        <StockProjectionDisplay items={stockProjection} stockType={config.stockConfig?.stockType ?? 'store'} />
      )}

      {isPaged && (
        <SectionProgress
          currentIndex={currentSectionIndex}
          totalSections={visibleSections.length}
          sectionTitle={visibleSections[currentSectionIndex]?.title ?? ''}
          onPrevious={handlePagedPrevious}
          onNext={handlePagedNext}
          isFirst={currentSectionIndex === 0}
          isLast={currentSectionIndex === visibleSections.length - 1}
          submitting={submitting}
        />
      )}

      <div className={viewingExisting && !inlineEditMode ? 'opacity-60 pointer-events-none' : ''}>
        {(isPaged ? [visibleSections[currentSectionIndex]] : config.sections).filter(Boolean).map((section) => {
          const isMondaySection = !!section.mondayOnly
          const isDisabledSection = isMondaySection && !isMonday(reportDate)
          const isSectionNA = !!(section.allowNA && naSections[section.title])
          return (
            <div key={section.title} className={`space-y-4 mb-8 ${isDisabledSection ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <h2 className="text-base font-semibold text-gray-800">
                  {section.title}
                </h2>
                <div className="flex items-center gap-2">
                  {!isDisabledSection && !fieldDisabled && (
                    <button
                      type="button"
                      onClick={() => toggleSectionFlag(section.title)}
                      title={flaggedSections.includes(section.title) ? 'Remove management flag' : 'Flag for management attention'}
                      className={`p-1.5 rounded-full transition-colors ${
                        flaggedSections.includes(section.title)
                          ? 'text-red-500 bg-red-50 hover:bg-red-100'
                          : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M3.5 2.75a.75.75 0 0 0-1.5 0v14.5a.75.75 0 0 0 1.5 0v-4.392l1.657-.348a6.449 6.449 0 0 1 4.271.572 7.948 7.948 0 0 0 5.965.524l2.078-.64A.75.75 0 0 0 18 12.25v-8.5a.75.75 0 0 0-.904-.734l-2.38.501a7.25 7.25 0 0 1-4.186-.363l-.502-.2a8.75 8.75 0 0 0-5.053-.439l-1.475.31V2.75Z" />
                      </svg>
                    </button>
                  )}
                  {section.allowNA && !isDisabledSection && !fieldDisabled && (
                    <button
                      type="button"
                      onClick={() => toggleSectionNA(section)}
                      className={`text-xs font-medium rounded-full px-3 py-1 transition-colors ${
                        isSectionNA
                          ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {isSectionNA ? 'Undo N/A' : 'Nothing to report'}
                    </button>
                  )}
                </div>
              </div>
              {isDisabledSection ? (
                <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-500">
                  {config.slug === 'food-and-beverage' ? 'Bar stock count is due on Mondays'
                    : config.slug === 'kitchen' ? 'Kitchen stock count is due on Mondays'
                    : 'Store stock count is due on Mondays'}
                </div>
              ) : isSectionNA ? (
                <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-400 italic">
                  Nothing to report
                </div>
              ) : (
                <div className="space-y-4">
                  {section.fields.map((field) => (
                    <FieldRenderer
                      key={field.name}
                      field={field} values={values} setValue={setValue}
                      disabled={fieldDisabled} readOnly={readOnly} slug={config.slug}
                      departmentId={departmentId} reportDate={reportDate}
                      prefillValues={prefillValues}
                    />
                  ))}
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
            <a href={`/report/${config.slug}/edit/${duplicateReportId}`}
              className="block mt-2 text-ziwa-600 font-medium hover:underline">
              Edit the existing report &rarr;
            </a>
          )}
        </div>
      )}

      {!(viewingExisting && !inlineEditMode) && !isPaged && (
        <div className="space-y-3">
          <div className="flex gap-3">
            {!effectiveEditMode && (
              <button type="button" onClick={handleSaveDraft}
                className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 px-6 rounded-xl transition-colors text-sm">
                Save Draft
              </button>
            )}
            <button type="submit" disabled={submitting}
              className="flex-1 bg-ziwa-500 hover:bg-ziwa-600 disabled:bg-ziwa-300 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm">
              {submitting
                ? (effectiveEditMode ? 'Saving...' : 'Submitting...')
                : (effectiveEditMode ? 'Save Changes' : 'Submit Report')}
            </button>
          </div>
          {!effectiveEditMode && draftLoaded && <p className="text-xs text-center text-blue-600">Draft restored</p>}
          {!effectiveEditMode && draftStatus === 'saved' && !draftLoaded && <p className="text-xs text-center text-green-600">Draft saved</p>}
        </div>
      )}

      {isPaged && (
        <div className="space-y-2">
          {!effectiveEditMode && draftLoaded && <p className="text-xs text-center text-blue-600">Draft restored</p>}
          {!effectiveEditMode && draftStatus === 'saved' && !draftLoaded && <p className="text-xs text-center text-green-600">Draft saved</p>}
        </div>
      )}
    </form>
  )
}
