import { NextResponse } from 'next/server'
import { withAdminAuth, logAdminActivity } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { validateAccommodationWrite } from '@hod/shared/lib/accommodation-guards'

const AUTO_APPLY_BOOKING_FIELDS = ['check_in', 'check_out', 'adults', 'children', 'meal_plan', 'special_notes', 'guest_email', 'guest_phone'] as const

export const GET = withAdminAuth(async ({ request }) => {
  const supabase = createServerClient()
  const url = new URL(request.url)
  const status = url.searchParams.get('status') || 'pending'
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100)
  const offset = Number(url.searchParams.get('offset')) || 0

  let query = supabase
    .from('booking_change_requests')
    .select(`
      id, booking_id, reason, requested_changes, status, review_note, created_at, reviewed_at,
      bookings:booking_id(id, guest_name, check_in, check_out, status, adults, children, meal_plan),
      requesting_dept:requesting_dept_id(name),
      requesting_user:requesting_user_id(hod_name),
      reviewer:reviewed_by(hod_name)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status !== 'all') query = query.eq('status', status)
  const bookingId = url.searchParams.get('booking_id')
  if (bookingId) query = query.eq('booking_id', bookingId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}, { capability: 'accommodation_manage' })

export const POST = withAdminAuth(async ({ admin, request }) => {
  const supabase = createServerClient()
  const body = await request.json()
  const { id, action, review_note } = body

  if (!id || !action) return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })
  if (!['approved', 'denied'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
  }

  const { data: changeReq } = await supabase
    .from('booking_change_requests')
    .select('*, bookings:booking_id(id, guest_name, check_in, check_out, adults, children, booking_rooms(unit_id))')
    .eq('id', id)
    .single()

  if (!changeReq) return NextResponse.json({ error: 'Request not found.' }, { status: 404 })
  if (changeReq.status !== 'pending') {
    return NextResponse.json({ error: 'This change request has already been reviewed.' }, { status: 400 })
  }

  if (action === 'approved' && changeReq.requested_changes && changeReq.bookings?.id) {
    const changes = changeReq.requested_changes as Record<string, unknown>
    const unsupportedFields = Object.keys(changes).filter(
      (field) => !AUTO_APPLY_BOOKING_FIELDS.includes(field as (typeof AUTO_APPLY_BOOKING_FIELDS)[number]),
    )
    if (unsupportedFields.length > 0) {
      return NextResponse.json({ error: 'Change request contains unsupported fields and must be reviewed manually.' }, { status: 400 })
    }

    const bookingFields = Object.fromEntries(
      AUTO_APPLY_BOOKING_FIELDS
        .filter((field) => field in changes)
        .map((field) => [field, changes[field]]),
    ) as Record<string, unknown>
    const existingRoomIds = (changeReq.bookings.booking_rooms ?? []).map((room: { unit_id: string }) => room.unit_id)
    const nextCheckIn = (bookingFields.check_in as string | undefined) || changeReq.bookings.check_in
    const nextCheckOut = (bookingFields.check_out as string | undefined) || changeReq.bookings.check_out
    const nextAdults = typeof bookingFields.adults === 'number' ? bookingFields.adults : changeReq.bookings.adults
    const nextChildren = typeof bookingFields.children === 'number' ? bookingFields.children : changeReq.bookings.children

    if (nextCheckOut <= nextCheckIn) {
      return NextResponse.json({ error: 'Check-out must be after check-in.' }, { status: 400 })
    }

    const writeValidation = await validateAccommodationWrite(supabase, {
      checkIn: nextCheckIn,
      checkOut: nextCheckOut,
      roomIds: existingRoomIds,
      adults: nextAdults,
      children: nextChildren,
      excludeBookingId: changeReq.bookings.id,
      allowedInactiveRoomIds: existingRoomIds,
    })
    if (!writeValidation.ok) {
      return NextResponse.json({ error: writeValidation.error || 'Change request conflicts with an existing booking.' }, { status: 400 })
    }
  }

  const { error } = await supabase.rpc('review_booking_change_request_atomic', {
    p_request_id: id,
    p_action: action,
    p_reviewed_by: admin.id,
    p_review_note: review_note || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAdminActivity(admin.id, 'change_request_reviewed', {
    request_id: id,
    action,
    auto_applied: action === 'approved' && !!changeReq.requested_changes,
  })

  if (changeReq.bookings?.id) {
    await Promise.resolve(supabase.from('booking_activity_log').insert({
      booking_id: changeReq.bookings.id,
      action: `change_request_${action}`,
      actor_user_id: admin.id,
      details: {
        request_id: id,
        auto_applied: action === 'approved' && !!changeReq.requested_changes,
        changes: changeReq.requested_changes,
      },
    })).catch((e) => console.error('Activity log insert failed:', e))
  }

  return NextResponse.json({ success: true })
}, { capability: 'accommodation_manage' })
