# Solution Options And Risk Matrix

STATUS: scoping

## Purpose

Record candidate fix options, rejected alternatives, risks, and approval requirements. This file is not an implementation plan yet.

## Booking Authority Options

| Option | Summary | Current status | Risk |
| --- | --- | --- | --- |
| A | Head Office can cancel bookings directly and request admin deletion; HQ Reception and Housekeeping can request bookings and deletions; all other HOD departments cannot do either. | selected by Joshua on 2026-05-16 | Must separate cancellation from admin deletion requests and block every non-approved department server-side. |
| B | Shared delete handler with separate auth wrappers. | not selected for first policy fix | Extraction may be broader than needed. |
| C | Policy-based modal behaviour only. | reject | UI-only permission is not enough; HOD route has no inspected DELETE handler. |

## Daily Summary Options

| Option | Summary | Current status | Risk |
| --- | --- | --- | --- |
| A | Head Office-only HOD Daily Summary component and route. | viable | Duplication risk if logic is copied. |
| B | Shared summary builder and formatter with separate auth wrappers. | selected by Joshua on 2026-05-16 | Requires careful extraction but reduces drift. |
| C | Link Head Office to admin portal. | reject unless Joshua changes access policy | Could grant broader admin access than intended. |

## Room-Level Pax Options

| Option | Summary | Current status | Risk |
| --- | --- | --- | --- |
| A | Use existing per-room pax data from `booking_rooms.room_config`. | selected by Joshua on 2026-05-16 | Must handle legacy/null rows explicitly. |
| B | Capture per-room pax in booking room assignments. | supporting path only if existing data is absent | May require validation or schema/payload tightening. |
| C | Derive automatically. | reject for correctness | Unsafe for uneven room allocations; current split fallback is not authoritative. |

## Room Configuration Options

| Option | Summary | Current status | Risk |
| --- | --- | --- | --- |
| A | Per-room dropdown from room metadata. | selected by Joshua on 2026-05-16 | Requires verified source of truth beyond raw bed/capacity metadata. |
| B | Booking-level configuration only. | reject | Cannot support mixed-room bookings. |
| C | Free-text configuration. | rejected | Joshua requires constrained options. |

## WhatsApp Export Options

| Option | Summary | Current status | Risk |
| --- | --- | --- | --- |
| A | Shared rooming formatter. | selected by Joshua on 2026-05-16 | Best path if extraction is small and API returns room-level data. |
| B | Mirror admin formatter into HOD. | fallback only | Drift risk. |
| C | UI-only formatting. | reject | Export/copy paths can still drift and continue using booking-level pax. |

## Wave 1 Recommended Direction

The simplest safe direction appears to be:

1. Add/secure a HOD Head Office direct cancellation route.
2. Allow Head Office to request admin deletion separately from direct cancellation.
3. Preserve booking and deletion request behaviour for HQ Reception and Housekeeping only.
4. Block all other HOD departments from booking and deletion requests.
5. Extract or introduce small shared Daily Summary/WhatsApp data-shaping helpers only where it prevents drift.
6. Make Daily Summary room rows use `booking_rooms.room_config` where authoritative.
7. Add a constrained per-room configuration source of truth before exposing a dropdown.

## Wave 2 Runtime Diagnosis

Status: `FAIL` for Head Office delete and Daily Summary access; `CONCERNS` for room-level pax and WhatsApp readiness.

Confirmed runtime facts:

- Head Office can access the Rooms tab and create/manage bookings directly.
- Head Office UI says `Bookings confirmed immediately.` and exposes `+ New Booking`.
- Head Office booking modal still labels deletion as `Request Deletion`.
- Head Office delete still posts to `/api/accommodation/change-requests` and receives `403` because Head Office cannot submit change requests.
- HQ Reception, Housekeeping, and Main Gate previously passed the change-request policy guard and reached validation. Joshua's final policy decision now preserves request behaviour for HQ Reception and Housekeeping only; all other departments, including Main Gate, must be blocked unless separately re-approved.
- Head Office HOD Daily Summary route is absent at runtime (`404`).
- Admin Daily Summary remains admin-authenticated (`401` when unauthenticated).
- `booking_rooms.room_config` can store per-room pax, meal plan, and notes for equal, uneven, and tentative/multi-night Head Office-created bookings.
- No dedicated per-room room-configuration dropdown was visible in the Head Office booking modal.
- All Wave 2 marker bookings were cancelled during cleanup.

## Wave 2 Preferred Fix Shape

This is fix planning only, not implementation approval.

### 1. Head Office Delete

