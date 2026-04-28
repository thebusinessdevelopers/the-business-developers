# D-02 — Implementation context: Multi-agent daily-brief pipeline

## Item summary

Replace the single `callOpenRouter` daily digest with four parallel Gemini 2.5 Flash JSON sub-agents (Occupancy, Stock, Compliance, Action items) feeding one Claude Sonnet 4.5 orchestrator, preserving `daily_brief` cache keys and extending the signature to a composite hash per `phase_one/D2_multi_agent_design.md` §6.

## Current single `callOpenRouter` (today)

- **Location:** `handler.ts:175` — `await callOpenRouter({ messages: [...], maxTokens: 1500, referer, title })`.
- **Prompt “variables”:** none — **system** and **user** content are inline template literals (`handler.ts:177-196`, `197-200`); there is no named prompt constant.
- **User message assembles:** (1) `Daily brief for ${briefDate}. ${reports.length} of ${totalDepts} departments reported.` (2) per-department lines from `departmentSections` (challenges / “All clear…”, urgent suffix from `ai_flags`) (3) optional `Not yet reported: …` when `missingDepts.length > 0` (4) `contextBlock`: `OPERATIONAL CONTEXT` with accommodation occupancy/arrivals/check-outs/guests, action-item overdue and due-this-week counts, urgency calibration vs 4-week average (`handler.ts:119-172`, `199`).

## Files to change

| File | What changes | Function / type name |
|------|--------------|----------------------|
| `4_development/admin-portal/app/api/daily-digest/handler.ts` | Fan-out queries (where missing), `Promise.all` for four sub-agent `callOpenRouter` calls with sub-agent model, merge header + JSON strings, orchestrator `callOpenRouter` with Sonnet model, composite signature input, optional `analysis_data` extensions (`pipeline_version`, `sub_agent_models`) | `GET`, inline prompts |
| `4_development/admin-portal/lib/analysis-reliability.ts` | Extend or wrap signature: composite = report rows hash + hash of normalised deterministic sub-agent **inputs** (per D2 §6) | `buildReportSignature`, possible `buildDailyBriefSignature` |
| `4_development/packages/shared/lib/openrouter.ts` (or consumer) | D-01: model parameter(s) for sub-agent vs orchestrator | `callOpenRouter`, `OPENROUTER_MODEL` |

## DB migration required

N — `hod_analysis_cache` schema unchanged (`019_analysis_cache.sql`: `period_type`, `period_key`, `analysis_data`, `generated_at`, `model_used` only); extended fields remain inside `analysis_data` JSON; signature logic is application-side.

## Dependencies

- D-01 — env vars / model upgrade (orchestrator + sub-agents must pick the right model)
- D-03 — background execution (four parallel calls increase total wall time; must run in BG function)

## Complexity

L — one handler grows to orchestrate four data planes plus one merge call; signature and cache behaviour must stay correct; no schema migration.

## Validation steps

1. Call `GET /api/daily-digest` with auth; confirm response shape matches existing contract (`digest`, `report_count`, `total_departments`, `notes_count`, `missing_departments`, optional `signature`, `cached`, `generated_at`).
2. Edit a report row for `briefDate` only (no operational data change) and confirm cache miss only when `buildReportSignature` input changes; edit stock/occupancy inputs without touching reports and confirm composite signature invalidates cache (Chat 2 composite default).
3. Confirm `isValidDigestText` / `normaliseAiText` still gate the orchestrator output; confirm degraded fallback path when orchestrator output invalid (parity with current handler).
4. Load-test or measure wall time with four parallel Flash calls + one Sonnet under D-03 background execution expectations.

## Sub-agent schemas (authoritative for Chat 5)

Source: `../investigations/phase_one/D2_multi_agent_design.md` §3.1–§3.4 (lines 91–129).

### Occupancy

- **Input:** JSON built in the handler layer: `brief_date`, `units_total`, arrays of raw booking rows overlapping `brief_date` and `brief_date + 1`, optional `derived_counts` (D2 §3.1, lines 98–99).
- **Output JSON:** `{ "brief_date": string; "units_total": number; "units_occupied_brief_date": number; "arrivals_brief_date": number; "departures_brief_date": number; "guests_on_site_brief_date": number; "arrivals_next_day": number; "departures_next_day": number; "guests_on_site_next_day": number; "occupancy_pct_brief_date": number; "anomalies": { "type": string; "detail": string }[] }` (D2 §3.1, lines 99–100).

