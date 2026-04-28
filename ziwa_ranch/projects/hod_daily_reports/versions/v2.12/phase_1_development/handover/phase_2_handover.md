# Phase 2 — Handover

> **Scope:** Form + logic fixes per `plan.md` §§2.1–2.10. Builds on the Phase 1 schema. Ten items actioned in a single coherent change-set.
> **Build status:** `tsc --noEmit` clean in both `admin-portal/` and `portal/`; `eslint` clean on all modified files.
> **No DB migrations.** All runtime code only — Phase 1 schema (Augustu `pricing_type`, chalet pax, rate corrections, A-Frame rename) already live.

---

## a. What was done

### A-02 — Per-room complimentary toggle (`M`)

- `RoomBasketItem` gains `isComplimentary: boolean` and optional `compReason?: string`.
- `calculateItemRate` returns `0` for complimentary rows; `calculateBasketRate` skips them when aggregating nightly/grand totals.
- Admin `BookingForm.tsx` basket row: checkbox + optional reason input; per-row total displays `$0` when flagged.
- Portal `BookingManagerModal.tsx` mirrors the toggle with the same behaviour.
- Portal `/api/accommodation/bookings` POST: `agreed_rate_per_night` derivation excludes complimentary rows.
- Portal `/api/accommodation/bookings/approve` POST: fallback per-night sum excludes complimentary rows.
- `booking_rooms.room_config` (jsonb) carries the new keys transparently; no DDL.

### A-03 — Per-person pricing branch (`M`)

- `PricingType = 'flat' | 'per_person'` exported; `AccommodationUnit.pricing_type` now required; `RoomBasketItem.pricing_type` propagated.
- Per-person branch added to `calculateItemRate` and `calculateBasketRate`: nightly = `adults × adult_rate + children × child_rate` (falls back to flat when `pricing_type` is absent/flat).
- Basket constructors (`addRoom`, default effect, edit rebuild) in both admin `BookingForm.tsx` and portal `BookingManagerModal.tsx` copy `pricing_type` from the unit; existing rows load the unit's `pricing_type` when missing.
- `pricing_type` added to the four typed `accommodation_units(…)` projections:
  - `admin-portal/app/api/accommodation/bookings/route.ts` (list)
  - `admin-portal/app/api/accommodation/bookings/[id]/route.ts` (by id)
  - `portal/app/api/accommodation/route.ts` (bookings + units selects)
  - `portal/app/api/accommodation/bookings/[id]/route.ts` (by id)
- UI badge "per person" surfaces on per-person rows in both booking forms.

### A-05 — Admin pax soft override (`M`)

- `validateAccommodationWrite` accepts `adminOverride?: boolean`. When `true`, bypasses per-room cap checks (107–130) and `validateOccupancy` (133–136). All other validations (room existence, overlap, active status) remain strict.
- Guard SELECT now includes `pricing_type` so returned units match the expanded type.
- Admin POST (`/api/accommodation/bookings`) and PUT (`/api/accommodation/bookings/[id]`) extract `adminPaxOverride` from the body and forward it.
- `BookingForm.tsx` `handleSubmit` scans per-room caps and aggregate totals before `fetch`; when any breach is detected, `window.confirm` lists the offending rooms and the user must confirm to send `adminPaxOverride: true`.
- HOD portal routes (`portal/app/api/accommodation/bookings/route.ts`, `[id]/route.ts`) do **not** forward the flag — HOD pax validation remains hard-reject.

### A-06 — Rate-display verification (`XS`)

- No code change. Phase 1.3 (`044_v212_a06_rate_corrections.sql`) already applied; booking form's check-in-year rate lookup now surfaces the corrected rates (Karungi FB STO $300, Single Room BB $85, A-Frame 2026 BB rack $300, camping STO 2026 = $20, 2027 superior reverts).
- Manual smoke deferred to post-deploy.

### A-07 — Admin year selector (`S`)

