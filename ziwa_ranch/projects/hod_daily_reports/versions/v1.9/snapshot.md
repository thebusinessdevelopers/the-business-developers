# HOD Daily Reports — Version 1.9 Snapshot

> **Purpose:** Point-in-time record of Version 1.9. Documents all changes from v1.8.
>
> **Built on:** 16 March 2026
> **Deployed:** 16 March 2026
> **Status:** Live at [hoddailyreports.netlify.app](https://hoddailyreports.netlify.app)
> **Final commit:** `63c57da`
> **Base version:** v1.8 (see `versions/v1.8/snapshot.md`)

---

## What v1.9 is

A Kitchen and F&B operations release. Overhauled the Kitchen department form to match the stock-taking pattern established in F&B and Store (Monday-only counts, daily stock movement repeaters, projections). Added auto-calculated food cost. Introduced on-duty checkbox pickers for Kitchen and F&B across all three meal services. Refactored the stock write logic in FormRenderer to use config rather than hardcoded slugs.

---

## Feature summary

### Kitchen stock overhaul

- Kitchen is now a stock-taking department alongside F&B and Store
- `stockConfig: { stockType: 'kitchen', stockField: 'kitchen_stock_count' }` added to Kitchen config
- **Monday-only stock count** — repeater with sub-fields: item, quantity, unit, cost per unit. Greyed out on non-Mondays with informational note.
- **Stock Added Today** — optional repeater (min 0 rows) with same four sub-fields. Records stock received into the kitchen each day.
- **Stock Used Today** — required repeater (min 1 row) with same four sub-fields. Records ingredients consumed during service.
- **Closing stock removed** — replaced by projections calculated from Monday baseline plus daily movements
- **Opening stock removed** — same reasoning; Monday count is the baseline
- Kitchen team expanded in substitutes: `['Richard', 'Safari', 'David', 'Felly', 'Lawrence', 'Koffi']` (Richard first as second in charge)

### Auto-calculated food cost

- New calculation rule for Kitchen in `calculations.ts`
- Formula: sum of (quantity x cost per unit) across all Stock Used Today entries
- Appears as a `CalculationHint` below the Daily Food Cost field — only reveals when HOD has entered stock used data
- HOD can accept the hint or override manually

### Kitchen stock projections

- `StockProjectionDisplay` extended to support `'kitchen'` stock type
- Projection title: "Projected Kitchen Stock"
- Projection description: "Based on Monday's stock count plus stock added, minus stock used this week."
- Stock projection API route extended with kitchen-specific logic: adds `stock_added` entries, subtracts `stock_used` entries from the Monday baseline
- Projection card appears on the Kitchen landing page on non-Mondays after a Monday stock count has been submitted

### On-duty checkbox groups — Kitchen

- New "On Duty" section with three `checkbox_group` fields: Breakfast, Lunch, Dinner
- Options: Chef Sensio, Chef Richard, Chef Safari, Chef David, Chef Felly, Steward Lawrence, Steward Koffi, Someone else
- Multiple selections allowed per service
- Stored as `string[]` in report data

### On-duty checkbox groups — F&B

- Three new `checkbox_group` fields added to existing Breakfast, Lunch, and Dinner sections
- Options: Howard, Oscar, Peter, Erick, Phiona, Juliet, Khadijah, Esther, Aidah, Belinda, Sharon, Joanne
- Multiple selections allowed per service

### FormRenderer refactoring

- New `checkbox_group` render branch in `renderField()` — displays a two-column grid of labelled checkboxes
- Monday stock write logic refactored: replaced hardcoded `config.slug` checks with `config.stockConfig.stockField` and `config.stockConfig.stockType` — automatically picks up any department with a `stockConfig`
- Projection display stock type now reads from `config.stockConfig?.stockType` instead of hardcoded slug comparison

---

## No database changes

`hod_verified_stock.stock_type` is a plain text column. The value `'kitchen'` works without any migration. All new form data (stock entries, on-duty selections) is stored in the existing `report_data` JSONB column.

---

## Modified files

| Path | Changes |
|---|---|
| `types/index.ts` | Added `'kitchen'` to `StockConfig.stockType` union |
| `config/forms.ts` | Kitchen: full section overhaul + stockConfig + expanded substitutes. F&B: on-duty checkbox groups added to Breakfast, Lunch, Dinner |
| `config/calculations.ts` | Kitchen food cost auto-calculation rule |
| `components/FormRenderer.tsx` | `checkbox_group` rendering, config-based stock write, kitchen disabled message, config-based projection type |
| `components/StockProjectionDisplay.tsx` | Kitchen stock type support (title, description) |
| `app/api/stock-projection/[slug]/route.ts` | Kitchen stock type derivation + projection logic (stock_added/stock_used) |

---

## Commits

| Commit | Description |
|---|---|
| `63c57da` | v1.9: Kitchen stock overhaul, on-duty pickers for Kitchen & F&B |

---

## Architecture notes

### checkbox_group field type
- Already existed in the `FieldType` union but had no render implementation until v1.9
- Renders as a two-column grid of checkboxes with labels
- Value stored as `string[]` in form state and report JSONB
- Supports any number of options defined in the form config

### Kitchen as a stock department
- Kitchen now follows the same stock pattern as F&B (bar) and Store: Monday baseline count, daily movements, weekly projections
- The key difference is that Kitchen tracks cost per unit on all stock entries (Monday count, added, and used), enabling auto-calculated food cost
- Projection logic mirrors Store: add stock_added, subtract stock_used from Monday baseline

### Config-driven stock write
- The Monday stock write in FormRenderer no longer checks slug names — it reads `config.stockConfig.stockField` and `config.stockConfig.stockType`
- Any future department that needs Monday stock counts only needs a `stockConfig` entry and appropriate form sections

---

*Snapshot frozen: 16 March 2026. Verified live. v1.9 complete.*
