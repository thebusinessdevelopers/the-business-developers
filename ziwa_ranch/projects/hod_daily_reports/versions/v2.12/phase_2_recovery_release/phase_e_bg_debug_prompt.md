# Phase E — BG Function Debug, Diagnosis & Recovery Plan

STATUS: superseded
Date: 2026-04-23
Owner: debugging and investigation agent
Scope: diagnose why `daily-digest-background` never completes, fix the root cause, validate end-to-end, produce a clear plan to achieve Phase D Gate pass.

Superseded on 2026-04-26 by `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_e_delivery.md`. Joshua chose simplification: remove the Netlify Background Function path and run Daily Brief generation directly inside `POST /api/daily-digest`.

---

## Context and known state

The v2.12 recovery has cleared every blocker except one: the Netlify Background Function `daily-digest-background` accepts POST invocations (returns 202) but never writes a `daily_brief` row to `hod_analysis_cache`. Phase D has been attempted twice; both runs failed at D3.

Phases A–C are complete and closed. Only the admin deploy repo is relevant here — portal is unaffected.

**Do not re-investigate anything listed as resolved below.**

---

## Read first, in this order

1. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_d2_delivery.md` — full failure record
2. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_d_delivery.md` — first Phase D failure (URL blocker)
3. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/netlify/functions/daily-digest-background.ts` — the function under investigation
4. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/netlify/functions/_internal-auth.ts`
5. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/daily-digest/handler.ts` — the caller
6. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/internal-route-auth.ts`
7. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/netlify.toml`

---

## Resolved facts (do not re-investigate)

| # | Fact |
|---|------|
| R1 | URL fix deployed and confirmed working. `DEPLOY_PRIME_URL` correctly resolves to `https://dev--hod-admin-portal.netlify.app` on branch deploys. Direct curl to `https://dev--hod-admin-portal.netlify.app/.netlify/functions/daily-digest-background` POST → 202. |
| R2 | Phase C deploy `69e9cfc631266e0008bdb0f7` had `invocation_mode: background`. Current Phase D2 deploy `69ea694b3108bc00089fd4c6` has `invocation_mode: null`. |
| R3 | All three critical env vars (`OPENROUTER_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`) exist on the admin Netlify site with `functions` scope. |
| R4 | 13 reports exist for `briefDate = 2026-04-22`. No `no_reports` early exit. |
| R5 | `daily_brief` CHECK constraint is correctly widened and accepts inserts. |
| R6 | The BG function has **never** successfully executed — Phase C deployed it but Phase D's URL blocker prevented any invocation until Phase D2. |
| R7 | Admin repo: `/Users/joshuaroy/hod_admin_portal`, `dev` branch, HEAD `92e994a`. Monorepo: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/`. |
| R8 | Direct curl to the BG function endpoint (without internal auth token) returns 202 — this tests invocation acceptance only, not execution success. The function would silently fail auth and terminate. |
| R9 | The BG function uses the v1 `Handler` API (`import type { Handler } from '@netlify/functions'`). Current Netlify docs describe background functions using the v2 `Request`/`Context` web API. |

---

## Scope allowed

You may:

- Read and edit files in the monorepo at `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/` and `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/`.
- Mirror changed files to `/Users/joshuaroy/hod_admin_portal/` and push to `dev`.
- Make HTTP requests against `dev--hod-admin-portal.netlify.app`.
- Read from Supabase `inidzwfjnkyinxhvbrdt` via MCP `execute_sql` (SELECT only).
- Delete test data you create during investigation.
- Write files within `versions/v2.12/phase_2_recovery_release/`.
- Update `versions/v2.12/backlog.md` Decision Log.

---

## Forbidden actions

Do **not**:

- Touch the portal deploy repo or portal monorepo code.
- Run any Supabase DDL or non-cleanup DML.
- Promote anything to `main`.
- Touch `handler.ts` or any file outside the BG function, its dependencies, and `netlify.toml` (unless the diagnosis specifically requires it).

---

## Investigation priorities — work these in order

Before writing any code, exhaust each investigation step and record your finding. Only move to a fix when the root cause is confirmed.

---

### H1 — Function not executing as a background function (highest priority)

The Phase C deploy had `invocation_mode: background`; the current Phase D2 deploy shows `invocation_mode: null`. This is the most likely cause.

**Steps:**

1. Fetch the Phase C deploy metadata and compare with Phase D2:
   ```bash
   cd /Users/joshuaroy/hod_admin_portal
   npx netlify api getSiteDeploy \
     --data '{"site_id":"d501089b-06cc-4d50-84eb-cb5ab4890b9b","deploy_id":"69e9cfc631266e0008bdb0f7"}' \
     | python3 -c "import sys,json; d=json.load(sys.stdin); fns=d.get('available_functions',[]); [print(f.get('n'), f.get('invocation_mode'), f.get('runtime')) for f in fns]"
   ```

2. Check the current `@netlify/functions` version in the admin deploy repo (`node_modules/@netlify/functions/package.json`) and compare with what Netlify's nodejs22.x runtime expects for background functions.

3. Check whether the `-background` naming convention alone is sufficient for v2 of `@netlify/functions`, or whether an explicit `config` export with `type: 'background'` (or similar) is required.

4. Inspect the Netlify background functions documentation for the correct modern syntax at: `https://docs.netlify.com/build/functions/background-functions/`

