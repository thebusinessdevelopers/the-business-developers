# v2.12 Phase Two — Recovery Execution Plan

STATUS: awaiting-approval
Date: 2026-04-22
Owner on execution: the implementation agent (not this investigation)
Scope: the exact, ordered steps to clear the three v2.12 blockers identified in `20_04_test.md` and validated across the four `phase_two/` investigation documents.

Source documents (read in this order before starting):

1. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/tests.md/20_04_test.md`
2. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/00_recovery_sequence.md`
3. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/01_ai_orchestration_investigation.md`
4. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/02_schema_alignment_investigation.md`
5. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/03_deploy_refresh_path_investigation.md`
6. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/04_master_synthesis.md`

---

## 0. Facts resolved by Phase Two (do not re-investigate)

| # | Fact | Evidence |
|---|---|---|
| F1 | Active app DB is `inidzwfjnkyinxhvbrdt`. No second database. Test report line 116 inference was wrong. | `4_development/admin-portal/.env.local` has `NEXT_PUBLIC_SUPABASE_URL=https://inidzwfjnkyinxhvbrdt.supabase.co` |
| F2 | Live schema rejects `daily_brief`; constraint is `hod_analysis_cache_period_type_check` allowing `day\|week\|month` only. Repo's `019_analysis_cache.sql` declares no CHECK — drift is out-of-band. | `20_04_test.md` REL-002; `019_analysis_cache.sql` line 4–15 |
| F3 | Both deploy repos are at v2.11 HEADs (`fac6542` admin, `bda114e` portal); monorepo `4_development/` is untracked → manual `rsync` mirror, not branch merge. | `git log` on deploy repos; `git ls-files --error-unmatch` on monorepo |
| F4 | Admin site serves logo from `public/logo.png` only (no route). Portal site serves logo from `app/logo.png/route.ts` only (no public file). Monorepo admin-portal has both → causes local `next dev` 500. | `ls ~/hod_admin_portal/public`, `ls ~/hod_daily_reports/app/logo.png`, monorepo inventory |
| F5 | Both deploy repos ship `"@hod/shared": "*"` in `package.json`. Production proves this works. | `grep '"@hod/shared"' ~/hod_admin_portal/package.json ~/hod_daily_reports/package.json` |
| F6 | Orchestration root cause is ranked H1 (reasoning-budget) ≫ H3 (`response_format` rejection) > H2 (rate limit). Instrumented local reproduction must confirm before any defaults change. | `01_ai_orchestration_investigation.md` §§2–4 |
| F7 | Supabase MCP auth is currently `Unauthorized`. `plugin-supabase-supabase` exposes only `mcp_auth`. Must be authenticated before Phase B. | Two failed `execute_sql` attempts this session |

## Invariants (apply to every phase)

- No production promotion anywhere in this plan. `main` is not touched.
- British English in all outputs.
- Record each completed phase in `versions/v2.12/backlog.md` Decision Log with timestamp and, where applicable, commit SHA or migration filename.
- No destructive git action (force-push on `main`, hard reset on pushed shared history) at any point.
- Never log request bodies, prompts, or `feedback` values. Never print secret values. Reference secret names only.
- After every cleanup of test data, document it in the Decision Log.
- A phase is **not complete** until its documentation and handoff artefacts exist in `phase_two/`, are referenced in the Decision Log, and have been sanity-checked for absolute paths, missing evidence, and secret leakage.

## Cross-phase documentation and handoff protocol

At the end of **every** phase, the executing agent must produce both:

1. a delivery note for the phase just completed; and
2. a ready-to-run prompt for the next agent.

Required filenames:

| Phase completed | Delivery note to write | Next prompt to write |
|---|---|---|
| Phase A | `phase_a_delivery.md` | `phase_b_agent_prompt.md` |
| Phase B | `phase_b_delivery.md` | `phase_c_agent_prompt.md` |
| Phase C | `phase_c_delivery.md` | `phase_d_agent_prompt.md` |
| Phase D | `phase_d_delivery.md` | `phase_release_recommendation_prompt.md` |

Every delivery note must include:

- `STATUS:` token
- date and agent scope
- what changed
- what was verified
- exact commands / checks run
- evidence summary
- cleanup performed
- unresolved issues / risks
- exact next starting point

Every next-agent prompt must include:

- mission and phase boundary
- read-first file list in order
- exact allowed scope
- exact forbidden actions
- validation gates
- documentation outputs required before handoff
- explicit instruction to stop at the phase boundary and hand back

