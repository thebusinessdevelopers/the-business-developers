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
