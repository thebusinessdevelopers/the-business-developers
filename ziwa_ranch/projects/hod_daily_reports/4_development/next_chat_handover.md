# Next Chat Handover

> **Purpose:** Gives the next AI chat everything it needs to continue without asking questions already answered.
> **Load context at:** Standard context load from `context.md`, then this file.

---

## Where we are

| Step | Status | Notes |
|---|---|---|
| Phase 1 — Portal v1.6 | Live & verified | Deployed and tested 16 March 2026. Final commit `a53a538`. |
| Phase 1 — HOD rollout | Live | All 15 departments active. Reports coming in daily. |
| **Phase 2 — Meta Business setup** | In progress | Business registration underway |
| Phase 2 — Technical build | Blocked | Waiting on Meta credentials |
| **v1.8 — Planning** | Ready to start | Candidates captured below |

---

## What v1.6 delivered (verified live)

Full detail in `versions/v1.6/snapshot.md`. Summary:

1. **Report editing** — HODs can edit until 8 PM next day; admins any time. Full audit trail in JSONB edit_history.
2. **Duplicate submission guard** — unique constraint + client-side check with link to edit existing report.
3. **Item autocomplete** — type-ahead from `hod_item_library` for F&B, Store, Drivers, HQ Maintenance fields.
4. **Auto-calculations** — Drivers distance, Accounts petty cash suggestion. Never pre-filled; shown as hints.
5. **Stock reconciliation** — Admin page to approve/flag Monday stock counts.
6. **Dashboard upgrades** — 7-day default, CSV export, compliance tracking, report acknowledgement.
7. **Name selector rework** — HOD pre-selected, substitutes in "Team" optgroup, "Someone else" for ad-hoc.
8. **Africa/Kampala timezone** — all date/time logic uses IANA timezone. DB timezone set.
9. **Next-morning date default** — 5 HODs default to yesterday before noon (Howard, Musoni, Elly, Jjuko, Robert).
10. **KML-sourced locations** — real Ziwa gates, areas, zones from Google Earth data.
11. **Form refinements** — Electrical restructured (Fence Patrol + HQ Power), Security patrols/unregistered people area pickers, Wildlife area/zone selects + per-sighting notes, Store/Drivers/HQ Maintenance/Plumbing/IT mandatory field updates, Craft Shop structured stock prompt, IT job cards repeater.

---

## v1.8 — Scope candidates

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
| Tables | `hod_departments` (15), `hod_daily_reports` (growing), `hod_verified_stock`, `hod_item_library` |
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
| `lib/submission-status.ts` | Timezone-aware submission timing + date formatting helpers |

### Environment variables (all set on Netlify)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key for client-side operations |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side key for dashboard + API routes |
| `ADMIN_PASSWORD` | Shared password for dashboard access |

---

*Updated: 16 March 2026. v1.6 live and verified. Next: v1.8 planning.*
