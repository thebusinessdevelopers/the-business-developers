# Phase B Agent Prompt — v2.12 Recovery

STATUS: complete
Date: 2026-04-22
Phase boundary: **Phase B only**

Use this prompt for the implementation agent responsible for Phase B (schema alignment) of the v2.12 recovery effort. Phase A is complete — `runDailyDigestGeneration` now returns `degraded === false` locally. The only reason the live `hod_analysis_cache` write still fails is a missing widening of `period_type`.

---

## Mission

Widen `public.hod_analysis_cache.period_type`'s CHECK constraint on `inidzwfjnkyinxhvbrdt` so it accepts the full six-value v2.12 allow-list (`day`, `week`, `month`, `trend_alert`, `daily_brief`, `weekly_brief`). Do this via a new, numbered migration that is applied safely and verified in place. Do **not** touch code. Do **not** touch deploy repos. Do **not** promote anything to `main`.

You must stop at the end of Phase B and hand back. You must not start Phase C (deploy refresh) or Phase D (live validation).

---

## Read first, in this order

1. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_a_delivery.md`
2. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_two_plan.md` §§Phase B
3. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/02_schema_alignment_investigation.md`
4. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/tests.md/20_04_test.md` — REL-002
5. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/019_analysis_cache.sql`

Resolved facts you do **not** need to re-investigate:

- Active app DB = `inidzwfjnkyinxhvbrdt`; both dev sites' `NEXT_PUBLIC_SUPABASE_URL` point to it.
- The widening is **additive** (superset of the current `day|week|month` values), so no existing row is affected.
- `019_analysis_cache.sql` does not declare the CHECK — the constraint was added out-of-band. Do not edit that file.
- Phase A instrumentation, fix (`H5 + H1`), regression harness, and local reproduction are all landed. The only remaining blocker for Phase 3 validation is the schema.

---

## Scope allowed

You may change only what is needed for Phase B inside:

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/` — one new migration file.
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/` — delivery note and the Phase C prompt.
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/backlog.md` — Decision Log entry only.

Allowed actions:

- authenticate the Supabase MCP server (`plugin-supabase-supabase` `mcp_auth`, or `project-0-the-business-developers-supabase` if available and authorised).
- run the pre-apply read-only SQL reconnaissance.
- author `046_analysis_cache_period_type_expand.sql`.
- apply via MCP `apply_migration`.
- run the post-apply verification SQL and the rollback-guarded smoke inserts.
- write the mandatory Phase B handoff artefacts.

---

## Forbidden actions

Do **not**:

- change any TypeScript / TSX / JS file.
- touch `019_analysis_cache.sql` or any existing migration.
- run the migration via `execute_sql` (use `apply_migration`).
- push anything to deploy repos.
- start Phase C or D.
- promote anything to `main`.
- make unrelated schema changes, RLS changes, or DML.

---

## Required execution order

### B1. Restore Supabase MCP auth

- Read `/Users/joshuaroy/.cursor/projects/Users-joshuaroy-the-business-developers/mcps/plugin-supabase-supabase/tools/mcp_auth.json`.
- Call `mcp_auth` on `plugin-supabase-supabase`; complete the flow.
- Verify with a trivial `execute_sql`: `SELECT now();`. Confirm project ref is `inidzwfjnkyinxhvbrdt` via `SELECT current_database(), inet_server_addr();` or the MCP project metadata call.
- If `project-0-the-business-developers-supabase` authenticates against the same project and you prefer it, use it — but note which server you used in the delivery note.

### B2. Pre-apply read-only reconnaissance

Run via `execute_sql`:

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

Quote the actual CHECK DDL string into the migration's header comment. If `non_core_rows > 0`, stop and raise for decision before applying.

### B3. Author the migration

Create:

`/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/046_analysis_cache_period_type_expand.sql`

Contents:

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

Quote the actual pre-apply CHECK DDL in the file header comment so the supersede relationship is explicit.

### B4. Apply the migration