Preferred option: add a HOD-authenticated Head Office direct cancellation route, and separately allow Head Office to submit admin deletion requests.

Planning constraints:

- Server-side policy must explicitly allow Head Office direct cancellation.
- Server-side policy must allow deletion requests only for Head Office, HQ Reception, and Housekeeping.
- HQ Reception and Housekeeping must be able to request bookings and deletions.
- Main Gate and all other departments must be blocked from booking and deletion requests unless Joshua separately re-approves them.
- The UI must clearly separate Head Office direct cancellation from admin deletion request wording.
- The route must write activity/audit evidence.
- Tests must cover Head Office direct cancellation, Head Office admin deletion request, HQ Reception/Housekeeping request permissions, and all other departments blocked.

### 2. Head Office Daily Summary

Preferred option: add a HOD-authenticated Head Office Daily Summary route and UI entry point, backed by shared summary shaping.

Planning constraints:

- Do not grant broad admin access.
- Keep admin and HOD auth wrappers separate.
- Share the data builder or normalised row shape where small enough to avoid drift.
- Explicitly block non-Head Office HOD departments.

### 3. Room-Level Pax

Preferred option: make Daily Summary and WhatsApp consume per-room `booking_rooms.room_config` where present.

Planning constraints:

- Do not derive uneven allocations by splitting booking totals.
- Legacy/null `room_config` rows need explicit fallback wording or a conservative display rule.
- Tests must include equal 2+2, uneven 2+1, and legacy/null cases.

### 4. Room Configuration

Preferred option: define constrained per-room configuration from a real source of truth before exposing a dropdown.

Planning constraints:

- Existing `pax_config` proves bed/capacity capability but does not yet prove selectable stay-configuration labels.
- Do not add free text.
- Do not add booking-level-only configuration.
- If no current metadata can express options like Single/Double/Twin, define a minimal metadata addition in a separately approved implementation plan.

### 5. WhatsApp Rooming Export

Preferred option: create one shared formatter for admin and Head Office rooming output.

Planning constraints:

- Required title: `*DD MONTH YYYY - ZIWA ROOMING*`.
- One occupied-room line per occupied room.
- Include room, group/guest marker, per-room pax, room configuration, meal plan, stay night, status, and notes/no-notes wording.
- Formatter inputs should already be privacy-filtered and auth-scoped before formatting.

## Approval Needed Before Fix Work

No source edits, migrations, sandbox fix testing, deployments, commits, or production promotion are approved by this planning note.

Next required token for sandbox fix work:

```text
APPROVED: phase_7_sandbox_fix_testing
```

## Wave 3 Codebase Fix Investigation Synthesis

Status: `CONCERNS`; read-only source diagnosis completed before sandbox fix testing.

Required context:

`/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/04_phase_7_codebase_fix_investigation_context.md`

Key codebase findings:

- The HOD booking `[id]` route exposes `GET` and `PUT`, but no `DELETE`.
- Admin booking `DELETE` hard-deletes booking rows and is admin-authenticated; it should not be copied directly into the HOD portal as the first fix.
- Approved delete change requests use `review_booking_change_request_atomic` and set `bookings.status = 'cancelled'`; Head Office still needs direct cancellation/status transition, not hard delete.
- `existingBookingAction: 'manage'` is too broad by itself for direct cancellation because request-capable departments also manage through request/review workflows.
- Final direct-cancellation predicate should be explicit Head Office-only unless Joshua later expands direct cancellation.
- The HOD change-request policy must change from the earlier investigation assumption: Head Office can request admin deletion; HQ Reception and Housekeeping can request bookings and deletions; all other departments, including Main Gate, cannot.
- Admin Daily Summary should remain behind admin auth. Head Office needs a HOD-authenticated Head Office-gated route with a shared data builder where practical.
- Daily Summary must select `booking_rooms.room_config` and use it for per-room pax, room meal plan, and room notes where present.
- Legacy/null `room_config` rows must not be split or rounded into invented per-room pax.
- Current `pax_config` supports bed inventory and occupancy validation, but not constrained selectable stay configurations such as Single/Double/Twin.
- WhatsApp formatting should move to one shared pure formatter fed by normalised occupied-room rows so admin and HOD do not drift.

### Final Updated Option Status

