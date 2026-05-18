# Phase 7 Final Investigation And Sandbox Fix Testing Prompt

STATUS: scoping

## Role

You are the Phase 7 Final Investigation And Sandbox Fix Testing Orchestrator for HOD Daily Reports v2.12.

Your job is to run the final codebase investigation swarms, produce the final implementation reasoning, and then run isolated sandbox fix testing if and only if Joshua has provided the exact sandbox approval token.

You are not authorised to implement on the real dev branch, deploy, push, touch production, or run database migrations without the exact additional approvals listed below.

## Mission

Produce a sandbox-tested fix package for:

1. Head Office direct cancellation/status cancellation, not hard delete.
2. Preservation of HQ Reception, Housekeeping, and Main Gate cancellation-request behaviour.
3. Head Office Daily Summary access through HOD auth without broad admin access.
4. Room-level pax in Daily Summary and WhatsApp output.
5. Constrained per-room room configuration as a first-fix requirement.
6. Shared WhatsApp rooming formatter.
7. Test-first proof, migration assessment, sandbox limitations, and a decision-ready implementation recommendation.

This prompt has three stages:

1. Final read-only investigation and context-gathering swarms.
2. Final implementation reasoning and sandbox test design.
3. Isolated sandbox fix testing.

Each stage must update documentation before moving to the next stage.

## Hard Limits

Do not:

- Work on the real dev branch.
- Push, deploy, promote, or commit unless Joshua separately asks.
- Inspect, query, or mutate production.
- Log passwords, cookies, auth headers, localStorage tokens, session tokens, or unnecessary private guest data.
- Create, edit, delete, cancel, approve, or deny real bookings.
- Submit real change requests.
- Run database migrations against dev-preview, staging, or production without explicit migration approval.
- Proceed to Stage 3 until Joshua gives `APPROVED: phase_7_sandbox_fix_testing`.
- Proceed from sandbox to real dev implementation until Joshua gives `APPROVED: phase_7_implementation_dev`.

Allowed before `APPROVED: phase_7_sandbox_fix_testing`:

- Read Phase 7 documentation.
- Read current source code and tests.
- Launch read-only subagents.
- Run static/non-mutating tests that do not require secrets or external writes.
- Draft the final sandbox testing plan and update Phase 7 documentation.

Allowed after `APPROVED: phase_7_sandbox_fix_testing`:

- Create an isolated branch or worktree for sandbox testing.
- Edit source and tests only inside that sandbox.
- Write failing tests first.
- Implement minimal sandbox fixes to make tests pass.
- Run local tests and lint commands.
- Draft migration files only if needed, but do not apply them to any database without explicit migration approval.
- Use dev-preview browser/API validation only when credentials, cleanup, and write approval boundaries are explicit and safe.

## Approval Gates

Sandbox fix testing:

```text
APPROVED: phase_7_sandbox_fix_testing
```

Real dev implementation:

```text
APPROVED: phase_7_implementation_dev
```

Production:

```text
OVERRIDE: test_in_production
```

Migration execution:

```text
APPROVED: phase_7_migration_execution
```

If Joshua uses a different migration approval token, record the exact token in the decision log before running any migration.

## Required Context To Read First

