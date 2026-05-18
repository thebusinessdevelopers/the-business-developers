import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { createServerClient } from '@/lib/supabase-server'
import { canDirectlyCancelAccommodationBooking, canDirectlyManageAccommodationBookings, canManageAccommodationBookings, canViewPrivateGuestNames, validateAccommodationStayDates } from '@hod/shared/config/accommodation'
import { isBookingVisibleToDepartment, validateAccommodationWrite } from '@hod/shared/lib/accommodation-guards'

export const GET = withAuth(async ({ user, request }) => {
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!user.department_slug || !canManageAccommodationBookings(user.department_slug)) {
    return NextResponse.json({ error: 'Your department cannot manage bookings.' }, { status: 403 })
  }

  const supabase = createServerClient()
  const id = request.nextUrl.pathname.split('/').pop()

  const [bookingResult, activitiesResult] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, booking_rooms(unit_id, room_config, accommodation_units(id, name, building, category, capacity, rate_category, pricing_type, sort_order))')
      .eq('id', id)
      .single(),
    supabase
      .from('booking_activities')
      .select('*')
      .eq('booking_id', id)
      .order('activity_date'),
  ])

  if (bookingResult.error) return NextResponse.json({ error: bookingResult.error.message }, { status: 404 })

  return NextResponse.json({
    ...bookingResult.data,
    booking_activities: activitiesResult.data ?? [],
    guest_name: bookingResult.data.is_private && !canViewPrivateGuestNames(user.department_slug)
      ? 'Private Guest'
      : bookingResult.data.guest_name,
  })
})

