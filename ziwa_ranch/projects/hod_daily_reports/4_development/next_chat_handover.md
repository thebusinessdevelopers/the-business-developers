# HOD Daily Reports — Handover

> **Purpose:** Everything you need to continue building HOD Daily Reports. Load this file, follow the context loading instructions, then continue from where we left off.
>
> **Updated:** 8 April 2026 (v2.6 promoted to production)
> **Current version:** v2.6 — **live on production** (8 Apr 2026). All five refinement phases shipped. See [`versions/v2.6/snapshot.md`](../versions/v2.6/snapshot.md).
> **Base version:** v2.5 (superseded)
> **HOD portal:** https://hoddailyreports.netlify.app (production — v2.6)
> **Admin portal:** https://hod-admin-portal.netlify.app (production — v2.6)
> **HOD dev preview:** https://dev--hoddailyreports.netlify.app (v2.6)
> **Admin dev preview:** https://dev--hod-admin-portal.netlify.app (v2.6)

---

## How to load context

**Read these files in order before doing anything else:**

1. This file (you're reading it)
2. `3_architecture/build_rules.md` — standards and principles (still apply)
3. `versions/v2.0/snapshot.md` — what v2.0 delivered (production)
4. `versions/v2.1/snapshot.md` — what v2.1 delivered
5. `versions/v2.2/snapshot.md` — what v2.2 delivered
6. `versions/v2.3/snapshot.md` — what v2.3 delivered (production)
7. `versions/v2.4/snapshot.md` — what v2.4 delivered (dev preview)
8. `versions/v2.5/plan.md` — full v2.5 plan (13 phases)
9. `versions/v2.5/phase1_snapshot.md` — what v2.5 Phase 1 delivered
10. `versions/v2.5/phase2_snapshot.md` — what v2.5 Phase 2 delivered
11. `versions/v2.5/phase3_snapshot.md` — what v2.5 Phase 3 delivered
12. `versions/v2.5/phase4_snapshot.md` — what v2.5 Phase 4 delivered
13. `versions/v2.5/phase5_snapshot.md` — what v2.5 Phase 5 delivered
14. `versions/v2.5/phase6_snapshot.md` — what v2.5 Phase 6 delivered
15. `versions/v2.5/phase7_snapshot.md` — what v2.5 Phase 7 delivered
16. `versions/v2.5/phase8_snapshot.md` — what v2.5 Phase 8 delivered
17. `versions/v2.5/phase9_snapshot.md` — what v2.5 Phase 9 delivered
18. `versions/v2.5/phase10_snapshot.md` — what v2.5 Phase 10 delivered
19. `versions/v2.5/phase11_snapshot.md` — what v2.5 Phase 11 delivered
20. `versions/v2.5/phase12_snapshot.md` — what v2.5 Phase 12 delivered
21. `versions/v2.5/phase13_snapshot.md` — what v2.5 Phase 13 delivered (final validation)
22. `versions/v2.5/release_snapshot.md` — v2.5 release record (AI reliability fixes, production deployment)
23. `versions/v2.6/snapshot.md` — current v2.6 working snapshot
24. `versions/v2.6/bug_register.md` — v2.6 bug lifecycle tracker
25. `versions/v2.6/fix_verification.md` — evidence log for completed v2.6 fixes
26. `versions/v2.6/final_validation.md` — **live dev preview validation** (8 Apr 2026): pass/fail notes and refinement backlog
27. `versions/v2.6/investigations/activity_log_integrity.md` — deep dive on repeated login/logout anomalies

Then read the source files relevant to whichever task you're building.

---

## What the project is

Ziwa Rhino And Wildlife Ranch has 16 departments. Each head of department (HOD) submits a daily operational report through a web portal. An admin dashboard provides oversight, compliance tracking, and AI-powered analysis.

Two Next.js applications share a single Supabase database:

- **HOD Portal** — the reporting tool HODs use daily (login, submit, edit, drafts, photos, messages)
- **Admin Portal** — dashboard for reviewing reports, compliance, stock, announcements, activity logs, AI analysis, discussion threads

---

## Version history

| Version | What it delivered |
|---|---|
| **v2.0** | Production release. Custom auth, two-stage hub, server-side submission, connectivity resilience, room grid, documentation. |
| **v2.1** | Photo attachments, inventory grid, activity log, password self-service, announcements, pre-fill, admin overview enhancements, HF AI integration. |
| **v2.2** | Instant photo uploads (AI decoupled), OpenRouter integration (Claude Sonnet 4.6), shared workspace package, FormRenderer split, admin edit API, Analysis tab, cleanup pass. |
| **v2.3** | InventoryGrid remove buttons, individual admin accounts (7 users, session-based auth), comprehensive activity tracking with role-based visibility, Head Office (Reservations) department (16th), draft auto-save on logout, HOD sign-out button, navigation fix. |
| **v2.4** | Photo picker fix (mobile OS sheet), Google Drive media sync (OAuth, background push, admin sweep, `media/{dept}/{month}` structure), messaging system (@mention picker, threaded discussion, notification polling, global message banner), shared UI components (MentionInput, ThreadView, NotificationBadge). Deployed to dev previews. |
| **v2.5 P1** | Bug fixes: password_display sync on password change, mandatory field indicators on all field types (repeater/inventory_grid/room_grid/photo/checkbox_group/stepper), array-aware form validation, AI analysis display cutoff fix (maxTokens 1200, structured prompt, scrollable rendering, regenerate button), removed generator_use from Electrical config. |
| **v2.5 P2** | Form UX: N/A section toggle (allowNA on FormSection, toggle button, validation bypass, read-only display, all-NA guardrail), contextual helpText on key fields across 9 departments, mandatory audit confirmed complete. |
| **v2.5 P3** | Mobile navigation: Admin hamburger menu (NavMenu component, slide-down panel, auto-close on route change), HOD user avatar dropdown (UserMenu component, initial circle, change password + sign out), responsive audit across both portals (flex-wrap/stack on 10 pages, table scroll, review comment overflow). |
| **v2.5 P4** | Stock data quality: Fuzzy search utility (`fuzzyMatch`, `toTitleCase`, `similarity`, `findDuplicateGroups`), InventoryGrid fuzzy search + similarity popup + title case on add, harvest normalisation with title case, `hod_stock_flags` table (migration 014), admin scan/merge/resolve endpoints, StockFlags UI on stock page, client-side item cache. |
| **v2.5 P5** | AI overhaul: Smart daily brief (structured 4-section output, caching in `hod_analysis_cache`, progressive updates, 1500 maxTokens), DailyDigestCard with section parser + 5-min auto-refresh, analysis prompt with PATTERNS section, urgency detection with category-specific guidance. |
| **v2.5 P6** | Universal mentions: AcknowledgeButton uses MentionInput (lazy-loaded user groups), review-report API processes mentions into `hod_notifications`, report author auto-notified on review. |
| **v2.5 P7** | Speed: Parallel signed URL generation on admin report detail, `get_dashboard_stats` SQL RPC function (migration 015), admin overview uses single RPC call instead of fetching raw reports (~95% data reduction). |
| **v2.5 P8** | Performance: Image thumbnail pipeline (Sharp, 300px thumbnails on upload, admin gallery uses thumbs in grid/full on expand), dynamic imports for heavy portal components (InventoryGrid, PhotoUploader, RoomGrid via next/dynamic), notification polling optimisation (lightweight check endpoint, full fetch only on change). |
| **v2.5 P9** | AI failure recovery: process-media ai_status lifecycle (processing→complete/failed/skipped), ai_error_message tracking, urgency detection error recording in ai_flags, admin failed media endpoint + retry endpoint, FailedMediaPanel on errors page with batch retry. |
| **v2.5 P10** | Admin report comparison: "Compare with previous" toggle on report detail page, lazy-fetches prior report, field-type-aware diff rendering (numeric deltas with % badges, inventory per-item changes, N/A toggle tracking, text strikethrough). |
| **v2.5 P11** | Admin intelligence: `extractKeyMetrics` shared utility (numeric extraction from report_data via form config), `GET /api/analysis/trends` endpoint (5-week rolling comparison, AI-powered insight generation, cached as `trend_alert`), TrendInsightsCard on overview (severity-coded insight cards), cross-departmental correlation in analysis/generate (numeric data feeding, CROSS-DEPARTMENT CONNECTIONS section, maxTokens 1500), AnalysisPanel section parser. |
| **v2.5 P12** | Export system: `/exports` page with three modes (single report, date range, executive summary), `POST /api/exports/generate` (text rendering with form-config-aware field formatting, AI executive summary via OpenRouter), `GET /api/exports/lookup` (report finder), ExportsPanel UI (department multi-select, date pickers, preview, copy to clipboard, print/PDF), Exports link in admin NavMenu. |
| **v2.5 P13** | Testing and validation: TypeScript zero errors on both portals, zero linter errors, all 13 v2.5 phases feature-complete. |
| **v2.5 AI fix** | Switched from Claude Sonnet 4.6 to Claude 3.5 Sonnet — 4.6's reasoning parameter consumed the entire token budget producing empty content, and 36-70s response times exceeded Netlify's 26s timeout. Analysis maxTokens reduced to 1200, prompts enforced plain text (no markdown), notes capped at 200 chars, metrics at 40 lines. All AI endpoints now respond within 12-19s. **Note:** 3.5 Sonnet was later retired by OpenRouter; v2.6 iteration switched to Claude Sonnet 4 (3-8s response). |
| **v2.6** | Reliability-first release: 14 registered bugs fixed (V26-001 through V26-014). Trust boundary guards, offline queue lifecycle, analysis reliability rebuild, submitter edit governance, auth activity dedupe, Roy Family view-only path, wildlife account corrections, IT Job Cards no-entry, `Kyamukama Gate`, internal route protection, N/A marker centralisation, analysis-route stabilisation. DB migration `017` applied. Prod-spec iteration: OpenRouter model update (3.5-sonnet retired → Sonnet 4), compliance tracker accuracy (7-day reporting, today excluded), one-step single report export, executive summary AI fallback, admin stock inline editing with audit trail, batched duplicate scan. **Live browser validation on dev previews completed 8 Apr 2026** (`versions/v2.6/final_validation.md`). **Production refinement (5 phases, all complete 8 Apr 2026):** Phase 1 — DailyDigestCard/TrendInsightsCard labelled skeletons, empty states, error/degraded surfacing. Phase 2 — Room grid human-readable export, generic object labelled lines, ExportsPanel full error surfacing. Phase 3 — Offline queue success UX (reportId passthrough, "View this report" link, green banner flash, failure diagnostics). Phase 4 — ThreadView `useRef`-based double-submit lock. Phase 5 — Build verification (both portals zero TS errors, zero linter errors) and documentation close-out. |

---

## Current architecture (v2.6 branch / v2.5 production)

### Application structure

```
4_development/
├── package.json              ← npm workspace root
├── portal/                   ← HOD portal (Next.js 16, Tailwind v4, React 19)
├── admin-portal/             ← Admin portal (same stack)
├── packages/
│   └── shared/               ← @hod/shared — types, config, lib, components
└── scripts/
    └── get-drive-token.js    ← One-time OAuth token helper
```

Both apps depend on `@hod/shared` and use thin re-export files to maintain existing `@/` import paths. The shared package is transpiled via `transpilePackages` in `next.config.ts`.

### Deploy repos

The deploy repos (`hod_daily_reports`, `hod_admin_portal`) are standalone mirrors — they each contain the app code plus a copy of `packages/shared/` with `"@hod/shared": "file:packages/shared"` in `package.json`. Netlify has no workspace concept, so the shared package is bundled directly.

### AI platform split

| Platform | Model | Task |
|---|---|---|
| **OpenRouter** | `anthropic/claude-sonnet-4` | Daily digest, urgency detection, period analysis, trend detection, export summaries |
| **Hugging Face** | `facebook/detr-resnet-50`, `Salesforce/blip-image-captioning-large` | Object detection, image captioning (background, post-submission) |

OpenRouter client: `packages/shared/lib/openrouter.ts` — accepts configurable `referer`, `title`, and `maxTokens` per call. **Critical constraint:** Netlify serverless functions have a 26-second timeout. All OpenRouter calls must complete within ~20s. Claude Sonnet 4 at 1200 maxTokens responds in 3-8s. **Model history:** Claude 3.5 Sonnet was retired by OpenRouter (404). Claude Sonnet 4.6's `reasoning` parameter consumed the token budget — do not use 4.6 or enable reasoning.

Fuzzy search: `packages/shared/lib/fuzzy-search.ts` — `fuzzyMatch()`, `toTitleCase()`, `similarity()`, `findSimilarItems()`, `findDuplicateGroups()`. Used by InventoryGrid (client-side) and harvest/scan routes (server-side).

Metrics extraction: `packages/shared/lib/extract-metrics.ts` — `extractKeyMetrics()`, `formatMetricsForPrompt()`. Pulls numeric values from report_data JSONB using form config. Used by trend detection and cross-departmental correlation endpoints.

### Key data flows

**Photo upload:** Instant storage upload → HOD sees success → background Drive push to `media/{dept}/{month}` → after report submission, `POST /api/ai/process-media` runs HF models and updates `hod_report_media` with `ai_description` and `ai_tags`.

**Google Drive sync:** OAuth2 refresh token (not service account — they have zero storage quota). Upload on photo submission, catch-up sweep via `GET /api/media/sync-to-drive`. Writes `google_drive_file_id`, `google_drive_url`, `google_drive_synced_at` to `hod_report_media`.

**Messaging:** Thread messages stored in `hod_report_threads`. Mention processing creates `hod_notifications` rows. HOD portal polls every 60s, admin every 30s. Global @everyone/@admins messages shown on login page (public endpoint, 24h auto-expire).

**Urgency detection:** After submission, `detectUrgency()` calls OpenRouter to classify report text. Result written to `ai_flags` JSONB column on `hod_daily_reports`.

**Daily digest:** Admin portal `GET /api/daily-digest` fetches today's reports, sends department notes to Claude for executive summary.

**Analysis:** Admin `/analysis` page → select period (day/week/month) → `POST /api/analysis/generate` checks if period is complete, checks `hod_analysis_cache`, generates via Claude if not cached.

---

## Technical state

| Service | Detail |
|---|---|
| Supabase project | `inidzwfjnkyinxhvbrdt` (EU West Frankfurt) |
| Supabase URL | `https://inidzwfjnkyinxhvbrdt.supabase.co` |
| DB timezone | `Africa/Kampala` |
| DB tables | `hod_departments` (16), `hod_daily_reports`, `hod_verified_stock`, `hod_item_library`, `hod_drafts`, `hod_error_log`, `hod_users`, `hod_sessions`, `hod_activity_log`, `hod_report_media`, `hod_announcements`, `hod_analysis_cache`, `hod_report_threads`, `hod_notifications`, `hod_stock_flags` |
| Frontend (HOD) | Next.js 16, Tailwind v4, React 19 — `4_development/portal/` |
| Frontend (Admin) | Next.js 16, Tailwind v4, React 19 — `4_development/admin-portal/` |
| Shared package | `@hod/shared` at `4_development/packages/shared/` |
| HOD live URL | https://hoddailyreports.netlify.app |
| Admin live URL | https://hod-admin-portal.netlify.app |
| Repository (monorepo) | https://github.com/thebusinessdevelopers/the-business-developers |
| Repository (HOD deploy) | https://github.com/thebusinessdevelopers/hod_daily_reports |
| Repository (Admin deploy) | https://github.com/thebusinessdevelopers/hod_admin_portal |
| Branching | `main` = production, `dev` = development (all three repos) |

### Database migrations (applied / prepared)

| File | Summary |
|---|---|
| `001_hod_reports_schema.sql` | Core: `hod_departments`, `hod_daily_reports`, RLS, department seeding |
| `002_verified_stock.sql` | `hod_verified_stock` for Monday baselines |
| `003_item_library.sql` | `hod_item_library` for autocomplete |
| `004_v16_schema.sql` | Edit history, unique report constraint, acknowledgements, verified stock status |
| `005_v18_schema.sql` | Anon select on reports, `hod_error_log`, `hod_drafts`, review comments |
| `006_v2_schema.sql` | Auth tables (`hod_users`, `hod_sessions`, `hod_activity_log`), user seeding |
| `007_v2_substitute_users_and_password_display.sql` | New substitute accounts, `password_display` column |
| `008_report_media.sql` | `hod_report_media` table for photo metadata |
| `009_item_library_defaults.sql` | `default_unit` and `default_cost_per_unit` on `hod_item_library` |
| `010_announcements.sql` | `hod_announcements` table |
| `011_ai_flags.sql` | `ai_flags jsonb` column on `hod_daily_reports` |
| `hod_analysis_cache` (DDL) | Analysis cache table (created via `execute_sql`, no migration file) |
| `012_v2_3_schema.sql` | Admin columns (`admin_tier`, `admin_title`), 6 admin accounts, Head Office department + 3 user accounts |
| `013_v2_4_schema.sql` | Performance indexes, `ai_status` on media, Google Drive columns, `hod_report_threads`, `hod_notifications` |
| `014_v2_5_stock_flags.sql` | `hod_stock_flags` table for stock data quality management |
| `015_v2_5_dashboard_stats_rpc.sql` | `get_dashboard_stats` SQL function for admin overview aggregation |
| `016_v2_5_thumbnails_and_ai_recovery.sql` | `thumbnail_path` and `ai_error_message` columns on `hod_report_media`, index on `ai_status` for failed/pending lookups |
| `017_v2_6_account_access_updates.sql` | Applied 7 April 2026: added `admin.royfamily`, retired `admin.joshua` to `legacy.admin.joshua`, renamed `wildlife.wycliff` to `wildlife.wycliffe`, inserted `wildlife.samuel` |

### Environment variables (set on both Netlify sites)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side key for API routes |
| `ADMIN_PASSWORD` | **Deprecated in v2.3.** Admin portal now uses per-user accounts. |
| `HF_TOKEN` | Hugging Face Inference API token (Read scope) |
| `OPENROUTER_API_KEY` | OpenRouter API key for `anthropic/claude-sonnet-4` |
| `GOOGLE_DRIVE_CLIENT_ID` | OAuth client ID for Drive uploads |
| `GOOGLE_DRIVE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | OAuth refresh token (from `scripts/get-drive-token.js`) |
| `GOOGLE_DRIVE_FOLDER_ID` | Root Google Drive folder ID |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service account key (used for non-upload Drive operations; not needed for file uploads) |
| `INTERNAL_ROUTE_TOKEN` / `INTERNAL_JOB_TOKEN` | Internal token for protected service-role routes such as `process-media` and `harvest-items` |

---

## Two applications

### HOD Portal (`4_development/portal/`)

The HOD-facing reporting tool. Login picker → Department hub → Report form.

**Routes:**

| Route | Purpose |
|---|---|
| `/login` | Multi-step login picker |
| `/` | Redirect: authenticated → `/report/[slug]`, else → `/login` |
| `/report/[slug]` | Department hub: Reports tab (date buttons, recent reports) + Messages tab (notification inbox) |
| `/report/[slug]/new?date=YYYY-MM-DD` | New report form with locked date |
| `/report/[slug]/view/[id]` | Read-only report viewer with Discussion section |
| `/report/[slug]/edit/[id]` | Edit a submitted report (within edit window) |
| `/account` | HOD password change |

**API routes:**

| Route | Purpose |
|---|---|
| `POST /api/auth/login` | Username/password login |
| `POST /api/auth/guest-login` | Guest login (no password) |
| `POST /api/auth/logout` | Session destruction |
| `GET /api/auth/session` | Session health check |
| `POST /api/submit-report` | Server-side submission (auth, insert, stock, harvest, activity log, background AI) |
| `POST /api/upload-media` | Instant photo upload + background Drive push |
| `POST /api/ai/process-media` | Background AI processing for a single photo |
| `POST /api/harvest-items` | Upsert repeater items into library |
| `GET /api/item-suggestions/[slug]` | Autocomplete suggestions |
| `GET /api/inventory-items/[slug]` | Inventory items and previous quantities |
| `POST /api/change-password` | HOD password change |
| `POST /api/log-error` | Client error logging |
| `GET /api/stock-projection/[slug]` | Stock projection calculation |
| `GET /api/threads/[reportId]` | Fetch thread messages (access-controlled) |
| `POST /api/threads/[reportId]` | Post message to thread, triggers mention processing |
| `GET /api/mention-users` | User list grouped by department for @mention picker |
| `GET /api/notifications` | Current user's notifications with unread count |
| `POST /api/notifications/read` | Mark notification(s) as read |
| `GET /api/global-messages` | Public — @everyone/@admins messages for login page |

**Key files:**

| File | Purpose |
|---|---|
| `lib/auth.ts` | Auth library: hash, verify, sessions, activity log, getCurrentUser |
| `lib/with-auth.ts` | `withAuth()` wrapper for API routes — eliminates auth boilerplate |
| `config/login-users.ts` | Login picker roster: 16 departments with slugs and user lists |
| `config/forms.ts` | All 16 department form configs |
| `components/FormRenderer.tsx` | Config-driven form engine (orchestrator — delegates to form/ modules) |
| `components/form/FieldRenderer.tsx` | Field type switching (~210 lines extracted from FormRenderer) |
| `components/form/FormValidation.ts` | Pure validation function |
| `components/PhotoUploader.tsx` | Photo selection, description, category, upload UI |
| `hooks/useDraftManager.ts` | Draft load/save/clear with dual-write |
| `hooks/useSessionTimer.ts` | Idle/daily/poll logout with `hod:session-expiring` event. Tracks scroll as activity. |
| `hooks/useSubmissionQueue.ts` | Submission queue with auto-retry |
| `hooks/useNotifications.ts` | Notification polling (60s), unread count, mark-read helpers |
| `app/report/[slug]/MessagesTab.tsx` | Notification inbox grouped by report, inline thread drill-down |
| `app/report/[slug]/ReportThread.tsx` | Reusable thread viewer — fetches messages, user groups, handles send |
| `app/login/GlobalMessageBanner.tsx` | Dismissible @everyone/@admins messages on login page |
| `app/UserMenu.tsx` | User avatar dropdown with change password and sign out (replaces visible Account link + LogoutButton in header) |
| `app/LogoutButton.tsx` | Sign-out button. Fires `hod:session-expiring` before calling logout API. |
| `middleware.ts` | Route protection |

### Admin Portal (`4_development/admin-portal/`)

**Routes:**

| Route | Purpose |
|---|---|
| `/` | Overview: KPI cards, submissions, rate bars, daily digest, analysis link |
| `/reports` | Filterable reports table with review dots, unread discussion dots, CSV export, batch review |
| `/reports/[id]` | Report detail with signed-URL photo gallery, "View in Drive" links, Discussion section |
| `/reports/[id]/edit` | Admin edit form (goes through server-side API) |
| `/stock` | Stock reconciliation |
| `/compliance` | Per-department compliance bars, WhatsApp message |
| `/errors` | Error log |
| `/activity` | Activity log with filter dropdown |
| `/announcements` | Announcement management |
| `/analysis` | AI analysis with Daily/Weekly/Monthly tabs |
| `/users` | HOD user list with password reset |

**API routes:**

| Route | Purpose |
|---|---|
| `POST /api/edit-report` | Admin edit with diff, activity log, harvest trigger |
| `POST /api/analysis/generate` | Period-locked AI analysis with caching |
| `GET /api/daily-digest` | Claude-powered executive summary |
| `POST /api/review-report` | Mark reviewed |
| `POST /api/batch-review-reports` | Batch review |
| `POST /api/change-report-date` | Change report date |
| `POST /api/delete-report` | Delete report |
| `POST /api/harvest-items` | Upsert items |
| `GET /api/item-suggestions/[slug]` | Autocomplete |
| `POST /api/announcements` | Create announcement |
| `DELETE /api/announcements` | Deactivate announcement |
| `POST /api/reset-password` | Reset user password |
| `GET /api/threads/[reportId]` | Fetch thread messages (admin sees all) |
| `POST /api/threads/[reportId]` | Admin post to thread (`is_admin_note = true`) |
| `GET /api/mention-users` | User list for @mention picker |
| `GET /api/notifications` | Admin notifications with unread count |
| `POST /api/notifications/read` | Mark admin notifications as read |
| `GET /api/media/sync-to-drive` | Drive catch-up sweep for unsynced media |
| `POST /api/stock/scan-duplicates` | Scan item library for duplicate groups, create flags |
| `POST /api/stock/merge-items` | Merge duplicate items into canonical name, resolve flag |
| `POST /api/stock/resolve-flag` | Mark a stock flag as resolved/ignored/escalated |
| `POST /api/stock/edit-entry` | Admin inline edit of stock items/quantities with audit trail |
| `GET /api/analysis/trends` | AI trend detection with 5-week rolling comparison |
| `POST /api/exports/generate` | Export generation (single, range, executive summary) |
| `GET /api/exports/lookup` | Find report ID by department + date |

**Key files:**

| File | Purpose |
|---|---|
| `lib/admin-auth.ts` | Admin auth library |
| `lib/with-admin-auth.ts` | `withAdminAuth()` wrapper for admin API routes |
| `hooks/useAdminNotifications.ts` | Notification polling (30s), unread count, mark-read helpers |
| `app/NavMenu.tsx` | Responsive nav: hamburger menu on mobile, horizontal links on desktop |
| `app/AdminNotifications.tsx` | Bell icon with badge and dropdown notification panel in header |
| `app/reports/[id]/AdminReportThread.tsx` | Discussion thread viewer for report detail page |
| `components/PhotoGallery.tsx` | Photo grid with "View in Google Drive" links |
| `app/stock/StockFlags.tsx` | Data Quality section: flag display, scan, merge, dismiss |
| `app/stock/StockTable.tsx` | Inline-editable stock items table with save/cancel |
| `components/TrendInsightsCard.tsx` | AI trend insights cards on overview page |
| `app/exports/ExportsPanel.tsx` | Export system: single, range, executive summary modes |

**Authentication (v2.6):** Per-user admin accounts backed by `hod_users` (role=admin) and `hod_sessions`. Seven accounts (MD, CEO, Chairman, GM, Isaac, Wycliffe, Roy Family) with two tiers: senior (MD, CEO, Chairman) can see all admin activity; standard (GM, Isaac, Wycliffe, Roy Family) cannot. `admin.royfamily` is deliberately restricted to view-only capability in the admin portal.

---

## HOD user accounts

All accounts use password `ziwa2026`. Usernames follow `department.firstname` pattern.

| Username | HOD Name | Department | Auto-logout |
|---|---|---|---|
| `maingate.jjuko` | Jjuko | Main Gate | yes |
| `reception.emilly` | Emilly | HQ Reception | yes |
| `reception.patience` | Patience | HQ Reception | yes |
| `reception.carol` | Carol | HQ Reception | yes |
| `fnb.howard` | Howard | Food & Beverage | yes |
| `fnb.oscar` | Oscar | Food & Beverage | yes |
| `kitchen.sensio` | Sensio | Kitchen | yes |
| `kitchen.richard` | Richard | Kitchen | yes |
| `kitchen.safari` | Safari | Kitchen | yes |
| `housekeeping.elly` | Elly | Housekeeping | yes |
| `housekeeping.anita` | Anita | Housekeeping | yes |
| `security.salim` | Salim | Security | yes |
| `security.elia` | Elia | Security | yes |
| `store.denis` | Denis | Store | yes |
| `accounts.musoni` | Musoni | Accounts | yes |
| `accounts.halima` | Halima | Accounts | yes |
| `electrical.robert` | Robert | Electrical | yes |
| `electrical.sekito` | Sekito | Electrical | yes |
| `maintenance.david` | David | HQ Maintenance | yes |
| `maintenance.francis` | Francis | HQ Maintenance | yes |
| `drivers.kanja` | Kanja | Drivers & Mechanics | yes |
| `drivers.roger` | Roger | Drivers & Mechanics | yes |
| `plumbing.richard` | Richard | Plumbing | yes |
| `plumbing.jonah` | Jonah | Plumbing | yes |
| `it.benson` | Benson | IT | yes |
| `wildlife.martine` | Martine | Wildlife | **no** |
| `wildlife.wycliffe` | Wycliffe | Wildlife | yes |
| `wildlife.samuel` | Samuel | Wildlife | yes |
| `craftshop.halima` | Halima | Craft Shop | yes |
| `craftshop.patience` | Patience | Craft Shop | yes |
| `headoffice.florence` | Florence | Head Office | yes |
| `headoffice.julie` | Julie | Head Office | yes |
| `headoffice.isaac` | Isaac | Head Office | yes |

**Admin accounts (v2.6 app state):**

| Username | Display Name | Title | Tier |
|---|---|---|---|
| `admin.royfamily` | Roy Family | Family Viewer | standard |
| `admin.md` | MD | Managing Director | senior |
| `admin.ceo` | CEO | Chief Executive Officer | senior |
| `admin.chairman` | Chairman | Chairman | senior |
| `admin.gm` | GM | General Manager | standard |
| `admin.isaac` | Isaac | Head Office Manager | standard |
| `admin.wycliffe` | Wycliffe | Staff Manager | standard |

---

## Key people

| Role | Person |
|---|---|
| Project owner | Joshua |
| General Manager | Wellington |
| IT (validates tech issues) | Benson |
| Wildlife (needs no auto-logout) | Martine |

---

## Known issues and pending items

1. **npm install required for local dev.** The workspace setup (`packages/shared`) requires running `npm install` from `4_development/` root to set up symlinks before local dev works.
2. **`hod_analysis_cache` has no migration file.** Table was created via `execute_sql`. If the database is rebuilt, this table needs manual creation.
3. **Shared config/forms.ts not extracted.** The form configs differ between portal and admin portal (portal has photo/inventory sections, admin has legacy config). Kept separate deliberately.
4. **Netlify plugin configuration.** The `@netlify/plugin-nextjs` must be registered as a Netlify site-level plugin, not as an npm dependency. Having it as an npm dependency causes 404 on all routes.
5. **HF Pro upgrade pending.** Hugging Face account is still on free tier. BLIP captioning may fail — the code falls back gracefully to HOD description. Pro subscription needed for reliable vision model access.
6. **Deploy repo TypeScript strictness.** Netlify's build runs a full `tsc` check that local Turbopack skips. Supabase query builder returns `PromiseLike` (not `Promise`) — `.catch()` must be preceded by `Promise.resolve()`. Supabase join results are typed as arrays — cast through `unknown` before treating as a single object.
7. **v2.6 is production.** Promoted on 8 April 2026. HOD portal `main` → `658b162`; admin portal `main` → `a803f6d`. Both Netlify production sites are running v2.6. v2.5 is superseded.
8. **Migration 017 has been applied.** Executed 7 April 2026. All four account operations verified in the database.
9. **Live validation complete (8 Apr 2026).** Results and refinement backlog are in `versions/v2.6/final_validation.md`. Next step is **production promotion** and/or **v2.6 refinement** (daily brief load experience, human-readable exports for room grids / complex JSON, offline queue post-success messaging and redirect to report view).
10. **Google Drive uses OAuth, not service account.** Service accounts have zero file storage quota. Drive uploads use an OAuth2 refresh token from a real Google account. If the token expires, re-run `scripts/get-drive-token.js`.
11. **OpenRouter model history.** Claude 3.5 Sonnet was retired by OpenRouter in early April 2026. Claude Sonnet 4.6 has a reasoning parameter that consumed the token budget — do not use. Current model is Claude Sonnet 4 (3-8s response time, well within Netlify's 26s timeout).
12. **v2.6 production refinement complete.** All five phases finished 8 April 2026. Full record in [versions/v2.6/v2.6_refinement_plan.md](../versions/v2.6/v2.6_refinement_plan.md) and [versions/v2.6/snapshot.md](../versions/v2.6/snapshot.md).

---

## v2.6 phased refinement — links (use in every handover refresh)

| Document | Relative path from this file |
|----------|------------------------------|
| **Refinement plan** (phases, checklists, gates) | [`../versions/v2.6/v2.6_refinement_plan.md`](../versions/v2.6/v2.6_refinement_plan.md) |
| **v2.6 snapshot** (release record — update after each phase) | [`../versions/v2.6/snapshot.md`](../versions/v2.6/snapshot.md) |

**Refinement status:** All five phases complete. **Promoted to production 8 Apr 2026.**

**Rule:** Do not start Phase *N+1* until Phase *N* implementation **and** its documentation gate (snapshot + handover + plan ticks) are done.

---

## Immediate next chat

v2.6 is live on production. Development, validation, all five refinement phases, and production promotion are complete.

**Read first:**

1. `4_development/next_chat_handover.md`
2. [`versions/v2.6/snapshot.md`](../versions/v2.6/snapshot.md) — **full v2.6 release record**

**Then choose a path:**

**A — v2.7+ development:** v2.6 is closed. Future work is new-feature territory — see the long-term vision section below for ideas. Start a new version plan when ready.

**B — Production smoke test:** Verify https://hoddailyreports.netlify.app and https://hod-admin-portal.netlify.app are healthy post-deploy.

---

## Production promotion

v2.6 was promoted to production on 8 April 2026. All five refinement phases were included in the promotion. DB migration `017` was applied on 7 April 2026. Live validation on dev previews completed 8 April 2026 (`versions/v2.6/final_validation.md`). Both deploy repos `main` branches are at the v2.6 refinement commits.

To promote future changes:

```bash
cd ~/hod_daily_reports && git checkout main && git merge dev && git push origin main
cd ~/hod_admin_portal && git checkout main && git merge dev && git push origin main
```

Verify:
- https://hoddailyreports.netlify.app loads and login works
- https://hod-admin-portal.netlify.app loads and login works
- Analysis page generates content within 20 seconds
- Overview shows Daily Brief and Trend Insights

---

## Long-term vision (not yet built)

- **Cross-departmental action items** — AI-orchestrated work tracking between departments
- **Food cost projections** — Kitchen inventory data for cost trending, consumption patterns
- **Visitor landscape** — Main Gate + Reception data combined for people flow tracking
- **Accommodation analysis** — Room grid data for occupancy rates and maintenance patterns
- **Security trends** — Incident patterns, patrol coverage, equipment damage frequency
- **WhatsApp alerts** — Urgent flag notifications via WhatsApp
- **PWA / service worker** — True offline support beyond the current browser-API approach

---

## Deployment workflow

Both applications use a `main`/`dev` branching strategy across three GitHub repos:

| Repo | Purpose | Production | Dev preview |
|---|---|---|---|
| `thebusinessdevelopers/the-business-developers` | Monorepo (docs + source) | `main` branch | `dev` branch |
| `thebusinessdevelopers/hod_daily_reports` | HOD portal deploy | `main` → hoddailyreports.netlify.app | `dev` → dev--hoddailyreports.netlify.app |
| `thebusinessdevelopers/hod_admin_portal` | Admin portal deploy | `main` → hod-admin-portal.netlify.app | `dev` → dev--hod-admin-portal.netlify.app |

The deploy repos are standalone mirrors of `portal/` and `admin-portal/`, each bundling `packages/shared/` directly. Push code changes to the deploy repos to trigger Netlify builds.

---

## Build principles (carry forward)

1. **Simplicity over sophistication.** Default to the simpler option.
2. **Functional over polished.** Working beats beautiful.
3. **Mobile-friendly by default.** Test at 375px width minimum.
4. **Config-driven forms.** Single renderer, config file defines everything.
5. **JSONB for flexibility.** Form changes don't require DB migrations.
6. **Test before moving on.** Every phase has a validation gate. All items must pass.

---

*Updated: 8 April 2026. **v2.6 is live on production.** 14 bugs fixed, migration 017 applied, prod-spec iteration shipped, live validation passed, all five refinement phases complete. Promoted to production 8 April 2026. Full record in [`versions/v2.6/snapshot.md`](../versions/v2.6/snapshot.md). **Next:** v2.7+ planning.*