**Expected fix if confirmed:** The function needs to be rewritten to the v2 API style and/or an explicit background config export. The v1 `Handler` style may not be correctly detected as a background function on `nodejs22.x`, causing it to run synchronously with a 10-second timeout — far too short for 5 OpenRouter calls.

---

### H2 — Internal authentication failure (high priority)

The 202 response from direct curl tests confirms only that the invocation was *accepted* — not that the function body executed successfully. The function immediately checks `isInternalRequestFromHeaders`, which compares the `x-hod-internal-token` header value against `getInternalRouteToken()`.

`getInternalRouteToken()` logic:
```typescript
const explicit = process.env.INTERNAL_ROUTE_TOKEN ?? process.env.INTERNAL_JOB_TOKEN
if (explicit && explicit.trim().length > 0) return explicit
const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY
```

The POST handler in `handler.ts` calls `buildInternalHeaders()` which calls the same `getInternalRouteToken()` to set the token on the outgoing fetch.

**Steps:**

1. Confirm whether `INTERNAL_ROUTE_TOKEN` or `INTERNAL_JOB_TOKEN` is set on the Netlify site:
   ```bash
   npx netlify api getEnvVar \
     --data '{"site_id":"d501089b-06cc-4d50-84eb-cb5ab4890b9b","account_id":"thebusinessdevelopers","key":"INTERNAL_ROUTE_TOKEN"}'
   npx netlify api getEnvVar \
     --data '{"site_id":"d501089b-06cc-4d50-84eb-cb5ab4890b9b","account_id":"thebusinessdevelopers","key":"INTERNAL_JOB_TOKEN"}'
   ```

2. If neither is set, the fallback is `SUPABASE_SERVICE_ROLE_KEY` — which is set. Confirm that the same key resolves in both the Next.js API route context and the Netlify Function context by checking the env var scopes.

3. Consider: if `SUPABASE_SERVICE_ROLE_KEY` is scoped to `builds` only (not `functions`), it would be available to `handler.ts` (which runs via the Netlify server handler, technically a function) but not available inside the `@netlify/functions` runtime. This would cause the token to be `null` in the BG function, making `isInternalRequestFromHeaders` always return `false`.

**Expected fix if confirmed:** Set an explicit `INTERNAL_ROUTE_TOKEN` env var on the Netlify site scoped to `functions`, or confirm that `SUPABASE_SERVICE_ROLE_KEY` is correctly scoped to both builds and functions.

---

### H3 — Dependency bundling / module resolution failure (medium priority)

The BG function contains two non-trivial import chains:

```typescript
import { createServerClient } from '@hod/shared/lib/supabase-server'
import { runDailyDigestGeneration } from '../../lib/daily-digest-generation'
```

