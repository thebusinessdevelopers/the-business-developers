# A-05 — Implementation context: Chalet pax + admin soft override

## Item summary

Align `pax_config` for Kirungi, Murungi, The Family, and The Clan to `max_adults: 2, max_children: 2, max_total: 4, cot_eligible: true`, and convert the pax enforcement on admin booking writes from a hard server-side rejection to an acknowledged override — with HOD-portal pax validation remaining strict.

## Files to change

| File | What changes | Function / type name |
|------|--------------|----------------------|
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/accommodation-guards.ts` | Accept an `adminOverride` flag on the write-validation input so the per-room pax caps (107–130) and aggregate `validateOccupancy` (133–136) can be bypassed on admin routes when the UI has collected explicit confirmation | `validateAccommodationWrite`, `AccommodationWriteValidationInput` |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/accommodation/bookings/route.ts` | Read `adminPaxOverride` from POST body; pass into the guard so the save succeeds after confirmation | POST handler (73–83) |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/accommodation/bookings/[id]/route.ts` | Same for PUT | PUT handler (72–84) |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/accommodation/BookingForm.tsx` | Before `fetch` in `handleSubmit` (326–370), check the basket against loaded `units`; when any row or the aggregate exceeds its cap, show a `window.confirm` warning (matching the existing delete-confirm pattern at line 373); on confirm send `adminPaxOverride: true` in the payload | `handleSubmit` |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/0NN_v212_chalet_pax.sql` | New migration with the jsonb merge | — |

HOD-portal pax validation is **not** softened — `portal/app/api/accommodation/bookings/route.ts` (and its sibling `[id]/route.ts`) continue to call `validateAccommodationWrite` without the override flag, preserving strict behaviour for HOD submissions.

## DB migration required

Y — exact SQL:

```sql
-- v2.12 A-05: chalet pax correction (2+2, max 4, cot eligible)
UPDATE accommodation_units
SET pax_config = pax_config
  || '{"max_adults": 2, "max_children": 2, "max_total": 4, "cot_eligible": true}'::jsonb
WHERE name IN ('Kirungi', 'Murungi', 'The Family', 'The Clan');
```

The `||` merge preserves each unit's `beds` array unchanged.

## Dependencies

None.

## Complexity

**M** — pax enforcement is **server-side** in `packages/shared/lib/accommodation-guards.ts`, not client-only. A working admin soft override therefore requires coordinated changes to the shared guard and both admin write routes, plus a UI confirmation step — not a UI-only toggle.

## Validation steps

1. After migration, query the four units — each shows `max_adults: 2`, `max_children: 2`, `max_total: 4`, `cot_eligible: true`, with `beds` preserved.
2. Admin portal — create a booking within pax limits for any of the four rooms; save succeeds without confirmation.
3. Admin portal — enter 3 adults for one of the chalets; the form shows a confirm prompt; confirming results in a 200/201 response; cancelling leaves the form editable with no request sent.
4. HOD portal — attempt the same over-capacity booking; the request still fails with a 400 from `validateAccommodationWrite` (override flag absent).
5. Admin portal — create a booking for 2 adults + 2 children + cot on The Clan; saves without the confirm prompt (cot does not count toward `max_total`).

## Evidence

- Server-side pax enforcement: `packages/shared/lib/accommodation-guards.ts` per-room caps at 107–130, aggregate `validateOccupancy` at 133–136.
- Admin API invokes the guard at `admin-portal/app/api/accommodation/bookings/route.ts:73–83` (POST) and `bookings/[id]/route.ts:72–84` (PUT).
- `BookingForm.tsx` `handleSubmit` (326–370) currently validates only guest name, dates, basket emptiness, and company — no client pax check. Error surfacing today comes from the server response via `setError` at line 367 and the banner at line 399.
- Delete-confirm pattern already in the file: `confirm(...)` at line 373 — reuse rather than introducing a new modal.
- HOD portal imports the same guard (`portal/app/api/accommodation/bookings/route.ts` line 6 import, line 43 call) — leaving the call site unchanged keeps HOD strict.
