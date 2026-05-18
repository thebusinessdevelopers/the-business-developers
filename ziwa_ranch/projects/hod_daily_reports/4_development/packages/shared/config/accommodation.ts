import type { BuildingType, MealPlan, RateType, BookingSource, PaymentStatus, BookingStatus, ChangeRequestStatus, AccommodationUnit, AccommodationRate, PaxConfig, RoomBasketItem, GuestCategory, ActivityBasketItem } from '../types'
import { getKampalaDateStr } from '../lib/submission-status'

export const BUILDING_LABELS: Record<BuildingType, string> = {
  guest_house_1: 'Guest House 1',
  guest_house_2: 'Guest House 2',
  chalets: 'Chalets',
  tents: 'Tents',
  a_frames: 'A-Frames',
  campsite: 'Campsite',
}

export const MEAL_PLAN_LABELS: Record<MealPlan, string> = {
  fb: 'Full Board',
  hb: 'Half Board',
  bb: 'Bed & Breakfast',
  none: 'No Meals',
}

export const MEAL_PLAN_SHORT: Record<MealPlan, string> = {
  fb: 'FB',
  hb: 'HB',
  bb: 'BB',
  none: '—',
}

export const RATE_TYPE_LABELS: Record<RateType, string> = {
  rack: 'Rack Rate',
  sto: 'Tour Operator (STO)',
}

export const BOOKING_SOURCE_LABELS: Record<BookingSource, string> = {
  direct: 'Direct',
  whatsapp: 'WhatsApp',
  email: 'Email',
  agent: 'Agent',
  booking_com: 'Booking.com',
  other: 'Other',
  phone: 'Phone',
  walk_in: 'Walk-In',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  deposit_received: 'Deposit Received',
  paid_in_full: 'Paid in Full',
  complimentary: 'Complimentary',
  staff: 'Staff',
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  tentative: 'Tentative',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
  hod_pending: 'Pending Approval',
}

export const BOOKING_STATUS_COLOURS: Record<BookingStatus, string> = {
  tentative: 'bg-amber-100 text-amber-800 border-amber-300',
  confirmed: 'bg-green-100 text-green-800 border-green-300',
  checked_in: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  checked_out: 'bg-gray-100 text-gray-600 border-gray-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
  hod_pending: 'bg-amber-50 text-amber-700 border-amber-300',
}

export const BOOKING_STATUS_CALENDAR_COLOURS: Record<BookingStatus, string> = {
  tentative: 'bg-amber-200 border-amber-400 text-amber-900',
  confirmed: 'bg-green-200 border-green-400 text-green-900',
  checked_in: 'bg-indigo-200 border-indigo-400 text-indigo-900',
  checked_out: 'bg-gray-200 border-gray-400 text-gray-700',
  cancelled: 'bg-red-200 border-red-400 text-red-900',
  hod_pending: 'bg-amber-100 border-amber-400 text-amber-900',
}

export const CHANGE_REQUEST_STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  denied: 'Denied',
}

export type AccommodationViewMode = 'week' | 'fortnight' | 'month'
export type AccommodationExistingBookingAction = 'none' | 'view' | 'change_request' | 'manage'
export type AccommodationEmptyCellAction = 'none' | 'create'

export const ACCOMMODATION_VIEW_DAYS: Record<AccommodationViewMode, number> = {
  week: 7,
  fortnight: 14,
  month: 30,
}

export interface AccommodationCapabilityPolicy {
  canCreateBooking: boolean
  canSubmitChangeRequest: boolean
  requiresApproval: boolean
  existingBookingAction: AccommodationExistingBookingAction
  emptyCellAction: AccommodationEmptyCellAction
  canReviewPendingBookings: boolean
  canViewPrivateGuestNames: boolean
}

export interface AccommodationDateRangePolicy {
  defaultViewMode: AccommodationViewMode
  maxVisibleDays: number
  allowedViewModes: readonly AccommodationViewMode[]
}

export interface AccommodationDepartmentPolicy {
  capabilities: AccommodationCapabilityPolicy
  range: AccommodationDateRangePolicy
}

export interface AccommodationVisibleRange {
  viewMode: AccommodationViewMode
  dayCount: number
  startDate: string
  from: string
  to: string
  today: string
  maxVisibleDate: string
  minStartDate: string
  maxStartDate: string
  canGoPrevious: boolean
  canGoNext: boolean
}

