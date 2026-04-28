# Phase 3 Finishing Investigation Swarm Synthesis

STATUS: in-progress
Date: 2026-04-26
Model requirement used: `composer-2-fast`
Backlog: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_3_finishing/backlog.md`

## Purpose

This file records the first Phase 3 Finishing investigation swarm. The swarm was read-only and focused on turning the v2.12 audit findings into a simple, test-led implementation direction.

## Swarm Tasks Run

| Task | Focus | Outcome |
| --- | --- | --- |
| P3F-01 | Daily Brief cache freshness and composite signature | Audit finding confirmed. GET uses report-only signature while generation stores report-plus-inputs signature. |
| P3F-02 | Regeneration trigger policy | Recommended auto-generation only for `pending`, not `stale`; auto path should use `force: false`; manual Regenerate keeps `force: true`. |
| P3F-03 | `RISKS AHEAD` parsing | Audit finding confirmed. Parser should recognise `RISKS AHEAD` as a first-class section. |
| P3F-04 | Release test script | Recommended a local non-destructive release script plus a separate manual/live checklist. Current `npm test` misses `.test.ts` files. |
| P3F-05 performance | Performance validation | Recommended proportional real-world timing, not heavy load testing: cached GET, synchronous POST, browser timing, and documented thresholds. |
| P3F-05 smoke | Post-implementation smoke matrix | Produced D5/D6 and carry-over smoke checklist using Phase E contract, not superseded background-function expectations. |
| P3F-06 | v2.13+ async deferment | Preserve async/background AI as v2.13+ work; do not restore Netlify Background Functions in v2.12. |
| Testability | Minimal test seams | Recommended small pure helpers for freshness, parsing, and auto-regeneration policy; avoid broad refactors. |

## Cross-Agent Agreement

All relevant agents agreed on these points:

- The Daily Brief signature bug is real and must be fixed before release.
- The current synchronous architecture should be refined, not replaced, in v2.12.
- Auto-regeneration on `stale` is too expensive and too risky for the current synchronous multi-LLM path.
- The optional `RISKS AHEAD` section needs a small parser fix and regression test.
- The existing test command is misleading because it only runs `.test.mjs` files.
- Phase 3 Finishing needs a local automated release gate plus a separate manual/live smoke and performance report.

## Recommended Technical Direction

The simplest credible v2.12 finishing implementation is:

1. Create a shared Daily Brief freshness/signature helper used by both `GET /api/daily-digest` and `runDailyDigestGeneration`.
2. Extract or expose the Daily Brief section parser and include `RISKS AHEAD`.
3. Extract the Daily Brief auto-regeneration policy into a pure helper.
4. Change auto-generation to run only for `pending` cache state and use `force: false`.
5. Keep manual Regenerate as the only `force: true` UI path.
6. Expand `npm test` so existing TypeScript tests are not silently skipped.
7. Add focused tests before production code changes.
8. Add a local release test script and a post-implementation smoke/performance report template.

## Open Decisions For Joshua

These are the only decisions that may need explicit confirmation before final implementation:

1. Should stale-but-renderable Daily Brief cache require **manual Regenerate** rather than automatic regeneration?
   - Swarm recommendation: yes.
2. What release thresholds should be accepted for synchronous Daily Brief `POST`?
   - Swarm recommendation: approve thresholds during the post-implementation performance run, with cached GET expected to stay fast and POST measured honestly.
3. Should portal automated tests be added now, or should portal remain lint/type/build plus manual smoke for this phase?
   - Swarm recommendation: add only the smallest practical tests if they cover the Phase 3 risk; do not build a broad test framework during finishing.

## Implementation Posture

No production code should be changed until the implementation plan is executed with test-first steps. Every fix in this phase should have a failing test first, then the smallest code change that makes it pass.
