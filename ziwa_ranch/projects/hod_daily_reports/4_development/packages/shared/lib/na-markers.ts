import type { FormSection } from '../types'

function isTruthyNAMarker(value: unknown): boolean {
  return value === true || value === 'true' || value === 1
}

export function getSectionNAMarkerKeys(section: Pick<FormSection, 'fields'>): string[] {
  return section.fields
    .map((field) => field.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
    .map((name) => `${name}__na`)
}

export function isSectionMarkedNA(
  section: Pick<FormSection, 'allowNA' | 'fields'>,
  values: Record<string, unknown> | null | undefined
): boolean {
  if (!section.allowNA || !values) return false

  const markerKeys = getSectionNAMarkerKeys(section)
  if (markerKeys.length === 0) return false

  return markerKeys.some((key) => isTruthyNAMarker(values[key]))
}
