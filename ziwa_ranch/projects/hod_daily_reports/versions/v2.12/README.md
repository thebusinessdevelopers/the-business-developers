# HOD Daily Reports v2.12

STATUS: recovery complete on admin `dev`; final release approval still required.

v2.12 is the post-v2.11 field-feedback release. It covered accommodation corrections, HOD meeting attendance, report-date integrity, AI infrastructure, and HOD form experience fixes. The release then went through a recovery sequence to make the new Daily Brief pipeline reliable on the live admin `dev` branch.

Do not promote v2.12 to `main` unless Joshua gives the exact release approval token required by the project SOP.

---

## Current State

The Daily Brief blocker is resolved on admin `dev`.

Current production path:

```text
Admin dashboard Regenerate
  -> POST /api/daily-digest
  -> runDailyDigestGeneration()
  -> hod_analysis_cache daily_brief row
  -> DailyDigestCard renders returned payload
```

The earlier Netlify Background Function path is no longer the production architecture. Do not reintroduce `daily-digest-background` unless a new asynchronous-generation requirement is explicitly approved.

Latest validated admin deploy:

| Item | Value |
| --- | --- |
| Admin branch | `dev` |
| Admin commit | `667fbb1` |
| Netlify deploy | `69edb406f7116b00080efc1d` |
| Deploy state | `ready` |
| Runtime function listed by Netlify | `___netlify-server-handler` only |
| Daily Brief cache row | `daily_brief / 2026-04-25` |
| Pipeline version | `v2.12-multi-agent` |

Latest verification summary:

- `npm test` passes in the admin deploy repo and monorepo mirror.
- `npx tsc --noEmit` passes in the admin deploy repo and monorepo mirror.
- `npm run build` passes in the admin deploy repo.
- Live unauthenticated `POST /api/daily-digest` returns `401`, confirming the route is active and auth-gated.
- Supabase `hod_analysis_cache` contains a fresh v2.12 `daily_brief` row with digest, report counts, model metadata, and no `degraded` key.
- Full `npm run lint` still fails only on known shared-package baseline issues outside the Daily Brief recovery.

---

## Start Here

| Need | Read |
| --- | --- |
| Quick current status | This README, then `phase_2_recovery_release/phase_e_delivery.md` |
| Full scope and decision history | `phase_1_development/backlog.md` |
| Original implementation plan | `phase_1_development/plan.md` |
| Phase/item progress | `phase_1_development/progress/README.md` |
| Daily Brief recovery story | `phase_2_recovery_release/README.md` |
| Final release recommendation instructions | `phase_2_recovery_release/phase_release_recommendation_prompt.md` |
| Original item-by-item build context | `phase_1_development/implementation_context/` |
| Original stakeholder asks | `phase_1_development/joshua_feedback.md`, `phase_1_development/head_office_feedback.md` |
| Test report | `phase_1_development/tests.md/20_04_test.md` |

---

## Folder Map

| Folder / file | Purpose |
| --- | --- |
| `phase_1_development/` | Original v2.12 development package: scope, plan, progress, implementation context, handovers, stakeholder feedback, pre-build investigations, and 20 Apr test evidence. |
| `phase_2_recovery_release/` | April 2026 recovery and release package: Phase A-E investigations, delivery notes, superseded background-function debugging, and final release recommendation prompt. |
| `README.md` | Root navigation only. Keep this file as the two-folder map and current status summary. |

---

## What v2.12 Changed

### Phase 1 - Database Migrations

Phase 1 applied the data and schema foundation:

- Augustu gained `pricing_type = per_person` and corrected adult capacity.
- Kirungi, Murungi, The Family, and The Clan received corrected pax configurations.
- Accommodation rates were corrected for Karungi, Barungi, Single Room, A-Frames, camping, and 2027 variants.
- A-Frame names were changed to Mvule, Musambya, Mugavu, and Mukooge.
- C-01 stuck-row date correction was reviewed and required no row update.

Canonical detail:

- `phase_1_development/plan.md`
- `phase_1_development/progress/phase_1_checklist.md`
- `phase_1_development/backlog.md` Decision Log entries for 20 Apr 2026

### Phase 2 - Form And Logic Fixes

Phase 2 implemented the application behaviour:

- Per-room complimentary booking rows.
- Per-person pricing for Augustu.
- Admin pax soft override while keeping HOD portal strict.
- Admin rates year selector.
- Head Office meeting attendees and phone/in-person attendance mode.
- Kampala report-date guard, confirmation retry, and lag banner.
- Auto-save queue guard for the HOD form experience.

Manual smoke checks still marked as deferred in the progress files include some visual/rate checks that require signed-in browser validation.

Canonical detail:

- `phase_1_development/progress/phase_2_checklist.md`
- `phase_1_development/handover/phase_2_handover.md`
- `phase_1_development/backlog.md` Decision Log entries for 20 Apr 2026

### Phase 3 - AI Infrastructure

