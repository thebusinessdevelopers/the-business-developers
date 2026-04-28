# A-06 — Implementation context: Accommodation rates audit + corrections

## Item summary

Apply database-only corrections: introduce `superior_double_twin` rate rows (2026 + 2027), reassign Karungi and Barungi to it, backfill A-Frame 2026 rates from 2027, revert the erroneous 2027 `superior_family` and `superior_executive` rates to their 2026 values, and fix camping STO for 2026 and 2027 — with no application logic changes.

## Files to change

| File | What changes | Function / type name |
|------|--------------|----------------------|
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/0NN_v212_a06_rate_corrections.sql` | New migration containing all INSERTs and UPDATEs below | — |
| `packages/shared/config/accommodation.ts` | **No change required.** No `RATE_CATEGORIES` constant exists in `accommodation.ts` or anywhere under `4_development/` (zero grep hits). `rate_category` is an unconstrained `string` on `AccommodationUnit`, `AccommodationRate`, and `RoomBasketItem` | — |
| Admin / portal UI | **No change required.** `BookingForm.tsx` sets `rate_category` from the selected unit (`addRoom`, lines 192–206), not from a category selector; `RoomManagement.tsx:77` displays the stored slug as-is | — |

## DB migration required

Y — full SQL:

```sql
-- v2.12 A-06: rate category corrections and backfill
-- Target tables: public.accommodation_rates, public.accommodation_units
-- Column precedent: portal/supabase/migrations/023_accommodation.sql

-- ---------------------------------------------------------------------------
-- INSERT: superior_double_twin rates (2026 and 2027, identical values)
-- ---------------------------------------------------------------------------

INSERT INTO public.accommodation_rates
  (rate_category, meal_plan, rate_type, year, adult_rate, child_rate, notes)
VALUES
  ('superior_double_twin', 'fb', 'rack', 2026, 400, NULL, NULL),
  ('superior_double_twin', 'fb', 'sto',  2026, 300, NULL, NULL),
  ('superior_double_twin', 'hb', 'rack', 2026, 370, NULL, NULL),
  ('superior_double_twin', 'hb', 'sto',  2026, 270, NULL, NULL),
  ('superior_double_twin', 'fb', 'rack', 2027, 400, NULL, NULL),
  ('superior_double_twin', 'fb', 'sto',  2027, 300, NULL, NULL),
  ('superior_double_twin', 'hb', 'rack', 2027, 370, NULL, NULL),
  ('superior_double_twin', 'hb', 'sto',  2027, 270, NULL, NULL);

-- ---------------------------------------------------------------------------
-- INSERT: A-Frame 2026 backfill (identical to 2027)
-- ---------------------------------------------------------------------------

INSERT INTO public.accommodation_rates
  (rate_category, meal_plan, rate_type, year, adult_rate, child_rate, notes)
VALUES
  ('a_frame', 'fb', 'rack', 2026, 340, NULL, NULL),
  ('a_frame', 'fb', 'sto',  2026, 240, NULL, NULL),
  ('a_frame', 'hb', 'rack', 2026, 320, NULL, NULL),
  ('a_frame', 'hb', 'sto',  2026, 220, NULL, NULL),
  ('a_frame', 'bb', 'rack', 2026, 300, NULL, NULL),
  ('a_frame', 'bb', 'sto',  2026, 200, NULL, NULL);

-- ---------------------------------------------------------------------------
-- UPDATE: reassign Karungi and Barungi (after superior_double_twin rates exist)
-- ---------------------------------------------------------------------------

UPDATE public.accommodation_units
SET rate_category = 'superior_double_twin'
WHERE name IN ('Karungi', 'Barungi');

-- ---------------------------------------------------------------------------
-- UPDATE: camping STO corrections
-- ---------------------------------------------------------------------------

UPDATE public.accommodation_rates
SET adult_rate = 20
WHERE year = 2026 AND rate_category = 'camping' AND meal_plan = 'none' AND rate_type = 'sto';

UPDATE public.accommodation_rates
SET adult_rate = 30
WHERE year = 2027 AND rate_category = 'camping' AND meal_plan = 'none' AND rate_type = 'sto';

-- ---------------------------------------------------------------------------
-- UPDATE: revert 2027 superior_family to 2026 values
-- ---------------------------------------------------------------------------

