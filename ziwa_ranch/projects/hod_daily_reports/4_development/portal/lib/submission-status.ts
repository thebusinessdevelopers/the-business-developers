export type SubmissionStatus = 'on_time' | 'warning' | 'late'

const TZ = 'Africa/Kampala'

function getKampalaHour(date: Date): number {
  return Number(date.toLocaleString('en-GB', { timeZone: TZ, hour: 'numeric', hour12: false }))
}

function getKampalaMinute(date: Date): number {
  return Number(date.toLocaleString('en-GB', { timeZone: TZ, minute: 'numeric' }))
}

export function getKampalaDateStr(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: TZ })
}

export function getSubmissionStatus(submittedAt: string, reportDate: string): SubmissionStatus {
  const submitted = new Date(submittedAt)
  const submittedDateKampala = getKampalaDateStr(submitted)
  const submittedHour = getKampalaHour(submitted)

  const nextDay = new Date(reportDate + 'T00:00:00Z')
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const deadlineDateStr = nextDay.toISOString().split('T')[0]

  if (submittedDateKampala < deadlineDateStr) return 'on_time'
  if (submittedDateKampala > deadlineDateStr) return 'late'

  if (submittedHour < 12) return 'on_time'
  if (submittedHour < 15) return 'warning'
  return 'late'
}

export function getStatusLabel(status: SubmissionStatus): string {
  switch (status) {
    case 'on_time': return 'On time'
    case 'warning': return 'Warning'
    case 'late': return 'Late'
  }
}

export function getStatusBadgeClasses(status: SubmissionStatus): string {
  switch (status) {
    case 'on_time':
      return 'text-green-700 bg-green-50 border-green-200'
    case 'warning':
      return 'text-amber-700 bg-amber-50 border-amber-200'
    case 'late':
      return 'text-red-600 bg-red-50 border-red-200'
  }
}

export function getCurrentSubmissionStatus(reportDate: string): SubmissionStatus {
  return getSubmissionStatus(new Date().toISOString(), reportDate)
}

export interface DeadlineBadge {
  status: SubmissionStatus
  message: string
}

export function getDeadlineBadge(reportDate: string): DeadlineBadge | null {
  const now = new Date()
  const todayKampala = getKampalaDateStr(now)

  if (reportDate > todayKampala) return null

  const status = getCurrentSubmissionStatus(reportDate)

  const nextDay = new Date(reportDate + 'T00:00:00Z')
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const deadlineDateStr = nextDay.toISOString().split('T')[0]

  const isDeadlineToday = todayKampala === deadlineDateStr

  switch (status) {
    case 'on_time':
      return {
        status: 'on_time',
        message: isDeadlineToday
          ? 'On time — submit before 12:00 today'
          : 'On time — submit before 12:00 tomorrow',
      }
    case 'warning':
      return {
        status: 'warning',
        message: 'Approaching deadline — submit before 3:00 PM today',
      }
    case 'late':
      return { status: 'late', message: 'Late submission — deadline has passed' }
  }
}

export function isWithinEditWindow(reportDate: string): boolean {
  const now = new Date()
  const nextDay = new Date(reportDate + 'T00:00:00Z')
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const deadlineDateStr = nextDay.toISOString().split('T')[0]

  const todayKampala = getKampalaDateStr(now)
  if (todayKampala < deadlineDateStr) return true
  if (todayKampala > deadlineDateStr) return false
  return getKampalaHour(now) < 18
}

export function getEditTimeRemaining(reportDate: string): { hours: number; minutes: number } | null {
  if (!isWithinEditWindow(reportDate)) return null

  const now = new Date()
  const nowH = getKampalaHour(now)
  const nowM = getKampalaMinute(now)
  const todayKampala = getKampalaDateStr(now)

  const nextDay = new Date(reportDate + 'T00:00:00Z')
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const deadlineDateStr = nextDay.toISOString().split('T')[0]

  let totalMinutesRemaining: number

  if (todayKampala < deadlineDateStr) {
    const todayDate = new Date(todayKampala + 'T00:00:00Z')
    const deadlineDate = new Date(deadlineDateStr + 'T00:00:00Z')
    const daysDiff = Math.round((deadlineDate.getTime() - todayDate.getTime()) / (24 * 60 * 60 * 1000))
    const minutesLeftToday = (24 * 60) - (nowH * 60 + nowM)
    const minutesFullDaysBetween = Math.max(0, daysDiff - 1) * 24 * 60
    const minutesOnDeadlineDay = 18 * 60
    totalMinutesRemaining = minutesLeftToday + minutesFullDaysBetween + minutesOnDeadlineDay
  } else {
    totalMinutesRemaining = (18 * 60) - (nowH * 60 + nowM)
  }

  if (totalMinutesRemaining <= 0) return null

  return {
    hours: Math.floor(totalMinutesRemaining / 60),
    minutes: totalMinutesRemaining % 60,
  }
}

export function isLateOrWarning(submittedAt: string, reportDate: string): boolean {
  const status = getSubmissionStatus(submittedAt, reportDate)
  return status !== 'on_time'
}

export interface SmartDateButton {
  date: string
  label: string
  priority: 'primary' | 'secondary' | 'tertiary'
  hasReport: boolean
  reportId?: string
}

export function getSmartDateButtons(
  existingReports: { report_date: string; id: string }[]
): SmartDateButton[] {
  const now = new Date()
  const kampalaHour = getKampalaHour(now)
  const today = getKampalaDateStr(now)

  const yesterdayDate = new Date(today + 'T00:00:00Z')
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1)
  const yesterday = yesterdayDate.toISOString().split('T')[0]

  const twoDaysAgoDate = new Date(today + 'T00:00:00Z')
  twoDaysAgoDate.setUTCDate(twoDaysAgoDate.getUTCDate() - 2)
  const twoDaysAgo = twoDaysAgoDate.toISOString().split('T')[0]

  const reportMap = new Map(existingReports.map(r => [r.report_date, r.id]))

  function btn(date: string, label: string, priority: 'primary' | 'secondary' | 'tertiary'): SmartDateButton {
    const reportId = reportMap.get(date)
    return { date, label, priority, hasReport: !!reportId, reportId: reportId ?? undefined }
  }

  const buttons: SmartDateButton[] = []

  if (kampalaHour >= 16) {
    buttons.push(btn(today, 'Report for today', 'primary'))
    buttons.push(btn(yesterday, 'Report for yesterday', 'secondary'))
  } else {
    buttons.push(btn(yesterday, 'Report for yesterday', 'primary'))
    buttons.push(btn(today, 'Report for today', 'secondary'))
  }

  if (!reportMap.has(twoDaysAgo)) {
    buttons.push(btn(twoDaysAgo, `Report for ${formatDateKampala(twoDaysAgo)}`, 'tertiary'))
  }

  return buttons
}

export function formatDateKampala(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTimeKampala(isoStr: string): string {
  return new Date(isoStr).toLocaleString('en-GB', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateLongKampala(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatTimeKampala(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  })
}
