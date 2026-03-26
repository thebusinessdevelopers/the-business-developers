# HOD Daily Reports — Version 2.0 Snapshot

> **Purpose:** Point-in-time record of Version 2.0. Documents all changes from v1.9.
>
> **Built on:** 25 March 2026
> **Phase B added:** 25 March 2026
> **Phase C added:** 25 March 2026
> **Phase D added:** 26 March 2026
> **Phase E added:** 26 March 2026
> **Phase F added:** 26 March 2026
> **Status:** v2.0 complete. Both portals live — HOD at [hoddailyreports.netlify.app](https://hoddailyreports.netlify.app), Admin at [hod-admin-portal.netlify.app](https://hod-admin-portal.netlify.app).
> **Base version:** v1.9 (see `versions/v1.9/snapshot.md`)

---

## What v2.0 is

Six phases of the v2 rebuild:

- **Phase A** — Custom authentication with a multi-step login picker, a guest ("Someone else") flow for substitute workers, five new HOD substitute accounts, and a complete separation of the admin dashboard into its own standalone application.
- **Phase B** — Two-stage HOD hub replacing the linear form flow. Smart date buttons guide HODs to the right report. Submissions moved server-side. Edit window extended to 6 PM. New read-only report viewer.
- **Phase C** — Admin portal bug fixes (compliance timezone, rate formula, today threshold), batch review, date change merged into admin edit, WhatsApp compliance message, admin report view using FormRenderer in readOnly mode, submission-status sync.
- **Phase D** — Connectivity resilience. Dual-write drafts (Supabase + localStorage), submission queue with automatic retry on reconnect, connectivity banner. No PWA or service worker.
- **Phase E** — Form updates. Housekeeping form replaced with a fixed 20-room grid grouped by building, with conditional fields based on Vacant/Occupied status. Kitchen form extended with a near-expired items repeater. New `room_grid` field type added to the config-driven form system.
- **Phase F** — Documentation. Updated all stale project documentation (context.md, project_summary.md, build_rules.md), created operational guides for HODs and admins in `5_operation/`, finalised snapshot and handover.

---

## Phase A feature summary

### Custom authentication system

- Three new database tables: `hod_users`, `hod_sessions`, `hod_activity_log`
- Passwords stored as bcrypt hashes (via `pgcrypto` in Postgres, `bcryptjs` for verification in Node)
- Session tokens (random hex) stored in `hod_sessions` with 24-hour expiry
- httpOnly, secure, sameSite `lax` cookies for session management
- Server-side auth library (`lib/auth.ts`) with: `hashPassword`, `verifyPassword`, `createSession`, `validateSession`, `destroySession`, `logActivity`, `getCurrentUser`
- All auth operations use the service-role Supabase client (bypasses RLS)

### Multi-step login picker

- Replaces the old free-text username input with a guided three-step flow
- **Step 1 — Department:** Grid of 15 department buttons sourced from `config/login-users.ts`
- **Step 2 — Name:** If multiple users in a department, shows name buttons; single-user departments skip straight to password
- **Step 3 — Password:** Password input with the selected user's name and department displayed
- Username is constructed automatically from the selection (e.g. picking Kitchen then Richard sets username to `kitchen.richard`)
- Back navigation at every step; state resets cleanly

### Guest login ("Someone else")

- Every department offers a "Someone else" option — either as a button in the name list (multi-user departments) or as a link on the password screen (single-user departments)
- Guest enters their name as free text, no password required
- `POST /api/auth/guest-login` sets an `hod_guest` cookie (httpOnly, JSON: `{ slug, name, ts }`, 12-hour expiry)
- Guests can access `/report/[slug]` only — no other routes
- Guest logins are recorded in `hod_activity_log` with `user_id: null` and action `guest_login`
- Guests do not get session timers (no idle timeout, no daily auto-logout)

### Session management

- **Idle timeout:** 30 minutes of inactivity triggers logout (configurable per user via `idle_timeout_minutes`)
- **Daily auto-logout:** 6 PM Kampala time forced logout (configurable via `logout_time`)
- **Martine exempt:** `auto_logout_enabled: false` — stays logged in through idle and daily cutoffs
- Client-side hook (`useSessionTimer`) tracks mouse/keyboard/touch activity, polls `/api/auth/session` every 5 minutes
- `SessionGuard` component wraps report pages for authenticated users only

### Route protection (middleware)

- `middleware.ts` runs on all routes except `/login`, `/api/*`, `/_next/*`, static assets
- Two cookies checked: `hod_session` (authenticated) and `hod_guest` (guest)
- `/report/*` allows either cookie
- All other protected routes require `hod_session`
- Unauthenticated requests redirect to `/login?redirect={path}`

### New substitute HOD accounts

Five new accounts created in migration 007, all with password `ziwa2026`:

| Username | Department | Person |
|---|---|---|
| `kitchen.richard` | Kitchen | Richard (2IC) |
| `reception.carol` | HQ Reception | Carol |
| `wildlife.wycliff` | Wildlife | Wycliff |
| `accounts.halima` | Accounts | Halima |
| `craftshop.patience` | Craft Shop | Patience |

### Password display column

- `password_display` (text, nullable) added to `hod_users`
- Populated with `ziwa2026` for all users
- Provides admin-visible password reference without exposing hashes

### Admin portal separation

The admin dashboard has been extracted into a completely separate Next.js application at `4_development/admin-portal/`.

**Authentication:** Simple password-gate using `ADMIN_PASSWORD` environment variable. HMAC-SHA256 cookie (`admin_auth`), 24-hour expiry. No individual user accounts or sessions.

**Pages:**

| Route | Purpose |
|---|---|
| `/` | Overview: KPI cards, today's per-department submission status, 7/30-day rates (Kampala-aware, Sunday-excluding) |
| `/reports` | Filterable table with review dots, CSV export, batch review |
| `/reports/[id]` | Report detail with FormRenderer readOnly view, acknowledge, edit, delete |
| `/reports/[id]/edit` | Admin edit form via FormRenderer, with inline date change |
| `/stock` | Stock reconciliation for F&B and Store |
| `/compliance` | Per-department compliance bars over configurable periods |
| `/errors` | Error log feed from `hod_error_log` |

**API routes** (all use service-role Supabase client):

| Route | Purpose |
|---|---|
| `POST /api/review-report` | Set acknowledgement fields (single report) |
| `POST /api/batch-review-reports` | Batch review — accepts `reportIds[]`, single DB update |
| `POST /api/change-report-date` | Change report date with duplicate check |
| `POST /api/delete-report` | Delete with department name confirmation |
| `POST /api/harvest-items` | Upsert repeater items into `hod_item_library` |
| `GET /api/item-suggestions/[slug]` | Autocomplete suggestions |

---

## Phase B feature summary

### Two-stage HOD hub

The HOD flow changed from a linear path (form with date picker) to a two-stage hub:

1. **Hub page** (`/report/[slug]`) — shows smart date buttons, recent reports with status badges, edit countdowns, and view/edit links. Server-rendered for fast loading.
2. **Form page** (`/report/[slug]/new?date=YYYY-MM-DD`) — receives a locked date from the URL. No date picker in the form. Submits via server API.

### Smart date buttons

Time-aware buttons that surface the most relevant dates based on Kampala time:

| Kampala time | Primary | Secondary | Tertiary |
|---|---|---|---|
| 00:00–15:59 | Yesterday | Today | 2 days ago (if no report) |
| 16:00–23:59 | Today | Yesterday | 2 days ago (if no report) |

Buttons for dates that already have a submitted report show "Submitted" with View and Edit links instead of a "Report for..." action.

### Same-day warning modal

If an HOD taps "Report for today" before 4 PM Kampala time, a confirmation modal appears with two choices: "Report for today" or "Report for yesterday instead". This prevents accidental same-day submissions when yesterday's report was the intended target.

### Server-side submission

New submissions go through `POST /api/submit-report` instead of direct browser-to-Supabase inserts. The API route:

- Validates the session (or guest cookie)
- Inserts into `hod_daily_reports` with `submitted_by_user_id`
- Handles Monday stock writes (`hod_verified_stock`) if applicable
- Fires harvest-items internally
- Logs the submission to `hod_activity_log`

### Edit window extended to 6 PM

`isWithinEditWindow()` deadline changed from 12:00 noon to 18:00 (6 PM) the day after `report_date`. All user-facing text updated accordingly.

### Edit countdown

New `EditCountdown` component displays "Edit closes in Xh Ym" on both the hub page and the recent reports list. Updates every 60 seconds via `setInterval`.

### Read-only report viewer

New route `/report/[slug]/view/[id]` renders any submitted report in read-only mode using `FormRenderer` with all fields disabled. Shows submission metadata, review status, and an edit link if the edit window is still open.

### Draft management extracted

Draft load/save/clear logic extracted from FormRenderer into `hooks/useDraftManager.ts`. The hook handles:

- Loading drafts from `hod_drafts` when a form mounts
- 30-second debounced auto-save
- Manual save via "Save Draft" button
- Clearing drafts on successful submission

### FormRenderer refactored

- Uses `useDraftManager` hook instead of inline draft logic
- Calls `/api/submit-report` for new submissions instead of direct Supabase insert
- Accepts `lockedDate` prop (hides date picker, displays formatted date)
- Accepts `readOnly` prop (disables all fields, hides submit/draft buttons)
- Fixed UTC/Kampala date inconsistency in default date calculation
- `getSmartDateButtons()` helper added to `submission-status.ts`
- `getEditTimeRemaining()` helper added to `submission-status.ts`

---

## Phase C feature summary

### Admin submission-status sync

The admin portal's `lib/submission-status.ts` was synced with the HOD portal version. This brings the 6 PM edit window (was 12:00 noon), and adds `getKampalaMinute`, exported `getKampalaDateStr`, `getEditTimeRemaining`, and `getSmartDateButtons`.

### Shared helper: `getExpectedReportingDays()`

New function added to `admin-portal/lib/submission-status.ts`. Accepts a date range and returns an array of expected reporting day strings, excluding:

- Sundays (day of rest — no reports expected)
- Today, if Kampala time is before 4 PM (too early to count as missed)

Uses noon UTC anchoring to avoid timezone-boundary date shifts. Used by both the compliance page and the overview page.

### Bug fix: Compliance timezone

`admin-portal/app/compliance/page.tsx` previously computed `fromDate` and `today` using `toISOString().split('T')[0]` (UTC). At times like 1 AM Kampala (22:00 UTC previous day), "today" would be yesterday.

Fixed to use `getKampalaDateStr(new Date())` for today and Kampala-aware date arithmetic for the from-date. The inline expected-dates loop was replaced with `getExpectedReportingDays()`.

### Bug fix: Rate formula on Overview page

`admin-portal/app/page.tsx` previously divided unique submission days by flat 7 and 30 (including Sundays), producing rates that didn't match the compliance page.

Fixed to use `getExpectedReportingDays()` for both the 7-day and 30-day windows, and uses Kampala-aware dates throughout.

### Bug fix: Today threshold

Both the compliance page and overview page now exclude today from expected reporting days until 4 PM Kampala time. Before this fix, today was always counted, causing departments to appear as "missed" before they'd had a reasonable chance to submit.

### Batch review on Reports page

The reports table was extracted into a new client component (`app/reports/ReportsTable.tsx`) to support interactive batch operations. Features:

- Checkbox per unreviewed report row
- "Select all unreviewed" toggle in the header
- Batch review bar appears when reports are selected, with reviewer picker (Managing Director / General Manager / Someone else), optional comments, and submit button
- New API route `POST /api/batch-review-reports` accepts `reportIds[]` and updates all in a single Supabase call
- After success, `router.refresh()` reloads server data

### Date change merged into admin edit

The standalone `ChangeDateButton` on the report detail page has been removed. Date change is now part of the admin edit form:

- A date input at the top of `AdminEditForm.tsx`, pre-filled with the current report date
- If the date is changed, the form calls `/api/change-report-date` before saving form data
- Shows an amber warning when the date differs from the original
- `ChangeDateButton.tsx` deleted

### WhatsApp compliance message

New client component `app/compliance/WhatsAppComplianceButton.tsx` on the compliance page. Generates a plain-text compliance summary and copies it to clipboard via `navigator.clipboard.writeText()`.

Format:

```
*HOD Daily Reports — Compliance Summary*
19 Mar – 25 Mar 2026 (7 days, 6 reporting days)

Electrical: 6/6 (100%)
Kitchen: 5/6 (83%) — 1 missed
...

*Overall: 78/90 (87%)*
```

Uses WhatsApp-compatible bold markers (`*text*`). Falls back to `document.execCommand('copy')` if the Clipboard API is unavailable. Shows a "Copied!" confirmation for 2 seconds.

### Admin HOD View

The report detail page (`app/reports/[id]/page.tsx`) now renders submitted reports using `FormRenderer` in `readOnly` mode instead of a custom label/value list. This gives admins the identical layout that HODs see, including proper repeater rendering, checkbox groups, and section structure.

`readOnly` support was added to the admin portal's `FormRenderer.tsx` (it was missing — the portal version had it but the admin copy didn't).

