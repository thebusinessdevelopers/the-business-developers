# Phase 7 Codebase Fix Investigation Context

STATUS: scoping

## Objective

Produce a read-only, decision-ready codebase diagnosis before any sandbox fix testing for Phase 7 Head Office booking authority, Head Office Daily Summary access, room-level pax, room configuration, WhatsApp rooming output, and regression testing.

This context does not approve or contain implementation. It records source diagnosis, safest fix architecture, test boundaries, migration assessment, open decisions, and stop conditions.

## Approval Boundary

Approved for this pass:

- Read Phase 7 documentation.
- Read current source code and tests.
- Launch read-only subagents for narrow codebase diagnosis.
- Update Phase 7 documentation.

Not approved:

- Application source edits.
- Sandbox fix testing.
- Dev implementation.
- Migrations.
- Data writes.
- Production access.
- Deploys, pushes, or commits.

Next required approval before sandbox fix testing:

```text
APPROVED: phase_7_sandbox_fix_testing
```

## Subagents Launched

| Agent | Status | Main finding |
| --- | --- | --- |
| Delete/Cancellation Route Design Agent | complete | HOD `bookings/[id]` has `GET` and `PUT`, no `DELETE`; approved delete change requests cancel by setting `bookings.status = 'cancelled'`, so Head Office should use direct cancellation first rather than admin hard delete. |
| Change-Request Regression Agent | complete | Do not weaken the HOD change-request `canSubmitChangeRequest` guard; HQ Reception, Housekeeping, and Main Gate must keep the change-request path and queue review semantics. |
| Daily Summary Shared Data Agent | complete | Add a HOD-authenticated, Head Office-gated Daily Summary API that mirrors the admin JSON shape but is backed by shared summary building and selects `booking_rooms.room_config`. |
| Room-Level Pax And Legacy Data Agent | complete | `booking_rooms.room_config` is authoritative when present; legacy/null rows exist and must not be split or rounded into invented uneven pax. |
| Room Configuration Source-Of-Truth Agent | complete | Current metadata supports occupancy and bed inventory, not constrained per-stay configuration choices such as Single/Double/Twin selection. |
| WhatsApp Formatter Agent | complete | Move WhatsApp rooming formatting into a shared pure helper fed by normalised occupied-room rows; current admin client formatter uses booking-level pax and omits required fields. |
| Test Architecture Agent | complete | Existing tests cover guards and static contracts, but missing coverage exists for Head Office direct cancel, change-request policy matrix, HOD Daily Summary auth, room-level pax, and shared WhatsApp formatting. |

## Executive Diagnosis

Phase 7 is implementable without production access or an immediate migration if the first sandbox fix is scoped carefully.

The Head Office delete failure is a policy/UI/API mismatch. Head Office is configured for direct booking management and cannot submit change requests, but the HOD manager modal still sends delete requests to `/api/accommodation/change-requests`. That route correctly rejects Head Office. The safest first product-level correction is direct Head Office cancellation through the HOD booking route, not admin-style hard delete, because the approved delete change-request database path already preserves the booking row and sets `status = 'cancelled'`.

The Daily Summary gap is an auth-boundary gap and a data-shape gap. Admin Daily Summary is admin-authenticated and should not be exposed to Head Office through admin access. Head Office needs a HOD-authenticated route gated to Head Office, backed by a shared summary builder so admin and HOD do not drift. The summary query must include `booking_rooms.room_config` to render room-level pax, room notes, and room-level meal plan where present.

Room configuration is now in first-fix scope by Joshua's decision on 2026-05-16. `pax_config.beds` can show physical bed inventory and occupancy limits, but it does not define constrained per-stay configuration options. The sandbox fix must therefore add or define a constrained room-configuration source of truth before the booking UI, Daily Summary, and WhatsApp output can be accepted.

## File And Symbol Map

