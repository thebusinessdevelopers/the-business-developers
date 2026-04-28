import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { createServerClient } from '@/lib/supabase-server'
import { canManageAccommodationBookings, canViewPrivateGuestNames, resolveAccommodationQueryRange } from '@hod/shared/config/accommodation'

export const GET = withAuth(async ({ user, request }) => {
  if (!user?.department_slug) {
    return NextResponse.json({ error: 'Your account is missing a department assignment.' }, { status: 403 })
  }

  const supabase = createServerClient()
  const url = new URL(request.url)
  const allowPrivateNames = canViewPrivateGuestNames(user.department_slug)
  const allowManagerFields = canManageAccommodationBookings(user.department_slug)
  const range = resolveAccommodationQueryRange(user.department_slug, {
    from: url.searchParams.get('from'),
    to: url.searchParams.get('to'),
    days: url.searchParams.get('days') ? Number(url.searchParams.get('days')) : null,
  })
  const { from, to } = range

  const bookingsQuery = allowManagerFields
    ? supabase
        .from('bookings')
        .select('id, guest_name, company_name, is_private, check_in, check_out, meal_plan, adults, children, booking_source, agent_name, rate_type, year, agreed_rate_per_night, special_notes, payment_status, status, created_by, created_at, updated_at, booking_rooms(unit_id, room_config, accommodation_units(id, name, building, category, capacity, rate_category, pricing_type, sort_order))')
    : supabase
        .from('bookings')
        .select('id, guest_name, company_name, is_private, check_in, check_out, meal_plan, adults, children, booking_source, special_notes, status, booking_rooms(unit_id, room_config, accommodation_units(id, name, building, category, capacity, rate_category, pricing_type, sort_order))')

  const [bookingsResult, unitsResult] = await Promise.all([
    bookingsQuery
      .lte('check_in', to)
      .gte('check_out', from)
      .neq('status', 'cancelled')
      .order('check_in'),
    supabase
      .from('accommodation_units')
      .select('id, name, building, category, capacity, rate_category, pricing_type, sort_order')
      .eq('status', 'active')
      .order('sort_order'),
  ])

  if (bookingsResult.error) return NextResponse.json({ error: bookingsResult.error.message }, { status: 500 })
  if (unitsResult.error) return NextResponse.json({ error: unitsResult.error.message }, { status: 500 })

  const bookings = ((bookingsResult.data ?? []) as unknown as Array<Record<string, unknown> & { guest_name: string; is_private: boolean }>).map(b => ({
    ...b,
    guest_name: b.is_private && !allowPrivateNames ? 'Private Guest' : b.guest_name,
  }))

  return NextResponse.json({ bookings, units: unitsResult.data ?? [], range })
})
