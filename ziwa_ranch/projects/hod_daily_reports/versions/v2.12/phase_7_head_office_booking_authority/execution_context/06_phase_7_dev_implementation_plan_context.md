# Phase 7 Dev Implementation Plan Context

STATUS: scoping

## Objective

Produce a real-dev implementation plan for Phase 7 Head Office booking authority, Daily Summary access, room-level pax, constrained room configuration, and shared WhatsApp rooming output.

This document is planning-only. It does not approve source edits, migrations, dev-preview writes, deployment, production access, commits, or pushes.

## Approval State And Hard Limits

Approved evidence already recorded:

```text
APPROVED: phase_7_discovery_scope
APPROVED: phase_7_dev_sandbox_writes
APPROVED: phase_7_sandbox_fix_testing
```

Required before real-dev implementation:

```text
APPROVED: phase_7_implementation_dev
```

Required before applying any database migration, data seed, or shared database metadata update:

```text
APPROVED: phase_7_migration_execution
```

Required before any new dev-preview writes:

```text
APPROVED: phase_7_dev_sandbox_writes
```

Required before any production inspection or mutation:

```text
OVERRIDE: test_in_production
```

Hard limits for the implementation agent:

- Do not replace real-dev files wholesale with sandbox files.
- Do not remove unrelated real-dev changes or dirty workspace work.
- Do not run migrations or data seeds without the migration token.
- Do not create, edit, cancel, approve, deny, or delete real bookings.
- Do not log passwords, cookies, auth headers, localStorage tokens, session tokens, or unnecessary private guest data.
- Keep Phase 7 status at `STATUS: scoping` until Joshua explicitly changes it.

## Executive Synthesis

The sandbox proves a viable local route, but the sandbox diff is not a blind merge candidate. Real dev must receive targeted patches that preserve existing behaviours not covered by the sandbox, especially the portal change-request `GET` handler, current shared-unit/campsite capacity rules, existing shared types, and unrelated in-flight real-dev edits.

The real-dev implementation can proceed after the exact implementation approval token. The safest implementation order is policy helpers first, then tests, route behaviour, room-configuration validation, Daily Summary and WhatsApp sharing, UI wiring, and finally local regression plus gated browser/dev-preview validation.

No schema migration is required for cancellation, Head Office Daily Summary access, room-level pax from `booking_rooms.room_config`, or the shared WhatsApp formatter. Constrained room configuration can use existing JSONB fields for the first implementation, but real unit option values still require Joshua-approved product data and a separately approved data update if they are written into a shared database.

## Subagents Launched And Summaries

| Agent | Status | Summary |
| --- | --- | --- |
| Sandbox Diff Mapping Agent | complete | Most sandbox edits are portable as patches, but real dev must preserve the portal change-request `GET`, `InventoryGridConfig.unitOptions`, `AccommodationUnit.max_concurrent_bookings`, and shared-unit capacity logic. New files are `packages/shared/lib/rooming-whatsapp.ts` and `portal/app/api/accommodation/daily-summary/route.ts`. |
| Booking Authority Implementation Plan Agent | complete | Use explicit helpers `canDirectlyCancelAccommodationBooking`, `canRequestAccommodationBooking`, and `canRequestAccommodationDeletion`. Head Office direct cancellation is a guarded status transition; Head Office admin deletion remains a change request; HQ Reception and Housekeeping keep request access; Main Gate and all other departments are blocked. |
| Daily Summary And WhatsApp Implementation Plan Agent | complete | Add a shared `@hod/shared/lib/rooming-whatsapp` formatter and align admin/HOD Daily Summary JSON around `booking_rooms.room_config`. The sandbox still risks repeating booking totals for legacy/null rows, so real dev must define an explicit legacy display rule. |
| Room Configuration Implementation Plan Agent | complete | Use unit-scoped `pax_config.stay_configurations` metadata and selected `room_configuration_code` / `room_configuration_label` inside `booking_rooms.room_config`. Keep JSONB for the first implementation, validate server-side, and do not infer options from bed inventory. |
| Test Harness And CI Plan Agent | complete | Real dev has admin test support via `node --import tsx --test`; portal has lint and TypeScript but no test script. Add Phase 7 tests under `admin-portal/__tests__` without removing existing tests. Run admin tests, admin/portal lint, and admin/portal TypeScript before completion. |
| Migration And Data Safety Plan Agent | complete | Schema DDL is avoidable because `accommodation_units.pax_config` and `booking_rooms.room_config` already exist as JSONB. Any real metadata update still requires `APPROVED: phase_7_migration_execution`, snapshots, rollback, and cleanup documentation. |

