# Phase B Delivery — v2.12 Recovery

STATUS: complete
Date: 2026-04-23
Phase boundary outcome: **Phase B complete. `hod_analysis_cache.period_type` CHECK widened to a seven-value allow-list on `inidzwfjnkyinxhvbrdt`.** All three new v2.12 values (`trend_alert`, `daily_brief`, `weekly_brief`) accepted under rollback-guarded smoke inserts. Existing row counts unchanged. Ready for Phase C (deploy refresh).

---

## 1. Authenticated MCP server

`plugin-supabase-supabase` — verified with `SELECT now(), current_database();` returning `2026-04-23 10:40:56.853018+03` from database `postgres` on project `inidzwfjnkyinxhvbrdt`.

---

## 2. Pre-apply CHECK DDL (verbatim from `pg_get_constraintdef`)

```sql
CHECK ((period_type = ANY (ARRAY['report'::text, 'day'::text, 'week'::text, 'month'::text])))
```

Notable discovery: the live CHECK included **four** values, not three. `report` was not mentioned in any prior investigation document (which assumed `day|week|month` only). No rows exist with `period_type = 'report'`, but the constraint permitted it.

---

## 3. Migration filename and apply timestamp

- **File:** `046_analysis_cache_period_type_expand.sql`
- **Path:** `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/046_analysis_cache_period_type_expand.sql`
- **Applied via:** MCP `apply_migration` on `plugin-supabase-supabase`
- **Timestamp (UTC):** 2026-04-23 ~07:41 UTC
- **Timestamp (Africa/Kampala):** 2026-04-23 ~10:41 EAT
- **Result:** `{"success": true}`

---

## 4. Post-apply CHECK DDL (verbatim from `pg_get_constraintdef`)

```sql
CHECK ((period_type = ANY (ARRAY['report'::text, 'day'::text, 'week'::text, 'month'::text, 'trend_alert'::text, 'daily_brief'::text, 'weekly_brief'::text])))
```

Seven-value allow-list confirmed — the original four (`report`, `day`, `week`, `month`) preserved, plus the three new v2.12 values (`trend_alert`, `daily_brief`, `weekly_brief`).

---

## 5. Pre-apply and post-apply row counts by `period_type`

| period_type | Pre-apply count | Post-apply count | Delta |
|---|---|---|---|
| day | 3 | 3 | 0 |
| month | 1 | 1 | 0 |
| week | 1 | 1 | 0 |

No rows with `report`, `trend_alert`, `daily_brief`, or `weekly_brief` in either snapshot.

---

## 6. Smoke inserts under rollback

Three inserts executed inside `BEGIN … ROLLBACK`:

| period_type | period_key | Result |
|---|---|---|
| `trend_alert` | `__smoke__` | Accepted |
| `daily_brief` | `__smoke__` | Accepted |
| `weekly_brief` | `__smoke__` | Accepted |

Post-rollback verification: `SELECT COUNT(*) FROM public.hod_analysis_cache WHERE period_key = '__smoke__';` → **0**. No stray rows remain.

---

## 7. RLS policy check

Single policy on `hod_analysis_cache`:

| Policy name | Expression |
|---|---|
| `Allow all for anon` | `true` |

No `period_type` filtering — unaffected by the CHECK change.

---

## 8. Cleanup performed

None required. The smoke inserts were wrapped in `BEGIN … ROLLBACK`. No persistent data was written or modified by Phase B.

---

## 9. Unresolved risks

- **`report` value.** The live CHECK included `report` which was not documented in any investigation or code survey. No rows exist with it, and no code path at HEAD writes `period_type = 'report'`. It has been preserved in the widened CHECK for strict additive safety. If it was an artefact from a deprecated code path, it can be removed in a future hygiene migration once the full codebase has been audited.
- **Shared database.** Dev and prod share `inidzwfjnkyinxhvbrdt`. The widened CHECK is live for both environments immediately. This is additive-only (no existing code writes values outside the original four), so prod is unaffected until the v2.12 deploy repos are refreshed in Phase C.
- **Rollback dependency.** The guarded rollback SQL from `02_schema_alignment_investigation.md §7.2` must now be updated to include `'report'` in its narrowing CHECK if rollback is ever needed. The original rollback script assumed only `day|week|month`.

---

## 10. Exact next starting point for Phase C

`/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_c_agent_prompt.md`

Phase C begins with the admin `/logo.png` conflict resolution in the monorepo, then mirrors the monorepo v2.12 source into both deploy repos (`hod_admin_portal` first, `hod_daily_reports` second), validates each with the pre-push checklist, and pushes to `dev`. No code changes; no schema changes; no `main` promotion.

---

*Phase B closed. Decision Log updated. Ready for Phase C on Joshua's word.*
