# HOD Daily Reports — Version 1.6 Snapshot

> **Purpose:** Point-in-time record of Version 1.6. Documents all changes from v1.4.
>
> **Built on:** 16 March 2026
> **Deployed:** 16 March 2026
> **Status:** Live at [hoddailyreports.netlify.app](https://hoddailyreports.netlify.app)
> **Final commit:** `a53a538`
> **Base version:** v1.4 (see `versions/v1.4/snapshot.md`)

---

## What v1.6 is

The largest update since launch, delivered across three commits. Adds report editing, item autocomplete, auto-calculations, stock reconciliation, dashboard upgrades, and a comprehensive set of form refinements based on the first week of real HOD usage.

---

## Feature summary

### Report editing with audit trail

- **HODs** can edit their own reports until 8 PM Kampala time the day after the report was due, via `/report/[slug]/edit/[id]`
- **Admins** can edit any report at any time via `/dashboard/reports/[id]/edit`
- All edits are logged in an `edit_history` JSONB column — each entry records who edited, when, and a field-level diff of old vs new values
- Edit history displayed in a compact technical footer on the report detail page

### Duplicate submission guard

- Unique constraint on `(department_id, report_date)` prevents double submissions at the DB level
- Client-side pre-check warns the HOD and links to the existing report for editing

### Item autocomplete

- `AutocompleteInput` component provides type-ahead suggestions from `hod_item_library`
- API route `/api/item-suggestions/[slug]` queries by department and category
- Integrated in: F&B (dishes, beverages), Store (goods), Drivers (vehicle plates), HQ Maintenance (materials)

### Auto-calculations with verification gate

- Calculations are never pre-filled — shown as suggestions after the HOD enters their value
- **Drivers & Mechanics:** distance today (closing − opening mileage) shown inline per vehicle
- **Accounts:** suggested closing petty cash balance (start + receivables − payments)
- Config-driven via `config/calculations.ts`, rendered by `CalculationHint` component

### Stock reconciliation workflow

- New admin page `/dashboard/stock` — shows Monday stock counts awaiting review
- Admin can approve, flag with notes, or request recount
- `hod_verified_stock` extended with `status` (pending/approved/flagged) and `admin_notes` columns

### Dashboard improvements

- **Date range default:** Reports list now defaults to last 7 days instead of last 200
- **Export CSV:** Button on reports list generates CSV of filtered reports
- **HOD compliance tracking:** New `/dashboard/compliance` page — submission rates per department over 7/14/30 days, Sundays excluded
- **Report acknowledgement:** "Mark as reviewed" button on report detail; green indicator on reports list; filter by reviewed/unreviewed
- **Navigation:** Stock and Compliance links added to dashboard sidebar

### Name selector rework

- HOD name pre-selected by default (no blank "Select your name..." prompt)
- Substitutes shown in an optgroup labelled "Team"
- "Someone else" option retained for ad-hoc names
- `substitutes` field added to `DepartmentFormConfig` type

### Timezone: Africa/Kampala

- All date/time logic uses `Africa/Kampala` IANA timezone (replaced brittle manual UTC+3 offset)
- `submission-status.ts` fully rewritten with Kampala-aware helpers: `formatDateKampala`, `formatDateTimeKampala`, `formatTimeKampala`, `formatDateLongKampala`
- Edit page time gate uses proper Kampala timezone
- All dashboard `formatDate`/`formatDateTime` helpers updated
- DB timezone set to `Africa/Kampala`

### Next-morning date default

- 5 HODs who typically submit the following morning (Howard, Musoni, Elly, Jjuko, Robert) have `defaultsToYesterday: true`
- Between midnight and noon Kampala time, the report date defaults to yesterday
- Amber reminder banner on all forms: "Please confirm the submission date is correct before submitting."

### KML-sourced locations

- Gate names sourced from the Ziwa Google Earth KML: Main Gate, Kamira Gate, Sajjabi 1/2, Wangoiro West/East, Mandela, Lugogo West, Captain's, Kasozi Outpost
- Security `gate_checks` now uses a select dropdown with real gate names
- Global `config/locations.ts` provides shared `AREAS`, `ZONES`, and `GATES` constants
- M4 zone removed (not in KML)

---

## Form changes by department

| Department | Changes |
|---|---|
| **Main Gate** | `defaultsToYesterday: true` |
| **HQ Reception** | Substitutes: Patience |
| **Food & Beverage** | `defaultsToYesterday: true`, autocomplete on dish/beverage fields, substitutes: Oscar |
| **Kitchen** | Substitutes: Richard |
| **Housekeeping** | `defaultsToYesterday: true`, substitutes: Anita |
| **Security** | Gate checks converted to gate select (KML gates), patrol repeater added (area/zone selects, start/end time, notes), road status no longer mandatory, unregistered people now has area/zone selects + conclusion field. Substitutes: Elia |
| **Store** | `goods_added` and `goods_taken` now required with `min_rows: 1`, autocomplete on item fields. Substitutes: Emilly |
| **Accounts** | `defaultsToYesterday: true`, receivables label updated to "Chairman, CEO & Directors", petty cash auto-calculation hint. Substitutes: Halima |
| **Electrical** | `defaultsToYesterday: true`, form restructured into Fence Patrol (areas, damage, repairs, cleanliness, fence power outages) + HQ Power & Generator (HQ power status, generator use). Substitutes: Sekito |
| **HQ Maintenance** | `work_done` repeater now required. Substitutes: Francis |
| **Drivers & Mechanics** | `vehicle_usage` and `work_done` repeaters now required (`min_rows: 1`), distance calculation shown inline |
| **Plumbing** | `work_done` repeater now required. Substitutes: Jonah |
| **IT** | `job_cards` converted from number field to repeater (name, department, reason) |
| **Wildlife** | Area/zone selects on all species sightings (from shared locations), notes sub-field in each sighting, species-specific notes labels, "General Notes" section added at end, rhino total no longer required, rhino ID label changed to "Rhino name / number" |
| **Craft Shop** | `stock_status` textarea replaced with structured repeaters (low stock items, popular items, restock needed) + stock notes. Substitutes: Patience |

---

## Database changes from v1.4

### Migration: `004_v16_schema.sql`

**New columns on `hod_daily_reports`:**

| Column | Type | Purpose |
|---|---|---|
| edited_at | timestamptz, nullable | When last edited |
| last_edited_by | text, nullable | Who last edited |
| edit_history | jsonb, default '[]' | Array of edit log entries |
| acknowledged_at | timestamptz, nullable | When admin reviewed |
| acknowledged_by | text, nullable | Who reviewed |

**New index:** `hod_daily_reports_dept_date_unique` — unique on `(department_id, report_date)`

**New columns on `hod_verified_stock`:**

| Column | Type | Purpose |
|---|---|---|
| status | text, default 'pending' | pending / approved / flagged |
| admin_notes | text, nullable | Admin review notes |

**New RLS policies:**
- `hod_daily_reports` — anon update allowed
- `hod_verified_stock` — anon update allowed
- `hod_item_library` — anon select allowed

**Data updates:**
- `hod_departments.hods` reverted to primary HOD only (substitutes are config-only)
- DB timezone set to `Africa/Kampala`

---

## New files

| Path | Purpose |
|---|---|
| `components/AutocompleteInput.tsx` | Type-ahead suggestion input from item library |
| `components/CalculationHint.tsx` | Inline auto-calculation suggestion display |
| `components/EditHistory.tsx` | Compact edit log display for report detail |
| `components/ExportCSVButton.tsx` | CSV export for reports list |
| `components/AcknowledgeButton.tsx` | "Mark as reviewed" button for dashboard |
| `components/CompliancePeriodSelector.tsx` | Period selector for compliance page |
| `config/calculations.ts` | Auto-calculation definitions per department |
| `config/locations.ts` | Shared area, zone, and gate constants |
| `app/api/item-suggestions/[slug]/route.ts` | Item library query endpoint |
| `app/report/[slug]/edit/[id]/page.tsx` | HOD edit page (with time gate) |
| `app/report/[slug]/edit/[id]/EditReportForm.tsx` | HOD edit form wrapper |
| `app/dashboard/reports/[id]/edit/page.tsx` | Admin edit page (no time gate) |
| `app/dashboard/reports/[id]/edit/AdminEditForm.tsx` | Admin edit form wrapper |
| `app/dashboard/stock/page.tsx` | Stock reconciliation admin page |
| `app/dashboard/stock/StockActions.tsx` | Approve/flag actions for stock entries |
| `app/dashboard/compliance/page.tsx` | HOD compliance tracking page |
| `app/dashboard/compliance/CompliancePeriodSelector.tsx` | Period selector component |
| `supabase/migrations/004_v16_schema.sql` | All v1.6 schema changes |

## Modified files

| Path | Changes |
|---|---|
| `types/index.ts` | Added `substitutes`, `defaultsToYesterday`, `autocomplete` on SubField, `EditHistoryEntry`, extended `DailyReport` with edit/acknowledge fields |
| `config/forms.ts` | All department configs updated (substitutes, mandatory fields, form restructures, autocomplete, locations imports) |
| `components/FormRenderer.tsx` | Name selector rework, date default logic, reminder banner, edit mode, duplicate check, calculation hints, diff tracking |
| `components/RepeaterField.tsx` | Autocomplete integration, vehicle distance display, select sub-field rendering |
| `lib/submission-status.ts` | Full rewrite with Africa/Kampala timezone, added format helpers |
| `app/report/[slug]/edit/[id]/page.tsx` | Kampala timezone for edit window |
| `app/dashboard/layout.tsx` | Stock and Compliance nav links |
| `app/dashboard/reports/page.tsx` | 7-day default, CSV export, acknowledge filter, reviewed indicator |
| `app/dashboard/reports/[id]/page.tsx` | Edit link, acknowledge button, edit history, Kampala date formatting |
| `app/dashboard/reports/[id]/AcknowledgeButton.tsx` | Kampala timezone formatting |
| `app/dashboard/stock/page.tsx` | Kampala timezone formatting |

---

## Commits

| Commit | Description |
|---|---|
| `a8bf08e` | v1.6 main build: editing, autocomplete, calculations, duplicate guard, dashboard upgrades |
| `d6582b1` | v1.6 amendments: name selector rework, Africa/Kampala timezone, form config updates |
| `a53a538` | v1.6 refinements: team label, date defaults, KML gates, electrical restructure, mandatory fields |

---

## Architecture notes

### Report editing
- HOD edit window: midnight to 8 PM Kampala time the day after `report_date`
- Edit history: JSONB array of `{ edited_by, edited_at, changes: [{ field, old_value, new_value }] }`
- Diff computed client-side by comparing initial vs submitted values, with field labels resolved from config
- Admins identified as "Admin" in edit history entries

### Name selector
- `hods` array = primary HOD(s), pre-selected by default
- `substitutes` array = team members who may fill in, shown in "Team" optgroup
- "Someone else" option for ad-hoc names
- DB `hod_departments.hods` stores primary only; substitutes are config-only

### Date defaulting
- `defaultsToYesterday: true` on 5 departments whose HODs typically submit the following morning
- Between 00:00 and 12:00 Kampala time, report date defaults to yesterday
- Amber reminder banner on all forms regardless of department

### Location system
- `config/locations.ts` is the single source of truth for areas (7), zones (15), and gates (10)
- Sourced from the Ziwa Google Earth KML (`ziwa_ranch/docs/2026_03_07_ziwa_rhino_and_wildlife_ranch_google_earth.kml`)
- Used by Security (patrols, gate checks, unregistered people) and Wildlife (all species sightings)

---

*Snapshot frozen: 16 March 2026. Verified live. v1.6 complete.*
