# BMS — Build Rules

> **Phase:** Architecture  
> **Date:** 30 March 2026  
> These rules govern all development work on BMS. They are not guidelines — they are constraints.

---

## Principles

**Simple code, proper foundations.** Every file, function, and component must be as simple as it can be while delivering its full functionality. No abstraction without justification. No clever patterns where a straightforward one works. Code must be easy to read, easy to debug, and easy to hand to the next developer. Architecture follows established best practices — not because they're fashionable, but because they produce systems that hold up under real use. Efficiency matters: fewer lines, fewer layers, fewer moving parts. The tools must work; the code behind them must be obvious.

**Mobile first, always.** Every user-facing screen is designed and tested on a 375px mobile screen before any desktop consideration. The HODs submitting daily reports are on phones. The stock manager is on a phone. If a feature cannot be used comfortably on a phone, it is not ready.

**Code is foundational, AI is surgical.** Validation, calculations, stock deductions, form rendering, compliance tracking — always code, always deterministic. AI (GPT-4o) appears only where language understanding or cross-data pattern recognition is genuinely needed: brief narratives, department trend analysis, anomaly descriptions. Never use AI where a SQL query or a computed column does the job.

**Offline is not an edge case.** Every write operation in the application must go through the offline-capable path (IndexedDB → sync queue). There is no "online only" write path for any feature available to HOD or staff roles. Admin-only features (e.g., managing templates) may require connectivity.

**Multi-tenancy is the database's job, not the application's.** The application never filters by `org_id` explicitly in client-side code. All tenant isolation is enforced by RLS. If a query returns data from another org, the RLS policies are broken — fix the policies, not the application.

**Simplicity of use is non-negotiable.** A 50-year-old kitchen manager in rural Uganda is the user. If a feature requires more than three taps to complete a common task, it is too complex. Complexity must be absorbed by the system, not the user.

---

## Standards

### TypeScript

- **No `any` types.** Use `unknown` and narrow properly. `as any` is banned except in test files.
- **All Supabase table types must be generated from the schema** (`supabase gen types typescript`). Run type generation after every migration. Do not hand-write database types.
- **Zod for all external input validation.** Every API route input, every form submission, and every webhook payload is validated with a Zod schema before processing. No raw JSONB is trusted without validation.

### Components

- **One component per file.** No barrel exports from component directories.
- **Server components by default.** Client components (`'use client'`) only when state, effects, or browser APIs are genuinely needed.
- **No inline styles.** Tailwind classes only. If a style cannot be expressed in Tailwind, add it to the global CSS with a descriptive class name.
- **Form components use React Hook Form + Zod resolver.** No uncontrolled inputs. No custom form state management.

### Database

- **All schema changes as migrations.** Never apply DDL directly to the Supabase dashboard in production. Every change is a file in `supabase/migrations/` with a timestamp prefix.
- **Every tenant-scoped table has RLS enabled and policies for SELECT, INSERT, UPDATE.** No table goes to production without its RLS policies. Run `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'` to verify.
- **JSONB schemas have TypeScript types.** Every JSONB column that has a known structure (form_schema, line_items, items, alerts, summary, trends) has a corresponding TypeScript interface in `types/`. The application never reads JSONB as `unknown` without parsing it through the type.
- **Indexes on all FK columns and common query patterns.** At minimum: `org_id` on every tenant-scoped table, `department_id` on `reports`, `item_id` on `stock_transactions`, `user_id` on `notifications`.

### API routes

- **All API routes validate input with Zod before touching the database.**
- **All API routes return consistent error shapes:** `{ error: string, code?: string }`.
- **Webhook routes verify signatures** before processing. MTN MoMo webhook must verify the request originated from the registered gateway.
- **No business logic in API route handlers.** Extract to a `lib/` function that is testable independently.

### Security

- **Service role key never exposed to the client.** The `SUPABASE_SERVICE_ROLE_KEY` environment variable is server-only. Any operation requiring service role (bypassing RLS for admin operations) runs in an API route or Edge Function.
- **No direct DB manipulation from the client.** The Supabase client in the browser uses the anon key + user JWT. Row-level security enforces what it can access.
- **Password display field**: The `password_display` pattern from HOD (plain-text copy of password for admin reset) is carried forward for V1. It is a pragmatic accommodation for non-technical staff at Ziwa who cannot manage password recovery flows. It is an accepted security trade-off for this context, not an oversight.

---

## Sequence — build order

Build in this order. Each stage must be functional before moving to the next.

