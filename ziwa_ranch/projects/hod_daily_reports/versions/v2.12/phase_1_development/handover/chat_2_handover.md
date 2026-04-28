# Chat 2 Handover — Track C + D + E Investigations

**Chat:** v2.12 planning, Chat 2 of 5  
**Scope:** 6 investigations (C-01, D-01, D-02, D-03, D-04, E-01)  
**Date completed:** 20 Apr 2026  
**Method:** 5 parallel sub-agents (composer-2) for C-01, D-02, D-03, D-04, E-01. D-01 already completed in a prior session and left in place — its primary/fallback model recommendations fed directly into the D-02 and D-03 sub-agent briefs.

---

## (a) What was done

- **C-01** — Supabase MCP schema inspection + 30-day offset audit across all active departments; code review of portal date-check/warning surfaces (`DepartmentHub.tsx`, `FormRenderer.tsx`, `SessionGuard.tsx`, `submit-report/route.ts`, `submission-status.ts`).
- **D-01** — OpenRouter catalogue survey (April 2026): Sonnet 4, Sonnet 4.5, Gemini 2.5 Pro/Flash, DeepSeek R1/V3, OpenAI o3. Context window, cost per million tokens, throughput, reasoning rating. (Completed earlier; retained unchanged.)
- **D-02** — Full map of current AI routes (`daily-digest`, `analysis/generate`, `analysis/weekly-brief`, `analysis/trends`, `exports/generate`) with data sources, prompt shape, output schema, and cache wiring. Proposed four-sub-agent + orchestrator pipeline for the daily brief with per-sub-agent JSON schemas.
- **D-03** — Execution model review of the current synchronous OpenRouter calls and their Netlify timeout exposure. Comparative assessment of Netlify Background Functions, Supabase Edge Functions, and n8n workflows against the existing stack and `hod_analysis_cache` contract.
- **D-04** — End-to-end trace of the Regenerate flow from `AnalysisPanel.tsx` through `/api/analysis/generate` to `callOpenRouter`. Identified exact line-level injection points in all three AI routes for an optional `[USER INSTRUCTION]` feedback block. Defined minimal UI change and non-persistence guardrails.
- **E-01** — Full read of `FormRenderer.tsx`, `useDraftManager.ts`, `useSubmissionQueue.ts`, `SessionGuard.tsx`, `SectionProgress.tsx`, `session-flush.ts`, and all parent components passing `onSuccess`. Mapped every caller of `onSuccess` and assessed each root-cause candidate.

---

## (b) Key findings affecting Chats 3–5

### C-01 — only two departments calendar-stuck; warning UI does not catch multi-day lag

- **Stuck depts (latest `report_date` ≥ 2 days behind 20 Apr 2026):** **Accounts** and **Drivers & Mechanics**, both at `2026-04-18`.
- **Noteworthy `off_ge2` pattern in 30-day window:** **IT** has 5 rows with ≥2-day offset despite its latest report being current — recurring lag, not a block.
- **Warning UI gap confirmed.** The only prominent control is the `DepartmentHub` "before 16:00 — are you sure about today?" modal. There is **no** warning tied to `submitted_at` vs `report_date`, and the `/api/submit-report` handler does not validate offset — duplicate check on `(department_id, report_date)` is the only server-side guard.
- **Recommended rectification (for Chat 5):** server-side offset check on `submit-report` (soft confirm ≥ 1 day; hard guard ≥ 2 days) as the single choke-point; targeted data correction for Accounts and Drivers & Mechanics after row-level review. Any mass `UPDATE report_date` must also touch `hod_report_media.report_date` and respect the uniqueness constraint.

### D-01 — model upgrade is a one-line change; no env plumbing exists today

- **Primary orchestrator:** `anthropic/claude-sonnet-4.5` — same OpenRouter price tier as Sonnet 4 for prompts ≤ 200K tokens, 1M context, improved agentic behaviour, no prompt restructuring required.
- **Fast sub-agent / fallback:** `google/gemini-2.5-flash` — ~1M context, materially cheaper, strong throughput on Vertex Global. Suitable for JSON-only sub-agent work and for `submit-report` urgency classification if split later.
- **Config reality:** the model is a **hard-coded constant** in `packages/shared/lib/openrouter.ts` — there is **no** `OPENROUTER_MODEL` environment variable in code today. Chat 5 must decide whether to introduce `OPENROUTER_MODEL` / `OPENROUTER_MODEL_FAST` env vars or keep constants.
- **Avoid:** `google/gemini-2.0-flash-001` — OpenRouter flags end-of-life 1 Jun 2026.

### D-02 — four parallel Flash sub-agents feed one Sonnet 4.5 orchestrator

Pipeline shape (daily brief only in v1; weekly/trends/exports unchanged):

