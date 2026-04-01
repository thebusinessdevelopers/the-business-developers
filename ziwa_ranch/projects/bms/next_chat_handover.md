# BMS — Next Chat Handover

> **Purpose:** This file is the single brief for the next AI agent working on this project. Read it fully, load the context it specifies, execute the phase it defines, and produce your own handover at the end.
>
> **Produced by:** Chat 6 (Development — Stage 3 + Vercel Deployment Setup)
> **Date:** 1 April 2026
> **Phase completed:** Development Stage 3 — Offline + Vercel deployment configuration
> **Phase to execute:** Development Stage 4 — Stock

---

## Standing rule

**One phase per chat, never more.** At the end of your chat, write the next `next_chat_handover.md` at the project root to replace this one. It must be as complete and useful as this document — the next AI has never seen this project before.

---

## What this project is

BMS is a hospitality and tourism business management platform — a single unified product that any lodge, hotel, or tourism operation can onboard, configure, and use without custom development. Intelligence is the centrepiece: the system collects operational data from every department, processes it, and surfaces what matters to the right people at the right time.

**Owner:** Joshua Roy  
**First client / proving ground:** Ziwa Rhino and Wildlife Ranch  
**Product intent:** Generic, shippable to any hospitality business — Ziwa is the test case

---

## Context loading — read these files before doing anything else

1. `ziwa_ranch/projects/bms/context.md` — project overview and structure
2. `ziwa_ranch/projects/bms/3_architecture/design.md` — full system design: schema, RLS, offline architecture, intelligence triggers, app structure, key decisions
3. `ziwa_ranch/projects/bms/3_architecture/build_rules.md` — development rules, branch strategy, quality standards, build sequence
4. `ziwa_ranch/projects/bms/3_architecture/prd/00_scope.md` — PRD map
5. `ziwa_ranch/projects/bms/3_architecture/prd/03_stock_management.md` — Stage 4 PRD (what you will build against)
6. `global/sops/new_project_v2/scripts/04_build.md` — the build script you are executing

The application code lives at:
`ziwa_ranch/projects/bms/4_development/app/`

---

## What was accomplished in Chat 6

### Stage 3 — Offline: complete

All PRD 02 offline requirements (R2.16–R2.21) are implemented.

### Vercel deployment: configured

The project is ready for Vercel deployment. Branch strategy:
- `main` → Production
- `ziwa` → Staging (Ziwa's live environment)
- `dev` → Development preview

The `ziwa` branch has been created from `dev`. Vercel project needs to be linked via the Vercel dashboard — see "Vercel setup instructions" section below.

### Files produced

**PWA / Service Worker:**
- `public/sw.js` — Service worker using Workbox (loaded via CDN importScripts). Caches app shell pages (NetworkFirst), static assets like JS/CSS/fonts (StaleWhileRevalidate), images (CacheFirst), and Supabase REST API GET responses (NetworkFirst). Handles SW lifecycle events (skipWaiting, clients.claim).
- `src/components/sw-register.tsx` — Client component that registers the service worker on mount. Added to root layout.
- `src/app/manifest.ts` — PWA web app manifest (standalone display mode, BMS branding)

**Vercel config:**
- `vercel.json` — Enables deployments on `main`, `ziwa`, and `dev` branches
- `next.config.ts` — Updated with security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy) and service worker headers (no-cache, Service-Worker-Allowed)

**IndexedDB layer (idb):**
- `src/lib/offline/db.ts` — Full IndexedDB schema and CRUD operations using `idb`. Five object stores: `syncQueue` (pending offline submissions with status index), `departments` (cached form schemas), `stockItems` (cached stock items with orgId index), `reports` (cached recent reports with departmentId index), `profile` (cached user profile). All typed with TypeScript interfaces.

**Sync logic:**
- `src/lib/offline/sync.ts` — `enqueueSubmission()` writes to IndexedDB queue, `drainSyncQueue()` processes all pending items by POSTing to `/api/sync`, handles success/conflict/failure states
- `src/lib/offline/cache-warm.ts` — `warmDepartmentCache()` caches department schema, stock items, and recent reports to IndexedDB (called when loading submit page while online)
- `src/lib/offline/use-online-status.ts` — `useOnlineStatus()` hook using `useSyncExternalStore` for reactive online/offline state

**Sync API endpoint:**
- `src/app/api/sync/route.ts` — POST endpoint: validates payload with Zod, authenticates user, checks for existing report (idempotent if same sync_id), returns 409 conflict if different submission exists (server wins), inserts report + N/A sections, writes to `sync_queue` table for audit trail

**Offline provider + UI:**
- `src/components/offline-provider.tsx` — React context providing: `isOnline`, `queueCount`, `isSyncing`, `lastSyncResult`, `triggerSync()`, `refreshQueueCount()`. Auto-syncs when connectivity returns. Polls queue count every 5 seconds.
- `src/components/sync-indicator.tsx` — Fixed bottom banner following the design spec: hidden when synced (silence = good), amber "Offline — working locally" when offline with empty queue, amber "Offline — N items queued" when offline with pending items, blue "Syncing..." during sync, red "N items waiting to sync" with Retry button when online but sync failed

