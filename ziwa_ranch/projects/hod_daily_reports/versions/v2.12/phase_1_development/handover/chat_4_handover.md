# Chat 4 Handover — Implementation Context: Tracks C + D + E

**Chat:** v2.12 planning, Chat 4 of 5
**Scope:** 6 implementation-context documents (C-01, D-01, D-02, D-03, D-04, E-01)
**Date completed:** 20 Apr 2026
**Method:** 6 parallel sub-agents (`composer-2`), one per item. Each read only its own investigation doc plus the minimum codebase files specified in its brief, performed targeted Supabase MCP queries where required (C-01 only), and wrote a single context document to `implementation_context/`. No code modified.

---

## (a) What was done

| # | Item | Output doc | Files of record inspected |
|---|------|------------|---------------------------|
| 1 | C-01 — date-offset server guard + stuck-dept data correction | `C01_context.md` | `submit-report/route.ts`, `DepartmentHub.tsx`, `submission-status.ts`, `FormRenderer.tsx`, `useSubmissionQueue.ts`, `008_report_media.sql`, `004_v16_schema.sql`; MCP: `hod_daily_reports`, `hod_report_media`, `pg_indexes` |
| 2 | D-01 — OpenRouter model upgrade + env plumbing | `D01_context.md` | `packages/shared/lib/openrouter.ts`, `admin-portal/lib/openrouter.ts`, `portal/lib/openrouter.ts`, `admin-portal/netlify.toml`, `admin-portal/package.json`, grep of `OPENROUTER_MODEL` / `MODEL` across `4_development/` |
| 3 | D-02 — multi-agent daily-brief pipeline | `D02_context.md` | `daily-digest/handler.ts` (full), `daily-digest/route.ts`, `analysis-reliability.ts`, `019_analysis_cache.sql`, `packages/shared/lib/openrouter.ts` |
| 4 | D-03 — Netlify Background Functions for daily brief | `D03_context.md` | `admin-portal/netlify.toml`, `admin-portal/package.json`, `daily-digest/route.ts`, `daily-digest/handler.ts`, `DailyDigestCard.tsx`, `019_analysis_cache.sql`; glob `netlify/functions/**` (empty) |
| 5 | D-04 — Regenerate-with-feedback prompting | `D04_context.md` | `analysis/generate/handler.ts` (line 310), `daily-digest/handler.ts` (line 199), `weekly-brief/route.ts` (line 195), `AnalysisPanel.tsx` (200–263), `DailyDigestCard.tsx`, cache-upsert sites in all three AI routes |
| 6 | E-01 — auto-save must not navigate away from the form | `E01_context.md` | `FormRenderer.tsx` (130–160, parents), `useSubmissionQueue.ts`, `local-storage.ts` (`QueuedSubmission`), `SectionProgress.tsx`, `session-flush.ts`; grep `onSuccess` in `portal/` |

Each doc contains: item summary, files-to-change table, DB-migration answer (with SQL where Y), dependencies, complexity, validation steps, exact diffs / schemas where relevant, and a full evidence list with `path:line` citations.

---

## (b) Key findings affecting Chat 5

### Complexity totals (for phase sequencing)

| Track | Item | Complexity | Notes |
|-------|------|------------|-------|
| C | C-01 server guard | **S** | Single bounded branch before duplicate check |
| C | C-01 data fix | **S** | 2 row `UPDATE` in a transaction + media alignment |
| D | D-01 | **XS** | One-line constant change + new `.env.example` file |
| D | D-02 | **L** | Pipeline rewrite; 4× fan-out, orchestrator, composite signature |
| D | D-03 | **M** | New BG function + kick-off `POST` + polling adjustment |
| D | D-04 | **S** | Three prompt prefixes + 1 UI textarea + (optional) daily Regenerate |
| E | E-01 | **XS** | Single callback guard; type already adequate |

### Scope changes / surprises

