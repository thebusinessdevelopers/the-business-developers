# P3F-04 Release Test Script Investigation

STATUS: in-progress
Date: 2026-04-26
Swarm model: `composer-2-fast`

## Question

What is the simplest practical test script to introduce for v2.12 Phase 3 Finishing?

## Current State

| Area | Current state |
| --- | --- |
| `4_development/package.json` | Workspace metadata only; no aggregate test/build/lint/typecheck script. |
| `admin-portal/package.json` | Has `test`, but it only runs `__tests__/*.test.mjs`. Existing `.test.ts` files are skipped. |
| `portal/package.json` | Has build and lint, no test script. |
| `packages/shared/package.json` | No test script. |
| Type-checking | Works with `npx tsc --noEmit`, but is not packaged as a script. |

## Key Gap

The current `npm test` result is not enough for v2.12 because it misses existing TypeScript tests and does not cover the new Phase 3 Finishing risks.

## Recommended Test Artefacts

1. Local automated script:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/scripts/release-test-v212-local.sh
```

2. Manual/live checklist:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_3_finishing/release_manual_v212.md
```

## Local Script Command Set

Run from `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development`:

```bash
npm install
npm run lint -w admin-portal
npm run lint -w portal
npx tsc --noEmit -p admin-portal/tsconfig.json
npx tsc --noEmit -p portal/tsconfig.json
npm run build -w admin-portal
npm run build -w portal
npm test -w admin-portal
```

After the test script is fixed to include TypeScript tests, `npm test -w admin-portal` should run both `.test.mjs` and `.test.ts` suites.

## Tests To Add Before The Script Is Meaningful

Minimum for Phase 3 Finishing:

- Daily Brief freshness/signature tests.
- Daily Brief auto-regeneration policy tests.
- Daily Brief section parser tests, including `RISKS AHEAD`.
- Existing Daily Brief generation TypeScript tests must be included in `npm test`.

Good additional coverage if it stays simple:

- Accommodation rate calculation tests for `calculateItemRate` and `calculateBasketRate`.
- Report-date lag helper tests, if lag logic is extracted cleanly.
- Queue guard tests, if the guard predicate is extracted cleanly.

## Non-Destructive Rules

The local script must not:

- apply migrations,
- write Supabase data,
- call production URLs,
- run live OpenRouter generations,
- require secrets to print into terminal logs.

Manual/live checks can write controlled test rows only when explicitly documented and cleaned up.

## Implementation Recommendation

Add test coverage and script wiring in this order:

1. Fix `admin-portal` `npm test` to run all current and new tests.
2. Add the three Daily Brief Phase 3 tests.
3. Add the local release script.
4. Add the manual/live checklist.
5. Run the script only after Phase 3 code fixes are complete.
