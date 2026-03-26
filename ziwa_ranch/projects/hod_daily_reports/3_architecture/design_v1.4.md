# v1.4 — Technical Design

> **What this document covers:** All changes from v1.2 to v1.4 — form overhauls, draft/autosave, stock projection, late submission timing, field transfers, and item harvesting. This is the build blueprint.

---

## 1. Global Draft/Autosave

**Approach:** Client-side only via `localStorage`. No database changes.

**Key format:** `draft-{slug}-{reportDate}` — one draft per department per date.

**Stored payload:**
```json
{
  "values": { ... },
  "submittedBy": "Howard",
  "nameSelection": "Howard",
  "customName": "",
  "savedAt": "2026-03-15T14:30:00Z"
}
```

**Behaviour:**
- On field change: debounce-save full form state to localStorage (2-second delay)
- On form load: check for matching draft, restore if found
- On successful submission: clear draft for that key
- On page load: clean drafts older than 7 days
- Visual: subtle "Draft saved" text appears below the submit button after each save

**Files changed:**
- `components/FormRenderer.tsx` — draft load/save/clear hooks

---

## 2. F&B Form Overhaul (Howard)

### 2a. Remove Service Observations
Delete the entire "Service Observations" section from the `food-and-beverage` config.

### 2b. Dish specificity
Replace breakfast, lunch, and dinner `textarea` dish fields with `repeater` fields:

```typescript
{
  name: 'breakfast_dishes',
  label: 'Dishes served',
  type: 'repeater',
  min_rows: 0,
  sub_fields: [
    { name: 'dish', label: 'Dish name', type: 'text', placeholder: 'e.g. Eggs Benedict, Pancakes, Fresh fruit platter' },
    { name: 'quantity', label: 'Qty', type: 'number' },
  ],
}
```

Lunch dishes get a la carte examples: "e.g. Grilled chicken, Chicken Maryland, Tilapia fillet".
Dinner dishes get evening examples: "e.g. Beef stew, Grilled tilapia, Vegetable curry".

Rename lunch field from `lunch_notes` to `lunch_dishes` for consistency.

### 2c. Beverage Sales section
New section after Dinner, before Notes:

```typescript
{
  title: 'Beverage Sales',
  fields: [
    {
      name: 'beverage_sales',
      label: 'Beverages sold today',
      type: 'repeater',
      min_rows: 0,
      sub_fields: [
        { name: 'beverage', label: 'Beverage name', type: 'text', placeholder: 'e.g. Tusker, Bell, Nile Special, Soda' },
        { name: 'quantity_sold', label: 'Qty sold', type: 'number' },
      ],
    },
  ],
}
```

### 2d. Weekly bar stock

**Monday form:** Replaces old opening/closing bar stock textareas with a structured stock count repeater.

```typescript
{
  title: 'Bar Stock Count (Monday)',
  fields: [
    {
      name: 'bar_stock_count',
      label: 'Full bar stock count',
      type: 'repeater',
      min_rows: 1,
      sub_fields: [
        { name: 'item', label: 'Item', type: 'text', placeholder: 'e.g. Tusker Lager' },
        { name: 'quantity', label: 'Qty', type: 'number' },
        { name: 'unit', label: 'Unit', type: 'text', placeholder: 'e.g. bottles, crates' },
      ],
    },
  ],
}
```

**Tuesday–Sunday:** A read-only projected stock panel at the top of the form.

**Dual-write:** On Monday submissions, bar_stock_count is also written to `hod_verified_stock` table.

**Projection calculation:** `Monday verified stock - cumulative beverage_sales from daily reports since Monday`.

---

## 3. Store Form Overhaul (Denis)

### Remove
- Opening/closing stock textareas
- GRN report textarea
- Old purchases and stock_taken/stock_added repeaters

### Monday: Store Stock Count
Same pattern as F&B but `stock_type = 'store'`:

```typescript
{
  title: 'Store Stock Count (Monday)',
  fields: [
    {
      name: 'store_stock_count',
      label: 'Full store stock count',
      type: 'repeater',
      min_rows: 1,
      sub_fields: [
        { name: 'item', label: 'Item', type: 'text', placeholder: 'e.g. Rice 25kg, Cooking oil 5L' },
        { name: 'quantity', label: 'Qty', type: 'number' },
        { name: 'unit', label: 'Unit', type: 'text', placeholder: 'e.g. bags, litres, kg' },
      ],
    },
  ],
}
```

