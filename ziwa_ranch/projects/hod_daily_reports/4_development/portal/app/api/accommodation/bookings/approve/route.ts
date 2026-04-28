import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { createServerClient } from '@/lib/supabase-server'
import { canReviewPendingBookings, nightsBetween, calculateActivitiesSubtotals } from '@hod/shared/config/accommodation'
import type { ActivityBasketItem, GuestCategory, RoomBasketItem } from '@hod/shared/types'
import { validateAccommodationWrite } from '@hod/shared/lib/accommodation-guards'

export const POST = withAuth(async ({ user, request }) => {
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!user.department_slug || !canReviewPendingBookings(user.department_slug)) {
    return NextResponse.json({ error: 'Your department cannot review pending bookings.' }, { status: 403 })
  }

  const supabase = createServerClient()
  const { booking_id, action, denial_reason } = await request.json()

  if (!booking_id || !['approved', 'denied'].includes(action)) {
    return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, guest_name, check_in, check_out, adults, children, status, created_by, agreed_rate_per_night, rate_type, booking_rooms(unit_id, room_config)')
    .eq('id', booking_id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  if (booking.status !== 'hod_pending') {
    return NextResponse.json({ error: 'Booking is not pending approval.' }, { status: 400 })
  }

  if (action === 'approved') {
    const writeValidation = await validateAccommodationWrite(supabase, {
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      roomIds: (booking.booking_rooms ?? []).map((room: { unit_id: string }) => room.unit_id),
      adults: booking.adults,
      children: booking.children,
      basketItems: (booking.booking_rooms ?? [])
        .map((room: { room_config?: { unit_id: string; adults: number; children: number } | null }) => room.room_config)
        .filter((room): room is { unit_id: string; adults: number; children: number } => Boolean(room)),
      excludeBookingId: booking_id,
    })
    if (!writeValidation.ok) {
      return NextResponse.json({ error: writeValidation.error || 'Booking can no longer be approved.' }, { status: 400 })
    }
  }

  const newStatus = action === 'approved' ? 'confirmed' : 'cancelled'
  const { data: updatedBooking, error } = await supabase
    .from('bookings')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', booking_id)
    .eq('status', 'hod_pending')
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!updatedBooking?.length) {
    return NextResponse.json({ error: 'Booking is no longer pending approval.' }, { status: 409 })
  }

  if (action === 'approved') {
    const nights = nightsBetween(booking.check_in, booking.check_out)
    const perNight = booking.agreed_rate_per_night ?? (booking.booking_rooms ?? []).reduce(
      (sum: number, r: { room_config?: RoomBasketItem | null }) => sum + (r.room_config?.isComplimentary ? 0 : (r.room_config?.rate_per_night ?? 0)), 0
    )
    const roomsUsd = perNight * nights
    const { data: actRows } = await supabase.from('booking_activities').select('*').eq('booking_id', booking_id)
    const parsedActivities: ActivityBasketItem[] = (actRows ?? []).map((a: Record<string, unknown>) => ({
      activity_name: a.activity_name as string,
      guest_category: a.guest_category as GuestCategory,
      activity_date: a.activity_date as string,
      adults: (a.adults as number) || 0,
      children: (a.children as number) || 0,
      adult_rate: Number(a.adult_rate) || 0,
      child_rate: Number(a.child_rate) || 0,
      currency_code: (a.currency_code as 'USD' | 'UGX') || 'USD',
      notes: (a.notes as string) || '',
    }))
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
      }).eq('id', booking_id)
    ).catch(() => {})
  }

  await Promise.resolve(supabase.from('booking_activity_log').insert({
    booking_id,
    action: `hod_booking_${action}`,
    actor_user_id: user.id,
    details: { new_status: newStatus, denial_reason: denial_reason || null, dept: user.department_slug },
  })).catch((e) => console.error('Activity log insert failed:', e))

  if (booking.created_by) {
    await Promise.resolve(supabase.from('hod_notifications').insert({
      recipient_user_id: booking.created_by,
      type: action === 'approved' ? 'booking_approved' : 'booking_denied',
      triggered_by_user_id: user.id,
      body_preview: action === 'approved'
        ? `Your booking for ${booking.guest_name} (${booking.check_in}) has been approved`
        : `Your booking for ${booking.guest_name} was not approved: ${denial_reason || 'No reason given'}`,
    })).catch(() => {})
  }

  return NextResponse.json({ success: true, status: newStatus })
})
