# HOD Daily Reports — Handover

> **Purpose:** Everything you need to continue building HOD Daily Reports. Load this file, follow the context loading instructions, then continue from where we left off.
>
> **Updated:** 26 March 2026
> **Current version:** v2.3 built on dev branch, pending deploy
> **Base version:** v2.0 complete (production), v2.1 complete (dev), v2.2 complete (dev), v2.3 complete (dev)
> **HOD portal:** https://hoddailyreports.netlify.app (production — v2.0)
> **Admin portal:** https://hod-admin-portal.netlify.app (production — v2.0)
> **HOD dev preview:** https://dev--hoddailyreports.netlify.app (v2.2 ✓ live)
> **Admin dev preview:** https://dev--hod-admin-portal.netlify.app (v2.2 ✓ live)

---

## How to load context

**Read these files in order before doing anything else:**

1. This file (you're reading it)
2. `context.md` — project overview, folder structure, technical state
3. `3_architecture/build_rules.md` — standards and principles (still apply)
4. `versions/v2.0/snapshot.md` — what v2.0 delivered (production)
5. `versions/v2.1/snapshot.md` — what v2.1 delivered (dev branch)
6. `versions/v2.2/snapshot.md` — what v2.2 delivered (dev branch, deployed)
7. `versions/v2.3/snapshot.md` — what v2.3 delivered (dev branch, pending deploy)

Then read the source files relevant to whichever task you're building.

---

## What the project is

Ziwa Rhino And Wildlife Ranch has 16 departments. Each head of department (HOD) submits a daily operational report through a web portal. An admin dashboard provides oversight, compliance tracking, and AI-powered analysis.

Two Next.js applications share a single Supabase database:

- **HOD Portal** — the reporting tool HODs use daily (login, submit, edit, drafts, photos)
- **Admin Portal** — dashboard for reviewing reports, compliance, stock, announcements, activity logs, AI analysis

---

## Version history

| Version | What it delivered |
|---|---|
| **v2.0** | Production release. Custom auth, two-stage hub, server-side submission, connectivity resilience, room grid, documentation. |
| **v2.1** | Photo attachments, inventory grid, activity log, password self-service, announcements, pre-fill, admin overview enhancements, HF AI integration. |
| **v2.2** | Instant photo uploads (AI decoupled), OpenRouter integration (Claude Sonnet 4.6), shared workspace package, FormRenderer split, admin edit API, Analysis tab, cleanup pass. |
| **v2.3** | InventoryGrid remove buttons, individual admin accounts (7 users, session-based auth), comprehensive activity tracking with role-based visibility, Head Office (Reservations) department (16th). |

---

## Current architecture (v2.2)

### Application structure

```
4_development/
├── package.json              ← npm workspace root
├── portal/                   ← HOD portal (Next.js 16, Tailwind v4, React 19)
├── admin-portal/             ← Admin portal (same stack)
└── packages/
    └── shared/               ← @hod/shared — types, config, lib, components
```

Both apps depend on `@hod/shared` and use thin re-export files to maintain existing `@/` import paths. The shared package is transpiled via `transpilePackages` in `next.config.ts`.

### Deploy repos

The deploy repos (`hod_daily_reports`, `hod_admin_portal`) are standalone mirrors — they each contain the app code plus a copy of `packages/shared/` with `"@hod/shared": "file:packages/shared"` in `package.json`. Netlify has no workspace concept, so the shared package is bundled directly.

### AI platform split

| Platform | Model | Task |
|---|---|---|
| **OpenRouter** | `anthropic/claude-sonnet-4.6` (with reasoning) | Daily digest, urgency detection, period analysis |
| **Hugging Face** | `facebook/detr-resnet-50`, `Salesforce/blip-image-captioning-large` | Object detection, image captioning (background, post-submission) |

OpenRouter client: `packages/shared/lib/openrouter.ts` — accepts configurable `referer` and `title` per app. Supports `reasoningEffort` parameter (low/medium/high).

### Key data flows

**Photo upload:** Instant storage upload → HOD sees success → after report submission, `POST /api/ai/process-media` runs HF models in background and updates `hod_report_media` with `ai_description` and `ai_tags`.

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
| DB tables | `hod_departments` (16), `hod_daily_reports`, `hod_verified_stock`, `hod_item_library`, `hod_drafts`, `hod_error_log`, `hod_users`, `hod_sessions`, `hod_activity_log`, `hod_report_media`, `hod_announcements`, `hod_analysis_cache` |
| Frontend (HOD) | Next.js 16, Tailwind v4, React 19 — `4_development/portal/` |
| Frontend (Admin) | Next.js 16, Tailwind v4, React 19 — `4_development/admin-portal/` |
| Shared package | `@hod/shared` at `4_development/packages/shared/` |
| HOD live URL | https://hoddailyreports.netlify.app |
| Admin live URL | https://hod-admin-portal.netlify.app |
| Repository (monorepo) | https://github.com/thebusinessdevelopers/the-business-developers |
| Repository (HOD deploy) | https://github.com/thebusinessdevelopers/hod_daily_reports |
| Repository (Admin deploy) | https://github.com/thebusinessdevelopers/hod_admin_portal |
| Branching | `main` = production, `dev` = development (all three repos) |

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
| `008_report_media.sql` | `hod_report_media` table for photo metadata |
| `009_item_library_defaults.sql` | `default_unit` and `default_cost_per_unit` on `hod_item_library` |
| `010_announcements.sql` | `hod_announcements` table |
| `011_ai_flags.sql` | `ai_flags jsonb` column on `hod_daily_reports` |
| `hod_analysis_cache` (DDL) | Analysis cache table (created via `execute_sql`, no migration file) |
| `012_v2_3_schema.sql` | Admin columns (`admin_tier`, `admin_title`), 6 admin accounts, Head Office department + 3 user accounts |

### Environment variables (set on both Netlify sites)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side key for API routes |
| `ADMIN_PASSWORD` | **Deprecated in v2.3.** Admin portal now uses per-user accounts via `hod_users`/`hod_sessions`. |
| `HF_TOKEN` | Hugging Face Inference API token (Read scope) |
| `OPENROUTER_API_KEY` | OpenRouter API key for Claude Sonnet 4.6 |

---

## Two applications

### HOD Portal (`4_development/portal/`)

The HOD-facing reporting tool. Login picker → Department hub → Report form.

**Routes:**

| Route | Purpose |
|---|---|
| `/login` | Multi-step login picker |
| `/` | Redirect: authenticated → `/report/[slug]`, else → `/login` |
| `/report/[slug]` | Department hub: smart date buttons, recent reports, edit countdown |
| `/report/[slug]/new?date=YYYY-MM-DD` | New report form with locked date |
| `/report/[slug]/view/[id]` | Read-only report viewer |
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
| `POST /api/upload-media` | Instant photo upload (no AI blocking) |
| `POST /api/ai/process-media` | Background AI processing for a single photo |
| `POST /api/harvest-items` | Upsert repeater items into library |
| `GET /api/item-suggestions/[slug]` | Autocomplete suggestions |
| `GET /api/inventory-items/[slug]` | Inventory items and previous quantities |
| `POST /api/change-password` | HOD password change |
| `POST /api/log-error` | Client error logging |
| `GET /api/stock-projection/[slug]` | Stock projection calculation |

**Key files:**

| File | Purpose |
|---|---|
| `lib/auth.ts` | Auth library: hash, verify, sessions, activity log, getCurrentUser |
| `config/login-users.ts` | Login picker roster: 16 departments with slugs and user lists |
| `config/forms.ts` | All 16 department form configs |
| `components/FormRenderer.tsx` | Config-driven form engine (orchestrator — delegates to form/ modules) |
| `components/form/FieldRenderer.tsx` | Field type switching (~210 lines extracted from FormRenderer) |
| `components/form/FormValidation.ts` | Pure validation function |
| `components/PhotoUploader.tsx` | Photo selection, description, category, upload UI |
| `hooks/useDraftManager.ts` | Draft load/save/clear with dual-write |
| `hooks/useSubmissionQueue.ts` | Submission queue with auto-retry |
| `middleware.ts` | Route protection |

### Admin Portal (`4_development/admin-portal/`)

**Routes:**

| Route | Purpose |
|---|---|
| `/` | Overview: KPI cards, submissions, rate bars, daily digest, analysis link |
| `/reports` | Filterable reports table with review dots, CSV export, batch review |
| `/reports/[id]` | Report detail with signed-URL photo gallery |
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

**Authentication (v2.3):** Per-user admin accounts backed by `hod_users` (role=admin) and `hod_sessions`. Seven accounts (MD, CEO, Chairman, GM, Isaac, Wycliffe, Joshua) with two tiers: senior (MD, CEO, Chairman, Joshua) can see all admin activity; standard (GM, Isaac, Wycliffe) cannot. Login via user picker + password.

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
| `wildlife.wycliff` | Wycliff | Wildlife | yes |
| `craftshop.halima` | Halima | Craft Shop | yes |
| `craftshop.patience` | Patience | Craft Shop | yes |
| `headoffice.florence` | Florence | Head Office | yes |
| `headoffice.julie` | Julie | Head Office | yes |
| `headoffice.isaac` | Isaac | Head Office | yes |

**Admin accounts (v2.3):**

| Username | Display Name | Title | Tier |
|---|---|---|---|
| `admin.joshua` | Joshua | Project Admin | senior |
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

1. **v2.2 not yet merged to production.** Both dev preview URLs are live and ready for testing. Once tested, merge to `main` on all three repos to promote to production.
2. **npm install required for local dev.** The workspace setup (`packages/shared`) requires running `npm install` from `4_development/` root to set up symlinks before local dev works.
3. **`hod_analysis_cache` has no migration file.** Table was created via `execute_sql`. If the database is rebuilt, this table needs manual creation.
4. **Shared config/forms.ts not extracted.** The form configs differ between portal and admin portal (portal has photo/inventory sections, admin has legacy config). Kept separate deliberately.
5. **Netlify plugin configuration.** The `@netlify/plugin-nextjs` must be registered as a Netlify site-level plugin, NOT as an npm dependency. Having it as an npm dependency causes 404 on all routes.
6. **HF Pro upgrade pending.** Hugging Face account is still on free tier. BLIP captioning may fail — the code falls back gracefully to HOD description. Pro subscription needed for reliable vision model access.
7. **Deploy repo TypeScript strictness.** Netlify's build runs a full `tsc` check that local Turbopack skips. Supabase query builder returns `PromiseLike` (not `Promise`) — `.catch()` must be preceded by `Promise.resolve()`. Supabase join results are typed as arrays — cast through `unknown` before treating as a single object.
8. **Craft Shop form glitch (monitoring).** One user reported items disappearing and being redirected to the login screen. Investigation concluded this is almost certainly the session idle timeout (`useSessionTimer`) kicking in — not a form bug. The session timer listens for `mousemove`, `keydown`, `touchstart`, and `click` but not `scroll`. Draft autosave is on a 30-second debounce, so recent additions may not persist before redirect. No code changes made; monitor for further reports.

---

## Long-term vision (not yet built)

These were identified during v2.2 planning as the eventual direction:

- **Cross-departmental action items** — AI-orchestrated work tracking between departments (e.g. Electrical repairs flagged by Housekeeping)
- **Food cost projections** — Kitchen inventory data for cost trending, consumption patterns, purchase forecasting
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

## When you finish each phase

1. Run all validation gate checks for that phase
2. Update this handover file's status table
3. Create a snapshot at `versions/vX.X/snapshot.md`
4. Note any issues discovered, decisions made, or deviations from the plan
5. Proceed to the next phase

---

*Updated: 26 March 2026. v2.0 in production. v2.1, v2.2, and v2.3 on dev branch. v2.3 pending deploy to dev preview URLs. Ready for deploy or v2.4 planning.*
