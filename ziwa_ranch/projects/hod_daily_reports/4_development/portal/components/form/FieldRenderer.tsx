'use client'

import { FormField } from '@/types'
import RepeaterField from '@/components/RepeaterField'
import NumberStepper from '@/components/NumberStepper'
import CalculationHint from '@/components/CalculationHint'
import RoomGrid, { type RoomsValue } from '@/components/RoomGrid'
import PhotoUploader, { type UploadedPhoto } from '@/components/PhotoUploader'
import InventoryGrid, { type ActiveItem, type ExtraFieldDef } from '@/components/InventoryGrid'
import { getCalculationsForSlug } from '@/config/calculations'

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500 focus:border-transparent'

interface FieldRendererProps {
  field: FormField
  values: Record<string, unknown>
  setValue: (name: string, value: unknown) => void
  disabled: boolean
  readOnly: boolean
  slug: string
  departmentId: string
  reportDate: string
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
}: FieldRendererProps) {
  const calculations = getCalculationsForSlug(slug)

  function getStringValue(name: string): string {
    return String(values[name] ?? '')
  }

  if (field.type === 'inventory_grid') {
    const items = (Array.isArray(values[field.name]) ? values[field.name] : []) as ActiveItem[]
    const cfg = field.inventory_grid_config ?? { category: 'general', showCost: false, showPrevious: true }
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">{field.label}</label>
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
        <label className="block text-sm font-medium text-gray-700">{field.label}</label>
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
      <RoomGrid
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
    return (
      <div className="space-y-2">
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