**Stage 1 — Foundation (blocking everything)**
1. Supabase project setup, schema migrations, RLS policies
2. Next.js project initialisation (TypeScript, Tailwind, shadcn/ui)
3. Auth flow (login, session, protected routes)
4. Basic org + user management

**Stage 2 — Core loop (proves the product works)**
5. Department template seeding (9 templates)
6. Department configuration (add from template, customise form schema)
7. Form renderer (renders JSONB form schema as React form)
8. Report submission (online path only first)
9. Admin report review

**Stage 3 — Offline**
10. Service worker setup (Workbox)
11. IndexedDB layer (idb)
12. Offline form submission queue
13. Sync endpoint and conflict handling
14. UI sync indicators

**Stage 4 — Stock**
15. Stock items library
16. Inbound stock (purchase orders)
17. Requisitions (create, approve, fulfil)
18. Automatic quantity updates (trigger)
19. Stock threshold alerts (trigger → intelligence_flags)

**Stage 5 — Communication & Intelligence**
20. Threads and messages
21. Mentions and notifications
22. Intelligence flags display
23. Morning brief Edge Function (scheduled)
24. Morning brief display on dashboard

**Stage 6 — Payments**
25. Invoice creation
26. Cash payment recording
27. MTN MoMo webhook handler
28. Payment display and reconciliation

**Stage 7 — Onboarding**
29. Multi-step onboarding wizard
30. Progressive onboarding state machine

Each stage is a candidate for a separate development chat following the one-phase-per-chat rule.

---

## Branch strategy

```
main     ← production. Only receives merges from ziwa after real-world validation.
ziwa     ← Ziwa staging. Deployed to Ziwa's production environment. Real data.
dev      ← active development. Feature branches merge here.
```

- Feature branches: `feat/description` off `dev`
- Bug fixes: `fix/description` off `dev` (or `ziwa` if hotfix)
- Never commit directly to `main` or `ziwa`
- A PR from `dev` → `ziwa` requires: tests passing, no TypeScript errors, manual smoke test
- A PR from `ziwa` → `main` requires: at least one week of operational use at Ziwa without issues

---

## Testing standards

- **E2E (Playwright):** Required for every user-facing flow in the critical path:
  - Submit a daily report (online and offline)
  - Approve a requisition
  - Record a payment
  - Log in and view the morning brief
- **Unit tests (Vitest):** Required for:
  - Form validation logic (Zod schemas)
  - Stock quantity calculation utilities
  - Intelligence trigger logic (where extracted to pure functions)
  - Webhook signature verification
- **Manual testing at Ziwa:** Required before any `ziwa` → `main` merge. Wellington or Benson must confirm the feature works in the real environment.

---

## Communication during development

- If a PRD requirement is ambiguous, ask before building. Do not interpret.
- If a feature would require a schema change not in the migration plan, flag it before implementing.
- If an implementation decision affects the offline behaviour, the multi-tenancy model, or the intelligence triggers, document it in `4_development/decisions/` before proceeding.
- If something in the PRD turns out to be incorrect once building starts, update the PRD and note the change. The PRD is a living document during development.

---

## What "done" means

A feature is done when:
1. It passes its Playwright E2E test
2. It works on a 375px mobile screen
3. It works offline (for any write operation accessible to hod/staff roles)
4. TypeScript reports zero errors
5. ESLint reports zero errors
6. It has been manually tested in the dev environment by the developer

A feature is **not done** if it only works on desktop or only works online.

---

## Build readiness check

| Question | Status | Notes |
|---|---|---|
| Is the design complete enough to build from? | **Ready** | Schema, RLS pattern, offline architecture, intelligence triggers all specified concretely in design.md |
| Is the materials/tools list complete? | **Ready** | Stack confirmed, services identified, setup steps documented |
| Are the build rules clear? | **Ready** | This document |
| Are the requirements testable? | **Ready** | PRDs use specific, verifiable requirements |
| Are there unresolved risks? | **Concern × 2** | See below |

**Concern 1 — WhatsApp Business API verification**  
Meta's business verification process is time-consuming and sometimes blocked for new companies. WhatsApp notification delivery should not be on the critical path for V1 launch. Design already accommodates this: all WhatsApp features fall back to in-app notifications. Build the infrastructure, but do not block launch on WhatsApp activation.

**Concern 2 — GovBill/MTN MoMo production access**  
Production mobile money integration requires Ugandan business registration documentation. Sandbox testing can proceed immediately; live transactions need the business registration in place. V1 launch at Ziwa can proceed with cash recording only if MTN MoMo production access is delayed.