No phase gate may be marked passed until both artefacts have been written.

---

## Phase A — Fix orchestration locally

Goal: `runDailyDigestGeneration()` completes with `degraded === false` for a representative day on the local source, using the same active DB and same OpenRouter key the live Netlify sites use.

### A1. Add instrumentation only

File: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/openrouter.ts`

Extend `OpenRouterResponse` with an optional `finishReason?: string` and populate from `data.choices?.[0]?.finish_reason`. No other behaviour change.

File: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/daily-digest-generation.ts`

In `callSubAgent`, on both the `isError` branch and the `catch` branch, `console.error` with:

```
daily-digest-subagent: {
  agent,
  model,
  contentType: typeof result?.content,
  contentLen: (result?.content ?? '').length,
  reasoningLen: (result?.reasoning ?? '').length,
  finishReason: result?.finishReason ?? null,
  first200: (typeof result?.content === 'string' ? result.content : JSON.stringify(result?.content ?? '')).slice(0, 200),
  errorName: err?.name,
  errorMsgFirst200: (err?.message ?? String(err ?? '')).slice(0, 200)
}
```

Do **not** change `maxTokens`, `responseFormat`, `temperature`, or any default. This step produces evidence only.

Gate A1:

- `npx tsc --noEmit` from `4_development/admin-portal` → 0 errors.
- `npx tsc --noEmit` from `4_development/packages/shared` → 0 errors.
- `npm run lint -w admin-portal` → 0 errors.

### A2. Reproduce the degraded path locally

Use the same harness used on 20 Apr (direct call to `runDailyDigestGeneration` with a real `briefDate` that has reports and bookings in `inidzwfjnkyinxhvbrdt`). Capture the stderr log.

Decision fork based on the captured log:

- **Dominant signal: empty `content` + non-empty `reasoning` OR `finishReason === 'length'` OR content types non-string on all four calls** → H1 is confirmed. Proceed to A3a.
- **Dominant signal: error message matches `OpenRouter 429` or `OpenRouter 5\d\d` on all four calls** → H2 is confirmed. Proceed to A3b.
- **Dominant signal: error message mentions `response_format` / `json_object` not supported, or non-string / array-of-parts `content` on all four calls** → H3 is confirmed. Proceed to A3c.

Record the dominant signal verbatim (secret-redacted) in the Decision Log before changing any code.

### A3a. Fix for H1 (most likely)

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/daily-digest-generation.ts`:
  - In `callSubAgent`, raise `maxTokens` to `2000`.
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/openrouter.ts`:
  - Add `excludeReasoning?: boolean` to `OpenRouterOptions`.
  - When true, include `reasoning: { exclude: true }` in the request body.
- In `callSubAgent`, pass `excludeReasoning: true`.

### A3b. Fix for H2

- In `callSubAgent`, wrap the `callOpenRouter` call in a bounded retry: up to 2 retries, 250 ms / 750 ms backoff, retry only on an error message matching `OpenRouter 429` or `OpenRouter 5\d\d`.
- If the retry path does not fully clear it, serialise the four calls (`for` loop instead of `Promise.allSettled`). Wall-time still fits inside the BG function's 15-minute ceiling.

### A3c. Fix for H3

- In `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/openrouter.ts`, normalise `msg?.content`: if it is an array of parts, concatenate `.text`. If it is an object, `JSON.stringify` it. Always return a string.
- In `callSubAgent`, if the model is recognised as Gemini 2.5 Flash via OpenRouter, drop `responseFormat: 'json_object'` and rely on the prompt's "Return ONLY a single JSON object" instruction.

### A4. Harden classification (regardless of which A3 branch ran)

- Extend `SubAgentOutcome` with a `category` field: `'rate_limit' | 'empty_content' | 'invalid_json' | 'http_error' | 'truncated' | 'ok'`.
- Set the category in `callSubAgent` based on the signals captured by the A1 instrumentation.
- In `runDailyDigestGeneration` `degraded_reason`, include the category alongside the agent name, e.g. `Sub-agents failed: occupancy (empty_content), stock (empty_content)`.

### A5. Regression harness

Add under `4_development/admin-portal/__tests__/` (create folder if absent). These are node-runnable tests using the project's existing toolchain (or a minimal `node --test` harness if nothing is configured — pick the simpler option).

