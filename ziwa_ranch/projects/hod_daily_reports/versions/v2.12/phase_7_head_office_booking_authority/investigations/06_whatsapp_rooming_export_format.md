# WhatsApp Rooming Export Format Investigation

STATUS: scoping

## Question

Where is the WhatsApp rooming message generated, and what changes are needed for Joshua's required format?

## Required Format

```text
*DD MONTH YYYY - ZIWA ROOMING*

Obama: Asigma Group (1 pax, Single, BB, 1/1 nights, tentative & no notes)
```

Each occupied room line must include:

- Room name.
- Guest/group name.
- Pax in that individual room.
- Room configuration.
- Meal plan.
- Current/total stay night.
- Booking status.
- Room notes.

## Required Evidence

- Client-side or server-side export generation location.
- Existing included fields.
- Missing fields.
- Sorting rules.
- Private guest policy effects.
- Whether output can share a formatter across admin and Head Office.

## Findings

Wave 1 status: `FAIL` against the required Phase 7 format.

Wave 2 runtime status: `BLOCKED` for clipboard output, with source failure still supported.

- WhatsApp rooming text is generated client-side in admin `DailySummary.tsx` by `buildWhatsAppText()`.
- It is copied via `navigator.clipboard.writeText(...)`.
- Existing output already uses asterisks for WhatsApp bold, so `*15 MAY 2026 - ZIWA ROOMING*` is the compatible convention.
- Current title is two lines: `*ZIWA RANCH — ROOMING LIST*` and `*{formatted date}*`, not the required single line.
- Current occupied-room lines include room name, guest name, booking-level pax, and meal plan.
- Missing fields: per-room pax, room configuration, current/total stay night, booking status, and room notes.
- The daily-summary API selects `check_in`, `check_out`, `status`, and `special_notes`, but current WhatsApp text does not use stay-night/status/notes.
- The daily-summary API does not select `booking_rooms.room_config`, so room-level pax/configuration/notes are unavailable to the formatter.
- CSV export is a separate server route and not the same transformation.

Wave 2 runtime evidence:

- Head Office has no HOD Daily Summary API path; `GET /api/accommodation/daily-summary` returned `404`.
- No Head Office WhatsApp rooming control was visible in the Head Office Rooms tab.
- Admin Daily Summary runtime/clipboard output was not executed because no admin account was approved.
- Runtime booking probes proved per-room `room_config` can carry pax, meal plan, and notes that a future formatter should use.

## Fix Planning Notes

Preferred direction:

1. Build one shared rooming formatter that accepts a normalised occupied-room row.
2. Feed it per-room data from `booking_rooms.room_config`, including pax, meal plan, and room notes.
3. Add stay-night calculation from `check_in`, `check_out`, and selected summary date.
4. Include booking status and constrained room configuration once the room-configuration source of truth is defined.
5. Use the formatter in both admin Daily Summary and the new Head Office Daily Summary path.
6. Add tests for title format, occupied-room filtering, equal and uneven pax, one-night/multi-night stay display, notes/no-notes wording, and privacy redaction boundaries.

Wave 3 codebase fix investigation update:

- Current WhatsApp text is only assembled in `DailySummary.tsx` by `buildWhatsAppText()`.
- The admin Daily Summary API currently omits `booking_rooms.room_config`, so the formatter cannot yet receive per-room pax, room meal plan, or room notes.
- Recommended location for a shared formatter is the shared package, for example `@hod/shared/lib/rooming-whatsapp`, exported through the existing shared package export map.
- The formatter should be pure and browser-independent so it can be unit-tested without admin credentials, clipboard access, or deployments.
- The formatter should accept already-normalised occupied-room rows, not raw booking rows.
- Required row inputs should include summary date, unit label, guest/group label, room adults, room children, room configuration label if available, meal plan, check-in, check-out, status, notes, and stable ids for sorting.
- Guest/group labels should already be privacy-filtered before formatting; the formatter should not contain auth policy.
- `no notes` should be literal for blank notes.
- The first sandbox fix should decide whether to keep current building section headers and footer totals or to output only the required title plus occupied-room lines.

## Privacy Notes

Current WhatsApp text exposes guest names but not booking notes. The Phase 7 requirement adds room notes, so any future formatter must avoid secrets, auth data, cookies, and unnecessary private information in generated text or evidence samples.