- `AccommodationClient.tsx` adds `selectedYear` state (default `new Date().getFullYear()`).
- New `<select>` above the tab strip populated from the distinct years present in `rates`.
- Collapsible rates reference (`<details>`) renders the year-filtered `rates` as a compact table (category / meal / type / adult / child).
- `BookingForm` still receives the full `rates` array — nightly suggestions remain `check_in`-driven.

### A-08 — Config constant check (`XS`)

- Grep for `Alfajiri|Kilele|Nyota|Upeo` across `4_development/` returns hits only in `portal/supabase/migrations/` (historical) and `next_chat_handover.md`. No runtime constant change required.

### B-01 / B-02 — Meeting attendance (`S`)

- `CORE_ATTENDEE_USERNAMES` in shared `meetings.ts` appended with `headoffice.florence`, `headoffice.julie`, `headoffice.faith`, `headoffice.isaac` (Head Office department slug resolves naturally).
- `MeetingAttendee` gains optional `attendance_mode?: 'phone' | 'in_person'`.
- `MeetingForm.tsx`: new `attendanceMode` state; defaults `phone` for `headoffice.*` users and `in_person` otherwise; restored from saved meeting; per-row phone/in-person toggle buttons beside each attendee; `attendance_mode` included in submitted payload only when set.
- `MeetingDetailView.tsx` renders ` — Phone` or ` — In person` after the attendee name when `attendance_mode` is present.
- `hod_meetings.attendance` is jsonb; no DDL.

### C-01 — Server guard, client retry, and lag banner (`S`)

- `portal/app/api/submit-report/route.ts`: before the duplicate check at line 242, the route parses optional `confirm_offset`, computes `(Kampala today) − report_date` in whole days, and when `lagDays >= 1` without the flag returns `400` with `{ error, needsConfirmOffset: true, lagDays }`. ≥ 2-day lag yields a stronger message but the same response shape; both paths succeed when `confirm_offset: true` is supplied.
- `FormRenderer.tsx` submit handler detects `needsConfirmOffset`, prompts via `window.confirm`, then retries the same body with `{ confirm_offset: true }`. Retains all existing error handling (duplicate, queued, network).
- Non-blocking lag banner renders beneath the date selector when `reportDate` is ≥ 1 day behind Kampala today, amber for 1 day, red for ≥ 2 days.
- `useSubmissionQueue.ts` retries queued submissions with `confirm_offset: true` automatically when the server responds with `needsConfirmOffset` — offline/queued reports from stuck departments self-heal on replay.
- Optional `DepartmentHub.tsx` banner not applied; server guard + `FormRenderer` banner already cover the pre-submit UX surface.

### E-01 — Auto-save queue guard (`XS`)

- `FormRenderer.tsx` queue-success callback now guards on three conditions before calling `clearDraft` / `onSuccess`:
  1. `item.departmentId === departmentId`
  2. `item.reportDate === reportDate`
  3. `normaliseSubmitter(item.submittedBy) === normaliseSubmitter(submittedBy)` (trim + lower-case)
- `useSubmissionQueue.ts`, `QueuedSubmission`, and parent call-sites unchanged.

---

## b. File index

### Shared (`packages/shared/`)

- `types/index.ts` — `PricingType`, `AccommodationUnit.pricing_type`, `RoomBasketItem.{pricing_type, isComplimentary, compReason?}`, `MeetingAttendee.attendance_mode?`.
- `config/accommodation.ts` — complimentary-skip + per-person branch in `calculateBasketRate` and `calculateItemRate`.
- `config/meetings.ts` — four `headoffice.*` usernames appended to `CORE_ATTENDEE_USERNAMES`.
- `lib/accommodation-guards.ts` — `AccommodationWriteValidationInput.adminOverride?`; per-room caps + aggregate `validateOccupancy` skipped when set; guard SELECT now includes `pricing_type`.

### Admin portal (`admin-portal/`)

