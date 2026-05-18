import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const portalDir = join(__dirname, '..', '..', 'portal')

const bookingsRoute = readFileSync(
  join(portalDir, 'app', 'api', 'accommodation', 'bookings', '[id]', 'route.ts'),
  'utf8',
)
const changeRequestsRoute = readFileSync(
  join(portalDir, 'app', 'api', 'accommodation', 'change-requests', 'route.ts'),
  'utf8',
)
const bookingManagerModal = readFileSync(
  join(portalDir, 'app', 'report', '[slug]', 'BookingManagerModal.tsx'),
  'utf8',
)

test('bookings update route supports Head Office direct cancellation without hard delete', () => {
  assert.match(bookingsRoute, /canDirectlyCancelAccommodationBooking/)
  assert.match(bookingsRoute, /isBookingVisibleToDepartment/)
  assert.match(bookingsRoute, /select\(['"][^'"]*check_in[^'"]*check_out[^'"]*status[^'"]*booking_rooms\(unit_id\)[^'"]*['"]\)/)
  assert.match(bookingsRoute, /isBookingVisibleToDepartment\(user\.department_slug,\s*current\)/)
  assert.match(bookingsRoute, /current\.status\s*===\s*['"]hod_pending['"]/)
  assert.match(bookingsRoute, /body\.status\s*===\s*['"]cancelled['"]/)
  assert.match(bookingsRoute, /status:\s*['"]cancelled['"]/)
  assert.match(bookingsRoute, /hod_booking_cancelled/)
  assert.match(bookingsRoute, /cancellationReason/)
  assert.match(bookingsRoute, /reason:\s*cancellationReason/)
  assert.doesNotMatch(bookingsRoute, /\.from\(['"]bookings['"]\)\.delete\(\)/)
})

test('bookings update route gates non-cancel direct edits separately from request-path departments', () => {
  assert.match(bookingsRoute, /canDirectlyManageAccommodationBookings/)
  assert.match(bookingsRoute, /if\s*\(!canDirectlyManageAccommodationBookings\(user\.department_slug\)\)\s*\{/)
  assert.match(bookingsRoute, /Your department must request booking changes for existing bookings\./)
  assert.match(bookingsRoute, /body\.status\s*===\s*['"]cancelled['"]/)
})

test('change-request POST splits booking and deletion request authority', () => {
  assert.match(changeRequestsRoute, /canRequestAccommodationBooking/)
  assert.match(changeRequestsRoute, /canRequestAccommodationDeletion/)
  assert.match(changeRequestsRoute, /requestedChanges\?\.action\s*===\s*['"]delete['"]/)
  assert.match(changeRequestsRoute, /canRequestAccommodationDeletion\(user\.department_slug\)/)
  assert.match(changeRequestsRoute, /canRequestAccommodationBooking\(user\.department_slug\)/)
  assert.match(changeRequestsRoute, /export const GET = withAuth/)
})

test('booking manager modal distinguishes direct cancellation from admin deletion request', () => {
  assert.match(bookingManagerModal, /Cancel Booking/)
  assert.match(bookingManagerModal, /Request Admin Deletion/)
  assert.match(bookingManagerModal, /handleDirectCancellation/)
  assert.match(bookingManagerModal, /handleAdminDeletionRequest/)
  assert.match(bookingManagerModal, /fetch\(`\/api\/accommodation\/bookings\/\$\{bookingId\}`/)
  assert.match(bookingManagerModal, /fetch\('\/api\/accommodation\/change-requests'/)
  assert.match(bookingManagerModal, /status:\s*['"]cancelled['"]/)
  assert.match(bookingManagerModal, /reason:\s*deletionReason\.trim\(\)\s*\|\|\s*null/)
  assert.match(bookingManagerModal, /requested_changes:\s*\{\s*action:\s*['"]delete['"]\s*\}/)
  assert.match(bookingManagerModal, /onClick=\{handleDirectCancellation\}/)
  assert.match(bookingManagerModal, /onClick=\{handleAdminDeletionRequest\}/)
})
