# A-07 — Implementation context: Year-aware rates UI

## Item summary

Expose a year selector in the admin accommodation area so admins can see which year's rates apply, without disturbing the booking form's check-in-driven rate lookup. All residual data corrections belong to A-06; A-07 is now a small UI addition.

## Files to change

| File | What changes | Function / type name |
|------|--------------|----------------------|
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/accommodation/AccommodationClient.tsx` | Add a year `<select>` (default `new Date().getFullYear()`) above the tab strip; use it only for an admin rates reference view — either filter `rates` locally (`rates.filter(r => r.year === selectedYear)`) or fetch from `/api/accommodation/rates?year=…`. Keep passing the full `rates` array into `BookingForm` so `calculateItemRate` can resolve by check-in year | `AccommodationClient` (insert around lines 96–98, above existing tab header) |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/accommodation/rates/route.ts` | **No change required.** `year` query param is already implemented (lines 7–14) | `GET` handler |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/accommodation/page.tsx` | Optional only: leave `.select('*')` at lines 14–17 as-is; if you move rate loading client-side via the selector, accept `searchParams` for the default year | `AccommodationPage` |

## DB migration required

N — residual data corrections belong to A-06. Do not duplicate that SQL here. See `versions/v2.12/implementation_context/A06_context.md` (and investigation `phase_one/A6_rate_audit.md`, §Required migration work) for the canonical SQL.

## Dependencies

Must follow A-06 migration (so the year selector shows corrected data).

## Complexity

- **Data: S** — no A-07-only UPDATEs identified; Luxury Tents 2026 matches backlog (see `phase_one/A6_rate_audit.md` §6), and the 2027 delta is covered by A-06's `superior_family` / `superior_executive` / camping corrections.
- **UI: S** — one `<select>` control plus a filtered reference display; API side already filters by `year`.

## Validation steps

1. Call `GET /api/accommodation/rates?year=2026` and `?year=2027` — each response only contains rows for that year.
2. In admin accommodation, toggle the year selector between 2026 and 2027 — the rates reference view updates accordingly, but the **BookingForm** suggestions still depend on `check_in` year, not the selector.
3. Set `check_in` to a 2027 date in `BookingForm.tsx` — suggested rates match `r.year === 2027` rows (post-A-06 corrections).
4. Change the selector with an in-progress booking open — no effect on the booking's suggested rates (confirms decoupling).

## Evidence

- Booking form year plumbing: `admin-portal/app/accommodation/BookingForm.tsx:173–174` — `yr = f.check_in ? new Date(f.check_in).getFullYear() : new Date().getFullYear()` then `calculateItemRate(newItem, rates, f.rate_type, yr)`. Additional year uses at lines 181–204, 216, 232, 424, 436, 681.
- API already supports `year`: `admin-portal/app/api/accommodation/rates/route.ts:7–14` reads `url.searchParams.get('year')` and applies `.eq('year', Number(year))`.
- Admin accommodation page loads all rates with no year narrowing: `admin-portal/app/accommodation/page.tsx:14–17` uses `.select('*').order('rate_category')`.
- `AccommodationClient.tsx` receives `rates` and passes them unchanged to `BookingForm` (lines 134–142); no year state, `<select>`, or `setYear` currently exists in `app/accommodation/`.
