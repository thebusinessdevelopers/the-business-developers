# HOD Daily Reports — Version 1.8 Snapshot

> **Purpose:** Point-in-time record of Version 1.8. Documents all changes from v1.6.
>
> **Built on:** 16 March 2026
> **Deployed:** 16 March 2026
> **Status:** Live at [hoddailyreports.netlify.app](https://hoddailyreports.netlify.app)
> **Final commit:** `322fff0`
> **Base version:** v1.6 (see `versions/v1.6/snapshot.md`)

---

## What v1.8 is

A reliability and operations-focused release. Diagnosed and fixed a critical system-wide submission failure, added error infrastructure, moved drafts to the database, built a full review workflow, introduced HOD inline editing with audit trails, redesigned the HOD landing page, and polished the dashboard with review dots, timezone fixes, admin date changes, and report deletion.

---

## Feature summary

### P0: Critical submission bug fix

- Root cause: `INSERT ... RETURNING id` requires a `SELECT` RLS policy on the target table. The `anon` role had `INSERT` but not `SELECT` on `hod_daily_reports`, causing PostgreSQL to rollback the entire transaction silently — reports were lost, not saved.
- Fix: Added `SELECT` RLS policy for `anon` on `hod_daily_reports`.
- Validated live with real submissions.

### Error infrastructure

- New `hod_error_log` table with RLS for anonymous inserts
- Client-side error classification in `FormRenderer` — categorises errors by code (RLS, duplicate, network, unknown) with specific user-facing messages
- Server-side logging via `/api/log-error` API route
- Dashboard page at `/dashboard/errors` for monitoring submission errors

### Database drafts

- Drafts moved from `localStorage` to a dedicated `hod_drafts` table
- Auto-saves every 30 seconds via `useRef` debounce
- Unique index on `(department_id, report_date, draft_by)` — one draft per HOD per date
- Cleared on successful submission

### Dynamic deadline badge

- The "on time" badge under the date now dynamically updates based on current Kampala time
- Shows "Submit before 12:00 today", "Submit before 12:00 tomorrow", or "Late" as appropriate
- Refreshes every 60 seconds via `setInterval`

### Monday-only stock counts

- F&B bar stock and Store stock sections are greyed out on non-Mondays
- Fields become read-only with an informational note: "Stock count is due on Monday"
- Logic computed inside `FormRenderer` — consistent across submit, HOD edit, and admin edit forms

### HOD inline editing from submission area

- HODs can navigate to a previous date and see their submitted report pre-populated
- "Already submitted" banner with an Edit button
- Edit window until 12:00 Kampala time the next day (changed from 8 PM in v1.6)
- All edits tracked in `edit_history` JSONB column
- No-change detection prevents empty edit entries

### Dashboard review system

- Replaced the simple "Mark as reviewed" button with a structured review form
- Reviewer selects their role from a dropdown (Managing Director, General Manager, Someone else)
- Optional comments field
- Review status persisted via `/api/review-report` API route
- Edits automatically clear review status, prompting re-review

### Three-colour review dot system

- Reports dashboard uses coloured dots next to department names:
  - **Green** — reviewed
  - **Amber** — edited since last review, needs re-review
  - **Red** — not reviewed
- Colour legend displayed above the reports table

### HOD department landing page redesign

- When all due reports are submitted, the department page shows a status overview instead of a blank form
- Displays: "All reports due submitted", next deadline date/time, and mini-cards for the last 3 days of reports
- Each card shows submission status, review status, and edit eligibility
- "Submit new report" button to open the form manually

### Admin date change

- "Change date" button on report detail page
- Date picker with conflict detection (prevents duplicate dates per department)
- Changes logged in `edit_history` as Admin entries
- API route `/api/change-report-date` with service-role client

### Admin report deletion

- "Delete report" button on report detail page with two-stage confirmation
- Stage 1: warning message, text input requiring the department name to be typed
- Stage 2: confirm button only enables when input matches (case-insensitive)
- API route `/api/delete-report` with server-side department name verification

### Branding

- All instances of "Ziwa Ranch" updated to "Ziwa Rhino And Wildlife Ranch" across the portal (site title, headers, alt text, footer)

### Form changes

| Department | Changes |
|---|---|
| **Main Gate** | Removed "Mobile Money Balance" section (Jjuko does not have access) |

### F&B crash fix

- Legacy report data stored repeater fields (dishes, bar stock) as plain strings
- `FormRenderer` now guards repeater values with `Array.isArray()` — non-array values treated as empty arrays
- Fixes client-side crash when loading old F&B reports

---

## Database changes from v1.6

### Migration: `005_v18_schema.sql`

**New table: `hod_error_log`**

| Column | Type | Purpose |
|---|---|---|
| id | uuid, PK | Error entry ID |
| created_at | timestamptz | When the error occurred |
| department_id | text | Which department |
| report_date | text | Which report date |
| error_code | text | PostgreSQL/Supabase error code |
| error_message | text | Full error message |
| payload | jsonb | Submitted data that failed |

**New table: `hod_drafts`**

| Column | Type | Purpose |
|---|---|---|
| id | uuid, PK | Draft ID |
| department_id | uuid | Department reference |
| report_date | date | Draft date |
| draft_by | text | HOD name |
| draft_data | jsonb | Saved form values |
| updated_at | timestamptz | Last auto-save |

**Unique index:** `hod_drafts(department_id, report_date, draft_by)`

**New column on `hod_daily_reports`:**

| Column | Type | Purpose |
|---|---|---|
| review_comments | text, nullable | Admin review comments |

**New RLS policies:**
- `hod_daily_reports` — anon select (fixes INSERT ... RETURNING)
- `hod_error_log` — anon insert + select
- `hod_drafts` — anon insert, select, update, delete

---

## New files

| Path | Purpose |
|---|---|
| `app/api/log-error/route.ts` | Client error logging endpoint |
| `app/api/review-report/route.ts` | Review status persistence |
| `app/api/change-report-date/route.ts` | Admin date change endpoint |
| `app/api/delete-report/route.ts` | Admin report deletion with name verification |
| `app/dashboard/errors/page.tsx` | Error monitoring page |
| `app/dashboard/reports/[id]/ChangeDateButton.tsx` | Date change UI component |
| `app/dashboard/reports/[id]/DeleteReportButton.tsx` | Two-stage delete UI component |
| `supabase/migrations/005_v18_schema.sql` | All v1.8 schema changes |

## Modified files

| Path | Changes |
|---|---|
| `types/index.ts` | Added `review_comments` to `DailyReport` |
| `config/forms.ts` | Removed Mobile Money Balance from Main Gate |
| `components/FormRenderer.tsx` | Error classification, DB drafts, dynamic badge, Monday stock logic, inline editing, repeater type guard, edit clears review |
| `lib/submission-status.ts` | `getDeadlineBadge()` function, edit window changed to 12:00 |
| `app/layout.tsx` | Rebrand to Ziwa Rhino And Wildlife Ranch |
| `app/page.tsx` | Rebrand (header, alt text, footer) |
| `app/dashboard/LoginForm.tsx` | Rebrand (header, alt text) |
| `app/dashboard/layout.tsx` | Rebrand (alt text), Errors nav link |
| `app/dashboard/reports/page.tsx` | Kampala timezone on formatTime, three-colour dot system with legend, edited_at column |
| `app/dashboard/reports/[id]/page.tsx` | ChangeDateButton, DeleteReportButton, review_comments passed to ReviewForm |
| `app/dashboard/reports/[id]/AcknowledgeButton.tsx` | Rewritten as ReviewForm with reviewer dropdown and comments |
| `app/report/[slug]/page.tsx` | Rebrand, landing page redesign with status overview |
| `app/report/[slug]/ReportForm.tsx` | Landing redesign states, recent reports fetch, checkmark fix |
| `app/report/[slug]/edit/[id]/page.tsx` | Rebrand, edit window uses 12:00 |
| `app/report/[slug]/edit/[id]/EditReportForm.tsx` | Removed mondayOnly filtering, checkmark fix |
| `app/dashboard/reports/[id]/edit/AdminEditForm.tsx` | Removed mondayOnly filtering, checkmark fix |

---

## Commits

| Commit | Description |
|---|---|
| `c79888a` | v1.8: fix submission bug, error infra, drafts in DB, review system, HOD editing, landing redesign |
| `209073e` | v1.8 refinements: F&B crash fix, review dots, admin date change, timezone, polish |
| `322fff0` | v1.8 final: admin report deletion, rebrand to Ziwa Rhino And Wildlife Ranch |

---

## Architecture notes

### Error handling
- Client-side errors are classified by PostgreSQL error code before displaying to the user
- `42501` (RLS violation), `23505` (duplicate key), and network errors each get specific user-facing messages
- All errors are logged server-side to `hod_error_log` via API route, decoupled from the submission flow

### Draft storage
- Moved from `localStorage` to Supabase `hod_drafts` table for persistence across devices
- Auto-save uses `useRef` to debounce at 30-second intervals
- Drafts are upserted (not duplicated) using the unique index on `(department_id, report_date, draft_by)`

### Review workflow
- Three-state system: unreviewed (red), edited-needs-rereview (amber), reviewed (green)
- Editing a reviewed report clears `acknowledged_at`, `acknowledged_by`, and `review_comments`
- This forces admins to re-review after HOD changes

### Edit window
- Changed from 8 PM to 12:00 noon Kampala time the day after `report_date`
- Consistent across HOD inline edit, HOD edit page, and admin edit (admin has no time restriction)

### Admin deletion
- Two-stage UI confirmation prevents accidental deletion
- Server-side verification matches department name before allowing delete
- Uses service-role client to bypass RLS

---

*Snapshot frozen: 16 March 2026. Verified live. v1.8 complete.*
