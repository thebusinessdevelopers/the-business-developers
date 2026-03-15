# Next Chat Handover

> **Purpose:** Gives the next AI chat everything it needs to continue without asking questions already answered.
> **Load context at:** Standard context load from `context.md`, then this file.

---

## Where we are

| Step | Status | Notes |
|---|---|---|
| Phase 1 — Portal v1.4 | Live & verified | Deployed and tested 15 March 2026. Final commit `d0bf233`. |
| Phase 1 — HOD rollout | Live | All 15 departments active. Reports coming in daily. |
| Phase 1 — IT department | Form live | Benson yet to submit |
| **Phase 2 — Meta Business setup** | In progress | Business registration underway |
| Phase 2 — Technical build | Blocked | Waiting on Meta credentials |
| **v1.6 — Planning** | Ready to start | Candidates captured below |

---

## What v1.4 delivered (verified live)

Full detail in `versions/v1.4/snapshot.md`.

1. **Save Draft button** — HOD presses explicitly; exact form state saved to localStorage; restored on next visit
2. **F&B form** — dish repeaters (breakfast/lunch/dinner), beverage sales section, Monday bar stock count, projected stock Tue–Sun, service observations removed
3. **Store form** — goods-in/goods-out repeaters, Monday store stock count, projected stock Tue–Sun, GRN removed, Daily Food Cost removed
4. **Accounts → Main Gate** — Mobile Money balances now on Main Gate; receivables label clarified
5. **Three-tier late submission** — on time / warning / late (EAT timezone). Dashboard updated.
6. **Silent item harvesting** — item names collected post-submission into `hod_item_library`

---

## v1.6 — Scope candidates

### From HOD feedback and v1.4 observations

**Offline capability (Martine / Wildlife)**
- Martine is in the field all day; needs to add to the form offline and submit when back in range
- Requires service worker + IndexedDB for offline form persistence
- Potentially useful for: Electrical (fence patrols), Security (patrols), Drivers & Mechanics

**Multi-contributor support**
- Martine wants team members to contribute to the same daily report
- Requires: user identity per contributor, timestamped contributions, visible attribution in the report
- Applicable to: Wildlife, Drivers & Mechanics, Electrical, Security
- Needs careful design around form locking and merging

**Item autocomplete UI**
- `hod_item_library` is being populated silently from v1.4 onwards
- v1.6: surface as type-ahead suggestions in repeater text fields
- Departments: F&B (dishes, beverages), Store (goods), Drivers (plates), HQ Maintenance (materials)

**Auto-calculations (with HOD verification gate)**
- Drivers & Mechanics: mileage to next service auto-calculated from previous closing + today's distance. Show suggestion only after HOD enters their own value — never pre-fill.
- Accounts: petty cash end-of-day balance auto-suggested from start + payments
- Store: cross-reference goods movement against projected stock for discrepancy alerts
- Rule: auto-calculations are never confirmed; always require HOD to verify before submission

**Full stock reconciliation workflow**
- Admin approves or flags Monday stock counts vs projected
- Currently the projection is informational only — no admin touchpoint

**Dashboard improvements**
- Export / print report data (weekly management meeting use case)
- HOD compliance tracking: submission rate by HOD over time
- Date range default: last 7 days instead of last 200 reports
- Report acknowledgement: management can mark a report as reviewed

**Craft Shop stock prompt**
- Current stock status textarea is too open-ended; needs structured guidance

**Duplicate submission guard**
- Prevent the same department submitting twice for the same date

**Receivables clarification (Accounts)**
- Pending confirmation from Wellington on exact definition
- Placeholder already updated to "Money received from Captain/Nana or other sources" — confirm and make field label permanent when confirmed

---

## Technical state

| Service | Detail |
|---|---|
| Supabase project | `inidzwfjnkyinxhvbrdt` (EU West Frankfurt) |
| Supabase URL | `https://inidzwfjnkyinxhvbrdt.supabase.co` |
| Tables | `hod_departments` (15), `hod_daily_reports` (growing), `hod_verified_stock` (new v1.4), `hod_item_library` (new v1.4) |
| Frontend | Next.js 16, Tailwind v4, React 19 |
| Code location | `4_development/portal/` |
| GitHub repo | `https://github.com/thebusinessdevelopers/hod_daily_reports` |
| Netlify project ID | `3e5bb9b4-c0b2-4031-9f28-0132cbb1d303` |
| Live URL | `https://hoddailyreports.netlify.app` |
| Dashboard | `https://hoddailyreports.netlify.app/dashboard` |
| Rollback | Git tag `v1.2` on commit `cceeffb` — redeploy from Netlify deploys tab |

### Environment variables (all set on Netlify)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key for client-side inserts |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side key for dashboard + API routes |
| `ADMIN_PASSWORD` | Shared password for dashboard access |

---

*Updated: 15 March 2026. v1.4 live and verified. Next: v1.6 planning.*
