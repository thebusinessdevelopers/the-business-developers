# Phase 7 Investigation Plan

STATUS: scoping

## Objective

Build an evidence-led diagnosis for Head Office booking authority, Daily Summary access, room-level pax, room configuration, and WhatsApp rooming export correctness.

## Current Limit

Joshua has approved Wave 0 and Wave 1 only. No reproduction writes, sandbox fixes, implementation, migration, deploy, or production check is approved.

## Wave 1 Read-Only Agents

1. Policy Agent.
2. Admin Comparison Agent.
3. Rooming Data Agent.
4. WhatsApp Export Agent.
5. Regression Agent.

Each agent must return:

```text
status: PASS, CONCERNS, FAIL, or BLOCKED
files inspected
commands/tools used
raw evidence summary
hypotheses supported
hypotheses weakened
confidence
recommended next action
```

## Hypothesis Ledger

| ID | Hypothesis | Current status | Evidence |
| --- | --- | --- | --- |
| H1 | Head Office policy allows direct booking management, but HOD deletion routes through change requests. | supported | Policy Agent found Head Office `manage` policy and modal deletion POST to change requests. |
| H2 | Change-request API correctly rejects Head Office because Head Office cannot submit change requests. | supported | Policy Agent traced 403 to `canSubmitChangeRequest` guard. |
| H3 | HQ Reception and Housekeeping work because they are approval-gated and can submit change requests. | supported | Policy Agent found both have `canSubmitChangeRequest: true` and `requiresApproval: true`. |
| H4 | HOD portal lacks or does not call a secure direct-delete path for Head Office. | supported | Policy Agent found no `DELETE` export in inspected HOD booking `[id]` route. |
| H5 | Admin direct delete can inform, but not blindly replace, the HOD path. | supported | Admin Comparison Agent found admin hard delete is gated by admin session and `accommodation_manage`. |
| H6 | Daily Summary exists only behind admin auth or admin UI. | supported | Admin Comparison Agent found admin Daily Summary uses admin route and component. |
| H7 | Head Office needs a HOD-authenticated Daily Summary path, not broad admin access. | supported | Admin route depends on admin session/capability; Head Office HOD identity needs separate auth boundary. |
| H8 | Current Daily Summary or export logic may use booking-level pax per room. | supported | Admin Comparison and WhatsApp Agents found `b.adults`/`b.children` used per room line. |
| H9 | Current data may not store per-room pax clearly enough. | partially supported | Rooming Data Agent found `booking_rooms.room_config` can store per-room pax, but legacy/null rows rely on inferred splits. |
| H10 | Missing per-room pax must be captured, not guessed. | supported | Rooming Data Agent found current fallback divides booking totals across rooms, which is not authoritative. |
| H11 | Current booking flow does not capture per-room configuration. | supported | Rooming Data Agent found no dedicated per-stay Double/Twin-style configuration field. |
| H12 | Room metadata may not define allowed configurations or may not expose them to UI. | partially supported | Room metadata has `pax_config` bed/capability data, but no confirmed allowed stay-configuration list for dropdowns. |
| H13 | WhatsApp export lacks required rooming format fields. | supported | WhatsApp Agent found missing required title, room config, stay night, status, and notes. |
| H14 | A shared summary/export formatter may prevent admin/HOD drift. | supported | Admin and WhatsApp agents found client-side WhatsApp text and separate CSV route with divergent transformations. |

## Wave 1 Contradictions

- Phase 5 investigation prose says only Head Office can view private guest names; current policy/tests include HQ Reception, Housekeeping, and Main Gate as private-name-visible departments.
- Phase 5 investigation prose says HOD change-request route exports POST only; current tests require `GET`.
- v2.12 closeout says no v2.13. Joshua's current instruction explicitly opens Phase 7 as v2.12 maintenance, so Phase 7 remains in v2.12 and does not create v2.13.

## Stop Conditions

- Credentials needed.
- Dev data writes needed.
- Production checks needed.
- Source edits or migrations needed.
- Private data would need broader exposure.
