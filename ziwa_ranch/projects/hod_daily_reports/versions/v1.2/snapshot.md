# HOD Daily Reports — Version 1.2 Snapshot

> **Purpose:** A point-in-time record of Version 1.2. Documents everything that changed from v1 and the current state of the system.
>
> **Built on:** 14 March 2026
> **Deployed:** 14 March 2026
> **Status:** Live at [hoddailyreports.netlify.app](https://hoddailyreports.netlify.app)
> **Base version:** v1 (see `versions/v1/snapshot.md` for full recreation instructions)

---

## What v1.2 is

An iteration on v1 that adds visual branding, refined department forms, three new departments, and a password-protected admin dashboard with reporting statistics. The core architecture is unchanged — same tech stack, same database, same deployment.

**What v1.2 adds over v1:**
- Ziwa Ranch logo and orange accent colour (`#eaa11f`)
- Flexible HOD name selector ("Someone else" option for substitutes)
- 2-day-back date picker with late submission indicator
- NumberStepper component for touch-friendly counters
- Select type support in repeater sub-fields
- 15 departments (was 12 active + 1 inactive)
- Refined forms for 8 existing departments
- 3 new department forms (IT, Wildlife, Craft Shop)
- Admin dashboard at `/dashboard` with password gate
- Report viewer with filters and individual report detail
- Statistics widget (submission rates, late counts, today's snapshot)

---

## Database changes from v1

Applied via Supabase SQL (no migration file — manual SQL):

```sql
-- Renames
UPDATE hod_departments SET name = 'Drivers & Mechanics', slug = 'drivers-and-mechanics' WHERE slug = 'vehicle-maintenance';
UPDATE hod_departments SET name = 'Accounts', slug = 'accounts' WHERE slug = 'finance';

-- Activate IT
UPDATE hod_departments SET is_active = true WHERE slug = 'it';

-- New departments
INSERT INTO hod_departments (name, slug, hods, sort_order, is_active) VALUES
  ('Wildlife', 'wildlife', ARRAY['Martine'], 14, true),
  ('Craft Shop', 'craft-shop', ARRAY['Halima'], 15, true);
```

No new tables. No schema changes. The existing `hod_departments` and `hod_daily_reports` tables are unchanged.

---

## Departments (15 total, all active)

| # | Department | Slug | HOD(s) |
|---|---|---|---|
| 1 | Main Gate | main-gate | Jjuko |
| 2 | HQ Reception | hq-reception | Emilly |
| 3 | Food & Beverage | food-and-beverage | Howard |
| 4 | Kitchen | kitchen | Sensio |
| 5 | Housekeeping | housekeeping | Elly |
| 6 | Security | security | Salim |
| 7 | Store | store | Denis |
| 8 | Accounts | accounts | Musoni |
| 9 | Electrical | electrical | Robert |
| 10 | HQ Maintenance | hq-maintenance | David |
| 11 | Drivers & Mechanics | drivers-and-mechanics | Kanja & Roger |
| 12 | Plumbing | plumbing | Richard |
| 13 | IT | it | Benson |
| 14 | Wildlife | wildlife | Martine |
| 15 | Craft Shop | craft-shop | Halima |

---

## File structure (changes from v1)

```
portal/
├── app/
│   ├── globals.css                    ← UPDATED: @theme with ziwa colour palette
│   ├── layout.tsx
│   ├── page.tsx                       ← UPDATED: logo, orange accent
│   ├── dashboard/                     ← NEW: entire directory
│   │   ├── layout.tsx                 ← Auth check wrapper
│   │   ├── LoginForm.tsx              ← Client: password form
│   │   ├── actions.ts                 ← Server actions: login/logout
│   │   ├── page.tsx                   ← Stats overview
│   │   └── reports/
│   │       ├── page.tsx               ← Reports list with filters
│   │       ├── ReportFilters.tsx      ← Client: filter controls
│   │       └── [id]/
│   │           └── page.tsx           ← Individual report view
│   └── report/
│       └── [slug]/
│           ├── page.tsx               ← UPDATED: logo, orange accent
│           └── ReportForm.tsx         ← UPDATED: orange accent
├── components/
│   ├── FormRenderer.tsx               ← UPDATED: name flexibility, date picker, stepper, colours
│   ├── RepeaterField.tsx              ← UPDATED: select support, colours
│   └── NumberStepper.tsx              ← NEW: touch-friendly +/- counter
├── config/
│   └── forms.ts                       ← UPDATED: all 15 department form configs
├── lib/
│   ├── supabase.ts
│   └── supabase-server.ts            ← NEW: service role client for dashboard
├── types/
│   └── index.ts                       ← UPDATED: stepper prop, select in SubField
├── public/
│   └── logo.png                       ← NEW: Ziwa Ranch logo
└── .env.local                         ← UPDATED: 2 new vars
```

---

## New environment variables

| Variable | Purpose |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase access for dashboard (bypasses RLS) |
| `ADMIN_PASSWORD` | Shared password for dashboard access |

These must be set in Netlify (Settings → Environment Variables) before deploying.

---

## Dashboard architecture

```
/dashboard              ← Stats overview (submission rates, late counts, today's snapshot)
/dashboard/reports      ← Filterable report list (department, date range, late toggle)
/dashboard/reports/[id] ← Individual report rendered with field labels from form config
```

- All routes are `force-dynamic` (never pre-rendered)
- Auth: HMAC-SHA256 cookie derived from `ADMIN_PASSWORD`, HTTP-only, 7-day expiry
- Data access: server-side Supabase client with service role key (reads all reports)
- Lateness: derived as `submitted_at::date > report_date`, no schema changes

---

## Form changes summary

| Department | Changes |
|---|---|
| Main Gate | Added nationality breakdown (steppers), guest summary, walk-ins |
| HQ Reception | Expanded: arrivals/departures/groups, VIP arrivals, return guests, cancellations, no-shows, feedback |
| Food & Beverage | No changes |
| Kitchen | Added daily food cost |
| Housekeeping | Added occupancy section (arrivals, departures, rooms occupied, vacant) |
| Security | Added gate passes |
| Store | Added purchases repeater, GRN report |
| Accounts (was Finance) | Added daily financial summary (sales, expenses, debtors, receivables) |
| Electrical | No changes |
| HQ Maintenance | No changes |
| Drivers & Mechanics (was Vehicle Maintenance) | Restructured: vehicle usage with mileage, removed old vehicle checks |
| Plumbing | No changes |
| IT | **New:** job cards, network status |
| Wildlife | **New:** 4 species sections (hartebeest, zebra, giraffe, rhino with confidence) |
| Craft Shop | **New:** 4 payment methods (cash, MoMo, card, USD) with item repeaters |

---

## Verification record

Verified live on 14 March 2026. All checks passed.

| Check | Result |
|---|---|
| Production build | Clean — zero TypeScript or compilation errors |
| Database: 15 departments, all active | Confirmed via SQL query |
| Database: renames applied (Accounts, Drivers & Mechanics) | Confirmed |
| Database: new departments (IT, Wildlife, Craft Shop) | Confirmed |
| Landing page: 15 department cards, logo, orange accent | Confirmed live |
| Main Gate form: nationality steppers, guest summary, walk-ins | Confirmed live |
| HQ Reception form: expanded guest movement, VIP, returns, cancellations, no-shows | Confirmed live |
| Accounts form: daily financial summary (sales, expenses, debtors, receivables) | Confirmed live |
| Drivers & Mechanics form: vehicle usage with mileage, type select | Confirmed live |
| Wildlife form: 4 species sections, sighting repeaters, rhino confidence select | Confirmed live |
| Craft Shop form: 4 payment methods with item repeaters, stock, notes | Confirmed live |
| All forms: "Someone else" option in name selector | Confirmed on all checked forms |
| Dashboard: password gate renders login form | Confirmed live |
| Dashboard: logo displayed | Confirmed live |
| Late submission derivation | No schema change — computed from `submitted_at::date > report_date` |

---

*Snapshot frozen: 14 March 2026. Version 1.2 live at hoddailyreports.netlify.app. Commit `cceeffb`.*
