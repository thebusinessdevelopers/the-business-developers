-- Phase E: Department announcements

create table if not exists hod_announcements (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references hod_departments(id),
  title text not null,
  body text not null,
  priority text not null default 'normal' check (priority in ('normal', 'important', 'urgent')),
  active boolean not null default true,
  created_by text not null default 'Admin',
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists idx_announcements_dept on hod_announcements(department_id) where active = true;

alter table hod_announcements enable row level security;

-- NULL department_id = announcement for all departments
