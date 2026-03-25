-- Migration: New substitute HOD accounts and password_display column
-- Applied: 2026-03-25 (already executed against production DB)

-- New substitute accounts (password: ziwa2026)
insert into hod_users (username, password_hash, department_id, hod_name, role, auto_logout_enabled) values
  ('kitchen.richard',    crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'kitchen'),       'Richard',  'hod', true),
  ('reception.carol',    crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'hq-reception'),  'Carol',    'hod', true),
  ('wildlife.wycliff',   crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'wildlife'),      'Wycliff',  'hod', true),
  ('accounts.halima',    crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'accounts'),      'Halima',   'hod', true),
  ('craftshop.patience', crypt('ziwa2026', gen_salt('bf')), (select id from hod_departments where slug = 'craft-shop'),    'Patience', 'hod', true)
on conflict (username) do nothing;

-- Password display column for admin reference
alter table hod_users add column if not exists password_display text;
update hod_users set password_display = 'ziwa2026' where password_display is null;
