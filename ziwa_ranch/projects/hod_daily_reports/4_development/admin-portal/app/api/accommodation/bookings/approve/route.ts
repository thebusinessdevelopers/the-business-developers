import { NextResponse } from 'next/server'
import { withAdminAuth, logAdminActivity } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { validateAccommodationWrite } from '@hod/shared/lib/accommodation-guards'

export const POST = withAdminAuth(async ({ admin, request }) => {
  const supabase = createServerClient()
  const { booking_id, action, denial_reason } = await request.json()

  if (!booking_id || !['approved', 'denied'].includes(action)) {
    return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, guest_name, check_in, check_out, adults, children, status, created_by, booking_rooms(unit_id, room_config)')
    .eq('id', booking_id).single()

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

  const { data: updatedBooking, error } = await supabase.from('bookings')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', booking_id)
    .eq('status', 'hod_pending')
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!updatedBooking?.length) {
    return NextResponse.json({ error: 'Booking is no longer pending approval.' }, { status: 409 })
  }

  await Promise.resolve(supabase.from('booking_activity_log').insert({
    booking_id,
    action: `hod_booking_${action}`,
    actor_user_id: admin.id,
    details: { new_status: newStatus, denial_reason: denial_reason || null },
  })).catch((e) => console.error('Activity log insert failed:', e))

  if (booking.created_by) {
    const notifType = action === 'approved' ? 'booking_approved' : 'booking_denied'
    const preview = action === 'approved'
      ? `Your booking for ${booking.guest_name} (${booking.check_in}) has been approved`
      : `Your booking for ${booking.guest_name} was not approved: ${denial_reason || 'No reason given'}`

    await Promise.resolve(supabase.from('hod_notifications').insert({
      recipient_user_id: booking.created_by,
      type: notifType,
      triggered_by_user_id: admin.id,
      body_preview: preview,
    })).catch(() => {})
  }

  await logAdminActivity(admin.id, `hod_booking_${action}`, { booking_id, new_status: newStatus })

  return NextResponse.json({ success: true, status: newStatus })
}, { capability: 'accommodation_manage' })
