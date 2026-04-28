import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export const GET = withAdminAuth(async ({ request }) => {
  const supabase = createServerClient()
  const url = new URL(request.url)
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0]

  const [bookingsResult, unitsResult] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, guest_name, check_in, check_out, adults, children, meal_plan, status, special_notes, booking_rooms(unit_id, accommodation_units(id, name, building, category, capacity, sort_order))')
      .lte('check_in', date)
      .gt('check_out', date)
      .neq('status', 'cancelled')
      .order('check_in'),
    supabase
      .from('accommodation_units')
      .select('id, name, building, capacity, sort_order')
      .eq('status', 'active')
      .order('sort_order'),
  ])

  const { data: bookings, error } = bookingsResult
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: allUnits } = unitsResult

  const unitBookingMap: Record<string, typeof bookings[0] | null> = {}
  for (const unit of allUnits ?? []) {
    unitBookingMap[unit.id] = null
  }
  for (const booking of bookings ?? []) {
    for (const br of booking.booking_rooms ?? []) {
      unitBookingMap[br.unit_id] = booking
    }
  }

  const totalGuests = (bookings ?? []).reduce((sum, b) => sum + b.adults + b.children, 0)
  const occupiedUnits = Object.values(unitBookingMap).filter(Boolean).length
  const totalUnits = (allUnits ?? []).length

  return NextResponse.json({
    date,
    bookings: bookings ?? [],
    units: allUnits ?? [],
    unitBookingMap,
    summary: { totalGuests, occupiedUnits, totalUnits },
  })
}, { capability: 'accommodation_manage' })
