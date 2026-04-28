# v2.12 Recovery Sequence

STATUS: scoping
Date: 2026-04-20

> Purpose: document the exact investigation and later fix sequence for the three blockers identified in `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/tests.md/20_04_test.md`, without making any code, schema, or deployment changes in this document.

---

## 1. Scope

This document covers the three blockers that currently prevent meaningful v2.12 validation on dev:

1. **Deployment drift** — the `dev--` Netlify aliases are not serving the approved v2.12 code.
2. **Runtime schema drift** — the active `hod_analysis_cache` constraint does not support the Phase 3 `period_type` values.
3. **AI orchestration fault** — the current local multi-agent daily-digest path degrades incorrectly even though standalone sub-agent probes succeed.

This is a sequencing and investigation handoff only. No fix is applied here.

---

## 2. Current understanding

### 2.1 Deployment model

The project deploys through **three repos**, not directly from the monorepo:

| Repo | Role | Production | Dev preview |
|---|---|---|---|
| `thebusinessdevelopers/the-business-developers` | Monorepo source + docs | `main` | `dev` |
| `thebusinessdevelopers/hod_daily_reports` | HOD portal deploy repo | `main` -> `https://hoddailyreports.netlify.app` | `dev` -> `https://dev--hoddailyreports.netlify.app` |
| `thebusinessdevelopers/hod_admin_portal` | Admin portal deploy repo | `main` -> `https://hod-admin-portal.netlify.app` | `dev` -> `https://dev--hod-admin-portal.netlify.app` |

The deploy repos are standalone mirrors of `portal/` and `admin-portal/`, each bundling a copy of `packages/shared/`. Netlify does not build from the monorepo workspace layout.  
[Source: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/context.md`]  
[Source: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/3_architecture/build_rules.md`]  
[Source: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/next_chat_handover.md`]

### 2.2 Deployment blocker

Testing confirmed that both `dev--` aliases are still serving **13 Apr 2026** deploys, not the approved v2.12 Phase 3 work recorded on **20 Apr 2026**. That means the dev previews are stale because the split deploy repos were not refreshed from the monorepo and pushed to `dev`.  
[Source: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/tests.md/20_04_test.md`]

### 2.3 Schema blocker

The checked-in schema for `hod_analysis_cache` in  
`/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/019_analysis_cache.sql`  
defines **no `period_type` CHECK constraint**.

However, runtime probes during testing showed the active database rejects `period_type = 'daily_brief'` and only currently contains:

- `day`
- `week`
- `month`

That means the live database has drifted from the checked-in migration state. The issue is **not** “wrong database target”; the local app env and the documented project both point at `inidzwfjnkyinxhvbrdt`. The issue is schema state inside that project.  
[Source: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/context.md`]  
[Source: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/tests.md/20_04_test.md`]

### 2.4 Orchestration blocker

The current local Phase 3 source returns:

- `pipeline_version = 'v2.12-multi-agent'`
- `sub_agent_models = ['google/gemini-2.5-flash']`
- `orchestrator_model = 'anthropic/claude-sonnet-4.5'`
- `degraded = true`
- `degraded_reason = 'Sub-agents failed: occupancy, stock, compliance, action_items'`

Yet standalone probes showed:

- the fast model path itself works
- Occupancy sub-agent succeeds with real data
- Compliance sub-agent succeeds with real data

