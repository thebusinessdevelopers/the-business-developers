-- Phase A: Photo attachments for HOD Daily Reports

-- Storage bucket for report media
-- NOTE: Bucket must be created via Supabase dashboard or API:
--   Name: hod-report-media
--   Public: false
--   Allowed MIME types: image/jpeg, image/png, image/webp
--   File size limit: 10MB

-- Report media reference table
create table if not exists hod_report_media (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references hod_daily_reports(id) on delete cascade,
  department_id uuid not null references hod_departments(id),
  storage_path text not null,
  original_filename text not null,
  generated_filename text not null,
  hod_description text not null,
  ai_description text,
  ai_tags jsonb,
  context_category text not null,
  report_date date not null,
  file_size_bytes integer,
  mime_type text,
  uploaded_by_user_id uuid references hod_users(id),
  synced_locally boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_report_media_report on hod_report_media(report_id);
create index if not exists idx_report_media_dept_date on hod_report_media(department_id, report_date);
create index if not exists idx_report_media_unsynced on hod_report_media(synced_locally) where synced_locally = false;

alter table hod_report_media enable row level security;

-- Service-role only access (same pattern as auth tables)
-- No public policies — all access via service-role client in API routes
