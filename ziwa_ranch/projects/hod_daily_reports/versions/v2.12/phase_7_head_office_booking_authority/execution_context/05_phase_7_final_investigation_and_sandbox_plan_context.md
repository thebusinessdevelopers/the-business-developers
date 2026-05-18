# Phase 7 Final Investigation And Sandbox Plan Context

STATUS: scoping

## Objective

Record the final read-only investigation swarm, final implementation reasoning, sandbox test design, migration assessment, and approval boundary for Phase 7 Head Office booking authority.

This file records Joshua's approval for isolated sandbox fix testing. It does not approve real dev implementation, migrations, dev-preview writes, deployment, production testing, commits, or pushes.

## Approval Boundary

Approved now:

- Read Phase 7 documentation.
- Read current source and tests.
- Launch read-only investigation agents.
- Update Phase 7 documentation.
- Run static/non-mutating tests only if needed.
- Create an isolated sandbox branch/worktree.
- Write failing tests first and make minimal source/test edits inside that sandbox.

Blocked now:

- Real dev implementation.
- Database migrations.
- Dev-preview writes without a safe cleanup path and relevant approval.
- Production inspection or mutation.
- Deploys, pushes, commits, or promotion.

Sandbox source testing approval received on 2026-05-16:

```text
APPROVED: phase_7_sandbox_fix_testing
```

## Stage Status

| Stage | Status | Notes |
| --- | --- | --- |
| Stage 1 - Final read-only investigation swarm | complete - CONCERNS | Six read-only agents inspected route, policy, room configuration, summary rows, WhatsApp, test harness, and migration safety. |
| Stage 2 - Final reasoning and sandbox test design | complete - CONCERNS | Sandbox plan is decision-ready, but source edits remain gated. |
| Stage 3 - Sandbox fix testing | approved - setup in progress | Joshua provided `APPROVED: phase_7_sandbox_fix_testing`; edits must stay inside the isolated sandbox. |

## Sandbox Worktree

| Field | Value |
| --- | --- |
| Branch | `phase-7-sandbox-fix-testing` |
| Path | `/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing` |
| Created | 2026-05-16 |
| Source edits allowed | Yes, inside this sandbox only. |
| Commits/pushes | Not approved. |

## Subagents Launched

| Agent | Status | Main finding |
| --- | --- | --- |
| Cancellation Route And Guard Confirmation Agent | complete | Prefer a dedicated HOD cancel route or explicit PUT cancellation branch; guard direct cancellation with manage plus no change-request authority; log a clear cancellation action. |
| Room Configuration Source-Of-Truth Agent | complete | `pax_config.beds` is bed inventory, not selectable stay-configuration options; add explicit constrained metadata and validate server-side. |
| Daily Summary And Normalised Room Rows Agent | complete | Add a Head Office-only HOD Daily Summary route and shared normalised occupied-room rows using `booking_rooms.room_config`. |
| WhatsApp Formatter Agent | complete | Create one pure shared formatter fed by already privacy-filtered occupied-room rows; omit vacant lines in first fix unless explicitly chosen. |
| Test Harness And Command Agent | complete | Admin has `npm test`; portal lacks a test script and needs explicit `node:test` invocation or test runner wiring in sandbox. |
| Migration And Data Safety Agent | complete | DDL is not unavoidable if options and selected values stay in existing JSONB, but applying any migration requires `APPROVED: phase_7_migration_execution`. |

## Files Inspected

Phase 7 documents:

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/README.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/backlog.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/00_phase_7_investigation_plan.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/01_head_office_delete_authority.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/02_head_office_daily_summary_access.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/03_solution_options_and_risk_matrix.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/04_room_level_pax_accuracy.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/05_room_configuration_assignment.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/06_whatsapp_rooming_export_format.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/01_phase_7_discovery_context.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/03_phase_7_reproduction_plan_context.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/04_phase_7_codebase_fix_investigation_context.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/tests/14_05_v2_12_phase_7_head_office_booking_authority.md`

Key source/test surfaces inspected by agents:

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/bookings/[id]/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/bookings/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/change-requests/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/BookingManagerModal.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/RoomsTab.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/accommodation/daily-summary/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/accommodation/DailySummary.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/config/accommodation.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/accommodation-guards.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/types/index.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/023_accommodation.sql`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/025_room_pax_config.sql`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/028_room_basket_config.sql`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/032_atomic_booking_room_updates.sql`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/change-requests/route.test.ts`

## Executive Synthesis

Phase 7 sandbox fix testing is approved and must run in an isolated sandbox.