### Dead file cleanup

- `admin-portal/app/reports/[id]/ChangeDateButton.tsx` — deleted (merged into admin edit)
- `portal/app/report/[slug]/ReportForm.tsx` — deleted (superseded by DepartmentHub + NewReportForm in Phase B)

---

## Phase D feature summary

### Dual-write draft manager

`hooks/useDraftManager.ts` now writes to both Supabase and localStorage on every draft save. localStorage is written first (synchronous, always available), then Supabase is attempted. If Supabase is unreachable, the draft survives in localStorage with no error shown to the user.

On page load, both sources are checked. If both contain a draft, the one with the newer `updated_at` timestamp wins. If Supabase is unreachable, the localStorage draft is used silently.

When connectivity returns (browser `online` event), the hook compares the local draft's timestamp against Supabase and pushes if local is newer.

Draft localStorage keys use `hod_draft:{departmentId}:{reportDate}` — no session reference, so drafts survive logout.

### Submission queue

When `POST /api/submit-report` fails with a network error during a new submission, the full payload is saved to localStorage under `hod_submit_queue` with a unique ID and timestamp. The form shows a green confirmation: "Your report has been saved and will submit automatically when you're back online."

`hooks/useSubmissionQueue.ts` listens for the browser `online` event and retries all pending items after a 2-second delay. On success or 409 (duplicate — report already exists), the item is removed from the queue and the draft is cleared. On continued network failure, the item stays in the queue for the next reconnect attempt.

