# Chat 1 Handover — Track A + B Investigations

**Chat:** v2.12 planning, Chat 1 of 5  
**Scope:** 8 investigations (A-01 through A-08, plus combined B-01/02)  
**Date completed:** 20 Apr 2026  
**Method:** Parent agent + Supabase MCP queries + targeted code grep (swarm pattern applied in-chat given tight scope; no external subagents dispatched as ground-truth queries were faster and more accurate run directly).

---

## (a) What was done

- Full schema inspection of `accommodation_units`, `accommodation_rates`, `booking_rooms`, `bookings`, `hod_users`, `hod_meetings`.
- Row-level audit of `accommodation_units` (25 rows) and `accommodation_rates` (98 rows) against the authoritative rate table in `backlog.md`.
- Code review of `admin-portal/lib/admin-auth.ts`, `packages/shared/config/accommodation.ts`, `packages/shared/types/index.ts`, `admin-portal/app/accommodation/BookingForm.tsx`, migrations `023_accommodation.sql` and `025_room_pax_config.sql`.
- 8 investigation documents written with findings, evidence, and recommended migration/code shape for each item.

---

## (b) Key findings affecting later chats

### A-01 is mis-scoped

`admin.isaac` already has every admin capability (access_level `'full'`). The "missing capability" premise is false. Real cause is likely account confusion (Isaac may be using `headoffice.isaac` HOD account, not `admin.isaac`). **Action for Chat 5 plan:** reframe A-01 as an onboarding / account confirmation task, not a code change. Escalate to Joshua if he confirms Isaac is using the correct account but still cannot see the tab.

### A-06 is larger than originally scoped

Three unplanned discoveries:
1. `superior_double_twin` rate category does not exist in DB — must be created with 4 rows (FB/HB × rack/sto) before Karungi/Barungi can be reassigned.
2. `single_room` rate category does not exist — and no unit has `rate_category = 'single_room'`. Joshua confirmation required on whether a single unit exists at Ziwa and needs creating.
3. A-Frame 2026 rates are missing entirely (only 2027 populated).

**Decisions required from Joshua before Chat 5 finalises the plan:**
- Does a physical single room exist? If yes, which unit and shall we create its rate category?
- 2027 chalet rates in DB are higher than 2026 by ~10% for superior_family and superior_executive — backlog A-07 says chalets are unchanged for 2027. Which is correct?
- 2027 camping STO in DB is $25; backlog lists $30. Which is correct?

### A-07 is partially solved

`accommodation_rates.year` column already exists and is wired through the booking form. Rescope A-07 from "add year dimension" to "backfill + correct data + expose year in admin UI". No DDL needed.

### A-03 requires new column

`accommodation_units` does NOT have a `pricing_type` column. Migration must add `pricing_type text NOT NULL DEFAULT 'flat'` with CHECK constraint, plus code branch in the rate-calc helper.

### A-04 DB name is "Augustu" not "Augustus"

Typo in the seed data. Migration must target `name = 'Augustu'` exactly. Optional side-fix: rename to `Augustus`.

### A-05 scope expanded — all four superior_family chalets

Kirungi, Murungi, The Family, and The Clan all need the same correction: `max_adults = 2, max_children = 2, max_total = 4, cot_eligible = true` (baby/cot does not count toward max_total). Kirungi and Murungi currently have `max_children = 0`, so this is a materially worse state than the backlog described.

Additionally, Joshua requires **admin pax override**: pax enforcement in the booking form must convert from a hard block to a soft confirmation warning for admin users, allowing them to exceed stated limits within reason.

### A-08 fully resolved

Names confirmed. No hardcoded references in application code — only in historical migrations. A single `UPDATE` migration suffices.

### B-01/02 fully resolved

All four users (Florence/Julie/Faith/Isaac) exist and are active. `hod_meetings.attendance` is jsonb — no DDL needed to add `attendance_mode`. UI and TypeScript type are the only changes required. Chat 3 needs to locate the meeting form path (expected `admin-portal/app/hod-meetings/**`).

---

## (c) File index (absolute paths)

### Investigations produced by Chat 1

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_1_development/investigations/phase_one/A1_isaac_capabilities.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_1_development/investigations/phase_one/A2_per_room_comp.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_1_development/investigations/phase_one/A3_A4_augustus.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_1_development/investigations/phase_one/A5_clan_family_pax.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_1_development/investigations/phase_one/A6_rate_audit.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_1_development/investigations/phase_one/A7_rate_year.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_1_development/investigations/phase_one/A8_aframe_names.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_1_development/investigations/phase_one/B1_B2_meeting_attendance.md`

### Code touchpoints identified for Chat 3 implementation context

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/admin-auth.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/accommodation/page.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/accommodation/BookingForm.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/config/accommodation.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/types/index.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/accommodation/rates/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/hod-meetings/ ...` (to locate in Chat 3)
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/023_accommodation.sql` (historical reference)
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/025_room_pax_config.sql` (historical reference)

### Migrations Chat 5 will need to design (Phase 1)

- Add `pricing_type` column to `accommodation_units` (A-03)
- Update `pax_config` for Augustu (A-04), The Family, The Clan (A-05)
- Create `superior_double_twin` rate category rows (A-06)
- Reassign Karungi + Barungi to `superior_double_twin` (A-06)
- Backfill A-Frame 2026 rates (A-06/A-07)
- Rename A-Frame units to Mvule / Musambya / Mugavu / Mukooge (A-08)
- (Contingent on Joshua decision) create `single_room` rate category + assign unit
- (Contingent on Joshua decision) reconcile 2027 chalet rates and camping STO

### Open decisions — status after Joshua input (20 Apr 2026)

| # | Decision | Status |
|---|----------|--------|
| 1 | A-01 — which account is Isaac using? | **Still open** — needs Joshua confirmation |
| 2 | A-03/04 — "Augustu" name correct? | **Resolved** — intentional, do not rename |
| 3 | A-05 — Kirungi/Murungi also in scope? | **Resolved** — yes, expand to all 4 chalets |
| 4 | A-05 — admin pax override required? | **Resolved** — yes, soft confirmation not hard block |
| 5 | A-06 — single room category needed? | **Resolved** — no. Single occupancy uses standard rate; no DB change |
| 6 | A-06 — A-Frame 2026 rates? | **Resolved** — identical to 2027; backfill 2026 from 2027 values |
| 7 | A-06/A-07 — 2027 chalet rates? | **Resolved** — DB is wrong; revert to 2026 values |
| 8 | A-06/A-07 — 2027 camping STO? | **Resolved** — STO = $30, rack = $35 |
| 9 | 2026 camping STO ($25 in DB vs $20 in backlog) | **Resolved** — STO = $20. DB must be corrected alongside 2027. |