## Files Inspected

Phase 7 documents:

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/README.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/backlog.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/01_head_office_delete_authority.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/02_head_office_daily_summary_access.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/03_solution_options_and_risk_matrix.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/04_room_level_pax_accuracy.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/05_room_configuration_assignment.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/06_whatsapp_rooming_export_format.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/04_phase_7_codebase_fix_investigation_context.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/05_phase_7_final_investigation_and_sandbox_plan_context.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/tests/14_05_v2_12_phase_7_head_office_booking_authority.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/tests/15_05_v2_12_phase_7_sandbox_fix_testing.md`

Real-dev and sandbox source surfaces:

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/config/accommodation.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/types/index.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/accommodation-guards.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/bookings/[id]/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/change-requests/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/BookingManagerModal.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/accommodation/change-requests/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/accommodation/daily-summary/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/accommodation/DailySummary.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/023_accommodation.sql`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/025_room_pax_config.sql`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/028_room_basket_config.sql`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/032_atomic_booking_room_updates.sql`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/033_atomic_change_request_review.sql`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/039_booking_activities_and_atomic_rpc.sql`

Sandbox-only Phase 7 test surfaces inspected:

- `/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-booking-authority-policy.test.ts`
- `/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-booking-authority-routes.test.mjs`
- `/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-daily-summary-contract.test.mjs`
- `/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-room-configuration-ui-contract.test.mjs`
- `/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-room-configuration-validation.test.ts`
- `/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-rooming-whatsapp.test.ts`

## Sandbox-To-Dev File Map

| Real-dev file | Implementation action | Important merge note |
| --- | --- | --- |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/config/accommodation.ts` | Add explicit Phase 7 policy sets and helper exports. | Preserve unrelated capability fields and ensure Main Gate, F&B, and default departments are blocked from booking/deletion requests. |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/types/index.ts` | Add `StayConfigurationOption`, `PaxConfig.stay_configurations`, `RoomBasketItem.room_configuration_code`, and `RoomBasketItem.room_configuration_label`. | Preserve `InventoryGridConfig.unitOptions` and `AccommodationUnit.max_concurrent_bookings`. |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/accommodation-guards.ts` | Add stay-configuration validation inside the existing validation structure. | Preserve shared-unit, campsite, overlap, and `max_concurrent_bookings` behaviour from real dev. |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/rooming-whatsapp.ts` | Create a new pure shared formatter. | Keep auth, privacy policy, fetching, and clipboard access outside the formatter. |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/route.ts` | Include `pax_config` in unit data required by the booking modal. | Do not expose secrets or broaden auth. |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/bookings/[id]/route.ts` | Add guarded Head Office direct cancellation branch. | Cancellation is status transition only, with `hod_booking_cancelled` activity. |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/change-requests/route.ts` | Split booking-request and deletion-request authorisation. | Retain real-dev `GET` handler; sandbox removed it while the modal still calls it. |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/daily-summary/route.ts` | Create a HOD-authenticated, Head Office-only route. | Return `401` unauthenticated, `403` non-Head Office, `200` Head Office. |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/BookingManagerModal.tsx` | Add Head Office cancellation, admin deletion request wording, and constrained per-room selector. | Ensure blocked departments do not gain hidden manager actions. |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/accommodation/daily-summary/route.ts` | Select `booking_rooms.room_config` and align response shape. | Preserve campsite/shared-capacity rendering needs. |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/accommodation/DailySummary.tsx` | Use shared WhatsApp formatter and room-level data. | Fix table display so legacy/null rows do not repeat booking totals per room. |

## Real-Dev Implementation Architecture

### Booking Authority

Shared policy should expose:

- `canDirectlyCancelAccommodationBooking(departmentSlug)`: true only for `head-office`.
- `canRequestAccommodationBooking(departmentSlug)`: true for `hq-reception` and `housekeeping`.
- `canRequestAccommodationDeletion(departmentSlug)`: true for `head-office`, `hq-reception`, and `housekeeping`.

Head Office direct cancellation should be handled as an explicit guarded branch in the HOD booking `[id]` route. The branch updates `bookings.status` to `cancelled`, logs `hod_booking_cancelled`, and avoids hard deletion.

Admin deletion requests remain change requests with `requested_changes.action === 'delete'`. Head Office, HQ Reception, and Housekeeping can submit those deletion requests. Main Gate, F&B, and all other departments receive `403`.

### Daily Summary And WhatsApp

Admin and HOD Daily Summary should stay under separate auth wrappers:

- Admin route: `withAdminAuth` and existing admin accommodation permissions.
- HOD route: `withAuth` and explicit `department_slug === 'head-office'`.

Both routes should select `booking_rooms.room_config` and return a compatible shape. The WhatsApp formatter should be pure and shared from `@hod/shared/lib/rooming-whatsapp`.

Legacy/null `room_config` rows must not repeat booking-level totals on every room. The implementation should use an explicit marker such as `paxKnown: false` or a row label such as `per-room pax not recorded`.

### Room Configuration

Use existing JSONB surfaces for the first implementation:

- Unit option catalogue: `accommodation_units.pax_config.stay_configurations`.
- Per-room selection: `booking_rooms.room_config.room_configuration_code` and `booking_rooms.room_config.room_configuration_label`.

Server validation must reject arbitrary configuration codes when a unit has configured options. For units with no options, the implementation should reject submitted configuration codes or clear stale values before persistence.

Do not infer stay-configuration options from bed inventory. `pax_config.beds` describes physical inventory and capacity, not approved guest-facing option labels.

## Task-By-Task TDD Implementation Sequence

### Task 1 - Establish The Real-Dev Merge Baseline

**Files:**

- Inspect: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development`
- Inspect: `/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing/ziwa_ranch/projects/hod_daily_reports/4_development`

**Purpose:** Capture current real-dev conflicts before touching source, because the repo already contains unrelated dirty/untracked work.

**Test-first step:** Run the current real-dev baseline commands before implementation starts:

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && npm test
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && npm run lint
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal && npm run lint
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && npx tsc --noEmit
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal && npx tsc --noEmit
```

**Expected red failure:** Existing tests may pass; existing lint warnings may appear. Record the warning count and affected files so Phase 7 does not claim pre-existing warnings as new.

**Minimal implementation step:** None. This is an evidence checkpoint.

**Expected green command:** Same commands complete with no new failures compared with the baseline.

**Documentation update:** Add a dated implementation-start note to the active development log when implementation is approved.

**Risks:** Baseline commands may fail for unrelated reasons. If they do, record the failure and decide whether Phase 7 can proceed without masking it.

### Task 2 - Add Booking Authority Policy Tests

**Files:**

- Create: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-booking-authority-policy.test.ts`
- Modify after red: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/config/accommodation.ts`

**Purpose:** Lock Joshua's final booking-authority policy in a small shared-policy test.

**Test-first step:** Create tests asserting:

- Head Office can directly cancel and can request deletion, but does not request booking creation through the approval path.
- HQ Reception and Housekeeping can request bookings and deletions but cannot directly cancel.
- Main Gate, F&B, and an unknown department cannot create bookings, request bookings, request deletion, submit change requests, or directly cancel.

**Expected red failure:**

```text
canDirectlyCancelAccommodationBooking is not exported
canRequestAccommodationBooking is not exported
canRequestAccommodationDeletion is not exported
```

or policy assertions fail for Main Gate.

**Minimal implementation step:** Add the three helper exports and private department sets in `packages/shared/config/accommodation.ts`. Adjust Main Gate, F&B, and default capability results to match the final policy.