Edit-mode submissions (updating an existing report) are not queued — only new submissions, since edits use the client-side Supabase client directly.

### Connectivity banner

`components/ConnectivityBanner.tsx` is a sticky top banner on all authenticated report pages (added to `app/report/layout.tsx`). Two states:

- **Offline** (red): "You're offline. Drafts are saved locally."
- **Pending queue** (amber): "N report(s) pending — will submit when you're back online." (shown while online if the queue is non-empty)

Disappears when online and the queue is empty.

### localStorage helpers

`lib/local-storage.ts` provides typed, namespaced helpers for drafts and the submission queue. All functions gracefully handle localStorage being unavailable (private browsing, storage quota exceeded). Key patterns:

- Drafts: `hod_draft:{departmentId}:{reportDate}` — stores `{ data: DraftData, updatedAt: string }`
- Queue: `hod_submit_queue` — stores `QueuedSubmission[]` with ID, payload, and `queuedAt` timestamp

### Connectivity hook

`hooks/useConnectivity.ts` wraps `navigator.onLine` and `online`/`offline` window events. Returns `{ isOnline: boolean, onReconnect: (callback) => cleanup }`. Used by the connectivity banner.

### No database changes

Phase D is entirely client-side. No new migrations, no schema changes, no new Supabase tables or columns.

