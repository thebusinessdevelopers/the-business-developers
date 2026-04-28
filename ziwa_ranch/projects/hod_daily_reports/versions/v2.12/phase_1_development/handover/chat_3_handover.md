# Chat 3 Handover — Tracks A + B Implementation Context

**Chat:** v2.12 planning, Chat 3 of 5
**Scope:** 8 implementation-context docs (A-01, A-02, A-03/04, A-05, A-06, A-07, A-08, B-01/02)
**Date completed:** 20 Apr 2026
**Method:** 8 parallel `explore` sub-agents (composer-2) reading only their assigned investigation + targeted codebase files, Supabase MCP used for A-08 row IDs. Sub-agents ran in read-only mode; parent agent materialised findings to `implementation_context/`.

---

## (a) What was done

- **A-01** — Confirmed no code change. Route gate at `admin-portal/app/accommodation/page.tsx:10` uses `hasAdminCapability(admin, 'accommodation_manage')`; `admin.isaac` resolves to `access_level = 'full'` (short-circuit `true` at `admin-portal/lib/admin-auth.ts:36–38`). Validation plan reduces to: log in, navigate Menu → Rooms → Room Management tab.
- **A-02** — Mapped the per-room complimentary toggle across `RoomBasketItem` (type), `calculateItemRate` + `calculateBasketRate` (shared maths), admin `BookingForm.tsx` (UI), HOD `BookingManagerModal.tsx` (mirror UI), and two portal API routes that derive `agreed_rate_per_night` from per-room rates (`bookings/route.ts`, `bookings/approve/route.ts`). No DDL. Complexity revised to **M**.
- **A-03/04** — Combined migration designed: `ALTER TABLE accommodation_units ADD COLUMN pricing_type text NOT NULL DEFAULT 'flat' CHECK (…)`, set Augustu to `per_person`, raise `max_adults` 2 → 3 via jsonb merge. Branch point identified in `calculateItemRate` (621–622) and `calculateBasketRate` (567–587). Multiple API routes with explicit `accommodation_units (…)` column lists must add `pricing_type` to nested projections. A-03 = M, A-04 = XS.
- **A-05** — Critical scope correction: pax enforcement is **server-side** in `packages/shared/lib/accommodation-guards.ts` (per-room caps 107–130, aggregate `validateOccupancy` 133–136), not client-side. The admin soft-override therefore requires changes to the shared guard, the admin POST and PUT booking routes, and `BookingForm.tsx` `handleSubmit`. HOD routes remain strict. Complexity revised to **M**. Migration = one jsonb merge across four chalet rows.
- **A-06** — Full migration SQL enumerated: 14 INSERTs (`superior_double_twin` 2026+2027 = 8 rows; A-Frame 2026 = 6 rows), 11 UPDATEs (Karungi/Barungi reassignment, camping STO 2026+2027, 2027 `superior_family` and `superior_executive` reverts). Discovery: **no `RATE_CATEGORIES` constant exists** anywhere in `4_development/` — `rate_category` is a dynamic string on all typed surfaces. Zero code change needed. Complexity **M** (row footprint only).
- **A-07** — Rescoped to a lean UI addition: a year `<select>` in `AccommodationClient.tsx` (default current year). The admin rates API already supports `?year=` (`route.ts:7–14`); `BookingForm.tsx` is already year-aware via `check_in` (`yr` at line 173). No A-07-only UPDATEs — data corrections belong to A-06. Complexity **S + S**.
- **A-08** — Exact migration SQL with unit IDs confirmed via Supabase MCP (Mvule → `77aae283…`, Musambya → `f34fabfb…`, Mugavu → `0a5e4464…`, Mukooge → `8747c529…`). No code change. **XS**.
- **B-01/02** — Attendee list is a **static allowlist** (`CORE_ATTENDEE_USERNAMES` in `packages/shared/config/meetings.ts:39–54`) — simplest change is four string additions. Optional `attendance_mode?: 'phone' | 'in_person'` on `MeetingAttendee` (snake_case matches `department_slug` at line 226). UI insertion point in `MeetingForm.tsx:456–486` (between name and status buttons); summary change at `MeetingDetailView.tsx:252–259`. `head-office` department already exists (`portal/supabase/migrations/012_v2_3_schema.sql:49–52`). **S**.

---

## (b) Key findings affecting Chat 5

### Scope / complexity adjustments (material)

