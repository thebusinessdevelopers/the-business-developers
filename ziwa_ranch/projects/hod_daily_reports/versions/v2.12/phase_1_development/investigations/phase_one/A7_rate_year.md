# A-07 — Year dimension for accommodation rates: investigation

**Item:** A-07 (Track A)  
**Investigator:** Chat 1 parent agent  
**Date:** 20 Apr 2026  
**Status:** final

---

## Question

Does `accommodation_rates` already support a year dimension, and if so, how is the booking form selecting the correct year?

---

## Evidence

### Schema

```
accommodation_rates columns:
  id            uuid
  rate_category text
  meal_plan     text
  rate_type     text   ('rack' | 'sto')
  year          integer   ← ALREADY EXISTS
  adult_rate    numeric
  child_rate    numeric
  notes         text
```

### Row count by year

- 2026: 46 rows (most categories populated; see A6_rate_audit.md for gaps)
- 2027: 52 rows (includes A-Frame rates)

### Booking table

`bookings.year` column exists (integer) — already stores the booking's pricing year.

### Booking form code — `BookingForm.tsx`

```typescript
const suggestedRate = calculateItemRate(newItem, rates, f.rate_type, yr)
```

`yr` comes from `new Date(f.check_in).getFullYear()` — so the rate is already year-aware at the suggestion layer.

---

## Finding

The **schema work for A-07 is already done.** The `year` column exists, 2026 and 2027 are populated (with gaps and discrepancies flagged in A6_rate_audit.md), and the booking form selects rates based on check-in year.

What is actually required for A-07:

1. **Data correctness** — resolve the A6 discrepancies (superior_double_twin missing, single_room missing, A-Frame 2026 missing, 2027 chalet rates decision).
2. **Admin rates UI year toggle** — confirm the `admin-portal/app/api/accommodation/rates/route.ts` surface exposes year so admins can see which year's rates they are editing. (Investigate in Chat 3.)

No DDL migration needed. A-07 should be re-scoped from "add year dimension" to "audit 2026/2027 data + expose year in admin rates UI".

---

## Confirmed rescoping (all A-06 decisions resolved, 20 Apr 2026)

Replace A-07's "add year dimension" DDL work with:

- **A-07a** — Backfill missing 2026 rates: A-Frame (6 rows = copy 2027), `superior_double_twin` (4 rows). `single_room` out of scope — no category needed.
- **A-07b** — Correct 2027 data: revert `superior_family` and `superior_executive` to 2026 values (all 8 rows); correct camping 2027 STO from $25 to $30; `superior_double_twin` 2027 same as 2026 (inserted together in A-07a).
- **A-07c** — Admin rates UI must display year filter clearly; investigate exact implementation in Chat 3 (`admin-portal/app/api/accommodation/rates/route.ts`).

---

## File index

- DB table: `public.accommodation_rates`
- DB column: `accommodation_rates.year` (integer, already exists)
- Booking form: `4_development/admin-portal/app/accommodation/BookingForm.tsx` (line 174 — `calculateItemRate(..., yr)`)
- Rate helper: `4_development/packages/shared/config/accommodation.ts`
- Admin rates API: `4_development/admin-portal/app/api/accommodation/rates/route.ts`