### Daily: Goods In / Goods Out
```typescript
// Goods Added to Store
{
  name: 'goods_added',
  label: 'Goods received into store',
  type: 'repeater',
  min_rows: 0,
  sub_fields: [
    { name: 'item', label: 'Item name', type: 'text', placeholder: 'e.g. Rice, Sugar, Cooking oil' },
    { name: 'supplier', label: 'Supplier', type: 'text', placeholder: 'e.g. Nakumatt, Local market' },
    { name: 'quantity', label: 'Qty', type: 'number' },
    { name: 'price_per_unit', label: 'Price per unit (UGX)', type: 'number' },
  ],
}

// Goods Taken from Store
{
  name: 'goods_taken',
  label: 'Goods issued from store',
  type: 'repeater',
  min_rows: 0,
  sub_fields: [
    { name: 'item', label: 'Item name', type: 'text', placeholder: 'e.g. Rice, Cooking oil' },
    { name: 'quantity', label: 'Qty', type: 'number' },
    { name: 'taken_by', label: 'Taken by / Department', type: 'text', placeholder: 'e.g. Kitchen, Housekeeping' },
  ],
}
```

### Projection
`Monday verified stock + cumulative goods_added - cumulative goods_taken`.

---

## 4. Accounts / Main Gate Field Transfer

**Accounts:** Remove `mobile_money_start` and `mobile_money_end` from both the "Start of Day" and "End of Day" sections.

**Main Gate:** Add new section "Mobile Money Balance" with:
- `mobile_money_start` — "Opening balance (UGX)", number, required
- `mobile_money_end` — "Closing balance (UGX)", number, required

**Accounts receivables:** Update placeholder to "Money received from Captain/Nana or other sources (UGX)" pending Wellington confirmation.

---

## 5. Late Submission Timing

**Old rule:** Late if `submitted_at` date > `report_date`.

**New rule (three tiers, EAT timezone UTC+3):**

| Submitted by | Status |
|---|---|
| Before 12:00 EAT next day | On time |
| 12:00–15:00 EAT next day | Warning |
| After 15:00 EAT next day | Late |

**Implementation:**

New utility `lib/submission-status.ts`:
```typescript
type SubmissionStatus = 'on_time' | 'warning' | 'late'

function getSubmissionStatus(submittedAt: string, reportDate: string): SubmissionStatus
```

Calculates deadline thresholds by constructing `reportDate + 1 day` at 12:00 and 15:00 in EAT (UTC+3), then comparing against `submittedAt`.

Used in: FormRenderer (pre-submit warning), dashboard overview, reports list, report detail.

---

## 6. Silent Item Name Harvesting

**New table: `hod_item_library`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| department_id | uuid FK → hod_departments | |
| category | text | "dish", "beverage", "store_goods", "vehicle", "materials" |
| item_name | text | Normalised (trimmed, lowercase) |
| occurrence_count | integer | default 1 |
| first_seen | date | |
| last_seen | date | |

Unique constraint on `(department_id, category, item_name)`.

**Harvest mapping:**

| Department | Fields harvested | Category |
|---|---|---|
| Food & Beverage | breakfast_dishes, lunch_dishes, dinner_dishes → `dish` sub-field | dish |
| Food & Beverage | beverage_sales → `beverage` sub-field | beverage |
| Store | goods_added, goods_taken → `item` sub-field | store_goods |
| Drivers & Mechanics | vehicle_usage → `plate` sub-field | vehicle |
| HQ Maintenance | work_done → `materials_used` sub-field | materials |

**API route:** `POST /api/harvest-items` — accepts `{ reportId }`, reads report, extracts items, upserts.

**Trigger:** Called fire-and-forget from FormRenderer after successful submission.

---

## Database Changes

### New table: `hod_verified_stock`
Migration: `002_verified_stock.sql`

```sql
create table if not exists hod_verified_stock (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references hod_departments(id),
  stock_type text not null,
  entry_date date not null,
  items jsonb not null default '[]',
  entered_by text not null,
  created_at timestamptz not null default now()
);
```

Indexes on `(department_id, stock_type, entry_date)`.
RLS: anon insert, authenticated read.

### New table: `hod_item_library`
Migration: `003_item_library.sql`

```sql
create table if not exists hod_item_library (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references hod_departments(id),
  category text not null,
  item_name text not null,
  occurrence_count integer not null default 1,
  first_seen date not null default current_date,
  last_seen date not null default current_date
);
```

Unique constraint on `(department_id, category, item_name)`.
RLS: anon insert/update, authenticated read.

---

## API Routes

### `GET /api/stock-projection/[slug]?date=YYYY-MM-DD`

1. Look up department by slug
2. Find most recent `hod_verified_stock` entry for that department where `entry_date <= date`
3. Fetch all `hod_daily_reports` for that department from `entry_date` to `date`
4. For bar: subtract cumulative `beverage_sales` from verified stock
5. For store: add cumulative `goods_added`, subtract cumulative `goods_taken`
6. Return projected items array

### `POST /api/harvest-items`

1. Accept `{ reportId }`
2. Read the report + department slug
3. Match slug to harvest config
4. Extract item names from repeater fields
5. Upsert each item into `hod_item_library`

---

*This design covers Phase 1 v1.4 only. Written 15 March 2026.*
