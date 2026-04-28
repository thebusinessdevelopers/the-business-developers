# A-03 / A-04 — Implementation context: Augustu pricing + pax

## Item summary

A-03 adds a `pricing_type` column to `accommodation_units` (default `flat`), sets Augustu to `per_person`, and threads per-person nightly maths through the shared rate helpers and the booking basket. A-04 is a single-row jsonb merge that raises Augustu's `max_adults` from 2 to 3 whilst preserving the rest of the `pax_config` object.

## Files to change

| File | What changes | Function / type name |
|------|--------------|----------------------|
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/0NN_v212_augustu.sql` | New migration: A-03 `ALTER` + `CHECK` + `UPDATE` for Augustu `pricing_type`; A-04 `pax_config` jsonb merge | — |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/types/index.ts` | Add `pricing_type: 'flat' \| 'per_person'` to `AccommodationUnit`; optionally export `PricingType` alias; likely mirror on `RoomBasketItem` so the basket can branch without an extra fetch | `AccommodationUnit` (344–356), `RoomBasketItem` (408–417) |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/config/accommodation.ts` | Insert per-person branch: when `pricing_type === 'per_person'`, nightly = `adults * adult_rate + children * child_rate`; apply in both rate-resolution helpers | `calculateItemRate` (598–623, insertion after the match-null guard at 621), `calculateBasketRate` (546–596, equivalent branch when `item.rate_per_night == null`) |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/accommodation/BookingForm.tsx` | Copy `pricing_type` onto basket rows when adding/defaulting rooms | `addRoom` (192–207), default effect (157–177), basket rebuild on edit (108–120) |
| API routes with explicit `accommodation_units (...)` column lists | Add `pricing_type` to nested unit projections so typed responses stay valid | `admin-portal/app/api/accommodation/bookings/route.ts:28`, `bookings/[id]/route.ts:12`; `portal/app/api/accommodation/route.ts:25`, `28`; `portal/.../bookings/[id]/route.ts:19` |

`admin-portal/app/accommodation/page.tsx` uses `.select('*')` (line 15) so new columns appear automatically — no change.

## DB migration required

Y — exact SQL:

```sql
-- v2.12 A-03: add pricing_type column
ALTER TABLE accommodation_units
  ADD COLUMN pricing_type text NOT NULL DEFAULT 'flat'
  CHECK (pricing_type IN ('flat','per_person'));

UPDATE accommodation_units
SET pricing_type = 'per_person'
WHERE name = 'Augustu';

-- v2.12 A-04: Augustu pax correction (max_adults 2 -> 3)
UPDATE accommodation_units
SET pax_config = pax_config || '{"max_adults": 3}'::jsonb
WHERE name = 'Augustu';
```

The `||` operator shallow-merges top-level keys, so `beds`, `max_total`, `cot_eligible`, and `max_children` are preserved unchanged.

## Dependencies

- **A-04** has no code dependency.
- **A-03** depends on nothing external but must ship with the type + rate-helper change; otherwise the DB has the flag but the form ignores it.
- Combine both into a single migration file because they both target `accommodation_units` row `Augustu`.

## Complexity

- **A-03: M** — a one-column schema addition is small, but correct per-person pricing requires aligned changes in `calculateItemRate`, `calculateBasketRate`, the basket shape, and several typed API projections.
- **A-04: XS** — data-only, one-row `UPDATE`.

## Validation steps

1. Apply migration; `SELECT name, pricing_type, pax_config FROM accommodation_units WHERE name = 'Augustu';` — `pricing_type = 'per_person'`, `pax_config->>'max_adults' = '3'`, remaining keys intact.
2. In admin booking form select Augustu with 3 adults, 0 children, check-in in 2026 — suggested `rate_per_night` equals `3 * adult_rate` for the chosen meal plan and rate type; Rooms total matches nightly × nights.
3. Add a known flat-priced room (e.g. a twin) — confirm behaviour unchanged vs baseline, nightly = single `adult_rate`.
4. Hit `/api/accommodation/bookings` — response JSON for the booking includes `pricing_type` on the nested unit.

## Evidence

- `accommodation_units` today has no `pricing_type` column; grep across `4_development/` for `pricing_type|pricingType|per_person|perPerson` returns zero matches (investigation `phase_one/A3_A4_augustus.md`).
- `calculateItemRate` at 621–622 currently returns a single `adult_rate` plus `child_rate` — the branch point for per-person maths.
- `calculateBasketRate` at 567–587 duplicates the rate match and must apply the same per-person branch when `item.rate_per_night == null`.
- Augustu DB state confirmed `max_adults: 2` (see investigation); this is the cap preventing 3-adult bookings.