1. **C-01 fix is three surfaces, not one.** The server guard alone is insufficient for pre-submit visibility — Chat 4 confirms the investigation recommends a complementary banner in `FormRenderer.tsx` (and optionally in `DepartmentHub.tsx` when navigating with a lagged `?date=` query). Chat 5 must budget the client retry path in both `FormRenderer.tsx` **and** `useSubmissionQueue.ts` (two call-sites share `/api/submit-report`). Evidence: `C01_context.md` “Files to change”.
2. **C-01 media table carries its own `report_date`.** `hod_report_media.report_date` is `NOT NULL` and must be kept aligned with the owning report on any report-date correction. MCP snapshot currently shows zero media rows for the two stuck report ids — the transactional `UPDATE … FROM hod_daily_reports` pattern is included as a defensive template in `C01_context.md` anyway.
3. **C-01 stuck-row ids captured.** Accounts `438827bf-1bf3-4989-9826-ca4d2768729f`; Drivers & Mechanics `b076f356-321d-4ba6-8b5c-9194e58e4c31`. Target corrected dates **must be decided by business review** before the migration is authored — placeholders only in the SQL today.
4. **D-01 `.env.example` does not exist.** `admin-portal/.env.example` is absent; only `.env.local` exists. Chat 5's D-01 work item creates the file, not edits it. `packages/shared/lib/openrouter.ts` is the single authoritative owner of the `MODEL` slug; admin-portal and portal `lib/openrouter.ts` are barrel re-exports (`export * from '@hod/shared/lib/openrouter'`).
5. **D-02 composite-signature lives in `analysis_data`, not a DB column.** `hod_analysis_cache` has **no** `source_signature` column — the signature travels inside `analysis_data.signature`. Upsert columns do not change; only the string content does. Extend `buildReportSignature` in `admin-portal/lib/analysis-reliability.ts:27-31`.
6. **D-02 handler has three new/expanded queries.** Occupancy needs a second `bookings` overlap query for `briefDate + 1`; Stock has **no** query today — must add `hod_verified_stock` + `hod_stock_flags` + deterministic extractors over `report_data`; Action items needs an expanded `select` with department join (current select is minimal `id, status, deadline`).
7. **D-03 requires adding `POST` to `daily-digest/route.ts`.** Today `route.ts` re-exports `GET` only; `handler.ts` is 272 lines for `GET` alone. Chat 5 adds `POST` to `handler.ts` (validates admin auth, `fetch`es `/.netlify/functions/daily-digest-background`, returns **202**) and updates `route.ts` to `export { GET, POST } from './handler'`. No separate thin kick-off route required.
8. **D-03 no Netlify deps installed.** `admin-portal/package.json` carries none of `@netlify/functions`, `@netlify/plugin-nextjs`. Chat 5 must add `@netlify/functions` (dev-dep at minimum for types) alongside the new `admin-portal/netlify/functions/daily-digest-background.ts` file.
9. **D-03 polling adjustment needed.** `DailyDigestCard.tsx:56` hard-codes a 5-minute interval. Chat 5 should budget a short-window polling tightening (10–30 s after kick-off, revert once fresh) — documented in `D03_context.md` §d but easily missed.
10. **D-04 daily-brief Regenerate requires a new `POST` on the route too.** This overlaps with D-03's kick-off refactor — Chat 5 should merge the two changes (one `POST` that accepts both `force: true` and optional `feedback`, kicks the BG function in the D-03 path). Avoids touching the same file twice.
11. **D-04 no Zod on any of the three AI routes.** Feedback validation is inline only: `typeof feedback === 'string'`, trim, length ≤ 500. Chat 5 must not invent a schema file that does not exist today.
12. **D-04 logging audit required.** `D04_context.md` enumerates the exact `console.error` lines in each handler — Chat 5 must not add any log that dumps `body` or raw `feedback`.
13. **E-01 is genuinely one file.** `submittedBy` is already in scope at `FormRenderer.tsx:115`; `reportDate` is already on `QueuedSubmission` at `portal/lib/local-storage.ts:17-20`; no other call-site (`NewReportForm`, `EditReportForm`, `ViewReportContent`) needs touching. Simplest item in the tracks.

### Open decisions that must be resolved before Chat 5 finalises the plan

Consolidated from Chat 2's open-decisions table plus new ones surfaced during Chat 4 context-gathering:

| # | Track | Decision | Default (recommendation) | Surfaced in |
|---|-------|----------|--------------------------|-------------|
| 1 | C-01 | Corrected `report_date` values for Accounts and Drivers & Mechanics stuck rows | Business review — populate `<NEW_DATE_ACCOUNTS>` / `<NEW_DATE_DRIVERS>` in `C01_context.md` SQL before the migration is authored | Chat 4 |
| 2 | C-01 | Soft-confirm field name on `/api/submit-report` | `confirm_offset` (mirrors existing `duplicateId` precedent) | Chat 4 |
| 3 | C-01 | Lag threshold for soft confirm vs permit | Investigation default: soft confirm for ≥ 1 day, hard soft-confirm-required for ≥ 2 days; both paths pass when `confirm_offset: true` supplied | Chat 4 |
| 4 | C-01 | Add complementary banner in `FormRenderer` / `DepartmentHub`? | Yes — server guard alone is insufficient for pre-submit visibility per investigation | Chat 4 |
| 5 | D-01 | Introduce `OPENROUTER_MODEL` / `OPENROUTER_MODEL_FAST` env vars or keep constants | Env vars (Chat 2 default stands); also add optional `[build.environment]` block in `admin-portal/netlify.toml` for in-repo defaults | Chat 2 |
| 6 | D-02 | Composite cache signature vs report-only | Composite (Chat 2 default stands); normalised JSON of all four sub-agent inputs folded into the hash | Chat 2 |
| 7 | D-02 | Stock v1 data sources | `hod_verified_stock` + `hod_stock_flags` + `report_data` extracts only (Chat 2 default stands; materialised views deferred) | Chat 2 |
| 8 | D-02 | Partial-failure behaviour across four sub-agents | **Degraded brief with `degraded: true`** — parity with existing degraded path in `handler.ts:207-220, 254-269`; hard-abort only if product requires all four to succeed | Chat 4 |
| 9 | D-02 | Extend `analysis_data` with `pipeline_version`, `sub_agent_models`, `orchestrator_model`? | Yes — trivial JSON additions, useful for debugging | Chat 4 |
| 10 | D-03 | Job visibility: `hod_analysis_jobs` table vs poll-cache-until-fresh | Poll cache (Chat 2 default stands); table SQL included as optional in `D03_context.md` | Chat 2 |
| 11 | D-03 | Weekly-brief cache read: switch from 2-hour no-signature to signature-based | Yes — consistent staleness semantics across daily + weekly (Chat 2 default stands) | Chat 2 |
| 12 | D-03 | Add `@netlify/functions` dep? | Yes — at least as `devDependencies` for `Handler` type | Chat 4 |
| 13 | D-04 | Daily-brief Regenerate button + textarea in v2.12, or defer? | Add in v2.12 — merges cleanly with D-03 `POST` kick-off (Chat 2 default stands) | Chat 2 |
| 14 | D-04 | Feedback field name | `feedback` (Chat 2 default stands) | Chat 2 |
| 15 | D-04 | Server-side length breach: 400 reject or `slice(0, 500)` truncate after trim | Reject with 400 for clarity; client enforces `maxLength={500}` so this is defensive only | Chat 4 |

