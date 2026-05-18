import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CHANGE_REQUEST_DEPTS,
  canDirectlyCancelAccommodationBooking,
  canDirectlyManageAccommodationBooking,
  canDirectlyManageAccommodationBookings,
  canRequestAccommodationBooking,
  canRequestAccommodationDeletion,
  canSubmitChangeRequest,
} from '@hod/shared/config/accommodation'

test('Phase 7 booking authority policy matches the approved department matrix', () => {
  const cases = [
    {
      slug: 'head-office',
      canDirectlyCancel: true,
      canDirectlyManage: true,
      canRequestBooking: false,
      canRequestDeletion: true,
      canSubmitGeneralChangeRequest: false,
    },
    {
      slug: 'hq-reception',
      canDirectlyCancel: false,
      canDirectlyManage: false,
      canRequestBooking: true,
      canRequestDeletion: true,
      canSubmitGeneralChangeRequest: true,
    },
    {
      slug: 'housekeeping',
      canDirectlyCancel: false,
      canDirectlyManage: false,
      canRequestBooking: true,
      canRequestDeletion: true,
      canSubmitGeneralChangeRequest: true,
    },
    {
      slug: 'main-gate',
      canDirectlyCancel: false,
      canDirectlyManage: false,
      canRequestBooking: false,
      canRequestDeletion: false,
      canSubmitGeneralChangeRequest: false,
    },
    {
      slug: 'food-and-beverage',
      canDirectlyCancel: false,
      canDirectlyManage: false,
      canRequestBooking: false,
      canRequestDeletion: false,
      canSubmitGeneralChangeRequest: false,
    },
    {
      slug: 'unknown-department',
      canDirectlyCancel: false,
      canDirectlyManage: false,
      canRequestBooking: false,
      canRequestDeletion: false,
      canSubmitGeneralChangeRequest: false,
    },
  ]

  for (const policy of cases) {
    assert.equal(
      canDirectlyCancelAccommodationBooking(policy.slug),
      policy.canDirectlyCancel,
      `${policy.slug} direct cancellation policy changed`,
    )
    assert.equal(
      canDirectlyManageAccommodationBooking(policy.slug),
      policy.canDirectlyManage,
      `${policy.slug} direct edit policy changed`,
    )
    assert.equal(
      canDirectlyManageAccommodationBookings(policy.slug),
      policy.canDirectlyManage,
      `${policy.slug} direct edit plural policy changed`,
    )
    assert.equal(
      canRequestAccommodationBooking(policy.slug),
      policy.canRequestBooking,
      `${policy.slug} booking request policy changed`,
    )
    assert.equal(
      canRequestAccommodationDeletion(policy.slug),
      policy.canRequestDeletion,
      `${policy.slug} deletion request policy changed`,
    )
    assert.equal(
      canSubmitChangeRequest(policy.slug),
      policy.canSubmitGeneralChangeRequest,
      `${policy.slug} general change request policy changed`,
    )
  }

  assert.deepEqual(
    [...CHANGE_REQUEST_DEPTS].sort(),
    ['head-office', 'housekeeping', 'hq-reception'],
    'change request department list should follow deletion request authority',
  )
})