- Use MCP `apply_migration` with the file contents above.
- Do not use `execute_sql` for the migration body.

### B5. Post-apply verification

```sql
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'hod_analysis_cache_period_type_check';
-- Expect: CHECK (period_type = ANY (ARRAY['day','week','month','trend_alert','daily_brief','weekly_brief']))
-- or equivalent IN-list.

BEGIN;
INSERT INTO public.hod_analysis_cache (period_type, period_key, analysis_data)
VALUES ('trend_alert','__smoke__','{}'::jsonb);
INSERT INTO public.hod_analysis_cache (period_type, period_key, analysis_data)
VALUES ('daily_brief','__smoke__','{}'::jsonb);
INSERT INTO public.hod_analysis_cache (period_type, period_key, analysis_data)
VALUES ('weekly_brief','__smoke__','{}'::jsonb);
ROLLBACK;

SELECT COUNT(*) FROM public.hod_analysis_cache WHERE period_key = '__smoke__';
-- Expect 0 (ROLLBACK cleaned up).

SELECT period_type, COUNT(*)
FROM public.hod_analysis_cache
GROUP BY period_type
ORDER BY period_type;
-- Expect identical counts to B2 for 'day', 'week', 'month'.
```

### B6. Gate B

- New CHECK DDL matches the six-value allow-list.
- All three smoke inserts succeeded under rollback.
- `day|week|month` row counts unchanged relative to B2.
- No stray `period_key='__smoke__'` rows remain.
- Record migration filename and apply timestamp in the Decision Log.

Stop immediately if any check fails. Apply the guarded rollback DDL from `02_schema_alignment_investigation.md §7.2` only if rows were created (they should not have been) and document the rollback in the delivery note.

---

## Documentation requirements before handoff

Phase B is **not complete** until you write both files below:

1. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_b_delivery.md`
2. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_c_agent_prompt.md`

### `phase_b_delivery.md` must include

- `STATUS:` token
- date
- which authenticated MCP server was used
- quoted pre-apply CHECK DDL
- migration filename and apply timestamp (UTC + Africa/Kampala)
- `apply_migration` success evidence
- pre-apply and post-apply row counts by `period_type`
- confirmation that the three smoke inserts succeeded under rollback
- cleanup performed (if any)
- unresolved risks
- exact next starting point for Phase C

### `phase_c_agent_prompt.md` must include

- mission: Phase C only (deploy refresh — admin first, portal second)
- read-first file list (include `03_deploy_refresh_path_investigation.md` and `phase_b_delivery.md`)
- exact allowed scope (both deploy repo working dirs + the `§C0` monorepo logo cleanup)
- exact forbidden actions (do not touch `"@hod/shared": "*"`; do not touch portal `app/logo.png/route.ts`; do not promote to `main`)
- the admin `/logo.png` conflict resolution step
- the `rsync` mirror convention with the mandatory excludes
- the pre-push checklist (including `diff -rq packages/shared` cross-repo)
- validation gates (Netlify dev builds green on both aliases; deploy SHAs match)
- explicit instruction to stop at the Phase C boundary and hand back

Also update `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/backlog.md` Decision Log with:

- the migration filename and apply timestamp
- the authenticated MCP server used
- absolute paths to `phase_b_delivery.md` and `phase_c_agent_prompt.md`

---

## Delivery format in chat

When Phase B is complete, return a concise summary containing:

1. authenticated MCP server used
2. migration filename + apply timestamp
3. quoted pre- and post-apply CHECK DDL
4. smoke-insert result (all three under rollback)
5. row-count delta by `period_type` (should be zero)
6. exact paths written for `phase_b_delivery.md` and `phase_c_agent_prompt.md`
7. any residual risks Phase C should know about

Do not continue into Phase C in the same run.

---

## Final instruction

Execute **Phase B only**. Author exactly one migration. Apply it via MCP `apply_migration`. Verify under rollback. Write the handoff artefacts. Then stop and hand back.