The updated booking authority policy is: Head Office can cancel bookings directly and can request admin deletion; HQ Reception and Housekeeping can request bookings and deletions; all other HOD departments cannot request bookings or deletions. Direct cancellation should remain explicit Head Office-only.

Daily Summary should be exposed through a HOD-authenticated Head Office-only route. It should not link Head Office into admin auth. The data contract should be one normalised occupied-room row per occupied room/night, fed by `booking_rooms.room_config` when present.

Room-level pax can already exist in `booking_rooms.room_config`. Daily Summary and WhatsApp must consume it instead of repeating booking-level totals on every room. Legacy/null room rows must be labelled or handled conservatively, not split into invented room pax.

Room configuration remains the highest product-data uncertainty. Current `pax_config.beds` proves physical bed inventory and occupancy caps, not a guest-facing list of stay-configuration options. The smallest safe first fix is explicit constrained metadata plus server-side validation; this can be proven in sandbox without applying a live migration if fixtures/mocks carry the target JSON shape.

## Final Dependency Graph

```text
Booking-authority policy
  -> HOD cancel route or PUT cancellation branch
  -> Head Office deletion request path
  -> HQ Reception / Housekeeping request paths
  -> all-other-departments blocked path
  -> Head Office modal wording and route targets
  -> cancellation activity log contract
  -> policy and route regression tests

Constrained room-configuration metadata
  -> server-side membership validation
  -> booking UI options and payload
  -> selected configuration in room_config or column
  -> Daily Summary and WhatsApp display

Normalised occupied-room row builder
  -> admin Daily Summary rows
  -> HOD Head Office Daily Summary rows
  -> shared WhatsApp formatter
  -> legacy/null room_config display rule

Test runner command map
  -> failing tests first
  -> minimal sandbox fix slices
  -> local regression and lint
  -> optional dev-preview validation only with safe approval and cleanup
```

## Exact Sandbox Implementation Slices

### Slice 1 - Policy And Cancellation Guard

Recommended route shape:

- Prefer `POST /api/accommodation/bookings/[id]/cancel` for a narrow cancellation contract.
- Reusing `PUT /api/accommodation/bookings/[id]` is acceptable only if cancellation is an explicit early branch with narrow validation and a cancellation-specific activity log.

Recommended direct-cancellation guard:

```text
departmentSlug === 'head-office'
```

This reflects Joshua's final policy decision for direct cancellation.

Recommended request policy:

- Head Office can request admin deletion.
- HQ Reception and Housekeeping can request bookings and deletions.
- Main Gate and all other HOD departments cannot request bookings or deletions unless Joshua separately re-approves them.

Activity log contract:

- Action: `hod_booking_cancelled` or `status_cancelled`.
- Details: previous status, new status `cancelled`, department slug, and optional reason.
- Avoid generic `updated` for direct cancellation.

### Slice 2 - Room Configuration Source Of Truth

Recommended source of truth:

- Explicit allowed stay-configuration metadata per `accommodation_units` row, either as JSONB metadata or a normalised option table.
- Do not derive flexible guest-facing options from `pax_config.beds` unless Joshua approves that mapping.
- Do not allow free text.

Recommended persistence:

- Minimal sandbox path: add a typed selected configuration field to `RoomBasketItem` and persist it inside `booking_rooms.room_config`.
- Stronger reporting path: add a first-class `booking_rooms` column later if reporting, SQL constraints, or analytics require it.

Validation:

- Resolve the selected unit's allowed option set server-side.
- Reject absent, arbitrary, or tampered configuration codes.
- Require a selection when a unit has non-empty allowed options, unless product explicitly defines a default option.

### Slice 3 - Daily Summary HOD Route And Room Rows

Recommended HOD route:

- Add `portal/app/api/accommodation/daily-summary/route.ts`.
- Wrap with `withAuth`.
- Return `401` for no HOD session.
- Return `403` for authenticated HOD departments other than `head-office`.
- Return `200` for Head Office.

Normalised occupied-room row:

- Unit identifiers, display name, building, category, capacity, and sort order.
- Booking id, check-in, check-out, status, privacy-filtered guest/group label.
- Room adults, children, meal plan, notes, and selected room configuration from `booking_rooms.room_config` where present.
- `pax_source` or equivalent marker: `room_config`, `booking_aggregate`, or `unspecified`.
- Stay-night fields derived from summary date, check-in, and check-out.

Legacy/null handling:

- Do not divide booking totals across room lines.
- Prefer explicit `per-room pax not recorded`, `See booking`, or a single booking-level total once, depending on final UI choice.

