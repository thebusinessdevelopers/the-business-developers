# v2.12 Phase 7 Head Office Booking Authority

STATUS: scoping

## Purpose

Phase 7 is a maintenance discovery and evidence package for the current HOD Daily Reports v2.12 system. It does not open v2.13.

This phase investigates Head Office booking authority, Head Office Daily Summary access, room-level pax accuracy, per-room room configuration, and WhatsApp rooming export correctness.

## Current Approval State

Approved by Joshua on 2026-05-15:

```text
APPROVED: phase_7_discovery_scope
```

Constraint from Joshua: run Wave 0 and Wave 1 only, then check back in after documentation is current.

## Scope

1. Head Office direct authority to create, edit, and delete accommodation bookings from the HOD portal.
2. Diagnosis of why Head Office deletion currently routes to a failing change-request path.
3. Verification that HQ Reception and Housekeeping approval-gated change requests must not regress.
4. Head Office access to today's Daily Summary and WhatsApp rooming export.
5. Correct room-by-room pax in Daily Summary and WhatsApp export.
6. Per-room room-configuration assignment constrained by actual room capability.
7. Display of selected room configuration in Daily Summary and WhatsApp export.
8. Improved WhatsApp rooming format.
9. Sandbox-tested fix options before any real dev implementation.

## Out Of Scope

1. Production implementation.
2. Production data writes.
3. v2.13.
4. Broad accommodation redesign.
5. Migrations or schema changes without separate exact approval.
6. Push, deploy, or production promotion.

## Approval Gates

```text
APPROVED: phase_7_discovery_scope
APPROVED: phase_7_dev_sandbox_writes
OVERRIDE: test_in_production
APPROVED: phase_7_sandbox_fix_testing
APPROVED: phase_7_implementation_dev
APPROVED: phase_7_production_promotion
APPROVED: phase_7_manual_validation
```

## Wave Status

| Wave | Status | Notes |
| --- | --- | --- |
| Wave 0 - Phase setup | complete | Folder and scoping files created after discovery approval. |
| Wave 1 - Static source diagnosis | complete | Five read-only agents returned evidence; documentation updated. |
| Wave 2 - Reproduction plan and approved reproduction | partial | Planning context drafted; approved dev-preview API reproduction partially executed; all created test bookings cancelled. |
| Wave 3 - Codebase fix investigation | complete | Seven read-only agents produced fix architecture, test map, migration assessment, and sandbox prerequisites. |
| Wave 4 - Sandbox fix testing | complete - PASS locally | Sandbox branch `phase-7-sandbox-fix-testing` passed focused Phase 7 tests, admin tests, lint, and TypeScript locally; no migration or dev-preview write was performed. |
| Wave 5 - Real-dev implementation planning | complete - CONCERNS | Read-only planning swarm created the real-dev implementation plan; real-dev source edits remain blocked until `APPROVED: phase_7_implementation_dev`. |
| Wave 6 - Real-dev implementation execution | complete - PASS locally | Real-dev source implementation completed after `APPROVED: phase_7_implementation_dev`; focused Phase 7 tests, admin tests, lint, and TypeScript passed locally. No migration, dev-preview write, production access, commit, push, deploy, or PR was performed. |

## Key Documents

- `backlog.md`
- `investigations/00_phase_7_investigation_plan.md`
- `execution_context/00_phase_7_setup_context.md`
- `execution_context/01_phase_7_discovery_context.md`
- `execution_context/03_phase_7_reproduction_plan_context.md`
- `execution_context/04_phase_7_codebase_fix_investigation_context.md`
- `execution_context/05_phase_7_final_investigation_and_sandbox_plan_context.md`
- `execution_context/06_phase_7_dev_implementation_plan_context.md`
- `prompts/01_phase_7_discovery_swarm_prompt.md`
- `prompts/03_phase_7_wave_2_reproduction_plan_prompt.md`
- `prompts/04_phase_7_codebase_fix_investigation_swarm_prompt.md`
- `prompts/05_phase_7_final_investigation_and_sandbox_fix_testing_prompt.md`
- `prompts/06_phase_7_dev_implementation_planning_swarm_prompt.md`
- `prompts/07_phase_7_dev_implementation_subagent_execution_prompt.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/tests/14_05_v2_12_phase_7_head_office_booking_authority.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/tests/15_05_v2_12_phase_7_sandbox_fix_testing.md`