### Dependencies map (for Chat 5 phase order)

- **D-01** is a prerequisite for **D-02** and **D-03** (both consume the new env vars).
- **D-02** depends on **D-03** for wall-time viability (four parallel Flash + one Sonnet exceeds 60 s synchronous ceiling).
- **D-04** kick-off `POST` should be merged with **D-03**'s kick-off `POST` to avoid touching `daily-digest/route.ts` and `handler.ts` twice.
- **C-01**, **E-01** are independent — no cross-track dependency.

Suggested build order for Chat 5 phases (within the existing three-phase plan):
1. **Phase 1 (DB migrations — already in plan):** C-01 stuck-row correction migration (after business chooses dates); add optional `hod_analysis_jobs` only if the jobs-table path is chosen (default: skip).
2. **Phase 2 (form + logic):** E-01 (single-file XS); C-01 server guard + retry + optional banners (S).
3. **Phase 3 (AI infrastructure):** D-01 (XS, first) → D-03 BG function skeleton + combined `POST` kick-off (M) → D-02 pipeline moved inside the BG function (L) → D-04 prompt injections + UI textareas (S, last once all three routes are stable).

---

## (c) File index (absolute paths)

### Implementation-context docs produced by Chat 4

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/implementation_context/C01_context.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/implementation_context/D01_context.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/implementation_context/D02_context.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/implementation_context/D03_context.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/implementation_context/D04_context.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/implementation_context/E01_context.md`

### Codebase files examined (absolute paths)

**Portal (HOD-facing) — Tracks C + E:**

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/submit-report/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/DepartmentHub.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/new/NewReportForm.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/edit/[id]/EditReportForm.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/view/[id]/ViewReportContent.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/components/FormRenderer.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/components/form/SectionProgress.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/hooks/useSubmissionQueue.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/lib/local-storage.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/submission-status.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/session-flush.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/008_report_media.sql`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/004_v16_schema.sql`

**Admin portal — Track D (AI routes + UI + infra):**

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/daily-digest/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/daily-digest/handler.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/analysis/generate/handler.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/analysis/weekly-brief/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/analysis/AnalysisPanel.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/components/DailyDigestCard.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/openrouter.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/analysis-reliability.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/netlify.toml`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/package.json`

**Shared:**

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/openrouter.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/lib/openrouter.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/019_analysis_cache.sql`

### New files Chat 5 will author (absolute paths)

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/.env.example` (D-01)
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/netlify/functions/daily-digest-background.ts` (D-03)
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/0XX_c01_date_corrections.sql` (C-01 — number assigned at plan time)
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/0XX_analysis_jobs.sql` (D-03 — **only if** jobs-table path chosen; default: skip)

### Supabase MCP evidence (Chat 4)

- `project-0-the-business-developers-supabase` → project `inidzwfjnkyinxhvbrdt`:
  - `pg_indexes` on `hod_daily_reports` → confirmed `hod_daily_reports_dept_date_unique (department_id, report_date)`.
  - `pg_indexes` on `hod_report_media` → non-unique `idx_report_media_dept_date`.
  - Stuck-row enumeration: Accounts `id = 438827bf-1bf3-4989-9826-ca4d2768729f` (`submitted_at 2026-04-19 11:22:04+03`); Drivers & Mechanics `id = b076f356-321d-4ba6-8b5c-9194e58e4c31` (`submitted_at 2026-04-20 11:52:08+03`).
  - Joined `hod_report_media` for those report ids / dept+date → 0 rows.
