import type { MeetingType, ActionItemPriority, AttendanceStatus, ActionItemAssigneeType } from '../types'

export const MEETING_TYPES: { value: MeetingType; label: string }[] = [
  { value: 'regular', label: 'Regular' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'special', label: 'Special' },
]

export const ATTENDANCE_STATUSES: { value: AttendanceStatus; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'apology', label: 'Apology' },
  { value: 'absent', label: 'Absent' },
]

export const ACTION_ITEM_PRIORITIES: { value: ActionItemPriority; label: string; colour: string }[] = [
  { value: 'high', label: 'High', colour: 'red' },
  { value: 'medium', label: 'Medium', colour: 'amber' },
  { value: 'low', label: 'Low', colour: 'gray' },
]

export const ASSIGNEE_TYPES: { value: ActionItemAssigneeType; label: string }[] = [
  { value: 'department', label: 'Department' },
  { value: 'sub_department', label: 'Sub-department' },
  { value: 'individual', label: 'Senior individual' },
]

export const SENIOR_INDIVIDUALS = [
  { label: 'GM (Wellington)', role: 'gm' },
  { label: 'MD', role: 'md' },
  { label: 'CEO', role: 'ceo' },
  { label: 'Chairman', role: 'chairman' },
]

export const SECRETARY_OPTIONS = [
  { label: 'Emilly', username: 'reception.emilly' },
  { label: 'Patience', username: 'reception.patience' },
]

export const CORE_ATTENDEE_USERNAMES: string[] = [
  'fnb.howard',
  'accounts.musoni',
  'electrical.robert',
  'plumbing.richard',
  'wildlife.martine',
  'drivers.roger',
  'maintenance.david',
  'security.salim',
  'kitchen.sensio',
  'reception.emilly',
  'maingate.jjuko',
  'store.denis',
  'craftshop.halima',
  'housekeeping.anita',
  'headoffice.florence',
  'headoffice.julie',
  'headoffice.faith',
  'headoffice.isaac',
]

export const CORE_ADMIN_ATTENDEE_USERNAMES: string[] = [
  'admin.md',
  'admin.gm',
]

export function getTuesdayOfWeek(ref?: Date): string {
  const d = new Date(ref ?? new Date())
  const day = d.getDay()
  const diff = day <= 2 ? 2 - day : 2 - day + 7
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

export function getNextTuesday(from: string): string {
  const d = new Date(from + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 7)
  return d.toISOString().split('T')[0]
}

export const ACTION_ITEM_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  submitted: 'Submitted for Review',
  verified: 'Verified Complete',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

export const ACTION_ITEM_STATUS_COLOURS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 border-blue-200',
  submitted: 'bg-amber-100 text-amber-700 border-amber-200',
  verified: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
}

export const MEETING_STATUS_LABELS: Record<string, string> = {
  draft: 'Delegated',
  submitted: 'Submitted',
  approved: 'Approved',
}

export const MEETING_STATUS_COLOURS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  submitted: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
}
