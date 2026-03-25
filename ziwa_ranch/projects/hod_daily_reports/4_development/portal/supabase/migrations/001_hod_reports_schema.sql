-- HOD Daily Reports — Initial Schema
-- Run against: inidzwfjnkyinxhvbrdt (shared Supabase project)
-- These tables are separate from the restaurant management system tables.

-- Departments
create table if not exists hod_departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  hods text[] not null default '{}',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Daily reports (one row per submission)
create table if not exists hod_daily_reports (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references hod_departments(id),
  submitted_by text not null,
  report_date date not null default current_date,
  submitted_at timestamptz not null default now(),
  report_data jsonb not null default '{}'
);

-- Indexes
create index if not exists hod_daily_reports_department_id_idx on hod_daily_reports(department_id);
create index if not exists hod_daily_reports_report_date_idx on hod_daily_reports(report_date);
create index if not exists hod_daily_reports_submitted_by_idx on hod_daily_reports(submitted_by);

-- RLS
alter table hod_departments enable row level security;
alter table hod_daily_reports enable row level security;

-- Departments: anyone can read (needed to populate the landing page)
create policy "Public can read departments"
  on hod_departments for select
  using (true);

-- Daily reports: anyone can insert (HODs submit without accounts)
create policy "Anyone can submit a report"
  on hod_daily_reports for insert
  with check (true);

-- Daily reports: only authenticated users can read (management access — dashboard in a later phase)
create policy "Authenticated users can read reports"
  on hod_daily_reports for select
  using (auth.role() = 'authenticated');

-- Seed departments (12 active + IT as coming soon)
insert into hod_departments (name, slug, hods, sort_order, is_active) values
  ('Main Gate',          'main-gate',          array['Jjuko'],           1,  true),
  ('HQ Reception',       'hq-reception',       array['Emilly'],          2,  true),
  ('Food & Beverage',    'food-and-beverage',  array['Howard'],          3,  true),
  ('Kitchen',            'kitchen',            array['Sensio'],          4,  true),
  ('Housekeeping',       'housekeeping',       array['Elly'],            5,  true),
  ('Security',           'security',           array['Salim'],           6,  true),
  ('Store',              'store',              array['Denis'],           7,  true),
  ('Finance',            'finance',            array['Musoni'],          8,  true),
  ('Electrical',         'electrical',         array['Robert'],          9,  true),
  ('HQ Maintenance',     'hq-maintenance',     array['David'],           10, true),
  ('Vehicle Maintenance','vehicle-maintenance', array['Kanja', 'Roger'], 11, true),
  ('Plumbing',           'plumbing',           array['Richard'],         12, true),
  ('IT',                 'it',                 array['Benson'],          13, false)
on conflict (slug) do nothing;
