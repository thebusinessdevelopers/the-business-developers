export interface RecurrenceRule {
  kind: 'weekly' | 'monthly'
  weekdays?: number[] // ISO: Mon=1 … Sun=7 (used when kind='weekly')
  days?: number[]     // Day-of-month 1–31 (used when kind='monthly')
}

/**
 * Returns true if the announcement should be shown today given its recurrence rule.
 * A null/undefined rule means "show every day" (backward-compatible).
 */
export function isAnnouncementRecurringToday(
  rule: RecurrenceRule | null | undefined,
  now: Date = new Date()
): boolean {
  if (!rule) return true

  const kampalaDay = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Kampala',
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(now)

  if (rule.kind === 'weekly') {
    if (!Array.isArray(rule.weekdays) || rule.weekdays.length === 0) return true
    const isoWeekday = getIsoWeekday(kampalaDay, now)
    return rule.weekdays.includes(isoWeekday)
  }

  if (rule.kind === 'monthly') {
    if (!Array.isArray(rule.days) || rule.days.length === 0) return true
    const dayOfMonth = Number(kampalaDay.find(p => p.type === 'day')?.value ?? now.getDate())
    return rule.days.includes(dayOfMonth)
  }

  return true
}

function getIsoWeekday(parts: Intl.DateTimeFormatPart[], fallback: Date): number {
  const dayName = parts.find(p => p.type === 'weekday')?.value?.toLowerCase()
  const map: Record<string, number> = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7 }
  return map[dayName ?? ''] ?? ((fallback.getDay() || 7))
}
