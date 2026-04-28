# A-02 — Implementation context: Per-room complimentary toggle

## Item summary

Add per-room boolean `isComplimentary` (and optional `compReason`) to the basket line so that when `true` the room contributes $0 to per-night and stay totals across both the admin and HOD booking flows, with no DDL.

## Files to change

| File | What changes | Function / type name |
|------|--------------|----------------------|
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/types/index.ts` | Add `isComplimentary: boolean` and `compReason?: string` to the basket shape; inherited transparently by `BookingRoom` and `BookingWithUnits` | `RoomBasketItem` (lines 408–417) |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/config/accommodation.ts` | Complimentary rows contribute 0 to `perNightTotal` / `grandTotal`; `calculateItemRate` should still resolve a rate but the caller ignores it when the flag is set | `calculateBasketRate` (546–596), `calculateItemRate` (598–623) |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/accommodation/BookingForm.tsx` | Toggle (+ optional reason input) next to the Rate/night input; per-row total guard; default `isComplimentary: false` in `addRoom`, `buildInitial`, and any loader that reconstructs a basket | `addRoom` (192–207), basket map (516–570), rate input (549–554), per-row `itemTotal` (517–518), `rateBreakdown` useMemo (183–186), summary display (687–693) |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/BookingManagerModal.tsx` | Mirror the admin toggle + guard so HOD-created pending bookings respect the flag | Basket row (~866+), `calculateBasketRate` call (~382) |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/bookings/route.ts` | Derive `agreed_rate_per_night` excluding complimentary line rates | POST handler (64–84) |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/bookings/approve/route.ts` | Fallback per-night sum for `roomsUsd` / `total_cost_usd` must exclude complimentary rooms | Approval handler (62–67) |

## DB migration required

N — `booking_rooms.room_config` is `jsonb`; the new keys (`isComplimentary`, `compReason`) merge without DDL. No backfill needed (absence = not complimentary).

## Dependencies

None.

## Complexity

**M** — one shared type and pricing helper, two parallel booking UIs (admin `BookingForm` + portal `BookingManagerModal`), plus portal API paths that aggregate nightly rates for `agreed_rate_per_night` / approval totals.

## Validation steps

1. In the admin booking form, add two rooms; mark one complimentary — row total is $0, Rooms line equals (non-comp rate × nights), Grand Total includes activities as today.
2. Save and reopen the booking — `room_config` contains the new flags; totals unchanged on reload.
3. Create a pending multi-room booking from the HOD portal with one complimentary row; approve it — `total_cost_usd` in the approval route excludes the comp room's rate.
4. Unset the flag on a saved booking, save again — full rate is restored with no stale `compReason`.

## Evidence

- No `is_complimentary` column exists on `booking_rooms` (columns: `id`, `booking_id`, `unit_id`, `room_config jsonb` only — confirmed in investigation `phase_one/A2_per_room_comp.md` and via schema check).
- Grep for `complimentary|Complimentary|is_comp` across `4_development/` returns 0 matches in source.
- `agreed_rate_per_night` is derived server-side from per-room rates in `portal/app/api/accommodation/bookings/route.ts` (64–84) and in `bookings/approve/route.ts` (62–67) — both must respect the flag for persistence to stay consistent.
