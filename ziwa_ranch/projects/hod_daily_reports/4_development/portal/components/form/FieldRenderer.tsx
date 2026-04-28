'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { FormField, SubField } from '@/types'
import { shouldShowField } from '@hod/shared/lib/visible-if'
import RepeaterField from '@/components/RepeaterField'
import type { PhotoSubFieldProps } from '@hod/shared/components/RepeaterField'
import NumberStepper from '@/components/NumberStepper'
import CalculationHint from '@/components/CalculationHint'
import type { RoomsValue } from '@/components/RoomGrid'
import type { UploadedPhoto } from '@/components/PhotoUploader'
import type { ActiveItem, ExtraFieldDef } from '@/components/InventoryGrid'
import { getCalculationsForSlug } from '@/config/calculations'

const RoomGrid = dynamic(() => import('@/components/RoomGrid'), { ssr: false })
const PhotoUploader = dynamic(() => import('@/components/PhotoUploader'), { ssr: false })
const InventoryGrid = dynamic(() => import('@/components/InventoryGrid'), { ssr: false })
const EntryPhotoUploader = dynamic(() => import('@/components/EntryPhotoUploader'), { ssr: false })

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500 focus:border-transparent'

function TextareaNudge({
  name, value, onChange, placeholder, required, disabled, inputClass: cls, prefillComparison,
}: {
  name: string; value: string; onChange: (v: string) => void
  placeholder?: string; required?: boolean; disabled: boolean
  inputClass: string; prefillComparison: React.ReactNode
}) {
  const [touched, setTouched] = useState(false)
  const [focused, setFocused] = useState(false)
  const showNudge = touched && !focused && value.length > 0 && value.length < 20
  return (
    <>
      <textarea
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => { setTouched(true); setFocused(false) }}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={3}
        className={cls + (disabled ? ' bg-gray-50 text-gray-600' : '')}
      />
      {showNudge && (
        <p className="text-xs text-amber-600 mt-0.5">A little more detail helps management act on this.</p>
      )}
      {prefillComparison}
    </>
  )
}

function RepeaterSuggestions({
  departmentId, fieldName, subFields, currentRows, onAddSuggestion,
}: {
  departmentId: string; fieldName: string; subFields: SubField[]
  currentRows: Record<string, unknown>[]; onAddSuggestion: (row: Record<string, unknown>) => void
}) {
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    if (!departmentId) return
    fetch(`/api/repeater-suggestions?departmentId=${departmentId}&fieldName=${fieldName}`)
      .then((r) => r.json())
      .then((d) => { if (d.suggestions) setSuggestions(d.suggestions) })
      .catch(() => {})
  }, [departmentId, fieldName])

  if (suggestions.length === 0) return null

  const firstTextField = subFields.find((f) => f.type === 'text')
  if (!firstTextField) return null

  const usedValues = new Set(currentRows.map((r) => String(r[firstTextField.name] ?? '').toLowerCase()))
  const available = suggestions.filter((s) => !usedValues.has(s.toLowerCase()))
  if (available.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      <span className="text-xs text-gray-400 mr-1 self-center">Recent:</span>
      {available.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => {
            const row: Record<string, string | number> = {}
            for (const f of subFields) row[f.name] = ''
            row[firstTextField.name] = s
            onAddSuggestion(row)
          }}
          className="text-xs bg-gray-100 hover:bg-ziwa-50 text-gray-700 hover:text-ziwa-700 border border-gray-200 hover:border-ziwa-300 rounded-full px-2.5 py-1 transition-colors"
        >
          + {s}
        </button>
      ))}
    </div>
  )
}

interface FieldRendererProps {
  field: FormField
  values: Record<string, unknown>
  setValue: (name: string, value: unknown) => void
  disabled: boolean
  readOnly: boolean
  slug: string
  departmentId: string
  reportDate: string
  prefillValues?: Record<string, unknown>
}

