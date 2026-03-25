-- v1.8: RLS fix, error logging, drafts table, review comments
-- Run against: inidzwfjnkyinxhvbrdt (shared Supabase project)

-- =============================================================================
-- P0 FIX: Allow anon to read reports
-- The v1.4 code added .select('id').single() after insert, which triggers
-- INSERT ... RETURNING. PostgreSQL requires RETURNING to pass SELECT RLS.
-- Without this policy, the entire insert transaction was rolled back — no data saved.
-- =============================================================================

create policy "Anyone can read reports"
  on hod_daily_reports for select
  using (true);

-- =============================================================================
-- P1: Error logging table
-- =============================================================================

create table if not exists hod_error_log (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references hod_departments(id),
  submitted_by text,
  report_date date,
  error_code text,
  error_message text not null,
  error_context jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists hod_error_log_created_at_idx on hod_error_log(created_at desc);
create index if not exists hod_error_log_department_idx on hod_error_log(department_id);

alter table hod_error_log enable row level security;

create policy "Anyone can log errors"
  on hod_error_log for insert
  with check (true);

create policy "Anyone can read error logs"
  on hod_error_log for select
  using (true);

-- =============================================================================
-- P2: Drafts table
-- =============================================================================

create table if not exists hod_drafts (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references hod_departments(id),
  draft_by text not null,
  report_date date not null,
  draft_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists hod_drafts_dept_date_user_unique
  on hod_drafts(department_id, report_date, draft_by);

alter table hod_drafts enable row level security;

create policy "Anyone can create drafts"
  on hod_drafts for insert
  with check (true);

create policy "Anyone can read drafts"
  on hod_drafts for select
  using (true);

create policy "Anyone can update drafts"
  on hod_drafts for update
  using (true)
  with check (true);

create policy "Anyone can delete drafts"
  on hod_drafts for delete
  using (true);

-- =============================================================================
-- P5: Review comments column
-- =============================================================================

alter table hod_daily_reports add column if not exists review_comments text;
