# Next Chat Handover

> **Purpose:** Gives the next AI chat everything it needs to continue without asking questions already answered.
> **Load context at:** Standard context load from `context.md`, then this file.

---

## Where we are

| Step | Status | Notes |
|---|---|---|
| Phase 1 — Portal v1.9 | Live & verified | Deployed and tested 16 March 2026. Final commit `63c57da`. |
| Phase 1 — HOD rollout | Live | All 15 departments active. Reports coming in daily. |
| **Phase 2 — Meta Business setup** | In progress | Business registration underway |
| Phase 2 — Technical build | Blocked | Waiting on Meta credentials |

---

## What v1.9 delivered (verified live)

Full detail in `versions/v1.9/snapshot.md`. Summary:

1. **Kitchen stock overhaul** — Monday-only stock count with item/qty/unit/cost per unit. Daily stock added (optional) and stock used (required) repeaters. Closing stock and opening stock removed — replaced by projections.
2. **Auto-calculated food cost** — Sum of (qty x cost per unit) from Stock Used Today. Appears as a hint the HOD can accept or override.
3. **Kitchen stock projections** — Projected Kitchen Stock card on landing page. Monday baseline + stock added - stock used.
4. **On-duty pickers (Kitchen)** — Three checkbox groups (Breakfast, Lunch, Dinner) with 8 kitchen staff options.
5. **On-duty pickers (F&B)** — Three checkbox groups (Breakfast, Lunch, Dinner) with 12 F&B team options.
6. **Kitchen team expanded** — Substitutes: Richard (2IC), Safari, David, Felly, Lawrence, Koffi.
7. **FormRenderer refactored** — `checkbox_group` rendering added. Monday stock write uses `config.stockConfig` instead of hardcoded slugs.

---

## What v1.8 delivered

Full detail in `versions/v1.8/snapshot.md`. Highlights: critical submission bug fix (RLS), error infrastructure, DB drafts, structured review workflow with three-colour dot system, HOD inline editing, Monday-only stock gating, dynamic deadline badge, HOD landing page redesign, admin date change, admin report deletion, F&B crash fix, rebranded to Ziwa Rhino And Wildlife Ranch.

---

## What v1.6 delivered

See `versions/v1.6/snapshot.md`. Highlights: report editing + audit trail, item autocomplete, auto-calculations, stock reconciliation, dashboard upgrades (CSV export, compliance tracking, acknowledgements), name selector rework, Africa/Kampala timezone, KML-sourced locations, form refinements across all 15 departments.

---

## Scope candidates for future versions

### From v1.4 backlog (not yet addressed)

**Offline capability (Martine / Wildlife)**
- Martine is in the field all day; needs to add to the form offline and submit when back in range
- Requires service worker + IndexedDB for offline form persistence
- Potentially useful for: Electrical (fence patrols), Security (patrols), Drivers & Mechanics

**Multi-contributor support**
- Martine wants team members to contribute to the same daily report
- Requires: user identity per contributor, timestamped contributions, visible attribution
- Applicable to: Wildlife, Drivers & Mechanics, Electrical, Security
- Needs careful design around form locking and merging

### From v1.6 observations

**WhatsApp integration (Phase 2)**
- Still blocked on Meta Business registration
- When unblocked: HODs submit via WhatsApp, AI parses into structured data, confirms with HOD
- Would solve offline problem for Wildlife (WhatsApp queues messages offline)

**Report templates / pre-fill from previous day**
- Some HODs report similar data daily (e.g. same vehicles, same gates)
- Pre-fill from previous report as a starting point, HOD modifies and submits

**Photo attachments**
- Electrical: photos of fence damage
- Housekeeping: photos of room condition issues
- Security: photos of unregistered people or incidents
- Requires file storage (Supabase Storage or similar)

**Notification system**
- Alert admin when reports are late or missing
- WhatsApp or email reminders to HODs who haven't submitted by deadline
- Daily summary push to management

**Dashboard analytics**
- Trends over time (guest numbers, sales, stock levels)
- Departmental KPI tracking
- Management-friendly visualisations for weekly meetings

**Form validation improvements**
- Cross-field validation (e.g. closing mileage > opening mileage)
- Required sub-fields within repeaters
- Conditional sections (show/hide based on other field values)

---

## Technical state

| Service | Detail |
|---|---|
| Supabase project | `inidzwfjnkyinxhvbrdt` (EU West Frankfurt) |
| Supabase URL | `https://inidzwfjnkyinxhvbrdt.supabase.co` |
| DB timezone | `Africa/Kampala` |
| Tables | `hod_departments` (15), `hod_daily_reports` (growing), `hod_verified_stock`, `hod_item_library`, `hod_drafts`, `hod_error_log` |
| Frontend | Next.js 16, Tailwind v4, React 19 |
| Code location | `4_development/portal/` |
| GitHub repo | `https://github.com/thebusinessdevelopers/hod_daily_reports` |
| Netlify project ID | `3e5bb9b4-c0b2-4031-9f28-0132cbb1d303` |
| Live URL | `https://hoddailyreports.netlify.app` |
| Dashboard | `https://hoddailyreports.netlify.app/dashboard` |

### Key config files

| File | Purpose |
|---|---|
| `config/forms.ts` | All 15 department form configs (sections, fields, HODs, substitutes, stock, date defaults) |
| `config/locations.ts` | Shared areas (7), zones (15), gates (10) — sourced from KML |
| `config/calculations.ts` | Auto-calculation rules per department |
| `types/index.ts` | All TypeScript interfaces |
| `lib/submission-status.ts` | Timezone-aware submission timing, deadline badge, date formatting helpers |

### Environment variables (all set on Netlify)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key for client-side operations |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side key for dashboard + API routes |
| `ADMIN_PASSWORD` | Shared password for dashboard access |

---

*Updated: 16 March 2026. v1.9 live and verified.*
