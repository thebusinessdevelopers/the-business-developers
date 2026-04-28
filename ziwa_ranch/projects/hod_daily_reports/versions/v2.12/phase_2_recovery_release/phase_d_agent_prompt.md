# Phase D Agent Prompt — v2.12 Recovery

STATUS: complete
Date: 2026-04-23
Phase boundary: **Phase D only**

Use this prompt for the implementation agent responsible for Phase D (live validation gate) of the v2.12 recovery effort. Phases A (orchestration fix), B (schema alignment), and C (deploy refresh) are all complete. Both `dev--` aliases now serve v2.12 code from fresh Netlify builds.

---

## Mission

Validate that the refreshed `dev--` Netlify aliases meet the approved v2.12 Phase 3 contract end-to-end. Run browser automation, API calls, and database reads against the live dev aliases. Clean up any test data created. Produce a release recommendation.

Do **not** make any code changes. Do **not** change the database schema. Do **not** push to deploy repos. Do **not** promote anything to `main`. You must stop at the end of Phase D and hand back with a release recommendation.

---

## Read first, in this order

1. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_c_delivery.md`
2. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_two_plan.md` §§Phase D
3. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/tests.md/20_04_test.md`
4. `/Users/joshuaroy/the-business-developers/global/sops/browser_use.md`

Resolved facts you do **not** need to re-investigate:

- Active app DB = `inidzwfjnkyinxhvbrdt`; both dev sites' `NEXT_PUBLIC_SUPABASE_URL` point to it.
- `hod_analysis_cache.period_type` CHECK accepts `report`, `day`, `week`, `month`, `trend_alert`, `daily_brief`, `weekly_brief` (Phase B complete).
- Admin deploy: commit `67bb8e1` on `dev`, Netlify deploy ID `69e9cfc631266e0008bdb0f7`, state `ready`.
- Portal deploy: commit `86892a0` on `dev`, Netlify deploy ID `69e9d060123ba100087ce1f9`, state `ready`.
- `packages/shared` is byte-identical across both deploy repos.
- Admin serves logo from `public/logo.png` (no route). Portal serves logo from `app/logo.png/route.ts` (no public file).
- Admin test login password: `ziwa2026`.
- Phase A orchestration fix: `maxTokens: 2000`, `excludeReasoning: true`, em-dash header sanitisation, sub-agent outcome classification.
- Phase A regression harness: 24 tests under `admin-portal/__tests__/`.

---

## Scope allowed

You may only:

- Make HTTP requests (browser automation, `curl`, `fetch`) against the `dev--` aliases:
  - `https://dev--hod-admin-portal.netlify.app`
  - `https://dev--hoddailyreports.netlify.app`
- Read from the Supabase database `inidzwfjnkyinxhvbrdt` via MCP `execute_sql` (SELECT only).
- Delete or soft-delete test data you created during validation (cleanup).
- Write files within `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/` (delivery note and next prompt).
- Update `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/backlog.md` Decision Log.

---

## Forbidden actions

Do **not**:

- Change any TypeScript / TSX / JS / SQL file in the monorepo or deploy repos.
- Run any Supabase MCP migration or `execute_sql` DDL (no `ALTER`, `CREATE`, `DROP`, `INSERT`, `UPDATE`, `DELETE` except for D7 cleanup).
- Push to deploy repos.
- Promote anything to `main`.
- Start any work beyond the Phase D boundary.

---

## Required validation checklist

### D1. Deploy freshness

- `dev--hod-admin-portal.netlify.app` deploy metadata shows commit SHA `67bb8e1` (admin Phase C commit).
- `dev--hoddailyreports.netlify.app` deploy metadata shows commit SHA `86892a0` (portal Phase C commit).
- Verify via Netlify API (`GET /api/v1/sites/{site_id}/deploys?per_page=1`) that both `dev` deploys are `ready`.

### D2. Admin Phase 3 API contract