---

## Phase E feature summary

### New field type: `room_grid`

The config-driven form system gained a new field type `room_grid` alongside the existing `text`, `textarea`, `number`, `repeater`, `checkbox_group`, and `select` types. This field type renders a fixed list of named items (rooms) grouped by category (building), each with a status selector and conditional sub-fields.

The `FieldType` union in `types/index.ts` was extended in both the portal and admin portal.

### Housekeeping: 20-room grid

The Housekeeping form was completely restructured. The old free-text repeater (`room_status`) and manual occupancy counters (`guest_arrivals`, `guest_departures`, `rooms_occupied`, `vacant_rooms`) were replaced with a fixed grid of 20 named rooms grouped by four buildings.

**Room data** is defined in `config/rooms.ts`:

| Building | Rooms (20 total) |
|---|---|
| Guest House 1 (5) | Augustu, Obama, Sonic, Malaika, Nguzo |
| Guest House 2 (6) | Lavender, Iris, Violet, Orange, Neem Tree, Neem Tree Dorm |
| Chalets (7) | Karungi (1), Barungi (2), Kirungi (3), Murungi (4), The Family (5), The Clan (6), The Tribe (7) |
| Tents (2) | Pundamilia, Twiga |

**Each room** has:

- A mandatory status selector: Vacant or Occupied
- **Vacant** shows only an optional notes field
- **Occupied** shows a required condition selector (Good / Needs attention / Out of order), optional damages field, and optional notes field
- Colour-coded cards: blue border for occupied, green for vacant, grey for unset

