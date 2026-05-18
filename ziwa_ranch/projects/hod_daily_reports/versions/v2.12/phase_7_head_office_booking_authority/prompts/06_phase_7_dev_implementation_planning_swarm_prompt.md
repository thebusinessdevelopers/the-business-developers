# Phase 7 Dev Implementation Planning Swarm Prompt

STATUS: scoping

## Role

You are the Phase 7 Dev Implementation Planning Orchestrator for HOD Daily Reports v2.12.

Your job is to use focused subagent swarms to convert the passed sandbox fix package into a decision-ready real-dev implementation plan.

You are not authorised to implement on the real dev branch, deploy, push, commit, touch production, run migrations, or mutate dev-preview data. This is a planning-only prompt unless Joshua separately gives the exact implementation approval token.

## Mission

Produce a real-dev implementation plan for the Phase 7 booking authority and rooming fixes that were locally sandbox-tested in:

```text
/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing
```

The implementation plan must cover:

1. Head Office direct booking cancellation.
2. Head Office admin deletion requests.
3. HQ Reception and Housekeeping booking and deletion requests.
4. Blocking all other HOD departments from booking and deletion requests, including Main Gate unless Joshua later re-approves it.
5. HOD-authenticated, Head Office-only Daily Summary access.
6. Room-level pax from `booking_rooms.room_config`.
7. Constrained per-room room configuration from room metadata.
8. Shared WhatsApp rooming formatter.
9. Test-first real-dev implementation sequence.
10. Migration and data-seeding decision points.
11. Dev-preview/browser validation plan and cleanup boundaries.

## Hard Limits

Do not:

- Implement source changes on the real dev branch.
- Copy sandbox source files into the real dev branch.
- Push, deploy, promote, or commit unless Joshua separately asks.
- Inspect, query, or mutate production.
- Log passwords, cookies, auth headers, localStorage tokens, session tokens, or unnecessary private guest data.
- Create, edit, delete, cancel, approve, or deny real bookings.
- Submit real change requests.
- Run database migrations against dev-preview, staging, or production.
- Run dev-preview writes unless Joshua gives a separate write approval and a cleanup path is documented.
- Proceed from planning to real dev implementation until Joshua gives:

```text
APPROVED: phase_7_implementation_dev
```

## Approval Gates

Real dev implementation:

```text
APPROVED: phase_7_implementation_dev
```

Migration execution:

```text
APPROVED: phase_7_migration_execution
```

Production:

```text
OVERRIDE: test_in_production
```

Dev-preview writes:

```text
APPROVED: phase_7_dev_sandbox_writes
```

If Joshua uses a different approval token, record the exact token in the decision log before proceeding.

## Product Decisions To Preserve

- Head Office can cancel bookings directly.
- Head Office can request admin deletion.
- HQ Reception and Housekeeping can request bookings and deletions.
- Main Gate, F&B, and all other HOD departments cannot request bookings or deletions unless Joshua separately re-approves them.
- Daily Summary uses option B: shared summary/formatter with separate auth wrappers.
- Room-level pax uses option A: existing per-room `booking_rooms.room_config`.
- Room configuration uses option A: per-room dropdown from constrained room metadata.
- WhatsApp uses option A: shared rooming formatter.
- Direct Head Office cancellation is status cancellation, not hard delete.
- Admin deletion remains an admin-reviewed request path.
- CSV export remains deferred unless Joshua later confirms spreadsheet output is required in this first fix.

## Known Sandbox Result To Preserve

Sandbox status: `PASS` for local testing.

Sandbox branch/worktree:

```text
branch: phase-7-sandbox-fix-testing
path: /Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing
```

Sandbox test evidence:

- Focused Phase 7 tests: `15/15` passing.
- Admin test script: `55/55` passing.
- Admin lint: pass with 13 unrelated warnings.
- Portal lint: pass with 4 unrelated warnings.
- Admin TypeScript: pass.
- Portal TypeScript: pass.
- No migration drafted or applied.
- No dev-preview validation or data writes performed.

Sandbox files changed:

```text
ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/config/accommodation.ts
ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/types/index.ts
ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/accommodation-guards.ts
ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/rooming-whatsapp.ts
ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/route.ts
ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/bookings/[id]/route.ts
ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/change-requests/route.ts
ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/daily-summary/route.ts
ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/BookingManagerModal.tsx
ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/accommodation/daily-summary/route.ts
ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/accommodation/DailySummary.tsx
```

