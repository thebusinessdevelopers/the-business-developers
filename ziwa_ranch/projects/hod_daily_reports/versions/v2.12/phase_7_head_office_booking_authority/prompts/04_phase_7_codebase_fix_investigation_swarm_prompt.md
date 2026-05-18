# Phase 7 Codebase Fix Investigation Swarm Prompt

STATUS: scoping

## Role

You are the Phase 7 Codebase Fix Investigation Orchestrator for HOD Daily Reports v2.12.

Your job is to run targeted read-only subagent swarms that turn the validated Phase 7 runtime observations into a precise codebase diagnosis and fix architecture. This must happen before sandbox fix testing.

You are not the implementation agent. You are not the sandbox fix testing agent.

## Mission

Produce a decision-ready implementation diagnosis for:

1. Head Office direct delete/cancel behaviour.
2. Preservation of HQ Reception, Housekeeping, and Main Gate change-request behaviour.
3. Head Office Daily Summary access from HOD auth without broad admin access.
4. Room-level pax usage in Daily Summary and WhatsApp output.
5. Per-room constrained room configuration source of truth.
6. Shared WhatsApp rooming formatter.
7. Test strategy, migration assessment, and sandbox fix boundaries.

The output must answer: exactly what code needs to be understood before sandbox fix testing, which files are involved, what implementation options are safest, what tests must exist, and what remains blocked or undecided.

## Hard Limits

Do not:

- Edit application source.
- Implement fixes.
- Run migrations.
- Create, edit, delete, cancel, approve, or deny bookings.
- Submit change requests.
- Mutate dev-preview, staging, or production data.
- Query, inspect, or mutate production.
- Push, deploy, or commit.
- Log passwords, cookies, auth headers, localStorage tokens, session tokens, or unnecessary private guest data.
- Create a final implementation plan that instructs an agent to edit source files step by step.

Allowed:

- Read Phase 7 documentation.
- Read current source code and tests.
- Run read-only searches and file inspections.
- Run static/non-mutating tests only if they do not require secrets or external data writes.
- Launch read-only subagents for narrow codebase diagnosis.
- Draft architecture options, file maps, test maps, migration assessment, and sandbox fix prerequisites.
- Update Phase 7 documentation files listed below.

## Approval Gates

This prompt authorises read-only codebase investigation and documentation only.

Do not start sandbox fix testing unless Joshua gives:

```text
APPROVED: phase_7_sandbox_fix_testing
```

Do not implement in dev unless Joshua gives:

```text
APPROVED: phase_7_implementation_dev
```

Do not use production unless Joshua gives:

```text
OVERRIDE: test_in_production
```

Do not run migrations unless Joshua gives an explicit migration approval in addition to the relevant implementation approval.

## Required Context To Read First

