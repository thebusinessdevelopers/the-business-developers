import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const portalDir = join(__dirname, '..', '..', 'portal')

const accommodationRoute = readFileSync(
  join(portalDir, 'app', 'api', 'accommodation', 'route.ts'),
  'utf8',
)
const bookingManagerModal = readFileSync(
  join(portalDir, 'app', 'report', '[slug]', 'BookingManagerModal.tsx'),
  'utf8',
)
const roomsTab = readFileSync(
  join(portalDir, 'app', 'report', '[slug]', 'RoomsTab.tsx'),
  'utf8',
)

test('accommodation route includes pax configuration for modal room options', () => {
  assert.match(
    accommodationRoute,
    /\.select\(['"][^'"]*pax_config[^'"]*['"]\)/,
    'active accommodation units returned to the HOD modal must include pax_config',
  )
})

test('booking manager modal constrains room configuration to configured options', () => {
  assert.match(bookingManagerModal, /stay_configurations/)
  assert.match(bookingManagerModal, /room_configuration_code/)
  assert.match(bookingManagerModal, /room_configuration_label/)
  assert.match(bookingManagerModal, /option\.code/)
  assert.match(bookingManagerModal, /option\.label/)
  assert.match(bookingManagerModal, /<select[\s\S]*room_configuration_code/)
  assert.doesNotMatch(
    bookingManagerModal,
    /room_configuration(?:_code|_label)?[\s\S]{0,120}<input[^>]*type=["']text["']/,
    'room configuration must be selected from configured values, not free text',
  )
})

test('booking manager modal normalises restored draft room configuration data', () => {
  assert.doesNotMatch(
    bookingManagerModal,
    /setForm\(storedDraft\.data\)/,
    'stored draft data must not bypass room configuration normalisation',
  )
  assert.match(
    bookingManagerModal,
    /normaliseStoredForm/,
    'stored drafts should use the shared room configuration normalisation path',
  )
  assert.match(
    bookingManagerModal,
    /setForm\(shouldRestore && storedDraft \? normaliseStoredForm\(storedDraft\.data, units\) : loadedForm\)/,
    'existing-booking draft restore must normalise stale room configuration fields before setForm',
  )
})

test('booking manager modal preserves Task 2 cancellation and admin deletion paths', () => {
  assert.match(bookingManagerModal, /Cancel Booking/)
  assert.match(bookingManagerModal, /Request Admin Deletion/)
  assert.match(bookingManagerModal, /handleDirectCancellation/)
  assert.match(bookingManagerModal, /handleAdminDeletionRequest/)
})

test('rooms tab preserves pax configuration for the booking manager modal', () => {
  assert.match(
    roomsTab,
    /pax_config:\s*AccommodationUnit\['pax_config'\]/,
    'portal unit data must carry pax_config from the accommodation API',
  )
  assert.match(
    roomsTab,
    /pax_config:\s*u\.pax_config/,
    'calendar/modal unit mapping must preserve configured room options',
  )
  assert.doesNotMatch(
    roomsTab,
    /pax_config:\s*null/,
    'RoomsTab must not discard configured room options before opening the booking modal',
  )
})

test('rooms tab sends request-path departments to change requests for existing bookings', () => {
  assert.match(
    roomsTab,
    /canDirectlyManageAccommodationBookings/,
    'existing-booking direct edit must use an explicit direct-management policy',
  )
  assert.match(
    roomsTab,
    /existingBookingAction === 'manage' && canDirectlyManageBookings[\s\S]*openManagerEdit\(bookingId\)/,
    'only directly authorised departments should open the manager edit modal',
  )
  assert.match(
    roomsTab,
    /existingBookingAction === 'manage' && usesBookingRequestPath[\s\S]*openChangeForm\(bookingId\)/,
    'approval-gated booking departments should keep the existing-booking change-request flow',
  )
})
