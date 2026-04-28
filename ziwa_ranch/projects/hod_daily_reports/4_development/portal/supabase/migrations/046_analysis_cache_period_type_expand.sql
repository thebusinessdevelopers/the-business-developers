-- 046_analysis_cache_period_type_expand.sql
-- Run against: inidzwfjnkyinxhvbrdt (shared Supabase project — dev and prod)
-- Purpose: align hod_analysis_cache.period_type CHECK with v2.12 code.
--
-- Pre-apply CHECK (verbatim from pg_get_constraintdef):
--   CHECK ((period_type = ANY (ARRAY['report'::text, 'day'::text, 'week'::text, 'month'::text])))
--
-- Preserves report|day|week|month (existing allow-list) and additionally
-- allows trend_alert, daily_brief, weekly_brief (v2.12 requirement).
-- Safe: no DML, no data rewrite, additive widening only.

BEGIN;

ALTER TABLE public.hod_analysis_cache
  DROP CONSTRAINT IF EXISTS hod_analysis_cache_period_type_check;

ALTER TABLE public.hod_analysis_cache
  ADD CONSTRAINT hod_analysis_cache_period_type_check
  CHECK (period_type IN (
    'report',
    'day',
    'week',
    'month',
    'trend_alert',
    'daily_brief',
    'weekly_brief'
  ));

COMMIT;