`@hod/shared` is a workspace package resolved via a symlink in `node_modules`. Netlify's esbuild bundler may not follow workspace symlinks correctly when building functions separately from the Next.js app, causing a module-not-found error at runtime.

The relative import `../../lib/daily-digest-generation` goes from `netlify/functions/` up to the repo root `lib/` folder. This path must be correctly resolved and bundled.

**Steps:**

1. Check whether `netlify.toml` has a `[functions]` section configuring the functions directory or `node_bundler`:
   ```
   cat /Users/joshuaroy/hod_admin_portal/netlify.toml
   ```

2. Attempt a local bundle simulation. From the admin deploy repo:
   ```bash
   cd /Users/joshuaroy/hod_admin_portal
   node -e "require('./netlify/functions/daily-digest-background.ts')" 2>&1
   ```
   Or with tsx/ts-node:
   ```bash
   npx tsx netlify/functions/daily-digest-background.ts 2>&1
   ```

3. Check the Netlify deploy's built function output. The Netlify CLI can show what's bundled:
   ```bash
   npx netlify functions:build 2>&1 | head -40
   ```

4. If a bundling issue is found, the fix is to add a `[functions]` block in `netlify.toml` specifying `node_bundler = "esbuild"` with the correct external modules, or to inline-copy the dependencies.

---

### H4 — OpenRouter API calls failing from Netlify runtime (lower priority — investigate only if H1–H3 are clear)

If the function body runs but OpenRouter calls fail, the pipeline degrades and still writes a cache row (with `degraded: true`) — so a persistent failure to write any row at all points to an earlier failure (H1, H2, or H3). Only investigate H4 if the other hypotheses are ruled out.

**Steps:**

1. Add minimal instrumentation to the BG function (a `console.log` immediately after the auth check) to prove the function body is executing past auth. Deploy and check the Netlify function logs via:
   ```bash
   npx netlify logs:function daily-digest-background --site d501089b-06cc-4d50-84eb-cb5ab4890b9b 2>&1
   ```
   Note: this command may not work for background functions — if so, use the Netlify UI Logs tab at `https://app.netlify.com/projects/hod-admin-portal/functions/daily-digest-background`.

2. If logs are accessible, look for: auth failure (`Unauthorised`), module import error, or OpenRouter error messages.

---

## Decision protocol

Work through H1 → H2 → H3 → H4. After each hypothesis:

- If **confirmed as root cause**: record the evidence, implement the minimal fix, deploy, and validate.
- If **ruled out**: record why, move to the next hypothesis.
- If **multiple hypotheses are simultaneously true**: fix in order H1 → H2 → H3.

Do not begin fixing until you have confirmed evidence. Record the exact evidence (log line, API response, error message) before touching any file.

---

## Validation gate (D3 re-run)

Once the fix is deployed, run the following in sequence:

### Step A — Confirm invocation mode
```bash
npx netlify api getSiteDeploy \
  --data '{"site_id":"d501089b-06cc-4d50-84eb-cb5ab4890b9b","deploy_id":"<NEW_DEPLOY_ID>"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); fns=d.get('available_functions',[]); [print(f.get('n'), f.get('invocation_mode'), f.get('runtime')) for f in fns]"
```
Must show `invocation_mode: background` for `daily-digest-background`.

### Step B — Authenticated POST trigger
From an authenticated browser session on `dev--hod-admin-portal.netlify.app` as MD:
```javascript
const r = await fetch('/api/daily-digest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ force: true })
})
// Expect 202
```

### Step C — Poll for cache row (5-minute window)
Poll every 30 seconds up to 5 minutes:
```sql
SELECT
  period_type, period_key, generated_at,
  analysis_data->>'pipeline_version'   AS pipeline_version,
  analysis_data->>'sub_agent_models'   AS sub_agent_models,
  analysis_data->>'orchestrator_model' AS orchestrator_model,
  analysis_data->>'degraded'           AS degraded,
  analysis_data ? 'feedback'           AS has_feedback_key
FROM public.hod_analysis_cache
WHERE period_type = 'daily_brief'
ORDER BY generated_at DESC LIMIT 3;
```

