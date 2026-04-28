# B-01 / B-02 — HOD meeting attendance expansion: investigation

**Items:** B-01 (Head Office attendees) + B-02 (Isaac)  
**Investigator:** Chat 1 parent agent  
**Date:** 20 Apr 2026  
**Status:** final

---

## Question

Do Florence, Julie, Faith, and Isaac exist as users, and does the meeting schema already support an attendance-type field per attendee?

---

## User existence

```
username           | hod_name | role  | admin_tier | admin_title         | is_active
headoffice.florence| Florence | hod   | null       | null                | true
headoffice.julie   | Julie    | hod   | null       | null                | true
headoffice.faith   | Faith    | hod   | null       | null                | true
headoffice.isaac   | Isaac    | hod   | null       | null                | true
admin.isaac        | Isaac    | admin | standard   | Head Office Manager | true
```

**All four required users exist.** Isaac also has an admin account; B-02 attendance should use `headoffice.isaac` (the HOD-portal identity) so meeting records treat him consistently with the other attendees.

---

## Meeting schema — `hod_meetings` table

Relevant columns:
```
attendance              jsonb
additional_attendees    jsonb
```

### Current `attendance` shape (sample row from 14 Apr 2026 meeting)

```json
[
  {
    "status": "present",        // "present" | "absent" | "apology"
    "user_id": "...",
    "hod_name": "Salim",
    "department_slug": "security"
  },
  ...
]
```

### Finding

- No `attendance_type` / `mode` / `presence_mode` field exists in the attendance element shape.
- The schema is flexible (jsonb), so adding a field requires **no DDL** — only a code change to the meeting form UI and the TypeScript type that reads/writes `attendance`.
- Head Office HODs (Florence/Julie/Faith/Isaac) are not currently included in the attendable list for regular meetings (they have no `department_slug` equivalent to the 16 operational HODs).

---

## Required changes

### 1. Extend the attendance element shape

Add an optional field:

```typescript
type AttendanceMode = 'in_person' | 'phone'

interface AttendanceEntry {
  status: 'present' | 'absent' | 'apology'
  user_id: string
  hod_name: string
  department_slug: string
  attendance_mode?: AttendanceMode  // NEW — default 'phone' for Head Office, undefined otherwise
}
```

### 2. Extend the attendable persons list

Either:
- (a) Add Florence, Julie, Faith, Isaac to the list of selectable attendees in the meeting form, with a virtual `department_slug` (e.g. `head-office`, which already appears in `hod_departments` review to confirm); or
- (b) Treat them as a separate "Head Office" group within the attendance UI.

**Recommendation:** option (a) with `department_slug = 'head-office'` — simplest. Chat 3 should confirm whether a `head-office` department row exists in `hod_departments` (16 rows exist per `list_tables`; check).

### 3. UI change

For each attendee row in the meeting form, render an additional toggle / select:
- Options: "In-Person" / "Phone"
- Default: "Phone" for Florence/Julie/Faith/Isaac; hidden or "In-Person"-default for the 16 operational HODs.

### 4. Admin meeting summary

Display attendance_mode alongside the name for any attendee where it is set (e.g. "Florence — Phone").

---

## Non-issues

- **No DDL migration** — jsonb handles new keys transparently.
- **Existing meeting rows** — the only row returned (14 Apr 2026) has no `attendance_mode` field, which is fine. Absence is interpreted as "In-Person" by default for operational HODs and does not break any existing view.

---

## File index

- DB table: `public.hod_meetings` (columns `attendance`, `additional_attendees` — both jsonb)
- DB table: `public.hod_departments` (16 rows — confirm whether `head-office` slug exists in Chat 3)
- DB table: `public.hod_users` — Florence/Julie/Faith/Isaac all present, is_active=true
- UI / form code (to locate in Chat 3): `admin-portal/app/hod-meetings/**` (likely path — confirm)
- Meeting summary view (to locate in Chat 3): same folder
