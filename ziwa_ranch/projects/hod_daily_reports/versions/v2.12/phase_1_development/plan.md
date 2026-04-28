# HOD Daily Reports — v2.12 Plan

> **Status:** recovery complete on admin `dev`; final release approval still required.
> **Theme:** Field feedback post-v2.11 — accommodation corrections, HOD meeting attendance, report-date integrity, AI infrastructure overhaul, form-experience fix.
> **Source documents:** `backlog.md`, `handover/chat_2_handover.md`, `handover/chat_3_handover.md`, `handover/chat_4_handover.md`, all files in `implementation_context/`.
> **Prerequisite:** Joshua authorisation before any code is written.
> **Current navigation:** start with `../README.md`; for the final Daily Brief architecture, read `../phase_2_recovery_release/phase_e_delivery.md`.

---

## 0. Resolved decisions (applied throughout)

Pulled from `handover/chat_4_handover.md` §b. No placeholders remain.

**As-built note, 26 Apr 2026:** decisions 10 and 12 below describe the original Phase 3 background-function design. Phase E superseded that implementation with direct synchronous regeneration in `POST /api/daily-digest`. Keep these rows as historical planning context, not current architecture.

| # | Track | Decision (applied) |
|---|-------|--------------------|
| 1 | C-01 | Soft-confirm request field on `/api/submit-report`: `confirm_offset` (mirrors existing `duplicateId` precedent) |
| 2 | C-01 | Lag policy: ≥ 1 calendar day → soft confirm; ≥ 2 calendar days → soft-confirm required. Both paths pass when `confirm_offset: true` is supplied |
| 3 | C-01 | Complementary lag banner added in `FormRenderer.tsx`; optional lightweight warning in `DepartmentHub.tsx` when navigating with a `?date=` ≥ 2 days behind Kampala today |
| 4 | C-01 | Stuck-row report-date replacements are placeholders (`<NEW_DATE_ACCOUNTS>`, `<NEW_DATE_DRIVERS>`) pending business review — explicit conditional gate in Phase 1 |
| 5 | D-01 | Introduce `OPENROUTER_MODEL` and `OPENROUTER_MODEL_FAST` env vars; default `anthropic/claude-sonnet-4.5` and `google/gemini-2.5-flash`; add optional `[build.environment]` defaults in `netlify.toml` |
| 6 | D-02 | Composite cache signature (report rows hash + normalised JSON of all four sub-agent inputs) |
| 7 | D-02 | Stock v1 = `hod_verified_stock` + `hod_stock_flags` + deterministic extracts from `report_data` only |
| 8 | D-02 | Partial-failure behaviour = degraded brief with `degraded: true` (parity with existing degraded path) |
| 9 | D-02 | Extend `analysis_data` with `pipeline_version`, `sub_agent_models`, `orchestrator_model` |
| 10 | D-03 | Job visibility = poll `hod_analysis_cache` until fresh; no `hod_analysis_jobs` table in v2.12 |
| 11 | D-03 | Weekly-brief cache read switches to signature-based (parity with daily) |
| 12 | D-03 | Add `@netlify/functions` as `devDependencies` for `Handler` typing |
| 13 | D-04 | Daily-brief Regenerate control + feedback textarea ship in v2.12, merged with D-03's kick-off `POST` |
| 14 | D-04 | Feedback field name = `feedback`, optional string, max 500 chars after trim |
| 15 | D-04 | Server-side length breach → `400` (defensive; client enforces `maxLength={500}`) |

---

## Phase 1 — Database Migrations

> SQL-only work. All migration numbers are sequential from the highest existing migration in `portal/supabase/migrations/` (`041_booking_payments.sql`). No application-code changes in this phase.

### 1.1 — A-03 + A-04: Augustu `pricing_type` column and pax correction