export interface AccommodationQueryRange {
  from: string
  to: string
  today: string
  maxVisibleDate: string
  clamped: boolean
}

export interface AccommodationStayDateValidation {
  valid: boolean
  today: string
  maxVisibleDate: string
  error?: string
}

const DEFAULT_ACCOMMODATION_CAPABILITIES: AccommodationCapabilityPolicy = {
  canCreateBooking: false,
  canSubmitChangeRequest: false,
  requiresApproval: false,
  existingBookingAction: 'view',
  emptyCellAction: 'none',
  canReviewPendingBookings: false,
  canViewPrivateGuestNames: false,
}

const DEFAULT_HOD_RANGE_POLICY: AccommodationDateRangePolicy = {
  // "today + 7" is treated as a 7-day rolling window anchored to Kampala today.
  defaultViewMode: 'week',
  maxVisibleDays: 7,
  allowedViewModes: ['week'],
}

const MONTH_HOD_RANGE_POLICY: AccommodationDateRangePolicy = {
  // "1 month" is treated as a 30-day rolling window.
  defaultViewMode: 'week',
  maxVisibleDays: 30,
  allowedViewModes: ['week', 'fortnight', 'month'],
}

const HEAD_OFFICE_HOD_RANGE_POLICY: AccommodationDateRangePolicy = {
  defaultViewMode: 'week',
  maxVisibleDays: 730,
  allowedViewModes: ['week', 'fortnight', 'month'],
}

const ACCOMMODATION_POLICY_OVERRIDES: Record<string, AccommodationDepartmentPolicy> = {
  'food-and-beverage': {
    capabilities: {
      ...DEFAULT_ACCOMMODATION_CAPABILITIES,
      canViewPrivateGuestNames: true,
    },
    range: MONTH_HOD_RANGE_POLICY,
  },
  'head-office': {
    capabilities: {
      canCreateBooking: true,
      canSubmitChangeRequest: false,
      requiresApproval: false,
      existingBookingAction: 'manage',
      emptyCellAction: 'create',
      canReviewPendingBookings: true,
      canViewPrivateGuestNames: true,
    },
    range: HEAD_OFFICE_HOD_RANGE_POLICY,
  },
  'hq-reception': {
    capabilities: {
      canCreateBooking: true,
      canSubmitChangeRequest: true,
      requiresApproval: true,
      existingBookingAction: 'manage',
      emptyCellAction: 'create',
      canReviewPendingBookings: false,
      canViewPrivateGuestNames: true,
    },
    range: MONTH_HOD_RANGE_POLICY,
  },
  housekeeping: {
    capabilities: {
      canCreateBooking: true,
      canSubmitChangeRequest: true,
      requiresApproval: true,
      existingBookingAction: 'manage',
      emptyCellAction: 'create',
      canReviewPendingBookings: false,
      canViewPrivateGuestNames: true,
    },
    range: MONTH_HOD_RANGE_POLICY,
  },
  kitchen: {
    capabilities: {
      ...DEFAULT_ACCOMMODATION_CAPABILITIES,
      canViewPrivateGuestNames: true,
    },
    range: DEFAULT_HOD_RANGE_POLICY,
  },
  'main-gate': {
    capabilities: {
      ...DEFAULT_ACCOMMODATION_CAPABILITIES,
      canViewPrivateGuestNames: true,
    },
    range: MONTH_HOD_RANGE_POLICY,
  },
}

const DIRECT_CANCELLATION_DEPTS: readonly string[] = ['head-office']
const DIRECT_MANAGEMENT_DEPTS: readonly string[] = ['head-office']

