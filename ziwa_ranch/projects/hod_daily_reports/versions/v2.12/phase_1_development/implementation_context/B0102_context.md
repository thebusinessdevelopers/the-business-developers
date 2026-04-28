# B-01 / B-02 — Implementation context: Meeting attendance (Head Office + mode)

## Item summary

Add Florence, Julie, Faith, and Isaac to the admin meeting form's core attendee list, and persist an optional per-attendee `attendance_mode` (`phone` | `in_person`) inside the existing `hod_meetings.attendance` jsonb — no DB migration required.

## Files to change

| File | What changes | Function / type name |
|------|--------------|----------------------|
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/config/meetings.ts` | Append four Head Office usernames to `CORE_ATTENDEE_USERNAMES` so they surface in `allCoreAttendees` | `CORE_ATTENDEE_USERNAMES` (39–54) |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/types/index.ts` | Add optional `attendance_mode?: 'phone' \| 'in_person'` (snake_case matches `department_slug` at line 226) | `MeetingAttendee` (223–228) |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/meetings/MeetingForm.tsx` | New state for per-attendee mode; restore on edit; defaults (`phone` when username starts with `headoffice.`, `in_person` otherwise); include `attendance_mode` in the attendance payload; add a mode control inside each attendance row | `useEffect` restore (187–208), attendance row UI (456–486, insert between name block and status buttons), submit payload build (267–275) |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/meetings/MeetingDetailView.tsx` | Show mode alongside the attendee name when `attendance_mode` is set (em-dash + "Phone" / "In person") | Attendance grid map (252–259) |

No change required in `admin-portal/types/index.ts` (re-exports shared types only — `types/index.ts:1`).

## DB migration required

N — `hod_meetings.attendance` is `jsonb`; the new `attendance_mode` key merges transparently. No backfill (absence = no mode set, safe default behaviour).

## Dependencies

None.

## Complexity

S — config allowlist + one optional type field + a per-row control and defaults; no schema change and no new API wiring (attendance is passed through at `admin-portal/app/api/meetings/route.ts:66` and `[id]/route.ts:52`).

## Validation steps

1. As an admin with `meeting_manage`, open Meetings and start a new meeting — Florence, Julie, Faith, and Isaac appear in the Attendance list alongside the existing operational HODs (`MeetingForm.tsx:179–184` after allowlist update).
2. For each attendee set status and mode; submit; open Meeting Detail View — every attendee line shows the mode when present (`MeetingDetailView.tsx:252–259`).
3. Edit a meeting created before this change — absence of `attendance_mode` does not break the form or detail view (optional field semantics).
4. Inspect a saved `hod_meetings.attendance` row — each entry contains `user_id`, `hod_name`, `department_slug`, `status`, and optionally `attendance_mode`.

## Evidence

- Attendee list is built from a static allowlist, not a runtime query: `MeetingForm.tsx:179–184` filters `hodUsers` through `CORE_ATTENDEE_USERNAMES` and `adminUsers` through `CORE_ADMIN_ATTENDEE_USERNAMES` (both defined in `packages/shared/config/meetings.ts:39–59`).
- Florence / Julie / Faith / Isaac are **not** in `CORE_ATTENDEE_USERNAMES` today. Required additions: `headoffice.florence`, `headoffice.julie`, `headoffice.faith`, `headoffice.isaac`.
- `department_slug` resolves automatically from `departments.find(d => d.id === u.department_id)?.slug` at `MeetingForm.tsx:267–274`. Head Office users are already linked to the `head-office` department in `portal/supabase/migrations/012_v2_3_schema.sql:49–52`, so the slug resolves naturally once they are in the attendee list.
- `MeetingAttendee` in `packages/shared/types/index.ts:223–228` uses snake_case (`department_slug`, line 226); `attendance_mode` matches this convention and the jsonb field name recommended in investigation `B1_B2_meeting_attendance.md:65–76`.
- API routes pass `body.attendance` straight to Supabase without shape validation — no backend change needed.
- Alternative (if preferred over editing `CORE_ATTENDEE_USERNAMES`): derive attendees via `hodUsers.filter(u => u.username.startsWith('headoffice.') || CORE_ATTENDEE_USERNAMES.includes(u.username))` and dedupe. The constant update is the smaller diff.