| Item | Chat 1 expectation | Chat 3 confirmed | Impact on Chat 5 plan |
|------|--------------------|------------------|------------------------|
| A-02 | "Small per-room toggle" | Touches shared type, shared rate helpers, two booking UIs (admin + portal), two portal API aggregation paths | Complexity **M**, not S. Sequence alongside A-03 because both touch `RoomBasketItem` and the shared rate helpers — single coordinated PR minimises merge churn. |
| A-03 | DDL + one branch in rate helper | Correct, plus need to update typed API projections (`bookings/route.ts:28`, `bookings/[id]/route.ts:12`, portal equivalents) to include `pricing_type` | Add "update typed column lists" as an explicit phase-1 sub-step. |
| A-05 | "Client-side soft prompt" | Hard-block is **server-side** in `accommodation-guards.ts`. UI `confirm` alone will not work without guard + admin API route changes | Plan must sequence: (1) shared guard accepts `adminOverride`, (2) admin POST/PUT routes pass it, (3) `BookingForm.tsx` `confirm` sends it. HOD portal untouched. |
| A-06 | "Extend RATE_CATEGORIES constant" | **No such constant exists** | Remove "update RATE_CATEGORIES" from plan. No UI selector change. Purely SQL. |
| A-07 | "Expose year in admin rates UI" | API already supports `?year=`; booking form already year-aware. Only one new `<select>` in `AccommodationClient.tsx` needed | Trivial UI task — pair with A-06 verification. |
| B-01/02 | "Locate meeting form" | Found: `admin-portal/app/meetings/MeetingForm.tsx` and `MeetingDetailView.tsx`. Attendee list is a **static allowlist** in `packages/shared/config/meetings.ts` | Smallest diff: four strings added to one constant. No API change. |

### Migration sequencing

Phase 1 migrations can be grouped by dependency graph, not author:

1. **Independent data-only** — A-04 Augustu pax, A-05 chalet pax, A-08 A-Frame renames, A-06 rate corrections. Safe to ship together.
2. **DDL + seed** — A-03 `ALTER TABLE accommodation_units ADD COLUMN pricing_type …` (combine with A-04 in a single migration file since they target the same unit row).
3. **Within A-06**, order inside the migration matters: `INSERT … rate_category = 'superior_double_twin'` **must precede** the `UPDATE accommodation_units SET rate_category = 'superior_double_twin' WHERE name IN ('Karungi','Barungi')` — otherwise the reassigned units briefly have no matching rate rows.

### Code-change sequencing

- **A-02 + A-03** share `RoomBasketItem` and the shared rate helpers. Land as one feature branch.
- **A-05** is independent of A-02/A-03 but touches `BookingForm.tsx`; expect a minor merge with A-02's toggle UI edits — sequence A-02/A-03 first, A-05 second.
- **A-06 / A-07** are sequenced: A-06 migration → A-07 UI selector verification.
- **B-01/02** has no overlap with Track A.

### Items requiring no code change

- **A-01** — validation only.
- **A-08** — migration only.
- **A-06** — migration only.

### No new open decisions surfaced

All Joshua-decisions listed in Chat 1/2 handovers remain the authoritative decision set. Chat 3 produced no new questions for Joshua on Tracks A and B.

---

## (c) File index (absolute paths)

### Chat 3 outputs — implementation context docs

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/implementation_context/A01_context.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/implementation_context/A02_context.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/implementation_context/A0304_context.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/implementation_context/A05_context.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/implementation_context/A06_context.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/implementation_context/A07_context.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/implementation_context/A08_context.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/implementation_context/B0102_context.md`

### Codebase files examined during Chat 3

**Admin portal — accommodation:**

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/admin-auth.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/NavMenu.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/accommodation/page.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/accommodation/AccommodationClient.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/accommodation/BookingForm.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/accommodation/RoomManagement.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/accommodation/rates/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/accommodation/bookings/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/accommodation/bookings/[id]/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/accommodation/units/route.ts`

**Admin portal — meetings:**

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/meetings/page.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/meetings/MeetingForm.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/meetings/MeetingDetailView.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/meetings/MeetingsClient.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/meetings/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/meetings/[id]/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/types/index.ts`

**Portal — accommodation:**

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/BookingManagerModal.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/RoomsTab.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/bookings/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/bookings/[id]/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/accommodation/bookings/approve/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/config/login-users.ts`

**Shared packages:**

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/types/index.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/config/accommodation.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/config/meetings.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/accommodation-guards.ts`

**Historical / schema reference:**

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/012_v2_3_schema.sql`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/023_accommodation.sql`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/025_room_pax_config.sql`

### Supabase MCP queries run during Chat 3

- `SELECT id, name, sort_order, status FROM accommodation_units WHERE building = 'a_frames' ORDER BY sort_order;` (A-08 — row IDs captured in `A08_context.md`)

---

## Status

Track A + B implementation context is complete. All eight items have migration SQL (where applicable), file-and-line change maps, dependency order, and validation steps. Chat 5 has the material it needs to phase Tracks A + B in `plan.md` without further code archaeology.
