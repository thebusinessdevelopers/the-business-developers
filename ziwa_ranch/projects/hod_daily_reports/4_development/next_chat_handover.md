# Next Chat Handover

> **Purpose:** Gives the next AI chat everything it needs to continue without asking questions already answered.
> **Load context at:** Standard context load from `context.md`, then this file.

---

## Where we are

| Step | Status | Notes |
|---|---|---|
| Phase 1 — Portal v1.8 | Live & verified | Deployed and tested 16 March 2026. Final commit `322fff0`. |
| Phase 1 — HOD rollout | Live | All 15 departments active. Reports coming in daily. |
| **Phase 2 — Meta Business setup** | In progress | Business registration underway |
| Phase 2 — Technical build | Blocked | Waiting on Meta credentials |

---

## What v1.8 delivered (verified live)

Full detail in `versions/v1.8/snapshot.md`. Summary:

1. **P0: Submission bug fix** — `INSERT ... RETURNING` required a `SELECT` RLS policy. Added it. Reports now save reliably.
2. **Error infrastructure** — `hod_error_log` table, `/api/log-error` route, `/dashboard/errors` page, client-side error classification with specific messages.
3. **Database drafts** — Moved from `localStorage` to `hod_drafts` table. Auto-saves every 30s. Unique per HOD/date.
4. **Dynamic deadline badge** — Updates in real time based on Kampala time.
5. **Monday-only stock counts** — F&B bar stock and Store stock greyed out on non-Mondays. Consistent across all form modes.
6. **HOD inline editing** — Navigate to a previous date, see submitted report, edit in place. Window until 12:00 next day.
7. **Structured review system** — Reviewer dropdown (MD, GM, someone else), comments, three-colour dot system (green/amber/red).
8. **HOD landing redesign** — Status overview when all reports submitted, recent report mini-cards, next deadline.
9. **Main Gate cleanup** — Removed Mobile Money Balance section.
10. **F&B crash fix** — Type guard on repeater values for legacy string data.
11. **Dashboard polish** — Kampala timezone on all times, edited_at column, review dot legend.
12. **Admin date change** — Change a report's date with conflict detection and audit logging.
13. **Admin report deletion** — Two-stage confirmation requiring department name to be typed. Server-side verification.
14. **Rebrand** — All references updated to "Ziwa Rhino And Wildlife Ranch".

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

*Updated: 16 March 2026. v1.8 live and verified.*
