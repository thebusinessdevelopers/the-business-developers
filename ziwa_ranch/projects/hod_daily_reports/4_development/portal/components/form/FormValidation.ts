import { DepartmentFormConfig, FormSection } from '@/types'
import { ALL_ROOMS } from '@/config/rooms'
import type { RoomsValue, RoomData } from '@/components/RoomGrid'
import { isSectionMarkedNA } from '@hod/shared/lib/na-markers'
import { shouldShowField } from '@hod/shared/lib/visible-if'

interface ValidateOptions {
  config: DepartmentFormConfig
  values: Record<string, unknown>
  effectiveEditMode: boolean
  readOnly: boolean
  submittedBy: string
  reportDate: string
}

interface StockItem {
  item: string
  quantity: number | ''
  unit: string
}

function validateStockItems(items: StockItem[], fieldLabel: string): string | null {
  if (items.length === 0) return `"${fieldLabel}" requires at least one item.`
  for (const entry of items) {
    if (!entry.item || !entry.item.trim()) {
      return `Every stock item must have a name.`
    }
    if (entry.quantity === '' || typeof entry.quantity !== 'number' || entry.quantity <= 0) {
      return `"${entry.item}" needs a quantity greater than zero.`
    }
    if (!entry.unit || !entry.unit.trim()) {
      return `"${entry.item}" needs a unit (e.g. kg, pieces, litres).`
    }
  }
  return null
}

function validateSectionFields(section: FormSection, values: Record<string, unknown>, isStockDay?: boolean): string | null {
  if (isSectionMarkedNA(section, values)) return null

  for (const field of section.fields) {
    if (!shouldShowField(field.visibleIf, values)) continue

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

    if (field.type === 'inventory_grid' && section.mondayOnly && isStockDay) {
      const items = (Array.isArray(values[field.name]) ? values[field.name] : []) as StockItem[]
      const err = validateStockItems(items, field.label)
      if (err) return err
      continue
    }

    if (field.required) {
      const val = values[field.name]
      if (val === undefined || val === null || val === '') {
        return `"${field.label}" is required.`
      }
      if (Array.isArray(val)) {
        if (val.length === 0) {
          return `"${field.label}" is required.`
        }
        if (field.type === 'repeater') {
          const hasContent = val.some((row: Record<string, unknown>) =>
            Object.values(row).some(v => v !== undefined && v !== null && v !== '')
          )
          if (!hasContent) {
            return `"${field.label}" requires at least one entry with content.`
          }
        }
      }
    }
  }
  return null
}

export function validateSection(section: FormSection, values: Record<string, unknown>, isStockDay?: boolean): string | null {
  return validateSectionFields(section, values, isStockDay)
}

export function validateForm(opts: ValidateOptions): string | null {
  const { config, values, effectiveEditMode, readOnly, submittedBy, reportDate } = opts

  if (!effectiveEditMode && !readOnly && !submittedBy) return 'Please enter your name.'
  if (!effectiveEditMode && !readOnly && !reportDate) return 'Please select a report date.'

  const isStockDay = !!config.stockConfig && new Date(reportDate + 'T00:00:00').getDay() === 1

  for (const section of config.sections) {
    const err = validateSectionFields(section, values, isStockDay)
    if (err) return err
  }
  return null
}