UPDATE public.accommodation_rates SET adult_rate = 500 WHERE year = 2027 AND rate_category = 'superior_family' AND meal_plan = 'fb' AND rate_type = 'rack';
UPDATE public.accommodation_rates SET adult_rate = 410 WHERE year = 2027 AND rate_category = 'superior_family' AND meal_plan = 'fb' AND rate_type = 'sto';
UPDATE public.accommodation_rates SET adult_rate = 455 WHERE year = 2027 AND rate_category = 'superior_family' AND meal_plan = 'hb' AND rate_type = 'rack';
UPDATE public.accommodation_rates SET adult_rate = 365 WHERE year = 2027 AND rate_category = 'superior_family' AND meal_plan = 'hb' AND rate_type = 'sto';

-- ---------------------------------------------------------------------------
-- UPDATE: revert 2027 superior_executive to 2026 values
-- ---------------------------------------------------------------------------

UPDATE public.accommodation_rates SET adult_rate = 550 WHERE year = 2027 AND rate_category = 'superior_executive' AND meal_plan = 'fb' AND rate_type = 'rack';
UPDATE public.accommodation_rates SET adult_rate = 450 WHERE year = 2027 AND rate_category = 'superior_executive' AND meal_plan = 'fb' AND rate_type = 'sto';
UPDATE public.accommodation_rates SET adult_rate = 520 WHERE year = 2027 AND rate_category = 'superior_executive' AND meal_plan = 'hb' AND rate_type = 'rack';
UPDATE public.accommodation_rates SET adult_rate = 420 WHERE year = 2027 AND rate_category = 'superior_executive' AND meal_plan = 'hb' AND rate_type = 'sto';
```

**Single-room category is explicitly out of scope** (Joshua's decision — standard twin/double rate applies to single occupancy).

## Dependencies

A-02 through A-05 are independent. A-06 should sit alongside the other Phase 1 migrations (filename ordering only — no code dependency). Order within this migration matters: `INSERT superior_double_twin` rows must land before `UPDATE accommodation_units ... rate_category = 'superior_double_twin'`.

## Complexity

**M** — data-only, no logic change, but wide row footprint: 14 INSERTs, 11 UPDATEs, and one `accommodation_units` reassignment.

## Validation steps

1. `SELECT year, meal_plan, rate_type, adult_rate FROM accommodation_rates WHERE rate_category = 'superior_double_twin' ORDER BY year, meal_plan, rate_type;` — expect 8 rows (4 × 2026 + 4 × 2027) with values 400/300/370/270.
2. `SELECT name, rate_category FROM accommodation_units WHERE name IN ('Karungi','Barungi');` — both return `superior_double_twin`.
3. `SELECT meal_plan, rate_type, adult_rate FROM accommodation_rates WHERE rate_category = 'a_frame' AND year = 2026 ORDER BY meal_plan, rate_type;` — 6 rows matching the 2027 values (340/240, 320/220, 300/200).
4. `SELECT year, rate_type, adult_rate FROM accommodation_rates WHERE rate_category = 'camping' ORDER BY year, rate_type;` — 2026 STO = 20, 2027 STO = 30, rack = 35 both years.
5. `SELECT rate_category, meal_plan, rate_type, adult_rate FROM accommodation_rates WHERE year = 2027 AND rate_category IN ('superior_family','superior_executive') ORDER BY rate_category, meal_plan, rate_type;` — figures match the 2026 seed in `023_accommodation.sql`.
6. Smoke test: open admin New Booking, add Karungi with FB STO — nightly rate suggestion is $300, not $410.

## Evidence

- `RATE_CATEGORIES` does not exist anywhere in `4_development/` (grep returned 0 matches). `rate_category` is a dynamic `string` field on `AccommodationUnit`, `AccommodationRate`, `RoomBasketItem`; no constant or enum constrains its values.
- `BookingForm.tsx` rate-category assignment: `addRoom` sets `rate_category: unit.rate_category` (line 192–206) — no category selector UI.
- `RoomManagement.tsx:77` renders the raw slug with no label mapping.
- Column order follows `portal/supabase/migrations/023_accommodation.sql`: `rate_category, meal_plan, rate_type, year, adult_rate, child_rate, notes`.
