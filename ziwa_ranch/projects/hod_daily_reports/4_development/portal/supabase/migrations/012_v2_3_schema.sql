-- v2.3: Admin accounts, Head Office department
-- Run against: inidzwfjnkyinxhvbrdt (shared Supabase project)

-- =============================================================================
-- Admin tier and title columns on hod_users
-- =============================================================================

alter table hod_users
  add column if not exists admin_tier text default null,
  add column if not exists admin_title text default null;

alter table hod_users
  add constraint hod_users_admin_tier_check
    check (admin_tier in ('senior', 'standard') or admin_tier is null);

-- =============================================================================
-- Update existing admin.joshua → senior tier
-- =============================================================================

update hod_users
set admin_tier = 'senior', admin_title = 'Project Admin'
where username = 'admin.joshua';

-- =============================================================================
-- Insert admin accounts
-- =============================================================================

insert into hod_users (username, password_hash, department_id, hod_name, role, auto_logout_enabled, admin_tier, admin_title) values
  ('admin.md',        crypt('ziwa2026', gen_salt('bf')), null, 'MD',        'admin', true, 'senior',   'Managing Director'),
  ('admin.ceo',       crypt('ziwa2026', gen_salt('bf')), null, 'CEO',       'admin', true, 'senior',   'Chief Executive Officer'),
  ('admin.chairman',  crypt('ziwa2026', gen_salt('bf')), null, 'Chairman',  'admin', true, 'senior',   'Chairman'),
  ('admin.gm',        crypt('ziwa2026', gen_salt('bf')), null, 'GM',        'admin', true, 'standard', 'General Manager'),
  ('admin.isaac',     crypt('ziwa2026', gen_salt('bf')), null, 'Isaac',     'admin', true, 'standard', 'Head Office Manager'),
  ('admin.wycliffe',  crypt('ziwa2026', gen_salt('bf')), null, 'Wycliffe',  'admin', true, 'standard', 'Staff Manager')
on conflict (username) do nothing;

-- =============================================================================
-- Head Office department
-- =============================================================================

insert into hod_departments (name, slug, hods, sort_order, is_active) values
  ('Head Office', 'head-office', array['Florence'], 16, true)
on conflict (slug) do nothing;

-- =============================================================================
-- Head Office user accounts
-- =============================================================================

insert into hod_users (username, password_hash, department_id, hod_name, role, auto_logout_enabled) values
  ('headoffice.florence', crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'head-office'), 'Florence', 'hod', true),
  ('headoffice.julie',    crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'head-office'), 'Julie',    'hod', true),
  ('headoffice.isaac',    crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'head-office'), 'Isaac',    'hod', true)
on conflict (username) do nothing;
