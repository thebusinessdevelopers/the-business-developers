# HOD Daily Reports v2.12 Phase 3 Finishing Backlog

STATUS: in-progress
Version: 0.1
Date: 2026-04-26
Owner: Joshua Roy
Working path: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_3_finishing`
Audit source: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/v2.12_audit.md`

## Purpose

Phase 3 Finishing exists to complete the final necessary finishing work that can make v2.12 production-ready after the v2.12 audit.

This phase does not reopen the whole v2.12 scope. It focuses on the specific audit response decisions Joshua made on 26 Apr 2026:

- Accept the known release approval gate.
- Defer background/asynchronous AI generation to v2.13+.
- Refine the current synchronous Daily Brief solution for efficiency, reliability, and performance.
- Fix the cache freshness, auto-regeneration, and `RISKS AHEAD` issues.
- Engineer a practical test script and run it when Phase 3 Finishing is complete.
- Run release smoke checks and performance validation only after the finishing implementation is complete.

## Source-Of-Truth Order

When documents disagree, use this order:

1. This backlog for Phase 3 Finishing scope.
2. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/v2.12_audit.md`
3. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/README.md`
4. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_e_delivery.md`
5. Original Phase 1 source documents under `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_1_development/`

## Joshua Response To Audit Findings

| Audit finding | Joshua decision | Phase 3 Finishing action |
| --- | --- | --- |
| 1. Release approval gate is still open | Accepted and understood. | Keep as release governance. No technical work. |
| 2. Original D-03 async/no-timeout aim is not delivered as originally specified | Accept regression from background execution for now. Push async/background generation to v2.13+ with a new approach. | Do not restore Netlify Background Functions in v2.12. Refine current synchronous API solution. |
| 3. Daily Brief cache freshness check appears incorrect | Investigate, brainstorm, test solution, validate solution, and implement fixes in Phase 3. | Primary technical blocker. |
| 4. UI can auto-trigger regeneration when cache is marked stale | Investigate, brainstorm, test solution, validate solution, and implement fixes in Phase 3. | Primary technical blocker, linked to item 3. |
| 5. Optional `RISKS AHEAD` output is not parsed as its own UI section | Fix in Phase 3. | Small targeted UI/parser fix with regression test. |
| 6. Remaining release smoke checks are explicitly unvalidated | Run when Phase 3 is complete. | Create post-implementation smoke checklist; do not run before fixes land. |
| 7. Performance is not proven | Test performance when Phase 3 is complete. | Design simple performance measurement; run after fixes land. |
| 8. Automated regression coverage is too thin | Engineer and introduce a test script, then run it when Phase 3 is complete. | Add a practical release test script focused on v2.12 risk areas. |

## Phase Principles

- Simplicity first. Do not rebuild the AI architecture in v2.12.
- No return to the failed Netlify Background Function path.
- No production promotion or `main` push from this phase without Joshua's exact release approval token.
- Every production-code change must be driven by a failing test first.
- Prefer small, local fixes over broad refactors.
- Every investigation must explain why the work matters and what evidence supports its recommendation.
- Avoid assuming the audit diagnosis is complete; verify with code, tests, and counterexamples.

## Work Items

### P3F-01 — Daily Brief freshness and signature investigation

Goal: establish the exact intended freshness contract for `GET /api/daily-digest`, cached `analysis_data.signature`, report-row signatures, and sub-agent input hashes.

Required outputs:

- Investigation note under `investigations/`.
- Recommended simplest implementation.
- Failing test design proving the current bug.
- Validation plan proving the fix does not hide genuinely stale operational inputs.

Scope:

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/daily-digest/handler.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/daily-digest-generation.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/analysis-reliability.ts`

### P3F-02 — Daily Brief regeneration trigger investigation

Goal: determine when the dashboard should automatically regenerate, when it should poll, and when it should require explicit user action.

Required outputs:

- Investigation note under `investigations/`.
- Recommended client/server trigger policy.
- Failing test design for unnecessary regeneration prevention.
- Reliability guardrails for rate limits, repeated mounts, failed POSTs, and valid stale cache display.

Scope:

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/components/DailyDigestCard.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/daily-digest/handler.ts`

### P3F-03 — Daily Brief `RISKS AHEAD` parser fix

Goal: make the optional `RISKS AHEAD` section render as a first-class Daily Brief section.

Required outputs:

- Small parser test design.
- Implementation plan for recognising `RISKS AHEAD`.
- Validation that existing four-section briefs still render unchanged.

Scope:

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/components/DailyDigestCard.tsx`

### P3F-04 — v2.12 release test script

Goal: engineer a simple repeatable test script that can be run at the end of Phase 3 Finishing.

Required outputs:

- Proposed script location and command.
- List of checks the script should run.
- Clear separation between automated local checks and manual/live authenticated checks.
- Recommendation on whether this should be one script or a small set of scripts.

Minimum coverage:

- Admin tests.
- Admin and portal type-checks.
- Admin and portal builds.
- Admin and portal lint.
- Daily Brief regression tests.
- Accommodation calculation tests where practical.
- Report-date guard and queue guard tests where practical.

### P3F-05 — Post-implementation smoke and performance plan

Goal: prepare the exact checks to run after Phase 3 Finishing is implemented.

Required outputs:

- Post-implementation smoke checklist.
- Performance measurement checklist.
- Success thresholds or, where thresholds do not yet exist, proposed release thresholds for Joshua to approve.

Must cover:

- Authenticated Daily Brief regenerate and cache-read path.
- Dashboard GET/cache latency.
- Admin booking flows touched in v2.12.
- HOD report submit lag guard.
- Queue replay guard.
- Meeting attendance mode.
- Logo and v2.11 regression smokes.

### P3F-06 — v2.13+ async AI backlog note

Goal: preserve the deferred async/background AI requirement without contaminating v2.12 finishing work.

Required outputs:

- Short note defining what was deferred.
- Lessons from the v2.12 background-function failure.
- Constraints for the future v2.13+ approach.

## Investigation Swarm Requirements

All investigation/reasoning sessions for this phase must be conducted by focused subagents using model `composer-2-fast`.

Subagent rules:

- One specific task per agent.
- Read-only investigation unless explicitly promoted to implementation later.
- Return concrete findings with file paths, proposed tests, risks, and recommended simplest action.
- Challenge the audit where evidence disagrees; do not treat the audit as automatically correct.
- Prefer real code evidence over assumptions.

## Initial Decision Log

| Date | Decision | Owner |
| --- | --- | --- |
| 2026-04-26 | Phase 3 Finishing opened from `v2.12_audit.md`. Joshua accepts the release gate, defers async/background AI execution to v2.13+, and directs this phase to refine the current synchronous Daily Brief solution, fix findings 3-5, create a test script, then run smoke and performance checks after implementation. | Joshua |
| 2026-04-26 | Initial `composer-2-fast` investigation swarm completed for P3F-01 through P3F-06 and testability. Outputs documented under `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_3_finishing/investigations/`. Implementation plan drafted at `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_3_finishing/implementation_plan.md`. | Cursor GPT-5.5 |
| 2026-04-26 | Tasks 1–3 implemented. Task 1: added `tsx` dev dependency, updated test script to run `.test.mjs` and `.test.ts`. Task 2: extracted `parseDigestSections` to `lib/daily-brief-sections.ts` with `RISKS AHEAD` support; removed inline parser from `DailyDigestCard.tsx`. Task 3: extracted auto-regeneration policy to `lib/daily-digest-regeneration-policy.ts`; auto-kick now `pending`-only with `force: false`; manual Regenerate keeps `force: true`; stale-with-digest shows banner instead of auto-posting; 15s polling only for `pending`. Validation: `npm test -w admin-portal` 33/33 pass, `npx tsc --noEmit` clean, `npm run lint` 0 errors (13 pre-existing warnings). Tasks 4–7 remain pending. | Cursor Opus 4.6 |
| 2026-04-27 | Tasks 4–5 completed. Task 4: shared composite Daily Brief signature/freshness helper now builds the same report-plus-operational-input signature for `GET /api/daily-digest` and `runDailyDigestGeneration`; operational array order is normalised for the cache signature; stale cache still requires manual Regenerate. Task 5: created executable `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/scripts/release-test-v212-local.sh`; no manual/live smoke or performance validation was run. Validation from `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development`: `npm test -w admin-portal` exit 0, 40/40 pass; `npx tsc --noEmit -p admin-portal/tsconfig.json` exit 0; `npx tsc --noEmit -p portal/tsconfig.json` exit 0; `npm run lint -w admin-portal` exit 0 with 0 errors and 13 warnings; `npm run lint -w portal` exit 0 with 0 errors and 4 warnings; `npm run build -w admin-portal` exit 0; `npm run build -w portal` exit 0; `./scripts/release-test-v212-local.sh` exit 0, including `npm install` audit output of 5 vulnerabilities (2 moderate, 3 high). Tasks 6+ remain pending. | Cursor GPT-5.5 |
| 2026-04-28 | Tasks 6–7 documentation updated. The implementation plan remains final with Joshua's three approvals: stale-but-renderable Daily Brief cache does not auto-regenerate, synchronous Daily Brief `POST` numeric thresholds are approved only after the performance run, and portal automated tests stay minimal. Tasks 1–5 summary: test runner fixed, `RISKS AHEAD` parser extracted and wired, Daily Brief auto-regeneration made `pending`-only, composite freshness/signature shared between `GET` and generation, and `release-test-v212-local.sh` created. Previously recorded local release gate result: `./scripts/release-test-v212-local.sh` exit 0/passed from `4_development`. Manual checklist created at `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_3_finishing/release_manual_v212.md`. Manual/live smoke and performance validation remain pending; Phase 3 is not final and is not release-ready until those checks are run and Joshua approves readiness. | Cursor GPT-5.5 |