- **Description:** Add `pricing_type` column to `accommodation_units` (default `flat`, CHECK for `('flat','per_person')`), set Augustu to `per_person`, and merge Augustu's `pax_config` to raise `max_adults` from 2 to 3. Combined in one file because both target the same row.
- **Files to change:** `042_v212_augustu.sql` (new).
- **DB migration:** Y — `042_v212_augustu.sql`.
- **Dependencies:** none.
- **Complexity:** S (data+DDL, scoped).
- **Validation:**
  1. `SELECT name, pricing_type, pax_config FROM accommodation_units WHERE name = 'Augustu';` returns `pricing_type = 'per_person'`, `pax_config->>'max_adults' = '3'`, `max_children`/`max_total`/`beds`/`cot_eligible` preserved.
  2. `SELECT pricing_type FROM accommodation_units WHERE name <> 'Augustu';` returns `flat` for every other row.
  3. CHECK enforcement: attempt `UPDATE … SET pricing_type = 'other'` on any row → rejected by constraint.

### 1.2 — A-05: Chalet pax correction (Kirungi, Murungi, The Family, The Clan)

- **Description:** jsonb-merge `pax_config` to `max_adults: 2, max_children: 2, max_total: 4, cot_eligible: true` across the four chalets while preserving each unit's `beds` array.
- **Files to change:** `043_v212_chalet_pax.sql` (new).
- **DB migration:** Y — `043_v212_chalet_pax.sql`.
- **Dependencies:** none.
- **Complexity:** XS.
- **Validation:**
  1. `SELECT name, pax_config FROM accommodation_units WHERE name IN ('Kirungi','Murungi','The Family','The Clan');` — every row has `max_adults: 2`, `max_children: 2`, `max_total: 4`, `cot_eligible: true`.
  2. `SELECT pax_config->'beds' FROM accommodation_units WHERE name IN (…);` — `beds` arrays unchanged from pre-migration snapshot.

### 1.3 — A-06 + A-07 data: Rate-row corrections, category creation, and A-Frame 2026 backfill

- **Description:** Create `superior_double_twin` rate rows for 2026 and 2027 (8 rows), backfill A-Frame 2026 rates identical to 2027 (6 rows), reassign Karungi and Barungi from `superior_family` to `superior_double_twin`, correct camping STO (2026 = $20, 2027 = $30), and revert 2027 `superior_family` + `superior_executive` rates to their 2026 values. Order inside the file: INSERT `superior_double_twin` rows **before** the Karungi/Barungi UPDATE. A-07's data work is entirely contained in this migration — no separate A-07 migration.
- **Files to change:** `044_v212_a06_rate_corrections.sql` (new).
- **DB migration:** Y — `044_v212_a06_rate_corrections.sql`.
- **Dependencies:** none (file-ordering only).
- **Complexity:** M (wide row footprint: 14 INSERTs, 11 UPDATEs).
- **Validation:**
  1. `SELECT year, meal_plan, rate_type, adult_rate FROM accommodation_rates WHERE rate_category = 'superior_double_twin' ORDER BY year, meal_plan, rate_type;` — 8 rows, values 400/300/370/270 for each year.
  2. `SELECT name, rate_category FROM accommodation_units WHERE name IN ('Karungi','Barungi');` — both `superior_double_twin`.
  3. `SELECT meal_plan, rate_type, adult_rate FROM accommodation_rates WHERE rate_category = 'a_frame' AND year = 2026 ORDER BY meal_plan, rate_type;` — 6 rows matching 2027 values.
  4. `SELECT year, rate_type, adult_rate FROM accommodation_rates WHERE rate_category = 'camping' AND meal_plan = 'none' AND rate_type = 'sto' ORDER BY year;` — 2026 = 20, 2027 = 30. 2027 `superior_family` / `superior_executive` rows match the 2026 seed.

### 1.4 — A-08: A-Frame rename

- **Description:** Four row updates on `accommodation_units` renaming placeholder Swahili names to confirmed indigenous-tree names (Alfajiri → Mvule, Kilele → Musambya, Nyota → Mugavu, Upeo → Mukooge). `sort_order` and `status` unchanged.
- **Files to change:** `045_v212_aframe_rename.sql` (new).
- **DB migration:** Y — `045_v212_aframe_rename.sql`.
- **Dependencies:** none.
- **Complexity:** XS.
- **Validation:**
  1. `SELECT name, sort_order, status FROM accommodation_units WHERE building = 'a_frames' ORDER BY sort_order;` — names are Mvule, Musambya, Mugavu, Mukooge; `sort_order` 500–503; `status` unchanged.
  2. `SELECT count(*) FROM accommodation_units WHERE name IN ('Alfajiri','Kilele','Nyota','Upeo');` returns 0.

