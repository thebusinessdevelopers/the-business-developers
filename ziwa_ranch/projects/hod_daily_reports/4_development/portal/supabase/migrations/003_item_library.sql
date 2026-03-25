-- v1.4: Item name library — harvested silently from report submissions.
-- Powers future autocomplete in v1.6. No UI reads this yet.

create table if not exists hod_item_library (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references hod_departments(id),
  category text not null,
  item_name text not null,
  occurrence_count integer not null default 1,
  first_seen date not null default current_date,
  last_seen date not null default current_date
);

create unique index if not exists hod_item_library_unique_idx
  on hod_item_library(department_id, category, item_name);

create index if not exists hod_item_library_category_idx
  on hod_item_library(department_id, category);

alter table hod_item_library enable row level security;

create policy "Anyone can upsert items"
  on hod_item_library for insert
  with check (true);

create policy "Anyone can update item counts"
  on hod_item_library for update
  using (true);

create policy "Authenticated users can read item library"
  on hod_item_library for select
  using (auth.role() = 'authenticated');
