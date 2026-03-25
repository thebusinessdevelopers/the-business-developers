'use client'

import { SubField } from '@/types'
import AutocompleteInput from './AutocompleteInput'
import { calculateVehicleDistance } from '@/config/calculations'

interface RepeaterRow {
  [key: string]: string | number
}

interface RepeaterFieldProps {
  fieldName: string
  label: string
  subFields: SubField[]
  minRows: number
  value: RepeaterRow[]
  onChange: (rows: RepeaterRow[]) => void
  departmentSlug?: string
  showVehicleDistance?: boolean
}

export default function RepeaterField({
  fieldName,
  label,
  subFields,
  minRows,
  value,
  onChange,
  departmentSlug,
}: RepeaterFieldProps) {
  const isVehicleUsage = fieldName === 'vehicle_usage'
  const rows = value.length > 0 ? value : minRows > 0 ? Array.from({ length: minRows }, () => emptyRow(subFields)) : []

  function emptyRow(fields: SubField[]): RepeaterRow {
    return Object.fromEntries(fields.map((f) => [f.name, '']))
  }

  function updateRow(index: number, field: string, val: string) {
    const updated = rows.map((row, i) => (i === index ? { ...row, [field]: val } : row))
    onChange(updated)
  }

  function addRow() {
    onChange([...rows, emptyRow(subFields)])
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index))
  }

  const fieldClass =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ziwa-500 focus:border-transparent bg-white'

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {rows.length === 0 && (
        <p className="text-sm text-gray-400 italic">No entries yet. Add one below.</p>
      )}

      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Entry {rowIndex + 1}
            </span>
            <button
              type="button"
              onClick={() => removeRow(rowIndex)}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Remove
            </button>
          </div>

          {isVehicleUsage && (() => {
            const dist = calculateVehicleDistance(row.opening_mileage, row.closing_mileage)
            if (dist === null) return null
            return (
              <p className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
                Distance today: <span className="font-medium">{dist.toLocaleString()} km</span>
              </p>
            )
          })()}

          {subFields.map((sub) => (
            <div key={sub.name}>
              <label className="block text-xs text-gray-600 mb-1">{sub.label}</label>
              {sub.type === 'textarea' ? (
                <textarea
                  name={`${fieldName}[${rowIndex}][${sub.name}]`}
                  value={String(row[sub.name] ?? '')}
                  onChange={(e) => updateRow(rowIndex, sub.name, e.target.value)}
                  placeholder={sub.placeholder}
                  rows={2}
                  className={fieldClass}
                />
              ) : sub.type === 'select' ? (
                <select
                  name={`${fieldName}[${rowIndex}][${sub.name}]`}
                  value={String(row[sub.name] ?? '')}
                  onChange={(e) => updateRow(rowIndex, sub.name, e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Select...</option>
                  {sub.options?.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : sub.autocomplete && departmentSlug ? (
                <AutocompleteInput
                  value={String(row[sub.name] ?? '')}
                  onChange={(val) => updateRow(rowIndex, sub.name, val)}
                  placeholder={sub.placeholder}
                  departmentSlug={departmentSlug}
                  category={sub.autocomplete.category}
                  className={fieldClass}
                />
              ) : (
                <input
                  type={sub.type === 'number' ? 'number' : 'text'}
                  name={`${fieldName}[${rowIndex}][${sub.name}]`}
                  value={String(row[sub.name] ?? '')}
                  onChange={(e) => updateRow(rowIndex, sub.name, e.target.value)}
                  placeholder={sub.placeholder}
                  className={fieldClass}
                />
              )}
            </div>
          ))}
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1.5 text-sm text-ziwa-600 font-medium hover:text-ziwa-700 border border-ziwa-300 rounded-md px-3 py-1.5 hover:bg-ziwa-50 transition-colors"
      >
        <span>+</span> Add entry
      </button>
    </div>
  )
}