| Area | Preferred first sandbox option | Rejected or deferred option | Reason |
| --- | --- | --- | --- |
| Head Office booking authority | Direct Head Office cancellation plus Head Office admin deletion request. | Admin-style hard delete from HOD or UI-only routing. | Joshua confirmed Head Office can cancel and can request admin deletion; hard delete remains admin-owned. |
| Cancellation policy | Use explicit Head Office-only direct cancellation. | `existingBookingAction: manage` alone. | Request-capable departments must not gain direct cancellation accidentally. |
| Request policy | Head Office, HQ Reception, and Housekeeping can request deletion; HQ Reception and Housekeeping can request bookings. | Main Gate or any other department request access. | Joshua's final policy says all others cannot do. |
| Daily Summary | HOD Head Office route plus shared builder. | Link Head Office to admin portal. | Avoids broad admin access. |
| Room-level pax | Use `booking_rooms.room_config` where present; mark legacy/null rows. | Divide booking totals across rooms. | Division invents uneven allocations and repeats Joshua's reported failure mode. |
| Room configuration | Implement constrained per-room configuration in the first sandbox fix. | Deferral, free text, or booking-level-only config. | Joshua confirmed configuration blocks the first fix; no current source of truth exists, so one must be added or defined. |
| WhatsApp | Shared pure formatter. | Copy/paste admin client formatter into HOD. | Prevents admin/HOD drift. |

### Tests Required Before Sandbox Fix Testing

- Shared accommodation policy matrix for Head Office, HQ Reception, Housekeeping, Main Gate, F&B, and another default-blocked department.
- HOD change-request POST contract proving Head Office can request admin deletion, HQ Reception and Housekeeping can request bookings/deletions, and all other departments are blocked.
- HOD booking direct-cancellation contract proving Head Office can cancel and unauthorised departments cannot.
- Regression coverage that HQ Reception and Housekeeping route deletion requests through `/api/accommodation/change-requests`, while Main Gate and all other departments are blocked.
- UI/API routing contract for `BookingManagerModal` Head Office wording and direct route target.
- HOD Daily Summary auth tests: unauthenticated `401`, non-Head Office `403`, Head Office `200`.
- Shared summary/formatter tests covering `booking_rooms.room_config`, equal 2+2, uneven 2+1, one-night, multi-night, status, notes/no-notes, and campsite/shared-capacity rows.

### Migration Assessment

No migration is required for the Head Office direct cancellation, HOD Daily Summary access, room-level pax from existing `booking_rooms.room_config`, and shared WhatsApp formatter parts of the first sandbox fix.

Because Joshua confirmed constrained per-stay room configuration is required in Phase 7, a migration or typed metadata change is likely. The minimal likely direction is an allowed-options source on `accommodation_units` plus a persisted selected configuration in `booking_rooms` or `room_config`, with server-side validation.

### Product Decisions Recorded 2026-05-16

- Head Office delete action is cancellation/status cancellation, not hard delete.
- Head Office can cancel bookings directly and request admin deletion.
- HQ Reception and Housekeeping can request bookings and deletions.
- All other HOD departments cannot request bookings or deletions.
- Cancellation activity logging should use a clear cancellation action rather than generic `updated`.
- CSV export is deferred unless Joshua later confirms spreadsheet output is required in the first fix.
- Constrained per-room room configuration blocks the first sandbox fix and must be implemented.

## Real-Dev Implementation Update

Status: `PASS` locally after Joshua provided:

```text
APPROVED: phase_7_implementation_dev
```

Implemented option status:

| Area | Real-dev status | Evidence |
| --- | --- | --- |
| Booking authority | Implemented with explicit Head Office-only direct cancellation and separate admin deletion request path. | `phase7-booking-authority-policy.test.ts` and `phase7-booking-authority-routes.test.mjs`. |
| Request policy | Implemented: Head Office, HQ Reception, and Housekeeping can request deletion; HQ Reception and Housekeeping can request bookings; Main Gate, F&B, and default departments are blocked. | Focused Phase 7 sweep passed `24/24`. |
| Daily Summary | Implemented HOD Head Office route with separate auth wrapper and shared Daily Summary data shape. | `phase7-daily-summary-contract.test.mjs`. |
| Room-level pax | Implemented using `booking_rooms.room_config`; legacy/null rows show `per-room pax not recorded`. | Daily Summary and WhatsApp focused tests. |
| Room configuration | Implemented typed JSON metadata path with constrained modal options and server validation. | `phase7-room-configuration-validation.test.ts` and `phase7-room-configuration-ui-contract.test.mjs`. |
| WhatsApp | Implemented pure shared formatter with one occupied-room line per row. | `phase7-rooming-whatsapp.test.ts`. |

Validation evidence:

- Focused Phase 7 sweep: `28/28` passing.
- Admin test script: `91/91` passing.
- Admin lint: exited `0` with 13 existing warnings.
- Portal lint: exited `0` with 4 existing warnings.
- Admin TypeScript: exited `0`.
- Portal TypeScript: exited `0`.