### 1.5 — B-01 / B-02: no DDL

- **Description:** Recorded explicitly as a no-DDL item. `hod_meetings.attendance` is `jsonb`; the new `attendance_mode` key merges transparently at application layer. No migration.
- **Files to change:** none in Phase 1.
- **DB migration:** N.
- **Dependencies:** none.
- **Complexity:** N/A (Phase 2 work).
- **Validation:** deferred to Phase 2.

### 1.6 — C-01: Stuck-row report-date corrections (conditional)

- **Description:** Row-level correction of two stuck reports in a single transaction: Accounts (`438827bf-1bf3-4989-9826-ca4d2768729f`) and Drivers & Mechanics (`b076f356-321d-4ba6-8b5c-9194e58e4c31`). Replace each `report_date` with the business-confirmed target date; in the same transaction, align `hod_report_media.report_date` via `UPDATE … FROM hod_daily_reports` (defensive — current snapshot shows zero media rows for these reports). Respect the `hod_daily_reports_dept_date_unique (department_id, report_date)` index.
- **Files to change:** `046_v212_c01_date_corrections.sql` (new).
- **DB migration:** Y — `046_v212_c01_date_corrections.sql`.
- **Dependencies:** none.
- **Complexity:** S.
- **Conditional gate (only gate in Phase 1):** The SQL file carries `<NEW_DATE_ACCOUNTS>` and `<NEW_DATE_DRIVERS>` placeholders. Migration must not be executed until business review confirms both target dates and Joshua signs them into the Decision Log. Until then, the migration file exists in the repo with placeholders; no apply step runs.
- **Validation:**
  1. Pre-apply in a staging project: substitute the two dates; run the migration; confirm both rows reflect the new `report_date` and the unique index still holds (no conflicting `(department_id, report_date)`).
  2. `SELECT report_id, report_date FROM hod_report_media WHERE report_id IN (…);` aligns with the corresponding `hod_daily_reports.report_date`.
  3. Confirm stuck departments can submit a report for Kampala "today" after correction (retest in Phase 2 once server guard lands).

### Phase 1 — whole-phase validation