function parseAccommodationUtcDate(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00Z`)
}

function clampDateStr(value: string, min: string, max: string): string {
  if (value < min) return min
  if (value > max) return max
  return value
}

function isDateStr(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function normaliseRequestedDate(value: string | null | undefined, fallback: string): string {
  return isDateStr(value) ? value : fallback
}

export function addAccommodationDays(dateStr: string, days: number): string {
  const date = parseAccommodationUtcDate(dateStr)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().split('T')[0]
}

export function canSubmitChangeRequest(departmentSlug: string): boolean {
  return getAccommodationCapabilities(departmentSlug).canSubmitChangeRequest
}

export function canCreateBooking(slug: string): boolean {
  return getAccommodationCapabilities(slug).canCreateBooking
}

export function requiresApproval(slug: string): boolean {
  return getAccommodationCapabilities(slug).requiresApproval
}

export function canManageAccommodationBookings(slug: string): boolean {
  return getAccommodationCapabilities(slug).existingBookingAction === 'manage'
}

export function canDirectlyManageAccommodationBooking(slug: string): boolean {
  return DIRECT_MANAGEMENT_DEPTS.includes(slug)
}

export function canDirectlyManageAccommodationBookings(slug: string): boolean {
  return canDirectlyManageAccommodationBooking(slug)
}

export function canDirectlyCancelAccommodationBooking(slug: string): boolean {
  return DIRECT_CANCELLATION_DEPTS.includes(slug)
}

export function canRequestAccommodationBooking(slug: string): boolean {
  const capabilities = getAccommodationCapabilities(slug)
  return capabilities.canCreateBooking && capabilities.requiresApproval
}

export function canRequestAccommodationDeletion(slug: string): boolean {
  const capabilities = getAccommodationCapabilities(slug)
  return capabilities.canSubmitChangeRequest || canDirectlyCancelAccommodationBooking(slug)
}

export function canReviewPendingBookings(slug: string): boolean {
  return getAccommodationCapabilities(slug).canReviewPendingBookings
}

export function canViewPrivateGuestNames(slug: string): boolean {
  return getAccommodationCapabilities(slug).canViewPrivateGuestNames
}

export function getYearFromDate(dateStr: string): number {
  return new Date(dateStr).getFullYear()
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)))
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

export function getAccommodationToday(date: Date = new Date()): string {
  return getKampalaDateStr(date)
}

export function getAccommodationPolicy(departmentSlug?: string | null): AccommodationDepartmentPolicy {
  return departmentSlug ? (ACCOMMODATION_POLICY_OVERRIDES[departmentSlug] ?? {
    capabilities: DEFAULT_ACCOMMODATION_CAPABILITIES,
    range: DEFAULT_HOD_RANGE_POLICY,
  }) : {
    capabilities: DEFAULT_ACCOMMODATION_CAPABILITIES,
    range: DEFAULT_HOD_RANGE_POLICY,
  }
}

export function getAccommodationCapabilities(departmentSlug?: string | null): AccommodationCapabilityPolicy {
  return getAccommodationPolicy(departmentSlug).capabilities
}

export function getAccommodationRangePolicy(departmentSlug?: string | null): AccommodationDateRangePolicy {
  return getAccommodationPolicy(departmentSlug).range
}

export function normaliseAccommodationViewMode(
  requestedViewMode: AccommodationViewMode | null | undefined,
  rangePolicy?: AccommodationDateRangePolicy,
): AccommodationViewMode {
  const fallback = rangePolicy?.defaultViewMode ?? 'fortnight'
  if (!requestedViewMode) return fallback
  if (rangePolicy && !rangePolicy.allowedViewModes.includes(requestedViewMode)) return fallback
  return requestedViewMode
}

export function getAccommodationVisibleRange(
  rangePolicy: AccommodationDateRangePolicy,
  requestedViewMode: AccommodationViewMode,
  requestedStartDate?: string | null,
  now: Date = new Date(),
): AccommodationVisibleRange {
  const today = getAccommodationToday(now)
  const viewMode = normaliseAccommodationViewMode(requestedViewMode, rangePolicy)
  const dayCount = ACCOMMODATION_VIEW_DAYS[viewMode]
  const maxVisibleDate = addAccommodationDays(today, Math.max(rangePolicy.maxVisibleDays - 1, 0))
  const maxStartOffset = Math.max(rangePolicy.maxVisibleDays - dayCount, 0)
  const minStartDate = today
  const maxStartDate = addAccommodationDays(today, maxStartOffset)
  const startDate = clampDateStr(
    normaliseRequestedDate(requestedStartDate, today),
    minStartDate,
    maxStartDate,
  )

  return {
    viewMode,
    dayCount,
    startDate,
    from: startDate,
    to: addAccommodationDays(startDate, dayCount - 1),
    today,
    maxVisibleDate,
    minStartDate,
    maxStartDate,
    canGoPrevious: startDate > minStartDate,
    canGoNext: startDate < maxStartDate,
  }
}

export function getDefaultAccommodationVisibleRange(
  departmentSlug?: string | null,
  now: Date = new Date(),
): AccommodationVisibleRange {
  const rangePolicy = getAccommodationRangePolicy(departmentSlug)
  return getAccommodationVisibleRange(rangePolicy, rangePolicy.defaultViewMode, getAccommodationToday(now), now)
}

export function resolveAccommodationQueryRange(
  departmentSlug: string | null | undefined,
  requested: {
    from?: string | null
    to?: string | null
    days?: number | null
  },
  now: Date = new Date(),
): AccommodationQueryRange {
  const rangePolicy = getAccommodationRangePolicy(departmentSlug)
  const today = getAccommodationToday(now)
  const maxVisibleDate = addAccommodationDays(today, Math.max(rangePolicy.maxVisibleDays - 1, 0))
  const requestedFrom = normaliseRequestedDate(requested.from, today)
  const from = clampDateStr(requestedFrom, today, maxVisibleDate)

  let to = isDateStr(requested.to)
    ? requested.to
    : addAccommodationDays(
        from,
        Math.max(
          1,
          Math.min(
            Number.isFinite(requested.days) ? Math.floor(requested.days as number) : ACCOMMODATION_VIEW_DAYS[rangePolicy.defaultViewMode],
            rangePolicy.maxVisibleDays,
          ),
        ) - 1,
      )

  if (to < from) {
    to = from
  }

  const clampedTo = clampDateStr(to, today, maxVisibleDate)
  return {
    from,
    to: clampedTo < from ? from : clampedTo,
    today,
    maxVisibleDate,
    clamped: from !== requestedFrom || clampedTo !== to,
  }
}

export function validateAccommodationStayDates(
  departmentSlug: string | null | undefined,
  checkIn: string,
  checkOut: string,
  now: Date = new Date(),
): AccommodationStayDateValidation {
  const today = getAccommodationToday(now)
  const maxVisibleDate = addAccommodationDays(
    today,
    Math.max(getAccommodationRangePolicy(departmentSlug).maxVisibleDays - 1, 0),
  )
  const lastNight = addAccommodationDays(checkOut, -1)

  if (checkIn < today) {
    return {
      valid: false,
      today,
      maxVisibleDate,
      error: `Check-in cannot be before ${today}.`,
    }
  }

  if (checkIn > maxVisibleDate) {
    return {
      valid: false,
      today,
      maxVisibleDate,
      error: `Check-in must be on or before ${maxVisibleDate}.`,
    }
  }

  if (lastNight > maxVisibleDate) {
    return {
      valid: false,
      today,
      maxVisibleDate,
      error: `Check-out must keep the stay within your department's horizon (latest stay date ${maxVisibleDate}).`,
    }
  }

  return { valid: true, today, maxVisibleDate }
}