Sandbox tests added:

```text
ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-booking-authority-policy.test.ts
ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-booking-authority-routes.test.mjs
ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-daily-summary-contract.test.mjs
ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-room-configuration-ui-contract.test.mjs
ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-room-configuration-validation.test.ts
ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-rooming-whatsapp.test.ts
```

## Required Context To Read First

Read these files before launching subagents:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/README.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/backlog.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/01_head_office_delete_authority.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/02_head_office_daily_summary_access.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/03_solution_options_and_risk_matrix.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/04_room_level_pax_accuracy.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/05_room_configuration_assignment.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/06_whatsapp_rooming_export_format.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/04_phase_7_codebase_fix_investigation_context.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/05_phase_7_final_investigation_and_sandbox_plan_context.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/tests/14_05_v2_12_phase_7_head_office_booking_authority.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/tests/15_05_v2_12_phase_7_sandbox_fix_testing.md
```

Then inspect the smallest relevant source/test files from both:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development
/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing/ziwa_ranch/projects/hod_daily_reports/4_development
```

Do not copy or apply code. Compare and plan only.

## Stage 1 - Planning Swarm

Status target: `STATUS: scoping`.

Launch focused read-only subagents. Each subagent must inspect the smallest relevant real-dev and sandbox surfaces, compare them, and return implementation-plan detail, not code changes.

### 1. Sandbox Diff Mapping Agent

Scope:

- Sandbox changed files and added tests.
- Real dev target files.
- Any dirty or untracked real workspace changes that could conflict.

Questions:

- Which sandbox changes are directly portable to real dev?
- Which sandbox changes depend on clean `dev` versus the current dirty real workspace?
- Which files need careful merge sequencing?
- Which generated or dependency files should not be copied?
- Are any sandbox changes too broad and need re-planning before real dev?

Return:

```text
status
files inspected
sandbox-to-dev file map
merge hazards
recommended implementation order
files not to copy
risks and open questions
confidence
```

### 2. Booking Authority Implementation Plan Agent

Scope:

- Shared accommodation policy helpers.
- HOD booking create route.
- HOD booking `[id]` route.
- HOD change-request route.
- Booking manager modal.
- Admin change-request review route and queue only where needed for request compatibility.

Questions:

- What exact tests should be written first on real dev?
- What exact policy helper names should be used?
- How should Head Office direct cancellation differ from Head Office admin deletion requests?
- How should HQ Reception and Housekeeping request bookings/deletions?
- How should Main Gate and all other departments be blocked?
- What activity-log action and payload should be required?
- What UI wording should appear for Head Office cancellation versus admin deletion request?

Return:

```text
status
files inspected
test-first plan
policy helper plan
route implementation plan
UI implementation plan
activity-log contract
risks and open questions
confidence
```

### 3. Daily Summary And WhatsApp Implementation Plan Agent

Scope:

- Admin Daily Summary API and component.
- New HOD Daily Summary route.
- Shared formatter module.
- Shared type imports/exports.
- Privacy filtering boundaries.

Questions:

- What exact shared formatter module should real dev add?
- What data shape should admin and HOD routes return?
- Should real dev extract a shared row builder now or keep the first implementation route-local?
- How should `booking_rooms.room_config` be selected and consumed?
- How should null/legacy `room_config` rows avoid invented per-room pax?
- What tests prove admin and HOD cannot drift?

Return:

```text
status
files inspected
formatter plan
Daily Summary route plan
normalised row plan
legacy/null handling plan
test-first plan
risks and open questions
confidence
```

### 4. Room Configuration Implementation Plan Agent

Scope:

- `AccommodationUnit`, `PaxConfig`, `RoomBasketItem`, and `BookingRoom` types.
- Accommodation unit metadata loading.
- Booking manager modal room basket.
- `validateAccommodationWrite`.
- Supabase migrations and seed/data options.

Questions:

- Is real-dev implementation best served by JSON metadata only, a migration, or a two-step path?
- What exact typed fields are needed?
- What exact validation should reject arbitrary configuration codes?
- What UI selector behaviour should be used for one-option, many-option, and no-option units?
- What product data is still missing from Joshua?
- What tests prove allowed options, rejected options, persistence, Daily Summary display, and WhatsApp display?

Return:

```text
status
files inspected
metadata plan
persistence plan
migration/data-seed assessment
UI plan
validation plan
test-first plan
risks and open questions
confidence
```

