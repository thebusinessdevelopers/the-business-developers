# HOD Daily Reports — Handover

> **Purpose:** Everything you need to continue building HOD Daily Reports. Load this file, follow the context loading instructions, then continue from where we left off.
>
> **Updated:** 12 April 2026 (v2.8 closed — dev previews live, agent validation passed, awaiting Joshua's sign-off)
> **Current version:** v2.8 — CLOSED. All three sub-cycles complete (v2.8.1 development, v2.8.2 first refinement, v2.8.3 second refinement). Dev previews are live and healthy. Migration 030 applied. Awaiting Joshua's final live validation before promoting to production.
> **Production version:** v2.6 (live since 8 Apr 2026 — promote v2.8 after Joshua's sign-off)
> **HOD portal:** https://hoddailyreports.netlify.app (production — v2.6)
> **Admin portal:** https://hod-admin-portal.netlify.app (production — v2.6)
> **HOD dev preview:** https://dev--hoddailyreports.netlify.app (v2.8 — live and validated)
> **Admin dev preview:** https://dev--hod-admin-portal.netlify.app (v2.8 — live and validated)

---

## How to load context

**Read these files in order before doing anything else:**

1. This file (you're reading it)
2. `3_architecture/build_rules.md` — standards and principles (still apply)
3. `versions/v2.8/snapshot.md` — **authoritative v2.8 final release record** (what was delivered, policy maps, migration record)
4. `versions/v2.9/backlog.md` — **v2.9 planned scope**

**For deeper v2.8 context (only if needed):**

5. `versions/v2.8/README.md` — v2.8 folder architecture guide
6. `versions/v2.8/v2.8.3/plan.md` — v2.8.3 completion plan
7. `versions/v2.8/v2.8.3/phase_2_refinement_investigation.md` — root causes and fix direction
8. `versions/v2.8/v2.8.3/phase_2_refinement_validation.md` — validation model
9. `versions/v2.8/v2.8.3/v2.8.3_live_observations.md` — live browser validation results
10. `versions/v2.7/snapshot.md` — v2.7 release record

Then read the source files relevant to whichever task you're building.

---

## What the project is

Ziwa Rhino And Wildlife Ranch has 16 departments. Each head of department (HOD) submits a daily operational report through a web portal. An admin dashboard provides oversight, compliance tracking, and AI-powered analysis.

Two Next.js applications share a single Supabase database:

- **HOD Portal** — the reporting tool HODs use daily (login, submit, edit, drafts, photos, messages, meetings, room bookings)
- **Admin Portal** — dashboard for reviewing reports, compliance, stock, announcements, activity logs, AI analysis, discussion threads, meeting management, accommodation booking management

---

## Version history

| Version | What it delivered |
|---|---|
| **v2.0** | Production release. Custom auth, two-stage hub, server-side submission, connectivity resilience, room grid, documentation. |
| **v2.1** | Photo attachments, inventory grid, activity log, password self-service, announcements, pre-fill, admin overview enhancements, HF AI integration. |
| **v2.2** | Instant photo uploads, OpenRouter integration (Claude), shared workspace package, FormRenderer split, admin edit API, Analysis tab. |
| **v2.3** | Individual admin accounts (7 users), activity tracking with role-based visibility, Head Office (16th dept), draft auto-save on logout, HOD sign-out button. |
| **v2.4** | Photo picker fix, Google Drive media sync, messaging system (@mention, threaded discussion, notification polling, global message banner). |
| **v2.5** | 13 phases: mandatory field indicators, N/A toggle, mobile nav, stock data quality, AI overhaul (daily brief, caching), universal mentions, dashboard RPC, thumbnails, AI failure recovery, report comparison, trend insights, export system. |
| **v2.6** | Reliability-first: 14 bugs fixed, migration 017, prod-spec iteration (model update, compliance, exports, stock editing), 5-phase refinement (digest/insights UX, room grid exports, offline queue success UX, thread double-submit guard, build verification). **Production since 8 Apr 2026.** |
| **v2.7** | Three major features + system improvements. **Phase 0:** Elly account transition. **Phase 1:** Auth hardening (rate limiting, role filter, sliding sessions), forms consolidation, admin pagination (50/page), AI tool-use upgrade, notification batching, stock (Kitchen added, API routes), media (800px variant). **Phase 2:** HOD Form Intelligence — section pagination, active prompts, `visibleIf` conditionals, previous-report comparison, flag-for-management, quality nudge, repeater suggestions. **Phase 3:** HOD Meeting Tool — full meeting records, 8-section form, action items with lifecycle, admin approval, notifications. **Phase 4:** Accommodation Booking Portal Phase 1 — 27-unit catalogue, calendar view, booking CRUD, rate auto-population, daily rooming summary, change requests, CSV export. **Phase 5:** Build verification, documentation. |
| **v2.8** | *CLOSED — dev previews live, awaiting Joshua's final sign-off before production promotion.* Three sub-cycles: **v2.8.1** (6 build phases — bug fixes, stock quality, meeting tool Phase 2, accommodation Phase 2, reports/forms/auth, performance). **v2.8.2** (5 refinement areas — crash fix, notification system, booking basket redesign, HOD calendar, HOD booking permissions; migrations 028–029). **v2.8.3** (logo fix, lint cleanup, account integrity migration 030, accommodation policy backbone, accommodation interaction model, session lifecycle, live deployment and validation). |

---

## Current architecture (v2.7)

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
| **OpenRouter** | `anthropic/claude-sonnet-4` | Daily digest, urgency detection (tool-use API), period analysis, trend detection, export summaries |
| **Hugging Face** | `facebook/detr-resnet-50`, `Salesforce/blip-image-captioning-large` | Object detection, image captioning (background, post-submission) |

OpenRouter client: `packages/shared/lib/openrouter.ts`. **Critical constraint:** Netlify serverless functions have a 26-second timeout. All OpenRouter calls must complete within ~20s. Claude Sonnet 4 at 1200 maxTokens responds in 3-8s. **Model history:** Claude 3.5 Sonnet was retired by OpenRouter. Claude Sonnet 4.6's `reasoning` parameter consumed the token budget — do not use.

### Key shared libraries

| File | Purpose |
|---|---|
| `packages/shared/lib/openrouter.ts` | OpenRouter client |
| `packages/shared/lib/fuzzy-search.ts` | `fuzzyMatch()`, `toTitleCase()`, `similarity()`, `findDuplicateGroups()` |
| `packages/shared/lib/extract-metrics.ts` | `extractKeyMetrics()`, `formatMetricsForPrompt()` |
| `packages/shared/lib/visible-if.ts` | `VisibleIfCondition` type + `shouldShowField()` evaluator |
| `packages/shared/lib/notification-batch.ts` | `groupNotifications()`, `threadBatchKey()`, `reportBatchKey()`, `meetingBatchKey()` |
| `packages/shared/lib/na-markers.ts` | Centralised N/A marker utilities |
| `packages/shared/config/forms.ts` | Canonical `DEPARTMENT_FORMS` for all 16 departments |
| `packages/shared/config/meetings.ts` | Meeting constants, secretary options, Tuesday date helpers, core attendee lists |
| `packages/shared/config/accommodation.ts` | Accommodation labels, capability/date-range policy maps, calendar range helpers |
| `packages/shared/types/index.ts` | All shared types including `Meeting`, `MeetingActionItem`, `AccommodationUnit`, `Booking`, etc. |
| `packages/shared/components/ThreadView.tsx` | Shared thread viewer with useRef double-submit lock |

### Key data flows

**Report submission:** HOD submits → server-side validation → DB insert → stock (if Monday) → harvest items → activity log → background AI (urgency detection via tool-use, media processing).

**Photo upload:** Instant storage upload → HOD sees success → background Drive push to `media/{dept}/{month}` → after report submission, HF models run and update `hod_report_media`.

**Meeting flow:** Secretary submits meeting record → admin reviews → admin approves → all HODs notified → action items assigned → HODs complete items → admin verifies.

**Accommodation flow:** Admin creates/edits bookings → calendar view updates → daily summary generated → HOD Rooms tab follows the shared policy window → Head Office can create direct bookings → HQ Reception / Housekeeping / Main Gate can create approval-gated bookings and submit change requests → other departments remain read-only until the Phase 4 interaction pass → admin reviews.

**Messaging:** Thread messages in `hod_report_threads`. Mention processing creates `hod_notifications`. HOD portal polls every 60s, admin every 30s. `since` param used in polling for efficiency.

---

## Technical state

| Service | Detail |
|---|---|
| Supabase project | `inidzwfjnkyinxhvbrdt` (EU West Frankfurt) |
| Supabase URL | `https://inidzwfjnkyinxhvbrdt.supabase.co` |
| DB timezone | `Africa/Kampala` |
| DB tables (v2.6 production) | `hod_departments`, `hod_daily_reports`, `hod_verified_stock`, `hod_item_library`, `hod_drafts`, `hod_error_log`, `hod_users`, `hod_sessions`, `hod_activity_log`, `hod_report_media`, `hod_announcements`, `hod_analysis_cache`, `hod_report_threads`, `hod_notifications`, `hod_stock_flags` |
| DB tables (v2.7 new) | `hod_meetings`, `hod_meeting_action_items`, `accommodation_units`, `accommodation_rates`, `bookings`, `booking_rooms`, `booking_change_requests` |
| Frontend (HOD) | Next.js 16, Tailwind v4, React 19 — `4_development/portal/` |
| Frontend (Admin) | Next.js 16, Tailwind v4, React 19 — `4_development/admin-portal/` |
| Shared package | `@hod/shared` at `4_development/packages/shared/` |
| HOD live URL | https://hoddailyreports.netlify.app |
| Admin live URL | https://hod-admin-portal.netlify.app |
| Repository (monorepo) | https://github.com/thebusinessdevelopers/the-business-developers |
| Repository (HOD deploy) | https://github.com/thebusinessdevelopers/hod_daily_reports |
| Repository (Admin deploy) | https://github.com/thebusinessdevelopers/hod_admin_portal |
| Branching | `main` = production, `dev` = development (all three repos) |

### Database migrations

| File | Summary |
|---|---|
| `001_hod_reports_schema.sql` | Core: `hod_departments`, `hod_daily_reports`, RLS, department seeding |
| `002_verified_stock.sql` | `hod_verified_stock` for Monday baselines |
| `003_item_library.sql` | `hod_item_library` for autocomplete |
| `004_v16_schema.sql` | Edit history, unique report constraint, acknowledgements, verified stock status |
| `005_v18_schema.sql` | Anon select on reports, `hod_error_log`, `hod_drafts`, review comments |
| `006_v2_schema.sql` | Auth tables (`hod_users`, `hod_sessions`, `hod_activity_log`), user seeding |
| `007_v2_substitute_users_and_password_display.sql` | Substitute accounts, `password_display` column |
| `008_report_media.sql` | `hod_report_media` table |
| `009_item_library_defaults.sql` | `default_unit` and `default_cost_per_unit` on `hod_item_library` |
| `010_announcements.sql` | `hod_announcements` table |
| `011_ai_flags.sql` | `ai_flags jsonb` column on `hod_daily_reports` |
| `012_v2_3_schema.sql` | Admin columns, 6 admin accounts, Head Office department |
| `013_v2_4_schema.sql` | Performance indexes, `ai_status`, Drive columns, `hod_report_threads`, `hod_notifications` |
| `014_v2_5_stock_flags.sql` | `hod_stock_flags` table |
| `015_v2_5_dashboard_stats_rpc.sql` | `get_dashboard_stats` SQL function |
| `016_v2_5_thumbnails_and_ai_recovery.sql` | `thumbnail_path`, `ai_error_message` columns |
| `017_v2_6_account_access_updates.sql` | `admin.royfamily`, `wildlife.samuel`, account renames (applied 7 Apr 2026) |
| `018_elly_transition.sql` | **v2.7** — `is_active` column, Elly disabled, Anita promoted |
| `019_analysis_cache.sql` | **v2.7** — `hod_analysis_cache` formalised |
| `020_notification_batching.sql` | **v2.7** — `batch_key` column + index on `hod_notifications` |
| `021_media_medium_path.sql` | **v2.7** — `medium_path` on `hod_report_media` |
| `022_meetings.sql` | **v2.7** — `hod_meetings`, `hod_meeting_action_items` |
| `023_accommodation.sql` | **v2.7** — `accommodation_units` (27 seeded), `accommodation_rates` (2026+2027), `bookings`, `booking_rooms`, `booking_change_requests` |
| `024_notification_types.sql` | **v2.8** — Widen `hod_notifications.type` CHECK for meeting/action item notification types + `secretary_invited` |
| `025_room_pax_config.sql` | **v2.8** — `pax_config` JSONB on `accommodation_units` (bed configs, max pax, cot eligibility for all 27 units) |
| `026_structured_change_requests.sql` | **v2.8** — `requested_changes` JSONB on `booking_change_requests` |
| `027_booking_activity_log.sql` | **v2.8** — `booking_activity_log` table for booking lifecycle tracking |
| `028_room_basket_config.sql` | **v2.8 refinement** — `room_config` JSONB on `booking_rooms` for per-room basket data |
| `029_hod_booking_permissions.sql` | **v2.8 refinement** — `hod_pending` booking status + booking approval notification types |
| `030_phase2_reset_first_password_support.sql` | **v2.8 Phase 2** — retire `password_display` support data and restore Martine's no-auto-logout exception |

### Environment variables (set on both Netlify sites)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side key for API routes |
| `HF_TOKEN` | Hugging Face Inference API token (Read scope) |
| `OPENROUTER_API_KEY` | OpenRouter API key for `anthropic/claude-sonnet-4` |
| `GOOGLE_DRIVE_CLIENT_ID` | OAuth client ID for Drive uploads |
| `GOOGLE_DRIVE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | OAuth refresh token (from `scripts/get-drive-token.js`) |
| `GOOGLE_DRIVE_FOLDER_ID` | Root Google Drive folder ID |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service account key (non-upload Drive operations) |
| `INTERNAL_ROUTE_TOKEN` / `INTERNAL_JOB_TOKEN` | Internal token for protected service-role routes |

---

## Two applications

### HOD Portal (`4_development/portal/`)

The HOD-facing reporting tool. Login picker → Department hub → Report form / Messages / Meetings / Rooms.

**Routes:**

| Route | Purpose |
|---|---|
| `/login` | Multi-step login picker |
| `/` | Redirect: authenticated → `/report/[slug]`, else → `/login` |
| `/report/[slug]` | Department hub: Reports tab, Messages tab, Meetings tab, Rooms tab |
| `/report/[slug]/new?date=YYYY-MM-DD` | New report form with locked date |
| `/report/[slug]/view/[id]` | Read-only report viewer with Discussion section |
| `/report/[slug]/edit/[id]` | Edit a submitted report (within edit window) |
| `/account` | HOD password change |

**API routes:**

| Route | Purpose |
|---|---|
| `POST /api/auth/login` | Username/password login (rate limited: 3 attempts / 15-min lockout) |
| `POST /api/auth/guest-login` | Guest login (no password) |
| `POST /api/auth/logout` | Session destruction |
| `GET /api/auth/session` | Session health check |
| `POST /api/submit-report` | Server-side submission |
| `POST /api/upload-media` | Instant photo upload + background Drive push |
| `POST /api/ai/process-media` | Background AI processing |
| `POST /api/harvest-items` | Upsert repeater items into library |
| `GET /api/item-suggestions/[slug]` | Autocomplete suggestions |
| `GET /api/inventory-items/[slug]` | Inventory items and previous quantities |
| `POST /api/change-password` | HOD password change |
| `POST /api/log-error` | Client error logging |
| `GET /api/stock-projection/[slug]` | Stock projection calculation |
| `GET /api/threads/[reportId]` | Fetch thread messages |
| `POST /api/threads/[reportId]` | Post message to thread |
| `GET /api/mention-users` | User list for @mention picker |
| `GET /api/notifications` | Notifications with unread count |
| `GET /api/notifications/check` | Lightweight notification check (with `since`) |
| `POST /api/notifications/read` | Mark notification(s) as read |
| `GET /api/global-messages` | Public — login page messages |
| `GET /api/repeater-suggestions` | **v2.7** — Historical repeater suggestions (last 30 days) |
| `GET /api/meetings` | **v2.7** — Approved meetings list |
| `GET /api/meetings/[id]` | **v2.7** — Meeting detail |
| `POST /api/meetings/action-items/complete` | **v2.7** — HOD action item completion |
| `GET /api/accommodation` | **v2.7** — HOD read-only bookings (today + 7 days) |
| `POST /api/accommodation/change-requests` | **v2.7** — Submit booking change request |
| `GET /api/meetings/delegated` | **v2.8** — Pending secretary delegations + form data |
| `PUT /api/meetings/delegated/[id]` | **v2.8** — Secretary submits completed meeting |

**Key files (v2.7 additions in bold):**

| File | Purpose |
|---|---|
| `lib/auth.ts` | Auth library (now with rate limiting + `is_active` check) |
| `lib/with-auth.ts` | `withAuth()` wrapper (now with sliding session) |
| `config/login-users.ts` | Login picker roster (Elly removed) |
| `config/forms.ts` | Re-exports from `@hod/shared/config/forms.ts` with photo injection |
| `components/FormRenderer.tsx` | Config-driven form engine (now with section pagination + `visibleIf`) |
| `components/form/FieldRenderer.tsx` | Field type switching (now with previous-report comparison, quality nudge) |
| **`components/form/SectionProgress.tsx`** | **Sticky section progress bar for paged forms** |
| **`app/report/[slug]/MeetingsTab.tsx`** | **Meetings list + detail viewer + action item completion + secretary delegation** |
| **`app/report/[slug]/SecretaryMeetingForm.tsx`** | **v2.8 — Full meeting form for secretary delegation** |
| **`app/report/[slug]/RoomsTab.tsx`** | **Read-only accommodation view + change request submission** |
| `hooks/useDraftManager.ts` | Draft load/save/clear with dual-write |
| `hooks/useSessionTimer.ts` | Idle/daily/poll logout with sliding session |
| `hooks/useSubmissionQueue.ts` | Submission queue with auto-retry |
| `hooks/useNotifications.ts` | Notification polling (60s, with `since` param) |

### Admin Portal (`4_development/admin-portal/`)

**Routes:**

| Route | Purpose |
|---|---|
| `/` | Overview: KPI cards, submissions, rate bars, daily digest, trend insights |
| `/reports` | Filterable reports table (50/page server-side pagination) with review dots |
| `/reports/[id]` | Report detail with photo gallery, Discussion section |
| `/reports/[id]/edit` | Admin edit form |
| `/stock` | Stock reconciliation (F&B, Store, Kitchen) |
| `/compliance` | Per-department compliance bars (drillable links) |
| `/errors` | Error log |
| `/activity` | Activity log with filter dropdown (preserves tab param) |
| `/announcements` | Announcement management |
| `/analysis` | AI analysis with Daily/Weekly/Monthly tabs |
| `/users` | HOD user list with password reset |
| `/exports` | Export system: single, range, executive summary |
| **`/meetings`** | **v2.7** — Meeting management: submit, approve, action items |
| **`/accommodation`** | **v2.7** — Accommodation: calendar, bookings, summary, rooms, change requests |

**API routes (v2.7 additions in bold):**

| Route | Purpose |
|---|---|
| `POST /api/edit-report` | Admin edit with diff + audit trail |
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
| `GET/POST /api/threads/[reportId]` | Thread messages |
| `GET /api/mention-users` | User list for @mention |
| `GET /api/notifications` | Admin notifications |
| `GET /api/notifications/check` | Lightweight check (with `since`) |
| `POST /api/notifications/read` | Mark read |
| `GET /api/media/sync-to-drive` | Drive catch-up sweep |
| `POST /api/stock/scan-duplicates` | Scan for duplicate items |
| `POST /api/stock/merge-items` | Merge duplicates |
| `POST /api/stock/resolve-flag` | Resolve stock flag |
| `POST /api/stock/edit-entry` | Inline stock edit with audit |
| `GET /api/analysis/trends` | AI trend detection |
| `POST /api/exports/generate` | Export generation |
| `GET /api/exports/lookup` | Find report by dept+date |
| **`POST /api/stock/update-status`** | **Stock status update (replaces direct Supabase)** |
| **`GET/POST /api/meetings`** | **Meeting list + create** |
| **`GET /api/meetings/[id]`** | **Meeting detail** |
| **`PUT /api/meetings/[id]`** | **v2.8 — Edit meeting + upsert action items** |
| **`DELETE /api/meetings/[id]`** | **v2.8 — Delete meeting + cascade action items** |
| **`POST /api/meetings/approve`** | **Approve meeting** |
| **`POST /api/meetings/action-items`** | **Action item management** |
| **`GET /api/meetings/outstanding-items`** | **Outstanding items from prior meeting** |
| **`GET/POST /api/accommodation/bookings`** | **Booking list + create** |
| **`GET/PUT/DELETE /api/accommodation/bookings/[id]`** | **Booking CRUD** |
| **`GET/PUT /api/accommodation/units`** | **Unit list + status update** |
| **`GET /api/accommodation/rates`** | **Rate lookup** |
| **`GET /api/accommodation/daily-summary`** | **Daily rooming summary** |
| **`GET/POST /api/accommodation/change-requests`** | **Change request queue + review** |
| **`GET /api/accommodation/export`** | **CSV export** |

**Key files (v2.7 additions in bold):**

| File | Purpose |
|---|---|
| `lib/admin-auth.ts` | Admin auth (now with `accommodation_manage` + `meeting_manage` capabilities) |
| `lib/with-admin-auth.ts` | `withAdminAuth()` wrapper (now with sliding session) |
| `app/NavMenu.tsx` | Responsive nav (now with Meetings + Rooms links) |
| **`app/meetings/MeetingsClient.tsx`** | **Meeting list with filter tabs (All/Pending/Approved)** |
| **`app/meetings/MeetingForm.tsx`** | **8-section meeting record form** |
| **`app/meetings/MeetingDetailView.tsx`** | **Meeting detail with approval + action item management + edit/delete** |
| **`app/meetings/DelegateForm.tsx`** | **v2.8 — Secretary delegation form (meeting basics + secretary picker)** |
| **`app/accommodation/AccommodationClient.tsx`** | **Accommodation section orchestrator** |
| **`app/accommodation/CalendarView.tsx`** | **Gantt-style booking calendar** |
| **`app/accommodation/BookingForm.tsx`** | **Booking create/edit modal with rate auto-population** |
| **`app/accommodation/DailySummary.tsx`** | **Daily rooming summary with WhatsApp copy** |
| **`app/accommodation/ChangeRequestQueue.tsx`** | **Change request review queue** |
| **`app/accommodation/RoomManagement.tsx`** | **Room status management + A-Frame activation** |

**Authentication (v2.7):** Same 7 admin accounts as v2.6 plus two new capabilities: `accommodation_manage` and `meeting_manage`.

---

## HOD user accounts

Do not assume a shared current password. `ziwa2026` is only the historical seed/default for untouched accounts, and current passwords are not stored in recoverable form. If a user does not know the password, a senior admin should set a temporary one from the `Users` page, then the user should change it from `/account`. Usernames follow `department.firstname` pattern.

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
| ~~`housekeeping.elly`~~ | ~~Elly~~ | ~~Housekeeping~~ | **disabled (v2.7)** |
| `housekeeping.anita` | Anita | Housekeeping (Acting Head) | yes |
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

**Admin accounts:**

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

1. **Migrations 018–023 applied (9 Apr 2026).** All six v2.7 migrations executed on production Supabase via MCP. Verified: 25 accommodation units seeded, 98 rates seeded, 4 A-Frames inactive, Elly disabled, 5 new tables created.
2. **npm install required for local dev.** The workspace setup (`packages/shared`) requires running `npm install` from `4_development/` root.
3. **Netlify plugin configuration.** The `@netlify/plugin-nextjs` must be registered as a Netlify site-level plugin, not as an npm dependency.
4. **HF Pro upgrade pending.** Hugging Face free tier may cause BLIP captioning failures. Code falls back gracefully.
5. **Deploy repo TypeScript strictness.** Netlify's build runs a full `tsc` check that local Turbopack skips. Supabase query builder returns `PromiseLike` — `.catch()` must be preceded by `Promise.resolve()`. Join results typed as arrays — cast through `unknown`.
6. **Google Drive uses OAuth, not service account.** Service accounts have zero file storage quota. If the token expires, re-run `scripts/get-drive-token.js`.
7. **OpenRouter model history.** Claude 3.5 Sonnet retired (404). Claude Sonnet 4.6's reasoning parameter consumed token budget — do not use. Current: Claude Sonnet 4.
8. **A-Frame units inactive.** Four A-Frame accommodation units (Alfajiri, Kilele, Nyota, Upeo) are seeded as inactive. Activate via Room Management when commissioned (late May 2026). Final names to be confirmed by Head Office.
9. **v2.6 is still production.** Do not promote anything until the new v2.8 completion plan passes all agent gates and Joshua signs off on dev preview.
10. **v2.7 live validation complete (9 Apr 2026).** 55/57 tests pass. 2 bugs (occupancy count mismatch, change request no-effect) + 6 investigations logged. Full results in `versions/v2.7/validation.md`.
11. **v2.8 is closed and live on dev previews (12 Apr 2026).** All three sub-cycles delivered. Agent browser validation passed. Migration 030 applied. Awaiting Joshua's final sign-off before production promotion.
12. **Logo is served from application routes.** Both portals have `app/logo.png/route.ts` backed by `@hod/shared/config/logo.ts` base64 asset — no `public/` PNG dependency.
13. **v2.9 backlog seeded.** Overview redesign, performance resolution, AI refinement, accommodation Phase 3. See `versions/v2.9/backlog.md`.
14. **Portal lint is clean.** 0 errors, 3 warnings (acceptable `<img>` in PhotoUploader for blob URLs).
15. **Admin lint is clean.** 0 errors, 12 warnings (pre-existing, acceptable). ESLint config at `admin-portal/eslint.config.mjs` with `.netlify/**` excluded.
16. **Password support is reset-first.** `password_display` is retired. Do not look up or display passwords from this column. Support workflow: senior admin sets temporary password from Users page → user changes from `/account`.
17. **Accommodation policy lives in shared config.** All date-range and capability rules are in `packages/shared/config/accommodation.ts`. Never add per-file accommodation policy logic.

---

## Immediate next chat

**v2.8 is closed and live.** The only remaining action is Joshua's final human validation.

| Item | Status |
|------|--------|
| All source passes (v2.8.1/2/3) | **Complete** |
| Builds — both portals | **Passing** |
| Lint — both portals | **Clean** (0 errors) |
| Migration 030 | **Applied** |
| Dev previews | **Live and agent-validated** |
| Agent browser validation | **Passed** (`v2.8.3/v2.8.3_live_observations.md`) |
| Joshua's sign-off | **Pending** |

**Next actions:**
1. Joshua validates dev previews using `versions/v2.8/v2.8.3/phase_2_refinement_validation.md`
2. After sign-off → promote `dev` → `main` (see Production promotion section below)
3. Start v2.9 planning from `versions/v2.9/backlog.md`

---

## Production promotion

v2.6 is the current production version (promoted 8 April 2026). Promote v2.8 after Joshua's sign-off.

To promote v2.8:

```bash
cd ~/hod_daily_reports && git checkout main && git merge dev && git push origin main
cd ~/hod_admin_portal && git checkout main && git merge dev && git push origin main
```

Verify:
- https://hoddailyreports.netlify.app loads and login works
- https://hod-admin-portal.netlify.app loads and login works
- HOD logo renders correctly
- HOD Rooms tab works for Head Office, Reception, and Security according to the final policy
- Admin Accommodation page loads and booking flows work
- notifications and session smoke tests pass
- no critical blocker remains in the final validation record

---

## Deployment workflow

Both applications use a `main`/`dev` branching strategy across three GitHub repos:

| Repo | Purpose | Production | Dev preview |
|---|---|---|---|
| `thebusinessdevelopers/the-business-developers` | Monorepo (docs + source) | `main` branch | `dev` branch |
| `thebusinessdevelopers/hod_daily_reports` | HOD portal deploy | `main` → hoddailyreports.netlify.app | `dev` → dev--hoddailyreports.netlify.app |
| `thebusinessdevelopers/hod_admin_portal` | Admin portal deploy | `main` → hod-admin-portal.netlify.app | `dev` → dev--hod-admin-portal.netlify.app |

The deploy repos are standalone mirrors of `portal/` and `admin-portal/`, each bundling `packages/shared/` directly.

---

## Build principles (carry forward)

1. **Simplicity over sophistication.** Default to the simpler option.
2. **Functional over polished.** Working beats beautiful.
3. **Mobile-friendly by default.** Test at 375px width minimum.
4. **Config-driven forms.** Single renderer, config file defines everything.
5. **JSONB for flexibility.** Form changes don't require DB migrations.
6. **Test before moving on.** Every phase has a validation gate.

---

*Updated: 11 April 2026. v2.8 development and the first refinement cycle remain part of the project history, but the release is now reopened under the second refinement plan. v2.6 remains production. **Current position:** Phase 1 source fixes and local/build verification are done, and Phase 2 through Phase 5 now all have local source passes prepared. **Next:** complete the live preview validation and audit gates for Phase 1, then validate and close the prepared later phases in order.*