Current residual risks:

- Room-configuration option values are not yet approved per real unit; no shared database metadata was changed.
- Browser/dev-preview validation is still pending.
- Dev-preview writes remain blocked until `APPROVED: phase_7_dev_sandbox_writes` and a cleanup path are current.
- No production readiness claim is made from local source validation.

## Final Option Status And Migration Update

Status: `in-progress`; Stage 1 and Stage 2 completed, and Joshua approved Stage 3 sandbox fix testing on 2026-05-16.

Context file:

`/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/05_phase_7_final_investigation_and_sandbox_plan_context.md`

### Updated Risk Matrix

| Area | Final sandbox recommendation | Main risk | Mitigation |
| --- | --- | --- | --- |
| Head Office cancellation | Use a dedicated HOD cancel route or explicit PUT cancellation branch. | Reusing generic update semantics can hide cancellation and weaken tests. | Test Head Office-only guard, status transition, and cancellation-specific activity log. |
| Direct-cancel guard | Use explicit Head Office-only direct cancellation. | Policy drift if direct cancellation is inferred from broader manage permissions. | Lock the department matrix in tests and document any future policy change. |
| Request policy | Permit Head Office deletion requests and HQ Reception/Housekeeping booking and deletion requests; block everyone else. | Existing policy may still allow Main Gate or block Head Office deletion requests. | Update shared policy and route tests before implementation. |
| Daily Summary | Add HOD-authenticated Head Office route with separate auth from admin. | Accidentally granting broad admin access or duplicating admin logic. | Use `withAuth`, explicit `head-office` gate, and shared mapper/formatter only. |
| Room-level pax | Use `booking_rooms.room_config` when present. | Legacy/null rows may tempt invented per-room splits. | Add `pax_source` or equivalent and explicit legacy/null rendering. |
| Room configuration | Add explicit constrained metadata and server-side membership validation. | `pax_config.beds` is inventory, not a selectable stay-configuration catalogue. | Require approved unit option catalogue or fixture-backed JSON metadata before UI selection. |
| Migration | DDL is not unavoidable if JSON metadata is used; migration execution remains gated. | JSON-only is weaker for reporting and DB enforcement. | Decide JSON first-fix versus first-class column before real dev implementation. |
| WhatsApp | Shared pure formatter fed by normalised occupied-room rows. | Admin and HOD can drift if formatting remains client-local. | Export one shared formatter and test exact output. |

### Stage 3 Approval

Joshua approved sandbox source edits and failing-test creation on 2026-05-16:

```text
APPROVED: phase_7_sandbox_fix_testing
```

## Final Investigation And Sandbox Plan Update

Status: `in-progress`; Stage 1 and Stage 2 final planning are complete, and Stage 3 sandbox source edits are approved inside an isolated sandbox only.

Required context:

`/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/05_phase_7_final_investigation_and_sandbox_plan_context.md`

### Updated Option Status

| Area | Current recommended option | Rejected or deferred option | Reason |
| --- | --- | --- | --- |
| Head Office cancellation | Dedicated HOD Head Office direct-cancellation route, or a narrow `PUT` cancellation branch. | Admin hard delete or UI-only routing. | Joshua chose cancellation/status cancellation; direct route keeps semantics and logging clear. |
| Cancellation guard | Explicit Head Office-only direct-cancellation helper. | `existingBookingAction: 'manage'` alone. | Request-capable departments must not bypass admin review. |
| Request policy | Head Office can request admin deletion; HQ Reception and Housekeeping can request bookings and deletions. | Main Gate or any other department request access. | Joshua's final policy says all others cannot do. |
| Daily Summary | HOD-authenticated, Head Office-only route plus shared occupied-room row builder. | Link Head Office into admin portal. | Avoids broad admin access and reduces admin/HOD drift. |
| Room-level pax | Use `booking_rooms.room_config` where authoritative; mark legacy/null rows. | Split booking totals across rooms. | Splitting invents uneven allocations and repeats the known defect. |
| Room configuration | Controlled unit-level option metadata plus selected value per room. | Free text, booking-level-only config, or unapproved inference from bed inventory. | Joshua requires constrained per-room configuration in the first fix. |
| Room configuration persistence | Sandbox proof may use existing JSONB: allowed options in unit metadata and selected value in `booking_rooms.room_config`. | Immediate first-class column unless reporting/constraints require it. | Final migration agent found DDL is not unavoidable for sandbox proof. |
| WhatsApp | Shared pure formatter fed by normalised, privacy-filtered occupied-room rows. | Copy admin client formatter into HOD. | Prevents drift and allows unit tests without browser or clipboard access. |

