# Phase 7 Backlog

STATUS: scoping

## Source-Of-Truth Order

1. Joshua's current Phase 7 instruction.
2. Fresh Phase 7 evidence.
3. Current source code.
4. v2.12 README and release closeout.
5. Phase 6 documentation.
6. Older Phase 5 and v2.7/v2.8 notes.

## Phase 7 Items

### P7-01 - Head Office Direct Booking Authority

**Observed issue:** Head Office appears to be routed through deletion requests, then blocked with `Your department cannot submit change requests.`

**Required outcome:** Head Office can create, edit, and delete bookings autonomously where policy allows, with secure server-side checks.

**Wave 1 finding:** Policy supports Head Office direct management (`existingBookingAction: manage`, `requiresApproval: false`, `canSubmitChangeRequest: false`), but the HOD booking manager deletion control still posts `{ action: "delete" }` to `/api/accommodation/change-requests`. That route rejects Head Office with `Your department cannot submit change requests.`

### P7-02 - Approval-Gated Department Regression Protection

**Observed issue:** HQ Reception and Housekeeping change requests worked in Joshua's manual checks.

**Required outcome:** HQ Reception and Housekeeping keep approval-gated change-request behaviour.

**Wave 1 finding:** HQ Reception and Housekeeping are configured with `canSubmitChangeRequest: true` and `requiresApproval: true`, explaining why Joshua's manual change-request checks succeeded. Main Gate is also a regression-sensitive approval/change-request department.

### P7-03 - Head Office Daily Summary Access

**Observed issue:** Head Office needs the same operational rooming view and WhatsApp copy/export value admins currently have.

**Required outcome:** A HOD-authenticated, Head Office-gated route and UI path exists without granting broad admin access.

**Wave 1 finding:** Admin Daily Summary is admin-authenticated and uses admin routes. Head Office should not be given broad admin access just to view rooming; the likely safe path is a HOD-authenticated route with shared summary/formatting helpers.

### P7-04 - Room-Level Pax Accuracy

**Observed issue:** Daily Summary and WhatsApp export may show booking total pax against every room in a multi-room booking.

**Required outcome:** Each occupied room displays only the pax assigned to that room.

**Wave 1 finding:** Admin Daily Summary and WhatsApp text use booking-level `adults` and `children` for room lines. Per-room pax can exist in `booking_rooms.room_config`, but the summary query does not select or use it.

### P7-05 - Per-Room Room Configuration

**Observed issue:** There is no confirmed way to assign room configuration per selected room.

**Required outcome:** Booking create/edit supports constrained per-room configuration based on actual room capability metadata.

**Wave 1 finding:** Room capability metadata exists on `accommodation_units` (`category`, `capacity`, `pax_config`, `pricing_type`, `max_concurrent_bookings`), but there is no confirmed per-stay room configuration field such as Double/Twin selected per room.

### P7-06 - WhatsApp Rooming Export Format

**Observed issue:** WhatsApp rooming output needs a fixed title and one line per occupied room with complete operational details.

**Required outcome:** Output uses `*DD MONTH YYYY - ZIWA ROOMING*` and includes room, guest/group, per-room pax, room configuration, meal plan, stay night, status, and room notes without exposing secrets.

**Wave 1 finding:** WhatsApp text is generated client-side in admin `DailySummary.tsx`, has a two-line title, uses booking-level pax, and omits room configuration, stay night, status, and room notes.

## Current Blockers

- Wave 2 reproduction planning is complete and approved dev-preview API reproduction partially executed.
- Further dev-preview writes still require the existing `APPROVED: phase_7_dev_sandbox_writes` boundary and a confirmed cleanup path.
- Full change-request submission is blocked without an approved admin cleanup path.
- Admin Daily Summary and WhatsApp runtime checks are blocked without approved admin credentials or browser automation.
- Sandbox fix testing requires `APPROVED: phase_7_sandbox_fix_testing`.
- Real dev implementation requires `APPROVED: phase_7_implementation_dev`.
- Phase 5 delete/private-name investigation contains stale claims versus current source/tests and must not be used uncritically.
- Product decision recorded: direct Head Office action is cancellation/status cancellation, not hard delete.
- Product decision recorded: approval-gated departments can request cancellation through change requests, not direct status cancellation.
- Product decision recorded: constrained per-room room configuration blocks the first sandbox fix.
- Room configuration still needs a source-of-truth catalogue and persistence decision before implementation can be safe.

## Decision Log

| Date | Decision | Owner | Evidence |
| --- | --- | --- | --- |
| 2026-05-15 | Run Wave 0 and Wave 1 only before check-in. | Joshua | Phase 7 discovery approval message. |
| 2026-05-15 | Wave 1 static diagnosis completed and backlog updated. | Agent | Five read-only agents returned structured evidence. |
| 2026-05-16 | Wave 2 reproduction plan drafted; execution remains gated. | Joshua/Agent | `execution_context/03_phase_7_reproduction_plan_context.md`; no data writes or reproduction performed. |
| 2026-05-16 | Wave 2 dev-preview reproduction partially executed; cleanup completed for created bookings. | Joshua/Agent | Runtime API evidence captured under marker `P7W2 QA 1778951161`; all created bookings cancelled. |
| 2026-05-16 | Codebase fix investigation swarm prompt engineered. | Joshua/Agent | `prompts/04_phase_7_codebase_fix_investigation_swarm_prompt.md`; source diagnosis and fix architecture required before sandbox fix testing. |
| 2026-05-16 | Read-only codebase fix investigation completed. | Agent | `execution_context/04_phase_7_codebase_fix_investigation_context.md`; recommended direct cancellation, HOD Head Office Daily Summary route, `room_config`-based pax, shared formatter, and tests before sandbox work. |
| 2026-05-16 | Product decisions recorded for first sandbox scope. | Joshua/Agent | Cancellation chosen over hard delete; approval-gated departments can request cancellation; cancellation log wording delegated to agent; CSV deferred unless spreadsheet output is needed; constrained room configuration required. |
| 2026-05-16 | Final investigation and sandbox fix testing prompt engineered. | Joshua/Agent | `prompts/05_phase_7_final_investigation_and_sandbox_fix_testing_prompt.md`; next agent must run final swarms, final reasoning, and gated sandbox fix testing with staged documentation. |
