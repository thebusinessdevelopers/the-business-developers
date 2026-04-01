# BMS — Materials & Tools List

> **Phase:** Architecture  
> **Date:** 30 March 2026

---

## Tech stack

### Frontend

| Item | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) | Same as HOD v2.5 — proven, file-system routing, server components, built-in API routes. App Router is the current standard. |
| Language | TypeScript 5+ | Type safety across the full stack. Non-negotiable for a system this size. |
| Styling | Tailwind CSS 3 | Same as HOD. Utility-first, consistent design tokens, no CSS files to maintain. |
| Component library | shadcn/ui | Accessible, unstyled-by-default components built on Radix. Customisable to any brand. No lock-in — components are copied into the codebase. |
| Form state | React Hook Form + Zod | Standard pairing. Hook Form for form state management; Zod for schema validation that matches the JSONB form schema structure. |
| Offline | Workbox 7 + idb 8 | Workbox handles service worker lifecycle and cache strategies. `idb` is a tiny promise wrapper around IndexedDB. Both are well-maintained Google/community projects. |
| Data fetching | TanStack Query (React Query) v5 | Server state management, stale-while-revalidate caching, background refetch. Pairs well with Supabase client. |
| Real-time | Supabase Realtime (built-in) | For notifications and the admin dashboard live updates. No additional service needed. |
| Icons | Lucide React | Same as HOD. Clean, consistent icon set. |

**Estimated monthly cost:** £0 (Vercel Hobby tier for development; Pro ~£15/month for production with custom domain)

### Backend & Database

| Item | Choice | Rationale |
|---|---|---|
| Database | Supabase (PostgreSQL 15) | Same as HOD. Managed Postgres with Auth, Storage, Edge Functions, and Realtime in one platform. RLS is first-class. pg_cron available on Pro plan. |
| Auth | Supabase Auth | Email/password + magic link. JWT tokens, session management, and RLS integration all built in. |
| Storage | Supabase Storage | For report photo attachments. Same bucket policy pattern as HOD. |
| Edge Functions | Supabase Edge Functions (Deno) | For intelligence generation, webhook processing, and WhatsApp dispatch. Runs at the edge, close to the database. No cold-start penalty for lightweight functions. |
| Scheduled jobs | pg_cron (Supabase Pro) | Built into PostgreSQL. The morning brief schedule is a single `cron.schedule()` call. No external cron service needed. |
| HTTP from DB | pg_net (Supabase) | Allows database triggers to make HTTP calls to Edge Functions. Required for the event-driven intelligence triggers. |

**Supabase pricing:** Free tier for development. Pro tier: ~$25/month. Required for pg_cron and pg_net. This is the only non-optional paid service in V1.

### AI

| Item | Choice | Rationale |
|---|---|---|
| LLM | OpenAI GPT-4o | Used for morning brief narrative and on-demand department analysis. GPT-4o is the best balance of capability and cost for structured JSON output. |
| SDK | OpenAI Node SDK | Standard, well-maintained. Used inside Edge Functions. |
| Usage pattern | Batch (nightly brief) + on-demand (user-triggered analysis) | Not real-time. Cost is bounded: one brief per org per day, plus infrequent on-demand calls. |

**Estimated AI cost:** At 50 active orgs with daily briefs: ~$5–15/month. Negligible at V1 scale.

### Payments

| Item | Choice | Rationale |
|---|---|---|
| MTN MoMo gateway | GovBill API | Ugandan-registered payment gateway with MTN Mobile Money collection, webhook support, and OAuth 2.0. Recommended by research for Uganda-first integrations. Alternative: SACC API Gateway (similar capabilities, 99.9% uptime SLA). |
| Cash recording | Manual entry in BMS | No third-party service. Receptionist enters amount, optional photo of receipt. |
| Stripe | Not V1 | Schema ready (method field, webhook handler scaffold). Integration activates in V2. |

**GovBill / SACC:** Register at momodeveloper.mtn.com for sandbox access. Production access requires Ugandan business registration.

### Notifications

