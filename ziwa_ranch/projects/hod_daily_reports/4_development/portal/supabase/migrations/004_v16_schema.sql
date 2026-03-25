-- v1.6: Report editing, duplicate guard, acknowledgement, stock reconciliation
-- Run against: inidzwfjnkyinxhvbrdt (shared Supabase project)

-- =============================================================================
-- hod_daily_reports — new columns
-- =============================================================================

-- Edit tracking
alter table hod_daily_reports add column if not exists edited_at timestamptz;
alter table hod_daily_reports add column if not exists last_edited_by text;
alter table hod_daily_reports add column if not exists edit_history jsonb not null default '[]';

-- Report acknowledgement
alter table hod_daily_reports add column if not exists acknowledged_at timestamptz;
alter table hod_daily_reports add column if not exists acknowledged_by text;

-- Duplicate submission guard: unique constraint on (department_id, report_date)
-- IMPORTANT: Before running, check for existing duplicates:
--   SELECT department_id, report_date, count(*)
--   FROM hod_daily_reports
--   GROUP BY department_id, report_date
--   HAVING count(*) > 1;
-- If duplicates exist, manually resolve them before applying this constraint.
create unique index if not exists hod_daily_reports_dept_date_unique
  on hod_daily_reports(department_id, report_date);

-- RLS: allow anon updates (HODs edit their own reports via client)
create policy "Anyone can update reports"
  on hod_daily_reports for update
  using (true)
  with check (true);

-- =============================================================================
-- hod_verified_stock — reconciliation columns
-- =============================================================================

alter table hod_verified_stock add column if not exists status text not null default 'pending';
alter table hod_verified_stock add column if not exists admin_notes text;

-- RLS: allow updates to verified stock (admin approves/flags)
create policy "Anyone can update verified stock"
  on hod_verified_stock for update
  using (true)
  with check (true);

-- =============================================================================
-- hod_departments — add replacement HOD names
-- =============================================================================

UPDATE hod_departments SET hods = array['Emilly', 'Patience'] WHERE slug = 'hq-reception';
UPDATE hod_departments SET hods = array['Howard', 'Oscar'] WHERE slug = 'food-and-beverage';
UPDATE hod_departments SET hods = array['Sensio', 'Richard'] WHERE slug = 'kitchen';
UPDATE hod_departments SET hods = array['Salim', 'Elia'] WHERE slug = 'security';
UPDATE hod_departments SET hods = array['Denis', 'Emilly'] WHERE slug = 'store';
UPDATE hod_departments SET hods = array['Musoni', 'Halima'] WHERE slug = 'accounts';
UPDATE hod_departments SET hods = array['Robert', 'Sekito'] WHERE slug = 'electrical';
UPDATE hod_departments SET hods = array['David', 'Francis'] WHERE slug = 'hq-maintenance';
UPDATE hod_departments SET hods = array['Richard', 'Jonah'] WHERE slug = 'plumbing';
UPDATE hod_departments SET hods = array['Halima', 'Patience'] WHERE slug = 'craft-shop';

-- RLS: allow reads of item library from anon (needed for autocomplete)
create policy "Anyone can read item library"
  on hod_item_library for select
  using (true);