| Area | Files and symbols |
| --- | --- |
| HOD booking detail/update | `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/bookings/[id]/route.ts` exports `GET` and `PUT`, uses `withAuth`, `canManageAccommodationBookings`, `validateAccommodationWrite`, and logs `booking_activity_log`. |
| HOD change requests | `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/change-requests/route.ts` exports `GET` and `POST`, uses `canSubmitChangeRequest`, and rejects Head Office with `Your department cannot submit change requests.` |
| HOD delete UI | `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/BookingManagerModal.tsx` contains `handleDeletionRequest`, `Request Deletion`, and posts `{ action: 'delete' }` to change requests. |
| Policy helpers | `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/config/accommodation.ts` contains `ACCOMMODATION_POLICY_OVERRIDES`, `canSubmitChangeRequest`, `requiresApproval`, `canManageAccommodationBookings`, `canViewPrivateGuestNames`, `formatBedConfig`, and meal/status labels. |
| Admin hard delete | `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/accommodation/bookings/[id]/route.ts` exports admin `DELETE` and hard-deletes after activity logging. |
| Change-request review | `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/accommodation/change-requests/route.ts` contains `classifyRequestedChanges` and calls `review_booking_change_request_atomic`. |
| Delete review migration | `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/20260505143000_p5_05_delete_change_request_review.sql` sets approved delete requests to `bookings.status = 'cancelled'`. |
| Admin Daily Summary | `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/accommodation/daily-summary/route.ts` and `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/accommodation/DailySummary.tsx`. |
| Admin export | `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/accommodation/export/route.ts` currently exports booking-level rows. |
| HOD accommodation data | `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/route.ts` selects `booking_rooms.room_config` for calendar data. |
| Shared room data types | `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/types/index.ts` contains `RoomBasketItem`, `BookingWithUnits`, `AccommodationUnit`, `PaxConfig`, and `PaxBed`. |
| Room guards | `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/accommodation-guards.ts` contains `validateAccommodationWrite` and occupancy/capacity checks. |
| Room config migrations | `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/025_room_pax_config.sql`, `028_room_basket_config.sql`, `032_atomic_booking_room_updates.sql`, and `039_booking_activities_and_atomic_rpc.sql`. |
| Current tests | `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/` and `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/change-requests/route.test.ts`. |

## Dependency Graph Between Fixes

```text
Policy predicate for direct cancellation
  -> HOD booking route server guard
  -> Head Office modal wording/API target
  -> Head Office direct-cancel tests

Preserved change-request policy
  -> HQ Reception / Housekeeping / Main Gate regression tests
  -> Admin review queue remains unchanged

Shared Daily Summary builder
  -> Admin route keeps existing auth and shape
  -> HOD Head Office route gets separate auth
  -> Normalised occupied-room rows
  -> Shared WhatsApp formatter

booking_rooms.room_config select
  -> Per-room pax/meal/notes display
  -> WhatsApp rooming correctness
  -> Legacy/null display rule

Room configuration source-of-truth decision
  -> Optional configuration dropdown
  -> Optional migration/type changes
  -> Configuration field in summary/WhatsApp
```

## Recommended Fix Order

1. Add tests that lock the policy matrix: Head Office can manage and cannot submit change requests; HQ Reception, Housekeeping, and Main Gate can submit change requests and require approval; F&B cannot create/manage bookings.
2. Add or tighten the HOD booking route contract for direct Head Office cancellation, preferably as `PUT /api/accommodation/bookings/[id]` setting `status: 'cancelled'`, with a server predicate that blocks approval-gated departments from self-cancelling.
3. Update `BookingManagerModal` so Head Office uses direct cancellation wording and the direct booking route, while approval-gated departments keep `Request Deletion` and `/api/accommodation/change-requests`.
4. Add HOD Head Office Daily Summary route using `withAuth` and a strict Head Office gate.
5. Extract a small shared Daily Summary data builder or normalised row mapper that includes `booking_rooms.room_config`.
6. Extract a shared pure WhatsApp rooming formatter and make admin plus HOD call it.
7. Handle legacy/null `room_config` explicitly and add tests for equal, uneven, multi-night, one-night, and campsite/shared-capacity cases.
8. Implement constrained room configuration as part of the first sandbox fix, because Joshua confirmed it is blocking.

## Head Office Delete/Cancel Architecture

Recommended first sandbox architecture:

- Use direct cancellation, not hard delete.
- Joshua confirmed on 2026-05-16 that Head Office direct action should be cancellation/status cancellation, not hard delete.
- Prefer `PUT /api/accommodation/bookings/[id]` with `status: 'cancelled'` unless a dedicated `PATCH /api/accommodation/bookings/[id]/cancel` is chosen for clearer intent.
- Add a shared predicate such as `canDirectlyCancelAccommodationBooking(departmentSlug)` or equivalent logic: `canManageAccommodationBookings(departmentSlug) && !requiresApproval(departmentSlug)`. This currently isolates Head Office better than `existingBookingAction: 'manage'` alone, because approval-gated departments can also manage through review-style workflows.
- Keep `/api/accommodation/change-requests` unchanged for Head Office rejection and approval-gated department submission.
- Preserve audit/activity evidence. Use a distinct cancellation activity action such as `cancelled` or `status_cancelled`, with a human-readable note that Head Office cancelled the booking directly. This is clearer than a generic `updated` entry and avoids implying an admin hard delete.
- Do not expose admin hard delete through the HOD portal for the first fix.
- Approval-gated departments can request cancellation, but should not directly cancel through HOD `PUT`; their cancellation path remains `/api/accommodation/change-requests`.

## Daily Summary Architecture

Recommended first sandbox architecture:

- Add `portal/app/api/accommodation/daily-summary/route.ts` or equivalent HOD API route.
- Use `withAuth`; return `401` for no HOD session.
- Require `user.department_slug === 'head-office'`; return `403` for other HOD departments.
- Share the admin Daily Summary response shape where possible: `date`, `bookings`, `units`, `unitBookingMap`, `unitBookingsMap`, and `summary`.
- Extract the single-date query and mapping from the admin route into a shared helper only if this is small and keeps both auth wrappers thin.
- Keep admin Daily Summary behind `withAdminAuth` and `accommodation_manage`.
- Defer CSV unless Head Office needs CSV parity now. The existing admin export is booking-level and changing it to per-room rows is a separate product contract.

## Room-Level Pax Architecture

Recommended first sandbox architecture:

- Treat `booking_rooms.room_config` as the authoritative per-room source when present.
- Add `booking_rooms.room_config` to Daily Summary selects and normalised rows.
- Use `room_config.adults`, `room_config.children`, `room_config.meal_plan`, and `room_config.notes` for occupied room lines.
- Do not split booking-level totals across rooms for display correctness.
- For null or legacy `room_config`, either show a conservative legacy marker such as `per-room pax not recorded`, or show booking-level totals once at booking scope rather than on every room line.
- Include a `pax_source` or equivalent internal marker so UI/formatter/tests can distinguish authoritative room data from fallback data.

## Room Configuration Decision

Current code does not provide a constrained per-stay room configuration source of truth. Because Joshua confirmed this blocks the first sandbox fix, the fix architecture must include a minimal, validated source of truth rather than deferring configuration.

`pax_config.beds` supports bed inventory and capacity, not a selectable stay configuration list. It can support fixed labels only if Joshua approves the mapping. It cannot safely infer flexible options like Single/Double/Twin without additional metadata.

Recommended decision:

- Do not add free text.
- Do not add booking-level-only configuration.
- Define a minimal metadata addition such as `accommodation_units.stay_configuration_options` plus a `RoomBasketItem.stay_configuration` field or a dedicated `booking_rooms.stay_configuration` column, with server-side validation against allowed options.
- Show only constrained options in the booking UI, persist the selected value per room, and display it in Daily Summary and WhatsApp output.

## WhatsApp Formatter Architecture

Recommended first sandbox architecture:

- Create one pure shared formatter under the shared package, for example `@hod/shared/lib/rooming-whatsapp`.
- Feed it a normalised occupied-room row, not raw booking rows.
- Required row fields should include summary date, unit label, guest or group label, room adults, room children, room configuration label if available, meal plan, check-in, check-out, status, notes, booking id, and unit id for stable ordering.
- The title formatter must output `*DD MONTH YYYY - ZIWA ROOMING*` with an uppercase month.
- The line formatter should output one occupied-room line per occupied room, for example: `Obama: Asigma Group (1 pax, Single, BB, 1/1 nights, tentative & no notes)`.
- `no notes` should be literal for empty notes.
- Guest labels should arrive already redacted according to policy; the formatter should not decide auth/privacy.
- Admin and HOD should call the same formatter to avoid drift.