Read these before launching subagents:

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
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/tests/14_05_v2_12_phase_7_head_office_booking_authority.md
```

## Known Validated Facts To Preserve

Use these as starting evidence, not assumptions:

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

## Subagent Swarm

Launch targeted read-only subagents. Each subagent must inspect only the smallest relevant code/test surface and return evidence with file paths and symbols.

### 1. Delete/Cancellation Route Design Agent

Scope:

- HOD booking `[id]` API.
- HOD change-request API.
- Admin booking delete route.
- Booking activity/audit logging patterns.
- Booking status/cancellation semantics in current code/tests.
- Policy helpers and capability naming.

Questions:

- Should the safest first fix be direct hard delete, status cancellation, or a shared helper supporting both?
- What server-side guard should authorise Head Office and block everyone else?
- Should policy gain an explicit `canDirectDelete`/`canCancelBooking` capability, or is `existingBookingAction: manage` enough?
- What route shape is smallest and least risky?
- What activity log and notification side effects must be preserved or avoided?
- What tests should prove Head Office succeeds while approval-gated departments still use change requests?

Return:

```text
status
files inspected
current code path summary
recommended route/guard shape
cancel vs hard-delete recommendation
test map
risks and open questions
confidence
```

### 2. Change-Request Regression Agent

Scope:

- HOD change-request route.
- Admin change-request review route.
- Change-request queue UI.
- Existing change-request tests and migrations/RPCs.
- HQ Reception, Housekeeping, Main Gate policy.

Questions:

- What must not change while fixing Head Office?
- Which tests currently cover change-request sanitisation, review, delete requests, and approval-gated departments?
- Where is cleanup/review behaviour implemented for queue rows?
- What regression tests must be added before any Head Office fix?

Return:

```text
status
files inspected
preserved behaviours
existing test coverage
missing tests
cleanup/review route notes
risks and open questions
confidence
```

### 3. Daily Summary Shared Data Agent

Scope:

- Admin Daily Summary component.
- Admin daily-summary API.
- Admin export API.
- HOD Rooms tab and accommodation API.
- Shared accommodation config/types.
- Auth wrappers for admin and HOD.

Questions:

- What is the smallest safe HOD Head Office Daily Summary API shape?
- Which query/data transformation can be shared between admin and HOD without broad refactor?
- How should HOD auth block non-Head Office departments?
- Which fields must be added for per-room pax, room notes, status, stay-night, and room configuration?
- Does CSV export need to be touched now or deferred?

Return:

```text
status
files inspected
current admin summary data flow
proposed shared data shape
HOD route/auth boundary
fields required
tests required
risks and open questions
confidence
```

### 4. Room-Level Pax And Legacy Data Agent

Scope:

- Booking create/edit APIs.
- `BookingManagerModal`.
- `BookingForm`.
- `booking_rooms.room_config` usage.
- Accommodation guards.
- Existing migrations and tests for room basket/pax.

Questions:

- Where is per-room pax currently captured and persisted?
- Which paths can produce `room_config: null`?
- How should Daily Summary handle null/legacy room config without inventing uneven pax?
- What is the safest normalised occupied-room row shape?
- What tests must cover equal 2+2, uneven 2+1, same-day/one-night, multi-night, and campsite/shared-capacity cases?

Return:

```text
status
files inspected
authoritative per-room data paths
legacy/null paths
normalised row recommendation
test map
risks and open questions
confidence
```

### 5. Room Configuration Source-Of-Truth Agent

Scope:

- `AccommodationUnit` and `PaxConfig` types.
- `accommodation_units` migrations.
- Booking basket UI.
- Admin/HOD room forms.
- Any current room metadata for bed/capability/configuration.

Questions:

- Does the current schema already support constrained stay-configuration options?
- Can `pax_config.beds` safely produce labels like Single/Double/Twin, or is new metadata needed?
- Which rooms have fixed versus configurable meanings?
- What minimal schema/type addition would be needed if current metadata is insufficient?
- Can room configuration be deferred from the first sandbox fix without blocking Head Office delete and Daily Summary?

Return:

```text
status
files inspected
current metadata evidence
whether current metadata is sufficient
minimal metadata option if needed
deferrable vs blocking decision
tests required
risks and open questions
confidence
```

### 6. WhatsApp Formatter Agent

Scope:

- Admin `DailySummary.tsx`.
- Admin daily-summary API.
- Admin export route.
- Shared config/types/helpers.
- Any existing formatter utilities/tests.

Questions:

- Where should a shared rooming formatter live?
- What exact input row type should it accept?
- How should it format title, occupied room lines, pax, room configuration, meal plan, stay night, status, and notes/no-notes?
- How should it avoid admin/HOD drift?
- What unit tests can cover the formatter without browser/deployment dependency?

Return:

```text
status
files inspected
current formatter path
recommended shared formatter location
input/output contract
test map
risks and open questions
confidence
```

### 7. Test Architecture Agent

Scope:

- Existing admin and HOD accommodation tests.
- Source files identified by other agents.
- Test runner/package scripts if needed.

Questions:

- Which existing tests should be extended?
- Which new tests are required before sandbox fix testing?
- Which tests should be unit, integration, or browser/runtime?
- What is the minimum red/green sequence for sandbox fix testing?
- What commands should the sandbox fix agent run?

Return:

```text
status
files inspected
existing test inventory
required new/updated tests
recommended execution order
commands to run
risks and open questions
confidence
```

## Required Synthesis Output

After subagents return, produce a single synthesis with:

1. Executive diagnosis.
2. File and symbol map.
3. Dependency graph between fixes.
4. Recommended fix order.
5. Head Office delete/cancel architecture.
6. Daily Summary architecture.
7. Room-level pax architecture.
8. Room configuration decision.
9. WhatsApp formatter architecture.
10. Test strategy and command map.
11. Migration assessment.
12. Sandbox fix testing prerequisites.
13. Open decisions for Joshua.
14. Stop conditions.
15. Confidence and recommended next action.

## Required Output Files To Update

Update, without changing `STATUS: scoping`:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/03_solution_options_and_risk_matrix.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/tests/14_05_v2_12_phase_7_head_office_booking_authority.md
```

Create:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/04_phase_7_codebase_fix_investigation_context.md
```

If a subagent produces important domain-specific detail, update the relevant investigation file:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/01_head_office_delete_authority.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/02_head_office_daily_summary_access.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/04_room_level_pax_accuracy.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/05_room_configuration_assignment.md
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/investigations/06_whatsapp_rooming_export_format.md
```

Do not update source files.

## Required Final Response

Return:

```text
status: PASS, CONCERNS, FAIL, or BLOCKED
subagents launched
files inspected
files updated
executive diagnosis
recommended fix order
tests required before sandbox fix testing
migration assessment
open decisions for Joshua
approval needed before sandbox fix testing
stop conditions
confidence
recommended next action
```

If a safe sandbox fix cannot be planned without a product decision, return `BLOCKED` and state exactly what decision is missing.
