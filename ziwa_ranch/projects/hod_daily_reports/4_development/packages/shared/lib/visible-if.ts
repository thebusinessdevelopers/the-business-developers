import type { VisibleIfCondition } from '../types'

export function shouldShowField(
  condition: VisibleIfCondition | undefined,
  values: Record<string, unknown>
): boolean {
  if (!condition) return true

  const fieldValue = values[condition.field]

  switch (condition.operator) {
    case 'eq':
      return fieldValue === condition.value
    case 'neq':
      return fieldValue !== condition.value
    case 'gt':
      return Number(fieldValue) > Number(condition.value)
    case 'gte':
      return Number(fieldValue) >= Number(condition.value)
    case 'lt':
      return Number(fieldValue) < Number(condition.value)
    case 'lte':
      return Number(fieldValue) <= Number(condition.value)
    case 'truthy':
      if (Array.isArray(fieldValue)) return fieldValue.length > 0
      return Boolean(fieldValue)
    case 'falsy':
      if (Array.isArray(fieldValue)) return fieldValue.length === 0
      return !fieldValue
    case 'includes':
      if (Array.isArray(fieldValue)) return fieldValue.includes(condition.value)
      return false
    default:
      return true
  }
}
