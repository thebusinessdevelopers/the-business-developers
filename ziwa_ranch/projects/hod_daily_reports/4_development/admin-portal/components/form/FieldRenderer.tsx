'use client'

import { FormField } from '@/types'
import { shouldShowField } from '@hod/shared/lib/visible-if'
import RepeaterField from '@/components/RepeaterField'
import NumberStepper from '@/components/NumberStepper'
import CalculationHint from '@/components/CalculationHint'
import RoomGrid, { type RoomsValue } from '@/components/RoomGrid'
import { getCalculationsForSlug, calculateVehicleDistance } from '@/config/calculations'

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500 focus:border-transparent'

interface FieldRendererProps {
  field: FormField
  values: Record<string, unknown>
  setValue: (name: string, value: unknown) => void
  disabled: boolean
  readOnly: boolean
  slug: string
}

export default function FieldRenderer({
  field,
  values,
  setValue,
  disabled,
  readOnly,
  slug,
}: FieldRendererProps) {
  const calculations = getCalculationsForSlug(slug)

  if (!shouldShowField(field.visibleIf, values)) return null

  function getStringValue(name: string): string {
    return String(values[name] ?? '')
  }

  if (field.type === 'room_grid') {
    const roomsVal = (values[field.name] ?? {}) as RoomsValue
    return (
      <RoomGrid
        value={roomsVal}
        onChange={disabled ? () => {} : (updated) => setValue(field.name, updated)}
        readOnly={disabled}
      />
    )
  }

  if (field.type === 'repeater') {
    const raw = values[field.name]
    const rows = (Array.isArray(raw) ? raw : []) as Record<string, unknown>[]
    return (
      <RepeaterField
        fieldName={field.name}
        label={field.label}
        subFields={field.sub_fields ?? []}
        minRows={field.min_rows ?? 0}
        value={rows}
        onChange={disabled ? () => {} : (updated) => setValue(field.name, updated)}
        departmentSlug={slug}
      />
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
        <label className="block text-sm font-medium text-gray-700">{field.label}</label>
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
    return (
      <NumberStepper
        label={field.label}
        value={Number(values[field.name] ?? 0)}
        onChange={disabled ? () => {} : (val) => setValue(field.name, val)}
        min={0}
      />
    )
  }

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && !readOnly && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.helpText && !readOnly && (
        <p className="text-xs text-gray-400 mt-0.5">{field.helpText}</p>
      )}

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
