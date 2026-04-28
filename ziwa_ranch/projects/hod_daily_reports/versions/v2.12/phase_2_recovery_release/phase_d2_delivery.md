# Phase D2 Delivery — v2.12 Recovery (BG URL Fix)

STATUS: complete
Date: 2026-04-23
Phase boundary outcome: **D3 re-run FAIL. URL fix deployed and verified, but the background function fails silently during execution. No `daily_brief` cache row is written. D4–D6 not run.**

---

## 1. Deploy details

- Admin deploy repo: `/Users/joshuaroy/hod_admin_portal`
- Commit SHA: `92e994ae6067d5c90e6efc7552255e7dde970b4a` (`92e994a`)
- Netlify deploy ID: `69ea694b3108bc00089fd4c6`
- Deploy state: `ready`
- Branch: `dev`
- Context: `branch-deploy`
- Created: 2026-04-23T18:47:39.386Z

---

## 2. Step 0 — Pre-fix validation (PASS)

Confirmed the issue is live before touching code.

| URL | Method | Response |
|-----|--------|----------|
| `https://hod-admin-portal.netlify.app/.netlify/functions/daily-digest-background` | POST | **404** |
| `https://dev--hod-admin-portal.netlify.app/.netlify/functions/daily-digest-background` | POST | **202** |

Main site → 404 (expected, confirms the bug), dev alias → 202 (expected, function is deployed there).

---

## 3. Changes made to `handler.ts`

File: `4_development/admin-portal/app/api/daily-digest/handler.ts`

### Change 1: `resolveBackgroundBaseUrl()` — URL priority order

```diff
 function resolveBackgroundBaseUrl(): string {
-  const raw = process.env.URL
+  const raw = process.env.DEPLOY_PRIME_URL
     ?? process.env.DEPLOY_URL
-    ?? process.env.DEPLOY_PRIME_URL
+    ?? process.env.URL
     ?? process.env.NEXT_PUBLIC_SITE_URL
     ?? ''
   return raw.replace(/\/+$/, '')
 }
```

`DEPLOY_PRIME_URL` is the branch alias URL (`https://dev--hod-admin-portal.netlify.app`). `URL` is always the main site production URL. By checking `DEPLOY_PRIME_URL` first, branch deploys correctly target their own function endpoint.

### Change 2: Response status guard on BG function fetch

```diff
   try {
-    await fetch(bgUrl, {
+    const bgRes = await fetch(bgUrl, {
       method: 'POST',
       headers: buildInternalHeaders({ 'Content-Type': 'application/json' }),
       body: JSON.stringify({ briefDate, force, ...(feedback ? { feedback } : {}) }),
     })
+    if (!bgRes.ok && bgRes.status !== 202) {
+      console.error('daily-digest-background enqueue failed:', bgRes.status, bgUrl)
+    }
   } catch (err) {
```

Background functions return 202, not 200. Non-202 responses are now logged rather than silently discarded.

**No other changes to this file.**

---

## 4. Step 2 — Pre-push gate results (PASS)

All run from `4_development/admin-portal`:

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | 0 errors |
| `npm run lint` | 0 errors, 13 warnings (pre-existing baseline) |
| `npm run build` | Pass; `/api/daily-digest` appears as dynamic route |

---

## 5. Step 4 — Post-deploy curl validation (PASS)

After deploy `69ea694b3108bc00089fd4c6` reached `ready`:

| URL | Method | Response |
|-----|--------|----------|
| `https://hod-admin-portal.netlify.app/.netlify/functions/daily-digest-background` | POST | **404** (expected — main site unchanged) |
| `https://dev--hod-admin-portal.netlify.app/.netlify/functions/daily-digest-background` | POST | **202** (expected — function alive) |

Authenticated POST from browser session (MD on `dev--hod-admin-portal.netlify.app`):

```
POST /api/daily-digest → 202, { accepted: true, brief_date: "2026-04-22" }
POST /api/daily-digest (force: true) → 202, { accepted: true, brief_date: "2026-04-22" }
```

Both returned 202 successfully. The POST handler is now targeting the correct BG function URL.

---

## 6. D3 re-run — Background function + cache persistence (FAIL)

### What was observed

After two POST invocations (one normal, one with `force: true`), the GET endpoint continued returning `pending: true` for over 15 minutes. No `hod_analysis_cache` row with `period_type = 'daily_brief'` was ever created.

### D3 gate verification query

```sql
SELECT period_type, period_key, generated_at,
  analysis_data->>'pipeline_version' AS pipeline_version,
  analysis_data->>'sub_agent_models' AS sub_agent_models,
  analysis_data->>'orchestrator_model' AS orchestrator_model,
  analysis_data->>'degraded' AS degraded,
  analysis_data ? 'feedback' AS has_feedback_key
FROM public.hod_analysis_cache
WHERE period_type = 'daily_brief'
ORDER BY generated_at DESC LIMIT 3;
```

Result: **empty set** — zero `daily_brief` rows.