So the likely problem is **inside orchestration / result handling**, not basic model availability.  
[Source: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/tests.md/20_04_test.md`]

---

## 3. Required runtime contract

The codebase currently expects these `hod_analysis_cache.period_type` values:

| Route / path | Required `period_type` |
|---|---|
| Period analysis generate | `day`, `week`, `month` |
| Trend analysis | `trend_alert` |
| Daily brief | `daily_brief` |
| Weekly brief | `weekly_brief` |

This means the runtime schema must support **all six** values:

- `day`
- `week`
- `month`
- `trend_alert`
- `daily_brief`
- `weekly_brief`

The current runtime environment clearly does not.  
[Source: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/analysis/generate/handler.ts`]  
[Source: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/analysis/trends/route.ts`]  
[Source: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/analysis/weekly-brief/route.ts`]  
[Source: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/daily-digest/handler.ts`]

---

## 4. Safe recovery order

### Phase A — Fix the code issue locally first

Do **not** redeploy first. The current local source still has a genuine Phase 3 failure.

Order:

1. Reproduce the local degraded result using the existing daily-digest generation entrypoint.
2. Instrument the four sub-agent outcomes so each failure is classified as one of:
   - provider throw / rate-limit / 5xx
   - non-string `message.content`
   - invalid JSON parse
   - empty `content`
   - unexpected payload shape
3. Compare:
   - current parallel `Promise.allSettled` execution
   - sequential sub-agent execution with the same inputs
4. Confirm whether the root cause is:
   - concurrency / provider pressure
   - content-normalisation mismatch in the shared OpenRouter client
   - orchestration bug in `daily-digest-generation.ts`
5. Only once local generation completes without false degradation should deployment be considered.

### Phase B — Align the shared database schema

Do this with a **new migration**, not by editing `019_analysis_cache.sql`.

The schema change must:

1. preserve current `day|week|month` behaviour
2. add support for `trend_alert`, `daily_brief`, and `weekly_brief`
3. be safe for the shared dev/prod database
4. be verified before any redeploy

### Phase C — Refresh the deploy repos

Once local code and database schema are correct:

1. mirror updated monorepo `admin-portal/` + `packages/shared/` into `thebusinessdevelopers/hod_admin_portal`
2. mirror updated monorepo `portal/` + `packages/shared/` into `thebusinessdevelopers/hod_daily_reports`
3. push both deploy repos to `dev`
4. wait for both `dev--` Netlify aliases to rebuild

### Phase D — Re-run live validation

Only after A + B + C:

1. verify deploy metadata references the new commits
2. verify `POST /api/daily-digest` returns **202**
3. verify `GET /api/daily-digest` is cache-read-only and fast
4. verify `daily_brief` and `weekly_brief` rows persist with:
   - `pipeline_version`
   - `sub_agent_models`
   - `orchestrator_model`
5. verify oversized `feedback` returns **400**
6. verify the Daily Brief card shows the new Regenerate flow on the live dev deploy
7. re-run the deferred Phase 2 browser smokes on the now-correct dev aliases

---

## 5. Exact investigation agenda for the next agent

The next deep-investigation agent should work in this order.

### Track 1 — AI orchestration

Target files:

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/daily-digest-generation.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/openrouter.ts`

Questions to answer:

1. Why does full generation say all four sub-agents failed when standalone probes succeed?
2. Is the failure caused by:
   - four parallel fast-model calls
   - bad content normalisation
   - JSON parsing assumptions
   - error handling that misclassifies successes as failures?
3. What is the smallest safe code change to fix it?
4. What regression harness proves the fix?

### Track 2 — Schema alignment

Target files / artefacts:

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/019_analysis_cache.sql`
- new migration to be authored later under the same migrations folder
- live `hod_analysis_cache` constraint state in Supabase project `inidzwfjnkyinxhvbrdt`

Questions to answer:

1. What is the exact current live check constraint definition?
2. When did it diverge from repo truth?
3. Are there any existing rows using `trend_alert`, `daily_brief`, or `weekly_brief`?
4. What is the safest additive migration to align the constraint?
5. What is the rollback if the constraint needs to be reverted later?

### Track 3 — Deploy repo refresh path

Target sources:

- monorepo source:
  - `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/`
  - `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/`
  - `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/`
- deploy model docs:
  - `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/context.md`
  - `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/3_architecture/build_rules.md`
  - `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/next_chat_handover.md`

Questions to answer:

1. What exact steps are required to mirror monorepo v2.12 into each deploy repo?
2. What files must be identical across both repos because of `packages/shared/`?
3. What pre-push validation should be mandatory in each deploy repo?
4. What are the safest rollback points if one deploy succeeds and the other fails?

---

## 6. Recommended implementation sequence

When execution begins later, the safest order is:

1. fix the orchestration bug locally
2. prove it locally
3. add the additive schema migration
4. apply / align schema on the shared database
5. refresh both deploy repos from the corrected monorepo state
6. push both deploy repos to `dev`
7. re-run live browser / API / cache validation
8. only then consider `main` promotion

Do **not** swap steps 1 and 5. Redeploying known-bad orchestration logic only burns QA time.

---

## 7. Validation gates for later execution

No implementation should be considered complete until all of these pass:

### Gate 1 — Local code

- full daily-digest generation returns `degraded: false` for a representative date
- standalone sub-agent probes still succeed
- period analysis and weekly brief routes still compile and run

### Gate 2 — Shared database

- `daily_brief` upsert succeeds
- `weekly_brief` upsert succeeds
- `trend_alert` upsert succeeds
- existing `day|week|month` paths still work

### Gate 3 — Dev deploys

- `dev--hod-admin-portal` serves the new Regenerate UI
- `POST /api/daily-digest` returns **202**
- background execution writes cache rows
- oversized `feedback` returns **400**
- live dev aliases show the new deploy commit SHAs

### Gate 4 — Regression

- deferred Phase 2 browser smokes pass on the refreshed dev aliases
- no new critical blocker appears in the final validation report

---

## 8. Rollback notes

If later execution fails:

- **Deploy rollback:** re-publish previous successful Netlify `dev` deploys or revert the deploy-repo `dev` commits.
- **Schema rollback:** do not tighten the constraint back until any newly-created `daily_brief`, `weekly_brief`, or `trend_alert` rows are understood and handled.
- **Shared package rollback:** rollback admin and portal deploy repos together to avoid shared-code skew.

---

## 9. Folder intent after reorganisation

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_1_development/investigations/phase_one/`
  - archived original investigation set used to design and build v2.12
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/`
  - new post-test recovery and deep-investigation work

This file is the first document in `phase_two`.