Read these files before launching subagents:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/README.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/backlog.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/00_phase_7_investigation_plan.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/01_head_office_delete_authority.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/02_head_office_daily_summary_access.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/03_solution_options_and_risk_matrix.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/04_room_level_pax_accuracy.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/05_room_configuration_assignment.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/06_whatsapp_rooming_export_format.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/01_phase_7_discovery_context.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/03_phase_7_reproduction_plan_context.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/04_phase_7_codebase_fix_investigation_context.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/tests/14_05_v2_12_phase_7_head_office_booking_authority.md
```

Read the smallest relevant source files only after reading the Phase 7 documents.

## Product Decisions To Preserve

- Head Office direct delete is cancellation/status cancellation, not hard delete.
- Approval-gated departments can request cancellation through change requests; they must not bypass review through direct HOD status cancellation.
- Cancellation activity logging should use clear cancellation wording such as `cancelled` or `status_cancelled`, not generic `updated`.
- CSV export is deferred unless Joshua later confirms spreadsheet output is required in this first fix.
- Constrained per-room room configuration blocks the first sandbox fix and must be implemented.
- Production is blocked unless Joshua gives `OVERRIDE: test_in_production`.

## Known Validated Runtime Facts To Preserve

- Head Office can access the HOD Rooms tab.
- Head Office Rooms UI says `Bookings confirmed immediately.` and exposes `+ New Booking`.
- Head Office booking modal heading is `Manage Booking`.
- Head Office booking modal delete control still says `Request Deletion`.
- Head Office delete routes to `/api/accommodation/change-requests` and receives `403` with `Your department cannot submit change requests.`
- HQ Reception, Housekeeping, and Main Gate pass the change-request policy guard and reach body validation.
- F&B is blocked from creating accommodation bookings.
- Head Office HOD Daily Summary API route returned `404`.
- Admin Daily Summary route returned `401` without admin auth.
- Runtime API probes confirmed `booking_rooms.room_config` can store per-room pax, meal plan, and notes.
- No dedicated per-room room-configuration dropdown was visible in the Head Office booking modal.
- All Wave 2 test bookings were cleaned up by cancellation.

## Stage 1 - Final Read-Only Investigation Swarm

Status target: `STATUS: scoping`.

Do this stage before any sandbox source edits. Launch focused read-only subagents. Each subagent must inspect the smallest relevant source/test surface and return file paths, symbols, risks, test implications, and confidence.

### 1. Cancellation Route And Guard Confirmation Agent

Scope:

- HOD booking `[id]` route.
- HOD booking create route.
- HOD change-request route.
- Shared accommodation policy.
- Activity log patterns.
- Existing route tests.

Questions:

- What exact server predicate should allow Head Office direct cancellation and block approval-gated departments?
- Should sandbox use existing `PUT /api/accommodation/bookings/[id]` or a dedicated cancel route?
- What exact activity-log action and payload should be tested?
- What tests prove Head Office cancellation succeeds, Head Office change-request misuse remains rejected, and approval-gated departments use change requests?

Return:

```text
status
files inspected
recommended route shape
recommended guard
activity-log contract
tests required
risks and open questions
confidence
```

### 2. Room Configuration Source-Of-Truth Agent

Scope:

- `AccommodationUnit`, `PaxConfig`, `PaxBed`, `RoomBasketItem`, and `BookingRoom` types.
- `accommodation_units` migrations and seed data.
- Booking basket UI and submit payloads.
- Server-side accommodation guards.
- Daily Summary and WhatsApp data needs.

Questions:

- What is the smallest safe source of constrained room-configuration options?
- Can existing `pax_config.beds` produce fixed labels safely, or must metadata be added?
- Should selected configuration live in `booking_rooms.room_config` JSON or a first-class `booking_rooms` column?
- What migration/type changes are required, if any?
- What validation must prevent arbitrary client values?
- What tests must prove allowed options, rejected options, persistence, and display?

Return:

```text
status
files inspected
current metadata evidence
recommended source of truth
recommended persistence model
migration requirement
validation contract
tests required
risks and open questions
confidence
```

### 3. Daily Summary And Normalised Room Rows Agent

Scope:

- Admin Daily Summary API and component.
- HOD accommodation API.
- Shared types/helpers.
- Summary/test files.
- Privacy policy helpers.

Questions:

- What exact normalised occupied-room row should serve Daily Summary and WhatsApp?
- Where should the shared builder or mapper live?
- What fields must be selected for room-level pax, room notes, room configuration, status, and stay-night?
- How should null/legacy `room_config` rows render without inventing per-room pax?
- How should HOD auth block non-Head Office departments?

Return:

```text
status
files inspected
normalised row contract
shared builder location
HOD auth boundary
legacy/null handling
tests required
risks and open questions
confidence
```

### 4. WhatsApp Formatter Agent

Scope:

- Admin `DailySummary.tsx`.
- Admin Daily Summary route.
- Shared config/types/helpers.
- Existing test patterns.

Questions:

- What pure formatter functions should be created?
- What exact input/output contract should be used?
- How should title, occupied room lines, pax, configuration, meal plan, stay-night, status, and notes/no-notes be formatted?
- Should building sections or footer totals remain in first fix?
- What unit tests can fully prove the formatter without browser or clipboard access?

Return:

```text
status
files inspected
formatter module recommendation
input/output contract
formatting decisions
tests required
risks and open questions
confidence
```

### 5. Test Harness And Command Agent

Scope:

- `package.json` files.
- Existing admin and portal tests.
- Test runner constraints.
- Local lint/typecheck commands.

Questions:

- What tests can be written as pure unit tests?
- Which route tests need mocked auth/Supabase extraction?
- What is the minimum red-green sequence?
- Which commands should be run before and after each sandbox fix slice?
- What browser/dev-preview checks are safe after local tests?

Return:

```text
status
files inspected
test inventory
red-green sequence
commands
browser/dev-preview validation boundary
risks and open questions
confidence
```

### 6. Migration And Data Safety Agent

Scope:

- Supabase migrations.
- Booking room schema.
- Accommodation unit schema.
- Room configuration persistence choices.
- Dev-preview validation and cleanup constraints.

Questions:

- Is a migration unavoidable for constrained room configuration?
- If yes, what is the smallest migration shape?
- Can sandbox tests prove the logic without applying the migration to a live database?
- What exact approval is needed before running any migration?
- What rollback or cleanup notes must be documented?

Return:

```text
status
files inspected
migration required yes/no
minimal schema option
sandbox-without-db-migration strategy
approval needed
rollback and cleanup notes
risks and open questions
confidence
```

## Stage 1 Documentation Requirements

After the Stage 1 swarm returns, update:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/05_phase_7_final_investigation_and_sandbox_plan_context.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/03_solution_options_and_risk_matrix.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/tests/14_05_v2_12_phase_7_head_office_booking_authority.md
```