1. **Occupancy** (Gemini 2.5 Flash) — bookings overlapping `briefDate` and `briefDate+1` + `accommodation_units` active. JSON emits arrivals/departures/on-site for both days plus anomalies.
2. **Stock** (Gemini 2.5 Flash) — `hod_verified_stock`, open `hod_stock_flags`, and stock fields extracted from `hod_daily_reports.report_data` over a 7-day trailing window. JSON emits low-stock, sudden movements, open flags, critical shortages.
3. **Compliance** (Gemini 2.5 Flash) — `hod_daily_reports` for `briefDate` + urgent flag threshold (`top_label='urgent issue'` and `top_score >= 0.4`, same as today) + active `hod_departments` diff for missing list.
4. **Action items** (Gemini 2.5 Flash) — `hod_meeting_action_items` open/in_progress with deadline vs `briefDate` + configurable stalled threshold (14 days).
5. **Orchestrator** (Claude Sonnet 4.5) — inherits the current daily-digest system prompt verbatim (sections, British English, plain text, no markdown, no invention, skip all-clear in Highlights). Receives header + four JSON blobs. Optional fifth output section **RISKS AHEAD** when sub-agent JSON exposes predictive/next-day signals.
- **Cache:** keep `period_type='daily_brief'`, `period_key=briefDate`. Extend `buildReportSignature` to a **composite hash** including normalised JSON of all four sub-agent inputs, so stock/occupancy/action changes invalidate the cache without report edits. Preserve 2h freshness and 7-day prune.
- **Open product question for Joshua:** confirm composite signature (recommended) vs report-only signature (cheaper, staler); confirm whether v1 stock sub-agent uses `hod_verified_stock` + `hod_stock_flags` + report JSON only, or waits for materialised views.

### D-03 — Netlify Background Functions is the primary recommendation

- **Current model:** all four AI routes run synchronously inside a single Next.js serverless invocation on Netlify; `netlify.toml` has no `[functions]` overrides; Netlify default sync ceiling is 60 s, so long OpenRouter calls + Supabase fan-out are the timeout risk.
- **Recommended:** **Netlify Background Functions** (15-minute ceiling; same TypeScript codebase; direct reuse of `@hod/shared` helpers; direct `upsert` to `hod_analysis_cache`; 202 + optional correlation id; UI polls cache).
- **Rejected:** Supabase Edge Functions — 400 s cap is **below** Netlify background, and porting the prompt-assembly / auth / metric-extraction stack into Deno is substantial code motion for no runtime headroom.
- **Optional hybrid:** **n8n** for weekly brief only if multi-step orchestration grows. **Blocker:** local `n8n` MCP descriptors folder is empty (only `SERVER_METADATA.json` present) — the MCP install must be verified before any n8n pattern is committed.
- **Trigger/cache flow:** page read serves from cache with `stale`/`pending` flag; Regenerate posts to thin endpoint that validates scope and invokes the background function; background job runs the pipeline and writes cache; UI polls until signature/age satisfy.
- **Open questions for Joshua:** job-visibility strategy (`processing` row / `hod_analysis_jobs` table vs poll-cache-until-fresh), and whether weekly brief should switch from its current 2-hour-no-signature read to a signature-based read like daily digest.

### D-04 — feedback injection points confirmed; daily-brief has no Regenerate button yet

- **Period analysis injection point:** `admin-portal/app/api/analysis/generate/handler.ts` **line 310** — prepend `[USER INSTRUCTION] … [/USER INSTRUCTION]` block to the start of the `user` message `content` template literal, after the system prompt.
- **Daily brief injection point:** `admin-portal/app/api/daily-digest/handler.ts` **line 199** (start of user content).
- **Weekly brief injection point:** `admin-portal/app/api/analysis/weekly-brief/route.ts` **line 195** (start of user content).
- **UI change:** inline textarea beside the existing Regenerate controls in `AnalysisPanel.tsx` (lines 200–263). Placeholder: `Optional: guidance for this regeneration…`. **500 character limit** enforced client + server. Request body field: `feedback` (optional string).
- **Non-persistence guardrails (must appear in Chat 5 plan):** do **not** write `feedback` into `analysis_data` / `briefData` upsert; do **not** log full request bodies; no DB column; variable scope ends with the handler.
- **Decision required from Joshua for Chat 5:** daily brief currently has **no** Regenerate button (`DailyDigestCard.tsx` auto-refreshes on a 5-min interval). Confirm whether v2.12 adds a manual Regenerate + feedback control to the daily brief card, or defers to a later release.

### E-01 — primary root cause confirmed; secondary candidates ruled out

