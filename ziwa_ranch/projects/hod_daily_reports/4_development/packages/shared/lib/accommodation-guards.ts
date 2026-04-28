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
  booking_rooms: { unit_id: string }[] | null
}

export interface AccommodationWriteValidationInput {
  checkIn: string
  checkOut: string
  roomIds: string[]
  adults: number
  children: number
  basketItems?: Array<{ unit_id: string; adults: number; children: number }>
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
    .select('id, name, building, category, capacity, rate_category, description, pax_config, pricing_type, status, sort_order, created_at')
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

  if (input.basketItems && input.basketItems.length > 0 && !input.adminOverride) {
    const unitById = new Map(units.map((unit) => [unit.id, unit]))

    for (const item of input.basketItems) {
      const unit = unitById.get(item.unit_id)
      if (!unit) {
        return { ok: false, units, error: 'One or more selected rooms no longer exist.' }
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
    .select('id, guest_name, check_in, check_out, booking_rooms(unit_id)')
    .lt('check_in', input.checkOut)
    .gt('check_out', input.checkIn)
    .neq('status', 'cancelled')

  if (overlapsError) {
    return { ok: false, units, error: overlapsError.message }
  }

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

  if (overlaps.length > 0) {
    const roomNames = uniqueRoomIds(overlaps.flatMap((entry) => entry.conflictRoomIds))
      .map((roomId) => unitNameById.get(roomId) ?? roomId)
    const firstConflict = overlaps[0].booking
    return {
      ok: false,
      units,
      error: `${formatRoomList(roomNames)} is already booked for ${firstConflict.guest_name} from ${firstConflict.check_in} to ${firstConflict.check_out}.`,
    }
  }

  return { ok: true, units }
}
