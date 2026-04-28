# Phase D2 Agent Prompt — v2.12 Recovery (BG URL Fix + D4–D6)

STATUS: complete
Date: 2026-04-23
Phase boundary: **D3 BG URL fix, then D3 re-run, then D4–D6**

Use this prompt for the agent responsible for fixing the D3 blocker, validating it, and completing the remaining Phase D live validation checks.

---

## Context

Phase D ran on 2026-04-23. D1 and D2 passed. D3 (background function + cache persistence) failed. The root cause was identified but no code change was made. This agent fixes it, validates it, then continues through D4–D6.

---

## Read first, in this order

1. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_d_delivery.md` — full D3 failure analysis
2. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_two_plan.md` §§Phase D
3. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/tests.md/20_04_test.md`
4. `/Users/joshuaroy/the-business-developers/global/sops/browser_use.md`

Resolved facts you do **not** need to re-investigate:

- D1 passed: Admin deploy `69e9cfc631266e0008bdb0f7`, commit `67bb8e1`, ready. Portal deploy `69e9d060123ba100087ce1f9`, commit `86892a0`, ready.
- D2 passed: `GET /api/daily-digest` returns in ~1 s; `POST` returns 202 in ~857 ms; 600-char feedback → 400 on both analysis endpoints.
- D3 blocker: `resolveBackgroundBaseUrl()` in `handler.ts` picks `process.env.URL` first. On a branch deploy, Netlify sets `URL` to the main site (`https://hod-admin-portal.netlify.app`). The main site returns **404** for `/.netlify/functions/daily-digest-background` because its deploy is in `new` state. The dev branch alias (`https://dev--hod-admin-portal.netlify.app`) returns **202** — the function is deployed and working. The `fetch` call does not check the response status, silently swallowing the 404.
- D7 cleanup (from first Phase D run) is already complete — 2 test rows deleted.
- Admin site test password: `ziwa2026`.
- Active DB: `inidzwfjnkyinxhvbrdt`.

---

## Scope allowed

You may:

- Edit exactly **one file**: `4_development/admin-portal/app/api/daily-digest/handler.ts`
- Mirror the fixed file to `~/hod_admin_portal/app/api/daily-digest/handler.ts` and push to the `dev` branch of the admin deploy repo.
- Make HTTP requests (browser automation, `curl`, `fetch`) against the `dev--` aliases.
- Read from Supabase `inidzwfjnkyinxhvbrdt` via MCP `execute_sql` (SELECT only).
- Delete test data you create during validation (D7 addendum).
- Write files within `versions/v2.12/phase_2_recovery_release/` (delivery note).
- Update `versions/v2.12/backlog.md` Decision Log.

---

## Forbidden actions

Do **not**:

- Change any file other than `handler.ts` (monorepo) and its mirror in the admin deploy repo.
- Touch the portal deploy repo.
- Run any Supabase DDL or non-cleanup DML.
- Promote anything to `main`.
- Continue past the Phase D boundary.

---

## Step 0 — Validate the issue before touching code

Run these two `curl` calls first and record both responses:

```
curl -s -o /dev/null -w "%{http_code}" \
  https://hod-admin-portal.netlify.app/.netlify/functions/daily-digest-background \
  -X POST -H "Content-Type: application/json" -d '{}'

curl -s -o /dev/null -w "%{http_code}" \
  https://dev--hod-admin-portal.netlify.app/.netlify/functions/daily-digest-background \
  -X POST -H "Content-Type: application/json" -d '{}'
```

Expected: main site → **404**, dev alias → **202**. If both return 404 or both return 200, stop and re-investigate before touching code.

---

## Step 1 — Implement the fix