**Modified existing files:**
- `src/components/reports/submit-form.tsx` — Rewritten for offline-first: if online, submits directly to Supabase (existing behaviour); if offline, writes to IndexedDB sync queue; if online submission fails mid-request, falls back to queue. Shows amber offline notice banner when offline. Warms IndexedDB cache with department data on mount.
- `src/components/app-shell.tsx` — Wraps app content in `OfflineProvider`, includes `SyncIndicator`, caches user profile to IndexedDB on mount
- `src/app/layout.tsx` — Added `ServiceWorkerRegister` component, PWA meta tags (apple-web-app-capable, theme-color, viewport)

### Build quality

- **TypeScript:** Zero errors (`npx tsc --noEmit`)
- **ESLint:** Zero errors (`npx eslint src/ --quiet`)
- **Build:** Succeeds cleanly (`npm run build`)
- **React 19 compatible:** All hooks use proper patterns
- **Mobile first:** Sync indicator is a fixed bottom banner, offline notice is inline

### PRD 02 requirement coverage update

| Req | Status | Notes |
|-----|--------|-------|
| R2.16 | ✅ Done | Form loads from IndexedDB when offline (schema cached on last online access via cache-warm) |
| R2.17 | ✅ Done | Offline submission writes to IndexedDB with client-generated sync_id, UI shows "Saved — will sync when online" |
| R2.18 | ✅ Done | OfflineProvider auto-drains sync queue when connectivity returns, posts to /api/sync |
| R2.19 | ✅ Done | Conflict handling: server version wins, user gets toast "already submitted from another session" |
| R2.20 | ✅ Done | Sync indicator always visible when queue has items, disappears when empty, retry button on failure |
| R2.21 | ✅ Done | Cached in IndexedDB: department form schema, stock items (name+unit), user profile. Reports cache infrastructure ready (populated on submit page visit). |

### What is NOT yet done from PRD 02

Carried forward from Chat 5 (unchanged):
- **R2.8 — Photo upload to Supabase Storage:** File input captures photo, upload pipeline not wired. Needs storage bucket.
- **R2.15 — Own reports view on submit page:** Accessible via `/reports`, not on submit page itself. Minor UX.
- **R2.12 — Admin flag N/A as suspicious:** Flagged badge renders, no explicit "flag this N/A" button. Column ready.

### Schema changes from design.md

None. All tables used exactly as specified in `design.md`.

### Dependencies added

- `idb` (IndexedDB wrapper) — used by the offline layer

---

## Vercel setup instructions

Joshua needs to:

1. **Create a Vercel project** at vercel.com linked to the `the-business-developers` GitHub repo
2. **Set Root Directory** to `ziwa_ranch/projects/bms/4_development/app/` in Vercel project settings
3. **Set Production Branch** to `main`
4. **Add environment variables** for each environment (Production, Preview, Development):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. **Assign custom domains** (optional):
   - `main` → production domain
   - `ziwa` → staging domain (can use Vercel's branch alias)

The `ziwa` branch exists locally and needs to be pushed: `git push -u origin ziwa`

---

## Your phase — Development Stage 4: Stock

### What to build

| Step | What | PRD |
|------|------|-----|
| 15 | Stock items library | PRD 03 |
| 16 | Inbound stock (purchase orders) | PRD 03 |
| 17 | Requisitions (create, approve, fulfil) | PRD 03 |
| 18 | Automatic quantity updates (trigger) | PRD 03 |
| 19 | Stock threshold alerts (trigger → intelligence_flags) | PRD 03 |

### Key reference

- `3_architecture/design.md` — search for "Stock Management" for the schema
- `3_architecture/prd/03_stock_management.md` — full requirements
- `3_architecture/build_rules.md` — build standards

### Priority notes

1. The `stock_items`, `stock_transactions`, `requisitions`, and `purchase_orders` tables already exist in the database from Stage 1 migrations.
2. The stock quantity trigger (`AFTER INSERT ON stock_transactions` → update `current_quantity`) needs to be created as a database migration.
3. Threshold alerts should create `intelligence_flags` entries when stock drops below `minimum_quantity`.
4. All stock write operations accessible to non-admin roles must go through the offline-capable path (IndexedDB → sync queue). Admin-only operations (e.g., item management) may require connectivity.
5. The `inventory_grid` field in reports already loads from `stock_items` — ensure the stock module's item CRUD keeps the cached data consistent.

### Build sequence for Stage 4

1. Stock items list/detail pages (view, create, edit, archive)
2. Purchase orders (inbound stock recording)
3. Requisitions (create by HOD, approve/reject by admin, fulfil by stock manager)
4. Database trigger for automatic quantity updates on `stock_transactions`
5. Threshold alert trigger → `intelligence_flags`
6. Stock dashboard with low-stock warnings

**Confirm with Joshua before proceeding past Stage 4.**

---

## Handover instructions for your own end-of-chat handover

When your development stage is complete, write a new `next_chat_handover.md` replacing this file. It must:
- State what stage was completed and what stage comes next
- List what was built and any deviations from the PRD (with reasoning)
- Note any schema changes made during build (beyond what design.md specifies)
- Specify exactly what context the next development AI should load
- Carry forward the standing one-phase-per-chat rule
- Carry forward the Vercel setup instructions if not yet completed

---

*Handover written: 1 April 2026. Chat 6 complete.*
