# v2.12 Phase 3 Finishing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every production-code change must be driven by a failing test first.

**Goal:** Complete the smallest safe set of v2.12 finishing work (Daily Brief correctness, test runner, local release script, then manual smoke) before final performance validation and release recommendation.

**Architecture:** Keep the current synchronous Daily Brief path for v2.12. Add small pure helpers for composite freshness, section parsing, and regeneration policy. Defer async/background AI to v2.13+. Do not reintroduce Netlify Background Functions.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node `node:test`, `tsx` (for TypeScript test files), Supabase, OpenRouter.

**STATUS:** `final` (plan) — 2026-04-26

---

## Joshua approvals (swarm)

The following are fixed for this phase:

1. Stale-but-renderable Daily Brief cache must **not** auto-regenerate; **Regenerate** is manual.
2. Synchronous Daily Brief `POST` performance: approve thresholds **after** a post-implementation performance run; cached `GET` should stay fast; `POST` measured honestly.
3. Portal automated tests: add **only** the smallest practical tests if they cover Phase 3 risk; do not build a broad test framework in finishing.

---

## Files to create

| File | Responsibility |
| --- | --- |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/daily-brief-freshness.ts` | Composite signature + two-hour freshness (shared with `GET` and generation). |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/daily-brief-sections.ts` | Pure `parseDigestSections` including `RISKS AHEAD`. |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/daily-digest-regeneration-policy.ts` | Pure `shouldAutoRegenerateDailyDigest` and request-body helpers. |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/daily-brief-freshness.test.ts` | Unit tests for signature + freshness. |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/daily-brief-sections.test.ts` | Unit tests for section parsing. |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/daily-digest-regeneration-policy.test.ts` | Unit tests for auto vs manual policy. |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/daily-digest-freshness-wiring.test.mjs` | Static check that `handler.ts` uses composite freshness, not report-only signature. |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/scripts/release-test-v212-local.sh` | Non-destructive local release gate. |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_3_finishing/release_manual_v212.md` | Manual/live smoke and performance checklist (run **after** implementation). |

## Files to modify

| File | Change |
| --- | --- |
| `.../4_development/admin-portal/package.json` | `test` script + add `tsx` dev dependency. |
| `.../4_development/admin-portal/package-lock.json` | Lockfile after `npm install` for `tsx`. |
| `.../4_development/admin-portal/app/api/daily-digest/handler.ts` | `GET` uses shared composite signature + freshness. |
| `.../4_development/admin-portal/lib/daily-digest-generation.ts` | Reuse shared builder for `subAgentInputs` / signature (no duplicate hash logic that can drift). |
| `.../4_development/admin-portal/components/DailyDigestCard.tsx` | Import parsers/policy; `pending`-only auto `POST` with `force: false`; manual `force: true`. |
| `.../phase_3_finishing/backlog.md` | Decision Log after implementation. |

---

## Task 1: Fix the test runner (`.test.ts` not skipped)

- [x] **Step 1:** From `4_development`, add `tsx` to admin-portal:

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development
npm install --save-dev tsx -w admin-portal
```

- [x] **Step 2:** Set `admin-portal` `package.json` `test` to:

```json
"test": "node --import tsx --test __tests__/*.test.mjs __tests__/*.test.ts"
```

- [x] **Step 3:** Run and fix any baseline failures before feature work:

```bash
cd /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development
npm test -w admin-portal
```

**Expected:** All existing `__tests__/*.test.mjs` and `__tests__/*.test.ts` files execute. Exit code `0`.

---

## Task 2: `RISKS AHEAD` — test first, then implement

**Exact test file:** `__tests__/daily-brief-sections.test.ts`  
**Exact test names:**

- `parseDigestSections returns RISKS AHEAD as its own section`
- `parseDigestSections keeps four-section briefs unchanged`
- `parseDigestSections falls back to SUMMARY when no known headers` (if current behaviour in card is kept)

- [x] Write failing tests, run:

```bash
npm test -w admin-portal -- __tests__/daily-brief-sections.test.ts
```

**Expected (before implementation):** failure (module missing or wrong output).

- [x] Add `lib/daily-brief-sections.ts` with `RISKS AHEAD` in the recognised header list; wire `DailyDigestCard.tsx` to import it and remove the inline parser.

- [x] Re-run `npm test -w admin-portal`, `npx tsc --noEmit -p admin-portal/tsconfig.json`, `npm run lint -w admin-portal`.

---

## Task 3: Auto-regeneration policy — test first, then implement

**Exact test file:** `__tests__/daily-digest-regeneration-policy.test.ts`  
**Exact test names (minimum):**

- `shouldAutoRegenerateDailyDigest returns false for stale cached briefs`
- `shouldAutoRegenerateDailyDigest returns true for pending briefs with reports`
- `shouldAutoRegenerateDailyDigest returns false after automatic kick-off`
- `buildDailyDigestRegenerationRequestBody uses force false for automatic generation`
- `buildDailyDigestRegenerationRequestBody keeps force true for manual regenerate`