### D3 gate criteria (all must pass)
- `period_type = 'daily_brief'` row exists for `briefDate`.
- `pipeline_version = 'v2.12-multi-agent'`
- `sub_agent_models` contains `'google/gemini-2.5-flash'`
- `orchestrator_model` contains `'anthropic/claude-sonnet-4.5'`
- `degraded = 'false'` or absent
- No `feedback` key in `analysis_data`

If D3 passes, do **not** proceed to D4–D6. Stop, clean up test data, document the fix, and write the next-phase prompt (see below).

---

## Cleanup (after validation, regardless of pass/fail)

- Delete any `daily_brief` rows created during investigation (these are ephemeral test rows — the live system will regenerate when next triggered by a real user).
- Delete any other cache rows created as side-effects.
- Confirm zero test rows remain via SELECT.
- Document the exact rows deleted.

---

## If D3 passes — documentation requirements

Phase E is **not complete** until all three outputs are written:

### 1. `phase_e_delivery.md`

Create at: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_e_delivery.md`

Must include:
- `STATUS:` token
- Date and new commit SHA + deploy ID
- The confirmed root cause with exact evidence (log line, API response, or error)
- Hypotheses ruled out and why
- Exact files changed and diffs
- Pre-push gate results (`tsc --noEmit`, lint, build)
- D3 validation gate result (DB query output)
- D7 cleanup log
- Any residual risks

### 2. Updated `phase_d3_agent_prompt.md`

Create at: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_d3_agent_prompt.md`

This is the **ready-to-run prompt for the next agent** that will complete D4–D6 validation. It must include:
- All resolved facts from Phase D, D2, and E
- Exact deploy commit SHA and deploy ID to validate against
- D4 UI smoke steps (from `phase_two_plan.md §Phase D`)
- D5 assets and cross-site sanity steps
- D6 regression smokes (from `20_04_test.md §7`)
- D7 cleanup addendum
- Gate D final criteria
- Documentation outputs required before handoff
- Explicit instruction to stop at the Gate D boundary and ask for `APPROVED: phase_3_complete`

### 3. Updated `versions/v2.12/backlog.md` Decision Log

Add a Phase E entry recording:
- Root cause confirmed
- Files changed and commit SHA
- Validation result (D3 pass/fail)
- Cleanup log
- Next starting point
- Absolute paths to `phase_e_delivery.md` and `phase_d3_agent_prompt.md`

---

## If D3 fails again

If D3 does not pass after the fix:

- **Stop immediately.** Do not continue debugging indefinitely.
- Clean up test data.
- Write `phase_e_delivery.md` with:
  - Hypotheses investigated
  - Evidence found for each
  - What was fixed and what still failed
  - A clear diagnosis of the remaining unknown
  - A recommendation on whether the issue requires manual Netlify support, a different architectural approach (e.g. Supabase Edge Function instead of Netlify BG Function), or more targeted investigation
- Update the backlog Decision Log.
- Return a clear summary to Joshua.

---

## Recovery plan context

Phase D3 is the last true unknown. Everything else in Phase D (D1, D2 were already passing; D4–D6 are functional validation that should pass once D3 is unblocked) depends on this function working. Once D3 passes, the path to `APPROVED: phase_3_complete` is clear.

The broader v2.12 release depends on this one function executing correctly on Netlify. All code changes, schema migrations, and deploy refreshes are complete. This is the final blocker.

---

## Admin credentials
- Test password: `ziwa2026`
- Admin site: `https://dev--hod-admin-portal.netlify.app`
- Admin Netlify site ID: `d501089b-06cc-4d50-84eb-cb5ab4890b9b`
- Supabase project: `inidzwfjnkyinxhvbrdt`
- Admin deploy repo: `/Users/joshuaroy/hod_admin_portal` (branch `dev`, HEAD `92e994a`)
- Monorepo path: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/`
