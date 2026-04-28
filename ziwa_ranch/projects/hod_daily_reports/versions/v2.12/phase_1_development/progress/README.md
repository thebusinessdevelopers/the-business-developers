# v2.12 Progress Tracker

> One row per deliverable, grouped by phase. Update `Status` as work progresses and record the commit SHA or evidence link in the Decision Log.

## Phase 1 — Database Migrations

| Item | Title | Complexity | Owner | Status | Completion criteria |
|------|-------|------------|-------|--------|---------------------|
| 1.1 | A-03 + A-04 — Augustu `pricing_type` + pax | S | | Completed | `042_v212_augustu.sql` applied; column present with CHECK; Augustu = per_person, max_adults = 3 |
| 1.2 | A-05 — Chalet pax correction | XS | | Completed | `043_v212_chalet_pax.sql` applied; all four chalets at 2+2+cot, `beds` preserved |
| 1.3 | A-06 + A-07 data — Rate corrections | M | | Completed | `044_v212_a06_rate_corrections.sql` applied; smoke queries in §1.3 all pass |
| 1.4 | A-08 — A-Frame rename | XS | | Completed | `045_v212_aframe_rename.sql` applied; four new names present, placeholders removed |
| 1.5 | B-01/B-02 — No DDL | — | | Completed | Recorded as no-DDL in Decision Log; Phase 2.8 covers the application work |
| 1.6 | C-01 — Stuck-row date corrections | S | | Completed | Joshua confirmed `report_date = 2026-04-18` correct for both rows; no migration required; `046` deleted |

## Phase 2 — Form + Logic Fixes

| Item | Title | Complexity | Owner | Status | Completion criteria |
|------|-------|------------|-------|--------|---------------------|
| 2.1 | A-01 — Verify Isaac access | XS | | Deferred (manual) | Sign-in as `admin.isaac` reaches Room Management; no code change |
| 2.2 | A-02 — Per-room complimentary toggle | M | | Completed | `isComplimentary`/`compReason` on `RoomBasketItem`; rate helpers skip comp rows; toggle in both booking UIs; admin + approve routes exclude comp from totals |
| 2.3 | A-03 — Per-person pricing branch | M | | Completed | `pricing_type` threaded through types, rate helpers, basket construction, and all four typed API projections |
| 2.4 | A-05 — Admin pax soft override | M | | Completed | `adminOverride` flag added to `validateAccommodationWrite`; admin POST+PUT routes pass it through; `BookingForm` prompts via `window.confirm`; HOD portal remains strict |
| 2.5 | A-06 — Rate-display verification | XS | | Deferred (manual) | Rate corrections applied in Phase 1.3; no code change; manual smoke after deploy |
| 2.6 | A-07 — Admin year selector | S | | Completed | Year `<select>` above tab strip in `AccommodationClient.tsx`; collapsible rates reference filtered locally; `BookingForm` still check-in-driven |
| 2.7 | A-08 — Config constant check | XS | | Completed | Grep confirmed zero runtime hardcoded A-Frame placeholder names |
| 2.8 | B-01/B-02 — Meeting attendance | S | | Completed | Florence/Julie/Faith/Isaac added to `CORE_ATTENDEE_USERNAMES`; optional `attendance_mode` on `MeetingAttendee`; per-row mode control + detail-view rendering |
| 2.9 | C-01 — Server guard + retry + banner | S | | Completed | Kampala-lag guard before duplicate check; `FormRenderer` confirm-retry + lag banner; `useSubmissionQueue` retries queued submissions with `confirm_offset: true` |
| 2.10 | E-01 — Auto-save queue guard | XS | | Completed | `FormRenderer` queue callback now guards on `departmentId` + `reportDate` + normalised `submittedBy` |

## Phase 3 — AI Infrastructure

> As-built note, 26 Apr 2026: Phase 3 originally shipped with a Netlify Background Function. Phase E removed that path after D3/D2 failures and made `POST /api/daily-digest` run `runDailyDigestGeneration()` synchronously. `../../phase_2_recovery_release/phase_e_delivery.md` is the current Daily Brief architecture source of truth.

| Item | Title | Complexity | Owner | Status | Completion criteria |
|------|-------|------------|-------|--------|---------------------|
| 3.1 | D-01 — Model upgrade + env vars | XS | | Completed | `OPENROUTER_MODEL` / `OPENROUTER_MODEL_FAST` env-driven with Sonnet 4.5 / Gemini 2.5 Flash defaults; `admin-portal/.env.example` + `[build.environment]` defaults added |
| 3.2 | D-03 — Direct Daily Brief `POST` regeneration | M | | Completed | `POST /api/daily-digest` auth-gates and calls `runDailyDigestGeneration()` directly; `GET` remains cache-read-only (fresh/stale/pending); removed `daily-digest-background.ts` and internal-auth helper; weekly-brief cache is signature-based |
| 3.3 | D-02 — Multi-agent pipeline | L | | Completed | Four Gemini Flash sub-agents (Occupancy / Stock / Compliance / Action items) via `Promise.allSettled` feed Sonnet 4.5 orchestrator inside the shared generation module; composite signature = reports-hash + SHA of sub-agent inputs; `pipeline_version`, `sub_agent_models`, `orchestrator_model` persisted inside `analysis_data`; optional RISKS AHEAD section |
| 3.4 | D-04 — Feedback prompt injection | S | | Completed | `feedback` parsed + validated (≤ 500 chars after trim → 400) and prepended as `[USER INSTRUCTION]` to period analysis, daily brief, and weekly brief prompts; textareas on `AnalysisPanel` and `DailyDigestCard`; `feedback` never persisted in `analysis_data`; no request bodies logged |

---

## Approval gates

| Gate | Token | Evidence required |
|------|-------|-------------------|
| End of Phase 1 | `APPROVED: phase_1_complete` | Migrations applied, smoke queries pass, C-01 dates confirmed |
| End of Phase 2 | `APPROVED: phase_2_complete` ✓ — Joshua, 20 Apr 2026 | All 10 form/logic items validated, TypeScript clean, end-to-end smokes green |
| End of Phase 3 | `APPROVED: phase_3_complete` | Daily/weekly briefs re-generating via current direct/cache paths, feedback steering verified, logs audited |

Record each approval in `backlog.md`'s Decision Log with the date and SHA.
