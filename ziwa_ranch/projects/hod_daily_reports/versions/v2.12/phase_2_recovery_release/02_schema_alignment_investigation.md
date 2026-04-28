# 02 — Schema Alignment Investigation: hod_analysis_cache.period_type

STATUS: in-progress
Date: 2026-04-22
Scope: investigation only — no code, schema, or deploy changes made.

> Purpose: establish the exact drift between the repo migration history for `hod_analysis_cache` and the live schema in Supabase project `inidzwfjnkyinxhvbrdt`, and propose an additive migration that restores the Phase 3 `period_type` contract safely on a database shared by dev and prod.

---

## 1. Summary

- The repo defines `hod_analysis_cache` in exactly one migration (`019_analysis_cache.sql`) and that migration declares **no** `CHECK` constraint on `period_type`.
- The live database enforces a `CHECK` named `hod_analysis_cache_period_type_check` that rejects `daily_brief` (and by implication `weekly_brief` and `trend_alert`). This constraint was added out-of-band; it is not represented in any file under `4_development/portal/supabase/migrations/`.
- Current code at HEAD requires six `period_type` values — `day`, `week`, `month`, `trend_alert`, `daily_brief`, `weekly_brief` — across four routes. Three of those six are currently blocked by the live CHECK.
- No live rows currently exist outside `day|week|month` (distinct values observed on 20 Apr 2026 were only `day`, `week`, `month`). An additive migration is therefore data-safe.
- The Supabase MCP returned `Unauthorized` during this investigation and also when the parent re-tried, so the exact CHECK DDL has not been re-quoted verbatim here. The execution agent must restore auth and re-quote the DDL before applying any replacement migration.

---

## 2. Live schema state

### 2.1 Constraint observed at runtime (20 Apr 2026 test run)

The test report records a direct runtime probe against the active app database that inserted `period_type='daily_brief'` into `hod_analysis_cache` and received a constraint-violation error naming the constraint:

- Constraint name: `hod_analysis_cache_period_type_check`
- Probe result: insert with `period_type='daily_brief'` rejected
- Distinct `period_type` values present in the table at that time: `day`, `week`, `month` only

Source: `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/tests.md/20_04_test.md` row REL-002 and executive summary bullet on schema rejection.

### 2.2 Verbatim DDL — not re-captured in this investigation

Direct MCP queries via `project-0-the-business-developers-supabase` against project `inidzwfjnkyinxhvbrdt` all returned:

```
{"error":"Unauthorized"}
```

Calls attempted (read-only only; none would have modified data):

- `execute_sql` — `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.hod_analysis_cache'::regclass;`
- `execute_sql` — `SELECT period_type, COUNT(*) FROM public.hod_analysis_cache GROUP BY period_type;`
- `execute_sql` — `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='hod_analysis_cache';`
- `list_tables` — schemas `["public"]`

Because of this, the exact textual form of the CHECK (`IN (...)` versus `= ANY (ARRAY[...])`) is not quoted verbatim. From Postgres naming conventions and the runtime behaviour above, the constraint is almost certainly:

```sql
CHECK (period_type IN ('day','week','month'))
```

stored by Postgres either literally or equivalently as `period_type = ANY (ARRAY['day','week','month']::text[])`. The execution agent must confirm the exact DDL before authoring the replacement migration.

### 2.3 Row counts per period_type

Not re-queried in this investigation (MCP unauthorised). Test report states distinct values as of 20 Apr 2026 were `day`, `week`, `month` only. No `trend_alert`, `daily_brief`, or `weekly_brief` rows existed at that point.

### 2.4 Other structural facts about hod_analysis_cache

From `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/019_analysis_cache.sql` lines 4–15:

```sql
CREATE TABLE IF NOT EXISTS hod_analysis_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_type TEXT NOT NULL,
  period_key TEXT NOT NULL,
  analysis_data JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  model_used TEXT,
  UNIQUE (period_type, period_key)
);

CREATE INDEX IF NOT EXISTS idx_analysis_cache_lookup
  ON hod_analysis_cache (period_type, period_key);
```

