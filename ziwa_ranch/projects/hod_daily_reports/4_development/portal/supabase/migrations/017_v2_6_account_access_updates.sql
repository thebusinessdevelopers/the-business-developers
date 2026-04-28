-- v2.6: Account access updates (Roy Family + Wildlife)
-- Run against: inidzwfjnkyinxhvbrdt (shared Supabase project)

-- =============================================================================
-- Add Roy Family admin account (view-only in app layer)
-- =============================================================================

insert into hod_users (
  username,
  password_hash,
  department_id,
  hod_name,
  role,
  auto_logout_enabled,
  admin_tier,
  admin_title
) values (
  'admin.royfamily',
  crypt('ziwa2026', gen_salt('bf')),
  null,
  'Roy Family',
  'admin',
  true,
  'standard',
  'Family Viewer'
)
on conflict (username) do update set
  password_hash = excluded.password_hash,
  department_id = excluded.department_id,
  hod_name = excluded.hod_name,
  role = excluded.role,
  auto_logout_enabled = excluded.auto_logout_enabled,
  admin_tier = excluded.admin_tier,
  admin_title = excluded.admin_title;

-- =============================================================================
-- Retire admin.joshua without deleting historical references
-- =============================================================================

update hod_users
set username = 'legacy.admin.joshua'
where username = 'admin.joshua'
  and not exists (
    select 1 from hod_users where username = 'legacy.admin.joshua'
  );

update hod_users
set
  password_hash = crypt(encode(gen_random_bytes(16), 'hex'), gen_salt('bf')),
  hod_name = 'Legacy Admin (disabled)',
  role = 'admin',
  admin_tier = null,
  admin_title = null
where username = 'legacy.admin.joshua';

-- =============================================================================
-- Wildlife account corrections
-- =============================================================================

update hod_users
set hod_name = 'Wycliffe'
where username in ('wildlife.wycliff', 'wildlife.wycliffe');

update hod_users
set username = 'wildlife.wycliffe'
where username = 'wildlife.wycliff'
  and not exists (
    select 1 from hod_users where username = 'wildlife.wycliffe'
  );

insert into hod_users (
  username,
  password_hash,
  department_id,
  hod_name,
  role,
  auto_logout_enabled
) values (
  'wildlife.samuel',
  crypt('ziwa2026', gen_salt('bf')),
  (select id from hod_departments where slug = 'wildlife'),
  'Samuel',
  'hod',
  true
)
on conflict (username) do update set
  department_id = excluded.department_id,
  hod_name = excluded.hod_name,
  role = excluded.role,
  auto_logout_enabled = excluded.auto_logout_enabled;