export default function FieldRenderer({
  field,
  values,
  setValue,
  disabled,
  readOnly,
  slug,
  departmentId,
  reportDate,
  prefillValues,
}: FieldRendererProps) {
  const calculations = getCalculationsForSlug(slug)

  if (!shouldShowField(field.visibleIf, values)) return null

  if (field.hiddenFor?.length) {
    const submitter = String(values.submitted_by ?? '')
    if (field.hiddenFor.some(name => submitter.toLowerCase().includes(name.toLowerCase()))) return null
  }

  function getStringValue(name: string): string {
    return String(values[name] ?? '')
  }

  function renderPrefillComparison() {
    if (!prefillValues || disabled || readOnly) return null
    const prev = prefillValues[field.name]
    if (prev === undefined || prev === null || prev === '') return null
    if (field.type === 'repeater' || field.type === 'room_grid' || field.type === 'inventory_grid' || field.type === 'photo' || field.type === 'checkbox_group') return null

    const prevDisplay = String(prev)
    const current = values[field.name]
    const currentNum = Number(current)
    const prevNum = Number(prev)

    if (field.type === 'number' && !isNaN(prevNum) && !isNaN(currentNum) && prevNum !== 0 && currentNum !== prevNum) {
      const pctChange = Math.round(((currentNum - prevNum) / prevNum) * 100)
      if (Math.abs(pctChange) >= 30) {
        const arrow = pctChange > 0 ? '↑' : '↓'
        return (
          <div className="mt-0.5 space-y-0.5">
            <p className="text-xs text-gray-400">Yesterday: {prevDisplay}</p>
            <p className="text-xs text-amber-600 font-medium">{arrow} {Math.abs(pctChange)}% from yesterday — correct?</p>
          </div>
        )
      }
    }

    return <p className="text-xs text-gray-400 mt-0.5">Yesterday: {prevDisplay}</p>
  }

  const requiredMark = field.required && !readOnly
    ? <span className="text-red-500 ml-1">*</span>
    : null

  const helpHint = field.helpText && !readOnly
    ? <p className="text-xs text-gray-400 mt-0.5">{field.helpText}</p>
    : null

  if (field.type === 'inventory_grid') {
    const items = (Array.isArray(values[field.name]) ? values[field.name] : []) as ActiveItem[]
    const cfg = field.inventory_grid_config ?? { category: 'general', showCost: false, showPrevious: true }
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">{field.label}{requiredMark}</label>
        {helpHint}
        <InventoryGrid
          departmentSlug={slug}
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
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">{field.label}{requiredMark}</label>
        {helpHint}
        <PhotoUploader
          departmentSlug={slug}
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
      <div className="space-y-2">
        {field.required && !readOnly && (
          <label className="block text-sm font-medium text-gray-700">{field.label}{requiredMark}</label>
        )}
        {field.required && !readOnly && helpHint}
        <RoomGrid
          value={roomsVal}
          onChange={disabled ? () => {} : (updated) => setValue(field.name, updated)}
          readOnly={disabled}
        />
      </div>
    )
  }

  if (field.type === 'repeater') {
    const raw = values[field.name]
    const rows = (Array.isArray(raw) ? raw : []) as Record<string, unknown>[]
    const repeaterLabel = field.required && !readOnly
      ? `${field.label} *`
      : field.label
    const hasPhotoSub = (field.sub_fields ?? []).some((s) => s.type === 'photo')
    const photoRenderer = hasPhotoSub && !disabled && !readOnly
      ? (props: PhotoSubFieldProps) => (
          <EntryPhotoUploader
            departmentSlug={slug}
            departmentId={departmentId}
            reportDate={reportDate}
            entryKey={props.entryKey}
            value={Array.isArray(props.value) ? props.value : []}
            onChange={props.onChange}
          />
        )
      : undefined
    return (
      <div>
        <RepeaterField
          fieldName={field.name}
          label={repeaterLabel}
          subFields={field.sub_fields ?? []}
          minRows={field.min_rows ?? 0}
          value={rows}
          onChange={disabled ? () => {} : (updated) => setValue(field.name, updated)}
          departmentSlug={slug}
          renderPhotoSubField={photoRenderer}
        />
        {helpHint}
        {!disabled && !readOnly && (
          <RepeaterSuggestions
            departmentId={departmentId}
            fieldName={field.name}
            subFields={field.sub_fields ?? []}
            currentRows={rows}
            onAddSuggestion={(row) => setValue(field.name, [...rows, row])}
          />
        )}
      </div>
    )
  }

  if (field.type === 'checkbox_group') {
    const selected = (Array.isArray(values[field.name]) ? values[field.name] : []) as string[]
    const options = field.options ?? []
    const markerOption = 'Someone else'
    const hasCustomEntries = field.allowCustomEntries && options.includes(markerOption)
    const showCustomInputs = hasCustomEntries && selected.includes(markerOption)
    const customNames = hasCustomEntries
      ? selected.filter((s) => s !== markerOption && !options.includes(s))
      : []

    function toTitleCase(text: string): string {
      return text.trim().replace(/\s+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">{field.label}{requiredMark}</label>
        {helpHint}
        <div className="grid grid-cols-2 gap-2">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                disabled={disabled}
                onChange={(e) => {
                  let next: string[]
                  if (e.target.checked) {
                    next = [...selected, opt]
                  } else {
                    next = selected.filter((s) => s !== opt)
                    if (opt === markerOption && hasCustomEntries) {
                      next = next.filter((s) => options.includes(s))
                    }
                  }
                  setValue(field.name, next)
                }}
                className="rounded border-gray-300 text-ziwa-500 focus:ring-ziwa-500"
              />
              {opt}
            </label>
          ))}
        </div>
        {showCustomInputs && !disabled && (
          <div className="space-y-2 pl-1 border-l-2 border-gray-200 ml-1">
            {customNames.map((name, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const updated = [...selected]
                    const allCustomIdx = selected.indexOf(name)
                    if (allCustomIdx !== -1) updated[allCustomIdx] = e.target.value
                    setValue(field.name, updated)
                  }}
                  onBlur={(e) => {
                    const titled = toTitleCase(e.target.value)
                    if (titled && titled !== name) {
                      setValue(field.name, selected.map((s) => s === name ? titled : s))
                    }
                  }}
                  placeholder="Type name..."
                  className={inputClass + ' flex-1'}
                />
                <button
                  type="button"
                  onClick={() => setValue(field.name, selected.filter((s) => s !== name))}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setValue(field.name, [...selected, ''])}
              className="text-xs text-ziwa-600 hover:text-ziwa-700 font-medium"
            >
              + Add another name
            </button>
          </div>
        )}
        {showCustomInputs && !disabled && customNames.length === 0 && (
          <button
            type="button"
            onClick={() => setValue(field.name, [...selected, ''])}
            className="text-xs text-ziwa-600 hover:text-ziwa-700 font-medium pl-1"
          >
            + Add name
          </button>
        )}
      </div>
    )
  }

  if (field.type === 'number' && field.stepper) {
    const stepperLabel = field.required && !readOnly
      ? `${field.label} *`
      : field.label
    return (
      <div>
        <NumberStepper
          label={stepperLabel}
          value={Number(values[field.name] ?? 0)}
          onChange={disabled ? () => {} : (val) => setValue(field.name, val)}
          min={0}
        />
        {helpHint}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}{requiredMark}
      </label>
      {helpHint}

      {field.type === 'textarea' && (
        <TextareaNudge
          name={field.name}
          value={getStringValue(field.name)}
          onChange={(val) => setValue(field.name, val)}
          placeholder={field.placeholder}
          required={field.required}
          disabled={disabled}
          inputClass={inputClass}
          prefillComparison={renderPrefillComparison()}
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
          {renderPrefillComparison()}
        </>
      )}

      {field.type === 'text' && (
        <>
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
          {renderPrefillComparison()}
        </>
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
