import { NextResponse } from 'next/server'
import { withAdminAuth, logAdminActivity } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { validateAccommodationWrite } from '@hod/shared/lib/accommodation-guards'

export const GET = withAdminAuth(async ({ request }) => {
  const supabase = createServerClient()
  const url = new URL(request.url)
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const status = url.searchParams.get('status')
  const unitId = url.searchParams.get('unit_id')
  const countOnly = url.searchParams.get('count_only') === '1'
  const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 500)
  const offset = Number(url.searchParams.get('offset')) || 0

  if (countOnly && status) {
    const { count, error } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('status', status)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ count: count ?? 0 })
  }

  let query = supabase
    .from('bookings')
    .select('*, booking_rooms(unit_id, room_config, accommodation_units(id, name, building, category, capacity, rate_category, pricing_type, status, sort_order))', { count: 'exact' })
    .order('check_in', { ascending: true })
    .range(offset, offset + limit - 1)

  if (from) query = query.gte('check_out', from)
  if (to) query = query.lte('check_in', to)
  if (status && status !== 'all') query = query.eq('status', status)
  if (unitId) query = query.contains('booking_rooms', [{ unit_id: unitId }])

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bookings: data ?? [], total: count ?? 0 })
}, { capability: 'accommodation_manage' })

export const POST = withAdminAuth(async ({ admin, request }) => {
  const supabase = createServerClient()
  const body = await request.json()

  const {
    guest_name, company_name, is_private, check_in, check_out,
    booking_source, agent_name, rate_type, special_notes, payment_status,
    status, basket, unit_ids, activities,
    adults: bodyAdults, children: bodyChildren, meal_plan: bodyMealPlan,
    agreed_rate_per_night: bodyRate,
    guest_email, guest_phone,
    adminPaxOverride,
  } = body

  const hasBasket = Array.isArray(basket) && basket.length > 0
  const roomIds = hasBasket ? basket.map((i: { unit_id: string }) => i.unit_id) : unit_ids

  if (!guest_name || !check_in || !check_out || !roomIds?.length) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }
  if (check_out <= check_in) {
    return NextResponse.json({ error: 'Check-out must be after check-in.' }, { status: 400 })
  }
  if (is_private === false && !company_name?.trim()) {
    return NextResponse.json({ error: 'Company name is required for company bookings.' }, { status: 400 })
  }

  const adults = hasBasket ? basket.reduce((s: number, i: { adults: number }) => s + i.adults, 0) : (bodyAdults || 1)
  const children = hasBasket ? basket.reduce((s: number, i: { children: number }) => s + i.children, 0) : (bodyChildren || 0)
  const meal_plan = hasBasket ? (basket[0]?.meal_plan ?? 'fb') : (bodyMealPlan || 'fb')
  const agreed_rate_per_night = bodyRate ?? null
  const writeValidation = await validateAccommodationWrite(supabase, {
    checkIn: check_in,
    checkOut: check_out,
    roomIds,
    adults,
    children,
    basketItems: hasBasket ? basket : undefined,
    adminOverride: adminPaxOverride === true,
  })
  if (!writeValidation.ok) {
    return NextResponse.json({ error: writeValidation.error || 'Booking validation failed.' }, { status: 400 })
  }

  const year = new Date(check_in).getFullYear()

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      guest_name,
      company_name: company_name?.trim() || null,
      is_private: is_private ?? true,
      check_in,
      check_out,
      meal_plan,
      adults,
      children,
      booking_source: booking_source || 'direct',
      agent_name: agent_name || null,
      rate_type: rate_type || 'rack',
      year,
      agreed_rate_per_night,
      special_notes: special_notes || null,
      payment_status: payment_status || 'unpaid',
      status: status || 'tentative',
      guest_email: guest_email?.trim() || null,
      guest_phone: guest_phone?.trim() || null,
      created_by: admin.id,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const roomRows = hasBasket
    ? basket.map((item: { unit_id: string }) => ({ booking_id: booking.id, unit_id: item.unit_id, room_config: item }))
    : (roomIds as string[]).map((uid: string) => ({ booking_id: booking.id, unit_id: uid }))
  const { error: roomError } = await supabase.from('booking_rooms').insert(roomRows)
  if (roomError) {
    await Promise.resolve(supabase.from('bookings').delete().eq('id', booking.id)).catch(() => {})
    return NextResponse.json({ error: roomError.message }, { status: 500 })
  }

  if (Array.isArray(activities) && activities.length > 0) {
    const activityRows = activities.map((a: { activity_name: string; guest_category: string; activity_date: string; adults: number; children: number; adult_rate: number; child_rate: number; currency_code: string; notes: string }) => ({
      booking_id: booking.id,
      activity_name: a.activity_name,
      guest_category: a.guest_category,
      activity_date: a.activity_date,
      adults: a.adults || 0,
      children: a.children || 0,
      adult_rate: a.adult_rate || 0,
      child_rate: a.child_rate || 0,
      currency_code: a.currency_code,
      notes: a.notes || null,
    }))
    await supabase.from('booking_activities').insert(activityRows)
      .then(({ error: actError }) => { if (actError) console.error('Activity insert failed:', actError) })
  }

  await logAdminActivity(admin.id, 'booking_created', {
    booking_id: booking.id,
    guest_name,
    check_in,
    check_out,
  })

  await Promise.resolve(supabase.from('booking_activity_log').insert({
    booking_id: booking.id,
    action: 'created',
    actor_user_id: admin.id,
    details: { guest_name, check_in, check_out, rooms: roomIds.length },
  })).catch((e) => console.error('Activity log insert failed:', e))

  return NextResponse.json({ id: booking.id })
}, { capability: 'accommodation_manage' })