The UNIQUE and INDEX on `(period_type, period_key)` are unaffected by any CHECK alignment work; they remain valid regardless of which values the CHECK permits.

---

## 3. Repo migration history touching hod_analysis_cache

A full Grep across `4_development/portal/supabase/migrations/` for `hod_analysis_cache` and `period_type` returns matches only in `019_analysis_cache.sql`. Migrations 020 through 045 do not touch the table or the column.

| Migration | Touches `hod_analysis_cache`? | What it does |
|---|---|---|
| `019_analysis_cache.sql` | Yes | Formalises the table via `CREATE TABLE IF NOT EXISTS`, declares `UNIQUE(period_type,period_key)` and the lookup index. No CHECK on `period_type`. |
| 020–045 | No | Unrelated features (notifications, media, meetings, accommodation, rooms, bookings, change requests, v2.12 rates, etc.). |

Divergence point: between the table's original manual creation and the checked-in `019` migration, or at any later moment when the CHECK was added directly via dashboard / psql. The repo's migration history does not record when `hod_analysis_cache_period_type_check` was introduced — that absence is the drift.

Header comment on line 1 of `019_analysis_cache.sql` is diagnostic of this: "Table may already exist from manual creation; use `IF NOT EXISTS`." The migration was written defensively to accommodate a pre-existing table — the CHECK presumably came with that pre-existing table and was never captured in repo form.

---

## 4. Code-side required period_type values

All six values required by current code at HEAD:

| Route / module | Required `period_type` | File | Approx. line |
|---|---|---|---|
| `POST /api/analysis/generate` validation allow-list | `day`, `week`, `month` | `4_development/admin-portal/app/api/analysis/generate/handler.ts` | 117 |
| `POST /api/analysis/generate` cache lookup / upsert | passthrough | same file | 167, 173, 366, 375 |
| `POST /api/analysis/trends` cache read | `trend_alert` | `4_development/admin-portal/app/api/analysis/trends/route.ts` | 57 |
| `POST /api/analysis/trends` cache upsert + prune | `trend_alert` | same file | 202, 211 |
| `POST /api/analysis/weekly-brief` cache read | `weekly_brief` | `4_development/admin-portal/app/api/analysis/weekly-brief/route.ts` | 65 |
| `POST /api/analysis/weekly-brief` cache upsert + prune | `weekly_brief` | same file | 265, 274 |
| `GET /api/daily-digest` cache read | `daily_brief` | `4_development/admin-portal/app/api/daily-digest/handler.ts` | 50 |
| `lib/daily-digest-generation.ts` cache read | `daily_brief` | `4_development/admin-portal/lib/daily-digest-generation.ts` | 375 |
| `lib/daily-digest-generation.ts` cache upsert + prune | `daily_brief` | same file | 542, 551 |

Distinct required allow-list: `day`, `week`, `month`, `trend_alert`, `daily_brief`, `weekly_brief`.

---

## 5. Divergence analysis — live vs repo

| Aspect | Repo state | Live state | Divergent? |
|---|---|---|---|
| Table exists | Yes (via 019) | Yes | No |
| Columns | `id`, `period_type`, `period_key`, `analysis_data`, `generated_at`, `model_used` | Matches (implied; not re-queried due to MCP auth) | No |
| `UNIQUE(period_type,period_key)` | Declared | Confirmed by use of `onConflict: 'period_type,period_key'` in historical upserts | No |
| CHECK on `period_type` | None | Present, constraining to `day|week|month` | **Yes** |
| Named constraint `hod_analysis_cache_period_type_check` | Not present in repo | Present at runtime | **Yes** |

Classification: out-of-band DB drift, not a skipped migration. No migration file in the repo ever declares the CHECK, so there is no "missing file" to recover — the CHECK was added directly to the database. The remedy is to bring this schema fact under migration control and widen the CHECK in the same migration.

