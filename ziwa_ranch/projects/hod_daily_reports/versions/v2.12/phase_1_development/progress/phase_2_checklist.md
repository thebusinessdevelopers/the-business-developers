# Phase 2 — Form + Logic Fixes Checklist

> Land A-02 and A-03 together (shared types + shared rate helpers). A-05 follows because it also touches `BookingForm.tsx`.

## 2.1 — A-01 Isaac access verification

- [ ] 1. Sign in to admin portal as `admin.isaac`; confirm Rooms → Accommodation → **Room Management** tab loads.
- [ ] 2. Block and unblock a room; changes persist after reload.
- [ ] 3. Record result in the Decision Log (no code change).

> Deferred to manual sign-in verification — no code affected by Phase 2.

## 2.2 — A-02 Per-room complimentary toggle

- [x] 4. Add `isComplimentary: boolean` and optional `compReason?: string` to `RoomBasketItem` in shared types `index.ts`.
- [x] 5. Update `calculateItemRate` and `calculateBasketRate` in shared `accommodation.ts` so complimentary rows contribute $0 to nightly and stay totals.
- [x] 6. Add toggle + optional reason input in admin `BookingForm.tsx`; guard `addRoom`, `buildInitial`, and any basket-loader default (`isComplimentary: false`).
- [x] 7. Mirror the toggle in portal `BookingManagerModal.tsx`.
- [x] 8. Update portal bookings POST `route.ts` so `agreed_rate_per_night` excludes complimentary rooms.
- [x] 9. Update portal bookings approve `route.ts` so `total_cost_usd` excludes complimentary rooms.
- [x] 10. Run validation steps 1–4 in `plan.md` §2.2.

## 2.3 — A-03 Per-person pricing branch

- [x] 11. Add `pricing_type: 'flat' | 'per_person'` to `AccommodationUnit` (and mirror on `RoomBasketItem`) in shared types `index.ts`.
- [x] 12. Add the per-person branch in `calculateItemRate` and `calculateBasketRate` in shared `accommodation.ts`.
- [x] 13. Copy `pricing_type` into basket rows in `BookingForm.tsx` (`addRoom`, default effect, edit basket rebuild).
- [x] 14. Add `pricing_type` to the explicit `accommodation_units (…)` column lists in admin bookings list `route.ts`, admin bookings by-id `route.ts`, portal accommodation `route.ts`, and portal bookings by-id `route.ts`.
- [x] 15. Run validation steps 1–4 in `plan.md` §2.3.

## 2.4 — A-05 Admin pax soft override

- [x] 16. Extend `validateAccommodationWrite` in shared `accommodation-guards.ts` with an `adminOverride` flag that bypasses per-room caps and `validateOccupancy` when true.
- [x] 17. Thread `adminPaxOverride` from POST body into the guard call in admin bookings list `route.ts`.
- [x] 18. Same for admin bookings by-id `route.ts` PUT.
- [x] 19. In `BookingForm.tsx` `handleSubmit`, detect over-capacity rows/totals and prompt via `window.confirm`; on confirm, send `adminPaxOverride: true`.
- [x] 20. Confirm HOD portal `route.ts` paths still call `validateAccommodationWrite` without the flag.
- [x] 21. Run validation steps 1–4 in `plan.md` §2.4.

## 2.5 — A-06 Rate-display verification

- [ ] 22. Admin New Booking, Karungi, FB STO, 2026 check-in — nightly = $300.
- [ ] 23. Single Room, BB rack, 2026 check-in — $85.
- [ ] 24. A-Frame unit, BB rack, 2026 check-in — $300.

> Rate data corrections applied in Phase 1.3 (`044_v212_a06_rate_corrections.sql`); no code change. Deferred to manual smoke after deploy.

## 2.6 — A-07 Admin year selector

- [x] 25. Add a year `<select>` above the tab strip in admin `AccommodationClient.tsx`, default current year.
- [x] 26. Filter the rates reference view locally (`rates.filter(r => r.year === selectedYear)`); rendered in a collapsible reference table.
- [x] 27. Confirm `BookingForm.tsx` remains driven by `check_in` year (full `rates` array still passed).

## 2.7 — A-08 Config constant check

- [x] 28. Grep `4_development/` for `Alfajiri|Kilele|Nyota|Upeo` — zero hits outside `portal/supabase/migrations/` and `next_chat_handover.md`.
- [x] 29. No runtime constant update required — shared `accommodation.ts` has no hardcoded A-Frame names.
- [ ] 30. Verify admin Room Management and HOD Rooms tab display the new names (Mvule, Musambya, Mugavu, Mukooge).

> Visual verification deferred to manual smoke; DB rename applied in Phase 1.4.

## 2.8 — B-01 / B-02 Meeting attendance

- [x] 31. Append `headoffice.florence`, `headoffice.julie`, `headoffice.faith`, `headoffice.isaac` to `CORE_ATTENDEE_USERNAMES` in shared `meetings.ts`.
- [x] 32. Add optional `attendance_mode?: 'phone' | 'in_person'` to `MeetingAttendee` in shared types `index.ts`.
- [x] 33. In `MeetingForm.tsx`, add per-row mode state (default `phone` for `headoffice.*`, else `in_person`), restore on edit, include in the attendance payload, and render a mode control inside each attendance row.
- [x] 34. In `MeetingDetailView.tsx`, render the mode next to the attendee name when present.
- [x] 35. Run validation steps 1–4 in `plan.md` §2.8.

## 2.9 — C-01 Server guard, client retry, and banner

- [x] 36. In portal submit-report `route.ts`, parse optional `confirm_offset`; compute Kampala-today − `report_date` lag; return a 4xx JSON shape (`needsConfirmOffset: true`, `lagDays`) for ≥ 1-day lag without the flag; passes when `confirm_offset: true`.
- [x] 37. In `FormRenderer.tsx`, handle the confirm response and retry once with `{ confirm_offset: true }`; add a non-blocking banner when the chosen `report_date` is ≥ 1 day behind Kampala today.
- [x] 38. Mirror the confirm/retry handling in `useSubmissionQueue.ts`.
- [ ] 39. Optional: `DepartmentHub.tsx` lightweight warning — not applied in this pass (already covered by `FormRenderer` banner + server guard).
- [x] 40. Run validation steps 1–4 in `plan.md` §2.9.

## 2.10 — E-01 Auto-save queue guard

- [x] 41. In `FormRenderer.tsx`, replace the `useSubmissionQueue` callback with the three-condition guard (`departmentId`, `reportDate`, normalised `submittedBy`).
- [x] 42. Confirmed no other change is needed — `QueuedSubmission` already carries `reportDate`; `submittedBy` already in scope.
- [x] 43. Run validation steps 1–4 in `plan.md` §2.10.

## Phase 2 closure

- [x] 44. `tsc --noEmit` passes in both `admin-portal/` and `portal/` with zero TypeScript errors.
- [x] 45. ESLint on all modified files clean (only pre-existing warnings remain).
- [ ] 46. Run all whole-phase smokes listed in `plan.md` Phase 2 validation (manual, post-deploy).
- [x] 47. Update `progress/README.md` statuses to `Completed`.
- [ ] 48. Record commit SHAs in `backlog.md` Decision Log (on commit).
- [x] 49. `APPROVED: phase_2_complete` — Joshua, 20 Apr 2026.
