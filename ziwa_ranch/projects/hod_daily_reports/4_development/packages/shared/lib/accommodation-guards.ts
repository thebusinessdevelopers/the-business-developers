import type { SupabaseClient } from '@supabase/supabase-js'
import { addAccommodationDays, getAccommodationRangePolicy, getAccommodationToday, validateOccupancy } from '../config/accommodation'
import type { AccommodationUnit } from '../types'

interface BookingVisibilityCandidate {
  check_in: string
  check_out: string
  status?: string | null
}

interface OverlappingBookingCandidate {
  id: string
  guest_name: string
  check_in: string
  check_out: string
  adults: number
  children: number
  booking_rooms: { unit_id: string }[] | null
}

interface AccommodationBasketValidationItem {
  unit_id: string
  adults: number
  children: number
  room_configuration_code?: string | null
  room_configuration_label?: string | null
}

export interface AccommodationWriteValidationInput {
  checkIn: string
  checkOut: string
  roomIds: string[]
  adults: number
  children: number
  basketItems?: AccommodationBasketValidationItem[]
  excludeBookingId?: string | null
  allowedInactiveRoomIds?: string[]
  adminOverride?: boolean
}

export interface AccommodationWriteValidationResult {
  ok: boolean
  units: AccommodationUnit[]
  error?: string
}

function uniqueRoomIds(roomIds: string[]): string[] {
  return [...new Set(roomIds.filter(Boolean))]
}

