import type { DepartmentFormConfig } from '@/types'

export { DEPARTMENT_FORMS, LEGACY_HOUSEKEEPING_CONFIG } from '@hod/shared/config/forms'
import { DEPARTMENT_FORMS } from '@hod/shared/config/forms'

export function getFormBySlug(slug: string): DepartmentFormConfig | undefined {
  return DEPARTMENT_FORMS.find((f) => f.slug === slug)
}
