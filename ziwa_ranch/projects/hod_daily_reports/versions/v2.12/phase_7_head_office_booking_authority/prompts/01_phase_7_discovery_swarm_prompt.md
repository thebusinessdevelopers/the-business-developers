# Phase 7 Discovery Swarm Prompt

STATUS: scoping

## Mission

Run Wave 1 read-only static diagnosis for v2.12 Phase 7 Head Office booking authority, Daily Summary access, room-level pax accuracy, room configuration handling, and WhatsApp rooming export correctness.

## Hard Limits

- Read-only source/document inspection only.
- Do not edit files.
- Do not write data.
- Do not call production.
- Do not run migrations.
- Do not push, deploy, or commit.
- Do not expose secrets, cookies, auth headers, passwords, or unnecessary private guest data.

## Required Return Format

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

## Agents

### Policy Agent

Inspect HOD shared policy, guards, Rooms tab, booking modal, HOD accommodation APIs, booking `[id]` route, and change-request route. Determine Head Office intended authority, UI routing, API support, and why Head Office fails while HQ Reception/Housekeeping succeed.

### Admin Comparison Agent

Inspect admin booking CRUD, BookingForm, AccommodationClient, DailySummary, daily-summary API, export API, and admin auth. Determine how admin direct delete, Daily Summary, WhatsApp/export, pax mapping, and room configuration currently work.

### Rooming Data Agent

Inspect shared package, HOD accommodation code, admin accommodation code, and local Supabase/migration files. Determine booking-level pax, room-level pax, room assignments, notes, meal plan, status, room configuration, and room capability metadata.

### WhatsApp Export Agent

Inspect admin DailySummary, daily-summary API, export API, HOD RoomsTab, and BookingManagerModal. Determine where WhatsApp text is generated and what is missing from Joshua's required format.

### Regression Agent

Inspect existing tests and prior investigations. Determine current coverage, missing tests, and regressions to protect for Head Office, HQ Reception, Housekeeping, Main Gate, campsite/shared-capacity rows, Daily Summary, WhatsApp export, multi-room pax, and room configuration.