### Diagnostic findings

1. **URL fix is verified correct.** Direct curl to the dev alias BG function endpoint returns 202. The POST handler now resolves `DEPLOY_PRIME_URL` correctly.

2. **The BG function accepts invocations.** Both direct curl and the authenticated POST handler successfully receive 202 from the BG function endpoint.

3. **All required env vars exist with `functions` scope.** Confirmed via Netlify API:
   - `OPENROUTER_API_KEY` — present, scoped to builds + functions
   - `SUPABASE_SERVICE_ROLE_KEY` — present, scoped to builds + functions
   - `NEXT_PUBLIC_SUPABASE_URL` — present, scoped to builds + functions

4. **The BG function IS deployed.** Deploy `69ea694b3108bc00089fd4c6` lists `daily-digest-background` in its `available_functions` array.

5. **Supabase connections are being established during the test window.** Postgres logs show PostgREST (`authenticator`) connections at timestamps correlating with the POST invocations, suggesting the BG function is at least reaching the Supabase query phase.

6. **No `daily_brief` row is written after 15+ minutes.** The BG function either crashes, times out, or fails silently during the OpenRouter API call phase. The function's internal `console.error` logs are not accessible without Netlify function-level log tooling (the `netlify logs:function` CLI command reports "Could not find function daily-digest-background").

7. **The BG function has never successfully executed.** This is the first time the function has been invoked at the correct URL. Phase C deployed the v2.12 code (including the BG function) but the Phase D blocker (wrong URL) prevented any invocation until this fix.

8. **13 reports exist for briefDate 2026-04-22.** The function should not hit the `no_reports` early exit.

9. **`daily_brief` CHECK constraint is confirmed working.** Smoke insert under `BEGIN … ROLLBACK` succeeded.

### Root cause assessment

The URL resolution fix is correct and deployed. The BG function is being reached. But the function fails during execution — most likely during the OpenRouter API calls (4 sub-agent + 1 orchestrator). This is a **new blocker** not anticipated by the Phase D2 prompt, which assumed the only issue was URL resolution.

Possible causes (not investigated due to scope):
- OpenRouter API calls failing from Netlify Functions runtime (network, API key context, model availability)
- Function cold start + OpenRouter timeout exceeding 15-minute BG function limit
- Dependency bundling issue with the relative/workspace imports in the BG function
- Unhandled exception in the generation pipeline before the cache upsert

---

## 7. D4–D6 — Not run

Per Phase D2 instructions: "If D3 does not pass, do not proceed to D4."

---

## 8. D7 addendum — Cleanup (COMPLETE)

| Row deleted | `period_type` | `period_key` | `id` | Created by |
|-------------|---------------|--------------|------|-----------|
| 1 | `trend_alert` | `trend:2026-04-20` | `e1a4c5ba-6fa1-4eeb-8aa8-265dc9d91450` | Side-effect during test window |

Post-deletion query confirmed zero rows created after 2026-04-23 18:00:00 UTC.

No bookings, reports, threads, or notifications were created during this validation run.

---

## 9. Residual risks

1. **BG function runtime failure (blocker).** The background function never successfully completes. This blocks D3, D4 (the Regenerate pending → fresh flow), and the entire Phase D gate. The root cause is unknown and requires function-level debugging (Netlify function logs, instrumentation, or local reproduction via `netlify dev`).

2. **BG function has never been tested end-to-end on Netlify.** Phase C deployed the function, but Phase D's URL blocker prevented it from ever being invoked. The URL fix clears the invocation path, but the function's runtime behaviour on Netlify is unvalidated.

3. **Silent fetch failure risk (partially mitigated).** The response-status guard now logs non-202 responses. However, the handler still returns 202 to the client regardless — a user-facing error surface would be a further improvement.

4. **Main branch deploy in `new` state (unchanged from Phase D).** Deploy `69e9d11d66ec96532daf69a9` on `main` triggered automatically by Netlify.

---

## 10. Release recommendation

**Not ready.** The BG function URL fix is correct and deployed, but the background function itself fails during execution. D3 cannot pass.

### Required before re-run

1. **Debug the BG function runtime failure.** Investigate why `daily-digest-background` does not write a `daily_brief` row despite accepting invocations. This requires Netlify function-level logs or local reproduction.
2. Likely areas of investigation:
   - OpenRouter API calls from Netlify Functions runtime
   - Dependency bundling of `../../lib/daily-digest-generation` and `@hod/shared` imports
   - Function timeout / cold start interaction with multi-agent pipeline
3. Once the BG function is confirmed working, re-run Phase D from D3 onwards.

---

## 11. Exact paths written

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_d2_delivery.md` (this file)
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_release_recommendation_prompt.md` (updated)
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/backlog.md` (Decision Log updated)

---

*Phase D2 halted at D3. The URL fix is correct and deployed. The background function has a deeper runtime issue. Handing back for BG function debugging before the next Phase D re-run.*