File: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/daily-digest/handler.ts`

### Change 1: `resolveBackgroundBaseUrl()`

Current (lines 18–25):

```typescript
function resolveBackgroundBaseUrl(): string {
  const raw = process.env.URL
    ?? process.env.DEPLOY_URL
    ?? process.env.DEPLOY_PRIME_URL
    ?? process.env.NEXT_PUBLIC_SITE_URL
    ?? ''
  return raw.replace(/\/+$/, '')
}
```

Replace with:

```typescript
function resolveBackgroundBaseUrl(): string {
  const raw = process.env.DEPLOY_PRIME_URL
    ?? process.env.DEPLOY_URL
    ?? process.env.URL
    ?? process.env.NEXT_PUBLIC_SITE_URL
    ?? ''
  return raw.replace(/\/+$/, '')
}
```

Rationale: `DEPLOY_PRIME_URL` is the branch alias URL (e.g. `https://dev--hod-admin-portal.netlify.app`). `URL` is always the main site production URL. By checking `DEPLOY_PRIME_URL` first, branch deploys correctly target their own function endpoint.

### Change 2: add response-status guard on the BG function fetch

Current (lines 100–112):

```typescript
  try {
    await fetch(bgUrl, {
      method: 'POST',
      headers: buildInternalHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ briefDate, force, ...(feedback ? { feedback } : {}) }),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json(
      { error: 'Failed to enqueue daily brief regeneration', detail: msg.slice(0, 200) },
      { status: 502 }
    )
  }
```

Replace with:

```typescript
  try {
    const bgRes = await fetch(bgUrl, {
      method: 'POST',
      headers: buildInternalHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ briefDate, force, ...(feedback ? { feedback } : {}) }),
    })
    if (!bgRes.ok && bgRes.status !== 202) {
      console.error('daily-digest-background enqueue failed:', bgRes.status, bgUrl)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json(
      { error: 'Failed to enqueue daily brief regeneration', detail: msg.slice(0, 200) },
      { status: 502 }
    )
  }
```

Rationale: background functions return 202, not 200. Log any non-202 response so failures are visible in function logs rather than silently discarded.

**No other changes to this file.**

---

## Step 2 — Pre-push validation on the monorepo

From `4_development/admin-portal`:

```
npx tsc --noEmit        # must be 0 errors
npm run lint            # 0 errors (pre-existing warnings are acceptable)
npm run build           # must pass; /api/daily-digest must appear as dynamic route
```

All three must pass. If any fail, fix the failure before proceeding.

---

## Step 3 — Mirror and push

Working dir: `/Users/joshuaroy/hod_admin_portal`

1. `git fetch origin && git checkout dev && git pull --ff-only`
2. Copy the fixed file only:
   ```
   cp /Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/daily-digest/handler.ts \
      /Users/joshuaroy/hod_admin_portal/app/api/daily-digest/handler.ts
   ```
3. `git diff` — confirm only `handler.ts` changed; confirm the two hunks (URL priority order + fetch status guard).
4. `git add app/api/daily-digest/handler.ts`
5. `git commit -m "fix(daily-digest): resolve BG function URL on branch deploys; guard fetch status"`
6. `git push origin dev`
7. Wait for Netlify to build and the new deploy to reach `ready` state. Record the new deploy ID and commit SHA.

---

## Step 4 — Re-validate Step 0 on the fresh deploy

After the new deploy is `ready`, repeat the `curl` calls from Step 0:

- Main site should still return **404** (expected, correct).
- Dev alias should still return **202** (unchanged).

Then immediately re-run the authenticated POST from within the browser session to confirm the BG function is now being invoked:

```javascript
// In browser on dev--hod-admin-portal.netlify.app, logged in as MD
const r = await fetch('/api/daily-digest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
})
// Expect 202
```

Then wait up to 5 minutes, polling `GET /api/daily-digest` every 30 s for `pending: true` → fresh response. If still pending after 5 min, check DB for a `daily_brief` row and stop with a documented failure.

---

## D3 gate (must pass before D4)

All of the following must be true:

- `hod_analysis_cache` row with `period_type = 'daily_brief'` exists for the test `briefDate`.
- `analysis_data->>'pipeline_version'` = `'v2.12-multi-agent'`
- `analysis_data->>'sub_agent_models'` contains `'google/gemini-2.5-flash'`
- `analysis_data->>'orchestrator_model'` contains `'anthropic/claude-sonnet-4.5'`
- `analysis_data->>'degraded'` = `'false'` or absent
- No `feedback` key in `analysis_data`

Verify using:

```sql
SELECT
  period_type,
  period_key,
  generated_at,
  analysis_data->>'pipeline_version'   AS pipeline_version,
  analysis_data->>'sub_agent_models'   AS sub_agent_models,
  analysis_data->>'orchestrator_model' AS orchestrator_model,
  analysis_data->>'degraded'           AS degraded,
  analysis_data ? 'feedback'           AS has_feedback_key
FROM public.hod_analysis_cache
WHERE period_type = 'daily_brief'
ORDER BY generated_at DESC
LIMIT 3;
```

If D3 does not pass, do **not** proceed to D4. Document the failure and hand back.

---

## D4 — UI smoke

In the browser (logged in as MD on `dev--hod-admin-portal.netlify.app`):

- Overview page shows the **Daily Brief** card with a **Regenerate** button in the header.
- Click **Regenerate** — a `maxLength={500}` textarea and **Start regeneration** button appear.
- Click **Start regeneration** — card flips to pending state.
- While pending, confirm the polling interval is 15 s (can be inferred from `GET /api/daily-digest` calls visible in network or by waiting and observing transitions).
- Once the digest appears, confirm the card reverts to a 5-minute polling interval (or shows a fresh non-pending state).

---

## D5 — Assets and cross-site sanity

- `curl -sI https://dev--hod-admin-portal.netlify.app/logo.png | grep -i "HTTP/"` → **200**
- `curl -sI https://dev--hoddailyreports.netlify.app/logo.png | grep -i "HTTP/"` → **200**
- Navigate to portal login and confirm the booking manager modal and Rooms tab load without errors.
- Test the submit-report offset guard:
  - `POST /api/submit-report` on the **portal** with a 2-day-lagged `report_date` and no `confirm_offset` → soft-confirm **4xx**
  - Same payload with `confirm_offset: true` → **200**
  - Do this from an authenticated HOD portal session. Clean up any created report afterwards.

---

## D6 — Regression (deferred Phase 2 browser smokes)

Run the carry-over Phase 2 live smokes listed in `20_04_test.md §7`. The specific items blocked by stale deploys at the time were:

- Portal login → HOD report submission flow (end-to-end from authenticated portal user).
- Admin portal: A-01 room management capability visible for `admin.isaac`.
- Admin portal: A-06 rate check — open a booking for Karungi → correct `$300 FB STO` default rate visible.

Run all of these on the live `dev--` aliases. All must pass.

---

## D7 (addendum) — Cleanup

For every test-created row during D3 re-run, D5, and D6:

- Delete or soft-delete after validation.
- Document the exact `period_type` / `period_key` or row ID removed.
- Verify via SELECT that zero test rows remain.

---

## Gate D (final)

All of D1–D6 must pass. D7 cleanup must be documented. Only after Gate D is confirmed should Joshua be asked for `APPROVED: phase_3_complete`.

---

## Documentation requirements before handoff

Phase D2 is **not complete** until both files below are written:

1. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_d2_delivery.md`
2. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_release_recommendation_prompt.md` — **overwrite** the existing file with a final version once Gate D passes

### `phase_d2_delivery.md` must include

- `STATUS:` token
- date and new admin deploy commit SHA + deploy ID
- Step 0 validation results (pre-fix curl responses)
- exact changes made to `handler.ts` (diff summary)
- Step 2 pre-push gate results
- Step 4 post-deploy curl validation results
- full validation result per D3 re-run, D4, D5, D6
- exact DB query results for D3 gate
- D7 addendum cleanup log
- any residual risks
- release recommendation: **ready** or **not ready**

Also update `versions/v2.12/backlog.md` Decision Log with:

- the fix (file, commit SHA, deploy ID)
- validation outcome (pass/fail per check)
- cleanup log
- absolute paths to `phase_d2_delivery.md` and the updated `phase_release_recommendation_prompt.md`

---

## Delivery format in chat when complete

Return a concise summary:

1. Overall pass/fail verdict
2. Step 0 pre-fix validation result
3. Exact change summary for `handler.ts`
4. New deploy commit SHA and deploy ID
5. Per-check results (D3 re-run, D4, D5, D6)
6. Cleanup summary (D7 addendum)
7. Any residual risks
8. Release recommendation
9. Exact paths written

**Do not promote to `main`. Do not continue past Phase D.**
