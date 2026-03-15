# HOD Daily Reports — Version 1.4 Snapshot

> **Purpose:** A point-in-time record of Version 1.4. Documents all changes from v1.2.
>
> **Built on:** 15 March 2026
> **Deployed:** 15 March 2026
> **Status:** Live at [hoddailyreports.netlify.app](https://hoddailyreports.netlify.app)
> **Final commit:** `d0bf233`
> **Base version:** v1.2 (see `versions/v1.2/snapshot.md`)
> **Rollback tag:** `v1.2` (git tag on commit `cceeffb`)

---

## What v1.4 is

Six workstreams built on the v1.2 foundation, focused on form quality, stock management, and operational improvements following the first week of HOD usage. Shipped across three commits with two post-deploy hotfixes.

**What v1.4 adds over v1.2:**
- Manual "Save Draft" button — HOD presses it to save exact form state to localStorage; restored automatically on next visit
- F&B form overhaul — structured dish repeaters, beverage sales section, weekly Monday bar stock count with projected stock throughout the week; Service Observations removed
- Store form overhaul — goods-in/goods-out repeaters, weekly Monday store stock count with projection; GRN, opening/closing textareas, and Daily Food Cost removed
- Accounts/Main Gate field transfer — Mobile Money balances moved from Accounts to Main Gate (per Musoni); receivables label clarified
- Three-tier late submission timing — on time (before 12pm next day), warning (12pm–3pm), late (after 3pm), all in EAT timezone
- Silent item name harvesting — collects item names from repeater fields into `hod_item_library` for future autocomplete (v1.6)

---

## Database changes from v1.2

Two new tables applied via Supabase MCP on 15 March 2026:

### `hod_verified_stock` (migration: `002_verified_stock.sql`)

| Column | Type | Purpose |
|---|---|---|
| id | uuid PK | |
| department_id | uuid FK → hod_departments | |
| stock_type | text | "bar" or "store" |
| entry_date | date | The Monday this count was entered |
| items | jsonb | Array of `{item, quantity, unit}` |
| entered_by | text | HOD name |
| created_at | timestamptz | |

Index on `(department_id, stock_type, entry_date desc)`.
RLS: anon insert, authenticated read.

### `hod_item_library` (migration: `003_item_library.sql`)

| Column | Type | Purpose |
|---|---|---|
| id | uuid PK | |
| department_id | uuid FK → hod_departments | |
| category | text | "dish", "beverage", "store_goods", "vehicle", "materials" |
| item_name | text | Normalised (trimmed, lowercase) |
| occurrence_count | integer | Times this item has appeared |
| first_seen | date | |
| last_seen | date | |

Unique index on `(department_id, category, item_name)`.
RLS: anon insert/update, authenticated read.

No changes to existing `hod_departments` or `hod_daily_reports` tables.

---

## Form changes summary

| Department | Changes |
|---|---|
| Main Gate | **Added:** Mobile Money Balance section (opening + closing, required) |
| Food & Beverage | **Removed:** Service Observations, opening/closing bar stock textareas. **Added:** Monday bar stock count repeater (item, qty, unit), structured dish repeaters for breakfast/lunch/dinner (dish name + qty), Beverage Sales repeater (beverage name + qty sold). **Renamed:** lunch_notes → lunch_dishes |
| Store | **Removed:** Opening/closing stock textareas, GRN report, old stock repeaters, Daily Food Cost. **Added:** Monday store stock count repeater (item, qty, unit), Goods Added to Store repeater (item, supplier, qty, price per unit), Goods Taken from Store repeater (item, qty, taken by) |
| Accounts | **Removed:** Mobile Money start/end from both balance sections. **Updated:** Receivables placeholder clarified |
| All others | No changes |

---

## New files

| Path | Purpose |
|---|---|
| `lib/submission-status.ts` | Three-tier late logic (on_time/warning/late) with EAT timezone |
| `components/StockProjectionDisplay.tsx` | Read-only projected stock table (blue panel) |
| `app/api/stock-projection/[slug]/route.ts` | GET: computes projected stock from verified baseline ± daily movements |
| `app/api/harvest-items/route.ts` | POST: extracts item names from report repeaters, upserts to library |
| `supabase/migrations/002_verified_stock.sql` | hod_verified_stock table |
| `supabase/migrations/003_item_library.sql` | hod_item_library table |

---

## Modified files

| Path | Changes |
|---|---|
| `components/FormRenderer.tsx` | Manual Save Draft button (synchronous localStorage write), stock projection display, Monday dual-write, harvest call, three-tier late warning |
| `config/forms.ts` | F&B overhaul, Store overhaul, Main Gate Mobile Money, Accounts cleanup, `stockConfig` and `mondayOnly` properties |
| `types/index.ts` | `mondayOnly`, `StockConfig`, `stockConfig` additions |
| `app/report/[slug]/page.tsx` | Passes `departmentSlug` prop to ReportForm |
| `app/report/[slug]/ReportForm.tsx` | Monday detection, stock projection fetch, section filtering |
| `app/dashboard/page.tsx` | Uses `getSubmissionStatus()`, adds warning count card |
| `app/dashboard/reports/page.tsx` | Three-tier badges (on time / warning / late) |
| `app/dashboard/reports/[id]/page.tsx` | Three-tier badge on report detail |

---

## Architecture notes

### Draft saving
- Manual "Save Draft" button — HOD presses explicitly, no auto-save
- Synchronous write to localStorage on button press — exact form state, no stale closure risk
- Key format: `draft-{slug}-{reportDate}` — one draft per department per date
- Auto-cleanup of drafts older than 7 days on page load
- "Draft restored" indicator shown for 3 seconds on load
- Cleared automatically on successful submission

### Stock projection
- Monday: HOD submits full stock count → dual-written to `hod_daily_reports.report_data` AND `hod_verified_stock`. Dual-write is non-blocking (wrapped in try/catch).
- Tuesday–Sunday: read-only projection panel shown at top of form, calculated server-side:
  - Bar: `Monday verified stock − cumulative beverage sales`
  - Store: `Monday verified stock + cumulative goods added − cumulative goods taken`
- No reconciliation workflow yet (v1.6)

### Late submission timing (EAT, UTC+3)
- On time: submitted before 12:00 EAT the day after report date
- Warning: submitted 12:00–15:00 EAT
- Late: submitted after 15:00 EAT
- Colour-coded badges across all dashboard views

### Item harvesting
- POST `/api/harvest-items` called fire-and-forget after each submission
- Extracts from: F&B dishes + beverages, Store goods, Driver plates, HQ Maintenance materials
- Upserts to `hod_item_library` (normalised lowercase item names)
- No UI reads this table yet — data collection only for v1.6 autocomplete

---

## Commits

| Commit | Description |
|---|---|
| `e1b3bf2` | v1.4 main build |
| `162defb` | Fix: removed invalid TypeScript condition in harvest-items route (build error) |
| `d0bf233` | Fix: removed Daily Food Cost from Store form; replaced debounced auto-save with manual Save Draft button |

---

*Snapshot frozen: 15 March 2026. Verified live. v1.4 complete.*