**Validation** requires every room to have a status selected, and every occupied room to have a condition chosen. A live occupied/vacant counter is displayed above the grid.

**Data shape** in JSONB (`report_data.rooms`):

```json
{
  "augustu": { "status": "occupied", "condition": "Good", "damages": "", "notes": "" },
  "obama": { "status": "vacant", "notes": "Deep cleaned" }
}
```

The Laundry and Notes sections were kept unchanged. The old Occupancy section was removed — occupied/vacant counts are now derived from the room data.

### Kitchen: near-expired items

A new repeater section "Near-Expired Items" was added to the Kitchen form between "Stock Used Today" and "Daily Food Cost". This allows kitchen staff to flag items approaching expiry.

Sub-fields: item, expiry date, quantity remaining, unit, suggested use, notes. The section is optional (`min_rows: 0`) — it appears as "No entries yet. Add one below." until the user adds a row.

All existing Kitchen functionality (Monday stock count, stock added, stock used, daily food cost calculation hint, on duty checkboxes) is unchanged.

### Legacy report handling

Old Housekeeping reports (submitted before Phase E) use the previous data format with `room_status` (repeater array) and occupancy fields. New reports use the `rooms` object from the room grid.

The admin portal detects the format by checking for `room_status` vs `rooms` in the report data. Legacy reports are rendered using `LEGACY_HOUSEKEEPING_CONFIG` (a frozen copy of the old Housekeeping form config exported from `config/forms.ts`), which uses the original repeater-based layout. New reports are rendered using the current config with `RoomGrid`.

This detection is applied in both the report detail page (`/reports/[id]`) and the admin edit page (`/reports/[id]/edit`).

### Admin portal sync

All Phase E changes were synced to the admin portal:

- `config/rooms.ts` — copied
- `components/RoomGrid.tsx` — copied
- `types/index.ts` — `room_grid` added to `FieldType`
- `config/forms.ts` — Housekeeping config updated, Kitchen near-expired section added, `LEGACY_HOUSEKEEPING_CONFIG` exported
- `components/FormRenderer.tsx` — `room_grid` handling added in `renderField()` and readOnly rendering section
- `app/reports/[id]/page.tsx` — legacy format detection added
- `app/reports/[id]/edit/page.tsx` — legacy format detection added

### No database changes

Phase E is entirely application-level. No new migrations, no schema changes. Form data structure changes are handled within the existing `report_data` JSONB column.

---

## Database changes from v1.9

### Migration: `006_v2_schema.sql`

**New table: `hod_users`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| username | text, unique, not null | Format: `department.firstname` |
| password_hash | text, not null | bcrypt hash |
| department_id | uuid FK -> hod_departments | |
| hod_name | text, not null | Display name |
| role | text, not null, default `'hod'` | `'hod'` or `'admin'` |
| auto_logout_enabled | boolean, default true | false for Martine |
| logout_time | text, default `'18:00'` | Kampala timezone cutoff |
| idle_timeout_minutes | integer, default 30 | |
| created_at | timestamptz | |

**New table: `hod_sessions`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK -> hod_users | |
| token | text, unique | Session token in cookie |
| device_info | jsonb | User agent, screen, platform |
| ip_address | text | |
| created_at | timestamptz | |
| last_active_at | timestamptz | Updated on validated requests |
| expires_at | timestamptz | 24 hours from creation |

**New table: `hod_activity_log`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK -> hod_users, nullable | null for guest events |
| action | text, not null | `login`, `logout`, `guest_login`, `report_submitted`, etc. |
| metadata | jsonb | Device info, IP, department, report_id, etc. |
| created_at | timestamptz | |

**New column on `hod_daily_reports`:** `submitted_by_user_id` (uuid FK -> hod_users, nullable — null for legacy v1.x reports).

**RLS:** All three auth tables have RLS enabled with no public policies — accessed exclusively via service-role client.

### Migration: `007_v2_substitute_users_and_password_display.sql`

- Inserts 5 new substitute user accounts (see table above)
- Adds `password_display` text column to `hod_users`
- Populates all existing users with `ziwa2026`

No new database migrations for Phases B, C, D, or E — all changes are application-level.

---

