# Phase 7 Discovery Context

STATUS: scoping

## Approval Boundary

Wave 0 and Wave 1 only are approved. This context records read-only static diagnosis and documentation updates.

## Wave 1 Agent Roster

| Agent | Scope | Status |
| --- | --- | --- |
| Policy Agent | HOD policy, guards, booking modal, HOD accommodation APIs, change-request rejection. | complete - CONCERNS |
| Admin Comparison Agent | Admin booking delete, Daily Summary, WhatsApp/export, admin auth. | complete - CONCERNS |
| Rooming Data Agent | Booking schema, `booking_rooms`, pax storage, room config metadata. | complete - CONCERNS |
| WhatsApp Export Agent | WhatsApp text generation, fields, sorting, privacy. | complete - FAIL |
| Regression Agent | Tests and historical traps around delete requests, campsite, Daily Summary, rooming. | complete - CONCERNS |

## Wave 1 Evidence Summary

### Policy Agent

- Status: `CONCERNS`.
- Head Office policy supports direct management and disallows change requests.
- HOD manager modal still sends deletion requests to `/api/accommodation/change-requests`.
- Change-request route returns `403` for Head Office because `canSubmitChangeRequest` is false.
- No inspected HOD booking `[id]` `DELETE` handler exists.

### Admin Comparison Agent

- Status: `CONCERNS`.
- Admin direct delete is a `DELETE` route that hard-deletes `bookings` after activity logging.
- Admin route requires admin session and `accommodation_manage`.
- Admin Daily Summary and WhatsApp copy use admin-authenticated route/component.
- Daily Summary and WhatsApp use booking-level pax, not per-room `room_config`.

### Rooming Data Agent

- Status: `CONCERNS`.
- Booking-level pax lives on `bookings.adults` and `bookings.children`.
- Per-room pax can live in `booking_rooms.room_config` when basket data is saved.
- Legacy/null `room_config` paths use inferred splits, which are not trustworthy.
- Unit capability metadata exists, but no dedicated per-stay configuration field is confirmed.

### WhatsApp Export Agent

- Status: `FAIL` against Phase 7 P7-06.
- WhatsApp text is generated client-side in admin `DailySummary.tsx`.
- Existing text supports bold asterisk syntax.
- Required title and fields are missing.
- Current output uses booking-level pax per room line.

### Regression Agent

- Status: `CONCERNS`.
- Good coverage exists for change-request sanitisation/classification, admin delete review, shared-capacity static source contracts, and campsite availability guards.
- Missing coverage exists for WhatsApp copy, multi-room per-room pax, room configuration, and runtime Daily Summary/overlap behaviour.
- Phase 5 investigation prose is partly stale compared with current policy and tests.

## Recommended Next Action

Wave 2 planning has now produced a controlled reproduction plan at `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_7_head_office_booking_authority/execution_context/03_phase_7_reproduction_plan_context.md`.

Recommended next action: Joshua should review the plan, provide missing safe dev-preview credentials and the selected Head Office account if appropriate, then decide whether to approve execution with the exact token `APPROVED: phase_7_dev_sandbox_writes`.

## Stop Conditions

Stop before execution. Do not create, edit, delete, cancel, approve, or deny any booking; do not submit change requests; and do not perform dev-preview data writes unless Joshua gives `APPROVED: phase_7_dev_sandbox_writes`.

## Wave 2 Reproduction Plan Summary

Wave 2 started as planning-only, then Joshua approved dev-preview execution with `APPROVED: phase_7_dev_sandbox_writes`. Approved API-level reproduction has now partially executed, with all created test bookings cancelled.

The plan defines:

- Head Office delete authority checks proving whether Head Office still routes through `/api/accommodation/change-requests` or a direct HOD-authenticated delete path.
- Regression checks for `reception.emilly`, `housekeeping.anita`, and optionally `maingate.jjuko`, preserving approval-gated change requests.
- Daily Summary access checks proving whether Head Office has a HOD-authenticated rooming view without broad admin access.
- Room-level pax checks for equal multi-room allocation, uneven allocation, one-night and multi-night stays, tentative and confirmed statuses, notes and no-notes output, and campsite/shared-capacity behaviour where safe.
- Room configuration checks that distinguish proved room capability metadata from unproved selectable stay configurations.
- WhatsApp export checks against the required `*DD MONTH YYYY - ZIWA ROOMING*` format and one occupied-room line per occupied room.
- Cleanup and evidence-capture rules that forbid secrets, broad guest lists, and real-booking mutation.

Runtime evidence now captured:

- Head Office delete still posts through `/api/accommodation/change-requests` and returns `403` with `Your department cannot submit change requests.`
- `reception.emilly`, `housekeeping.anita`, and `maingate.jjuko` pass the change-request department guard and reach request validation.
- `fnb.howard` cannot create bookings and receives `403`.
- Head Office HOD Daily Summary API path returns `404`; unauthenticated admin Daily Summary returns `401`.
- Equal, uneven, and multi-night Head Office test bookings saved per-room `booking_rooms.room_config` values and were cancelled during cleanup.

## Wave 2 Execution Approval

Joshua approved dev-preview execution on 2026-05-16.

Approved non-secret inputs:

- Selected Head Office account: `headoffice.florence`.
- Approved accounts: `headoffice.florence`, `reception.emilly`, `housekeeping.anita`, `maingate.jjuko`, and `fnb.howard`.
- Dev-preview HOD URL: `https://dev--hoddailyreports.netlify.app`.
- Dev-preview admin URL for admin-only comparison checks: `https://dev--hod-admin-portal.netlify.app`.
- Dev-preview DB read checks are approved for redacted evidence.
- Cleanup is mandatory.

Approved write token:

```text
APPROVED: phase_7_dev_sandbox_writes
```

Passwords must not be recorded in documentation or evidence.