### 5. Test Harness And CI Plan Agent

Scope:

- `package.json` files.
- Existing admin tests.
- Existing portal tests or lack thereof.
- Lint and TypeScript commands.
- The sandbox commands and results.

Questions:

- What exact red-green command should each implementation slice use?
- Should real dev add a portal test script or keep focused tests under admin for shared/contract coverage?
- What is the minimum regression suite before declaring real-dev implementation complete?
- Which lint warnings are pre-existing and should not block this work?
- What dev-preview/browser checks are safe after local tests?

Return:

```text
status
files inspected
test inventory
red-green command plan
regression command plan
browser/dev-preview validation plan
risks and open questions
confidence
```

### 6. Migration And Data Safety Plan Agent

Scope:

- Supabase migrations.
- Existing `accommodation_units.pax_config` data.
- Booking room schema and JSON persistence.
- Dev-preview validation/cleanup docs.

Questions:

- Is migration execution avoidable for real dev implementation?
- If unit room-configuration options need real data, what is the smallest data-only or schema migration plan?
- Can implementation ship behind JSON metadata without DB migration?
- What rollback steps are required if a migration is chosen?
- What approval is needed before running any migration or data seed?
- What cleanup plan is required for dev-preview validation?

Return:

```text
status
files inspected
migration required yes/no
minimal migration/data option
no-migration implementation path
approval needed
rollback and cleanup plan
risks and open questions
confidence
```

## Stage 2 - Dev Implementation Plan

After all subagents return, write a complete planning document at:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/06_phase_7_dev_implementation_plan_context.md
```

The document must include:

1. Approval state and hard limits.
2. Executive synthesis.
3. Subagents launched and summaries.
4. Sandbox-to-dev file map.
5. Real-dev implementation architecture.
6. Task-by-task TDD implementation sequence.
7. Exact tests to add or update.
8. Exact commands to run after each slice.
9. Migration and data-seed decision.
10. Dev-preview/browser validation boundary.
11. Cleanup plan.
12. Rollback plan.
13. Documentation updates needed during implementation.
14. Open decisions for Joshua.
15. Stop conditions.
16. Confidence.
17. Whether real dev implementation can safely proceed after approval.

## Required Planning Granularity

The implementation plan must be executable by a separate coding agent with minimal rediscovery.

For each task, include:

- Exact file paths.
- Purpose of the change.
- Test-first step.
- Expected red failure.
- Minimal implementation step.
- Expected green command.
- Documentation update.
- Risks.

Do not include vague instructions such as:

- `TBD`
- `TODO`
- `add tests`
- `update as needed`
- `similar to sandbox`
- `copy sandbox changes`

Explain the intended change plainly and concretely.

## Stage 3 - Documentation Updates

After writing the dev implementation plan, update:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/README.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/03_solution_options_and_risk_matrix.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/tests/15_05_v2_12_phase_7_sandbox_fix_testing.md
```

If the planning swarm changes important understanding, update the relevant investigation:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/01_head_office_delete_authority.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/02_head_office_daily_summary_access.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/04_room_level_pax_accuracy.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/05_room_configuration_assignment.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/06_whatsapp_rooming_export_format.md
```

Keep Phase 7 status at `STATUS: scoping` unless Joshua explicitly changes it.

## Stop Conditions

Return `BLOCKED` and stop if:

- You need to implement source changes.
- You need `APPROVED: phase_7_implementation_dev` and it is missing.
- You need migration execution and `APPROVED: phase_7_migration_execution` is missing.
- You need dev-preview writes and no write approval or cleanup path exists.
- You need production access and `OVERRIDE: test_in_production` is missing.
- The current dirty real workspace creates merge ambiguity that cannot be resolved by planning.
- The sandbox worktree is unavailable.
- Room-configuration acceptance depends on product data Joshua has not approved.
- Any evidence would expose secrets, auth tokens, cookies, passwords, or unnecessary private guest data.

## Required Final Response

Return:

```text
status: PASS, CONCERNS, FAIL, or BLOCKED
stage completed
subagents launched
files inspected
files updated
implementation plan path
sandbox-to-dev recommendation
tests planned
commands planned
migration assessment
dev-preview validation plan
cleanup plan
rollback plan
open decisions for Joshua
approval needed before implementation
stop conditions
confidence
recommended next action
```

If planning completes successfully, recommend the exact next approval token before any real dev implementation:

```text
APPROVED: phase_7_implementation_dev
```
