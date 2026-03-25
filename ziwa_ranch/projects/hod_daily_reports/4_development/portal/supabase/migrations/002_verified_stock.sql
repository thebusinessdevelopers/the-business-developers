-- v1.4: Weekly verified stock baselines (F&B bar stock, Store stock)
-- Used for Monday stock counts and projected stock throughout the week.

create table if not exists hod_verified_stock (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references hod_departments(id),
  stock_type text not null,
  entry_date date not null,
  items jsonb not null default '[]',
  entered_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists hod_verified_stock_lookup_idx
  on hod_verified_stock(department_id, stock_type, entry_date desc);

alter table hod_verified_stock enable row level security;

create policy "Anyone can submit verified stock"
  on hod_verified_stock for insert
  with check (true);

create policy "Authenticated users can read verified stock"
  on hod_verified_stock for select
  using (auth.role() = 'authenticated');
