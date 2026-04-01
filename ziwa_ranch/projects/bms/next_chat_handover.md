# BMS — Next Chat Handover

> **Purpose:** This file is the single brief for the next AI agent working on this project. Read it fully, load the context it specifies, execute the phase it defines, and produce your own handover at the end.
>
> **Produced by:** Chat 7 (Development — Stage 4: Stock Management + Vercel Deployment)
> **Date:** 1 April 2026
> **Phase completed:** Development Stage 4 — Stock Management
> **Phase to execute:** Development Stage 5 — Communication & Intelligence

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
5. `ziwa_ranch/projects/bms/3_architecture/prd/04_communication_intelligence.md` — Stage 5 PRD (what you will build against)
6. `global/sops/new_project_v2/scripts/04_build.md` — the build script you are executing

The application code lives at:
`ziwa_ranch/projects/bms/4_development/app/`

---

## What was accomplished in Chat 7

### Vercel deployment: fully operational

- Vercel CLI installed and authenticated as `thebusinessdevelopers`
- `bms` project linked from repo root (`.vercel/project.json` in app folder)
- GitHub integration connected — pushes to `dev`, `ziwa`, `main` auto-deploy
- `.vercelignore` at repo root excludes all non-BMS content (keeps uploads ~92KB instead of 165MB)
- `ziwa` branch pushed to remote
- Environment variables confirmed across all environments (Development, Preview, Production)
- Inner `.git` directory removed from app folder — app files tracked by outer repo
- All BMS code committed and pushed to `dev`
- **Live URL:** https://bms-kg6gryyps-thebusinessdevelopers-projects.vercel.app

### Stage 4 — Stock Management: complete

All PRD 03 requirements (R3.1–R3.26) are implemented.

### Files produced

**Business logic:**
- `src/lib/stock.ts` — Types (`StockItemRow`, `StockTransactionRow`, `RequisitionRow`, `PurchaseOrderRow`, `PurchaseOrderLine`, `RequisitionLine`), item name uniqueness check, PO transaction creation, requisition fulfilment transaction creation
- `src/lib/schemas.ts` — Added: `stockItemSchema`, `purchaseOrderSchema`, `purchaseOrderLineSchema`, `requisitionSchema`, `requisitionLineSchema`, `adjustmentSchema`, `STOCK_CATEGORIES`, `STOCK_UNITS` constants

**Stock item pages:**
- `src/app/(app)/stock/page.tsx` — Stock overview dashboard with summary cards (items count, low stock count, pending requisitions, on-order POs), low stock warnings list, quick-action buttons, all items table
- `src/app/(app)/stock/items/page.tsx` — Stock items list page (server component)
- `src/app/(app)/stock/items/new/page.tsx` — New item form (admin only)
- `src/app/(app)/stock/items/[id]/page.tsx` — Item detail with edit mode via `?edit=true` query param
- `src/components/stock/stock-items-list.tsx` — Client component: searchable, filterable by category, toggle inactive items
- `src/components/stock/stock-item-form.tsx` — Create/edit form with real-time name uniqueness check, category/unit dropdowns
- `src/components/stock/stock-item-detail.tsx` — Item detail with stock level cards, recent transactions table, deactivate toggle

**Purchase orders (inbound stock):**
- `src/app/(app)/stock/inbound/page.tsx` — PO list with supplier, date, status badges
- `src/app/(app)/stock/inbound/new/page.tsx` — Record delivery form (admin only)
- `src/app/(app)/stock/inbound/[id]/page.tsx` — PO detail with confirm delivery action
- `src/components/stock/purchase-order-form.tsx` — Dynamic line items, calculates total, detects discrepancies, creates `inbound` stock_transactions on save
- `src/components/stock/purchase-order-detail.tsx` — PO detail view with "Confirm Delivery" action for `ordered` status POs

