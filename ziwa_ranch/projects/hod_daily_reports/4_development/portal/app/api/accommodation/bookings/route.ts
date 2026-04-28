import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { createServerClient } from '@/lib/supabase-server'
import { canCreateBooking, canManageAccommodationBookings, requiresApproval, validateAccommodationStayDates, calculateItemRate, nightsBetween, calculateActivitiesSubtotals } from '@hod/shared/config/accommodation'
import type { RoomBasketItem, AccommodationRate, RateType, ActivityBasketItem } from '@hod/shared/types'
import { validateAccommodationWrite } from '@hod/shared/lib/accommodation-guards'
import { createErrorNotification } from '@hod/shared/lib/error-notifications'

export const POST = withAuth(async ({ user, request }) => {
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!user.department_slug || !canCreateBooking(user.department_slug)) {
    return NextResponse.json({ error: 'Your department cannot create bookings.' }, { status: 403 })
  }

  const supabase = createServerClient()
  const body = await request.json()
  const { guest_name, check_in, check_out, basket, special_notes, guest_email, guest_phone, activities } = body
  const canManageBookings = canManageAccommodationBookings(user.department_slug)

  if (!guest_name || !check_in || !check_out || !basket?.length) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  if (check_out <= check_in) {
    return NextResponse.json({ error: 'Check-out must be after check-in.' }, { status: 400 })
  }

  const stayValidation = validateAccommodationStayDates(user.department_slug, check_in, check_out)
  if (!stayValidation.valid) {
    return NextResponse.json({ error: stayValidation.error }, { status: 400 })
  }

  const requestedStatus = typeof body.status === 'string' ? body.status : null
  const status = requiresApproval(user.department_slug)
    ? 'hod_pending'
    : (canManageBookings && requestedStatus) ? requestedStatus : 'confirmed'
  const year = new Date(check_in).getFullYear()

  const adults = basket.reduce((s: number, i: { adults: number }) => s + i.adults, 0)
  const children = basket.reduce((s: number, i: { children: number }) => s + i.children, 0)
  const meal_plan = basket[0]?.meal_plan ?? 'fb'
  const roomIds = basket.map((item: { unit_id: string }) => item.unit_id)
  const writeValidation = await validateAccommodationWrite(supabase, {
    checkIn: check_in,
    checkOut: check_out,
    roomIds,
    adults,
    children,
    basketItems: basket,
  })
  if (!writeValidation.ok) {
    return NextResponse.json({ error: writeValidation.error || 'Booking validation failed.' }, { status: 400 })
  }

  const isPrivate = canManageBookings ? body.is_private !== false : false
  const companyName = !isPrivate ? body.company_name?.trim() || null : null

  if (canManageBookings && !isPrivate && !companyName) {
    return NextResponse.json({ error: 'Company name is required for company bookings.' }, { status: 400 })
  }

  const rateType: RateType = canManageBookings ? (body.rate_type || 'rack') : 'rack'

  const hasNullRates = basket.some((item: RoomBasketItem) => item.rate_per_night == null)
  let enrichedBasket: RoomBasketItem[] = basket
  let agreedRate: number | null = canManageBookings ? (body.agreed_rate_per_night ?? null) : null

  if (hasNullRates) {
    const { data: rates } = await supabase
      .from('accommodation_rates')
      .select('*')
      .eq('year', year)

    if (rates?.length) {
      enrichedBasket = basket.map((item: RoomBasketItem) => {
        if (item.rate_per_night != null) return item
        const suggested = calculateItemRate(item, rates as AccommodationRate[], rateType, year)
        return { ...item, rate_per_night: suggested }
      })
      const perNight = enrichedBasket.reduce(
        (sum: number, item: RoomBasketItem) => sum + (item.isComplimentary ? 0 : (item.rate_per_night ?? 0)), 0,
      )
      if (agreedRate == null && perNight > 0) agreedRate = perNight
    }
  }

  const { data: booking, error } = await supabase.from('bookings').insert({
    guest_name,
    guest_email: guest_email?.trim() || null,
    guest_phone: guest_phone?.trim() || null,
    company_name: companyName,
    is_private: isPrivate,
    check_in,
    check_out,
    adults, children, meal_plan,
    year,
    status,
    special_notes: special_notes || null,
    booking_source: canManageBookings ? (body.booking_source || 'direct') : 'direct',
    agent_name: canManageBookings ? body.agent_name?.trim() || null : null,
    rate_type: rateType,
    agreed_rate_per_night: agreedRate,
    payment_status: canManageBookings ? (body.payment_status || 'unpaid') : 'unpaid',
    created_by: user.id,
  }).select('id').single()

  if (error) {
    createErrorNotification(supabase, {
      recipientUserId: user.id,
      type: 'booking_save_failed',
      bodyPreview: `Booking for ${guest_name} could not be saved. Please try again.`,
      batchKey: `error:booking:${user.id}:${check_in}`,
    }).catch(() => {})
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const roomRows = enrichedBasket.map((item: RoomBasketItem) => ({
    booking_id: booking.id,
    unit_id: item.unit_id,
    room_config: item,
  }))
  const { error: roomError } = await supabase.from('booking_rooms').insert(roomRows)
  if (roomError) {
    await Promise.resolve(supabase.from('bookings').delete().eq('id', booking.id)).catch(() => {})
    return NextResponse.json({ error: 'Failed to save room assignments.' }, { status: 500 })
  }

  if (Array.isArray(activities) && activities.length > 0) {
    const activityRows = activities.map((a: Record<string, unknown>) => ({
      booking_id: booking.id,
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

  const shouldPersistTotal = status !== 'hod_pending'
  if (shouldPersistTotal && agreedRate != null) {
    const nights = nightsBetween(check_in, check_out)
    const roomsUsd = (agreedRate ?? 0) * nights
    const parsedActivities: ActivityBasketItem[] = Array.isArray(activities) ? activities : []
    const actSubs = calculateActivitiesSubtotals(parsedActivities)
    let ugxRate: number | null = null
    if (actSubs.ugx > 0) {
      const { data: setting } = await supabase.from('system_settings').select('value').eq('key', 'ugx_usd_rate').single()
      ugxRate = setting?.value ? Number(setting.value) : null
    }
    const activitiesUsd = actSubs.usd + (ugxRate && ugxRate > 0 ? actSubs.ugx / ugxRate : 0)
    const totalCostUsd = Math.round((roomsUsd + activitiesUsd) * 100) / 100
    await Promise.resolve(
      supabase.from('bookings').update({
        total_cost_usd: totalCostUsd,
        ugx_to_usd_rate_used: ugxRate,
      }).eq('id', booking.id)
    ).catch(() => {})
  }

  await Promise.resolve(supabase.from('booking_activity_log').insert({
    booking_id: booking.id,
    action: 'hod_created',
    actor_user_id: user.id,
    details: { guest_name, check_in, check_out, status, dept: user.department_slug, managed: canManageBookings },
  })).catch((e) => console.error('Activity log insert failed:', e))

  const { data: admins } = await supabase.from('hod_users').select('id').eq('role', 'admin')
  if (admins?.length) {
    const notifications = admins
      .filter(a => a.id !== user.id)
      .map(a => ({
        recipient_user_id: a.id,
        type: 'booking_submitted',
        triggered_by_user_id: user.id,
        body_preview: `${requiresApproval(user.department_slug!) ? 'Pending booking' : 'New booking'} by ${user.hod_name}: ${guest_name} (${check_in})`,
      }))
    await Promise.resolve(supabase.from('hod_notifications').insert(notifications)).catch(() => {})
  }

  return NextResponse.json({ id: booking.id, status })
})