export const CHANGE_REQUEST_DEPTS = Object.freeze(
  Object.entries(ACCOMMODATION_POLICY_OVERRIDES)
    .filter(([slug]) => canRequestAccommodationDeletion(slug))
    .map(([slug]) => slug),
)

export const HOD_BOOKING_DEPTS = Object.freeze(
  Object.entries(ACCOMMODATION_POLICY_OVERRIDES)
    .filter(([, policy]) => policy.capabilities.canCreateBooking)
    .map(([slug]) => slug),
)

export const HOD_DIRECT_BOOKING_DEPTS = Object.freeze(
  Object.entries(ACCOMMODATION_POLICY_OVERRIDES)
    .filter(([, policy]) => policy.capabilities.canCreateBooking && !policy.capabilities.requiresApproval)
    .map(([slug]) => slug),
)

export const OPERATIONAL_DEPT_SLUGS = Object.freeze(
  Object.entries(ACCOMMODATION_POLICY_OVERRIDES)
    .filter(([, policy]) => policy.range.maxVisibleDays === MONTH_HOD_RANGE_POLICY.maxVisibleDays)
    .map(([slug]) => slug),
)

export function isOperationalDept(slug: string): boolean {
  return OPERATIONAL_DEPT_SLUGS.includes(slug)
}