- `app/accommodation/BookingForm.tsx` — pricing_type / isComplimentary / compReason threaded through constructors; complimentary toggle UI; per-row `$0` when comp; pax breach detection + `window.confirm` + `adminPaxOverride` in payload.
- `app/accommodation/AccommodationClient.tsx` — year selector + collapsible rates reference table.
- `app/api/accommodation/bookings/route.ts` — GET projection adds `pricing_type`; POST forwards `adminPaxOverride`.
- `app/api/accommodation/bookings/[id]/route.ts` — GET projection adds `pricing_type`; PUT forwards `adminPaxOverride`.
- `app/meetings/MeetingForm.tsx` — `attendanceMode` state, defaults, restore on edit, per-row phone/in-person buttons, payload inclusion.
- `app/meetings/MeetingDetailView.tsx` — `attendance_mode` rendering after the em-dash.

### Portal (`portal/`)

- `app/api/submit-report/route.ts` — Kampala-lag offset guard before duplicate check.
- `app/api/accommodation/route.ts` — `pricing_type` added to both bookings projections + the units select.
- `app/api/accommodation/bookings/route.ts` — `agreed_rate_per_night` excludes complimentary rows.
- `app/api/accommodation/bookings/[id]/route.ts` — GET projection adds `pricing_type`.
- `app/api/accommodation/bookings/approve/route.ts` — fallback per-night sum excludes complimentary rows.
- `app/report/[slug]/BookingManagerModal.tsx` — pricing_type / isComplimentary threaded through constructors; complimentary toggle UI; per-row `$0` when comp.
- `app/report/[slug]/RoomsTab.tsx` — `PortalUnit.pricing_type?` added; `calendarUnits` maps include `pricing_type` default.
- `components/FormRenderer.tsx` — E-01 three-condition guard + C-01 confirm-offset retry + lag banner.
- `hooks/useSubmissionQueue.ts` — transparent retry with `confirm_offset: true` when the server demands confirmation on a replayed item.

---

## c. Validation summary

| Check | Result |
|---|---|
| `tsc --noEmit` admin-portal | Pass (0 errors) |
| `tsc --noEmit` portal | Pass (0 errors) |
| `eslint` on all modified files | Clean (0 errors; pre-existing warnings unchanged) |
| Grep `Alfajiri|Kilele|Nyota|Upeo` outside migrations | 1 match — `next_chat_handover.md` (documentation); zero runtime hits |
| Shared-type compatibility across admin-portal, portal, packages/shared | Verified via `tsc` in both apps |
| HOD-portal pax strictness preserved | Confirmed — only admin POST + PUT forward `adminPaxOverride` |
| C-01 guard placement | Before line 242 duplicate check — fast-fail, no extra round-trips |

End-to-end smokes (Phase 2 validation steps 3–5 in `plan.md`) are deferred to manual post-deploy testing on staging.

---

## d. Open items / follow-ups

- **Manual smokes (post-deploy):**
  - A-01 — sign-in as `admin.isaac` and confirm Room Management access.
  - A-06 — confirm Karungi FB STO = $300, Single Room BB = $85, A-Frame BB = $300 on 2026 check-in.
  - A-08 — Mvule/Musambya/Mugavu/Mukooge visible in admin Room Management and HOD Rooms tab.
  - A-02/A-03/A-05 end-to-end: Augustu per-person booking; multi-room with one complimentary; chalet over-capacity confirm flow.
  - B-01/B-02 — meeting form with Florence/Julie/Faith/Isaac and phone/in-person mode.
  - C-01 — old-dated report triggers confirm dialog; offline queue replays cleanly.
- **Optional DepartmentHub banner** (C-01 checklist item 39) not applied; revisit if lag-on-navigation UX is still found wanting after deploy.
- **Decision Log** — commit SHAs to be recorded on commit of this change-set.
- **Approval gate** — awaiting `APPROVED: phase_2_complete` from Joshua before any Phase 3 work.