## New files

### Phase A — HOD portal (`4_development/portal/`)

| Path | Purpose |
|---|---|
| `lib/auth.ts` | Auth utility library (hash, verify, sessions, activity log) |
| `config/login-users.ts` | Login picker roster — departments, slugs, users |
| `hooks/useSessionTimer.ts` | Client-side idle/daily logout + session polling |
| `components/SessionGuard.tsx` | Wrapper that activates session timer for authenticated users |
| `app/login/page.tsx` | Multi-step login picker UI |
| `app/api/auth/login/route.ts` | Username/password authentication endpoint |
| `app/api/auth/logout/route.ts` | Session destruction endpoint |
| `app/api/auth/session/route.ts` | Session health check (client polls this) |
| `app/api/auth/guest-login/route.ts` | Guest login endpoint (no password) |
| `app/report/layout.tsx` | Auth gate for report pages (session or guest cookie) |
| `supabase/migrations/006_v2_schema.sql` | Auth tables, user seeding |
| `supabase/migrations/007_v2_substitute_users_and_password_display.sql` | New accounts, password display |

### Phase A — Admin portal (`4_development/admin-portal/`) — entire new project

| Path | Purpose |
|---|---|
| `app/layout.tsx` | Root layout with HMAC auth gate |
| `app/actions.ts` | Login/logout server actions |
| `app/LoginForm.tsx` | Password login form |
| `app/LogoutButton.tsx` | Logout button |
| `app/page.tsx` | Overview dashboard |
| `app/reports/page.tsx` | Reports list with filters |
| `app/reports/[id]/page.tsx` | Report detail with actions |
| `app/reports/[id]/edit/page.tsx` | Admin report edit |
| `app/stock/page.tsx` | Stock reconciliation |
| `app/compliance/page.tsx` | Compliance tracking |
| `app/errors/page.tsx` | Error log viewer |
| `netlify.toml` | Netlify build config |
| Plus all shared: `components/*`, `config/*`, `lib/*`, `types/*` | Copied from portal |

### Phase B — HOD portal

| Path | Purpose |
|---|---|
| `hooks/useDraftManager.ts` | Draft load/save/clear hook extracted from FormRenderer |
| `components/EditCountdown.tsx` | Live countdown showing time remaining in edit window |
| `app/api/submit-report/route.ts` | Server-side report submission (auth, insert, stock, harvest, activity log) |
| `app/report/[slug]/DepartmentHub.tsx` | Client component: smart date buttons, recent reports, warning modal |
| `app/report/[slug]/new/page.tsx` | Server page: validates date, checks for duplicates, renders form |
| `app/report/[slug]/new/NewReportForm.tsx` | Client wrapper around FormRenderer with locked date and success screen |
| `app/report/[slug]/view/[id]/page.tsx` | Server page: fetches report, renders read-only view with metadata |
| `app/report/[slug]/view/[id]/ViewReportContent.tsx` | Client wrapper rendering FormRenderer in readOnly mode |

### Phase C — Admin portal

| Path | Purpose |
|---|---|
| `app/reports/ReportsTable.tsx` | Client component: report table with checkboxes, batch review bar |
| `app/api/batch-review-reports/route.ts` | Batch review endpoint — accepts `reportIds[]`, single DB update |
| `app/compliance/WhatsAppComplianceButton.tsx` | Generates compliance summary text, copies to clipboard |

### Phase D — HOD portal

| Path | Purpose |
|---|---|
| `lib/local-storage.ts` | Typed localStorage helpers for drafts and submission queue |
| `hooks/useConnectivity.ts` | Online/offline state hook wrapping browser events |
| `hooks/useSubmissionQueue.ts` | Queue management: add, retry on reconnect, pending count |
| `components/ConnectivityBanner.tsx` | Sticky banner showing offline/pending status |

### Phase E — HOD portal

| Path | Purpose |
|---|---|
| `config/rooms.ts` | Room definitions: 20 rooms in 4 building groups, with names and slugs |
| `components/RoomGrid.tsx` | Room grid component: grouped cards, status selector, conditional Vacant/Occupied fields, readOnly mode |

### Phase E — Admin portal

| Path | Purpose |
|---|---|
| `config/rooms.ts` | Room definitions (copy from portal) |
| `components/RoomGrid.tsx` | Room grid component (copy from portal) |

## Modified files

### Phase A