export interface PaxValidationResult {
  valid: boolean
  errors: string[]
  totalCapacity: number
}

export function validateOccupancy(
  units: AccommodationUnit[],
  adults: number,
  children: number,
): PaxValidationResult {
  const errors: string[] = []
  const totalGuests = adults + children
  let totalMaxAdults = 0
  let totalMaxChildren = 0
  let totalMaxTotal = 0

  for (const u of units) {
    const pax = u.pax_config
    if (!pax) {
      totalMaxTotal += u.capacity
      totalMaxAdults += u.capacity
      continue
    }
    totalMaxAdults += pax.max_adults
    totalMaxChildren += pax.max_children
    totalMaxTotal += pax.max_total
  }

  if (adults > totalMaxAdults) {
    errors.push(`${adults} adults exceeds capacity of ${totalMaxAdults} across selected rooms.`)
  }
  if (children > 0 && children > totalMaxChildren) {
    errors.push(`${children} children exceeds child capacity of ${totalMaxChildren}. Check cot eligibility.`)
  }
  if (totalGuests > totalMaxTotal) {
    errors.push(`${totalGuests} total guests exceeds maximum of ${totalMaxTotal} across selected rooms.`)
  }

  return { valid: errors.length === 0, errors, totalCapacity: totalMaxTotal }
}

export function formatBedConfig(pax: PaxConfig): string {
  if (pax.beds.length === 0) return 'Open'
  const parts = pax.beds.map((b) => `${b.count} ${b.type}`)
  const extra = pax.cot_eligible ? ' + cot' : ''
  return parts.join(' + ') + extra
}

export interface RateBreakdown {
  perNightTotal: number
  adultSubtotal: number
  childSubtotal: number
  nights: number
  grandTotal: number
  source: 'matched' | 'manual'
}

export function calculateBasketRate(
  basket: RoomBasketItem[],
  rates: AccommodationRate[],
  rateType: RateType,
  checkIn: string,
  checkOut: string,
): RateBreakdown | null {
  if (!checkIn || !checkOut || basket.length === 0) return null
  const year = new Date(checkIn).getFullYear()
  const nights = nightsBetween(checkIn, checkOut)
  if (nights === 0) return null

  let adultSubtotal = 0
  let childSubtotal = 0
  let allMatched = true

  for (const item of basket) {
    if (item.isComplimentary) continue
    if (item.rate_per_night != null) {
      adultSubtotal += item.rate_per_night
      continue
    }
    let match = rates.find(
      (r) =>
        r.rate_category === item.rate_category &&
        r.meal_plan === item.meal_plan &&
        r.rate_type === rateType &&
        r.year === year,
    )
    if (!match && item.meal_plan !== 'none') {
      match = rates.find(
        (r) =>
          r.rate_category === item.rate_category &&
          r.meal_plan === 'none' &&
          r.rate_type === rateType &&
          r.year === year,
      )
    }
    if (!match || match.adult_rate == null) { allMatched = false; break }
    if (item.pricing_type === 'per_person') {
      adultSubtotal += match.adult_rate * item.adults
      if (match.child_rate != null && item.children > 0) {
        childSubtotal += match.child_rate * item.children
      }
    } else {
      adultSubtotal += match.adult_rate
      if (match.child_rate != null && item.children > 0) {
        childSubtotal += match.child_rate * item.children
      }
    }
  }

  if (!allMatched) return null

  const perNightTotal = adultSubtotal + childSubtotal
  const grandTotal = perNightTotal * nights

  return { perNightTotal, adultSubtotal, childSubtotal, nights, grandTotal, source: 'matched' }
}

export function calculateItemRate(
  item: RoomBasketItem,
  rates: AccommodationRate[],
  rateType: RateType,
  year: number,
): number | null {
  if (item.isComplimentary) return 0
  if (item.rate_per_night != null) return item.rate_per_night
  let match = rates.find(
    (r) =>
      r.rate_category === item.rate_category &&
      r.meal_plan === item.meal_plan &&
      r.rate_type === rateType &&
      r.year === year,
  )
  if (!match && item.meal_plan !== 'none') {
    match = rates.find(
      (r) =>
        r.rate_category === item.rate_category &&
        r.meal_plan === 'none' &&
        r.rate_type === rateType &&
        r.year === year,
    )
  }
  if (!match || match.adult_rate == null) return null
  const adultComponent = item.pricing_type === 'per_person' ? match.adult_rate * item.adults : match.adult_rate
  const childComponent = match.child_rate != null && item.children > 0 ? match.child_rate * item.children : 0
  return adultComponent + childComponent
}