**Requisitions:**
- `src/app/(app)/stock/requisitions/page.tsx` — Requisition list (admin sees all, HOD sees own dept)
- `src/app/(app)/stock/requisitions/new/page.tsx` — New requisition form
- `src/app/(app)/stock/requisitions/[id]/page.tsx` — Requisition detail (fetches user names server-side to avoid ambiguous join)
- `src/components/stock/requisition-form.tsx` — Dynamic line items with item picker showing current stock levels
- `src/components/stock/requisition-detail.tsx` — Approve (with adjustable quantities), reject, fulfil actions. Fulfilment creates `requisition_fulfil` stock_transactions

**Adjustments:**
- `src/app/(app)/stock/adjustments/new/page.tsx` — Manual adjustment form (admin only)
- `src/components/stock/adjustment-form.tsx` — Select item, enter +/- quantity, mandatory reason

**Transaction history:**
- `src/app/(app)/stock/transactions/page.tsx` — Full audit trail
- `src/components/stock/transaction-history.tsx` — Client component: filterable by type, item, department, and searchable

**Database migration:**
- `supabase/migrations/00014_stock_threshold_dedup.sql` — Fixes `check_stock_threshold()` trigger to deduplicate flags (R3.20: only creates a new `intelligence_flags` entry if no open flag exists for that item) and uses correct severity levels (R3.21: `critical` when current_quantity ≤ 0)

### Build quality

- **TypeScript:** Zero errors (`npx tsc --noEmit`)
- **ESLint:** Zero errors (`npx eslint src/ --quiet`)
- **Build:** Succeeds cleanly (`npm run build` — 27 routes)
- **Vercel:** Deployed and ready (build time 27s)
- **React 19 compatible:** All hooks use proper patterns
- **Mobile first:** All stock screens use responsive tables with hidden columns on mobile

### PRD 03 requirement coverage

| Req | Status | Notes |
|-----|--------|-------|
| R3.1 | ✅ Done | Admin/manager can create stock items at `/stock/items` with all specified fields |
| R3.2 | ✅ Done | Real-time uniqueness check before submission |
| R3.3 | ✅ Done | Edit form at `/stock/items/[id]?edit=true` |
| R3.4 | ✅ Done | Deactivate toggle on item detail; inactive items hidden from lists and dropdowns |
| R3.5 | ✅ Done | Search by name, filter by category |
| R3.6 | ✅ Done | Current quantity shown, items below minimum highlighted red |
| R3.7 | ✅ Done | Record delivery at `/stock/inbound/new` with supplier, line items |
| R3.8 | ✅ Done | `inbound` stock_transactions created for each received item; trigger updates current_quantity |
| R3.9 | ✅ Done | Discrepancy detection sets PO status and creates `intelligence_flags` entry |
| R3.10 | ✅ Done | PO can be saved as `ordered` and confirmed to `received` later |
| R3.11 | ✅ Done | Inbound history at `/stock/inbound` sorted by date |
| R3.12 | ✅ Done | HOD creates requisition at `/stock/requisitions/new` |
| R3.13 | ✅ Done | New requisition has `pending` status (notification creation deferred to Stage 5) |
| R3.14 | ✅ Done | Admin can approve with adjustable quantities per line item |
| R3.15 | ✅ Done | Approval does not deduct stock |
| R3.16 | ✅ Done | Fulfilment creates `requisition_fulfil` transactions with negative quantities |
| R3.17 | ✅ Done | Rejected requisitions shown with `rejected` status (notification deferred to Stage 5) |
| R3.18 | ✅ Done | HOD view filters to own department's requisitions |
| R3.19 | ✅ Done | Trigger exists in migration 00013; updates `current_quantity += transaction.quantity` |
| R3.20 | ✅ Done | Migration 00014 adds deduplication check — no duplicate open flags per item |
| R3.21 | ✅ Done | `critical` severity when current_quantity ≤ 0 |
| R3.22 | ✅ Done | Trigger is pure SQL, no HTTP calls, runs in same transaction |
| R3.23 | ✅ Done | Admin can create `adjustment` transaction with mandatory reason |
| R3.24 | ✅ Done | Adjustments visible in transaction history with `Adjustment` badge and reason |
| R3.25 | ✅ Done | Stock overview at `/stock` with all active items, low stock highlighted, pending requisition count |
| R3.26 | ✅ Done | Transaction history at `/stock/transactions` with type/item/department filters |

