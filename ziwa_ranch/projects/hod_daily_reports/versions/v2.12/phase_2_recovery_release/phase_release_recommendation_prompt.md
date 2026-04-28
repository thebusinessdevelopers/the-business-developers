# Phase Release Recommendation Prompt — v2.12 Recovery

STATUS: awaiting-approval
Date: 2026-04-26 (updated after Phase E)
Phase boundary: **Release recommendation only**

Use this prompt for the agent responsible for producing the final release recommendation after Phase E. **Do not promote to `main` unless Joshua has explicitly signed `APPROVED: phase_3_complete`.**

---

## Mission

Produce a release recommendation for v2.12 Phase 3. No code changes. No deploys. No `main` promotion unless Joshua has already signed `APPROVED: phase_3_complete`.

---

## Read first, in this order

1. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_e_delivery.md` (Phase E direct Daily Brief regeneration recovery)
2. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_d2_delivery.md`
3. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_d_delivery.md`
4. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_two_plan.md`
5. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/backlog.md`

---

## Scope allowed

You may only:

- Read files within the monorepo and version folder.
- Read from the Supabase database `inidzwfjnkyinxhvbrdt` via MCP `execute_sql` (SELECT only).
- Write documentation files within `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/`.
- Update the Decision Log in `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/backlog.md`.

---

## Forbidden actions

Do **not**:

- Change any code file.
- Run any Supabase DDL or DML.
- Push to deploy repos.
- Promote anything to `main` unless Joshua has explicitly signed `APPROVED: phase_3_complete`.
- Start any implementation work.

---

## Prerequisite: Phase E must have closed the Daily Brief blocker

This prompt should only be used after Phase E has confirmed:

- The Daily Brief regeneration blocker is resolved on the admin `dev` branch.
- The live `daily_brief` cache row has the expected v2.12 payload shape.
- Temporary debug instrumentation has been removed.
- The final deploy is Git-backed and `ready` on Netlify.

If these conditions are not true, do not proceed. Hand back to Joshua with the current state.

---

## Current state (as of Phase E, 2026-04-26)

### Phase D runs to date

**Phase D (first run, 2026-04-23):**

| Check | Result |
|-------|--------|
| D1 — Deploy freshness | PASS — Admin `67bb8e1`, Portal `86892a0`, both `ready` |
| D2 — Admin Phase 3 API contract | PASS — POST 202, GET cache-read in 1 s, feedback validation works |
| D3 — Background function + cache persistence | FAIL — BG function URL resolves to main site (404) |
| D4–D6 | NOT RUN |
| D7 — Cleanup | COMPLETE — 2 test rows deleted |

**Phase D2 (BG URL fix, 2026-04-23):**

| Check | Result |
|-------|--------|
| URL fix deployed | PASS — Commit `92e994a`, deploy `69ea694b3108bc00089fd4c6`, `ready` |
| Post-deploy curl validation | PASS — dev alias → 202, main → 404 |
| Authenticated POST | PASS — 202 from browser session |
| D3 re-run — BG function + cache persistence | FAIL — BG function accepts invocations but never writes `daily_brief` row |
| D4–D6 | NOT RUN |
| D7 addendum — Cleanup | COMPLETE — 1 test row deleted |

**Phase E (simplification and direct regeneration, 2026-04-26):**

| Check | Result |
|-------|--------|
| Architecture decision | PASS — removed the fragile Netlify Background Function path; `/api/daily-digest` calls `runDailyDigestGeneration()` directly |
| Admin deploy | PASS — latest `dev` commit `667fbb1`, deploy `69edb406f7116b00080efc1d`, `ready` |
| Background function removal | PASS — Netlify deploy lists only `___netlify-server-handler`; `daily-digest-background` is absent |
| Auth gate | PASS — unauthenticated live `POST /api/daily-digest` returns 401 |
| D3 replacement gate — cache persistence | PASS — latest `daily_brief` row for `2026-04-25` has `pipeline_version = v2.12-multi-agent`, 2,937 digest characters, 7 reports, 16 departments, `missing_departments` array, and no `degraded` key |
| Dashboard regeneration | PASS — Joshua observed the Daily Brief updated at 09:13 with the expected 7/16 report state |
| Debug cleanup | PASS — temporary local debug logging removed in commit `bd074be` |
| Regression lock | PASS — `npm test` runs `__tests__/daily-digest-api-origin.test.mjs`, asserting direct generation, no `daily-digest-background`, no `buildInternalHeaders`, `GET, POST` route export, and hard failure on cache upsert errors |

### What has been validated across both runs

- D1: Deploy freshness (admin `67bb8e1` → `92e994a`, portal `86892a0`)
- D2: Admin Phase 3 API contract (POST 202, GET < 2s, feedback validation)
- URL fix: `resolveBackgroundBaseUrl()` correctly targets `DEPLOY_PRIME_URL` on branch deploys
- Fetch status guard: non-202 BG function responses are now logged
- Phase E direct path: `POST /api/daily-digest` now runs generation synchronously and returns the generated payload
- Supabase persistence: `hod_analysis_cache.period_type = 'daily_brief'` now contains the expected v2.12 row shape

### What remains unvalidated

- D5: `/logo.png` on both sites, portal booking flows, submit-report offset guard were not re-run in Phase E.
- D6: Phase 2 carry-over browser smokes from `20_04_test.md §7` were not re-run in Phase E.
- Full `npm run lint` still fails on pre-existing shared-package baseline issues outside the Daily Brief change-set.

### Blocker

The Daily Brief blocker is resolved on admin `dev` by replacing the background-function queue with direct API generation. The background function should not be restored unless a new asynchronous-generation requirement is explicitly approved.

---

## Conditions on any release recommendation

1. `main` promotion requires Joshua's explicit `APPROVED: phase_3_complete` token.
2. The release recommendation must cite `phase_e_delivery.md` as the current Daily Brief source of truth.
3. If the recommendation requires a full Phase D matrix, run the remaining D5-D6 smoke checks before issuing a final green verdict.
4. Do not require a successful `POST → BG function → cache row` test; the background function is no longer part of the production architecture.

---

## Documentation outputs

When producing the release recommendation, update the Decision Log in `backlog.md` with:

- The full Phase D re-run results (pass/fail per check).
- Deploy IDs and commit SHAs validated.
- Any additional cleanup performed.
- The release recommendation verdict and any conditions.
- Absolute paths to all Phase D delivery artefacts.

---

## Final instruction

Produce a release recommendation only. Do not promote to `main` unless Joshua has signed `APPROVED: phase_3_complete`. If Phase D has not fully passed, do not proceed.
