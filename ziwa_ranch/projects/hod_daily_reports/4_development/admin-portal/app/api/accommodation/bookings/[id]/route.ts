import { NextResponse } from 'next/server'
import { withAdminAuth, logAdminActivity } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { validateAccommodationWrite } from '@hod/shared/lib/accommodation-guards'

export const GET = withAdminAuth(async ({ request }) => {
  const supabase = createServerClient()
  const id = request.nextUrl.pathname.split('/').pop()

  const { data, error } = await supabase
    .from('bookings')
    .select('*, booking_rooms(unit_id, room_config, accommodation_units(id, name, building, category, capacity, rate_category, pricing_type, sort_order)), booking_activities(*)')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}, { capability: 'accommodation_manage' })

export const PUT = withAdminAuth(async ({ admin, request }) => {
  const supabase = createServerClient()
  const id = request.nextUrl.pathname.split('/').pop()
  const body = await request.json()

  const { unit_ids, basket, activities } = body
  const hasBasket = Array.isArray(basket) && basket.length > 0
  const { data: current, error: currentError } = await supabase
    .from('bookings')
    .select('guest_name, company_name, is_private, check_in, check_out, meal_plan, adults, children, booking_source, agent_name, rate_type, year, agreed_rate_per_night, special_notes, payment_status, status, guest_email, guest_phone, booking_rooms(unit_id)')
    .eq('id', id)
    .single()

  if (currentError || !current) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  }

  const roomIds = hasBasket ? basket.map((i: { unit_id: string }) => i.unit_id) : unit_ids ?? (current.booking_rooms ?? []).map((room: { unit_id: string }) => room.unit_id)
  const nextGuestName = body.guest_name ?? current.guest_name
  const nextCheckIn = body.check_in ?? current.check_in
  const nextCheckOut = body.check_out ?? current.check_out

  if (nextCheckOut <= nextCheckIn) {
    return NextResponse.json({ error: 'Check-out must be after check-in.' }, { status: 400 })
  }

  const nextAdults = hasBasket
    ? basket.reduce((s: number, i: { adults: number }) => s + i.adults, 0)
    : (body.adults ?? current.adults)
  const nextChildren = hasBasket
    ? basket.reduce((s: number, i: { children: number }) => s + i.children, 0)
    : (body.children ?? current.children)
  const nextMealPlan = hasBasket
    ? (basket[0]?.meal_plan ?? 'fb')
    : (body.meal_plan ?? current.meal_plan)
  const nextIsPrivate = body.is_private ?? current.is_private
  const nextCompanyName = nextIsPrivate ? null : ((body.company_name?.trim() || current.company_name || null))
  const nextBookingSource = body.booking_source ?? current.booking_source
  const nextAgentName = typeof body.agent_name === 'string' ? (body.agent_name.trim() || null) : current.agent_name
  const nextRateType = body.rate_type ?? current.rate_type
  const nextAgreedRatePerNight = body.agreed_rate_per_night ?? current.agreed_rate_per_night ?? null
  const nextSpecialNotes = typeof body.special_notes === 'string' ? (body.special_notes || null) : current.special_notes
  const nextPaymentStatus = body.payment_status ?? current.payment_status
  const nextStatus = body.status ?? current.status
  const nextGuestEmail = typeof body.guest_email === 'string' ? (body.guest_email.trim() || null) : (body.guest_email === null ? null : current.guest_email)
  const nextGuestPhone = typeof body.guest_phone === 'string' ? (body.guest_phone.trim() || null) : (body.guest_phone === null ? null : current.guest_phone)

  if (!nextIsPrivate && !nextCompanyName) {
    return NextResponse.json({ error: 'Company name is required for company bookings.' }, { status: 400 })
  }

  const existingRoomIds = (current.booking_rooms ?? []).map((room: { unit_id: string }) => room.unit_id)
  const writeValidation = await validateAccommodationWrite(supabase, {
    checkIn: nextCheckIn,
    checkOut: nextCheckOut,
    roomIds,
    adults: nextAdults,
    children: nextChildren,
    basketItems: hasBasket ? basket : undefined,
    excludeBookingId: id,
    allowedInactiveRoomIds: existingRoomIds,
    adminOverride: body.adminPaxOverride === true,
  })
  if (!writeValidation.ok) {
    return NextResponse.json({ error: writeValidation.error || 'Booking validation failed.' }, { status: 400 })
  }

  const updatePayload = {
    guest_name: nextGuestName,
    company_name: nextCompanyName,
    is_private: nextIsPrivate,
    check_in: nextCheckIn,
    check_out: nextCheckOut,
    meal_plan: nextMealPlan,
    adults: nextAdults,
    children: nextChildren,
    booking_source: nextBookingSource,
    agent_name: nextAgentName,
    rate_type: nextRateType,
    year: new Date(nextCheckIn).getFullYear(),
    agreed_rate_per_night: nextAgreedRatePerNight,
    special_notes: nextSpecialNotes,
    payment_status: nextPaymentStatus,
    status: nextStatus,
    guest_email: nextGuestEmail,
    guest_phone: nextGuestPhone,
  }
  const changedFields = Object.entries(updatePayload)
    .filter(([key, value]) => current[key as keyof typeof current] !== value)
    .map(([key]) => key)
  const roomRows = hasBasket
    ? basket.map((item: { unit_id: string }) => ({ unit_id: item.unit_id, room_config: item }))
    : roomIds.map((uid: string) => ({ unit_id: uid, room_config: null }))

  const activityRows = Array.isArray(activities) ? activities : []

  const { error } = await supabase.rpc('save_booking_with_rooms_atomic', {
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
    p_activities: activityRows,
    p_guest_email: updatePayload.guest_email,
    p_guest_phone: updatePayload.guest_phone,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAdminActivity(admin.id, 'booking_updated', {
    booking_id: id,
    fields: changedFields,
  })

  const activityDetails: Record<string, unknown> = {
    changed_fields: [...changedFields, 'booking_rooms'],
  }
  if (changedFields.includes('status')) {
    activityDetails.from_status = current.status
    activityDetails.to_status = nextStatus
  }

  await Promise.resolve(supabase.from('booking_activity_log').insert({
    booking_id: id,
    action: changedFields.includes('status') ? 'status_changed' : 'updated',
    actor_user_id: admin.id,
    details: activityDetails,
  })).catch((e) => console.error('Activity log insert failed:', e))

  return NextResponse.json({ success: true })
}, { capability: 'accommodation_manage' })

export const DELETE = withAdminAuth(async ({ admin, request }) => {
  const supabase = createServerClient()
  const id = request.nextUrl.pathname.split('/').pop()

  const { data: booking } = await supabase.from('bookings').select('guest_name').eq('id', id).single()

  await Promise.resolve(supabase.from('booking_activity_log').insert({
    booking_id: id,
    action: 'deleted',
    actor_user_id: admin.id,
    details: { guest_name: booking?.guest_name },
  })).catch((e) => console.error('Activity log insert failed:', e))

  const { error } = await supabase.from('bookings').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAdminActivity(admin.id, 'booking_deleted', { booking_id: id })
  return NextResponse.json({ success: true })
}, { capability: 'accommodation_manage' })
