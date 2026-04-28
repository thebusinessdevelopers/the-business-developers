# Phase 1 — Handover

> **Scope:** SQL-only Phase 1 of the authorised v2.12 build plan (`plan.md` §§1.1–1.6). Four migrations applied to staging; one migration authored and gated.
> **Staging project:** Supabase `inidzwfjnkyinxhvbrdt`.
> **Apply window:** 20 Apr 2026, ~20:08 Africa/Kampala.
> **Tool:** Supabase MCP `execute_sql`.

---

## a. What was done

**Migrations authored (all five):**

- `042_v212_augustu.sql` — A-03 `pricing_type` column + CHECK + per-person flag for Augustu; A-04 jsonb merge raising Augustu `max_adults` 2 → 3.
- `043_v212_chalet_pax.sql` — A-05 jsonb merge across Kirungi, Murungi, The Family, The Clan to `max_adults: 2, max_children: 2, max_total: 4, cot_eligible: true`; `beds` preserved.
- `044_v212_a06_rate_corrections.sql` — A-06 + A-07 data: 8 `superior_double_twin` INSERTs (2026 + 2027), 6 `a_frame` 2026 backfill INSERTs, Karungi/Barungi reassignment UPDATE (after the dependent INSERTs), camping STO UPDATEs (2026 = 20, 2027 = 30), 2027 `superior_family` + `superior_executive` reverts to 2026 values.
- `045_v212_aframe_rename.sql` — A-08 four UPDATEs: Alfajiri → Mvule, Kilele → Musambya, Nyota → Mugavu, Upeo → Mukooge. `sort_order` and `status` untouched.
- `046_v212_c01_date_corrections.sql` — C-01 transactional template with `<NEW_DATE_ACCOUNTS>` and `<NEW_DATE_DRIVERS>` placeholders and a prominent CONDITIONAL GATE comment block at the top.

**Applied to staging (042 → 045):** zero errors, zero constraint violations. Migration 046 **not** applied.

**Validation results (all green):**

| Check | Query | Result |
|---|---|---|
| Augustu row | `SELECT name, pricing_type, pax_config FROM accommodation_units WHERE name = 'Augustu';` | `pricing_type = per_person`, `max_adults = 3`, `max_total = 5`, `max_children = 3`, `cot_eligible = true`, `beds = [{"type":"double","count":2}]` |
| Non-Augustu rows default flat | `SELECT count(*) FROM accommodation_units WHERE name <> 'Augustu' AND pricing_type <> 'flat';` | `0` |
| CHECK enforcement | `UPDATE accommodation_units SET pricing_type = 'other' WHERE name = 'Augustu';` | `23514 check_violation` on `accommodation_units_pricing_type_check` — constraint rejected as expected |
| Chalet pax | `SELECT name, pax_config FROM accommodation_units WHERE name IN ('Kirungi','Murungi','The Family','The Clan');` | All four rows: `max_adults: 2`, `max_children: 2`, `max_total: 4`, `cot_eligible: true`, `beds` preserved |
| `superior_double_twin` rates | `SELECT year, meal_plan, rate_type, adult_rate FROM accommodation_rates WHERE rate_category = 'superior_double_twin' ORDER BY year, meal_plan, rate_type;` | 8 rows (4 × 2026, 4 × 2027): 400/300/370/270 |
| Karungi/Barungi category | `SELECT name, rate_category FROM accommodation_units WHERE name IN ('Karungi','Barungi');` | Both `superior_double_twin` |
| A-Frame 2026 backfill | `SELECT meal_plan, rate_type, adult_rate FROM accommodation_rates WHERE rate_category = 'a_frame' AND year = 2026 ORDER BY meal_plan, rate_type;` | 6 rows: bb 300/200, fb 340/240, hb 320/220 |
| Camping STO | `SELECT year, rate_type, adult_rate FROM accommodation_rates WHERE rate_category = 'camping' AND meal_plan = 'none' AND rate_type = 'sto' ORDER BY year;` | 2026 = 20, 2027 = 30 |
| 2027 superior reverts | `SELECT rate_category, meal_plan, rate_type, adult_rate FROM accommodation_rates WHERE year = 2027 AND rate_category IN ('superior_family','superior_executive') ORDER BY rate_category, meal_plan, rate_type;` | `superior_executive` 550/450/520/420; `superior_family` 500/410/455/365 — match 2026 seed |
| A-Frame names | `SELECT name, sort_order, status FROM accommodation_units WHERE building = 'a_frames' ORDER BY sort_order;` | Mvule (500), Musambya (501), Mugavu (502), Mukooge (503); all `status = inactive` (unchanged) |
| Placeholders removed | `SELECT count(*) FROM accommodation_units WHERE name IN ('Alfajiri','Kilele','Nyota','Upeo');` | `0` |

**Tracking updates:**

- `progress/phase_1_checklist.md` — items 1–18 and 23–25 ticked; 19–22 left open with the note _Awaiting business-confirmed dates_; item 26 (`APPROVED: phase_1_complete`) still open.
- `progress/README.md` — 1.1, 1.2, 1.3, 1.4 flipped to `Completed`; 1.5 and 1.6 remain `Not started` (1.5 by convention — Phase 2.8 carries the application work; 1.6 gated).
- `backlog.md` Decision Log — new 20 Apr 2026 entry recording applied migrations, staging project, smoke-query results, and C-01 gate status.

## b. Open items

All Phase 1 open items resolved — Joshua, 20 Apr 2026.

- **C-01 resolved.** Joshua confirmed `report_date = 2026-04-18` is correct for both Accounts and Drivers & Mechanics. No data correction required. `046_v212_c01_date_corrections.sql` deleted from the repo.
- **Production deploy approved.** 042–045 applied to the connected Supabase project (`inidzwfjnkyinxhvbrdt`).
- **`APPROVED: phase_1_complete`** — recorded in `backlog.md` Decision Log. Phase 2 may begin.

## c. File index

New files authored under `ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/`:

1. `042_v212_augustu.sql` — 12 lines. A-03 column + CHECK + per-person flag; A-04 pax merge.
2. `043_v212_chalet_pax.sql` — 5 lines. A-05 four-row jsonb merge.
3. `044_v212_a06_rate_corrections.sql` — 71 lines. Ordered: `superior_double_twin` INSERTs → A-Frame 2026 INSERTs → Karungi/Barungi UPDATE → camping STO UPDATEs → 2027 `superior_family` reverts → 2027 `superior_executive` reverts.
4. `045_v212_aframe_rename.sql` — 5 lines. A-08 four UPDATEs.
5. `046_v212_c01_date_corrections.sql` — **Deleted.** Joshua confirmed existing `report_date = 2026-04-18` is correct for both stuck rows; no data correction was required.
