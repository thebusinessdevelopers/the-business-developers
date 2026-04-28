# Phase D Delivery — v2.12 Recovery

STATUS: complete
Date: 2026-04-23
Phase boundary outcome: **Phase D halted at D3 (background function + cache persistence). One blocker identified; D4–D6 not run. Cleanup complete.**

---

## 1. Validation result summary

| Check | Result | Notes |
|-------|--------|-------|
| D1 — Deploy freshness | **PASS** | Admin `67bb8e1` ready; Portal `86892a0` ready |
| D2 — Admin Phase 3 API contract | **PASS** | All four sub-checks passed |
| D3 — Background function + cache persistence | **FAIL** | BG function never invoked; root cause identified |
| D4 — UI smoke | **NOT RUN** | Stopped at D3 per instructions |
| D5 — Assets and cross-site sanity | **NOT RUN** | Stopped at D3 per instructions |
| D6 — Regression (Phase 2 smokes) | **NOT RUN** | Stopped at D3 per instructions |
| D7 — Cleanup | **COMPLETE** | 2 test rows deleted |

**Overall verdict: FAIL — not ready for release sign-off.**

---

## 2. D1 — Deploy freshness (PASS)

### Admin (`dev--hod-admin-portal.netlify.app`)

- Deploy ID: `69e9cfc631266e0008bdb0f7`
- Commit SHA: `67bb8e19013cfc13ac7d8c615bd076f328c379e6` (matches Phase C `67bb8e1`)
- State: `ready`
- Branch: `dev`
- Context: `branch-deploy`
- Created: 2026-04-23T07:52:39.015Z

### Portal (`dev--hoddailyreports.netlify.app`)

- Deploy ID: `69e9d060123ba100087ce1f9`
- Commit SHA: `86892a0e09e6aaa6814482684e898dcc0bcad995` (matches Phase C `86892a0`)
- State: `ready`
- Branch: `dev`
- Context: `branch-deploy`
- Created: 2026-04-23T07:55:12.279Z

Both verified via `netlify api listSiteDeploys` against their respective site IDs (`d501089b-06cc-4d50-84eb-cb5ab4890b9b` admin, `3e5bb9b4-c0b2-4031-9f28-0132cbb1d303` portal).

---

## 3. D2 — Admin Phase 3 API contract (PASS)

All tests run from an authenticated browser session (MD / Managing Director) on `dev--hod-admin-portal.netlify.app`.

| Test | Expected | Observed | Elapsed |
|------|----------|----------|---------|
| `GET /api/daily-digest` | Cache response in under 2 s | 200, `pending: true`, `brief_date: "2026-04-22"` | 1,034 ms |
| `POST /api/daily-digest` | 202 with `{ accepted: true, brief_date }` | 202, `{ accepted: true, brief_date: "2026-04-22" }` | 857 ms |
| `POST /api/analysis/generate` (600-char feedback) | 400 | 400, `{ error: "feedback must be 500 characters or fewer" }` | — |
| `POST /api/analysis/generate` (valid feedback, day/2026-04-20) | 200 | 200, 4,026-byte analysis body | — |
| `POST /api/analysis/weekly-brief` (600-char feedback) | 400 | 400, `{ error: "feedback must be 500 characters or fewer" }` | — |

The ~8.5 s `GET` stall observed on 20 Apr is gone (now 1,034 ms). `POST` returns 202 in 857 ms. Feedback length validation works on both analysis endpoints.

---

## 4. D3 — Background function + cache persistence (FAIL)

### What was observed

After the `POST /api/daily-digest` returned 202, the `GET` endpoint continued returning `pending: true` with no digest for over 10 minutes. No `hod_analysis_cache` row with `period_type = 'daily_brief'` was ever created.

### Root cause

The POST handler in `admin-portal/app/api/daily-digest/handler.ts` resolves the background function URL via `resolveBackgroundBaseUrl()`:

```
const base = resolveBackgroundBaseUrl()   // → process.env.URL first
const bgUrl = `${base}/.netlify/functions/daily-digest-background`
```

`resolveBackgroundBaseUrl()` prioritises `process.env.URL`, which Netlify sets to the **main site URL** (`https://hod-admin-portal.netlify.app`) even on branch deploys. On the main site, the `daily-digest-background` function does not exist (the main deploy is in `new` state from an auto-triggered rebuild, deploy `69e9d11d66ec96532daf69a9`).

**Direct verification:**

| URL | Method | Response |
|-----|--------|----------|
| `https://hod-admin-portal.netlify.app/.netlify/functions/daily-digest-background` | POST | **404** |
| `https://dev--hod-admin-portal.netlify.app/.netlify/functions/daily-digest-background` | POST | **202** |