## Test Strategy And Command Map

Minimum automated tests before sandbox fix testing:

- Shared policy matrix for `head-office`, `hq-reception`, `housekeeping`, `main-gate`, and `food-and-beverage`.
- HOD change-request policy contract proving Head Office remains rejected by change requests while approval-gated departments pass the policy guard.
- Head Office direct cancellation route test.
- Approval-gated department regression test for delete requests.
- `BookingManagerModal` routing/wording contract for Head Office versus approval-gated departments.
- HOD Daily Summary auth tests: unauthenticated `401`, non-Head Office HOD `403`, Head Office `200`.
- Shared summary builder tests for `booking_rooms.room_config`.
- WhatsApp formatter unit tests for title, per-room pax, meal plan, stay-night, status, notes/no-notes, and campsite/shared-capacity duplicates.
- Legacy/null `room_config` tests proving totals are not divided across rooms.

Suggested command map from `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development`:

```bash
cd admin-portal && npm test
cd ../portal && node --test "app/**/*.test.ts" "components/**/*.test.ts" "lib/**/*.test.ts"
cd portal && node --test app/api/accommodation/change-requests/route.test.ts
cd portal && npm run lint
cd ../admin-portal && npm run lint
```

Note: the portal package does not currently expose a `test` script, so direct `node --test` commands are required unless the sandbox fix adds one.

## Migration Assessment

No migration appears required for the cancellation, HOD Daily Summary, room-level pax, and shared WhatsApp formatter parts of the first sandbox fix.

Because Joshua confirmed constrained room configuration is required in the first sandbox fix, a migration or typed metadata change is likely. Minimal candidates would be a JSONB allowed-options field on `accommodation_units` and either a `RoomBasketItem` JSON field or a `booking_rooms` column for the selected configuration. The sandbox plan must explicitly assess whether JSON-only persistence is sufficient or whether a first-class column is needed.

## Sandbox Fix Testing Prerequisites

Before sandbox fix testing starts:

- Joshua must give `APPROVED: phase_7_sandbox_fix_testing`.
- Product decision recorded: direct Head Office action is cancellation/status cancellation, not hard delete.
- Product decision recorded: approval-gated departments can request cancellation; direct status cancellation should remain Head Office-only unless Joshua later changes the policy.
- Product decision recorded: room configuration blocks the first sandbox fix and must be implemented.
- CSV export remains deferred from first fix unless Joshua confirms spreadsheet/export output is required now.
- Tests listed above should be written first in the sandbox branch/worktree and expected to fail against current code.
- Dev-preview write tests must have a cleanup plan before any data mutation.

## Open Decisions For Joshua

1. What controlled room-configuration options should exist for each room?
2. Should the selected room configuration be stored inside `booking_rooms.room_config`, or as a first-class `booking_rooms` column?
3. Does Head Office need CSV export now, or only Daily Summary view and WhatsApp copy? Current recommendation: defer CSV unless spreadsheet output is explicitly needed.

## Stop Conditions

Stop and check in if:

- Any task requires source edits before `APPROVED: phase_7_sandbox_fix_testing`.
- Any task requires dev implementation before `APPROVED: phase_7_implementation_dev`.
- Any task requires a migration before explicit migration approval.
- Any test would mutate dev-preview data without a cleanup route.
- Any action would inspect or mutate production without `OVERRIDE: test_in_production`.
- Any evidence would expose passwords, cookies, auth headers, localStorage/session tokens, or unnecessary private guest data.
- Product acceptance depends on room configuration but no source-of-truth decision has been made.

## Confidence

Confidence is high for the Head Office failure chain, current route inventory, change-request regression boundary, Daily Summary auth gap, and per-room `room_config` data source.

Confidence is medium for the room-configuration implementation shape because the allowed configuration catalogue and persistence model still need to be defined.

## Recommended Next Action

Joshua should decide the open Head Office cancellation and room-configuration questions, then approve sandbox fix testing with:

```text
APPROVED: phase_7_sandbox_fix_testing
```

After that token, the sandbox fix agent should write failing tests first, then implement the smallest direct-cancellation and HOD Daily Summary changes behind the existing Phase 7 stop conditions.
