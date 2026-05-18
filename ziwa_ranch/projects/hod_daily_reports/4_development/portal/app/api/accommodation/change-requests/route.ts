import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { createServerClient } from '@/lib/supabase-server'
import { canRequestAccommodationBooking, canRequestAccommodationDeletion, canSubmitChangeRequest, validateAccommodationStayDates } from '@hod/shared/config/accommodation'
import { isBookingVisibleToDepartment } from '@hod/shared/lib/accommodation-guards'
import type { MealPlan, RequestedChanges } from '@hod/shared/types'

const ALLOWED_MEAL_PLANS = new Set<MealPlan>(['fb', 'hb', 'bb', 'none'])

const ALLOWED_CHANGE_KEYS = new Set([
  'check_in', 'check_out', 'adults', 'children',
  'meal_plan', 'special_notes', 'guest_email', 'guest_phone',
])

export function sanitiseRequestedChanges(input: unknown): RequestedChanges | null {
  if (!input || typeof input !== 'object') return null

  const raw = input as Record<string, unknown>
  if ('action' in raw) {
    return raw.action === 'delete' && Object.keys(raw).length === 1 ? { action: 'delete' } : null
  }

  const blocked = Object.keys(raw).filter((k) => !ALLOWED_CHANGE_KEYS.has(k))
  if (blocked.length > 0) return null

  const changes: RequestedChanges = {}

  if (typeof raw.check_in === 'string') changes.check_in = raw.check_in
  if (typeof raw.check_out === 'string') changes.check_out = raw.check_out
  if (typeof raw.adults === 'number' && Number.isFinite(raw.adults)) changes.adults = Math.max(1, Math.floor(raw.adults))
  if (typeof raw.children === 'number' && Number.isFinite(raw.children)) changes.children = Math.max(0, Math.floor(raw.children))
  if (typeof raw.meal_plan === 'string' && ALLOWED_MEAL_PLANS.has(raw.meal_plan as MealPlan)) changes.meal_plan = raw.meal_plan as MealPlan
  if (typeof raw.special_notes === 'string' && raw.special_notes.trim()) changes.special_notes = raw.special_notes.trim()
  if (typeof raw.guest_email === 'string') changes.guest_email = raw.guest_email.trim()
  if (typeof raw.guest_phone === 'string') changes.guest_phone = raw.guest_phone.trim()

  return Object.keys(changes).length > 0 ? changes : null
}

function isInvalidRequestedChangesInput(input: unknown, requestedChanges: RequestedChanges | null): boolean {
  return !!input
    && typeof input === 'object'
    && Object.keys(input as Record<string, unknown>).length > 0
    && requestedChanges === null
}

export const GET = withAuth(async ({ user, request }) => {
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!user.department_slug) {
    return NextResponse.json({ error: 'Your department cannot view change requests.' }, { status: 403 })
  }
  if (!user.department_id) {
    return NextResponse.json({ error: 'Your department cannot view change requests.' }, { status: 403 })
  }

  const supabase = createServerClient()
  const url = new URL(request.url)
  const bookingId = url.searchParams.get('booking_id')
  const status = url.searchParams.get('status') || 'pending'

  if (!bookingId) {
    return NextResponse.json({ error: 'booking_id is required.' }, { status: 400 })
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, check_in, check_out, status')
    .eq('id', bookingId)
    .single()
  if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  if (!isBookingVisibleToDepartment(user.department_slug, booking)) {
    return NextResponse.json({ error: 'That booking is outside your department accommodation scope.' }, { status: 403 })
  }

  let query = supabase
    .from('booking_change_requests')
    .select('id, booking_id, reason, requested_changes, status, created_at, reviewed_at')
    .eq('booking_id', bookingId)
    .eq('requesting_dept_id', user.department_id)
    .order('created_at', { ascending: false })

  if (status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
})

export const POST = withAuth(async ({ user, request }) => {
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!user.department_slug) {
    return NextResponse.json({ error: 'Your department cannot submit change requests.' }, { status: 403 })
  }

  const supabase = createServerClient()
  const body = await request.json()
  const { booking_id, reason } = body
  const requestedChanges = sanitiseRequestedChanges(body.requested_changes)

  if (!booking_id || !reason?.trim()) {
    return NextResponse.json({ error: 'Booking and reason are required.' }, { status: 400 })
  }
  if (isInvalidRequestedChangesInput(body.requested_changes, requestedChanges)) {
    return NextResponse.json({ error: 'Unsupported change request shape.' }, { status: 400 })
  }

  const isDeletionRequest = requestedChanges?.action === 'delete'
  const canSubmitRequest = isDeletionRequest
    ? canRequestAccommodationDeletion(user.department_slug)
    : canRequestAccommodationBooking(user.department_slug) || canSubmitChangeRequest(user.department_slug)
  if (!canSubmitRequest) {
    return NextResponse.json({ error: 'Your department cannot submit change requests.' }, { status: 403 })
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, check_in, check_out, status')
    .eq('id', booking_id)
    .single()
  if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  if (!isBookingVisibleToDepartment(user.department_slug, booking)) {
    return NextResponse.json({ error: 'That booking is outside your department accommodation scope.' }, { status: 403 })
  }

  if (requestedChanges?.check_in || requestedChanges?.check_out) {
    const nextCheckIn = requestedChanges.check_in || booking.check_in
    const nextCheckOut = requestedChanges.check_out || booking.check_out

    if (nextCheckOut <= nextCheckIn) {
      return NextResponse.json({ error: 'Check-out must be after check-in.' }, { status: 400 })
    }

    const stayValidation = validateAccommodationStayDates(user.department_slug, nextCheckIn, nextCheckOut)
    if (!stayValidation.valid) {
      return NextResponse.json({ error: stayValidation.error }, { status: 400 })
    }
  }

  const { error } = await supabase.from('booking_change_requests').insert({
    booking_id,
    requesting_dept_id: user.department_id,
    requesting_user_id: user.id,
    reason: reason.trim(),
    requested_changes: requestedChanges,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await Promise.resolve(supabase.from('booking_activity_log').insert({
    booking_id,
    action: 'change_request_submitted',
    actor_user_id: user.id,
    details: { reason: reason.trim(), has_structured_changes: !!requestedChanges },
  })).catch((e) => console.error('Activity log insert failed:', e))

  return NextResponse.json({ success: true })
})