| Path | Changes |
|---|---|
| `app/page.tsx` | Replaced landing page with auth-aware redirect to `/report/[slug]` or `/login` |
| `middleware.ts` | Complete rewrite: dual cookie check (session + guest), removed dashboard handling |
| `app/report/layout.tsx` | Added guest cookie check alongside authenticated session check |

### Phase B (HOD portal)

| Path | Changes |
|---|---|
| `lib/submission-status.ts` | Edit window changed to 6 PM; added `getEditTimeRemaining()`, `getSmartDateButtons()`, exported `getKampalaDateStr` |
| `components/FormRenderer.tsx` | Uses draft hook; submits via API; accepts `lockedDate` and `readOnly` props; fixed UTC/Kampala date inconsistency |
| `app/report/[slug]/page.tsx` | Rewritten from simple form wrapper to department hub (server component with DepartmentHub) |
| `app/report/[slug]/edit/[id]/page.tsx` | Updated edit window message from "12:00" to "6:00 PM" |
| `middleware.ts` | Excludes all `/api/` routes from auth redirect (not just `/api/auth/`) |

### Phase C (admin portal)

| Path | Changes |
|---|---|
| `lib/submission-status.ts` | Synced with portal version (6 PM edit window, new helpers); added `getExpectedReportingDays()` |
| `app/compliance/page.tsx` | Fixed UTC timezone bug; uses Kampala dates and `getExpectedReportingDays()`; added WhatsApp button |
| `app/page.tsx` | Fixed rate formula; uses `getExpectedReportingDays()` instead of dividing by 7/30; Kampala dates throughout |
| `app/reports/page.tsx` | Extracted table into `ReportsTable` client component; passes pre-computed status data |
| `app/reports/[id]/page.tsx` | Removed `ChangeDateButton`; replaced manual field rendering with `FormRenderer` in readOnly mode |
| `app/reports/[id]/edit/AdminEditForm.tsx` | Added date input field; calls `/api/change-report-date` on save if date changed |
| `components/FormRenderer.tsx` | Added `readOnly` prop with dedicated read-only rendering path |

### Phase D (HOD portal)

| Path | Changes |
|---|---|
| `hooks/useDraftManager.ts` | Dual-write: localStorage first, then Supabase. Load picks newest by timestamp. Syncs local to Supabase on `online` event. Clear removes from both. |
| `components/FormRenderer.tsx` | Network errors during new submission now queue the payload instead of just showing an error. Shows green "queued" message. Auto-retry callback clears draft and calls `onSuccess`. |
| `app/report/layout.tsx` | Added `ConnectivityBanner` above children for both authenticated and guest sessions. |

### Phase E (HOD portal)

| Path | Changes |
|---|---|
| `types/index.ts` | Added `room_grid` to `FieldType` union |
| `config/forms.ts` | Housekeeping: replaced repeater + occupancy sections with `room_grid` field. Kitchen: added Near-Expired Items repeater section after Stock Used Today. |
| `components/FormRenderer.tsx` | Added `room_grid` branch in `renderField()` delegating to RoomGrid; added per-room validation in `validate()` |

### Phase E (admin portal)

| Path | Changes |
|---|---|
| `types/index.ts` | Added `room_grid` to `FieldType` union |
| `config/forms.ts` | Housekeeping config updated; Kitchen near-expired section added; `LEGACY_HOUSEKEEPING_CONFIG` exported for old-format reports |
| `components/FormRenderer.tsx` | Added `room_grid` branch in `renderField()` and readOnly rendering section |
| `app/reports/[id]/page.tsx` | Legacy Housekeeping detection: falls back to LEGACY_HOUSEKEEPING_CONFIG for old-format reports |
| `app/reports/[id]/edit/page.tsx` | Same legacy detection for admin edit page |

## Removed files (Phase C)

| Path | Reason |
|---|---|
| `admin-portal/app/reports/[id]/ChangeDateButton.tsx` | Date change merged into admin edit form |
| `portal/app/report/[slug]/ReportForm.tsx` | Dead file, superseded in Phase B |

## Removed files (Phase A — HOD portal)