**Expected green command:**

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && node --import tsx --test __tests__/phase7-booking-authority-policy.test.ts
```

**Documentation update:** Record the implemented helper names in the development log.

**Risks:** `canSubmitChangeRequest` and the new request helpers can drift. Prefer making existing request semantics delegate to the new helper logic where that keeps behaviour clear.

### Task 3 - Add Booking Authority Route And UI Contract Tests

**Files:**

- Create: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-booking-authority-routes.test.mjs`
- Modify after red: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/bookings/[id]/route.ts`
- Modify after red: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/change-requests/route.ts`
- Modify after red: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/BookingManagerModal.tsx`

**Purpose:** Prove the implementation uses direct cancellation for Head Office and request review for admin deletion.

**Test-first step:** Contract checks should assert:

- `bookings/[id]/route.ts` imports or references `canDirectlyCancelAccommodationBooking`.
- Cancellation uses `status === 'cancelled'` and logs `hod_booking_cancelled`.
- `change-requests/route.ts` distinguishes deletion requests using `requested_changes.action === 'delete'`.
- `change-requests/route.ts` references both `canRequestAccommodationDeletion` and `canRequestAccommodationBooking`.
- `BookingManagerModal.tsx` contains `Cancel Booking` and `Request Admin Deletion`.

**Expected red failure:** Current real dev lacks the new helpers, direct cancellation branch, cancellation log action, and UI wording.

**Minimal implementation step:** Add a guarded cancellation branch to `bookings/[id]/route.ts`; split the `POST` authorisation in `change-requests/route.ts`; preserve the existing `GET` handler in `change-requests/route.ts`; update `BookingManagerModal.tsx` wording and endpoint selection.

**Expected green command:**

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && node --test __tests__/phase7-booking-authority-routes.test.mjs
```

**Documentation update:** Record that direct cancellation is status cancellation, not hard delete.

**Risks:** The sandbox removed the change-request `GET`; real dev must keep it because the modal still reads change-request history by booking id.

### Task 4 - Add Room Configuration Type And Validation Tests

**Files:**

- Create: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-room-configuration-validation.test.ts`
- Modify after red: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/types/index.ts`
- Modify after red: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/accommodation-guards.ts`

**Purpose:** Ensure arbitrary per-room configuration codes cannot be submitted.

**Test-first step:** Use mocked unit metadata to prove:

- A room with `pax_config.stay_configurations` accepts a configured code.
- A room with configured options rejects an unknown code.
- A room with configured options rejects a missing code if the product path requires selection.
- A room with no configured options rejects or clears submitted configuration codes according to the final implementation rule.

**Expected red failure:** `StayConfigurationOption`, `PaxConfig.stay_configurations`, and `RoomBasketItem.room_configuration_code` are missing or unused by validation.

**Minimal implementation step:** Add the typed fields and validate submitted room configuration codes against the selected unit's option list inside the existing guard structure. Preserve existing shared-unit, campsite, overlap, and `max_concurrent_bookings` logic.

**Expected green command:**

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && node --import tsx --test __tests__/phase7-room-configuration-validation.test.ts
```

**Documentation update:** Record that JSONB is the implementation path and migration execution remains gated.

**Risks:** If the implementation trusts client-supplied labels, labels can drift from the approved catalogue. Prefer deriving `room_configuration_label` server-side from the approved code where practical.

### Task 5 - Add HOD Accommodation Metadata And UI Contract Tests

**Files:**

- Create: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-room-configuration-ui-contract.test.mjs`
- Modify after red: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/route.ts`
- Modify after red: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/BookingManagerModal.tsx`

**Purpose:** Ensure the HOD booking modal receives constrained room metadata and writes selected configuration fields.

**Test-first step:** Contract checks should assert:

- `portal/app/api/accommodation/route.ts` selects `pax_config`.
- `BookingManagerModal.tsx` reads `stay_configurations`.
- The modal writes `room_configuration_code` and `room_configuration_label`.
- The modal does not expose a free-text configuration field.

**Expected red failure:** Current real dev omits `pax_config` in the relevant HOD unit data path and lacks room-configuration UI fields.

**Minimal implementation step:** Include `pax_config` in the HOD accommodation data needed by the modal. Add a constrained selector per selected room: many options render selectable options, one option auto-selects or displays a single fixed value, no options hides the control and clears stale selection fields.

**Expected green command:**

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && node --test __tests__/phase7-room-configuration-ui-contract.test.mjs
```

**Documentation update:** Record the UI behaviour for one-option, many-option, and no-option rooms.