### Stock

- **Input:** JSON: `brief_date`, `verified_stock_rows`, `open_stock_flags`, optional `report_extracted_stock_metrics` (D2 §3.2, lines 105–108).
- **Output JSON:** `{ "brief_date": string; "low_stock_items": { "item": string; "stock_type": string; "department": string; "quantity": number; "unit": string; "severity": "watch" \| "critical" }[]; "sudden_movements": { "item": string; "detail": string; "delta_hint": string }[]; "open_flags_summary": { "flag_type": string; "detail": string }[]; "critical_shortages": { "item": string; "detail": string }[] }` (D2 §3.2, lines 109–110).

### Compliance

- **Input:** JSON: `brief_date`, `reports` entries with `department_name`, `submitted_by`, `challenges_successes`, `urgent_flag`, `top_score`, plus `missing_departments[]` (D2 §3.3, lines 115–118).
- **Output JSON:** `{ "brief_date": string; "reported_count": number; "active_department_total": number; "urgent_departments": { "name": string; "submitted_by": string; "score": number }[]; "departments_with_notes": { "name": string; "line": string; "urgent": boolean }[]; "missing_departments": string[]; "compliance_notes": { "type": "late_submission" \| "none"; "detail": string }[] }` (D2 §3.3, lines 119–120).

### Action items

- **Input:** JSON: `brief_date`, `items` (row fields from Supabase), `stalled_days_threshold` (D2 §3.4, lines 127–128).
- **Output JSON:** `{ "brief_date": string; "overdue_count": number; "due_this_week_count": number; "stalled_count": number; "overdue": { "id": string; "title": string; "deadline": string; "department": string }[]; "due_this_week": { "id": string; "title": string; "deadline": string }[]; "stalled": { "id": string; "title": string; "reason": string }[] }` (D2 §3.4, lines 129–130).

## Orchestrator input (Sonnet 4.5)

Per D2 §4 (lines 133–141): **Header** — `brief_date`, department counts (`departments_reported_n` / `departments_total_n` style), `missing_departments[]`, `kampala_generated_at` (or equivalent timestamp label). **Body** — four sub-agent JSON payloads (stringified), introduced e.g. as `SUB-AGENT OUTPUTS (JSON):` plus labelled occupancy, stock, compliance, action blobs. **Optional** — `HISTORICAL URGENCY CONTEXT:` with today’s urgent count vs 4-week average from the existing `hod_daily_reports` prepass (D2 §4 lines 137–140); investigation states this must not be dropped without product sign-off.

**System prompt:** Inherit the current daily-digest system prompt verbatim (handler inline string, lines 179–195); D2 §4 (lines 138–139) adds reconciliation: sub-agent JSON is factual input; reconcile conflicts in favour of raw Supabase-backed fields if passed alongside.

**Optional additive section:** D2 §5 (lines 145–155) — fifth section **RISKS AHEAD** when occupancy/stock JSON carries predictive or next-day signals; orchestrator system prompt may add this as an optional section without removing the four mandatory sections.

## Cache signature extension

**Current:** `admin-portal/lib/analysis-reliability.ts:27-31` — `buildReportSignature(rows: SignatureRow[])` returns sorted `id:edited_at|submitted_at` joined by `|`.

**Proposed (composite):** D2 §6 (lines 163–165) — `signature_reports + '|' + hash(normalised JSON of four agent inputs)` so operational datasets invalidate cache without report edits. Normalised blobs to fold into the hash (deterministic inputs prepared for each sub-agent, not LLM outputs):

1. Occupancy: normalised JSON for `brief_date`, `units_total`, booking overlap rows for `brief_date` and `brief_date + 1`, optional `derived_counts` / D−1 slice if implemented (D2 §3.1).
2. Stock: normalised JSON for `hod_verified_stock` + `hod_stock_flags` + report-extracted stock metrics for v1 scope (Chat 2: materialised views deferred).
3. Compliance: normalised JSON derived from same-day `hod_daily_reports` + active departments + missing list (D2 §3.3).
4. Action items: normalised JSON of open/in_progress rows with department join and fields used for classification (D2 §3.4).

