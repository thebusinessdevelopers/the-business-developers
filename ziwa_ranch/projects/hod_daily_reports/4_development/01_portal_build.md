# Step 1 — Portal Build

> **Status:** ✅ Complete — built, passing build, database live. Needs Vercel deployment.

---

## What was built

A full Next.js web portal for HOD daily report submissions. 12 active department forms, one config-driven renderer, Supabase backend.

---

## File structure

```
4_development/
├── 01_portal_build.md        ← this file
└── portal/
    ├── app/
    │   ├── globals.css           Clean base styles, Tailwind v4
    │   ├── layout.tsx            Root layout — metadata, font
    │   ├── page.tsx              Landing page — department selector (server component)
    │   └── report/[slug]/
    │       ├── page.tsx          Department report page (server component — fetches dept from DB)
    │       └── ReportForm.tsx    Client wrapper — handles success state
    ├── components/
    │   ├── FormRenderer.tsx      Config-driven form — renders any department's fields
    │   └── RepeaterField.tsx     Repeatable row input (used for payments, work done, etc.)
    ├── config/
    │   └── forms.ts              All 12 department form definitions (single source of truth)
    ├── lib/
    │   └── supabase.ts           Supabase client singleton
    ├── types/
    │   └── index.ts              TypeScript types for forms, departments, reports
    ├── supabase/
    │   └── migrations/
    │       └── 001_hod_reports_schema.sql   Schema + seed SQL (already applied)
    └── .env.local                Supabase credentials (not committed to git)
```

---

## Database

**Project:** `inidzwfjnkyinxhvbrdt` (shared with restaurant management system)

**Tables created:**

| Table | Purpose |
|---|---|
| `hod_departments` | 13 departments — 12 active, IT flagged as coming soon |
| `hod_daily_reports` | One row per submission, `report_data` stored as JSONB |

**Migration applied:** `001_hod_reports_schema` — run via Supabase MCP on 14/03/2026

**RLS policies:**
- `hod_departments` — public read (landing page needs the list)
- `hod_daily_reports` INSERT — open (anyone with the link can submit)
- `hod_daily_reports` SELECT — authenticated users only (for future dashboard)

---

## Key decisions made during build

**JSONB for report data:** Each department's form produces a different data shape. Rather than 13 tables or one giant table with null columns, all form data goes into a `report_data` JSONB column. Adding fields or new departments later requires no database changes — just a config update.

**Config-driven forms:** All 12 active department forms are defined in `config/forms.ts` and rendered by a single `FormRenderer` component. There are no department-specific components. Field types supported: `text`, `textarea`, `number`, `repeater`, `select`.

**Server + client split:** Landing page and report page header/data fetch are server components (faster, no loading state). The form itself is a client component (needs React state for controlled inputs and submission).

**IT department:** Seeded as `is_active: false`. Appears on the landing page as "coming soon". No form config needed until Benson's template is defined. Enabling it is a 2-step change: update `is_active` in Supabase + add config entry in `forms.ts`.

---

## Departments and their forms

| # | Department | HODs | Field types used |
|---|---|---|---|
| 1 | Main Gate | Jjuko | number, textarea |
| 2 | HQ Reception | Emilly | number, textarea |
| 3 | Food & Beverage | Howard | textarea, number, repeater, checkbox_group |
| 4 | Kitchen | Sensio | repeater, number, checkbox_group, textarea |
| 5 | Housekeeping | Elly | repeater, textarea |
| 6 | Security | Salim | repeater, textarea |
| 7 | Store | Denis | textarea, repeater |
| 8 | Finance | Musoni | number, repeater |
| 9 | Electrical | Robert | textarea |
| 10 | HQ Maintenance | David | repeater, textarea |
| 11 | Vehicle Maintenance | Kanja & Roger | repeater |
| 12 | Plumbing | Richard | repeater, textarea |
| 13 | IT | Benson | — (coming soon) |

---

## What "done" looks like — checklist

- [x] Landing page shows all 13 departments (12 active, 1 coming soon)
- [x] Tapping a department loads the correct department-specific form
- [x] HOD selects their name (dropdown for multi-HOD, auto-filled for single)
- [x] Report date defaults to today, can be changed for late submissions
- [x] All form fields from 13/03 draft templates are present
- [x] Required fields validated before submission
- [x] Successful submission stores report in Supabase with correct dept, HOD, date, JSONB data
- [x] Confirmation shown after successful submission with option to go back
- [x] Works on mobile and desktop (responsive Tailwind layout)
- [ ] **Deployed and accessible via a live URL** ← next step

---

## Next step — deploy to Vercel

See `next_chat_handover.md` for the exact deployment steps.