| Path | Reason |
|---|---|
| `app/dashboard/layout.tsx` | Moved to admin portal |
| `app/dashboard/page.tsx` | Moved to admin portal |
| `app/dashboard/actions.ts` | Moved to admin portal |
| `app/dashboard/LogoutButton.tsx` | Moved to admin portal |
| `app/dashboard/LoginForm.tsx` | Replaced by login picker |
| `app/dashboard/reports/*` | Moved to admin portal |
| `app/dashboard/compliance/*` | Moved to admin portal |
| `app/dashboard/stock/*` | Moved to admin portal |
| `app/dashboard/errors/*` | Moved to admin portal |
| `app/api/delete-report/route.ts` | Moved to admin portal |
| `app/api/change-report-date/route.ts` | Moved to admin portal |
| `app/api/review-report/route.ts` | Moved to admin portal |

---

## Architecture notes

### Two applications, one database

The HOD portal and admin portal are independent Next.js projects sharing the same Supabase database. They share form definitions, type definitions, and rendering components (copied, not linked). Changes to shared config (e.g. adding a department form) must be applied to both projects.

### Two-stage HOD flow

Login -> Hub (`/report/[slug]`) -> Form (`/report/[slug]/new?date=...`) or View (`/report/[slug]/view/[id]`) or Edit (`/report/[slug]/edit/[id]`). The hub fetches recent reports server-side and renders smart date buttons client-side based on Kampala time.

### Server-side submissions

New report submissions go through `POST /api/submit-report` using the service-role Supabase client. This ensures `submitted_by_user_id` is set from the validated session and all activity is logged. Edits still use the client-side Supabase anon client (unchanged from v1.x).

### Dual auth model

The HOD portal uses a full session-based auth system with bcrypt passwords, database-backed sessions, idle timeouts, and scheduled logouts. The admin portal uses a single shared password with an HMAC cookie — no individual identity, no session store.

### Guest flow design

Guests bypass password authentication entirely. The `hod_guest` cookie provides department routing only — it carries no privileges beyond viewing and submitting on the assigned department's report page. Guests cannot access any other routes. The cookie expires after 12 hours.

### Login picker vs database

The `config/login-users.ts` file defines the UI roster (which buttons appear on the login page). The `hod_users` table defines who can actually authenticate. These must be kept in sync.

---

## Deployment state

| Application | Hosting | URL | Status |
|---|---|---|---|
| HOD Portal | Netlify (project `3e5bb9b4-c0b2-4031-9f28-0132cbb1d303`) | https://hoddailyreports.netlify.app | Live — auto-deploys from `thebusinessdevelopers/hod_daily_reports` `main` branch |
| Admin Portal | Netlify (project `d501089b-06cc-4d50-84eb-cb5ab4890b9b`) | https://hod-admin-portal.netlify.app | Live — deploys from `thebusinessdevelopers/hod_admin_portal` `main` branch |

### Environment variables (both sites)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side key for API routes |
| `ADMIN_PASSWORD` | Admin portal login (HOD portal no longer uses this) |

---

## Phase F feature summary

### Documentation updates

All stale project documentation was brought current with the v2.0 state:

- **`context.md`** — metadata updated to reflect all six phases complete. Folder structure updated to show new `5_operation/` contents. Recent changes section extended with Phase E and F entries. Stale `.cursor/plans/` reference removed from context loading.
- **`1_context/project_summary.md`** — updated from 13 to 15 departments, replaced the old free-text login flow with the login picker description, added the admin dashboard and compliance tracking, changed Vercel to Netlify, updated "What happens next" to reflect v2 complete and Phase 2 (WhatsApp) next.
- **`3_architecture/build_rules.md`** — renamed from "Phase 1 — Build Rules" to "Build Rules", updated department count to 15, added validation gate principle, reworked scope boundaries to reflect what has been built (auth, admin, offline) and what remains out of scope (PWA, WhatsApp, AI), updated deployment section for Netlify and two applications.

### New operational guides

- **`5_operation/hod_user_guide.md`** — plain-language guide for HODs covering login, submitting reports, saving drafts, editing submitted reports, offline behaviour, guest login, automatic logout, room grid (Housekeeping), and troubleshooting.
- **`5_operation/admin_guide.md`** — guide for Joshua and Wellington covering the admin dashboard: overview page, reviewing reports (single and batch), compliance tracking, WhatsApp message, stock reconciliation, editing and deleting reports, error log, and HOD account reference.

### No code or database changes

Phase F is purely documentation. No source code modified, no migrations, no deployments.

---

*Snapshot updated: 26 March 2026. v2.0 complete — all six phases (A, B, C, D, E, F) delivered.*