**Risks:** Real room option data is still product-owned. Do not invent values for rooms that Joshua has not approved.

### Task 6 - Add Shared WhatsApp Formatter Tests

**Files:**

- Create: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-rooming-whatsapp.test.ts`
- Create after red: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/rooming-whatsapp.ts`

**Purpose:** Create one pure formatter for admin and Head Office rooming output.

**Test-first step:** Test:

- Title `*DD MONTH YYYY - ZIWA ROOMING*`.
- One occupied-room line per row.
- Equal and uneven pax lines.
- Room configuration label.
- Meal plan.
- Current/total stay night.
- Status.
- Literal `no notes` when notes are blank.

**Expected red failure:** `@hod/shared/lib/rooming-whatsapp` cannot be imported.

**Minimal implementation step:** Create `packages/shared/lib/rooming-whatsapp.ts` with pure formatting helpers and exported row/input types. Keep auth, privacy filtering, Supabase access, and clipboard writing out of the module.

**Expected green command:**

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && node --import tsx --test __tests__/phase7-rooming-whatsapp.test.ts
```

**Documentation update:** Record the final WhatsApp line format in the development log.

**Risks:** Legacy/null pax wording is product-visible. Pick the conservative wording once and keep tests aligned to it.

### Task 7 - Add Daily Summary Contract Tests

**Files:**

- Create: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-daily-summary-contract.test.mjs`
- Modify after red: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/accommodation/daily-summary/route.ts`
- Modify after red: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/accommodation/DailySummary.tsx`
- Create after red: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/daily-summary/route.ts`

**Purpose:** Align admin and HOD Daily Summary data around room-level JSON and shared formatter use.

**Test-first step:** Contract checks should assert:

- Admin route selects `booking_rooms` with `room_config`.
- Portal route exists and uses HOD auth with a Head Office gate.
- Portal route returns `401` unauthenticated, `403` for non-Head Office, and `200` for Head Office in the handler contract or source-level guard.
- `DailySummary.tsx` imports the shared formatter.
- Old title `*ZIWA RANCH` is absent from WhatsApp generation.

**Expected red failure:** Real dev has no portal Daily Summary route, admin Daily Summary omits `room_config`, and admin UI builds WhatsApp text locally.

**Minimal implementation step:** Add the HOD route, include `room_config` in admin and HOD selects, use the shared formatter from the admin UI, and make the table display room-level pax or an explicit legacy marker.

**Expected green command:**

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && node --test __tests__/phase7-daily-summary-contract.test.mjs
```

**Documentation update:** Record that CSV remains deferred.

**Risks:** Sandbox simplified some campsite/shared-capacity assumptions. Preserve real-dev shared-capacity display rules unless Joshua explicitly changes them.

### Task 8 - Run Phase 7 Focused Tests

**Files:**

- Test: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-booking-authority-policy.test.ts`
- Test: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-booking-authority-routes.test.mjs`
- Test: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-daily-summary-contract.test.mjs`
- Test: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-room-configuration-ui-contract.test.mjs`
- Test: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-room-configuration-validation.test.ts`
- Test: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-rooming-whatsapp.test.ts`

**Purpose:** Confirm all Phase 7 contracts pass together.

**Test-first step:** Run the focused suite:

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && node --import tsx --test __tests__/phase7-*.test.ts __tests__/phase7-*.test.mjs
```

**Expected red failure:** Any remaining route, UI, formatter, or validation mismatch fails in its specific Phase 7 file.

**Minimal implementation step:** Fix only the failing Phase 7 behaviour; do not refactor unrelated accommodation surfaces.

**Expected green command:** Same focused suite passes.

**Documentation update:** Add the focused-suite result to the active development log.

**Risks:** Shell glob expansion can skip unmatched patterns depending on shell. If needed, run the exact file list from this task.

### Task 9 - Run Local Regression

**Files:**

- Test root: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal`
- Test root: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal`

**Purpose:** Confirm Phase 7 did not break existing admin, portal, TypeScript, or lint contracts.

**Test-first step:** Run:

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && npm test
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && npm run lint
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal && npm run lint
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && npx tsc --noEmit
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal && npx tsc --noEmit
```