- `parseJsonOrError` cases: empty string, whitespace, plain JSON, fenced JSON, prose-prefixed, prose-trailing, `<think>`-wrapped, truncated JSON.
- `callOpenRouter` with mocked `fetch`:
  - string `content` returned verbatim
  - null / missing `content` → `''`
  - array-of-parts `content` → joined string (after A3c applies)
  - non-OK 429 → throw with status
  - `finish_reason: 'length'` → surfaced
- `callSubAgent` with mocked `callOpenRouter`:
  - empty content → `ok: false, category: 'empty_content'`
  - valid JSON → `ok: true, category: 'ok'`
  - thrown 429 → `ok: false, category: 'rate_limit'`
- End-to-end mocked `runDailyDigestGeneration`:
  - mocked Supabase stub returns a representative day
  - mocked `callOpenRouter` returns valid JSON for the four sub-agents and valid digest text for the orchestrator
  - asserts `status: 'generated'`, `degraded` falsy, `pipeline_version === 'v2.12-multi-agent'`, `sub_agent_models` includes the fast model slug, `orchestrator_model` includes the Sonnet slug.

### A6. Gate A — local green

- `npx tsc --noEmit` both projects → 0 errors.
- `npm run lint -w admin-portal` → 0 errors; warnings only within the pre-existing baseline.
- `npm run build` admin-portal → pass.
- Regression harness → all pass.
- Re-run the real `runDailyDigestGeneration` against a representative `briefDate` → `status: 'generated'`, `degraded === false`.
- Record the sample `analysis_data` shape (secret-redacted, no raw brief text) in the Decision Log.

Do not proceed to Phase B until Gate A passes.

### A7. Documentation and handoff (mandatory)

Create `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_a_delivery.md` containing:

- status and date
- files changed in Phase A
- exact root-cause signal captured in A2
- which A3 branch was chosen and why
- validation evidence for A6
- any cleanup performed
- remaining risks and open questions
- a short \"next agent starts here\" section

Create `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_b_agent_prompt.md` for the schema-alignment agent.

Update `versions/v2.12/backlog.md` Decision Log with the Phase A commit SHA, the validation result, and both new file paths.

---

## Phase B — Align the shared database schema

Goal: `hod_analysis_cache.period_type` CHECK accepts the full six-value allow-list required by v2.12 code, without breaking any `day|week|month` row.

### B1. Restore Supabase MCP auth

