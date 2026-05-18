# Head Office Delete Authority Investigation

STATUS: scoping

## Question

Why does Head Office appear to be forced into a deletion-request path, and why does that request fail?

## Required Evidence

- Shared accommodation policy for Head Office and approval-gated departments.
- HOD booking manager delete UI path.
- HOD booking API support for direct delete.
- HOD change-request API rejection path.
- Admin direct delete comparison.

## Initial Static Clues To Verify

- Head Office appears to have `existingBookingAction: manage`, `requiresApproval: false`, and `canSubmitChangeRequest: false`.
- HOD booking manager appears to post deletion through `/api/accommodation/change-requests`.
- Change-request API appears to reject departments that cannot submit change requests.

## Findings

Wave 1 status: `CONCERNS`.

Wave 2 runtime status: `FAIL` against required Head Office direct-delete behaviour.

- Head Office policy grants direct management signals: `canCreateBooking: true`, `requiresApproval: false`, `existingBookingAction: manage`, `emptyCellAction: create`, and `canSubmitChangeRequest: false`.
- HQ Reception and Housekeeping are approval-gated: both have `canSubmitChangeRequest: true` and `requiresApproval: true`.
- `RoomsTab.tsx` routes `existingBookingAction === 'manage'` to `BookingManagerModal`, so Head Office enters the manager modal rather than the ordinary change-request modal.
- `BookingManagerModal.tsx` still labels the delete control `Request Deletion` and always posts deletion as `requested_changes: { action: 'delete' }` to `/api/accommodation/change-requests`.
- `portal/app/api/accommodation/change-requests/route.ts` rejects any department where `canSubmitChangeRequest(department_slug)` is false, returning `Your department cannot submit change requests.`
- The inspected HOD booking `[id]` API exposes `GET` and `PUT` manage paths, but no `DELETE` export.

Wave 2 browser/API evidence:

- `headoffice.florence` logged into the HOD dev-preview and reached the Head Office Rooms tab.
- The Rooms tab showed `Bookings confirmed immediately.` and `+ New Booking`.
- A test marker booking opened in the `Manage Booking` modal, and the delete control label was `Request Deletion`.
- The Head Office delete probe posted to `/api/accommodation/change-requests` and returned `403` with `Your department cannot submit change requests.`
- HQ Reception, Housekeeping, and Main Gate reached change-request body validation (`400 Booking and reason are required.`), proving their policy path differs from Head Office's policy rejection.
- The UI marker booking was cancelled during cleanup and a follow-up read showed `status: cancelled`.

## Fix Planning Notes

Preferred direction:

1. Add a Head Office HOD delete/cancel path that is not the change-request route.
2. Gate it server-side with Head Office manage policy, not UI-only checks.
3. Use cancellation/status transition, per Joshua's 2026-05-16 decision; do not use hard delete for the first fix.
4. Update `BookingManagerModal` so Head Office sees direct delete/cancel wording and calls the direct HOD route, while approval-gated departments keep `Request Deletion` and `/api/accommodation/change-requests`.
5. Preserve activity logging and cleanup/audit semantics for every direct Head Office deletion/cancellation.

Wave 3 codebase fix investigation update:

- The HOD booking `[id]` route exposes `GET` and `PUT`, but no `DELETE`.
- Admin booking `DELETE` hard-deletes booking rows and is protected by admin auth plus `accommodation_manage`; it should inform but not define the first HOD fix.
- Approved delete change requests use the atomic review RPC to set `bookings.status = 'cancelled'`, not to hard-delete the row.
- Joshua confirmed on 2026-05-16 that the Head Office action should be cancellation/status cancellation, not hard delete.
- The safest first Head Office fix is direct cancellation/status transition through the HOD booking route or a small dedicated cancel route.
- `existingBookingAction: manage` alone is not a safe direct-cancel predicate because approval-gated departments also reach manage-style flows.
- Safer guard shape: `canManageAccommodationBookings(departmentSlug) && !requiresApproval(departmentSlug)`, or explicit Head Office-only gating if Joshua wants the narrowest possible rule.
- Approval-gated departments can request cancellation through change requests; direct status cancellation should remain Head Office-only unless Joshua changes policy.
- Current portal `PUT` logs `updated`; sandbox implementation should use a clearer cancellation activity action such as `cancelled` or `status_cancelled`.

## Open Questions

- Should policy gain an explicit `canDirectlyCancelAccommodationBooking` helper to avoid overloading `existingBookingAction: manage`?
- Should Head Office cancellation use the existing `PUT` route or a clearer dedicated cancel route?

## Decision Log

| Date | Decision | Owner | Evidence |
| --- | --- | --- | --- |
| 2026-05-15 | Investigation opened under Wave 0. | Agent | Phase 7 discovery approval. |
| 2026-05-15 | Wave 1 static diagnosis completed. | Agent | Policy Agent traced the Head Office failure chain: manager modal deletion -> change-request route -> `canSubmitChangeRequest` rejection. |
| 2026-05-16 | Wave 3 route-design diagnosis completed. | Agent | Read-only subagent found approved delete requests cancel rows by status; first fix should favour Head Office direct cancellation over admin hard delete. |
| 2026-05-16 | Product decision recorded: direct Head Office action is cancellation/status cancellation. | Joshua/Agent | Joshua agreed with cancellation; approval-gated departments can request cancellation through the change-request path. |