**Expected red failure:** Any true Phase 7 regression appears as a failed test, lint error, or type error. Existing lint warnings may remain if they match the baseline.

**Minimal implementation step:** Fix Phase 7-caused failures in the smallest touched area.

**Expected green command:** All commands exit successfully. Record existing warnings separately from new warnings.

**Documentation update:** Add exact command results to the active development log and Phase 7 testing report.

**Risks:** The portal has no package test script, so portal behavioural coverage remains partly source-contract and browser-validation based.

### Task 10 - Browser And Dev-Preview Validation Planning

**Files:**

- Document: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/tests/15_05_v2_12_phase_7_sandbox_fix_testing.md`
- Document: active implementation development log under `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/09_project_development/`

**Purpose:** Define safe post-local validation without accidental shared data mutation.

**Test-first step:** After local green tests, run read-only browser smoke checks first:

- Head Office Rooms tab loads.
- Head Office booking modal shows `Cancel Booking` and `Request Admin Deletion`.
- Admin Daily Summary loads.
- WhatsApp copy source text uses the new title and room lines.

**Expected red failure:** A page fails to load, shows the old wording, or throws a new console/runtime error.

**Minimal implementation step:** Fix local UI/runtime issues. Do not submit writes until Joshua confirms the write token and cleanup path.

**Expected green command:** Browser smoke evidence is recorded with secrets redacted.

**Documentation update:** If dev-preview writes are approved, record marker, cleanup plan, cleanup result, and follow-up read evidence.

**Risks:** Submitting a booking, cancellation, deletion request, or metadata change mutates shared state and is blocked until the relevant write approval is current and cleanup is documented.

## Exact Tests To Create Or Update

Create these tests under:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/
```

- `phase7-booking-authority-policy.test.ts`
- `phase7-booking-authority-routes.test.mjs`
- `phase7-daily-summary-contract.test.mjs`
- `phase7-room-configuration-ui-contract.test.mjs`
- `phase7-room-configuration-validation.test.ts`
- `phase7-rooming-whatsapp.test.ts`

Keep all existing real-dev admin tests in place. The sandbox worktree had a smaller test inventory than real dev, so Phase 7 implementation must add the Phase 7 files without removing existing tests.

## Exact Commands To Run

Focused red-green commands:

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && node --import tsx --test __tests__/phase7-booking-authority-policy.test.ts
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && node --test __tests__/phase7-booking-authority-routes.test.mjs
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && node --import tsx --test __tests__/phase7-room-configuration-validation.test.ts
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && node --test __tests__/phase7-room-configuration-ui-contract.test.mjs
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && node --import tsx --test __tests__/phase7-rooming-whatsapp.test.ts
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && node --test __tests__/phase7-daily-summary-contract.test.mjs
```

Focused Phase 7 sweep:

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && node --import tsx --test __tests__/phase7-*.test.ts __tests__/phase7-*.test.mjs
```