### 5.1 Source-environment question (noted, not resolved here)

Test report line 116 records an inference that the app's active runtime DB is different from the MCP-exposed project. Every other authoritative document (`context.md` line 111, `next_chat_handover.md` line 128, `3_architecture/build_rules.md` line 50, `phase_two/00_recovery_sequence.md` line 56) states that both dev and prod apps point at `inidzwfjnkyinxhvbrdt` and share it. This investigation treats the canonical environment as `inidzwfjnkyinxhvbrdt`. The apparent divergence observed during testing may reflect MCP auth / cache vs runtime-probe contents rather than two separate projects. The execution agent must confirm this with fresh, authenticated reads before applying any DDL. See §8.

---

## 6. Proposed additive migration (DO NOT APPLY)

Author as a new file, e.g. `046_analysis_cache_period_type_expand.sql`. Do not edit `019_analysis_cache.sql`.

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

### Rationale

- Single transaction. `DROP … IF EXISTS` then `ADD`, wrapped in `BEGIN/COMMIT`, ensures no window where the table has no CHECK and no window where it has the old restrictive CHECK.
- Reuses the original constraint name — keeps future `pg_get_constraintdef` lookups stable and avoids duplicate CHECKs.
- Superset allow-list. Existing `day|week|month` rows remain valid. No UPDATE or DELETE required.
- Postgres does not support `ADD CONSTRAINT IF NOT EXISTS` on CHECKs; `DROP … IF EXISTS` before `ADD` is the idiomatic replacement.
- The DROP is strictly of a more-restrictive predecessor; no previously-valid row becomes invalid.

### Pre-apply verification (for the execution agent)

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
```

Expected: one CHECK row with name `hod_analysis_cache_period_type_check`; `non_core_rows = 0`. If `non_core_rows > 0`, stop and re-scope.

### Post-apply verification

```sql
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'hod_analysis_cache_period_type_check';
-- Expect allow-list of the six values.
```

Then dry-insert + rollback against a non-production `period_key`:

```sql
BEGIN;
INSERT INTO public.hod_analysis_cache (period_type, period_key, analysis_data)
VALUES ('trend_alert','__smoke__', '{}'::jsonb);
INSERT INTO public.hod_analysis_cache (period_type, period_key, analysis_data)
VALUES ('daily_brief','__smoke__', '{}'::jsonb);
INSERT INTO public.hod_analysis_cache (period_type, period_key, analysis_data)
VALUES ('weekly_brief','__smoke__', '{}'::jsonb);
ROLLBACK;
```

---

## 7. Rollback and shared-DB compatibility

### 7.1 Shared-DB constraint

Per `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/3_architecture/build_rules.md` line 50, "Dev and prod branches share the same Supabase database." That means:

- The migration applies once and is immediately visible to both the live prod deploy and the dev preview aliases.
- No staged rollout via environment. Any regression caused by the widened allow-list hits prod the moment the DDL runs.
- The widening itself is low-risk: prod code today already expects the six values, and prod at `main` historically only ever wrote `day|week|month`, which remain permitted.

### 7.2 Rollback plan

```sql
BEGIN;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.hod_analysis_cache
    WHERE period_type NOT IN ('day','week','month')
  ) THEN
    RAISE EXCEPTION 'Refusing to revert: rows exist with period_type outside day|week|month';
  END IF;
END $$;

ALTER TABLE public.hod_analysis_cache
  DROP CONSTRAINT IF EXISTS hod_analysis_cache_period_type_check;

ALTER TABLE public.hod_analysis_cache
  ADD CONSTRAINT hod_analysis_cache_period_type_check
  CHECK (period_type IN ('day','week','month'));

