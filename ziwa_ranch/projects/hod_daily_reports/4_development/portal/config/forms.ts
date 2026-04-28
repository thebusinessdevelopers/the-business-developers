import type { DepartmentFormConfig } from '@/types'

export { DEPARTMENT_FORMS } from '@hod/shared/config/forms'
import { DEPARTMENT_FORMS } from '@hod/shared/config/forms'

const GENERAL_PHOTO_SECTION = {
  title: 'Photos',
  fields: [
    { name: 'photos', label: 'Attach photos (optional)', type: 'photo' as const, photo_config: { maxPhotos: 3, categories: ['Damage', 'Maintenance needed', 'Evidence', 'Record keeping', 'Other'] } },
  ],
}

export function getFormBySlug(slug: string): DepartmentFormConfig | undefined {
  const form = DEPARTMENT_FORMS.find((f) => f.slug === slug)
  if (!form) return undefined

  const hasPhotoField = form.sections.some((s) =>
    s.fields.some((f) => f.type === 'photo')
  )
  if (hasPhotoField) return form

  const notesSectionIdx = form.sections.findIndex((s) =>
    s.fields.some((f) => f.name === 'challenges_successes')
  )
  const sections = [...form.sections]
  if (notesSectionIdx >= 0) {
    sections.splice(notesSectionIdx, 0, GENERAL_PHOTO_SECTION)
  } else {
    sections.push(GENERAL_PHOTO_SECTION)
  }

  return { ...form, sections }
}