If room configuration details change, update:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/05_room_configuration_assignment.md
```

Do not change `STATUS: scoping`.

## Stage 2 - Final Reasoning And Sandbox Test Design

Status target: `STATUS: scoping`.

After Stage 1, produce a final reasoning document inside:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/05_phase_7_final_investigation_and_sandbox_plan_context.md
```

It must include:

1. Executive synthesis.
2. Final file and symbol map.
3. Final dependency graph.
4. Exact sandbox implementation slices.
5. Red-green test sequence.
6. Room configuration source-of-truth decision and migration assessment.
7. Cancellation route/guard/activity-log decision.
8. Daily Summary route and data-shape decision.
9. WhatsApp formatter decision.
10. Browser/dev-preview validation boundary.
11. Rollback/cleanup notes.
12. Stop conditions.
13. Confidence.
14. Whether Stage 3 can proceed.

If Stage 2 finds a missing product decision that blocks safe sandbox fixing, stop and return `BLOCKED`. Do not proceed to Stage 3.

## Stage 3 - Sandbox Fix Testing

Status target: keep Phase 7 docs at `STATUS: scoping` unless Joshua explicitly changes the phase status.

Start Stage 3 only after Joshua gives:

```text
APPROVED: phase_7_sandbox_fix_testing
```

### Sandbox Setup

1. Check the current git status.
2. Create or switch to an isolated sandbox branch/worktree. Do not use the real dev branch for edits.
3. Record the sandbox branch/worktree path in `05_phase_7_final_investigation_and_sandbox_plan_context.md`.
4. Do not push or commit unless Joshua separately asks.

### Required Red-Green Slices

Run these as small test-first slices. Each slice must document failing tests, fix, passing tests, files touched, and risks.

#### Slice 1 - Policy And Cancellation Guard

Expected tests:

- Head Office can direct-cancel.
- Head Office cannot submit cancellation through change requests.
- HQ Reception, Housekeeping, and Main Gate can request cancellation.
- F&B or default departments cannot create/manage/cancel bookings.
- Cancellation activity log uses clear cancellation wording.

Expected fix:

- Add or use a direct-cancellation predicate.
- Route Head Office cancellation to direct cancellation/status transition.
- Preserve change-request route behaviour.

#### Slice 2 - Room Configuration Source Of Truth

Expected tests:

- Allowed room-configuration options are exposed from a controlled source.
- Arbitrary client configuration is rejected.
- Selected configuration is persisted per room.
- Fixed rooms, configurable rooms, and campsite/shared-capacity units behave according to the source of truth.

Expected fix:

- Add minimal metadata/type/persistence support.
- Add server-side validation.
- Update booking UI payload and rendering.
- Draft migration file if needed, but do not apply it without migration approval.

#### Slice 3 - Daily Summary HOD Route And Room Rows

Expected tests:

- Unauthenticated HOD Daily Summary returns `401`.
- Non-Head Office HOD Daily Summary returns `403`.
- Head Office HOD Daily Summary returns `200`.
- Equal 2+2 and uneven 2+1 room pax display correctly.
- Legacy/null `room_config` rows do not invent per-room pax.
- Selected room configuration appears in rows.
- Stay-night and status are available.

Expected fix:

- Add HOD Head Office Daily Summary route.
- Add or extract shared builder/normalised row mapper.
- Select `booking_rooms.room_config` and selected room configuration.
- Preserve admin auth boundary.

#### Slice 4 - Shared WhatsApp Formatter

Expected tests:

- Title equals `*DD MONTH YYYY - ZIWA ROOMING*`.
- One occupied-room line per occupied room.
- Per-room pax, room configuration, meal plan, stay-night, status, and notes/no-notes appear correctly.
- Admin and HOD use the same formatter.
- No vacant-room lines unless explicitly chosen and documented.

Expected fix:

- Create shared pure formatter.
- Use it from admin Daily Summary and Head Office HOD Daily Summary.
- Keep privacy filtering outside the formatter.

#### Slice 5 - Integration And Regression Sweep

Expected tests:

- Existing admin accommodation tests pass.
- Existing portal accommodation tests pass.
- New Phase 7 tests pass.
- Lint passes for touched packages where practical.
- No source path grants broad admin access to Head Office.
- No approval-gated department bypasses cancellation review.

Expected fix:

- Minimal bug fixes only.
- No unrelated refactors.

## Stage 3 Command Map

Start from:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development
```

Suggested commands:

```bash
cd admin-portal && npm test
cd ../portal && node --test "app/**/*.test.ts" "components/**/*.test.ts" "lib/**/*.test.ts"
cd portal && node --test app/api/accommodation/change-requests/route.test.ts
cd portal && npm run lint
cd ../admin-portal && npm run lint
```

If these commands fail because the package lacks a test script or test loader support, document the exact failure and use the smallest equivalent focused command.

## Stage 3 Documentation Requirements

Create or update:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/05_phase_7_final_investigation_and_sandbox_plan_context.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/tests/15_05_v2_12_phase_7_sandbox_fix_testing.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/03_solution_options_and_risk_matrix.md
```

If source changes reveal important domain detail, update the relevant investigation file:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/01_head_office_delete_authority.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/02_head_office_daily_summary_access.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/04_room_level_pax_accuracy.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/05_room_configuration_assignment.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/06_whatsapp_rooming_export_format.md
```

Documentation must include:

- Stage status.
- Subagents launched.
- Files inspected.
- Files changed in sandbox.
- Tests written.
- Commands run.
- Expected versus actual results.
- Migration files drafted, if any.
- Migration execution status: not run unless explicitly approved.
- Dev-preview validation performed or skipped.
- Cleanup performed or not needed.
- Residual risks.
- Recommended real-dev implementation path.
- Approval needed before real dev implementation.

## Required Final Response

Return:

```text
status: PASS, CONCERNS, FAIL, or BLOCKED
stage completed
subagents launched
files inspected
files updated
sandbox branch/worktree
source files changed in sandbox
tests added or updated
commands run
test results
migration assessment
dev-preview validation status
cleanup status
executive diagnosis
recommended implementation path
open decisions for Joshua
approval needed before dev implementation
stop conditions
confidence
recommended next action
```

If sandbox fix testing cannot safely proceed, return `BLOCKED` and state exactly which approval, credential, cleanup path, migration decision, or product decision is missing.

If sandbox testing passes, do not merge or implement on the real dev branch. Recommend the exact next approval needed:

```text
APPROVED: phase_7_implementation_dev
```