- **Primary cause (confirmed):** `portal/components/FormRenderer.tsx` **lines 143–148** — the `useSubmissionQueue` success callback fires `onSuccess(reportId)` and `clearDraft(item.submittedBy)` whenever a queued submission resolves for the same department, checking only `item.departmentId === departmentId`. There is **no check** that `item.reportDate === reportDate` or that `item.submittedBy` matches the current form session. A stale offline-queued submission resolving in the background replaces the open form with the success screen, which Salim perceives as auto-save navigating away mid-fill.
- **Secondary candidates ruled out:**
  - **Paged "Next" button — not a cause.** `portal/components/form/SectionProgress.tsx` lines 59–66: Next button is `type="button"` with `onClick={onNext}`. Submit button on the final section is intentionally `type="submit"`.
  - **Flush / unload listeners — not a cause.** `FormRenderer.tsx` lines 188–221 and `session-flush.ts` — all paths call `saveDraft` only, never `handleSubmit` or `/api/submit-report`.
- **Auto-save timer sanity check:** `useDraftManager.ts` lines 132–136 — `scheduleSave` only wraps `saveDraft`, which writes localStorage + upserts `hod_drafts`. No path from the 30-second auto-save timer to the submit flow.
- **Minimal fix (for Chat 5):** add guard in the `useSubmissionQueue` callback so `onSuccess` and `clearDraft` only run when (a) `item.departmentId === departmentId`, (b) `item.reportDate === reportDate`, and (c) a normalised form of `item.submittedBy` matches the current session's `submittedBy`. Optionally track the last queued submission id in a ref and match `item.id` for strict deduplication.
- **Impact for Chat 3 context-gathering:** fix is a single hook-callback tightening in `FormRenderer.tsx`. No schema change. No other callers of `onSuccess` need touching (edit form, view form, and create form already behave correctly on their own success paths).

---

## (c) File index (absolute paths)

### Investigations produced by Chat 2

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_1_development/investigations/phase_one/C1_date_offset.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_1_development/investigations/phase_one/D1_model_evaluation.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_1_development/investigations/phase_one/D2_multi_agent_design.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_1_development/investigations/phase_one/D3_background_execution.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_1_development/investigations/phase_one/D4_feedback_prompting.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_1_development/investigations/phase_one/E1_autosave_navigation.md`

### Codebase files touched during Chat 2 (for Chat 3/4 implementation context)

**Portal (HOD-facing) — Track C + E:**

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/DepartmentHub.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/new/page.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/new/NewReportForm.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/edit/[id]/EditReportForm.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/view/[id]/ViewReportContent.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/submit-report/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/components/FormRenderer.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/components/SessionGuard.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/components/form/SectionProgress.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/hooks/useDraftManager.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/hooks/useSubmissionQueue.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/hooks/useSessionTimer.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/session-flush.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/submission-status.ts`

**Admin portal — Track D (AI routes + UI):**

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/analysis/AnalysisPanel.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/analysis/page.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/daily-digest/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/daily-digest/handler.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/analysis/generate/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/analysis/generate/handler.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/analysis/weekly-brief/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/analysis/trends/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/exports/generate/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/stock/page.tsx` (stock table names `hod_verified_stock` / `hod_stock_flags`)
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/components/DailyDigestCard.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/openrouter.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/netlify.toml`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/package.json`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/openrouter.ts`

**Historical / schema reference:**

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/019_analysis_cache.sql`

---

## Open decisions surfaced by Chat 2 (must resolve before Chat 5)

| # | Track | Decision | Default recommendation |
|---|-------|----------|------------------------|
| 1 | C-01 | Rectify report dates for Accounts and Drivers & Mechanics by row-level review vs bulk shift? | Row-level review — bulk `UPDATE` risks `hod_report_media` joins and uniqueness |
| 2 | D-01 | Introduce `OPENROUTER_MODEL` / `OPENROUTER_MODEL_FAST` env vars or keep as constants? | Introduce env vars to avoid redeploys for model tweaks |
| 3 | D-02 | Composite cache signature (reports + 4 domain inputs) vs report-only signature? | Composite — fresher briefs, marginal cost |
| 4 | D-02 | Stock v1 scope = `hod_verified_stock` + `hod_stock_flags` + report JSON extracts only? | Yes — materialised views out of scope for v2.12 |
| 5 | D-03 | Add `hod_analysis_jobs` row for job visibility or rely on poll-cache-until-fresh? | Poll cache — simpler; revisit if UX needs real-time "processing" state |
| 6 | D-03 | Align weekly-brief cache read from 2h-no-signature to signature-based like daily-digest? | Yes — consistent staleness semantics |
| 7 | D-04 | Add Regenerate + feedback control to the daily brief card in v2.12, or defer? | Add in v2.12 — small UI change, highest-value AI surface |
| 8 | D-04 | Field name: `feedback`, `regeneration_feedback`, or `steering`? | `feedback` — short, matches user-facing label |
