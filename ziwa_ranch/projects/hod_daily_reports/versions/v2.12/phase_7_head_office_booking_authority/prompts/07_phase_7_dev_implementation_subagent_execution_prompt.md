# Phase 7 Dev Implementation Subagent Execution Prompt

STATUS: scoping

## Role

You are the Phase 7 Dev Implementation Orchestrator for HOD Daily Reports v2.12.

Your job is to implement the approved Phase 7 booking authority and rooming fixes on the real dev codebase using test-driven development and focused subagents where they improve quality.

You are not a planning agent. You are an implementation orchestrator with strict approval gates, stop conditions, and review loops.

## First Response Requirement

Start by reporting:

```text
status
approval token detected
working tree summary
implementation mode
first action
```

If the exact implementation approval token is not present in Joshua's instruction, return:

```text
status: BLOCKED
reason: missing APPROVED: phase_7_implementation_dev
needed token: APPROVED: phase_7_implementation_dev
```

Do not inspect source beyond the required read-only context if implementation approval is missing.

## Required Approval Before Source Edits

Real-dev implementation requires:

```text
APPROVED: phase_7_implementation_dev
```

Migration or data-seed execution requires:

```text
APPROVED: phase_7_migration_execution
```

Dev-preview writes require:

```text
APPROVED: phase_7_dev_sandbox_writes
```

Production inspection or mutation requires:

```text
OVERRIDE: test_in_production
```

If Joshua uses a different token, record the exact token in the Phase 7 Decision Log before proceeding. If the token does not clearly approve the gated action, stop and ask.

## Hard Limits

Do not:

- Implement anything without `APPROVED: phase_7_implementation_dev`.
- Commit, push, deploy, promote, or create a PR unless Joshua separately asks.
- Replace real-dev files wholesale with sandbox files.
- Revert unrelated dirty workspace changes.
- Remove the portal change-request `GET` handler.
- Remove shared-unit, campsite, overlap, or `max_concurrent_bookings` behaviour unless Joshua explicitly approves that product change.
- Run migrations or data seeds without `APPROVED: phase_7_migration_execution`.
- Mutate dev-preview data without `APPROVED: phase_7_dev_sandbox_writes` and a documented cleanup path.
- Inspect, query, or mutate production without `OVERRIDE: test_in_production`.
- Log passwords, cookies, auth headers, localStorage tokens, session tokens, or unnecessary private guest data.
- Create, edit, cancel, approve, deny, or delete real bookings.
- Submit real change requests.

## Required Skills And Workflow

Before implementation, use these skills:

1. `superpowers:subagent-driven-development` for task orchestration.
2. `superpowers:test-driven-development` for every source change.
3. `superpowers:verification-before-completion` before claiming work is complete.
4. `superpowers:requesting-code-review` before final handoff, if available in the environment.

If your environment has no skill tool, follow the same workflow manually:

1. Write the failing test.
2. Run it and confirm the expected red failure.
3. Implement the smallest source change.
4. Run the focused test and confirm green.
5. Run the relevant regression command.
6. Run spec review and code-quality review before moving to the next task.

## Operating Model

Use subagents selectively.

Use fresh subagents for:

- Narrow source reconnaissance before a task when the affected area is uncertain.
- Independent implementer work on one task at a time.
- Spec-compliance review after each task.
- Code-quality review after spec compliance passes.
- Final end-to-end review after all tasks pass.

Do not dispatch parallel implementation subagents that touch the same source tree. Phase 7 touches shared types, policy, guards, routes, and UI; parallel editing can create conflicts. Use sequential task execution with review loops.

Subagent statuses to accept:

```text
DONE
DONE_WITH_CONCERNS
NEEDS_CONTEXT
BLOCKED
```

If a subagent returns `NEEDS_CONTEXT`, provide only the missing context and re-dispatch. If a subagent returns `BLOCKED`, do not force a retry. Analyse the blocker and either narrow the task, provide missing context, or escalate to Joshua.

## Required Context To Read First

Read these Phase 7 files before any implementation:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/README.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/backlog.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/06_phase_7_dev_implementation_plan_context.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/tests/15_05_v2_12_phase_7_sandbox_fix_testing.md
```

Use these investigation files for deeper context when touching the relevant area:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/01_head_office_delete_authority.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/02_head_office_daily_summary_access.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/03_solution_options_and_risk_matrix.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/04_room_level_pax_accuracy.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/05_room_configuration_assignment.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/06_whatsapp_rooming_export_format.md
```

Compare against the sandbox only as reference:

```text
/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing/ziwa_ranch/projects/hod_daily_reports/4_development
```