**Upsert today:** `handler.ts:233-241` — `.upsert({ period_type: 'daily_brief', period_key: briefDate, analysis_data: digestData, generated_at, model_used: OPENROUTER_MODEL }, { onConflict: 'period_type,period_key' })`. `digestData` includes `signature` inside `analysis_data` (lines 223-230). **Columns:** `period_type`, `period_key`, `analysis_data`, `generated_at`, `model_used` — no `source_signature` column; signature lives in `analysis_data.signature`.

**Shape change:** Upsert columns unchanged; only the string passed as `signature` inside `analysis_data` (and cache read comparison at `handler.ts:65`) adopts the composite formula. Optional JSON fields (`pipeline_version`, `sub_agent_models`, `orchestrator_model`) per D2 §6 lines 163–168.

## Parallel execution and partial failure

**Parallelisation:** D2 §2 (lines 76–78) — four fetches + four Gemini calls in parallel; implement as `Promise.all` (or `Promise.allSettled` if tracking per-agent errors) over the four sub-agent `callOpenRouter` invocations inside the handler before the orchestrator call.

**Partial failure:** D2 does not specify abort vs degraded brief. Align with existing degraded behaviour (`handler.ts:207-220`, `254-269`): prefer a **degraded** path — log the failing sub-agent, supply an empty or error-tagged stub JSON for that quadrant so the orchestrator can still run, and surface `degraded: true` if appropriate; hard-abort only if product requires all four JSON blobs to succeed.

## Data-source map (handler today)

| Sub-agent | Table(s) | Existing query? | Notes |
|-----------|----------|-----------------|-------|
| Occupancy | `bookings` (+ `booking_rooms`), `accommodation_units` | Partial | Overlap `briefDate`: `handler.ts:88-97`. **New:** second `bookings` query for overlap `briefDate+1` (and optional `briefDate-1` per D2 §3.1 lines 95–96). |
| Stock | `hod_verified_stock`, `hod_stock_flags`, `hod_daily_reports.report_data` | New | Not referenced in `handler.ts`. v1: queries + deterministic extractors for stock slugs (D2 §3.2 lines 105–106). |
| Compliance | `hod_daily_reports`, `hod_departments` | Yes | Reports: `handler.ts:80-83`; departments: `handler.ts:84-87`. |
| Action items | `hod_meeting_action_items` (+ `hod_departments` for names) | Partial | Minimal select `id, status, deadline`: `handler.ts:98-101`. **New:** expand select + join to match `outstanding-items` / D2 §3.4 (title, description, `updated_at`, assignee, department). |

## Evidence

- Single orchestrator `callOpenRouter`: `handler.ts:175-205` (system message `handler.ts:177-196`, user message `handler.ts:197-200`).
- Current user message content: `Daily brief for ${briefDate}. ${reports.length} of ${totalDepts} departments reported.` + `\n\n` + per-department lines from `departmentSections` + optional `\n\nNot yet reported: …` + `contextBlock` (`OPERATIONAL CONTEXT`, accommodation stats, action overdue/due-this-week, urgency calibration) — `handler.ts:119-172`, `199`.
- Prompt variables: none — system and user prompts are **inline** string literals in the `messages` array; no separate `const` names.
- `buildReportSignature`: `admin-portal/lib/analysis-reliability.ts:27-31`.
- Cache read: `handler.ts:53-58`, hit condition `handler.ts:65`.
- Cache write + prune: `handler.ts:232-247`.
- `hod_analysis_cache` DDL: `portal/supabase/migrations/019_analysis_cache.sql:4-12`.
- Pipeline and composite signature: `../investigations/phase_one/D2_multi_agent_design.md` §2 (lines 74-82), §6 (lines 159-168).
- Sub-agent I/O schemas: same file §3.1–§3.4 (lines 91-129).
- Orchestrator and optional RISKS AHEAD: §4–§5 (lines 133-155).
- `callOpenRouter` definition: `packages/shared/lib/openrouter.ts:35-69`; re-export `admin-portal/lib/openrouter.ts:1`.