### What is NOT yet done (carried forward)

From PRD 02 (unchanged from Chat 6):
- **R2.8 — Photo upload to Supabase Storage:** File input captures photo, upload pipeline not wired
- **R2.15 — Own reports view on submit page:** Accessible via `/reports`, not on submit page itself
- **R2.12 — Admin flag N/A as suspicious:** Badge renders, no explicit "flag this N/A" button

From PRD 03:
- **R3.13/R3.17 — Requisition notifications:** The requisition workflow is complete but notifications for admin on new requisition and HOD on rejection are not yet wired — these are Stage 5 (Communication & Intelligence) concerns

### Schema changes from design.md

None. All tables used exactly as specified in `design.md`. One migration added (00014) to improve the existing trigger function — no table changes.

### Dependencies added

None. No new npm packages required for Stage 4.

---

## Vercel setup — complete

- **Project:** `bms` on `thebusinessdevelopers-projects` team
- **GitHub connected:** Auto-deploys on push to `dev`, `ziwa`, `main`
- **Root directory:** `ziwa_ranch/projects/bms/4_development/app/` (set in Vercel project settings)
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — all set for Development, Preview, Production
- **`.vercelignore`** at repo root excludes everything except the BMS app path
- **CLI deploys:** Run `vercel deploy --prod` from repo root
- **Git deploys:** Just `git push` to the relevant branch

---

## Your phase — Development Stage 5: Communication & Intelligence

### What to build

| Step | What | PRD |
|------|------|-----|
| 20 | Threads and messages | PRD 04 |
| 21 | Mentions and notifications | PRD 04 |
| 22 | Intelligence flags display | PRD 04 |
| 23 | Morning brief Edge Function (scheduled) | PRD 04 |
| 24 | Morning brief display on dashboard | PRD 04 |

### Key reference

- `3_architecture/design.md` — search for "Company Communication" and "Intelligence Layer" for the schema
- `3_architecture/prd/04_communication_intelligence.md` — full requirements
- `3_architecture/build_rules.md` — build standards

### Priority notes

1. The `threads`, `messages`, `notifications`, `intelligence_briefs`, and `intelligence_flags` tables already exist in the database from Stage 1 migrations.
2. `intelligence_flags` are already being created by stock triggers (low stock, discrepancy) — the display layer needs to show these.
3. The morning brief Edge Function needs to be created as a Supabase Edge Function (`supabase/functions/generate-morning-brief/`).
4. Notifications should wire into: requisition creation (notify admins), requisition approval/rejection (notify HOD), stock alerts, and mentions in threads.
5. The communication module (`/communication`) nav link already exists in `app-shell.tsx` but has no page.
6. The dashboard already shows an "Open Flags" count — the intelligence display should expand on this.

### Build sequence for Stage 5

1. Threads list and detail pages (create, view, messages)
2. Message composition with @mentions
3. Notifications system (in-app notifications, read/unread)
4. Intelligence flags page (list, acknowledge, resolve)
5. Morning brief Edge Function
6. Morning brief display on dashboard

**Confirm with Joshua before proceeding past Stage 5.**

---

## Handover instructions for your own end-of-chat handover

When your development stage is complete, write a new `next_chat_handover.md` replacing this file. It must:
- State what stage was completed and what stage comes next
- List what was built and any deviations from the PRD (with reasoning)
- Note any schema changes made during build (beyond what design.md specifies)
- Specify exactly what context the next development AI should load
- Carry forward the standing one-phase-per-chat rule
- Carry forward the Vercel setup section

---

*Handover written: 1 April 2026. Chat 7 complete.*