function formatRoomList(names: string[]): string {
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

function isCapacitySharedUnit(unit: AccommodationUnit): boolean {
  return unit.category === 'campsite' || (unit.max_concurrent_bookings ?? 1) > 1
}

function getUnitGuestCapacity(unit: AccommodationUnit): number {
  return unit.pax_config?.max_total ?? unit.capacity
}

function getRequestedGuestsForUnit(input: AccommodationWriteValidationInput, unitId: string): number {
  const matchingBasketItems = input.basketItems?.filter((item) => item.unit_id === unitId) ?? []
  if (matchingBasketItems.length > 0) {
    return matchingBasketItems.reduce((total, item) => total + item.adults + item.children, 0)
  }
  return input.adults + input.children
}

function validateRoomConfiguration(unit: AccommodationUnit, item: AccommodationBasketValidationItem): string | null {
  const options = unit.pax_config?.stay_configurations ?? []
  const selectedCode = item.room_configuration_code?.trim()
  const selectedLabel = item.room_configuration_label?.trim()

  if (options.length === 0) {
    return selectedCode || selectedLabel ? `${unit.name} does not support room options.` : null
  }

  if (!selectedCode) {
    return `${unit.name} requires a room option.`
  }

  const selectedOption = options.find((option) => option.code.trim() === selectedCode)
  if (!selectedOption) {
    return `${unit.name} must use a configured room option.`
  }

  if (selectedLabel && selectedLabel !== selectedOption.label.trim()) {
    return `${unit.name} must use the configured room option label.`
  }

  return null
}

function validateSelectedRoomConfigurations(
  units: AccommodationUnit[],
  input: AccommodationWriteValidationInput,
): string | null {
  const unitById = new Map(units.map((unit) => [unit.id, unit]))
  const basketItems = input.basketItems ?? []

  for (const item of basketItems) {
    const unit = unitById.get(item.unit_id)
    if (!unit) {
      return 'One or more selected rooms no longer exist.'
    }

    const configurationError = validateRoomConfiguration(unit, item)
    if (configurationError) {
      return configurationError
    }
  }

  for (const unit of units) {
    const requiresConfiguration = (unit.pax_config?.stay_configurations ?? []).length > 0
    const hasBasketItem = basketItems.some((item) => item.unit_id === unit.id)
    if (requiresConfiguration && !hasBasketItem) {
      return `${unit.name} requires a room option.`
    }
  }

  return null
}

export function getAccommodationVisibilityWindow(
  departmentSlug: string | null | undefined,
  now: Date = new Date(),
): { today: string; maxVisibleDate: string } {
  const today = getAccommodationToday(now)
  const maxVisibleDate = addAccommodationDays(
    today,
    Math.max(getAccommodationRangePolicy(departmentSlug).maxVisibleDays - 1, 0),
  )
  return { today, maxVisibleDate }
}

export function isBookingVisibleToDepartment(
  departmentSlug: string | null | undefined,
  booking: BookingVisibilityCandidate,
  now: Date = new Date(),
): boolean {
  if (booking.status === 'cancelled') return false
  const { today, maxVisibleDate } = getAccommodationVisibilityWindow(departmentSlug, now)
  return booking.check_in <= maxVisibleDate && booking.check_out >= today
}

export async function validateAccommodationWrite(
  supabase: SupabaseClient,
  input: AccommodationWriteValidationInput,
): Promise<AccommodationWriteValidationResult> {
  const roomIds = uniqueRoomIds(input.roomIds)
  if (roomIds.length === 0) {
    return { ok: false, units: [], error: 'Add at least one room.' }
  }

  if (roomIds.length !== input.roomIds.length) {
    return { ok: false, units: [], error: 'A room can only be selected once per booking.' }
  }

  const { data: rawUnits, error: unitsError } = await supabase
    .from('accommodation_units')
    .select('id, name, building, category, capacity, max_concurrent_bookings, rate_category, description, pax_config, pricing_type, status, sort_order, created_at')
    .in('id', roomIds)

  if (unitsError) {
    return { ok: false, units: [], error: unitsError.message }
  }

  const units = (rawUnits ?? []) as AccommodationUnit[]
  if (units.length !== roomIds.length) {
    return { ok: false, units, error: 'One or more selected rooms no longer exist.' }
  }

  const allowedInactiveRoomIds = new Set(input.allowedInactiveRoomIds ?? [])
  const unavailableRooms = units.filter(
    (unit) => unit.status !== 'active' && !allowedInactiveRoomIds.has(unit.id),
  )
  if (unavailableRooms.length > 0) {
    return {
      ok: false,
      units,
      error: `${formatRoomList(unavailableRooms.map((unit) => unit.name))} cannot be assigned because it is not active.`,
    }
  }

  const roomConfigurationError = validateSelectedRoomConfigurations(units, input)
  if (roomConfigurationError) {
    return { ok: false, units, error: roomConfigurationError }
  }

  if (input.basketItems && input.basketItems.length > 0) {
    const unitById = new Map(units.map((unit) => [unit.id, unit]))

    for (const item of input.basketItems) {
      const unit = unitById.get(item.unit_id)
      if (!unit) {
        return { ok: false, units, error: 'One or more selected rooms no longer exist.' }
      }

      if (input.adminOverride) {
        continue
      }

      const maxAdults = unit.pax_config?.max_adults ?? unit.capacity
      const maxChildren = unit.pax_config?.max_children ?? unit.capacity
      const maxTotal = unit.pax_config?.max_total ?? unit.capacity
      const totalGuests = item.adults + item.children

      if (item.adults > maxAdults) {
        return { ok: false, units, error: `${unit.name} cannot take ${item.adults} adults.` }
      }
      if (item.children > maxChildren) {
        return { ok: false, units, error: `${unit.name} cannot take ${item.children} children.` }
      }
      if (totalGuests > maxTotal) {
        return { ok: false, units, error: `${unit.name} cannot take ${totalGuests} total guests.` }
      }
    }
  }

  if (!input.adminOverride) {
    const occupancyValidation = validateOccupancy(units, input.adults, input.children)
    if (!occupancyValidation.valid) {
      return { ok: false, units, error: occupancyValidation.errors[0] }
    }
  }

  const { data: rawOverlaps, error: overlapsError } = await supabase
    .from('bookings')
    .select('id, guest_name, check_in, check_out, adults, children, booking_rooms(unit_id)')
    .lt('check_in', input.checkOut)
    .gt('check_out', input.checkIn)
    .neq('status', 'cancelled')

  if (overlapsError) {
    return { ok: false, units, error: overlapsError.message }
  }

  const unitById = new Map(units.map((unit) => [unit.id, unit]))
  const unitNameById = new Map(units.map((unit) => [unit.id, unit.name]))
  const overlaps = ((rawOverlaps ?? []) as OverlappingBookingCandidate[])
    .filter((booking) => booking.id !== input.excludeBookingId)
    .map((booking) => {
      const conflictRoomIds = (booking.booking_rooms ?? [])
        .map((room) => room.unit_id)
        .filter((roomId) => roomIds.includes(roomId))
      return { booking, conflictRoomIds }
    })
    .filter((entry) => entry.conflictRoomIds.length > 0)

  const exclusiveOverlaps = overlaps
    .map((entry) => ({
      booking: entry.booking,
      conflictRoomIds: entry.conflictRoomIds.filter((roomId) => {
        const unit = unitById.get(roomId)
        return !unit || !isCapacitySharedUnit(unit)
      }),
    }))
    .filter((entry) => entry.conflictRoomIds.length > 0)

  if (exclusiveOverlaps.length > 0) {
    const roomNames = uniqueRoomIds(exclusiveOverlaps.flatMap((entry) => entry.conflictRoomIds))
      .map((roomId) => unitNameById.get(roomId) ?? roomId)
    const firstConflict = exclusiveOverlaps[0].booking
    return {
      ok: false,
      units,
      error: `${formatRoomList(roomNames)} is already booked for ${firstConflict.guest_name} from ${firstConflict.check_in} to ${firstConflict.check_out}.`,
    }
  }

  for (const unit of units.filter(isCapacitySharedUnit)) {
    const existingGuests = overlaps.reduce((total, entry) => {
      if (!entry.conflictRoomIds.includes(unit.id)) return total
      return total + entry.booking.adults + entry.booking.children
    }, 0)
    const requestedGuests = getRequestedGuestsForUnit(input, unit.id)
    const capacity = getUnitGuestCapacity(unit)

    if (existingGuests + requestedGuests > capacity) {
      return {
        ok: false,
        units,
        error: `${unit.name} has reached its maximum capacity of ${capacity} guests for these dates.`,
      }
    }
  }

  return { ok: true, units }
}
