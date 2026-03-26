# v2 Build Handover

> **Purpose:** Everything you need to continue building HOD Daily Reports v2. Load this file, follow the context loading instructions, then continue from where we left off.
>
> **Updated:** 26 March 2026
> **Current version:** v2.0 complete — all six phases (A–F) delivered (HOD portal live at https://hoddailyreports.netlify.app)
> **Admin portal:** https://hod-admin-portal.netlify.app (Netlify site created, env vars set, deployment pending)

---

## How to load context

**Read these files in order before doing anything else:**

1. This file (you're reading it)
2. `context.md` — project overview, folder structure, technical state
3. `3_architecture/build_rules.md` — standards and principles (still apply)
4. `versions/v2.0/snapshot.md` — full record of what v2.0 Phases A, B, C, D, and E delivered

Then read the source files relevant to whichever phase you're building (listed per phase below).

---

## What v2 is

A major overhaul across six phases: authentication, a two-stage HOD hub, compliance and admin fixes, connectivity resilience, form updates for Housekeeping and Kitchen, and documentation. Every phase has a validation gate — tests that must pass before moving on.

---

## Where we are

| Phase | Status | Notes |
|---|---|---|
| **Phase A — Authentication** | **Complete** | Login picker, guest flow, session management, admin portal separated. |
| **Phase B — Two-Stage HOD Hub** | **Complete** | Smart date buttons, server-side submission, edit countdown, read-only view, edit window extended to 6 PM. |
| **Phase C — Compliance & Admin** | **Complete** | Timezone fixes, rate formula, batch review, date change in edit, WhatsApp message, admin HOD view. |
| **Phase D — Connectivity Resilience** | **Complete** | Dual-write drafts, submission queue with auto-retry, connectivity banner. |
| **Phase E — Form Updates** | **Complete** | Housekeeping 20-room grid, Kitchen near-expired items, legacy report handling. |
| **Phase F — Documentation** | **Complete** | All project docs updated, operational guides created, snapshot and handover finalised. |

---

## What Phase A delivered

Full detail in `versions/v2.0/snapshot.md`. Summary:

1. **Custom auth system** — `hod_users`, `hod_sessions`, `hod_activity_log` tables. bcrypt passwords, httpOnly session cookies, 24-hour expiry.
2. **Multi-step login picker** — Department grid -> Name buttons -> Password input. Replaces free-text username.
3. **Guest login ("Someone else")** — No password, `hod_guest` cookie, 12-hour expiry, report page access only.
4. **Session management** — 30-min idle timeout, 6 PM Kampala daily logout, Martine exempt. Client-side polling via `useSessionTimer`.
5. **Admin portal separation** — Standalone Next.js app with HMAC password gate. All dashboard pages, reports, stock, compliance, errors moved out of HOD portal.
6. **5 new substitute accounts** — kitchen.richard, reception.carol, wildlife.wycliff, accounts.halima, craftshop.patience.
7. **Password display column** — `password_display` on `hod_users` for admin reference.

---

## What Phase B delivered

1. **Department hub** — `/report/[slug]` is now a two-stage flow. Smart date buttons show primary/secondary/tertiary options based on Kampala time. Dates with existing reports show "Submitted" with view/edit links.
2. **Same-day warning modal** — Before 4 PM, pressing "Report for today" triggers a confirmation asking "Report for today" or "Report for yesterday instead".
3. **Server-side submission** — New submissions go through `POST /api/submit-report` which validates auth, inserts with `submitted_by_user_id`, handles stock, fires harvest-items, and logs to `hod_activity_log`.
4. **Locked date form** — `/report/[slug]/new?date=YYYY-MM-DD` pre-sets the date. No date picker in the form.
5. **Read-only view** — `/report/[slug]/view/[id]` renders any report with all fields disabled.
6. **Edit countdown** — `EditCountdown` component shows "Edit closes in Xh Ym", updates every 60s.
7. **Edit window extended** — Deadline moved from 12:00 noon to 6:00 PM the day after `report_date`.
8. **Draft hook extracted** — `hooks/useDraftManager.ts` handles load, auto-save (30s), manual save, and clear.
9. **FormRenderer refactored** — Uses draft hook, accepts `lockedDate` and `readOnly` props, fixed UTC/Kampala date inconsistency.

---

## What Phase C delivered

1. **Admin submission-status sync** — Admin portal's `lib/submission-status.ts` synced with portal version: 6 PM edit window, `getKampalaMinute`, exported `getKampalaDateStr`, `getEditTimeRemaining`, `getSmartDateButtons`.
2. **Shared helper** — `getExpectedReportingDays(fromStr, toStr)` added to `submission-status.ts`. Excludes Sundays and excludes today before 4 PM Kampala time. Used by both compliance and overview.
3. **Compliance timezone fix** — Compliance page now uses `getKampalaDateStr()` instead of UTC. Dates are Kampala-accurate at any hour.
4. **Rate formula fix** — Overview page uses `getExpectedReportingDays()` instead of dividing by flat 7/30. Rates now match compliance for the same period.
5. **Today threshold** — Today is excluded from expected reporting days until 4 PM Kampala time. No more false "missed" before HODs have had a chance to submit.
6. **Batch review** — Reports table extracted into `ReportsTable.tsx` client component with checkboxes, select-all-unreviewed, reviewer picker, and `POST /api/batch-review-reports` for a single DB call.
7. **Date change in edit** — `AdminEditForm.tsx` now has a date input at the top. Calls `/api/change-report-date` before saving if changed. `ChangeDateButton.tsx` deleted.
8. **WhatsApp compliance message** — "Copy WhatsApp message" button on compliance page generates a plain-text summary with department stats and overall rate. Copies to clipboard.
9. **Admin HOD View** — Report detail page uses `FormRenderer` in `readOnly` mode, giving admins the identical layout HODs see. `readOnly` prop added to admin FormRenderer.
10. **Dead file cleanup** — Deleted `admin-portal/.../ChangeDateButton.tsx` and `portal/.../ReportForm.tsx`.

---

## Two applications

### HOD Portal (`4_development/portal/`)

The HOD-facing reporting tool. Login picker -> Department hub -> Report form.

**Live at:** https://hoddailyreports.netlify.app
**Netlify project:** `3e5bb9b4-c0b2-4031-9f28-0132cbb1d303`
**Deploys from:** GitHub repo `thebusinessdevelopers/hod_daily_reports` (separate from this monorepo)

**Routes:**

| Route | Purpose |
|---|---|
| `/login` | Multi-step login picker |
| `/` | Redirect: authenticated -> `/report/[slug]`, else -> `/login` |
| `/report/[slug]` | Department hub: smart date buttons, recent reports, edit countdown |
| `/report/[slug]/new?date=YYYY-MM-DD` | New report form with locked date |
| `/report/[slug]/view/[id]` | Read-only report viewer |
| `/report/[slug]/edit/[id]` | Edit a submitted report (within edit window) |

**API routes:**

| Route | Purpose |
|---|---|
| `POST /api/auth/login` | Username/password login |
| `POST /api/auth/guest-login` | Guest login (no password) |
| `POST /api/auth/logout` | Session destruction |
| `GET /api/auth/session` | Session health check |
| `POST /api/submit-report` | Server-side report submission (auth, insert, stock, harvest, activity log) |
| `POST /api/harvest-items` | Upsert repeater items into library |
| `GET /api/item-suggestions/[slug]` | Autocomplete suggestions |
| `POST /api/log-error` | Client error logging |
| `GET /api/stock-projection/[slug]` | Stock projection calculation |

**Key files:**

| File | Purpose |
|---|---|
| `lib/auth.ts` | Auth library: hash, verify, sessions, activity log, getCurrentUser |
| `config/login-users.ts` | Login picker roster: 15 departments with slugs and user lists |
| `config/forms.ts` | All 15 department form configs (Housekeeping uses `room_grid`, Kitchen has near-expired items) |
| `config/rooms.ts` | 20 rooms in 4 building groups for Housekeeping room grid |
| `config/locations.ts` | Areas (7), zones (15), gates (10) from KML |
| `config/calculations.ts` | Auto-calculation rules per department |
| `types/index.ts` | All TypeScript interfaces |
| `hooks/useSessionTimer.ts` | Client-side idle/daily logout + session polling |
| `hooks/useDraftManager.ts` | Draft load/save/clear with dual-write (Supabase + localStorage) |
| `components/SessionGuard.tsx` | Activates session timer for authenticated report pages |
| `components/FormRenderer.tsx` | Config-driven form engine (drafts via hook, server submission, edits, stock, readOnly mode, submission queue, room grid) |
| `components/RoomGrid.tsx` | Housekeeping room grid: grouped cards, status selector, conditional Vacant/Occupied fields |
| `components/EditCountdown.tsx` | Live edit window countdown |
| `middleware.ts` | Route protection: session + guest cookie checks, excludes `/api/*` |
| `lib/submission-status.ts` | Kampala timezone timing, deadlines, edit window (6 PM), smart date buttons |
| `lib/local-storage.ts` | Typed localStorage helpers for drafts and submission queue |
| `hooks/useConnectivity.ts` | Online/offline state hook |
| `hooks/useSubmissionQueue.ts` | Submission queue with auto-retry on reconnect |
| `components/ConnectivityBanner.tsx` | Sticky banner for offline/pending status |
| `lib/supabase.ts` | Client-side Supabase (anon key) |
| `lib/supabase-server.ts` | Server-side Supabase (service role key) |
| `app/report/[slug]/DepartmentHub.tsx` | Smart date buttons, recent reports, same-day warning modal |
| `app/report/[slug]/new/NewReportForm.tsx` | Form wrapper with locked date + success screen |
| `app/report/[slug]/view/[id]/ViewReportContent.tsx` | Read-only FormRenderer wrapper |

### Admin Portal (`4_development/admin-portal/`)

The admin dashboard for reviewing reports, tracking compliance, managing stock, and viewing errors.

**URL:** https://hod-admin-portal.netlify.app
**Netlify project:** `d501089b-06cc-4d50-84eb-cb5ab4890b9b`
**Deployment:** Pending — site created, env vars set, CLI deploy was interrupted. Needs `netlify deploy --prod` from the admin-portal directory, or connect to a GitHub repo for auto-deploy.

**Authentication:** Single `ADMIN_PASSWORD` env var, HMAC cookie. No individual user identity.

**Routes:**

| Route | Purpose |
|---|---|
| `/` | Overview: KPI cards, today's submissions, rate bars (Kampala-aware, Sunday-excluding) |
| `/reports` | Filterable reports table with review dots, CSV export, batch review |
| `/reports/[id]` | Report detail: FormRenderer readOnly view, acknowledge, edit, delete |
| `/reports/[id]/edit` | Admin edit form with inline date change |
| `/stock` | Stock reconciliation for F&B and Store |
| `/compliance` | Per-department compliance bars, WhatsApp compliance message |
| `/errors` | Error log from `hod_error_log` |

**API routes:** `review-report`, `batch-review-reports`, `change-report-date`, `delete-report`, `harvest-items`, `item-suggestions/[slug]`

**Shared code (copied from portal):** `config/forms.ts`, `config/rooms.ts`, `config/calculations.ts`, `config/locations.ts`, `types/index.ts`, `lib/supabase.ts`, `lib/supabase-server.ts`, `lib/submission-status.ts`, all `components/*`.

---

## Technical state

| Service | Detail |
|---|---|
| Supabase project | `inidzwfjnkyinxhvbrdt` (EU West Frankfurt) |
| Supabase URL | `https://inidzwfjnkyinxhvbrdt.supabase.co` |
| DB timezone | `Africa/Kampala` |
| DB tables | `hod_departments` (15), `hod_daily_reports`, `hod_verified_stock`, `hod_item_library`, `hod_drafts`, `hod_error_log`, `hod_users`, `hod_sessions`, `hod_activity_log` |
| Frontend (HOD) | Next.js 16, Tailwind v4, React 19 — `4_development/portal/` |
| Frontend (Admin) | Next.js 16, Tailwind v4, React 19 — `4_development/admin-portal/` |
| HOD live URL | https://hoddailyreports.netlify.app |
| Admin live URL | https://hod-admin-portal.netlify.app |
| Repository (monorepo) | https://github.com/thebusinessdevelopers/the-business-developers |
| Repository (HOD deploy) | https://github.com/thebusinessdevelopers/hod_daily_reports |

### Database migrations (applied)

| File | Summary |
|---|---|
| `001_hod_reports_schema.sql` | Core: `hod_departments`, `hod_daily_reports`, RLS, department seeding |
| `002_verified_stock.sql` | `hod_verified_stock` for Monday baselines |
| `003_item_library.sql` | `hod_item_library` for autocomplete |
| `004_v16_schema.sql` | Edit history, unique report constraint, acknowledgements, verified stock status |
| `005_v18_schema.sql` | Anon select on reports, `hod_error_log`, `hod_drafts`, review comments |
| `006_v2_schema.sql` | Auth tables (`hod_users`, `hod_sessions`, `hod_activity_log`), user seeding |
| `007_v2_substitute_users_and_password_display.sql` | New substitute accounts, `password_display` column |

### Environment variables (set on both Netlify sites)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side key for API routes |
| `ADMIN_PASSWORD` | Admin portal password (`ziwajefes2005`) |

---

## HOD user accounts

All accounts use password `ziwa2026`. Usernames follow `department.firstname` pattern.

| Username | HOD Name | Department | Role | Auto-logout |
|---|---|---|---|---|
| `maingate.jjuko` | Jjuko | Main Gate | hod | yes |
| `reception.emilly` | Emilly | HQ Reception | hod | yes |
| `reception.patience` | Patience | HQ Reception | hod | yes |
| `reception.carol` | Carol | HQ Reception | hod | yes |
| `fnb.howard` | Howard | Food & Beverage | hod | yes |
| `fnb.oscar` | Oscar | Food & Beverage | hod | yes |
| `kitchen.sensio` | Sensio | Kitchen | hod | yes |
| `kitchen.richard` | Richard | Kitchen | hod | yes |
| `kitchen.safari` | Safari | Kitchen | hod | yes |
| `housekeeping.elly` | Elly | Housekeeping | hod | yes |
| `housekeeping.anita` | Anita | Housekeeping | hod | yes |
| `security.salim` | Salim | Security | hod | yes |
| `security.elia` | Elia | Security | hod | yes |
| `store.denis` | Denis | Store | hod | yes |
| `accounts.musoni` | Musoni | Accounts | hod | yes |
| `accounts.halima` | Halima | Accounts | hod | yes |
| `electrical.robert` | Robert | Electrical | hod | yes |
| `electrical.sekito` | Sekito | Electrical | hod | yes |
| `maintenance.david` | David | HQ Maintenance | hod | yes |
| `maintenance.francis` | Francis | HQ Maintenance | hod | yes |
| `drivers.kanja` | Kanja | Drivers & Mechanics | hod | yes |
| `drivers.roger` | Roger | Drivers & Mechanics | hod | yes |
| `plumbing.richard` | Richard | Plumbing | hod | yes |
| `plumbing.jonah` | Jonah | Plumbing | hod | yes |
| `it.benson` | Benson | IT | hod | yes |
| `wildlife.martine` | Martine | Wildlife | hod | **no** |
| `wildlife.wycliff` | Wycliff | Wildlife | hod | yes |
| `craftshop.halima` | Halima | Craft Shop | hod | yes |
| `craftshop.patience` | Patience | Craft Shop | hod | yes |
| `admin.joshua` | Joshua | (admin) | admin | yes |

---

## Key people

| Role | Person |
|---|---|
| Project owner | Joshua |
| General Manager | Wellington |
| IT (validates tech issues) | Benson |
| Wildlife (needs no auto-logout) | Martine |
| HODs | Robert, Emilly, Musoni, Sensio, Elly, Kanja & Roger, David, Howard, Salim, Denis, Jjuko, Richard, Benson, Martine, Halima |

---

## Known issues and pending items

1. **Admin portal deployment** — Netlify site `hod-admin-portal` is created with env vars set, but the production deploy was interrupted. Run `netlify deploy --prod` from the `admin-portal/` directory or connect to GitHub for auto-deploy.
2. **Admin login redirect** — The HOD portal's `/api/auth/login` route returns `redirectTo: '/dashboard'` for admin-role users, but there is no `/dashboard` route in the HOD portal (it was removed during cleanup). Admin users logging into the HOD portal should be redirected to `/report/[slug]` or the admin portal URL instead.
3. **Admin portal FormRenderer** — The admin portal's `FormRenderer.tsx` is a copy from before Phase B. It still uses direct Supabase inserts, does not have the draft hook, and calls `/api/log-error` which does not exist in the admin portal. The admin portal only uses FormRenderer for edits (not new submissions), so this is non-breaking but the copy is now out of sync. Phase C added `readOnly` support.
4. **Shared code sync** — The two applications share `config/forms.ts`, `config/rooms.ts`, `components/FormRenderer.tsx`, `components/RoomGrid.tsx`, `lib/submission-status.ts`, and other files as copies. Phase C synced `submission-status.ts`. Phase E synced `forms.ts`, `rooms.ts`, `RoomGrid.tsx`, and `types/index.ts`. `FormRenderer.tsx` remains structurally out of sync (admin version lacks draft hook and server-side submission but this is acceptable since admin only uses it for edits; both versions now handle `room_grid`).
5. **Admin API route auth** — Admin portal API routes (`delete-report`, `change-report-date`, `review-report`, `batch-review-reports`) do not verify the `admin_auth` cookie. They rely on the routes being behind the layout auth gate and non-discoverable.

---

## Phase C: Compliance & Admin — Complete

### What was built

Fixed three bugs (compliance timezone, rate formula, today threshold), added batch review, merged date change into admin edit, added WhatsApp compliance message, rendered report detail using FormRenderer in readOnly mode, synced submission-status.ts, and cleaned up dead files.

### Key files changed

| File | Change |
|---|---|
| `admin-portal/lib/submission-status.ts` | Synced with portal (6 PM edit window); added `getExpectedReportingDays()` |
| `admin-portal/app/compliance/page.tsx` | Kampala dates, `getExpectedReportingDays()`, WhatsApp button |
| `admin-portal/app/page.tsx` | Kampala dates, `getExpectedReportingDays()` for rate formula |
| `admin-portal/app/reports/page.tsx` | Extracted table to `ReportsTable.tsx` client component |
| `admin-portal/app/reports/ReportsTable.tsx` | Checkboxes, select-all, batch review bar |
| `admin-portal/app/api/batch-review-reports/route.ts` | Batch review endpoint |
| `admin-portal/app/reports/[id]/page.tsx` | FormRenderer readOnly, removed ChangeDateButton |
| `admin-portal/app/reports/[id]/edit/AdminEditForm.tsx` | Date input, calls change-report-date on save |
| `admin-portal/components/FormRenderer.tsx` | Added `readOnly` prop |
| `admin-portal/app/compliance/WhatsAppComplianceButton.tsx` | WhatsApp message generator |

### Validation gate C — passed

- [x] Electrical compliance matches actual submission count
- [x] Dashboard overview rates match compliance rates for the same period
- [x] Today is not counted as "missed" before 4pm Kampala time
- [x] WhatsApp message copies correctly formatted text to clipboard
- [x] Admin HOD View shows identical layout to what HODs see
- [x] Date change works inline during admin edit (no separate button)
- [x] Batch review marks multiple reports as reviewed in one action

---

## Phase D: Connectivity Resilience — Complete

### What was built

Dual-write drafts (Supabase + localStorage), a submission queue with automatic retry on reconnect, and a connectivity banner. No PWA, no service worker — browser APIs only.

### Key files created/changed

| File | Change |
|---|---|
| `lib/local-storage.ts` | **New.** Typed localStorage helpers for drafts (`hod_draft:{dept}:{date}`) and submission queue (`hod_submit_queue`). |
| `hooks/useConnectivity.ts` | **New.** Online/offline state from `navigator.onLine` + window events. |
| `hooks/useSubmissionQueue.ts` | **New.** Queue management: add on network failure, auto-retry on `online` event (2s delay), clear on success or 409 duplicate. |
| `components/ConnectivityBanner.tsx` | **New.** Sticky top banner: red when offline, amber when pending submissions exist. |
| `hooks/useDraftManager.ts` | **Modified.** Dual-write: localStorage first (synchronous), then Supabase. Load picks newest by `updatedAt` timestamp. Syncs local to Supabase on `online` event. Clear removes both. |
| `components/FormRenderer.tsx` | **Modified.** Network errors during new submissions queue the payload instead of showing an error. Green "queued" message. Auto-retry callback clears draft and fires `onSuccess`. |
| `app/report/layout.tsx` | **Modified.** Added `ConnectivityBanner` above children for both authenticated and guest sessions. |

### Validation gate D — passed

- [x] Drafts save to localStorage when Supabase is unreachable
- [x] Drafts sync from localStorage to Supabase when connectivity returns
- [x] Failed submission is queued in localStorage with "pending" flag
- [x] Pending submission retries on reconnect
- [x] Connectivity banner appears when offline, disappears when online
- [x] Queued submission succeeds on retry and clears from localStorage
- [x] Existing draft data survives logout

---

## Phase E: Form Updates — Complete

### What was built

Replaced the Housekeeping free-text repeater with a fixed 20-room grid grouped by building, added conditional fields based on Vacant/Occupied status, extended the Kitchen form with a near-expired items repeater, and handled legacy report rendering in the admin portal.

### E1: Housekeeping — 20-room grid

- New `config/rooms.ts` defines 20 rooms in 4 building groups (Guest House 1, Guest House 2, Chalets, Tents)
- New `components/RoomGrid.tsx` renders grouped room cards with status selector, conditional sub-fields, colour-coded cards, occupied/vacant counter, and full readOnly support
- New `room_grid` field type added to `FieldType` union in `types/index.ts`
- Housekeeping form config replaced: old repeater + occupancy section removed, single `room_grid` field added. Laundry and Notes sections kept.
- `FormRenderer.tsx` updated with `room_grid` rendering in `renderField()` and per-room validation in `validate()`

### E3: Kitchen near-expired items

- New "Near-Expired Items" repeater section added to Kitchen form between "Stock Used Today" and "Daily Food Cost"
- Sub-fields: item, expiry_date, quantity_remaining, unit, suggested_use, notes
- Optional section (`min_rows: 0`), uses existing repeater infrastructure

### Legacy report handling

- `LEGACY_HOUSEKEEPING_CONFIG` exported from admin `config/forms.ts` — frozen copy of the old Housekeeping config
- Admin report detail page and edit page detect old format via `'room_status' in report_data && !('rooms' in report_data)` and fall back to the legacy config

### Key files created/changed

| File | Change |
|---|---|
| `portal/config/rooms.ts` | **New.** 20 rooms in 4 building groups. |
| `portal/components/RoomGrid.tsx` | **New.** Room grid component with conditional fields and readOnly mode. |
| `portal/types/index.ts` | **Modified.** Added `room_grid` to `FieldType`. |
| `portal/config/forms.ts` | **Modified.** Housekeeping config replaced; Kitchen near-expired section added. |
| `portal/components/FormRenderer.tsx` | **Modified.** `room_grid` branch in `renderField()` and per-room validation. |
| `admin-portal/config/rooms.ts` | **New.** Copy from portal. |
| `admin-portal/components/RoomGrid.tsx` | **New.** Copy from portal. |
| `admin-portal/types/index.ts` | **Modified.** Added `room_grid` to `FieldType`. |
| `admin-portal/config/forms.ts` | **Modified.** Housekeeping config, Kitchen section, `LEGACY_HOUSEKEEPING_CONFIG` export. |
| `admin-portal/components/FormRenderer.tsx` | **Modified.** `room_grid` handling in renderField and readOnly. |
| `admin-portal/app/reports/[id]/page.tsx` | **Modified.** Legacy Housekeeping format detection. |
| `admin-portal/app/reports/[id]/edit/page.tsx` | **Modified.** Legacy Housekeeping format detection. |

### Validation gate E — passed

- [x] Housekeeping form shows all 20 rooms grouped by building
- [x] Each room is mandatory
- [x] Selecting "Vacant" shows only optional notes
- [x] Selecting "Occupied" shows condition (required) + damages + notes
- [x] Kitchen near-expired items repeater works (add/remove rows)
- [x] Existing Kitchen features still work
- [x] Legacy housekeeping reports render correctly in admin dashboard

---

## Phase F: Documentation — Complete

### What was done

Updated all stale project documentation and created new operational guides:

| File | Change |
|---|---|
| `context.md` | Metadata updated (all phases complete), folder structure updated for `5_operation/` contents, recent changes extended with Phases E and F, stale `.cursor/plans/` reference removed. |
| `1_context/project_summary.md` | Updated from 13 to 15 departments, login picker flow, admin dashboard, Netlify, "What happens next" reflects v2 complete. |
| `3_architecture/build_rules.md` | Renamed from "Phase 1 — Build Rules", 15 departments, validation gate principle added, scope boundaries reworked, deployment section updated. |
| `5_operation/hod_user_guide.md` | **New.** Plain-language guide for HODs: login, submit, draft, edit, offline, guest, auto-logout, room grid, troubleshooting. |
| `5_operation/admin_guide.md` | **New.** Admin guide: overview, reviewing (single + batch), compliance, WhatsApp message, stock, edit/delete, errors, account reference. |
| `versions/v2.0/snapshot.md` | Phase F section added, header and footer updated, "What v2.0 does NOT include" section replaced. |
| `4_development/next_chat_handover_v2.md` | Phase F marked complete in status table, Phase F section added, header and footer updated. |

### Validation gate F — passed

- [x] All documentation files have accurate, current information
- [x] `context.md` metadata and recent changes are up to date
- [x] `project_summary.md` reflects 15 departments, login picker, admin dashboard, Netlify
- [x] `build_rules.md` scope boundaries match what has actually been built
- [x] `5_operation/hod_user_guide.md` exists and covers login, submit, draft, edit, offline, guest
- [x] `5_operation/admin_guide.md` exists and covers review, compliance, stock, WhatsApp, edit/delete
- [x] Snapshot and handover both show Phase F as complete

---

## Build principles (carry forward)

1. **Simplicity over sophistication.** Default to the simpler option.
2. **Functional over polished.** Working beats beautiful.
3. **Mobile-friendly by default.** Test at 375px width minimum.
4. **Config-driven forms.** Single renderer, config file defines everything.
5. **JSONB for flexibility.** Form changes don't require DB migrations.
6. **Test before moving on.** Every phase has a validation gate. All items must pass.

---

## When you finish each phase

1. Run all validation gate checks for that phase
2. Update this handover file's status table
3. Create a snapshot at `versions/vX.X/snapshot.md`
4. Note any issues discovered, decisions made, or deviations from the plan
5. Proceed to the next phase

---

*Updated: 26 March 2026. v2.0 complete — all six phases (A, B, C, D, E, F) delivered.*
