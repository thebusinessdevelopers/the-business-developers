import { DepartmentFormConfig } from '@/types'
import { ALL_ROOMS } from '@/config/rooms'
import type { RoomsValue, RoomData } from '@/components/RoomGrid'

interface ValidateOptions {
  config: DepartmentFormConfig
  values: Record<string, unknown>
  effectiveEditMode: boolean
  readOnly: boolean
  submittedBy: string
  reportDate: string
}

export function validateForm(opts: ValidateOptions): string | null {
  const { config, values, effectiveEditMode, readOnly, submittedBy, reportDate } = opts

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
