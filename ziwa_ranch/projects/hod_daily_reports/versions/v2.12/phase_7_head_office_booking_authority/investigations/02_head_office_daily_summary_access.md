# Head Office Daily Summary Access Investigation

STATUS: scoping

## Question

What is the smallest safe path for Head Office to access today's Daily Summary and WhatsApp rooming export from the HOD portal?

## Required Evidence

- Admin Daily Summary UI and API behaviour.
- Admin auth requirements.
- Existing HOD accommodation UI structure.
- Shared logic opportunities.
- Privacy policy for Head Office private guest visibility.

## Findings

Wave 1 status: `CONCERNS`.

Wave 2 runtime status: `FAIL` against required Head Office access.

- Admin Daily Summary is implemented in `admin-portal/app/accommodation/DailySummary.tsx`.
- It fetches `GET /api/accommodation/daily-summary?date=...`.
- The admin route is protected by admin auth/capability patterns, not HOD session policy.
- WhatsApp copy text is built client-side from the loaded Daily Summary JSON.
- CSV export is a separate admin route and different transformation.
- Admin direct use or linking would couple Head Office to admin auth and likely grant broader access than needed.
- The likely safe direction is a HOD-authenticated Head Office route plus shared pure summary/formatting helpers where extraction is small.

Wave 2 runtime evidence:

- `headoffice.florence` authenticated successfully against HOD dev-preview.
- HOD dev-preview `GET /api/accommodation/daily-summary?date=2026-06-13` returned `404`, confirming there is no HOD Daily Summary API path.
- Unauthenticated admin dev-preview `GET /api/accommodation/daily-summary?date=2026-06-13` returned `401`, confirming the current route remains admin-authenticated.
- No Head Office Daily Summary or WhatsApp copy control was visible in the Head Office Rooms tab during browser validation.

## Fix Planning Notes

Preferred direction:

1. Add a HOD-authenticated Daily Summary route for Head Office only.
2. Reuse or extract a small shared summary data builder so admin and HOD views do not drift.
3. Keep admin auth wrappers and HOD auth wrappers separate; do not link Head Office into the admin portal.
4. Add a Head Office UI entry point from the Rooms tab or a clearly labelled Head Office-only Daily Summary section.
5. Use the existing `canViewPrivateGuestNames`/Head Office policy boundary and explicitly block non-Head Office HOD departments from the route.

Wave 3 codebase fix investigation update:

- The admin Daily Summary route is protected by `withAdminAuth` and `accommodation_manage`.
- The current admin Daily Summary select omits `booking_rooms.room_config`, so it cannot provide authoritative per-room pax, room meal plan, or room notes.
- The portal accommodation calendar route already selects `booking_rooms.room_config`, proving the field can be used in HOD-side API data without a migration.
- The smallest safe HOD route should mirror the admin Daily Summary JSON shape where practical, but use `withAuth` and an explicit Head Office gate.
- Recommended auth boundary: unauthenticated HOD users receive `401`; authenticated non-Head Office HOD departments receive `403`; Head Office receives `200`.
- A shared single-date summary builder can reduce admin/HOD drift if extraction stays small.
- CSV export should be deferred unless Joshua confirms it is required now, because the current admin export is booking-level and would need a separate per-room row contract.

## Open Questions

- Should Head Office see Daily Summary inside the existing Rooms tab, or as a distinct Head Office-only section within that tab?
- Should summary data shaping move into `@hod/shared`, or should only the formatter be shared first?
- CSV export is deferred unless Joshua later confirms spreadsheet output is required now; first fix should focus on Daily Summary view and WhatsApp copy.
- Should private-name visibility use existing Head Office `canViewPrivateGuestNames: true`, and should other HOD departments be explicitly blocked from the route?
- Should the first sandbox fix extract a shared summary builder immediately, or keep the route thin with a smaller shared normalised-row mapper?

## Privacy Notes

Do not expose cookies, auth headers, passwords, or unnecessary private guest data in evidence.