- Read `/Users/joshuaroy/.cursor/projects/Users-joshuaroy-the-business-developers/mcps/plugin-supabase-supabase/tools/mcp_auth.json` schema.
- Call `mcp_auth` on `plugin-supabase-supabase` and complete the flow.
- Verify with a trivial read: `SELECT now();` via `execute_sql`.
- If `project-0-the-business-developers-supabase` is still available and now authorised, prefer it (closer to the project's established tool).

### B2. Re-confirm active DB identity (belt-and-braces, since Phase Two already resolved this)

- Read the live Netlify site env for `admin-portal` and `portal`:
  `netlify env:list --site dev--hod-admin-portal.netlify.app` (or the equivalent linked-site command).
- Confirm `NEXT_PUBLIC_SUPABASE_URL` = `https://inidzwfjnkyinxhvbrdt.supabase.co` on both sites. If it diverges on either, stop and raise for decision before applying the migration.

### B3. Pre-apply read-only reconnaissance

Run via the authenticated MCP `execute_sql`:

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.hod_analysis_cache'::regclass
  AND contype = 'c';

SELECT period_type, COUNT(*)
FROM public.hod_analysis_cache
GROUP BY period_type
ORDER BY period_type;

SELECT COUNT(*) AS non_core_rows
FROM public.hod_analysis_cache
WHERE period_type NOT IN ('day','week','month');

SELECT polname, pg_get_expr(polqual, polrelid)
FROM pg_policy
WHERE polrelid = 'public.hod_analysis_cache'::regclass;
```

Quote the actual CHECK DDL string into the migration file header. If `non_core_rows > 0`, stop and re-scope — the widening is still safe (superset) but the rollback block needs extra handling.

### B4. Author the migration

Create: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/046_analysis_cache_period_type_expand.sql`

```sql
-- 046_analysis_cache_period_type_expand.sql
-- Run against: inidzwfjnkyinxhvbrdt (shared Supabase project — dev and prod)
-- Purpose: align hod_analysis_cache.period_type CHECK with v2.12 code.
-- Preserves day|week|month and additionally allows trend_alert,
-- daily_brief, weekly_brief.
-- Safe: no DML, no data rewrite, additive widening only.

BEGIN;

ALTER TABLE public.hod_analysis_cache
  DROP CONSTRAINT IF EXISTS hod_analysis_cache_period_type_check;

ALTER TABLE public.hod_analysis_cache
  ADD CONSTRAINT hod_analysis_cache_period_type_check
  CHECK (period_type IN (
    'day',
    'week',
    'month',
    'trend_alert',
    'daily_brief',
    'weekly_brief'
  ));

COMMIT;
```

Do **not** edit `019_analysis_cache.sql`.

### B5. Apply the migration

- Apply via Supabase MCP `apply_migration` with the file contents above.
- Do not run it via `execute_sql`.

### B6. Post-apply verification

```sql
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'hod_analysis_cache_period_type_check';
-- Expect: CHECK (period_type = ANY (ARRAY['day','week','month','trend_alert','daily_brief','weekly_brief']))
-- or equivalent IN form.
```

Dry-smoke every new value with a `BEGIN … ROLLBACK;` block, then clean up:

```sql
BEGIN;
INSERT INTO public.hod_analysis_cache (period_type, period_key, analysis_data)
VALUES ('trend_alert','__smoke__','{}'::jsonb);
INSERT INTO public.hod_analysis_cache (period_type, period_key, analysis_data)
VALUES ('daily_brief','__smoke__','{}'::jsonb);
INSERT INTO public.hod_analysis_cache (period_type, period_key, analysis_data)
VALUES ('weekly_brief','__smoke__','{}'::jsonb);
ROLLBACK;
-- No cleanup needed because of ROLLBACK, but confirm no rows remain.
SELECT COUNT(*) FROM public.hod_analysis_cache WHERE period_key = '__smoke__';
```

### B7. Gate B

- New CHECK DDL matches the six-value allow-list.
- Smoke inserts succeeded under rollback.
- `day|week|month` row counts unchanged.
- Record migration filename and apply timestamp in Decision Log.

### B8. Documentation and handoff (mandatory)

Create `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_b_delivery.md` containing:

- status and date
- exact authenticated MCP server used
- quoted live CHECK DDL
- migration filename and apply timestamp
- pre-apply and post-apply query results
- confirmation that smoke inserts succeeded under rollback
- cleanup performed (if any)
- remaining risks and open questions
- a short \"next agent starts here\" section

Create `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_c_agent_prompt.md` for the deploy-refresh agent.

Update `versions/v2.12/backlog.md` Decision Log with the migration filename, apply timestamp, and both new file paths.

---

## Phase C — Refresh the deploy repos

Goal: both `dev--` Netlify aliases serve v2.12 code built from a fresh commit. Admin first; portal second.

### C0. One-off monorepo preparation (before any mirror)

- **Resolve the `/logo.png` conflict on the admin side.** Delete `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/logo.png/route.ts` from the monorepo. Also remove the parent folder if empty. Keep `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/public/logo.png`. Rationale: the live admin deploy serves the logo from `public/logo.png` only (route was removed during v2.11). The monorepo currently has both, which is what produces the local `next dev` 500 recorded as REL-005.
- **Do not touch the portal side** — its `app/logo.png/route.ts` is the production pattern and there is no conflicting `public/logo.png`.
- **Do not change `"@hod/shared": "*"`** in either deploy repo's `package.json` during this refresh. v2.11 proves `"*"` works.
- Re-run `npx tsc --noEmit` + `npm run build` on the monorepo admin-portal after the logo delete to confirm nothing else referenced the deleted route.

### C1. Admin deploy refresh

Working dir: `/Users/joshuaroy/hod_admin_portal`.

1. `git fetch origin`
2. `git checkout dev`
3. `git pull --ff-only`
4. Mirror directories per `03_deploy_refresh_path_investigation.md §4.1`. Use `rsync -a --delete` per top-level directory, with these excludes on every call: `--exclude=.git --exclude=node_modules --exclude=.next --exclude=.netlify --exclude=tsconfig.tsbuildinfo --exclude=.env --exclude=.env.local --exclude=.env.production`. Start with `--dry-run` first; only then run the live mirror.
5. Replace `packages/shared/` atomically: `rm -rf packages/shared && mkdir -p packages && rsync -a --exclude=node_modules <monorepo>/packages/shared/ packages/shared/`.
6. Pre-push checklist (run from `~/hod_admin_portal`; all must pass):
   - `git status` — file list scanned by a human; nothing outside §4.1 appears; no `.env`, `node_modules`, build artefacts, or Mac metadata files.
   - `rm -rf node_modules && npm install` — clean install resolves; `@netlify/functions` installed.
   - `npx tsc --noEmit` → 0 errors.
   - `npm run lint` → 0 errors (warnings within baseline).
   - `npm run build` → pass; `/api/daily-digest` appears as a dynamic route.
   - `grep '"@hod/shared"' package.json` → still `"*"`.
   - `test -f .env.example` → exists.
   - `grep '@netlify/functions' package.json` → devDep present.
   - `grep OPENROUTER_MODEL netlify.toml` → `[build.environment]` block present.
   - `ls netlify/functions/daily-digest-background.ts netlify/functions/_internal-auth.ts` → both present.
   - `ls app/logo.png 2>&1` → "No such file or directory" (route not shipped).
   - `ls public/logo.png` → exists.
7. `git add -A && git status` (human review).
8. `git commit -m "v2.12 Phase 3: mirror admin from monorepo"` (SOP commit style).
9. `git push origin dev`.
10. Watch the Netlify admin dev build (CLI: `netlify watch` or UI). If it fails, do not proceed to portal; capture the log, decide fix-forward vs revert per `03_deploy_refresh_path_investigation.md §8.1`.

### C2. Portal deploy refresh

Only run after C1 succeeds and `dev--hod-admin-portal.netlify.app` shows the new commit SHA.

Working dir: `/Users/joshuaroy/hod_daily_reports`.

Steps identical in shape to C1, using paths from `03_deploy_refresh_path_investigation.md §4.2`, with the following portal-specific additions:

- Include `supabase/migrations/` in the mirror — the four new v2.12 migrations `042_v212_augustu.sql`, `043_v212_chalet_pax.sql`, `044_v212_a06_rate_corrections.sql`, `045_v212_aframe_rename.sql` must be present. Do not mirror `046_analysis_cache_period_type_expand.sql` into the portal deploy repo unless it was authored under `portal/supabase/migrations/` (it should be). Confirm with `ls supabase/migrations/042_v212_*.sql supabase/migrations/043_v212_*.sql supabase/migrations/044_v212_*.sql supabase/migrations/045_v212_*.sql supabase/migrations/046_*.sql`.
- Pre-push diff gate: `diff -rq packages/shared ../hod_admin_portal/packages/shared` — must print nothing. This is the shared-code skew check and it is mandatory.
- Logo: `ls app/logo.png` → directory exists; `ls public/logo.png` → not present (only `.media_ref` placeholders). Confirm.

Commit and push: `git commit -m "v2.12 Phase 3: mirror portal from monorepo" && git push origin dev`.

### C3. Gate C

- Both deploy repos pushed successfully.
- Both Netlify dev builds green.
- Deploy metadata on both `dev--` aliases shows the new commit SHAs (not `fac6542` / `bda114e`).
- `packages/shared` is byte-identical across the two deploy repos (re-run the diff after both pushes).
- Record both commit SHAs and Netlify deploy IDs in the Decision Log.

### C4. Documentation and handoff (mandatory)

Create `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_c_delivery.md` containing:

- status and date
- exact mirror commands used
- admin and portal commit SHAs
- Netlify deploy IDs and timestamps
- proof that `packages/shared` matched across both deploy repos
- note of the resolved admin `/logo.png` conflict
- any cleanup performed
- remaining risks and open questions
- a short \"next agent starts here\" section

Create `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_d_agent_prompt.md` for the live-validation agent.

Update `versions/v2.12/backlog.md` Decision Log with both deploy commit SHAs, deploy IDs, and both new file paths.

---

## Phase D — Live validation gate

Goal: confirm the refreshed dev aliases meet the approved v2.12 Phase 3 contract end-to-end. Run these against the `dev--` aliases using the shared password (`ziwa2026`) for admin test logins, via the browser-automation flow in `@global/sops/browser_use.md`. Clean up any data touched.

### D1. Deploy freshness

- `dev--hod-admin-portal.netlify.app` deploy metadata shows the commit SHA pushed in C1.
- `dev--hoddailyreports.netlify.app` deploy metadata shows the commit SHA pushed in C2.

### D2. Admin Phase 3 API contract

- `POST /api/daily-digest` with valid admin session → **202** with `{ accepted: true, brief_date }` in under 2 s.
- `GET /api/daily-digest` → cache response (`{ pending: true }`, `{ stale: true, ... }`, or fresh digest) in well under 2 s. The ~8.5 s stall from 20 Apr must be gone.
- `POST /api/analysis/generate` with 600-char `feedback` → **400**; with valid feedback → **200**.
- `POST /api/analysis/weekly-brief` with 600-char `feedback` → **400**.

### D3. Background + cache persistence

- Netlify Functions UI shows a `daily-digest-background` invocation that completes.
- `hod_analysis_cache` row with `period_type = 'daily_brief'` for the test `briefDate` carries `pipeline_version = 'v2.12-multi-agent'`, `sub_agent_models` containing the fast-model slug, `orchestrator_model` containing the Sonnet slug, and `degraded === false`.
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

For every test-created row (cache writes, bookings, reports, threads, notifications), delete or soft-delete after D3–D6. Document the exact `period_type`/`period_key` or row id removed in the Decision Log.

### D8. Gate D

- All of D1–D6 pass.
- D7 cleanup complete and documented.
- Record deploy IDs and sample evidence in Decision Log.

Only after Gate D passes should Joshua be asked for `APPROVED: phase_3_complete`. Only after that approval should any `main` promotion be considered (out of scope for this plan).

### D9. Documentation and handoff (mandatory)

Create `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_d_delivery.md` containing:

- status and date
- full validation result summary
- exact browser / API / database checks run
- deploy IDs and commit SHAs validated
- cleanup log
- any residual risks
- release recommendation: ready / not ready for Joshua sign-off

Create `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_release_recommendation_prompt.md` for the final approval / release-prep agent. This prompt must remain explicitly out of scope for production promotion unless Joshua has already signed `APPROVED: phase_3_complete`.

Update `versions/v2.12/backlog.md` Decision Log with the validation outcome and both new file paths.

---

## Rollback matrix

| If failure at | Rollback | Production impact |
|---|---|---|
| Phase A | `git restore` / `git checkout .` on the touched files in the monorepo | None |
| Phase B (before apply) | Stop; do not apply | None |
| Phase B (after apply, regression) | Apply the guarded rollback SQL in `02_schema_alignment_investigation.md §7.2` (refuses when rows exist with the widened values) | None if no new rows yet; otherwise rollback is refused and fix-forward is required |
| Phase C admin only | `git reset --hard fac6542 && git push --force-with-lease origin dev` on `hod_admin_portal` | None |
| Phase C both (shared-skew risk) | Revert both deploy repos to `fac6542` / `bda114e` with `git reset --hard && git push --force-with-lease`; re-publish previous successful Netlify `dev` deploys via UI | None |
| Phase D live failure | Same as Phase C both; root-cause before retry | None |

`main` is never touched by any of these actions.

---

## Follow-ups to raise (out of scope for this plan)

- Correct `next_chat_handover.md` item 12 to reflect reality: admin serves logo from `public/logo.png`; portal serves from `app/logo.png/route.ts`. v2.13 hygiene.
- Decide `"@hod/shared": "*"` vs `"file:packages/shared"` as a dedicated v2.13 hygiene item with its own testing. Do not bundle with v2.12 recovery.
- Capture the currently-undocumented `hod_analysis_cache_period_type_check` constraint under migration control — the new `046_analysis_cache_period_type_expand.sql` effectively does this, but audit whether any other table has similar out-of-band constraints.
- Consider pinning `supabase-js` in `packages/shared/package.json` so both workspaces resolve the same type declaration (`phase_3_handover.md §e`, v2.13 hygiene).

---

## Starting point for the implementation agent

Do **Phase A step A1 only** in the first commit:

1. Read this plan and `01_ai_orchestration_investigation.md` in full.
2. Add the `finishReason` pass-through in `4_development/packages/shared/lib/openrouter.ts`.
3. Add the `console.error` instrumentation in `4_development/admin-portal/lib/daily-digest-generation.ts` `callSubAgent`.
4. Run `npx tsc --noEmit` on both projects; both must be 0 errors.
5. Commit with `feat(daily-digest): instrument sub-agent outcomes for Phase Two recovery` (or the project's equivalent style), push to a working branch only — do not push to deploy repos yet.
6. Reproduce the degraded path locally, capture the log, and hand back to Joshua for Phase A3 branch selection.
7. Before closing the phase, write `phase_a_delivery.md` and `phase_b_agent_prompt.md` exactly as required in A7.

That commit introduces zero runtime behaviour change and produces the decisive evidence every later step depends on.

---

*End of plan. Ready for Joshua's approval and handover to the implementation agent.*