### Slice 4 - Shared WhatsApp Formatter

Recommended module:

- `packages/shared/lib/rooming-whatsapp.ts`, exported through the shared package.

Formatter contract:

- Accept already-normalised, privacy-safe occupied-room rows.
- Return a plain text WhatsApp body.
- Title: `*DD MONTH YYYY - ZIWA ROOMING*`.
- One line per occupied room only.
- Include room, guest/group label, per-room pax, room configuration, meal plan, stay-night, status, and notes/no-notes.

Do not place auth, privacy rules, Supabase calls, browser clipboard access, or data fetching in the formatter.

### Slice 5 - Integration And Regression Sweep

Run the narrow tests for each slice first, then the broader local command set. No browser/dev-preview validation should run until local tests pass and the environment, credentials, and cleanup boundary are explicit.

## Red-Green Test Sequence

1. Add failing policy matrix tests for Head Office, HQ Reception, Housekeeping, Main Gate, F&B, and another default-blocked department.
2. Add failing direct-cancellation route/helper tests.
3. Add failing request-policy tests proving Head Office can request admin deletion, HQ Reception/Housekeeping can request bookings and deletions, and all other departments are blocked.
4. Add failing room-configuration validation tests for allowed and rejected options.
5. Add failing persistence/normalisation tests for room-level pax, meal plan, notes, selected configuration, and legacy/null rows.
6. Add failing HOD Daily Summary auth tests: `401`, `403`, `200`.
7. Add failing WhatsApp formatter tests for title, occupied lines, equal and uneven pax, meal plan, stay-night, status, notes/no-notes, and shared-capacity rows.
8. Implement the smallest passing changes slice by slice.
9. Run focused tests after each slice and full local regression before any browser/dev-preview check.

## Command Map

From:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development
```

Recommended commands after Stage 3 approval:

```bash
cd admin-portal && npm test && npm run lint
cd ../portal && npm run lint
```

Portal test runner note:

- `portal` currently lacks a `test` script.
- Use an explicit `node:test` command only after confirming TypeScript loading support in the sandbox, for example with `tsx` or Node strip-types support.
- If Stage 3 adds `tsx` or a portal test script, document the package change and keep it scoped.

Optional type checks if practical:

```bash
cd admin-portal && npx tsc --noEmit
cd ../portal && npx tsc --noEmit
```

## Migration Assessment

No migration is required for:

- Head Office direct cancellation.
- HOD Head Office Daily Summary route.
- Room-level pax from existing `booking_rooms.room_config`.
- Shared WhatsApp formatter.

Constrained room configuration does require a controlled source of truth. A DDL migration is not strictly unavoidable if allowed options and selected values are stored in existing JSONB structures, but product-quality implementation still needs explicit metadata and type changes.

Smallest no-DDL sandbox option:

- Extend `accommodation_units.pax_config` or equivalent unit JSON metadata with allowed stay-configuration options in fixtures.
- Extend `RoomBasketItem` with a selected configuration code/label.
- Persist selected configuration inside `booking_rooms.room_config`.
- Validate membership server-side.

Stronger schema option:

- Add unit-level allowed options and a first-class selected configuration field, with documented rollback.

Migration execution remains blocked unless Joshua gives:

```text
APPROVED: phase_7_migration_execution
```

## Browser And Dev-Preview Validation Boundary

Allowed after local sandbox tests only if the relevant approvals and cleanup path are explicit:

- Localhost browser checks for Head Office cancellation wording and route target.
- Localhost Daily Summary and WhatsApp formatting checks with test-safe fixtures.
- Dev-preview API/browser validation only for test-owned data, approved accounts, redacted evidence, and documented cleanup.

Still blocked:

- Production checks without `OVERRIDE: test_in_production`.
- Real booking mutation.
- Full successful change-request submission unless an admin cleanup path is approved.
- Migration execution without `APPROVED: phase_7_migration_execution`.

## Rollback And Cleanup Notes

Sandbox source changes can be discarded with the isolated branch/worktree.

JSON-only room-configuration persistence may leave extra JSON keys in test rows if dev-preview writes are later approved. Document whether to leave, strip, or cancel all test-owned rows.

DDL migrations need explicit rollback steps before execution approval. Do not apply draft migrations to dev-preview, staging, or production during Stage 3 without migration approval.

## Stop Conditions

Stop and return `BLOCKED` if:

- `APPROVED: phase_7_sandbox_fix_testing` is missing and source edits would be required.
- A migration must be applied before `APPROVED: phase_7_migration_execution`.
- Room configuration acceptance depends on a product catalogue that Joshua has not approved.
- Any test would mutate dev-preview data without a cleanup route.
- Any action would inspect or mutate production without `OVERRIDE: test_in_production`.
- Any evidence would expose passwords, cookies, auth headers, localStorage tokens, session tokens, or unnecessary private guest data.

## Whether Stage 3 Can Proceed

Stage 3 can proceed inside an isolated sandbox only.

Approval received:

```text
APPROVED: phase_7_sandbox_fix_testing
```

## Open Decisions For Joshua

1. Should Head Office direct cancellation use a dedicated `cancel` route or an explicit cancellation branch in the existing `PUT` route?
2. What controlled room-configuration options should exist for each room?
3. Should selected room configuration remain inside `booking_rooms.room_config` for first fix, or become a first-class `booking_rooms` column?
4. Should legacy/null `room_config` rows display `per-room pax not recorded`, `See booking`, or one booking-level total?
5. Should WhatsApp status use raw slugs such as `tentative`, or friendly labels?

## Confidence

High confidence:

- Head Office failure chain.
- Need to preserve change-request behaviour for approval-gated departments.
- HOD Daily Summary auth boundary.
- Need to select and use `booking_rooms.room_config`.
- Shared formatter direction.

Medium confidence:

- Exact room-configuration metadata shape.
- JSON-only versus first-class column persistence.
- Final legacy/null display wording.

## Recommended Next Action

Proceed with isolated sandbox setup, failing tests first, and minimal implementation slices.

Recorded Stage 3 approval token:

```text
APPROVED: phase_7_sandbox_fix_testing
```

## Stage 3 Sandbox Fix Testing Results

Status: `PASS` for local sandbox testing, with residual product/data risks.

Sandbox branch/worktree:

```text
branch: phase-7-sandbox-fix-testing
path: /Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing
```

Source files changed in sandbox:

- `/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/config/accommodation.ts`
- `/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/types/index.ts`
- `/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/accommodation-guards.ts`
- `/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/rooming-whatsapp.ts`
- `/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/route.ts`
- `/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/bookings/[id]/route.ts`
- `/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/change-requests/route.ts`
- `/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/daily-summary/route.ts`
- `/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/BookingManagerModal.tsx`
- `/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/accommodation/daily-summary/route.ts`
- `/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/accommodation/DailySummary.tsx`

Tests added in sandbox:

- `admin-portal/__tests__/phase7-booking-authority-policy.test.ts`
- `admin-portal/__tests__/phase7-booking-authority-routes.test.mjs`
- `admin-portal/__tests__/phase7-daily-summary-contract.test.mjs`
- `admin-portal/__tests__/phase7-room-configuration-ui-contract.test.mjs`
- `admin-portal/__tests__/phase7-room-configuration-validation.test.ts`
- `admin-portal/__tests__/phase7-rooming-whatsapp.test.ts`

Commands run:

```bash
npm install
node --test "__tests__/phase7-booking-authority-routes.test.mjs" "__tests__/phase7-daily-summary-contract.test.mjs" "__tests__/phase7-room-configuration-ui-contract.test.mjs"
node --import tsx --test "__tests__/phase7-booking-authority-policy.test.ts" "__tests__/phase7-rooming-whatsapp.test.ts" "__tests__/phase7-room-configuration-validation.test.ts"
npm test
npm run lint
npx tsc --noEmit
```

Results:

- Focused Phase 7 tests: `15/15` passing.
- Admin test script: `55/55` passing.
- Admin lint: exit `0`, with 13 existing warnings.
- Portal lint: exit `0`, with 4 existing warnings.
- Admin TypeScript: pass.
- Portal TypeScript: pass.
- IDE diagnostics for touched files: no linter errors.

Migration files drafted: none.

Migration execution status: not run. Still requires:

```text
APPROVED: phase_7_migration_execution
```

Dev-preview validation: skipped. Local sandbox tests only.

Cleanup: no dev-preview data was created or mutated, so no cleanup was needed.

Residual risks:

- Room configuration metadata is now typed and validated, but real unit option data still needs Joshua-approved values before real dev rollout.
- Daily Summary HOD route is locally source-tested, not browser/dev-preview validated.
- Admin and portal lint still report unrelated pre-existing warnings.

Recommended implementation path:

1. Review the sandbox diff.
2. Confirm room-configuration option values per unit.
3. Approve real dev implementation if the sandbox approach is acceptable.

Required token before real dev implementation:

```text
APPROVED: phase_7_implementation_dev
```
