import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { createServerClient } from '@/lib/supabase-server'

export const GET = withAuth(async ({ user, request }) => {
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (user.department_slug !== 'head-office') {
    return NextResponse.json({ error: 'Head Office access is required.' }, { status: 403 })
  }

  const supabase = createServerClient()
  const url = new URL(request.url)
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0]

  const [bookingsResult, unitsResult] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, guest_name, check_in, check_out, adults, children, meal_plan, status, special_notes, booking_rooms(unit_id, room_config, accommodation_units(id, name, building, category, capacity, max_concurrent_bookings, sort_order))')
      .lte('check_in', date)
      .gt('check_out', date)
      .neq('status', 'cancelled')
      .order('check_in'),
    supabase
      .from('accommodation_units')
      .select('id, name, building, category, capacity, max_concurrent_bookings, sort_order')
      .eq('status', 'active')
      .order('sort_order'),
  ])

  const { data: bookings, error } = bookingsResult
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (unitsResult.error) return NextResponse.json({ error: unitsResult.error.message }, { status: 500 })

  const allUnits = unitsResult.data ?? []
  const unitBookingMap: Record<string, typeof bookings[0] | null> = {}
  const unitBookingsMap: Record<string, typeof bookings> = {}
  for (const unit of allUnits) {
    unitBookingMap[unit.id] = null
    unitBookingsMap[unit.id] = []
  }
  for (const booking of bookings ?? []) {
    for (const br of booking.booking_rooms ?? []) {
      unitBookingMap[br.unit_id] ??= booking
      unitBookingsMap[br.unit_id] = [...(unitBookingsMap[br.unit_id] ?? []), booking]
    }
  }

  const totalGuests = (bookings ?? []).reduce((sum, b) => sum + b.adults + b.children, 0)
  const occupiedUnits = Object.values(unitBookingsMap).filter((unitBookings) => unitBookings.length > 0).length
  const totalUnits = allUnits.length

  return NextResponse.json({
    date,
    bookings: bookings ?? [],
    units: allUnits,
    unitBookingMap,
    unitBookingsMap,
    summary: { totalGuests, occupiedUnits, totalUnits },
  })
})