1. All migrations (`042` – `045`, and `046` once dates are confirmed) apply cleanly in order against a fresh clone of production via Supabase MCP on a staging project — zero constraint violations, zero orphan rows.
2. Post-migration smoke queries (§1.1.1 – §1.6.2) all return expected results.
3. Open admin Accommodation page: a-frames show renamed units, Karungi FB STO defaults to $300, Augustu booking saves with 3 adults; no runtime error from any existing application code (no schema-contract drift expected because A-03's column is additive and other changes are data-only).
4. Record the migration filenames and apply timestamps in the Decision Log.

### Phase 1 — approval gate

**STATUS: approved — 20 Apr 2026**

`APPROVED: phase_1_complete` — Joshua, 20 Apr 2026. C-01 resolved: both stuck-row `report_date` values confirmed correct (2026-04-18); `046_v212_c01_date_corrections.sql` deleted.

---

## Phase 2 — Form + Logic Fixes

> No DDL. Builds on the Phase 1 schema. One coherent change-set per item; merges avoided by sequencing A-02 and A-03 alongside each other (shared shared-types + rate helpers).

### 2.1 — A-01: Verify Isaac Room Management access

- **Description:** No code change. `admin.isaac` resolves to `access_level = 'full'`, which short-circuits `hasAdminCapability` true for `accommodation_manage`. Action is sign-in verification only.
- **Files to change:** none.
- **DB migration:** N.
- **Dependencies:** none.
- **Complexity:** XS.
- **Validation:**
  1. Sign in to admin portal as `admin.isaac`.
  2. Navigate Menu → **Rooms** → Accommodation → **Room Management** tab loads.
  3. Block a room, unblock it; changes persist on reload.

### 2.2 — A-02: Per-room complimentary toggle

- **Description:** Add `isComplimentary: boolean` (and optional `compReason?: string`) to `RoomBasketItem`, make rate helpers emit $0 for complimentary rows, mirror the toggle in the admin and HOD booking UIs, and exclude comp rows from per-night aggregates in the two portal API paths that derive `agreed_rate_per_night`.
- **Files to change:** `index.ts` (shared types), `accommodation.ts` (shared config), `BookingForm.tsx` (admin), `BookingManagerModal.tsx` (portal), `route.ts` (portal bookings POST), `route.ts` (portal bookings approve).
- **DB migration:** N (`booking_rooms.room_config` is `jsonb`; new keys merge without DDL).
- **Dependencies:** share shared-type edits with A-03 (2.3) — land together.
- **Complexity:** M.
- **Validation:**
  1. Admin booking with 2 rooms, one marked complimentary — comp row total = $0, Rooms line = (non-comp rate × nights), Grand Total includes activities unchanged.
  2. Save and reopen — `room_config` JSON carries `isComplimentary` + `compReason`; totals identical on reload.
  3. HOD multi-room pending booking with one complimentary row; admin approval persists `total_cost_usd` excluding the comp room's rate.
  4. Unset the flag and save again — full rate restored; `compReason` cleared.

### 2.3 — A-03 code branch: Per-person pricing

- **Description:** Thread `pricing_type` through `AccommodationUnit` and `RoomBasketItem` types, add the per-person branch in `calculateItemRate` and `calculateBasketRate` (nightly = `adults * adult_rate + children * child_rate` when `pricing_type = 'per_person'`), copy `pricing_type` into basket rows on room add/default/edit in `BookingForm.tsx`, and include `pricing_type` in the explicit `accommodation_units (…)` nested projections in the four typed API routes.
- **Files to change:** `index.ts` (shared types), `accommodation.ts` (shared config), `BookingForm.tsx` (admin), `route.ts` (admin bookings list), `route.ts` (admin bookings by id), `route.ts` (portal accommodation), `route.ts` (portal bookings by id).
- **DB migration:** N (column lives on schema from Phase 1.1; no further DDL).
- **Dependencies:** Phase 1.1 (`042_v212_augustu.sql`); share shared-type edits with A-02 (2.2).
- **Complexity:** M.
- **Validation:**
  1. Admin booking for Augustu, 3 adults, 2026 check-in, FB STO — suggested nightly = `3 × adult_rate`; Rooms total = nightly × nights.
  2. Any flat-priced unit (e.g. Barungi) — nightly equals a single `adult_rate` (behaviour unchanged).
  3. `GET /api/accommodation/bookings` response — nested unit projection includes `pricing_type` field.
  4. Booking saved with `pricing_type = per_person` loads back with the same per-row multiplication after a reopen.

### 2.4 — A-05 code branch: Admin pax soft override

- **Description:** Extend `validateAccommodationWrite` with an `adminOverride` flag that bypasses per-room caps (lines 107–130) and aggregate `validateOccupancy` (133–136) when the admin UI has explicitly confirmed. Admin POST and PUT booking routes pass the flag through; HOD portal routes remain strict (do not forward the flag). In `BookingForm.tsx` `handleSubmit`, before `fetch`, detect over-capacity rows or totals and prompt via `window.confirm` (matching the existing delete pattern); on confirm, send `adminPaxOverride: true` in the payload.
- **Files to change:** `accommodation-guards.ts` (shared), `route.ts` (admin bookings list), `route.ts` (admin bookings by id), `BookingForm.tsx` (admin).
- **DB migration:** N (pax config updated in Phase 1.2).
- **Dependencies:** Phase 1.2 (`043_v212_chalet_pax.sql`); sequence after A-02/A-03 because `BookingForm.tsx` is shared.
- **Complexity:** M.
- **Validation:**
  1. Admin creates 2 adults + 2 children booking on The Clan — saves without confirm prompt.
  2. Admin enters 3 adults on The Family — confirm prompt appears; confirming yields 200/201; cancelling sends no request.
  3. HOD portal attempts the same over-capacity booking — 400 from `validateAccommodationWrite` (no override flag).
  4. Admin booking with cot on The Clan (2 adults + 2 children + cot) — saves without confirm (cot excluded from `max_total`).

### 2.5 — A-06 rate-display verification

- **Description:** No code change. Confirm after Phase 1 that the booking form's check-in-year-driven rate lookup surfaces the corrected rates (Karungi FB STO = $300, Single Room BB = $85, A-Frame 2026 BB rack = $300, etc.).
- **Files to change:** none.
- **DB migration:** N.
- **Dependencies:** Phase 1.3 (`044_v212_a06_rate_corrections.sql`).
- **Complexity:** XS.
- **Validation:**
  1. Admin New Booking, Karungi, FB STO, 2026 check-in — nightly rate suggestion = $300.
  2. Single Room, BB rack, 2026 check-in — $85.
  3. A-Frame (any renamed unit), BB rack, 2026 check-in — $300.

### 2.6 — A-07: Admin year selector

- **Description:** Add a year `<select>` to `AccommodationClient.tsx` above the tab strip, default `new Date().getFullYear()`, used only to filter the admin rates reference view (local filter on the already-loaded `rates` array, or `fetch('/api/accommodation/rates?year=…')`). Do not change `BookingForm.tsx` — the booking form remains driven by `check_in` year.
- **Files to change:** `AccommodationClient.tsx` (admin).
- **DB migration:** N.
- **Dependencies:** Phase 1.3 (`044_v212_a06_rate_corrections.sql`).
- **Complexity:** S.
- **Validation:**
  1. Toggle selector between 2026 and 2027 — the reference view updates.
  2. With an in-progress booking open, toggle the selector — booking form suggestions unchanged (driven by `check_in`).
  3. `GET /api/accommodation/rates?year=2027` returns only 2027 rows (already supported by API).

### 2.7 — A-08: Update accommodation config constant

- **Description:** Search the repo for any residual hardcoded A-Frame placeholder names (Alfajiri, Kilele, Nyota, Upeo) after Phase 1.4. Per `A08_context.md`, TypeScript/TSX hits are only in historical migration files — no runtime code constant needs updating. Record "no constant change required" in the checklist; this item exists to catch any newly-added hardcoded reference between Chat 4 and build time.
- **Files to change:** none (expected outcome). `accommodation.ts` (shared config) reviewed for any hardcoded names — none today.
- **DB migration:** N.
- **Dependencies:** Phase 1.4 (`045_v212_aframe_rename.sql`).
- **Complexity:** XS.
- **Validation:**
  1. Grep `Alfajiri|Kilele|Nyota|Upeo` across `4_development/` — zero hits outside `portal/supabase/migrations/`.
  2. Admin Room Management tab displays Mvule, Musambya, Mugavu, Mukooge.
  3. HOD Rooms tab and calendar display the same four names.

### 2.8 — B-01 / B-02: Meeting attendance (Head Office + mode)

- **Description:** Append `headoffice.florence`, `headoffice.julie`, `headoffice.faith`, and `headoffice.isaac` to `CORE_ATTENDEE_USERNAMES`. Add optional `attendance_mode?: 'phone' | 'in_person'` to `MeetingAttendee`. In `MeetingForm.tsx`, add per-row mode state (default `phone` for `headoffice.*` users, otherwise `in_person`), restore on edit, and include in the attendance payload. In `MeetingDetailView.tsx`, render the mode next to the attendee name when present.
- **Files to change:** `meetings.ts` (shared config), `index.ts` (shared types), `MeetingForm.tsx`, `MeetingDetailView.tsx`.
- **DB migration:** N (`hod_meetings.attendance` is `jsonb`).
- **Dependencies:** none.
- **Complexity:** S.
- **Validation:**
  1. Start a new meeting — Florence, Julie, Faith, and Isaac appear in the attendance list alongside existing operational HODs.
  2. Set each to a status and mode, submit, reopen — stored `attendance` JSON contains `attendance_mode` per attendee where set.
  3. Edit a pre-migration meeting — absence of `attendance_mode` does not break form or detail view (optional field semantics).
  4. Meeting Detail View shows each attendee's mode after an em-dash when present.

### 2.9 — C-01: Server guard, client retry, and lag banner

- **Description:** In `/api/submit-report`, before the existing duplicate check, parse optional `confirm_offset` from the body and compute `(now AT TIME ZONE 'Africa/Kampala')::date - report_date::date`. Return a 4xx JSON response with `{ error, needsConfirmOffset: true, lagDays }` (mirroring `duplicateId` precedent) when lag ≥ 1 day and `confirm_offset` is absent (hard variant for lag ≥ 2). In `FormRenderer.tsx`, handle the confirm response and retry once with `{ confirm_offset: true }`; render a non-blocking banner when the chosen `report_date` is ≥ 1 day behind Kampala today. Apply the same confirm/retry behaviour inside `useSubmissionQueue.ts` (shared `/api/submit-report` call-site). Optional lightweight banner in `DepartmentHub.tsx` for ≥ 2 day lag on `?date=` navigation.
- **Files to change:** `route.ts` (portal submit-report), `FormRenderer.tsx`, `useSubmissionQueue.ts`, `DepartmentHub.tsx` (optional).
- **DB migration:** N (data correction lives in Phase 1.6).
- **Dependencies:** Phase 1.6 (apply only after business-confirmed dates).
- **Complexity:** S.
- **Validation:**
  1. POST `/api/submit-report` with a `report_date` 2+ calendar days behind Kampala today, no `confirm_offset`: 4xx, no insert.
  2. Same payload with `confirm_offset: true`: 200 + `{ reportId }` (existing success path).
  3. Web UI: selecting an old date shows the lag banner; submitting triggers the confirm dialog; confirming completes; declining keeps the form editable with no request sent.
  4. Offline queue: an old-dated queued item replays online, sees the confirm shape, retries with `confirm_offset: true`, and resolves.

### 2.10 — E-01: Auto-save queue-callback guard

- **Description:** In `FormRenderer.tsx`, replace the existing `useSubmissionQueue` success callback with a three-condition guard: `item.departmentId === departmentId` AND `item.reportDate === reportDate` AND normalised (trim + lower-case) `item.submittedBy` matches the current session's `submittedBy`. Only then call `clearDraft(item.submittedBy)` and `onSuccess(reportId)`. No changes to `useSubmissionQueue.ts`, `QueuedSubmission`, or any parent of `FormRenderer`.
- **Files to change:** `FormRenderer.tsx`.
- **DB migration:** N.
- **Dependencies:** none.
- **Complexity:** XS.
- **Validation:**
  1. Queue a report offline for department X, open a new report for department X with a different `reportDate`, go online — queued item resolves without replacing the open form or clearing its draft.
  2. Stale queued item for department X with a different submitter name than the live form — completion does not invoke `onSuccess`.
  3. Normal online submit for current department + date + submitter — `onSuccess` runs and drafts clear (behaviour unchanged).
  4. Paged flow: use **Next** between sections while a matching queued item completes in background — only the guarded path is affected.

### Phase 2 — whole-phase validation

1. Local build passes with zero TypeScript errors in `4_development/`; shared-type edits compile across `admin-portal/`, `portal/`, and `packages/shared/`.
2. Lint and existing test suites (if any) green in both `admin-portal/` and `portal/`.
3. Admin booking end-to-end smoke: create an Augustu per-person booking, create a multi-room booking with one complimentary row, exceed chalet pax on confirm — every path succeeds.
4. Portal submit-report end-to-end smoke: submit for today's Kampala date (happy path), submit for a 2-day-lag date (confirm dialog + retry path), and complete an offline queue replay.
5. Meeting form end-to-end: Florence attendance saved with `phone`; older meeting edited without `attendance_mode` still displays.
6. Record each completed item in the Decision Log with the commit SHA.

### Phase 2 — approval gate

**STATUS: approved — 20 Apr 2026**

`APPROVED: phase_2_complete` — Joshua, 20 Apr 2026. Phase 3 may begin.

Joshua reviews the Phase 2 change-set, signs `APPROVED: phase_2_complete` in `backlog.md` before any Phase 3 work begins.

---

## Phase 3 — AI Infrastructure

> Original dependency order: D-01 → D-03 background function → D-02 pipeline → D-04 feedback. As-built after Phase E: D-01 model plumbing remains; Daily Brief regeneration now runs synchronously in `POST /api/daily-digest`; D-02 pipeline lives in the shared generation module; D-04 feedback still uses the same `POST` body with `force: true` and optional `feedback`.

### 3.1 — D-01: OpenRouter model upgrade and env plumbing

- **Description:** Replace the hard-coded `MODEL` in `packages/shared/lib/openrouter.ts` with `process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4.5'`. Add exported `OPENROUTER_MODEL_FAST = process.env.OPENROUTER_MODEL_FAST ?? 'google/gemini-2.5-flash'`. Create `admin-portal/.env.example` (absent today) with both vars documented. Optionally codify non-secret defaults under `[build.environment]` in `admin-portal/netlify.toml`. No change to admin/portal `lib/openrouter.ts` (barrel re-exports).
- **Files to change:** `openrouter.ts` (shared), `.env.example` (admin-portal, new), `netlify.toml` (admin-portal, optional).
- **DB migration:** N.
- **Dependencies:** none.
- **Complexity:** XS.
- **Validation:**
  1. Local or deploy preview with `OPENROUTER_API_KEY` set and `OPENROUTER_MODEL` unset — requests use `anthropic/claude-sonnet-4.5`; persisted `model_used` reflects the default.
  2. Override `OPENROUTER_MODEL` temporarily — API routes still succeed and `model_used` matches the override.
  3. Smoke one admin AI route and the portal `submit-report` urgency classifier — JSON shapes unchanged.

### 3.2 — D-03: Direct Daily Brief POST regeneration

- **Description:** Final as-built path after Phase E. `GET /api/daily-digest` remains cache-read-only (fresh, stale, or pending). `POST /api/daily-digest` performs `verifyAdminAuth`, calls `runDailyDigestGeneration()` directly with `force: true` and optional `feedback`, returns the generated payload, and fails if the Supabase cache upsert fails. The earlier `daily-digest-background.ts` and `_internal-auth.ts` files were deleted. `DailyDigestCard.tsx` awaits the response and updates state from the returned payload. Weekly-brief route adopts signature-based cache reads for parity.
- **Files changed:** `handler.ts` (admin-portal daily-digest), `route.ts` (admin-portal daily-digest), `daily-digest-generation.ts`, `DailyDigestCard.tsx`, `route.ts` (admin-portal weekly-brief), `analysis-reliability.ts` (admin-portal, for weekly signature helper alignment), regression test in `__tests__/daily-digest-api-origin.test.mjs`.
- **DB migration:** N (default: poll cache until fresh; no `hod_analysis_jobs` table in v2.12).
- **Dependencies:** 3.1 (D-01).
- **Complexity:** M.
- **Validation:**
  1. `POST /api/daily-digest` with no valid admin session returns 401, confirming the route is active and auth-gated.
  2. Authenticated regeneration writes `hod_analysis_cache` row for `period_type = 'daily_brief'` with updated `analysis_data`, `generated_at`, and `model_used`.
  3. Browser: `DailyDigestCard` renders the returned payload after regeneration.
  4. Supabase cache upsert errors are treated as hard failures, not successful regeneration.
  5. Weekly brief cache read uses signature-based freshness (parity with daily).

### 3.3 — D-02: Multi-agent daily-brief pipeline

- **Description:** Replace the single `callOpenRouter` in `daily-digest/handler.ts` with four Gemini 2.5 Flash sub-agents (Occupancy, Stock, Compliance, Action items) running in parallel, feeding one Claude Sonnet 4.5 orchestrator. Add the two new queries that today do not exist (a second `bookings` overlap for `briefDate + 1`; `hod_verified_stock` + `hod_stock_flags` + deterministic extracts over `report_data` for Stock), and expand the action-items select with a `hod_departments` join per the D-02 schemas. Preserve the current daily-digest system prompt verbatim on the orchestrator; add optional fifth **RISKS AHEAD** section when sub-agent JSON surfaces predictive signals. Use `Promise.allSettled` and degrade partial failures by substituting empty/error-tagged JSON for the failing quadrant and setting `degraded: true`. Extend `buildReportSignature` in `analysis-reliability.ts` to a composite (`signature_reports + '|' + hash(normalised JSON of all four sub-agent inputs)`); keep the `hod_analysis_cache` upsert shape unchanged; add `pipeline_version`, `sub_agent_models`, and `orchestrator_model` inside `analysis_data`. The generation body is now called directly from `POST /api/daily-digest`.
- **Files to change:** `handler.ts` (admin-portal daily-digest), `analysis-reliability.ts` (admin-portal), `openrouter.ts` (shared — add optional model argument to `callOpenRouter` if not already expressive enough).
- **DB migration:** N (`hod_analysis_cache` schema unchanged; extensions live inside `analysis_data`).
- **Dependencies:** 3.1 (D-01), 3.2 (D-03).
- **Complexity:** L.
- **Validation:**
  1. `GET /api/daily-digest` returns the existing response contract (`digest`, `report_count`, `total_departments`, `notes_count`, `missing_departments`, `signature`, `cached`, `generated_at`).
  2. Edit a single report for `briefDate` — cache miss triggered on next kick-off. Edit an operational dataset only (e.g. a stock flag) with no report change — composite signature still invalidates cache.
  3. Simulate one sub-agent failure — orchestrator still runs; response `degraded: true`; `isValidDigestText` gate still honoured.
  4. Direct route completes for a representative dataset on the admin `dev` branch; four Flash calls run in parallel in the generation module.
  5. `analysis_data` includes `pipeline_version`, `sub_agent_models`, and `orchestrator_model`.

### 3.4 — D-04: Feedback prompt injection + UI textareas

- **Description:** In each of the three AI route handlers (`analysis/generate/handler.ts` ~line 310, `daily-digest/handler.ts` ~line 199, `analysis/weekly-brief/route.ts` ~line 195), parse optional `feedback: string` from the request body, validate (`typeof === 'string'`, trim, reject with 400 when trimmed length > 500), and prepend a `[USER INSTRUCTION] … [/USER INSTRUCTION]` block to the first line of the user message when non-empty. In `AnalysisPanel.tsx`, add a `<textarea maxLength={500}>` beside the existing Regenerate controls (placeholder: "Optional: guidance for this regeneration…"), thread `feedback` through the existing `/api/analysis/generate` fetch body (primary button and cached Regenerate link). In `DailyDigestCard.tsx`, add the Regenerate control + feedback textarea that `POST`s to `/api/daily-digest` with `{ force: true, feedback }` (merging with 3.2). Do not persist `feedback` anywhere; do not log request bodies (audit existing `console.error` lines).
- **Files to change:** `handler.ts` (admin-portal analysis/generate), `handler.ts` (admin-portal daily-digest), `route.ts` (admin-portal weekly-brief), `AnalysisPanel.tsx`, `DailyDigestCard.tsx`.
- **DB migration:** N (feedback is transient; never written to `analysis_data`).
- **Dependencies:** 3.1 (D-01), 3.2 (D-03), 3.3 (D-02).
- **Complexity:** S.
- **Validation:**
  1. Submit Period analysis regeneration with feedback — output reflects the steering; `hod_analysis_cache` row contains no `feedback` key.
  2. Submit with empty feedback — baseline behaviour unchanged.
  3. Client bypass: POST a 600-character `feedback` directly — server responds 400 with no OpenRouter call.
  4. Inspect server logs during regeneration — no request body or raw `feedback` printed.
  5. `DailyDigestCard` Regenerate kicks the same direct `POST /api/daily-digest` path from 3.2, carrying `feedback`.

### Phase 3 — whole-phase validation

1. Local build + type-check passes across `admin-portal/`, `portal/`, and `packages/shared/`.
2. End-to-end daily brief: direct `POST` completes, cache is populated, UI renders the new brief with the four-sub-agent contributions reflected in tone (naturally communicative, not list dumps). `pipeline_version`, `sub_agent_models`, and `orchestrator_model` present in `analysis_data`.
3. End-to-end period analysis Regenerate with feedback — output steered; cache upsert clean.
4. End-to-end weekly brief Regenerate with feedback — output steered; signature-based cache read behaves consistently with daily.
5. Deliberate sub-agent failure — degraded brief surfaces; `degraded: true` carried through.
6. Record the v2.12 release in the Decision Log with commit SHAs and Netlify deploy IDs.

### Phase 3 — approval gate

**STATUS: awaiting-approval → approved**

Joshua reviews Phase 3 AI outputs against a sample day, signs `APPROVED: phase_3_complete` in `backlog.md`, and authorises the v2.12 release.

---

## References

- `backlog.md` — authoritative item list and Decision Log
- `handover/chat_2_handover.md`, `handover/chat_3_handover.md`, `handover/chat_4_handover.md`
- `implementation_context/A01_context.md` … `E01_context.md`
- `progress/README.md` — single phase tracker
- `progress/phase_1_checklist.md`, `progress/phase_2_checklist.md`, `progress/phase_3_checklist.md`