Real-dev target root:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development
```

## Product Decisions To Preserve

- Head Office can cancel bookings directly.
- Head Office can request admin deletion.
- HQ Reception and Housekeeping can request bookings and deletions.
- Main Gate, F&B, and all other HOD departments cannot request bookings or deletions unless Joshua separately re-approves them.
- Direct Head Office cancellation is status cancellation, not hard delete.
- Admin deletion remains an admin-reviewed request path.
- Daily Summary uses shared summary/formatter logic with separate auth wrappers.
- Head Office Daily Summary access is HOD-authenticated and Head Office-only.
- Room-level pax uses existing per-room `booking_rooms.room_config`.
- Room configuration uses constrained per-room metadata.
- WhatsApp uses one shared rooming formatter.
- CSV export remains deferred unless Joshua later confirms spreadsheet output is required in this first fix.

## Known Sandbox Evidence

Sandbox branch/worktree:

```text
branch: phase-7-sandbox-fix-testing
path: /Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing
```

Sandbox result:

- Focused Phase 7 tests: `15/15` passing.
- Admin test script: `55/55` passing.
- Admin lint: pass with 13 unrelated warnings.
- Portal lint: pass with 4 unrelated warnings.
- Admin TypeScript: pass.
- Portal TypeScript: pass.
- No migration drafted or applied.
- No dev-preview validation or data writes performed.

Important sandbox-to-dev warning:

The sandbox proves a local path, but it is not safe to copy wholesale. Real dev must preserve:

- Portal `change-requests` `GET` handler.
- `InventoryGridConfig.unitOptions`.
- `AccommodationUnit.max_concurrent_bookings`.
- Shared-unit, campsite, overlap, and `max_concurrent_bookings` guard behaviour.
- Existing real-dev tests.
- Unrelated dirty workspace changes.

## Implementation Sequence

Follow the task order from:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/06_phase_7_dev_implementation_plan_context.md
```

Do not skip ahead. Do not combine tasks unless the test and source changes are inseparable.

### Task 0 - Baseline And Dirty Workspace Review

Purpose: protect unrelated user work and capture current verification baseline.

Steps:

1. Inspect git status for the HOD Daily Reports dev tree.
2. Identify unrelated dirty files.
3. Run baseline commands where practical:

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && npm test
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && npm run lint
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal && npm run lint
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && npx tsc --noEmit
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal && npx tsc --noEmit
```

If baseline fails for unrelated reasons, record the failure and continue only if the Phase 7 work can be isolated without masking the failure.

### Task 1 - Booking Authority Policy

Files:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-booking-authority-policy.test.ts
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/config/accommodation.ts
```

Test first:

- Create the Phase 7 policy test.
- Confirm red failure because helpers or policy expectations are missing.

Implementation:

- Add `canDirectlyCancelAccommodationBooking`.
- Add `canRequestAccommodationBooking`.
- Add `canRequestAccommodationDeletion`.
- Ensure Head Office, HQ Reception, Housekeeping, Main Gate, F&B, and unknown/default departments match the policy.

Focused command:

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && node --import tsx --test __tests__/phase7-booking-authority-policy.test.ts
```

Review:

- Spec reviewer checks the exact policy matrix.
- Code reviewer checks helper clarity and no duplicated policy drift.

### Task 2 - Booking Authority Routes And Modal

Files:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-booking-authority-routes.test.mjs
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/bookings/[id]/route.ts
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/change-requests/route.ts
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/BookingManagerModal.tsx
```

Test first:

- Add route/UI contract tests.
- Confirm red failure for missing direct cancellation branch, split request guards, activity action, and UI wording.

Implementation:

- Add Head Office-only direct cancellation as a guarded status transition.
- Log `hod_booking_cancelled` or the documented final action string.
- Split change-request authorisation:
  - deletion requests use `canRequestAccommodationDeletion`;
  - booking/amendment requests use `canRequestAccommodationBooking`.
- Preserve the existing `GET` handler in `change-requests/route.ts`.
- Update modal copy:
  - Head Office direct action: `Cancel Booking`;
  - admin review action: `Request Admin Deletion`.

Focused command:

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && node --test __tests__/phase7-booking-authority-routes.test.mjs
```

Review:

- Spec reviewer verifies direct cancellation vs admin deletion request separation.
- Code reviewer verifies no route regression, no hard delete, and no removal of `GET`.

### Task 3 - Room Configuration Types And Validation

Files:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-room-configuration-validation.test.ts
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/types/index.ts
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/accommodation-guards.ts
```

Test first:

- Add validation tests for allowed option, rejected option, missing required option, and no-option unit behaviour.
- Confirm red failure before source changes.

Implementation:

- Add `StayConfigurationOption`.
- Add `PaxConfig.stay_configurations`.
- Add `RoomBasketItem.room_configuration_code`.
- Add `RoomBasketItem.room_configuration_label`.
- Validate selected configuration against the unit's `stay_configurations`.
- Preserve existing shared-unit, campsite, overlap, and `max_concurrent_bookings` guard logic.
- Do not infer labels from bed inventory.

Focused command:

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && node --import tsx --test __tests__/phase7-room-configuration-validation.test.ts
```

Review:

- Spec reviewer checks option-A constraints and JSONB persistence assumptions.
- Code reviewer checks guard minimality and no shared-capacity regression.

### Task 4 - HOD Accommodation Metadata And Modal Selector

Files:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-room-configuration-ui-contract.test.mjs
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/route.ts
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/BookingManagerModal.tsx
```

Test first:

- Add UI/API contract tests for `pax_config`, `stay_configurations`, `room_configuration_code`, and `room_configuration_label`.
- Confirm red failure before source changes.

Implementation:

- Include `pax_config` in the HOD accommodation data needed by the modal.
- Add constrained per-room selector:
  - many options: show dropdown;
  - one option: auto-select or show fixed single value;
  - no options: hide selector and clear stale configuration fields.
- Do not add free text.

Focused command:

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && node --test __tests__/phase7-room-configuration-ui-contract.test.mjs
```

Review:

- Spec reviewer checks one-option, many-option, and no-option behaviours.
- Code reviewer checks UI simplicity and no broad modal refactor.

### Task 5 - Shared WhatsApp Formatter

Files:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-rooming-whatsapp.test.ts
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/rooming-whatsapp.ts
```

Test first:

- Add formatter tests for title, occupied room lines, equal/uneven pax, room configuration, meal plan, stay night, status, and `no notes`.
- Confirm red failure because the module does not exist.

Implementation:

- Create a pure shared formatter at `packages/shared/lib/rooming-whatsapp.ts`.
- Export typed row/input helpers.
- Keep auth, privacy policy, Supabase fetching, browser clipboard access, and UI state outside the formatter.

Focused command:

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && node --import tsx --test __tests__/phase7-rooming-whatsapp.test.ts
```

Review:

- Spec reviewer checks exact WhatsApp format.
- Code reviewer checks pure module boundaries and stable formatting.

### Task 6 - Daily Summary Routes And Admin Formatter Use

Files:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/phase7-daily-summary-contract.test.mjs
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/accommodation/daily-summary/route.ts
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/accommodation/DailySummary.tsx
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/daily-summary/route.ts
```

Test first:

- Add Daily Summary contract tests.
- Confirm red failure because HOD Daily Summary route is absent, admin route omits `room_config`, and admin UI uses local WhatsApp formatting.

Implementation:

- Add HOD-authenticated Head Office-only Daily Summary route.
- Return `401` when unauthenticated, `403` for authenticated non-Head Office, and `200` for Head Office.
- Select `booking_rooms.room_config` in admin and HOD summary paths.
- Use the shared WhatsApp formatter in admin Daily Summary.
- Avoid repeating booking-level totals on every room line for legacy/null `room_config`.
- Preserve campsite/shared-capacity rendering requirements from real dev.

Focused command:

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && node --test __tests__/phase7-daily-summary-contract.test.mjs
```

Review:

- Spec reviewer checks auth boundary, room-level pax, and shared formatter usage.
- Code reviewer checks route duplication, privacy boundaries, and no admin-auth leakage into HOD.

### Task 7 - Focused Phase 7 Sweep

Run:

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && node --import tsx --test __tests__/phase7-*.test.ts __tests__/phase7-*.test.mjs
```

If shell globbing skips files, run the six exact Phase 7 files individually.

Do not proceed to regression until all Phase 7 focused tests pass.

### Task 8 - Local Regression

Run:

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && npm test
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && npm run lint
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal && npm run lint
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal && npx tsc --noEmit
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal && npx tsc --noEmit
```

Expected result:

- Admin tests pass.
- Admin lint exits `0`; existing warnings may remain if baseline-matched.
- Portal lint exits `0`; existing warnings may remain if baseline-matched.
- Admin TypeScript passes.
- Portal TypeScript passes.

If new lint warnings or TypeScript errors appear in Phase 7 touched files, fix them before continuing.

### Task 9 - Documentation Updates

Update these files with implementation evidence:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/README.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/03_solution_options_and_risk_matrix.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/tests/15_05_v2_12_phase_7_sandbox_fix_testing.md
```