export const PUT = withAuth(async ({ user, request }) => {
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!user.department_slug || !canManageAccommodationBookings(user.department_slug)) {
    return NextResponse.json({ error: 'Your department cannot manage bookings.' }, { status: 403 })
  }

  const supabase = createServerClient()
  const id = request.nextUrl.pathname.split('/').pop()
  const body = await request.json()
  const { unit_ids, basket } = body
  const hasBasket = Array.isArray(basket) && basket.length > 0

  const { data: current, error: currentError } = await supabase
    .from('bookings')
    .select('check_in, check_out, status, booking_rooms(unit_id)')
    .eq('id', id)
    .single()

  if (currentError || !current) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  }
  if (!isBookingVisibleToDepartment(user.department_slug, current)) {
    return NextResponse.json({ error: 'That booking is outside your department accommodation scope.' }, { status: 403 })
  }

  if (body.status === 'cancelled') {
    if (!canDirectlyCancelAccommodationBooking(user.department_slug)) {
      return NextResponse.json({ error: 'Your department cannot cancel bookings directly.' }, { status: 403 })
    }
    if (current.status === 'hod_pending') {
      return NextResponse.json({ error: 'Pending bookings must be reviewed with approve or deny.' }, { status: 400 })
    }

    const cancellationReason = typeof body.reason === 'string' ? body.reason.trim() : ''

    const { error: cancelError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (cancelError) return NextResponse.json({ error: cancelError.message }, { status: 500 })

    await Promise.resolve(supabase.from('booking_activity_log').insert({
      booking_id: id,
      action: 'hod_booking_cancelled',
      actor_user_id: user.id,
      details: { dept: user.department_slug, reason: cancellationReason || null },
    })).catch((e) => console.error('Activity log insert failed:', e))

    return NextResponse.json({ success: true })
  }

  if (!canDirectlyManageAccommodationBookings(user.department_slug)) {
    return NextResponse.json({ error: 'Your department must request booking changes for existing bookings.' }, { status: 403 })
  }

  if (!body.guest_name || !body.check_in || !body.check_out) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  if (!hasBasket && (!Array.isArray(unit_ids) || unit_ids.length === 0)) {
    return NextResponse.json({ error: 'Add at least one room.' }, { status: 400 })
  }

  if (body.check_out <= body.check_in) {
    return NextResponse.json({ error: 'Check-out must be after check-in.' }, { status: 400 })
  }

  const stayValidation = validateAccommodationStayDates(user.department_slug, body.check_in, body.check_out)
  if (!stayValidation.valid) {
    return NextResponse.json({ error: stayValidation.error }, { status: 400 })
  }

  if (current.status === 'hod_pending' && body.status !== 'hod_pending') {
    return NextResponse.json({ error: 'Pending bookings must be reviewed with approve or deny.' }, { status: 400 })
  }

  const isPrivate = body.is_private !== false
  const companyName = isPrivate ? null : body.company_name?.trim() || null
  if (!isPrivate && !companyName) {
    return NextResponse.json({ error: 'Company name is required for company bookings.' }, { status: 400 })
  }

  const adults = hasBasket ? basket.reduce((sum: number, item: { adults: number }) => sum + item.adults, 0) : (body.adults || 1)
  const children = hasBasket ? basket.reduce((sum: number, item: { children: number }) => sum + item.children, 0) : (body.children || 0)
  const mealPlan = hasBasket ? (basket[0]?.meal_plan ?? 'fb') : (body.meal_plan || 'fb')
  const year = new Date(body.check_in).getFullYear()
  const roomIds = hasBasket ? basket.map((item: { unit_id: string }) => item.unit_id) : unit_ids
  const existingRoomIds = (current.booking_rooms ?? []).map((room: { unit_id: string }) => room.unit_id)
  const writeValidation = await validateAccommodationWrite(supabase, {
    checkIn: body.check_in,
    checkOut: body.check_out,
    roomIds,
    adults,
    children,
    basketItems: hasBasket ? basket : undefined,
    excludeBookingId: id,
    allowedInactiveRoomIds: existingRoomIds,
  })
  if (!writeValidation.ok) {
    return NextResponse.json({ error: writeValidation.error || 'Booking validation failed.' }, { status: 400 })
  }

  const updatePayload = {
    guest_name: body.guest_name,
    guest_email: body.guest_email?.trim() || null,
    guest_phone: body.guest_phone?.trim() || null,
    company_name: companyName,
    is_private: isPrivate,
    check_in: body.check_in,
    check_out: body.check_out,
    adults,
    children,
    meal_plan: mealPlan,
    booking_source: body.booking_source || 'direct',
    agent_name: body.agent_name?.trim() || null,
    rate_type: body.rate_type || 'rack',
    year,
    agreed_rate_per_night: body.agreed_rate_per_night ?? null,
    special_notes: body.special_notes || null,
    payment_status: body.payment_status || 'unpaid',
    status: body.status || current.status,
  }
  const roomRows = hasBasket
    ? basket.map((item: { unit_id: string }) => ({ unit_id: item.unit_id, room_config: item }))
    : roomIds.map((unitId: string) => ({ unit_id: unitId, room_config: null }))

  const { error: updateError } = await supabase.rpc('save_booking_with_rooms_atomic', {
    p_booking_id: id,
    p_guest_name: updatePayload.guest_name,
    p_company_name: updatePayload.company_name,
    p_is_private: updatePayload.is_private,
    p_check_in: updatePayload.check_in,
    p_check_out: updatePayload.check_out,
    p_meal_plan: updatePayload.meal_plan,
    p_adults: updatePayload.adults,
    p_children: updatePayload.children,
    p_booking_source: updatePayload.booking_source,
    p_agent_name: updatePayload.agent_name,
    p_rate_type: updatePayload.rate_type,
    p_year: updatePayload.year,
    p_agreed_rate_per_night: updatePayload.agreed_rate_per_night,
    p_special_notes: updatePayload.special_notes,
    p_payment_status: updatePayload.payment_status,
    p_status: updatePayload.status,
    p_room_rows: roomRows,
  })

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  if (Array.isArray(body.activities)) {
    await Promise.resolve(supabase.from('booking_activities').delete().eq('booking_id', id)).catch(() => {})
    if (body.activities.length > 0) {
      const activityRows = body.activities.map((a: Record<string, unknown>) => ({
        booking_id: id,
        activity_name: a.activity_name,
        guest_category: a.guest_category,
        activity_date: a.activity_date,
        adults: a.adults ?? 0,
        children: a.children ?? 0,
        adult_rate: a.adult_rate ?? 0,
        child_rate: a.child_rate ?? 0,
        currency_code: a.currency_code ?? 'USD',
        notes: a.notes ?? '',
      }))
      await Promise.resolve(supabase.from('booking_activities').insert(activityRows)).catch(() => {})
    }
  }

  await Promise.resolve(supabase.from('booking_activity_log').insert({
    booking_id: id,
    action: 'updated',
    actor_user_id: user.id,
    details: {
      changed_fields: [...Object.keys(updatePayload), 'booking_rooms'],
      dept: user.department_slug,
    },
  })).catch((e) => console.error('Activity log insert failed:', e))

  return NextResponse.json({ success: true })
})
