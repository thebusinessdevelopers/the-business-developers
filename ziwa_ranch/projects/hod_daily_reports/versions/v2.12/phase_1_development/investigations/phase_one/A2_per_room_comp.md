# A-02 — Per-room complimentary within multi-room bookings: investigation

**Item:** A-02 (Track A)  
**Investigator:** Chat 1 parent agent (code + schema review)  
**Date:** 20 Apr 2026  
**Status:** final

---

## Question

How are multi-room bookings structured, and is there any existing field for per-room complimentary (or discount) pricing?

---

## Evidence

### DB schema — `booking_rooms` table

```
Columns:
  id            uuid
  booking_id    uuid   → bookings.id
  unit_id       uuid   → accommodation_units.id
  room_config   jsonb  (holds RoomBasketItem shape)
```

Each room inside a booking is a separate row in `booking_rooms`. 43 rows currently exist across 27 bookings — the multi-room structure is real.

### TypeScript type — `packages/shared/types/index.ts`

```408:425:ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/types/index.ts
export interface RoomBasketItem {
  unit_id: string
  unit_name: string
  rate_category: string
  adults: number
  children: number
  meal_plan: MealPlan
  rate_per_night: number | null
  notes: string
}

export interface BookingRoom {
  id: string
  booking_id: string
  unit_id: string
  room_config?: RoomBasketItem | null
  unit?: AccommodationUnit
}
```

No `is_complimentary`, `discount`, or `comp_reason` field exists on either type.

### Code-wide grep

```bash
rg "complimentary|Complimentary|is_comp" 4_development/
# → 0 matches in source code (only appears in backlog.md + older snapshot md)
```

**Confirmed: no existing complimentary feature anywhere in the codebase.**

### Booking total computation

`admin-portal/app/accommodation/BookingForm.tsx` multiplies `item.rate_per_night × nights` to compute each room's line total, then sums the basket. There is no hook for a comp flag at either the per-room or booking level.

---

## Finding

Feature is a net-new build. The cleanest way is to add a flag on the per-room config rather than a parallel table or booking-level flag, since the UX lives on the room line inside the booking.

---

## Recommended implementation shape (for Chat 3 to detail)

- Extend `RoomBasketItem` with `is_complimentary: boolean` (default `false`) and optional `comp_reason: string` (e.g. "Tour leader — Lantana Adventures").
- Per-row total calculation: when `is_complimentary`, line total is $0 regardless of `rate_per_night`.
- UI change in `BookingForm.tsx` room row: a small "Complimentary" toggle next to the rate input; when on, the rate displays as "Complimentary" and the row total shows $0.
- Booking summary / invoice view must reflect comp rows distinctly.
- Migration: not strictly required — `room_config` is jsonb so the new keys merge without DDL. Backfilling existing rows is not needed (absence == not complimentary).
- Admin-portal only; HOD portal booking views do not need the toggle (can show the final state).

---

## File index

- Type: [`4_development/packages/shared/types/index.ts`](../../../4_development/packages/shared/types/index.ts) (lines 408–460)
- Booking form (where comp toggle goes): [`4_development/admin-portal/app/accommodation/BookingForm.tsx`](../../../4_development/admin-portal/app/accommodation/BookingForm.tsx)
- Booking total calc: `BookingForm.tsx` `rateBreakdown` / `calculateItemRate` helpers
- DB table: `public.booking_rooms` — no DDL needed (jsonb extension)
