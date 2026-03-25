-- v2: Authentication system
-- Run against: inidzwfjnkyinxhvbrdt (shared Supabase project)

create extension if not exists pgcrypto;

-- =============================================================================
-- Users table
-- =============================================================================

create table if not exists hod_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  department_id uuid references hod_departments(id),
  hod_name text not null,
  role text not null default 'hod',
  auto_logout_enabled boolean not null default true,
  logout_time text not null default '18:00',
  idle_timeout_minutes integer not null default 30,
  created_at timestamptz not null default now(),
  constraint hod_users_role_check check (role in ('hod', 'admin'))
);

-- =============================================================================
-- Sessions table
-- =============================================================================

create table if not exists hod_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references hod_users(id) on delete cascade,
  token text unique not null,
  device_info jsonb,
  ip_address text,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists hod_sessions_token_idx on hod_sessions(token);
create index if not exists hod_sessions_user_id_idx on hod_sessions(user_id);
create index if not exists hod_sessions_expires_at_idx on hod_sessions(expires_at);

-- =============================================================================
-- Activity log
-- =============================================================================

create table if not exists hod_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references hod_users(id),
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists hod_activity_log_user_id_idx on hod_activity_log(user_id);
create index if not exists hod_activity_log_created_at_idx on hod_activity_log(created_at desc);

-- =============================================================================
-- Add submitted_by_user_id to daily reports (nullable for legacy v1.x reports)
-- =============================================================================

alter table hod_daily_reports
  add column if not exists submitted_by_user_id uuid references hod_users(id);

-- =============================================================================
-- RLS — no public access (service role only)
-- =============================================================================

alter table hod_users enable row level security;
alter table hod_sessions enable row level security;
alter table hod_activity_log enable row level security;

-- =============================================================================
-- Seed users
-- Password: ziwa2026 for all (Joshua will change them)
-- =============================================================================

insert into hod_users (username, password_hash, department_id, hod_name, role, auto_logout_enabled) values
  -- Primary HODs
  ('maingate.jjuko',       crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'main-gate'),           'Jjuko',     'hod',   true),
  ('reception.emilly',     crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'hq-reception'),         'Emilly',    'hod',   true),
  ('fnb.howard',           crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'food-and-beverage'),    'Howard',    'hod',   true),
  ('kitchen.sensio',       crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'kitchen'),              'Sensio',    'hod',   true),
  ('housekeeping.elly',    crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'housekeeping'),         'Elly',      'hod',   true),
  ('security.salim',       crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'security'),             'Salim',     'hod',   true),
  ('store.denis',          crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'store'),                'Denis',     'hod',   true),
  ('accounts.musoni',      crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'accounts'),             'Musoni',    'hod',   true),
  ('electrical.robert',    crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'electrical'),           'Robert',    'hod',   true),
  ('maintenance.david',    crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'hq-maintenance'),       'David',     'hod',   true),
  ('drivers.kanja',        crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'drivers-and-mechanics'),'Kanja',     'hod',   true),
  ('drivers.roger',        crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'drivers-and-mechanics'),'Roger',     'hod',   true),
  ('plumbing.richard',     crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'plumbing'),             'Richard',   'hod',   true),
  ('it.benson',            crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'it'),                   'Benson',    'hod',   true),
  ('wildlife.martine',     crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'wildlife'),             'Martine',   'hod',   false),
  ('craftshop.halima',     crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'craft-shop'),           'Halima',    'hod',   true),
  -- Substitutes (not already HODs elsewhere)
  ('reception.patience',   crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'hq-reception'),         'Patience',  'hod',   true),
  ('fnb.oscar',            crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'food-and-beverage'),    'Oscar',     'hod',   true),
  ('kitchen.safari',       crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'kitchen'),              'Safari',    'hod',   true),
  ('kitchen.felly',        crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'kitchen'),              'Felly',     'hod',   true),
  ('kitchen.lawrence',     crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'kitchen'),              'Lawrence',  'hod',   true),
  ('kitchen.koffi',        crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'kitchen'),              'Koffi',     'hod',   true),
  ('housekeeping.anita',   crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'housekeeping'),         'Anita',     'hod',   true),
  ('security.elia',        crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'security'),             'Elia',      'hod',   true),
  ('electrical.sekito',    crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'electrical'),           'Sekito',    'hod',   true),
  ('maintenance.francis',  crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'hq-maintenance'),       'Francis',   'hod',   true),
  ('plumbing.jonah',       crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'plumbing'),             'Jonah',     'hod',   true),
  -- Admin
  ('admin.joshua',         crypt('ziwa2026', gen_salt('bf')), null,                                                                 'Joshua',    'admin', true)
on conflict (username) do nothing;
