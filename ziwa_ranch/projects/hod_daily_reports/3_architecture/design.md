# Phase 1 — Technical Design

> **What this document covers:** How the web portal works, how data is stored, and how all the pieces connect. This is the blueprint for the build.

---

## System overview

Three components, all simple:

```
[HOD on phone/computer] → [Next.js site on Vercel] → [Supabase database]
```

The HOD visits a URL, picks their department and name, fills in their department's form, and submits. The frontend sends the data directly to Supabase. No backend server, no API layer, no middleware. The Supabase JS client handles everything from the browser.

---

## Database design (Supabase)

### Table: `departments`

Stores the 13 departments and their HODs.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid (PK) | Unique identifier |
| `name` | text | Display name (e.g. "Food & Beverage") |
| `slug` | text (unique) | URL-safe identifier (e.g. "food-and-beverage") |
| `hods` | text[] | Array of HOD names for this department (e.g. `["Kanja", "Roger"]`) |
| `sort_order` | integer | Controls display order on the landing page |
| `is_active` | boolean | Whether the department appears on the portal (default true) |

### Table: `daily_reports`

One row per report submission.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid (PK) | Unique identifier |
| `department_id` | uuid (FK → departments) | Which department |
| `submitted_by` | text | Name of the HOD who submitted |
| `report_date` | date | The date the report covers (defaults to today) |
| `submitted_at` | timestamptz | When the form was actually submitted |
| `report_data` | jsonb | The form fields and values — different structure per department |

### Why JSONB for report data

Each department has a completely different form. Finance reports balances and payments. Security reports gate checks and unregistered people. Kitchen reports stock levels. Rather than creating 13 different tables (or one massive table with mostly-null columns), a single `report_data` JSONB column stores whatever that department's form produces.

This also means adding new fields to a department's form, or adding Benson's IT template later, requires zero database changes — just a frontend update.

### Row-Level Security (RLS)

Phase 1 uses the Supabase anon key (public). RLS policies:

- **INSERT on `daily_reports`:** Allow all (anon can submit reports)
- **SELECT on `departments`:** Allow all (anon can read department list)
- **SELECT on `daily_reports`:** Restricted — only authenticated users can read reports (for when a dashboard is built later)
- **All other operations:** Denied

This means anyone with the link can submit a report (by design — low barrier), but reading back report data requires authentication (protects sensitive information like finance balances).

---

## Frontend design (Next.js on Vercel)

### Pages

**`/` — Landing page**
- Ziwa Ranch branding at the top
- Grid or list of all active departments
- Each department is a card/button showing the department name
- Tapping a department goes to its form

**`/report/[slug]` — Department report form**
- Department name as heading
- HOD name selector (dropdown if multiple HODs, auto-filled if just one)
- Report date (defaults to today, can be changed for late submissions)
- The form fields specific to that department
- Submit button
- On success: confirmation message with option to submit another

### Form architecture

Forms are **config-driven**. A single form renderer component reads a config object that defines the fields for each department. This means:

- One reusable component handles all 13 departments
- Adding or changing fields means editing a config, not rewriting components
- Benson's IT template can be added by adding one config entry

### Field types needed

| Type | Used for | Example |
|---|---|---|
| `text` | Short answers | "Area patrolled" |
| `textarea` | Longer descriptions | "Challenges or successes to note" |
| `number` | Counts and amounts | "How many pax signed in", balances |
| `repeater` | Lists of items with sub-fields | "Payments made today" (to whom, for what, how much) |
| `select` | Predefined options | Entry reasons at Main Gate |
| `checkbox_group` | Multiple selections | Vehicle check items (starts, runs, drives, oil, etc.) |

### Form config example (Finance)

```json
{
  "slug": "finance",
  "sections": [
    {
      "title": "Balances at start of day",
      "fields": [
        { "name": "petty_cash_start", "label": "Petty cash", "type": "number", "required": true },
        { "name": "mobile_money_start", "label": "Mobile Money", "type": "number", "required": true }
      ]
    },
    {
      "title": "Balances at end of day",
      "fields": [
        { "name": "petty_cash_end", "label": "Petty cash", "type": "number", "required": true },
        { "name": "mobile_money_end", "label": "Mobile Money", "type": "number", "required": true }
      ]
    },
    {
      "title": "Payments made today",
      "fields": [
        {
          "name": "payments",
          "type": "repeater",
          "sub_fields": [
            { "name": "to_whom", "label": "To whom", "type": "text" },
            { "name": "for_what", "label": "For what", "type": "text" },
            { "name": "amount", "label": "How much (UGX)", "type": "number" }
          ]
        }
      ]
    },
    {
      "title": "Notes",
      "fields": [
        { "name": "challenges_successes", "label": "Challenges or successes to note", "type": "textarea" }
      ]
    }
  ]
}
```

The full config for all 13 departments lives in the codebase as a single file.

---

## Data flow

1. HOD opens the site → Next.js serves the landing page with departments fetched from Supabase
2. HOD taps their department → routed to `/report/[slug]`, form config loaded for that department
3. HOD selects name, fills in form, presses submit
4. Frontend validates required fields client-side
5. Frontend calls `supabase.from('daily_reports').insert(...)` with:
   - `department_id` from the selected department
   - `submitted_by` from the name selector
   - `report_date` from the date field
   - `report_data` as JSONB containing all form values
6. Supabase stores the row
7. Frontend shows success confirmation

---

## What Phase 1 does NOT include

Deliberately excluded to keep scope tight:

- No user authentication (passwords, accounts)
- No dashboard or reporting views
- No notifications (email, WhatsApp, push)
- No data validation beyond required field checks
- No edit/delete of submitted reports
- No offline support
- No IT department form (pending Benson consultation)

All of these are either Phase 2+ features or quick additions once Phase 1 is live.

---

*This design document covers Phase 1 only. Phases 2–4 will have their own design documents when the time comes.*
