# A-03 / A-04 — Augustus pricing + pax config: investigation

**Items:** A-03 (per-person pricing modular) and A-04 (triple-pax error)  
**Investigator:** Chat 1 parent agent  
**Date:** 20 Apr 2026  
**Status:** final

---

## Naming note

The unit is stored in DB as **`Augustu`** — this is the correct, intentional name (confirmed Joshua, 20 Apr 2026), not a typo. All migrations and code references must use `name = 'Augustu'` exactly. Do not rename.

---

## A-04 — Pax config

### DB state

```
name    | category | capacity | rate_category | pax_config
Augustu | family   | 5        | family_room   | {"beds":[{"type":"double","count":2}],"max_total":5,"max_adults":2,"cot_eligible":true,"max_children":3}
```

**Confirmed:** `max_adults = 2`. Attempting to add 3 adults fails. This matches the v2.11 note in the backlog: the earlier fix for children inadvertently capped adults at 2.

### Required configuration (per backlog)

A triple room must accept:
- Up to **3 adults** (pure triple); or
- 2 adults + 1–3 children (family mode).

Proposed `pax_config`:

```json
{
  "beds": [{"type":"double","count":2}],
  "max_total": 5,
  "max_adults": 3,
  "cot_eligible": true,
  "max_children": 3
}
```

The rule `adults + children ≤ max_total` continues to prevent absurd combinations (e.g. 3 adults + 3 children = 6 > 5).

---

## A-03 — Per-person pricing

### DB state

- `accommodation_units` schema contains columns: `id, name, building, category, capacity, rate_category, description, status, sort_order, pax_config, max_concurrent_bookings, created_at` — **no `pricing_type` column exists.**
- Code-wide search for `pricing_type`, `per_person`, `perPerson` returns **zero matches** in source. Feature does not exist.

### Current rate for Augustus

The unit uses `rate_category = 'family_room'`. The 2026 `family_room` BB rate is adult $65 / child $35 **per person**. But the existing booking-total calc multiplies `rate_per_night × nights` with `rate_per_night` defaulted to `adult_rate` — effectively flat per-room — hence Salim-style confusion is not the issue here; the $65 shows up as a flat total because the rate-suggestion helper fills `rate_per_night` with the adult_rate alone.

### Required schema change

Add a new column to `accommodation_units`:

```sql
ALTER TABLE accommodation_units
  ADD COLUMN pricing_type text NOT NULL DEFAULT 'flat'
  CHECK (pricing_type IN ('flat','per_person'));

UPDATE accommodation_units SET pricing_type = 'per_person' WHERE name = 'Augustu';
```

### Booking-form logic change

In `BookingForm.tsx` → `calculateItemRate` (in `@hod/shared/config/accommodation`):

- When the chosen unit's `pricing_type = 'per_person'`, total per night for that room = `adults × adult_rate + children × child_rate` (pulling both values from `accommodation_rates` for the unit's `rate_category` / `meal_plan` / `rate_type` / `year`).
- When `flat` (default), existing behaviour is preserved.

`family_room` already has `child_rate` populated for all meal plans in `accommodation_rates` — no rates work needed.

---

## Finding

- A-04 requires a one-line `pax_config` migration targeting `name = 'Augustu'`. Name is correct as-is — no rename.
- A-03 requires DDL (new column) + seed (set Augustu to `per_person`) + a branch in the rate-calculation helper.
- Both should be implemented together in one migration + one code change because they affect the same booking form for the same unit.

---

## File index

- DB table: `public.accommodation_units`
- Rate-calc helper: `4_development/packages/shared/config/accommodation.ts` (function `calculateItemRate`)
- Booking form: `4_development/admin-portal/app/accommodation/BookingForm.tsx`
- Existing pax migration reference: `4_development/portal/supabase/migrations/025_room_pax_config.sql`