- `POST /api/daily-digest` with valid admin session → **202** with `{ accepted: true, brief_date }` in under 2 s.
- `GET /api/daily-digest` → cache response (`{ pending: true }`, `{ stale: true, ... }`, or fresh digest) in well under 2 s. The ~8.5 s stall from 20 Apr must be gone.
- `POST /api/analysis/generate` with 600-char `feedback` → **400**; with valid feedback → **200**.
- `POST /api/analysis/weekly-brief` with 600-char `feedback` → **400**.

### D3. Background function + cache persistence

- Netlify Functions UI (or API) shows a `daily-digest-background` invocation that completes.
- `hod_analysis_cache` row with `period_type = 'daily_brief'` for the test `briefDate` carries:
  - `pipeline_version = 'v2.12-multi-agent'`
  - `sub_agent_models` containing `google/gemini-2.5-flash`
  - `orchestrator_model` containing `anthropic/claude-sonnet-4.5`
  - `degraded === false`
- No `feedback` key appears anywhere in `analysis_data`.

### D4. UI smoke

- Admin overview Daily Brief card shows a **Regenerate** control in the header.
- Expanding reveals a `maxLength={500}` textarea + **Start regeneration** button.
- Clicking flips the card to pending, then to a fresh digest within a few minutes; polling at 15 s while pending, reverting to 5 min when fresh.

### D5. Assets and cross-site sanity

- `/logo.png` returns 200 on both sites.
- Portal booking flows load (`BookingManagerModal`, `RoomsTab`).
- `POST /api/submit-report` with a 2-day-lagged `report_date` and no `confirm_offset` → soft-confirm 4xx; with `confirm_offset: true` → 200.

### D6. Regression — deferred Phase 2 smokes

Run the carry-over Phase 2 browser smokes that were blocked by stale deploys in `20_04_test.md §7`. All must pass.

### D7. Cleanup

For every test-created row (cache writes, bookings, reports, threads, notifications):

- Delete or soft-delete after D3–D6.
- Document the exact `period_type`/`period_key` or row ID removed in the Decision Log.

---

## Gate D

All of D1–D6 must pass. D7 cleanup must be complete and documented.

Stop immediately if any check fails. Do not attempt fixes — document the failure and hand back with a recommendation.

Only after Gate D passes should Joshua be asked for `APPROVED: phase_3_complete`. Only after that approval should any `main` promotion be considered (out of scope for this plan).

---

## Documentation requirements before handoff

Phase D is **not complete** until you write both files below:

1. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_d_delivery.md`
2. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_release_recommendation_prompt.md`

### `phase_d_delivery.md` must include

- `STATUS:` token
- date
- full validation result summary (pass/fail per D1–D6)
- exact browser / API / database checks run
- deploy IDs and commit SHAs validated
- cleanup log (D7)
- any residual risks
- release recommendation: ready / not ready for Joshua sign-off

### `phase_release_recommendation_prompt.md` must include

- mission: release recommendation only (no production promotion unless Joshua has already signed `APPROVED: phase_3_complete`)
- read-first file list (include `phase_d_delivery.md`, `phase_two_plan.md`, and `backlog.md`)
- exact allowed scope (documentation only — no code, no deploys)
- explicit instruction that `main` promotion requires Joshua's explicit approval token
- summary of what was validated and what was not
- any conditions or caveats on the release recommendation

Also update `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/backlog.md` Decision Log with:

- the validation outcome (pass/fail per check)
- deploy IDs and commit SHAs validated
- cleanup log
- absolute paths to `phase_d_delivery.md` and `phase_release_recommendation_prompt.md`

---

## Delivery format in chat

When Phase D is complete, return a concise summary containing:

1. overall pass/fail verdict
2. per-check results (D1–D6)
3. cleanup summary (D7)
4. any residual risks or conditions
5. release recommendation
6. exact paths written for `phase_d_delivery.md` and `phase_release_recommendation_prompt.md`

Do not continue past Phase D. Do not promote to `main`.

---

## Final instruction

Execute **Phase D only**. Validate both `dev--` aliases against the v2.12 Phase 3 contract. Clean up test data. Write the handoff artefacts. Then stop and hand back with a release recommendation.
