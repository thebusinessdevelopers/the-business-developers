import { DepartmentFormConfig } from '@/types'

interface ValidateOptions {
  config: DepartmentFormConfig
  values: Record<string, unknown>
  effectiveEditMode: boolean
  submittedBy: string
  reportDate: string
}

export function validateForm(opts: ValidateOptions): string | null {
  const { config, values, effectiveEditMode, submittedBy, reportDate } = opts

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