Phase 3 introduced the multi-agent Daily Brief and feedback-driven AI analysis:

- OpenRouter model variables: `OPENROUTER_MODEL` and `OPENROUTER_MODEL_FAST`.
- Four fast sub-agents feeding a Sonnet orchestrator for the Daily Brief.
- v2.12 Daily Brief cache payload metadata: `pipeline_version`, `sub_agent_models`, `orchestrator_model`, and composite signature.
- Optional `RISKS AHEAD` Daily Brief section.
- Regenerate feedback textareas for period analysis and Daily Brief.
- Weekly brief signature-based cache read parity.

Important as-built change:

- The original plan used a Netlify Background Function.
- Phase E replaced that with direct synchronous generation in `POST /api/daily-digest`.
- This direct path is the current production architecture.

Canonical detail:

- `phase_1_development/progress/phase_3_checklist.md`
- `phase_2_recovery_release/phase_e_delivery.md`
- `phase_1_development/backlog.md` Decision Log entries for 22-26 Apr 2026

---

## Recovery Timeline

The AI/Daily Brief work needed a separate recovery sequence after the first implementation.

| Phase | Date | Outcome |
| --- | --- | --- |
| Phase A | 22 Apr 2026 | Fixed OpenRouter header and token-length issues; local generation worked. |
| Phase B | 23 Apr 2026 | Expanded `hod_analysis_cache.period_type` CHECK to include `daily_brief`, `weekly_brief`, and `trend_alert`. |
| Phase C | 23 Apr 2026 | Mirrored monorepo source into deploy repos and pushed `dev`. |
| Phase D | 23 Apr 2026 | Failed at D3 because the background function URL resolved to the main site. |
| Phase D2 | 23 Apr 2026 | URL fix deployed, but background function accepted 202 and still never wrote `daily_brief`. |
| Phase E | 26 Apr 2026 | Simplified architecture: removed background function, direct API regeneration now writes the v2.12 `daily_brief` row. |

Start with:

- `phase_2_recovery_release/phase_e_delivery.md`
- `phase_2_recovery_release/README.md`

Use earlier Phase A-D files only when diagnosing the path that led to Phase E.

---

## How To Diagnose v2.12

### If Daily Brief Looks Wrong

1. Check the latest `hod_analysis_cache` row where `period_type = 'daily_brief'`.
2. Confirm `analysis_data->>'pipeline_version' = 'v2.12-multi-agent'`.
3. Confirm `report_count`, `total_departments`, and `missing_departments` match the dashboard.
4. Check authenticated `POST /api/daily-digest` response shape.
5. Read `phase_2_recovery_release/phase_e_delivery.md`.

Do not start by investigating Netlify Background Functions. That path is historical.

### If A Booking Or Accommodation Rate Looks Wrong

1. Check the relevant item in `phase_1_development/backlog.md` Track A.
2. Read the matching file in `phase_1_development/implementation_context/`.
3. Check `phase_1_development/progress/phase_1_checklist.md` for migration evidence.
4. Check `phase_1_development/progress/phase_2_checklist.md` for UI/application behaviour.

### If Report Submission Dates Look Wrong

1. Read C-01 in `phase_1_development/backlog.md`.
2. Read `phase_1_development/implementation_context/C01_context.md`.
3. Check `phase_1_development/progress/phase_2_checklist.md` section 2.9.

### If Meeting Attendance Looks Wrong

1. Read B-01/B-02 in `phase_1_development/backlog.md`.
2. Read `phase_1_development/implementation_context/B0102_context.md`.
3. Check `phase_1_development/progress/phase_2_checklist.md` section 2.8.

---

## Source-Of-Truth Rules

- Current status: this README, `phase_1_development/backlog.md` latest Decision Log entries, and `phase_2_recovery_release/phase_e_delivery.md`.
- Intended scope: `phase_1_development/backlog.md` and `phase_1_development/plan.md`.
- Item-level implementation detail: `phase_1_development/implementation_context/`.
- Historical handovers: `phase_1_development/handover/`.
- Historical investigations: `phase_1_development/investigations/phase_one/` and most of `phase_2_recovery_release/`.
- Superseded background-function debugging: `phase_2_recovery_release/phase_e_bg_debug_prompt.md`.

When files disagree, prefer the most recent dated delivery file and the latest Decision Log entry. As of 26 Apr 2026, `phase_e_delivery.md` supersedes all earlier Daily Brief background-function assumptions.

---

## Remaining Release Work

Before final v2.12 release recommendation or promotion:

1. Decide whether to run the broader D5-D6 smoke checks from `phase_2_recovery_release/phase_release_recommendation_prompt.md`.
2. Decide whether full lint green is required now or whether the known shared-package lint baseline can be tracked separately.
3. Produce the release recommendation from `phase_2_recovery_release/phase_release_recommendation_prompt.md`.
4. Only promote after Joshua gives the exact required approval token.