The `fetch` in the POST handler does not check the response status — it only catches thrown exceptions (network errors). A 404 response does not throw, so the handler silently swallows the failure and returns 202 to the client.

### Fix required (out of Phase D scope)

In `resolveBackgroundBaseUrl()`, either:

1. Reverse the priority order to prefer `DEPLOY_PRIME_URL` (the branch alias URL) over `URL`, or
2. Use a relative URL (`/.netlify/functions/daily-digest-background`) — however, this may not work from a Next.js server handler depending on runtime context, or
3. Add a `BACKGROUND_FUNCTION_BASE_URL` env var set explicitly per deploy context, or
4. Check the `fetch` response status and log/surface failures instead of silently swallowing them.

Option 1 is the minimal change. The POST handler should also check the response status to avoid silent failures.

### BG function deployment confirmed

The `daily-digest-background` function is deployed and available on the dev branch deploy:

- Invocation mode: `background`
- Runtime: `nodejs22.x`
- Region: `us-east-2`
- Deploy time: 2026-04-23T07:53:46.339Z
- The function ID appears in the deploy's `available_functions` array

---

## 5. D4–D6 — Not run

Per Phase D instructions: "Stop immediately if any check fails." D3 failed, so D4 (UI smoke), D5 (assets and cross-site sanity), and D6 (Phase 2 regression smokes) were not executed.

**Note:** D4 is partially dependent on D3 — the Regenerate flow requires the BG function to complete to demonstrate the pending → fresh transition. D5 and D6 are independent of D3 and can be re-run once the BG URL fix is applied.

---

## 6. D7 — Cleanup (COMPLETE)

| Row deleted | `period_type` | `period_key` | `id` | Created by |
|-------------|---------------|--------------|------|-----------|
| 1 | `day` | `2026-04-20` | `5ae4526a-39d4-48c9-bb9b-01c6012010f8` | D2 analysis/generate test |
| 2 | `trend_alert` | `trend:2026-04-20` | `4efd6f28-67b3-42b2-9d0f-dcff926ebec5` | D2 analysis/generate side-effect |

Deleted via `DELETE FROM public.hod_analysis_cache WHERE id IN (...)` with `RETURNING` confirmation. Post-deletion query confirmed zero rows created after 2026-04-23 13:30:00+03.

No bookings, reports, threads, or notifications were created during this validation run.

---

## 7. Residual risks

1. **BG function URL resolution (blocker).** The background function cannot be invoked on any branch deploy. This blocks D3, and partially blocks D4 (the Regenerate pending → fresh flow). Must be fixed before re-running Phase D.

2. **Silent fetch failure.** The POST handler's fire-and-forget `fetch` does not check the response status. Even after fixing the URL, any BG function failure (e.g. auth mismatch, OpenRouter timeout) would be silently swallowed and the client would see perpetual `pending: true`.

3. **Main branch deploy in `new` state.** Deploy `69e9d11d66ec96532daf69a9` on `main` triggered automatically by Netlify (noted in Phase C delivery §9). This is not blocking the dev branch, but it means the `URL` env var points to a broken state. If `main` auto-deploys are not desired, consider disabling them.

4. **Env var exposure.** During D1 verification, `netlify env:list --plain` was run which outputs all env var values including secrets. No values were persisted to any file, but this is a tooling risk for future validation runs. Recommend using `netlify env:list` (tabular, values hidden) instead.

---

## 8. Release recommendation

**Not ready.** One code-level fix is required before the v2.12 Phase 3 contract can be validated end-to-end:

- Fix `resolveBackgroundBaseUrl()` to use `DEPLOY_PRIME_URL` (or equivalent) on branch deploys.
- Add response status checking on the BG function fetch.
- Redeploy to `dev`.
- Re-run Phase D from D3 onwards.

D1 and D2 have passed cleanly and do not need re-running unless the fix touches those code paths. D4–D6 remain untested.

---

## 9. Exact next starting point

After the code fix is applied and redeployed:

1. Re-run D3 (BG function invocation + cache persistence check).
2. If D3 passes, proceed through D4, D5, D6 in order.
3. D7 cleanup for any new test data.
4. If all pass, proceed to release recommendation.

The fix is a one-line change in `resolveBackgroundBaseUrl()` plus a response-status guard on the `fetch` call. Both are in `admin-portal/app/api/daily-digest/handler.ts`.

---

*Phase D halted. Handing back with recommendation: fix the BG function URL resolution, redeploy, and re-run Phase D.*