// --- Booking activities ---

export const ACTIVITY_NAMES = [
  'Entrance & Rhino Trekking',
  'Shoebill Trekking (6am-9am)',
  'Birding',
  'Night Walks (8pm-10pm)',
] as const

export type ActivityName = (typeof ACTIVITY_NAMES)[number]

export const GUEST_CATEGORY_LABELS: Record<GuestCategory, string> = {
  foreign_non_resident: 'Foreign Non-Resident',
  foreign_resident: 'Foreign Resident',
  resident: 'Resident',
}

export const GUEST_CATEGORY_CURRENCY: Record<GuestCategory, 'USD' | 'UGX'> = {
  foreign_non_resident: 'USD',
  foreign_resident: 'USD',
  resident: 'UGX',
}

interface ActivityRateEntry {
  adult_rate: number
  child_rate: number
  currency_code: 'USD' | 'UGX'
}

export const BOOKING_ACTIVITY_RATES: Record<string, ActivityRateEntry> = {
  'Entrance & Rhino Trekking|foreign_non_resident': { adult_rate: 60, child_rate: 30, currency_code: 'USD' },
  'Entrance & Rhino Trekking|foreign_resident':     { adult_rate: 50, child_rate: 25, currency_code: 'USD' },
  'Entrance & Rhino Trekking|resident':             { adult_rate: 50000, child_rate: 15000, currency_code: 'UGX' },
  'Shoebill Trekking (6am-9am)|foreign_non_resident': { adult_rate: 30, child_rate: 15, currency_code: 'USD' },
  'Shoebill Trekking (6am-9am)|foreign_resident':     { adult_rate: 25, child_rate: 10, currency_code: 'USD' },
  'Shoebill Trekking (6am-9am)|resident':             { adult_rate: 30000, child_rate: 10000, currency_code: 'UGX' },
  'Birding|foreign_non_resident': { adult_rate: 30, child_rate: 15, currency_code: 'USD' },
  'Birding|foreign_resident':     { adult_rate: 25, child_rate: 10, currency_code: 'USD' },
  'Birding|resident':             { adult_rate: 30000, child_rate: 10000, currency_code: 'UGX' },
  'Night Walks (8pm-10pm)|foreign_non_resident': { adult_rate: 25, child_rate: 10, currency_code: 'USD' },
  'Night Walks (8pm-10pm)|foreign_resident':     { adult_rate: 25, child_rate: 10, currency_code: 'USD' },
  'Night Walks (8pm-10pm)|resident':             { adult_rate: 30000, child_rate: 10000, currency_code: 'UGX' },
}

export function lookupActivityRate(activityName: string, guestCategory: GuestCategory): ActivityRateEntry | null {
  return BOOKING_ACTIVITY_RATES[`${activityName}|${guestCategory}`] ?? null
}

export function calculateActivityLineTotal(item: Pick<ActivityBasketItem, 'adults' | 'adult_rate' | 'children' | 'child_rate'>): number {
  return (item.adults * item.adult_rate) + (item.children * item.child_rate)
}

export interface ActivitySubtotals {
  usd: number
  ugx: number
}

export function calculateActivitiesSubtotals(activities: ActivityBasketItem[]): ActivitySubtotals {
  let usd = 0
  let ugx = 0
  for (const item of activities) {
    const total = calculateActivityLineTotal(item)
    if (item.currency_code === 'USD') usd += total
    else ugx += total
  }
  return { usd, ugx }
}

export function buildDefaultActivity(checkIn: string): ActivityBasketItem {
  return {
    activity_name: ACTIVITY_NAMES[0],
    guest_category: 'foreign_non_resident',
    activity_date: checkIn || '',
    adults: 1,
    children: 0,
    adult_rate: 60,
    child_rate: 30,
    currency_code: 'USD',
    notes: '',
  }
}