## Decision Log

| Date | Decision | Owner | Evidence |
| --- | --- | --- | --- |
| 2026-05-15 | Phase 7 discovery scope approved for Wave 0 and Wave 1 only. | Joshua | `APPROVED: phase_7_discovery_scope but only wave 0 & 1 for now, check back in after they are complete and all documentation is current.` |
| 2026-05-15 | Wave 1 static diagnosis completed. | Agent | Policy, admin comparison, rooming data, WhatsApp export, and regression agents returned read-only evidence. |
| 2026-05-16 | Wave 2 reproduction-plan agent prompt engineered. | Joshua/Agent | Joshua asked to engineer the prompt for the agent responsible for conducting Wave 2. |
| 2026-05-16 | Wave 2 reproduction plan drafted without execution. | Joshua/Agent | Planning-only context created at `execution_context/03_phase_7_reproduction_plan_context.md`; dev-preview writes remain blocked. |
| 2026-05-16 | Wave 2 dev-preview reproduction partially executed. | Joshua/Agent | `APPROVED: phase_7_dev_sandbox_writes`; runtime API evidence captured under marker `P7W2 QA 1778951161`; all created bookings cancelled. |
| 2026-05-16 | Codebase fix investigation swarm prompt engineered. | Joshua/Agent | Prompt created at `prompts/04_phase_7_codebase_fix_investigation_swarm_prompt.md`; read-only diagnosis before sandbox fix testing. |
| 2026-05-16 | Wave 3 codebase fix investigation completed. | Agent | Context created at `execution_context/04_phase_7_codebase_fix_investigation_context.md`; sandbox fix testing remains gated. |
| 2026-05-16 | Product decisions recorded for first sandbox fix scope. | Joshua/Agent | Cancellation chosen over hard delete; approval-gated departments remain request-based for cancellation; room configuration must be implemented; CSV deferred unless spreadsheet output is required. |
| 2026-05-16 | Final investigation and sandbox fix testing prompt engineered. | Joshua/Agent | Prompt created at `prompts/05_phase_7_final_investigation_and_sandbox_fix_testing_prompt.md`; it requires final swarms, synthesis, and gated sandbox testing with documentation at each stage. |
| 2026-05-16 | Final booking-authority policy selected and sandbox fix testing approved. | Joshua | Head Office can cancel bookings and request admin deletion; HQ Reception and Housekeeping can request bookings and deletions; all other HOD departments cannot. Token: `APPROVED: phase_7_sandbox_fix_testing`. |
| 2026-05-16 | Dev implementation planning swarm prompt engineered. | Joshua/Agent | Prompt created at `prompts/06_phase_7_dev_implementation_planning_swarm_prompt.md`; it is planning-only and requires subagent swarms before any real dev implementation approval. |
| 2026-05-16 | Sandbox fix testing passed locally. | Agent | Sandbox worktree `/Users/joshuaroy/the-business-developers/.worktrees/phase-7-sandbox-fix-testing`; focused Phase 7 tests `15/15`, admin tests `55/55`, admin/portal lint, and admin/portal TypeScript passed locally. |
| 2026-05-16 | Real-dev implementation plan completed. | Agent | Six read-only planning agents compared sandbox and real dev; context saved at `execution_context/06_phase_7_dev_implementation_plan_context.md`. Real-dev implementation remains gated by `APPROVED: phase_7_implementation_dev`. |
| 2026-05-16 | Real-dev implementation execution prompt engineered. | Joshua/Agent | Prompt created at `prompts/07_phase_7_dev_implementation_subagent_execution_prompt.md`; it requires subagent-driven TDD, review loops, and the exact implementation token before source edits. |
| 2026-05-17 | Real-dev implementation completed locally. | Joshua/Agent | Joshua gave `APPROVED: phase_7_implementation_dev`. Focused Phase 7 tests passed `28/28`; admin test script passed `91/91`; admin lint exited `0` with 13 existing warnings; portal lint exited `0` with 4 existing warnings; admin and portal TypeScript passed. |