Regression commands:

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && npm test
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && npm run lint
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal && npm run lint
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && npx tsc --noEmit
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal && npx tsc --noEmit
```

## Migration And Data-Seed Decision

Schema migration is not required for the first real-dev implementation path if JSONB metadata is accepted:

- `accommodation_units.pax_config` already exists.
- `booking_rooms.room_config` already exists.
- Atomic save paths can persist JSON room basket fields.

A real product data update is still required before constrained room configuration is operational against live unit data. Joshua must approve the per-unit option catalogue, then approve migration/data execution before the catalogue is written into any shared database.

Minimum approved data shape:

```json
{
  "stay_configurations": [
    { "code": "single", "label": "Single" },
    { "code": "double", "label": "Double" }
  ]
}
```

Do not use these example values as production data without Joshua's per-unit approval.

## Dev-Preview And Browser Validation Boundary

Allowed after local tests pass:

- Localhost browser smoke checks.
- Read-only dev-preview navigation.
- Network and console observation with secrets redacted.

Blocked until the write token and cleanup path are current:

- Creating bookings.
- Cancelling bookings.
- Submitting deletion or booking requests.
- Editing unit metadata.
- Running data seeds.
- Applying migrations.

If writes are approved, validation must use test-owned markers, approved accounts, and a documented cleanup plan before the first write.

## Cleanup Plan

Local-only source implementation requires no data cleanup.

If dev-preview writes are later approved:

1. Use a unique Phase 7 marker in every test-owned booking or request.
2. Record created booking/request ids by suffix only where possible.
3. Cancel or revert every created booking/request using approved cleanup endpoints.
4. Restore any changed unit metadata from a pre-change snapshot.
5. Record cleanup status and a follow-up read showing the expected post-cleanup state.

If a data migration is later approved:

1. Snapshot `accommodation_units.id` and full `pax_config` for every touched unit.
2. Apply only the approved option catalogue.
3. Verify exact touched rows.
4. Roll back by restoring the full pre-change JSON if validation fails.

## Rollback Plan

Source rollback:

- Revert Phase 7 implementation commits or manually back out the touched source/test files.
- Remove the new HOD Daily Summary route and shared formatter only if rollback requires returning to the pre-Phase 7 state.
- Restore prior policy helpers if Phase 7 rollout is abandoned.

Data rollback:

- Restore `accommodation_units.pax_config` snapshots for touched rows.
- Remove or restore `booking_rooms.room_config.room_configuration_code` and `room_configuration_label` on test-owned rows only.
- Never remove real guest booking history without a separately approved production data rollback plan.

## Documentation Updates Needed During Implementation

When real-dev implementation starts after approval, update:

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/README.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/03_solution_options_and_risk_matrix.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/tests/15_05_v2_12_phase_7_sandbox_fix_testing.md`
- Active development log under `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/09_project_development/`

Record approvals, command evidence, lint warning baselines, migration decisions, dev-preview markers, and cleanup results.

## Open Decisions For Joshua

1. Approve real-dev implementation with the exact token `APPROVED: phase_7_implementation_dev` if this plan is acceptable.
2. Approve the controlled room-configuration option catalogue per unit before shared database metadata is changed.
3. Decide whether legacy/null `room_config` rows display `per-room pax not recorded`, `See booking`, or one booking-level total at booking scope.
4. Decide whether status labels in WhatsApp should use raw slugs such as `tentative` or friendly labels.
5. Decide whether Head Office needs CSV export in a later phase; it remains deferred from this first implementation plan.

## Stop Conditions

Return `BLOCKED` if:

- Real-dev implementation is requested without `APPROVED: phase_7_implementation_dev`.
- Any migration or data seed must run without `APPROVED: phase_7_migration_execution`.
- Any dev-preview write lacks current write approval or a cleanup path.
- Product acceptance depends on room-configuration values Joshua has not approved.
- A sandbox file would overwrite unrelated real-dev changes.
- The implementation would remove the portal change-request `GET` handler without a replacement.
- The implementation would remove shared-unit/campsite capacity logic without explicit product approval.
- Any action would inspect or mutate production without `OVERRIDE: test_in_production`.
- Any evidence would expose secrets or unnecessary private guest data.

## Confidence

High confidence:

- Head Office failure chain and direct cancellation shape.
- Need to preserve Head Office admin deletion request separately from direct cancellation.
- Need to block Main Gate, F&B, and all other non-approved HOD departments from booking/deletion requests.
- HOD Head Office Daily Summary route and separate auth boundary.
- Shared WhatsApp formatter direction.
- JSONB-first implementation path for selected room configuration.

Medium confidence:

- Exact legacy/null `room_config` display wording.
- Whether JSON-only room configuration remains sufficient long term after reporting needs are revisited.
- Whether all current real-dev dirty workspace changes are unrelated; implementation must inspect them before editing shared files.

## Whether Real Dev Implementation Can Safely Proceed After Approval

Yes, with concerns.

Implementation can proceed after:

```text
APPROVED: phase_7_implementation_dev
```

The implementation agent must treat the sandbox as tested guidance, not as a replacement source tree. The merge must be patch-based, preserve real-dev handlers and shared-unit logic, write tests first, and stop before any migration or dev-preview write unless the relevant approval token is present.

## Recommended Next Action

Joshua should review this plan and, if acceptable, approve real-dev implementation with:

```text
APPROVED: phase_7_implementation_dev
```
