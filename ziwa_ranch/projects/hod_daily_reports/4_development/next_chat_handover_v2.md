# v2 Build Handover

> **Purpose:** Everything you need to continue building HOD Daily Reports. Load this file, follow the context loading instructions, then continue from where we left off.
>
> **Updated:** 26 March 2026
> **Current version:** v2.1 built on dev branch, ready for v2.2 planning
> **Base version:** v2.0 complete (production), v2.1 complete (dev branch)
> **HOD portal:** https://hoddailyreports.netlify.app (production — v2.0)
> **Admin portal:** https://hod-admin-portal.netlify.app (production — v2.0)
> **HOD dev preview:** https://dev--hoddailyreports.netlify.app (v2.1)
> **Admin dev preview:** https://dev--hod-admin-portal.netlify.app (v2.1)

---

## How to load context

**Read these files in order before doing anything else:**

1. This file (you're reading it)
2. `context.md` — project overview, folder structure, technical state
3. `3_architecture/build_rules.md` — standards and principles (still apply)
4. `versions/v2.0/snapshot.md` — full record of what v2.0 delivered
5. `versions/v2.1/snapshot.md` — full record of what v2.1 delivered (on dev branch)

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

**v2.1 Phases (on dev branch):**

| Phase | Status | Notes |
|---|---|---|
| **v2.1 Phase A — Photo Attachments** | **Built** | AI-powered photo uploads with naming convention, Supabase Storage, admin gallery, Drive sync script. |
| **v2.1 Phase B — Inventory Grid** | **Built** | Tap-to-select grid for Kitchen, Store, F&B replaces stock repeaters. |
| **v2.1 Phase C — Activity Log & Edit Logging** | **Built** | Admin activity page, server-side edit API, edit logging blind spot closed. |
| **v2.1 Phase D — Password Self-Service** | **Built** | HOD password change at /account, admin password reset. |
| **v2.1 Phase E — Announcements** | **Built** | Department-level admin notes visible on HOD hub. |
| **v2.1 Phase F — Pre-fill** | **Built** | Start from previous report data on DepartmentHub. |
| **v2.1 Phase G — Admin Overview** | **Built** | Last submitted date, multi-day gap warnings on dashboard. |
| **v2.1 Phase H — Security & Fixes** | **Built** | Admin API auth (verifyAdminAuth), login redirect fix. |
| **v2.1 Phase I — Hugging Face AI** | **Built** | Replaced OpenAI with HF Inference API. Multi-model photo pipeline, urgency detection on report notes, daily digest summary, admin urgency badges. Needs `HF_TOKEN` env var. |

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
**Deploys from:** GitHub repo `thebusinessdevelopers/hod_daily_reports` — `main` branch auto-deploys to production, `dev` branch deploys to `dev--hoddailyreports.netlify.app`

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

**Live at:** https://hod-admin-portal.netlify.app
**Netlify project:** `d501089b-06cc-4d50-84eb-cb5ab4890b9b`
**Deploys from:** GitHub repo `thebusinessdevelopers/hod_admin_portal` — `main` branch auto-deploys to production, `dev` branch deploys to `dev--hod-admin-portal.netlify.app`

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

**API routes:** `review-report`, `batch-review-reports`, `change-report-date`, `delete-report`, `harvest-items`, `item-suggestions/[slug]`, `announcements`, `reset-password`, `daily-digest`

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
| Repository (Admin deploy) | https://github.com/thebusinessdevelopers/hod_admin_portal |
| Branching | `main` = production, `dev` = development (both deploy repos and monorepo) |

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
| `HF_TOKEN` | Hugging Face Inference API token (Read scope) — added in v2.1 |

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

1. ~~**Admin login redirect**~~ — Fixed in v2.1 Phase H. Now redirects to `/report/[slug]`.
2. **Admin portal FormRenderer** — The admin portal's `FormRenderer.tsx` is a copy from before Phase B. It still uses direct Supabase inserts, does not have the draft hook, and calls `/api/log-error` which does not exist in the admin portal. The admin portal only uses FormRenderer for edits (not new submissions), so this is non-breaking but the copy is now out of sync. Phase C added `readOnly` support. `onSuccess` and `departmentId` are now optional props (hotfix, 26 March 2026).
3. **Shared code sync** — The two applications share `config/forms.ts`, `config/rooms.ts`, `components/FormRenderer.tsx`, `components/RoomGrid.tsx`, `lib/submission-status.ts`, and other files as copies. `FormRenderer.tsx` remains structurally out of sync (admin version lacks draft hook and server-side submission but this is acceptable since admin only uses it for edits; both versions now handle `room_grid`, `photo`, and `inventory_grid`).
4. ~~**Admin API route auth**~~ — Fixed in v2.1 Phase H. All 8 admin API routes now check `verifyAdminAuth`.
5. **Netlify plugin configuration** — The `@netlify/plugin-nextjs` must be registered as a Netlify site-level plugin (via UI or API), NOT as an npm dependency in `package.json`. Having it as an npm dependency conflicts with Netlify's built-in runtime and causes `plugin_state=none`, resulting in no SSR functions and 404 on all routes. Both portal sites now have the plugin registered at the site level. Do not re-add it to `package.json`.
6. **SUPABASE_SERVICE_ROLE_KEY placeholder in local .env.local** — Both local `.env.local` files have `SUPABASE_SERVICE_ROLE_KEY=REPLACE_WITH_SERVICE_ROLE_KEY`. This breaks all server-side Supabase queries locally. Must be replaced with the real key from Supabase dashboard for local development. The Netlify environment has the real key, so deployed sites work.

---

## v2.1 Testing Feedback (from Joshua, 26 March 2026)

**These items must drive v2.2 planning. They are prioritised issues and architectural decisions.**

### 1. Photo upload is too slow for users

The current flow analyses the image with AI models *during upload* — the HOD waits for object detection and zero-shot classification before the upload completes. This is unacceptable for field users on mobile. **Fix:** Move all AI analysis to a background/post-submission process. The upload should store the image and HOD description immediately, then AI enrichment runs asynchronously on the backend after submission.

### 2. Photos and drafts

Confirm whether uploaded photos persist correctly when the form is saved as a draft and resumed later. The photo IDs are stored in the form data, but the UX flow for draft → resume → submit with photos needs validation.

### 3. Daily digest model produces poor output

The `facebook/bart-large-cnn` summarisation model is not fit for purpose. When a single report had `challenges_successes` of just "nothing", the digest output was nonsensical repetition: *"There is nothing to say. Nothing to say at all. Nothing at all to say about nothing..."*. A better model is needed — one that can handle sparse/trivial input gracefully and produce genuinely useful executive summaries from multiple department notes.

### 4. Analysis needs a dedicated tab with time-period toggles

The current "Today's Highlights" card on the admin overview is too limited. Replace it with a dedicated **Analysis tab** in the admin portal that supports:

- **Per report** — analysis of a single report's content
- **Per day** — aggregated analysis across all departments for one day
- **Per week** — weekly trends and summary
- **Per month** — monthly analysis with deeper insights

**Critical rule:** A time period's analysis is only available after the period has concluded. March analysis becomes available on 1 April. This week's analysis becomes available next week. This prevents incomplete data from being analysed.

### 5. Deeper cross-departmental analysis potential

With a capable AI model, the system could analyse the structured data within each department's forms far more deeply:

- **Compliance analysis** — patterns in late submissions, missed days, department reliability
- **Visitor landscape** — Main Gate + Reception data combined to track people in and out (gate counts + check-ins/check-outs)
- **Accommodation analysis** — Housekeeping room grid data for occupancy rates, room condition trends, maintenance patterns
- **Food cost projections** — Kitchen inventory data for cost trending, consumption patterns, purchase forecasting
- **Security trends** — Incident patterns, patrol coverage, fence/equipment damage frequency
- **Cross-department action items** — AI-orchestrated work tracking between departments (e.g. Electrical repairs flagged by Housekeeping)

### 6. AI model and platform decision needed

The HF free tier is insufficient for the vision and analysis requirements above. Two options being considered:

**Option A — Hugging Face Pro ($9/month)**
Unlocks vision-language models (Qwen VL, Llama Vision) for proper image understanding. Better summarisation models. Still limited to what HF hosts.

**Option B — Alternative AI platform**
Use a platform that provides access to the best models for each task: vision analysis, text summarisation, structured data analysis, and eventually cross-departmental intelligence. Must support the eventual goal of a backend intelligence layer that orchestrates action items, tracks work done, projects food costs, and identifies trends across all departments.

**Joshua's position:** Leaning towards HF Pro initially, but open to a different tool if it provides better model access for the full analytics vision. The choice should be made based on which platform best supports the end goal of deep, multi-layered departmental analysis — not just image captioning.

### 7. Long-term vision: backend intelligence layer

The ultimate goal is an AI-powered backend that:

- Orchestrates action items between departments (damage reported by one department triggers a task for another)
- Tracks work completion across departments
- Projects food costs and purchase needs from Kitchen/Store inventory data
- Identifies trends in visitor numbers, accommodation, security incidents
- Provides executive-level summaries that are genuinely useful, not just parroted text

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

## Deployment workflow

Both applications use a `main`/`dev` branching strategy across three GitHub repos:

| Repo | Purpose | Production | Dev preview |
|---|---|---|---|
| `thebusinessdevelopers/the-business-developers` | Monorepo (docs + source) | `main` branch | `dev` branch |
| `thebusinessdevelopers/hod_daily_reports` | HOD portal deploy | `main` → hoddailyreports.netlify.app | `dev` → dev--hoddailyreports.netlify.app |
| `thebusinessdevelopers/hod_admin_portal` | Admin portal deploy | `main` → hod-admin-portal.netlify.app | `dev` → dev--hod-admin-portal.netlify.app |

**To deploy changes:**

1. Develop on the `dev` branch in the relevant deploy repo
2. Netlify automatically builds and deploys the dev preview
3. Test on the preview URL
4. Merge `dev` into `main` (via PR or local merge + push)
5. Netlify auto-deploys to production

The deploy repos are standalone mirrors of the `portal/` and `admin-portal/` directories in the monorepo. Push code changes to the deploy repos to trigger Netlify builds.

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

*Updated: 26 March 2026. v2.0 in production. v2.1 (Phases A–I) built on dev branch. Ready for v2.2 planning based on testing feedback above.*