- [x] Failing tests first, then add `lib/daily-digest-regeneration-policy.ts`.

- [x] In `DailyDigestCard.tsx`: auto-kick only when `pending === true` and `report_count > 0` and not already kicked; `POST` body `{ force: false }`. Manual Regenerate: `{ force: true, feedback? }`. When `stale && digest`, show: `New data may be available. Regenerate to update.`

- [x] **Polling:** After P3F-01+02, use `REFRESH_INTERVAL_PENDING` only when `pending` (or still loading a digest after kick); do not treat `stale` alone as “pending” for 15s polling if that spams `GET` unnecessarily — keep behaviour simple and aligned with “no auto POST for stale”.

- [x] Run `npm test -w admin-portal`, `npx tsc --noEmit -p admin-portal/tsconfig.json`, `npm run lint -w admin-portal`.

---

## Task 4: Composite Daily Brief freshness — test first, then implement

**Exact test file:** `__tests__/daily-brief-freshness.test.ts`  
**Exact test names (minimum):**

- `buildDailyBriefCacheSignature includes report rows and operational input hash`
- `buildDailyBriefCacheSignature changes when operational inputs change without report edits`
- `isDailyBriefCacheFresh accepts recent matching composite signature`
- `isDailyBriefCacheFresh rejects changed operational inputs`
- `isDailyBriefCacheFresh rejects cache older than two hours`

**Wiring test file:** `__tests__/daily-digest-freshness-wiring.test.mjs`  
**Exact test name:**

- `daily digest GET uses shared composite freshness helper` (read `handler.ts` and assert it does not compare `buildReportSignature` alone to `cachedData.signature` without the inputs hash)

- [x] Implement `lib/daily-brief-freshness.ts` (reuse the same `hashJsonStable` / stable stringify semantics as `daily-digest-generation.ts` — extract or import one implementation).

- [x] Refactor `runDailyDigestGeneration` to build `subAgentInputs` and `signature` via a shared function used by `GET` (e.g. `buildDailyBriefSignatureContext({ supabase, briefDate })`).

- [x] Update `handler.ts` `GET` to compute the same composite signature and apply the same two-hour window as generation.

- [x] Run:

```bash
npm test -w admin-portal
npx tsc --noEmit -p admin-portal/tsconfig.json
npm run lint -w admin-portal
npm run build -w admin-portal
```

**Expected:** Fresh matching cache → `stale: false` when within TTL; input drift → `stale: true` without auto `POST` from Task 3.

---

## Task 5: Local release test script

- [x] Create and chmod `4_development/scripts/release-test-v212-local.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
echo "== v2.12 local release test =="
npm install
npm run lint -w admin-portal
npm run lint -w portal
npx tsc --noEmit -p admin-portal/tsconfig.json
npx tsc --noEmit -p portal/tsconfig.json
npm run build -w admin-portal
npm run build -w portal
npm test -w admin-portal
echo "== v2.12 local release test passed =="
```

```bash
chmod +x /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/scripts/release-test-v212-local.sh
```

- [x] Run **only after** Tasks 1–4 pass:

```bash
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/scripts/release-test-v212-local.sh
```

**Expected:** exit code `0`. Script must not call live OpenRouter, apply migrations, or write Supabase data.

---

## Task 6: Manual/live smoke and performance (after implementation)

- [x] Add `release_manual_v212.md` in this folder with: D5/D6 matrix from `investigations/05_smoke_performance_and_async.md`, Daily Brief R1/R2/R3, feedback limits, and performance table (GET p95, POST p95/measurement method). Joshua approves `POST` numeric threshold **after** the run.

- [ ] Run the manual/live checklist only after local release script and code tasks are done, Joshua confirms the target environment, and Joshua approves live validation. Not run in this session.

---

## Task 7: Phase 3 documentation

- [x] Append Decision Log in `backlog.md`: plan finalised, three swarm approvals, implementation summary, `release-test-v212-local.sh` result, pointer to `release_manual_v212.md`, smoke/perf pending or done.

- [ ] Optional: add smoke/perf results to `p3f_05_post_implementation_smoke_report.md` if that file is created per investigation.

---

## Final local validation (order)

1. `npm test -w admin-portal`
2. `npx tsc --noEmit -p admin-portal/tsconfig.json`
3. `npx tsc --noEmit -p portal/tsconfig.json`
4. `npm run lint -w admin-portal` and `npm run lint -w portal`
5. `npm run build -w admin-portal` and `npm run build -w portal`
6. `./scripts/release-test-v212-local.sh`
7. Then manual/live checklist on dev (not in this script).

---

## Plan self-review

- **Tests:** Each behaviour change has a named unit test; wiring covered by `daily-digest-freshness-wiring.test.mjs` where useful.
- **Placeholders:** No TBD; portal tests explicitly deferred unless a tiny pure test becomes necessary.
- **Duplication:** Single signature/freshness path; single parser module; policy module for client logic.
- **Background functions:** No server-side background jobs; `daily-digest-api-origin` guard remains.
- **Commands:** All paths absolute where written; `npm test -w admin-portal` is canonical.