| Item | Choice | Rationale |
|---|---|---|
| WhatsApp | Meta WhatsApp Business API | V1 includes the infrastructure (webhook endpoint, Edge Function). Activation depends on Meta Business verification completing. Fallback is in-app notifications only. |
| In-app | Supabase Realtime | Notifications table with Realtime subscriptions. Works without WhatsApp. |
| Email | Supabase Auth emails | For password reset only in V1. Transactional email (Resend or SendGrid) added in V2. |

**WhatsApp cost:** Meta charges per conversation (~$0.005–0.02 per conversation in Uganda). At V1 scale, negligible. Business verification is the real constraint.

---

## Development tools

| Item | Choice | Notes |
|---|---|---|
| Version control | Git + GitHub | Three-branch strategy: `dev` → `ziwa` → `main`. See build_rules.md. |
| CI/CD | Vercel (automatic) | Push to `main` → production deploy. Push to `ziwa` → Ziwa staging deploy. Configured via Vercel project settings. |
| Local dev | Supabase CLI + Docker | `supabase start` runs a local Postgres + Auth + Storage instance. Migrations applied locally before pushing. |
| Migration management | Supabase CLI migrations | All schema changes as numbered migration files in `supabase/migrations/`. Never apply DDL directly to production. |
| Testing | Playwright (E2E) + Vitest (unit) | Playwright for critical user flows (form submission, stock update, invoice creation). Vitest for utilities (form validation logic, schema transforms). |
| Linting | ESLint + Prettier | Standard Next.js ESLint config. Prettier for formatting. No debate — autoformat on save. |
| Type generation | Supabase CLI type gen | `supabase gen types typescript` generates TypeScript types from the database schema. Run after every migration. |

---

## Infrastructure

| Item | Detail | Cost |
|---|---|---|
| Frontend hosting | Vercel | Free (dev) / ~£15/month (Pro, production) |
| Database | Supabase Pro | ~$25/month. Required for pg_cron and pg_net. |
| Domain | TBD (bms.app or similar) | ~£10–20/year |
| SSL | Automatic (Vercel + Supabase) | Included |
| Monitoring | Vercel Analytics (built-in) + Supabase Dashboard | Included |
| Error tracking | Sentry (Next.js integration) | Free tier adequate for V1. ~$26/month if volume exceeds free tier. |
| Backups | Supabase automated daily backups | Included in Pro plan |

**Total V1 monthly infrastructure cost:** ~$50–70/month at launch (Supabase Pro + Vercel Pro + Sentry if needed). Scales with usage but not dramatically until 100+ active orgs.

---

## V1 department template library

These templates ship with BMS as seed data. Each is a row in `department_templates`.

| Template | Slug | Category | Notes |
|---|---|---|---|
| Kitchen | `kitchen` | operations | Morning stock count, prep status, wastage, on-duty staff |
| Food & Beverage (Bar) | `fb_bar` | hospitality | Opening stock, sales, closing stock, wastage |
| Housekeeping | `housekeeping` | hospitality | Room status grid, linen count, lost & found, maintenance referrals |
| Security | `security` | operations | Gate log, incident report, patrol notes, visitor register |
| Maintenance | `maintenance` | operations | Completed work, pending issues, parts needed |
| Reception / Front Desk | `reception` | hospitality | Check-ins, check-outs, pending arrivals, petty cash |
| Management / Admin | `management` | admin | Daily brief notes, HR observations, special instructions |
| Conservation / Wildlife | `conservation` | wildlife | Animal sightings, patrol routes, poaching alerts, veterinary notes |
| Store / Procurement | `store` | operations | Inbound stock received, requisitions fulfilled, stock discrepancies |

Nine templates covers the full operational scope of a game lodge. Hotels and urban properties would use a subset (no Conservation). New templates can be added via SQL migration — no code change needed.

---

## What needs to be set up before first development sprint

1. **Supabase project** — create project, note URL and keys, upgrade to Pro plan
2. **Vercel project** — connect GitHub repo, configure environment variables
3. **OpenAI API key** — create account at platform.openai.com, add to Supabase secrets
4. **GovBill/MTN MoMo sandbox** — register at momodeveloper.mtn.com for test credentials
5. **WhatsApp Business API** — begin Meta business verification process (this takes time; start immediately)
6. **GitHub repo** — initialise with three branches (`dev`, `ziwa`, `main`)
7. **Domain** — register domain, configure DNS to Vercel