### Migration Assessment Update

New DDL is not strictly unavoidable for sandbox proof. Existing JSONB surfaces can support a constrained first proof if the sandbox:

1. Defines explicit allowed options in unit metadata.
2. Adds a selected configuration field to `RoomBasketItem`.
3. Persists the selected value inside `booking_rooms.room_config`.
4. Validates selected values server-side against the unit's allowed option set.

A migration or data seed file may still be drafted for repeatable metadata setup, but no migration may be applied to any database without:

```text
APPROVED: phase_7_migration_execution
```

### Sandbox Approval Status

Sandbox fix testing is approved inside an isolated sandbox by:

```text
APPROVED: phase_7_sandbox_fix_testing
```

### Sandbox Result

Status: `PASS` for local sandbox testing.

Evidence:

- Sandbox branch/worktree: `phase-7-sandbox-fix-testing` at `/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing`.
- Focused Phase 7 tests: `15/15` passing.
- Admin test script: `55/55` passing.
- Admin and portal lint: pass, with unrelated existing warnings.
- Admin and portal TypeScript checks: pass.
- No migration drafted or applied.
- No dev-preview validation or data writes performed.

Recommended next gate before real dev implementation:

```text
APPROVED: phase_7_implementation_dev
```

## Real-Dev Implementation Planning Update

Status: `CONCERNS`; read-only implementation planning completed on 2026-05-16.

Context file:

`/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/06_phase_7_dev_implementation_plan_context.md`

### Updated Risk Matrix After Sandbox-To-Dev Comparison

| Area | Real-dev implementation recommendation | Main risk | Mitigation |
| --- | --- | --- | --- |
| Sandbox merge | Apply targeted patches from the sandbox approach. | Replacing whole files would remove real-dev behaviour not covered by sandbox tests. | Preserve portal change-request `GET`, shared-unit/campsite capacity logic, `InventoryGridConfig.unitOptions`, and `AccommodationUnit.max_concurrent_bookings`. |
| Booking authority | Use explicit helpers for direct cancellation, booking requests, and deletion requests. | Main Gate or default departments could retain old request authority. | Policy matrix test must cover Head Office, HQ Reception, Housekeeping, Main Gate, F&B, and an unknown department before source changes. |
| Head Office cancellation | Use guarded status cancellation with `hod_booking_cancelled` activity. | Generic update logic could hide cancellation semantics or allow non-Head Office direct cancellation. | Add route contract tests before implementation and keep direct cancellation Head Office-only. |
| Change requests | Split deletion requests from booking/amendment requests. | Sandbox removed the `GET` handler while the modal still reads request history. | Merge POST guard changes while retaining the real-dev `GET` handler. |
| Daily Summary | Add HOD-authenticated Head Office route and share rooming formatting. | Admin and HOD routes can drift if response shaping remains duplicated. | Select `booking_rooms.room_config` in both routes and add shared formatter/contract tests. |
| Room-level pax | Use per-room `room_config` where present. | Legacy/null rows can repeat booking-level totals per room. | Use an explicit legacy marker or booking-scope fallback; do not repeat total pax on every room. |
| Room configuration | Use JSONB metadata first: `pax_config.stay_configurations` and selected values in `room_config`. | Real room option values are still product-owned and not approved per unit. | Do not write shared metadata until Joshua approves the catalogue and gives migration/data execution approval. |
| Shared-unit/campsite rules | Preserve current real-dev overlap and capacity handling. | Sandbox guard changes were broader than Phase 7 and may regress shared capacity. | Port only room-configuration validation into the existing guard structure. |
| Test harness | Keep Phase 7 tests under admin-portal and run portal lint/typecheck. | Portal has no test script, so UI/API wiring can be under-tested. | Use contract tests, TypeScript, lint, and browser smoke checks after local green tests. |

### Updated Approval Position

Real-dev implementation is still blocked until:

```text
APPROVED: phase_7_implementation_dev
```

Applying unit room-configuration metadata to any shared database remains blocked until:

```text
APPROVED: phase_7_migration_execution
```

### Implementation Execution Prompt

The real-dev implementation execution prompt is now available at:

`/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/prompts/07_phase_7_dev_implementation_subagent_execution_prompt.md`

It instructs the implementation subagent to:

- Stop unless `APPROVED: phase_7_implementation_dev` is present.
- Use subagent-driven development only where it improves implementation or review quality.
- Follow TDD for every source change.
- Run spec-compliance and code-quality review loops after each task.
- Preserve the sandbox-to-dev safeguards in this risk matrix.