COMMIT;
```

The explicit pre-check is important because by the time rollback is considered, the new routes will almost certainly have written `daily_brief`, `weekly_brief`, or `trend_alert` rows.

### 7.3 Compatibility with deploy-repo refresh

The schema migration must land **before** the v2.12 admin-portal code is promoted via the deploy repos (Phase C in `00_recovery_sequence.md`). If the deploy repos refresh first:

- `POST /api/daily-digest` background writes will raise `23514` check-violation on every run.
- `lib/daily-digest-generation.ts` will log "Daily digest cache write failed (non-blocking)" on every generation and the cached result never materialises, so subsequent `GET /api/daily-digest` stays in `pending:true` forever.

Per `00_recovery_sequence.md §6`, safe order is: fix orchestration locally → apply this migration → refresh deploy repos → redeploy → re-run live validation.

---

## 8. Confirmed facts vs likely conclusions vs open questions

### Confirmed facts

- Repo defines `hod_analysis_cache` only in `019_analysis_cache.sql`; that file contains no CHECK on `period_type`.
- No later migration in `4_development/portal/supabase/migrations/` touches `hod_analysis_cache` or `period_type`.
- Current code requires six `period_type` values (§4).
- On 20 Apr 2026 a direct runtime insert of `period_type='daily_brief'` against the live database failed a check constraint named `hod_analysis_cache_period_type_check`; only distinct values present were `day`, `week`, `month`.
- Dev and prod share the same Supabase database (`build_rules.md` line 50).

### Likely conclusions

- Live CHECK is equivalent to `CHECK (period_type IN ('day','week','month'))`.
- `trend_alert` and `weekly_brief` are blocked by the same CHECK (only `daily_brief` was probed on 20 Apr, but both are outside the observed allow-list).
- The CHECK was added directly in the database and never captured in a repo migration — consistent with the defensive `IF NOT EXISTS` in `019_analysis_cache.sql`.
- No other table or RLS policy in the codebase references these specific `period_type` string values. A Grep of all `.sql` files under the project matches only `019_analysis_cache.sql`. A direct `pg_policy` query was not possible (see Open Questions), but the repo-side grep establishes no SQL or RLS file reads `WHERE period_type = 'daily_brief'` etc.

### Open questions for the execution agent

1. Re-quote the CHECK DDL verbatim from the live DB. The Supabase MCP `project-0-the-business-developers-supabase` returned `Unauthorized` for every read query attempted (`execute_sql`, `list_tables`) — both from the investigation subagent and the parent. Restore auth and re-run: `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'hod_analysis_cache_period_type_check';` before writing the replacement migration.
2. Re-confirm distinct row counts. Re-run `SELECT period_type, COUNT(*) … GROUP BY period_type;` immediately before applying the new migration. If non-`day|week|month` rows are present, the proposed `DROP … ADD` is still safe (superset) but the rollback block in §7.2 becomes operationally relevant.
3. Reconcile the "different active database" note. Test report line 116 infers the active app DB differs from `inidzwfjnkyinxhvbrdt`, contradicting `context.md`, `next_chat_handover.md`, `build_rules.md`, and `00_recovery_sequence.md`. Before migration, confirm `NEXT_PUBLIC_SUPABASE_URL` in both Netlify site environments points at `https://inidzwfjnkyinxhvbrdt.supabase.co`. If not, migrate against whichever project the live app actually targets.
4. Re-check RLS on `hod_analysis_cache`. `build_rules.md` says "RLS enabled on all tables — no exceptions." Confirm live RLS policies on `hod_analysis_cache` do not filter by `period_type`. Run: `SELECT polname, pg_get_expr(polqual, polrelid) FROM pg_policy WHERE polrelid = 'public.hod_analysis_cache'::regclass;`
5. Decide constraint text format. The proposed SQL in §6 uses `IN (...)`. Postgres may internally rewrite this to `= ANY (ARRAY[...])`. Either is acceptable; confirm team preference before merging.

---

*Evidence only. No chain-of-thought. No code, schema, or deploys changed by this investigation.*
