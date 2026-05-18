export interface RoomingWhatsappRowInput {
  roomName: string
  guestName: string
  adults: number
  children: number
  paxLabel?: string | null
  roomConfigurationLabel: string
  mealPlan: string
  stayNight: string
  status: string
  notes?: string | null
}

export interface RoomingWhatsappRow extends RoomingWhatsappRowInput {
  notes: string
}

export interface RoomingWhatsappInput {
  date: string
  rows: RoomingWhatsappRow[]
}

const MONTHS = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
]

export function createRoomingWhatsappRow(input: RoomingWhatsappRowInput): RoomingWhatsappRow {
  return {
    ...input,
    notes: input.notes?.trim() || 'no notes',
  }
}

export function formatRoomingWhatsappMessage(input: RoomingWhatsappInput): string {
  return [
    formatTitle(input.date),
    '',
    input.rows.map(formatRow).join('\n'),
  ].join('\n')
}

function formatTitle(date: string): string {
  const [, year, month, day] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date) ?? []
  const monthName = MONTHS[Number(month) - 1]

  if (!year || !monthName || !day) {
    throw new Error('Rooming WhatsApp date must use YYYY-MM-DD.')
  }

  return `*${day} ${monthName} ${year} - ZIWA ROOMING*`
}

function formatRow(row: RoomingWhatsappRow, index: number): string {
  return [
    `${index + 1}. ${row.roomName} - ${row.guestName}`,
    `Pax: ${formatPax(row)}`,
    `Room configuration: ${row.roomConfigurationLabel}`,
    `Meal plan: ${row.mealPlan}`,
    `Stay night: ${row.stayNight}`,
    `Status: ${row.status}`,
    `Notes: ${normaliseNotes(row.notes)}`,
  ].join(' | ')
}

function formatPax(row: RoomingWhatsappRow): string {
  return row.paxLabel?.trim() || `${formatGuestCount(row.adults, 'adult')}, ${formatGuestCount(row.children, 'child', 'children')}`
}

function formatGuestCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function normaliseNotes(notes: string | null | undefined): string {
  return notes?.trim() || 'no notes'
}