Also update the active development log under:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/09_project_development/
```

Record:

- Approval token.
- Files changed.
- Tests added.
- Focused test results.
- Regression command results.
- Lint warning baseline and new-warning status.
- Migration decision.
- Dev-preview validation status.
- Cleanup status.
- Residual risks.

### Task 10 - Browser And Dev-Preview Validation Gate

Local browser checks may proceed after local automated tests pass.

Read-only checks:

- Head Office Rooms tab loads.
- Head Office booking modal shows `Cancel Booking` and `Request Admin Deletion`.
- Admin Daily Summary loads.
- WhatsApp source text uses the new title and room lines.

Write checks are blocked unless Joshua gives:

```text
APPROVED: phase_7_dev_sandbox_writes
```

If writes are approved, use test-owned markers, approved accounts, redacted evidence, and documented cleanup before the first write.

## Subagent Prompt Templates

### Implementer Subagent Template

Use this structure for each task:

```text
You are implementing Phase 7 HOD Daily Reports task: [TASK NAME].

Approval token detected by orchestrator: APPROVED: phase_7_implementation_dev.

Hard limits:
- Do not touch production.
- Do not run migrations.
- Do not commit or push.
- Do not replace sandbox files wholesale.
- Do not revert unrelated dirty work.
- Preserve portal change-request GET and shared-unit/campsite guard behaviour.

Context:
- Real dev root: /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development
- Plan: /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/06_phase_7_dev_implementation_plan_context.md
- Sandbox reference only: /Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing/ziwa_ranch/projects/hod_daily_reports/4_development

Task files:
[EXACT FILES]

TDD requirements:
1. Write the failing test first.
2. Run the focused command and confirm the expected red failure.
3. Implement the smallest source change.
4. Run the focused command and confirm green.
5. Run any task-specific regression command.
6. Self-review for scope, simplicity, and unrelated changes.

Return:
status: DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED
files changed
tests added or updated
red failure evidence
green evidence
regression evidence
risks or concerns
next recommended action
```

### Spec Reviewer Subagent Template

```text
Review Phase 7 task [TASK NAME] for spec compliance only.

Read:
- The task section supplied by the orchestrator.
- The changed files.
- The focused test file and test output summary.

Check:
- Exact Phase 7 product decision is implemented.
- No missing requirements from the task.
- No extra product behaviour was added.
- Approval gates were not bypassed.
- Sandbox merge hazards were respected.

Return:
status: APPROVED or CHANGES_REQUIRED
findings ordered by severity
missing requirements
extra behaviour
required fixes
```

### Code Quality Reviewer Subagent Template

```text
Review Phase 7 task [TASK NAME] for code quality after spec compliance has passed.

Check:
- Simplicity and local code style.
- Type safety.
- Test quality and TDD evidence.
- No avoidable duplication.
- No broad refactor.
- No auth, privacy, or data-safety regression.
- No unrelated dirty files touched.

Return:
status: APPROVED or CHANGES_REQUIRED
findings ordered by severity
required fixes
residual risks
```

### Final Reviewer Subagent Template

```text
Review the full Phase 7 real-dev implementation after all focused and regression commands pass.

Check:
- Booking authority policy matrix.
- Head Office direct cancellation and admin deletion request separation.
- HQ Reception and Housekeeping request behaviour.
- Main Gate, F&B, and default department blocking.
- HOD Head Office Daily Summary auth boundary.
- Room-level pax from booking_rooms.room_config.
- Constrained room configuration.
- Shared WhatsApp formatter.
- Migration/data gates.
- Dev-preview/write boundaries.
- Documentation accuracy.

Return:
status: APPROVED, CONCERNS, or CHANGES_REQUIRED
findings ordered by severity
test evidence reviewed
documentation gaps
release blockers
recommended next action
```

## Stop Conditions

Return `BLOCKED` and stop if:

- `APPROVED: phase_7_implementation_dev` is missing.
- A required source edit would overwrite unrelated dirty work.
- The implementation requires room option values Joshua has not approved.
- Migration or data seed execution is needed without `APPROVED: phase_7_migration_execution`.
- Dev-preview writes are needed without write approval and cleanup.
- Production access is needed without `OVERRIDE: test_in_production`.
- Tests cannot be made red for the intended reason.
- Focused tests pass immediately before implementation, suggesting the test does not prove the missing behaviour.
- The only way forward is to remove portal change-request `GET` or shared-unit/campsite capacity logic.
- Evidence would expose secrets or unnecessary private guest data.

## Required Final Response

Return:

```text
status: PASS, CONCERNS, FAIL, or BLOCKED
approval token used
implementation stages completed
subagents launched
files changed
tests added or updated
commands run
command results
lint/typecheck status
migration/data status
dev-preview/browser validation status
cleanup status
documentation updated
open decisions for Joshua
residual risks
stop conditions encountered
recommended next action
```

If implementation completes locally, do not claim production readiness. Recommend the next appropriate gated action, usually read-only browser validation or Joshua review.
