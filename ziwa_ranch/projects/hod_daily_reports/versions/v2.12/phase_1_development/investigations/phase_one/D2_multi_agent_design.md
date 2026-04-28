# D-02 — Multi-agent AI architecture design

**STATUS:** investigation  
**Depends on:** D-01 model evaluation (orchestrator: Claude Sonnet 4.5; fast sub-agent: Gemini 2.5 Flash)

---

## 1. Current state — route-by-route map

Evidence base: `admin-portal/app/api/**`, `packages/shared/lib/openrouter.ts`. Default model: `anthropic/claude-sonnet-4` (`OPENROUTER_MODEL`). Admin-portal imports `@/lib/openrouter` which re-exports `@hod/shared/lib/openrouter`.

### 1.1 `GET /api/daily-digest` (`daily-digest/handler.ts`)

| Aspect | Detail |
|--------|--------|
| **Data sources** | `hod_daily_reports` (`id`, `edited_at`, `submitted_at`) for signature + cache check on `report_date === briefDate`. Main fetch: same table — `report_data`, `department_id`, `submitted_by`, `ai_flags`, `hod_departments(name)` where `report_date === briefDate`. `hod_departments` (`id`, `name`) active. `bookings` — `id`, `check_in`, `check_out`, `adults`, `children`, `status`, `booking_rooms(unit_id)` where `check_in <= briefDate`, `check_out > briefDate`, `status != cancelled` (guest-nights overlapping briefDate). `accommodation_units` — `id` where `status = active`. `hod_meeting_action_items` — `id`, `status`, `deadline` where `status in (open, in_progress)`. `hod_daily_reports` — `ai_flags`, `report_date` where `report_date >= briefDate - 28 days` and `< briefDate` (4-week urgency calibration). |
| **Time window** | `briefDate` = previous calendar day in Africa/Kampala (`getYesterdayKampala()`). Historical flags: 28 days ending the day before `briefDate`. Bookings: stays active on `briefDate`. |
| **Prompt** | **System:** executive briefing assistant; British English; fixed sections `OVERVIEW` / `HIGHLIGHTS` / `ACTION ITEMS` / `NOT YET REPORTED`; plain text, no markdown; factual; no invention; skip all-clear departments in Highlights; integrate operational context naturally. **User:** `Daily brief for {briefDate}. {n} of {totalDepts} departments reported.` + per-department lines (`Department (by submitter)[FLAGGED URGENT]: challenges or "All clear..."`) + optional `Not yet reported: ...` + **OPERATIONAL CONTEXT** block (occupancy %, arrivals/check-outs/guests, action item overdue/due-this-week counts, urgent count vs 4-week average). |
| **Output** | Single plain-text blob validated by `isValidDigestText`; normalised via `normaliseAiText`. JSON response: `digest`, `report_count`, `total_departments`, `notes_count`, `missing_departments`, optional `signature`, `cached`, `generated_at`. Fallback plain-text digest if AI invalid/error. |
| **Cache** | **Read:** `hod_analysis_cache` where `period_type = 'daily_brief'`, `period_key = briefDate`; use if `analysis_data.signature` matches `buildReportSignature` and age &lt; 2h. **Write:** upsert same keys; `analysis_data` includes digest fields + `signature`; `model_used = OPENROUTER_MODEL`. Prune old `daily_brief` rows (not current key, `generated_at` older than 7 days). |

### 1.2 `POST /api/analysis/generate` (`analysis/generate/handler.ts`)

| Aspect | Detail |
|--------|--------|
| **Data sources** | `hod_daily_reports` for `report_date` in `[from, to]` derived from `period_type` + `period_key` (`day` / `week` ISO / `month` YYYY-MM). `bookings` overlapping period (`check_in <= to`, `check_out > from`, not cancelled) with `booking_rooms(unit_id)`, `agreed_rate_per_night`. `accommodation_units` active. `hod_meeting_action_items` open/in_progress with `deadline <= to`. Signature rows: all reports in range (`id`, `edited_at`, `submitted_at`). |
| **Time window** | Single day, ISO week, or calendar month per request; `isPeriodComplete` gates incomplete periods. |
| **Prompt** | **System:** operations analyst; plain text; sections `SUMMARY`, `BY DEPARTMENT`, `ISSUES`, `ACTIONS`, `PATTERNS`, `CROSS-DEPARTMENT`; factual; under 800 words; integrate operational context. **User:** period label + `DEPARTMENT NOTES` (dated dept challenges, truncated) + `NUMERIC METRICS` (`extractKeyMetrics` / `formatMetricsForPrompt`, capped) + **OPERATIONAL CONTEXT** (avg occupancy %, booking count, revenue, overdue / in-period action items). |
| **Output** | `analysis.summary` = full plain text (`normaliseAiText`); wrapped with `report_count`, `notes_count`, `period`, `signature`. Validated with `isValidAnalysisText`. |
| **Cache** | **Read:** `hod_analysis_cache` where `period_type`, `period_key` match body; invalidate if signature mismatch unless `force`. **Write:** upsert; prune stale rows for same `period_type`. No TTL on read except signature equality. |

### 1.3 `POST /api/analysis/weekly-brief` (`analysis/weekly-brief/route.ts`)

| Aspect | Detail |
|--------|--------|
| **Data sources** | `hod_daily_reports` — `report_data`, `department_id`, `report_date`, `submitted_by`, `ai_flags`, `hod_departments(name, slug)` for current calendar week (`weekStart`–`weekEnd` from Kampala today). `bookings` overlapping week. `accommodation_units` active. `hod_meeting_action_items` open/in_progress. |
| **Time window** | Monday–Sunday week containing Kampala “today”. |
| **Prompt** | **System:** weekly brief; plain text; sections `EXECUTIVE SUMMARY`, `OPERATIONS`, `ACCOMMODATION`, `FINANCE`, `PEOPLE & MEETINGS`, `PRIORITIES FOR NEXT WEEK`; under 1000 words; factual. **User:** report counts, urgent flag count, department notes, capped metrics, accommodation aggregates, action item overdue / due-this-week counts. |
| **Output** | `brief` plain text plus metadata (`week_start`, `week_end`, `report_count`, `urgent_flags`, nested `accommodation`, `action_items`, `signature`). |
| **Cache** | **Read:** `period_type = 'weekly_brief'`, `period_key = 'weekly_brief:{weekStart}'`; 2h freshness without signature check on read. **Write:** upsert + prune. |

### 1.4 `GET /api/analysis/trends` (`analysis/trends/route.ts`)

| Aspect | Detail |
|--------|--------|
| **Data sources** | `hod_daily_reports` full rows from `priorWindowStart` (28 days before week start) through `yesterday` (Kampala). Uses `extractKeyMetrics`, `challenges_successes`, N/A section detection via form config. |
| **Time window** | Rolling: current week vs prior ~4 weeks; cache key `trend:{thisWeekStart}`. |
| **Prompt** | **System:** return **only** a JSON array of insight objects (`department`, `title`, `detail`, `severity`, `category`); British English; factual. **User:** current vs prior metrics text, optional department notes, N/A section lines. |
| **Output** | Parsed JSON array (`parseTrendInsights`); not plain prose brief. |
| **Cache** | **Read/write** `hod_analysis_cache` with `period_type = 'trend_alert'`, `period_key = trend:{weekStart}`; invalidate when `signature` from report rows changes. |

### 1.5 `POST /api/exports/generate` (`exports/generate/route.ts`)

| Aspect | Detail |
|--------|--------|
| **Data sources** | `hod_daily_reports` (+ `hod_departments`) for single / range / summary. Range/summary may join `hod_departments` for missing dept list. **No** bookings/stock/action tables in export paths except via report JSON. |
| **Time window** | Request-driven (`from`/`to`, or single report id / dept+date). |
| **Prompt** | AI only for `type === 'summary'`: **System:** executive briefing writer; sections `EXECUTIVE SUMMARY`, `DEPARTMENT HIGHLIGHTS`, `KEY METRICS`, `ISSUES AND ACTIONS`, `CROSS-DEPARTMENT OBSERVATIONS`; plain text; factual. **User:** date range readability, report counts, late counts, NOTES, METRICS. Single/range exports are deterministic text (`renderSingleReport`, assembled range) — **no LLM**. |
| **Output** | Plain text file content in JSON `{ content, type, format }`. |
| **Cache** | **None** — no `hod_analysis_cache` usage. |

### 1.6 `hod_analysis_cache` references

| Location | Usage |
|----------|--------|
| `admin-portal/app/api/daily-digest/handler.ts` | Read/write `daily_brief` |
| `admin-portal/app/api/analysis/generate/handler.ts` | Read/write `period_type` ∈ `{day, week, month}` |
| `admin-portal/app/api/analysis/weekly-brief/route.ts` | Read/write `weekly_brief` |
| `admin-portal/app/api/analysis/trends/route.ts` | Read/write `trend_alert` |
| `packages/shared/` | **No references** |

---

## 2. Proposed pipeline — diagram-in-words

**Daily flagship job** (aligned with current `briefDate` = yesterday Kampala):

1. **Fan-out (parallel):** Four Supabase-backed fetches + four **Gemini 2.5 Flash** calls (JSON-only outputs), each scoped to one domain: **Occupancy**, **Stock**, **Compliance**, **Action items**.
2. **Merge:** Deterministic header builder: `brief_date`, `kampala_today`, department coverage counts, canonical `missing_departments`, optional copy of “not yet reported” for orchestrator parity with today’s user prompt.
3. **Orchestrator:** Single **Claude Sonnet 4.5** call: system prompt inherits daily-digest guardrails (sections, British English, plain text, no invention, skip all-clear departments in Highlights); user message = header + four JSON payloads (stringified).
4. **Validate + cache:** Same `isValidDigestText` / `normaliseAiText` contract as today; cache row extended (see §6).

No code change to weekly/trends/export in this design note unless later chosen for reuse of sub-agent JSON.

---

## 3. Sub-agent specs

OpenRouter-style model slugs to confirm in implementation: fast lane `google/gemini-2.5-flash` (or platform-documented equivalent); optional alternative for pure classification: `deepseek/deepseek-chat-v3` — **not** substituted here unless latency/cost trials justify it.

### 3.1 Occupancy sub-agent

| Field | Specification |
|-------|----------------|
| **Input (Supabase)** | **A.** `bookings`: `id`, `check_in`, `check_out`, `adults`, `children`, `status`, `booking_rooms(unit_id)` — `status != cancelled`, overlap **briefDate**: `check_in <= briefDate && check_out > briefDate`. **B.** Same shape for **briefDate + 1 day** (tomorrow arrivals/departures/on-site projection): overlap filter `check_in <= briefDate+1 && check_out > briefDate+1`. **C.** `accommodation_units`: `id` where `status = active`. Optionally **D.** same as A for `briefDate - 1` only if anomaly detection compares consecutive days (deterministic in code, not LLM). |
| **Model** | Gemini 2.5 Flash |
| **Prompt (≤6 lines system)** | You output **only** valid JSON matching the schema. You classify anomalies (e.g. occupancy spike vs 7-day norm) from the figures provided — no invented bookings. British English in string fields. |
| **User payload structure** | `{ "brief_date": "YYYY-MM-DD", "units_total": number, "bookings_overlap_brief_date": [ ... ], "bookings_overlap_next_day": [ ... ], "derived_counts": { ... optional precomputed arrivals/departures/guests } }` — raw rows supplied by orchestrator layer; Flash fills anomalies and normalises wording. |
| **Output schema (JSON)** | `{ "brief_date": "YYYY-MM-DD", "units_total": number, "units_occupied_brief_date": number, "arrivals_brief_date": number, "departures_brief_date": number, "guests_on_site_brief_date": number, "arrivals_next_day": number, "departures_next_day": number, "guests_on_site_next_day": number, "occupancy_pct_brief_date": number, "anomalies": [ { "type": string, "detail": string } ] }` |

### 3.2 Stock sub-agent

| Field | Specification |
|-------|----------------|
| **Input (Supabase)** | **Evidence:** stock counts live in **`hod_verified_stock`** (`department_id`, `stock_type`, `entry_date`, `items` JSON array of `{ item, quantity, unit }`, `status`, …) and **`hod_stock_flags`** (`flag_type`, `item_names`, `status`, `department_id`, …) for open flags. Daily operational stock signals also exist inside **`hod_daily_reports.report_data`** (e.g. kitchen/store/bar fields per `packages/shared/config/forms.ts`) — for “sudden movements” compare recent `entry_date` rows or report-extracted metrics for **briefDate** and **briefDate − 1..7**. |
| **Model** | Gemini 2.5 Flash |
| **Prompt** | Output **only** JSON matching schema. Flag low quantities and unusual deltas using supplied numbers only; cite `stock_type` / item name from data. |
| **User payload structure** | `{ "brief_date": "YYYY-MM-DD", "verified_stock_rows": [ ... ], "open_stock_flags": [ ... ], "report_extracted_stock_metrics": [ ... ] }` (last filled by deterministic extractors mirroring `extractKeyMetrics` for stock-related slugs only, optional v1). |
| **Output schema** | `{ "brief_date": "YYYY-MM-DD", "low_stock_items": [ { "item": string, "stock_type": string, "department": string, "quantity": number, "unit": string, "severity": "watch" \| "critical" } ], "sudden_movements": [ { "item": string, "detail": string, "delta_hint": string } ], "open_flags_summary": [ { "flag_type": string, "detail": string } ], "critical_shortages": [ { "item": string, "detail": string } ] }` |

### 3.3 Compliance sub-agent

| Field | Specification |
|-------|----------------|
| **Input (Supabase)** | **A.** `hod_daily_reports` for **`report_date === briefDate`**: `department_id`, `submitted_by`, `report_data` (at least `challenges_successes`), `ai_flags`, `hod_departments(name)`. **B.** Optional **yesterday** row per department if “not yet reported” logic is cross-checked (usually redundant with active dept list). **C.** `hod_departments` active — derive **`missing_departments`** vs submitted `department_id` set. **D.** Urgent: `ai_flags.top_label === 'urgent issue'` and `(ai_flags.top_score ?? 0) >= 0.4` (same threshold as daily-digest). |
| **Model** | Gemini 2.5 Flash |
| **Prompt** | Output **only** JSON. Do not fabricate department content; `challenges_summary` must be null or a short paraphrase capped length from provided text only. |
| **User payload structure** | `{ "brief_date": "YYYY-MM-DD", "reports": [ { "department_name", "submitted_by", "challenges_successes", "urgent_flag", "top_score" } ], "missing_departments": [ string ] }` |
| **Output schema** | `{ "brief_date": "YYYY-MM-DD", "reported_count": number, "active_department_total": number, "urgent_departments": [ { "name": string, "submitted_by": string, "score": number } ], "departments_with_notes": [ { "name": string, "line": string, "urgent": boolean } ], "missing_departments": [ string ], "compliance_notes": [ { "type": "late_submission" \| "none", "detail": string } ] }` — populate `line` from sourced text only. |

### 3.4 Action items sub-agent

| Field | Specification |
|-------|----------------|
| **Input (Supabase)** | `hod_meeting_action_items`: select at minimum `id`, `title`, `description`, `status`, `deadline`, `updated_at`, `assigned_user`, department join as used in `outstanding-items` (`assigned_dept:hod_departments(name)`). Filter `status in ('open','in_progress')`. Compare `deadline` to **briefDate** and week end from **briefDate** (same calendar-week logic as daily-digest: weekEnd from briefDate noon UTC). |
| **Model** | Gemini 2.5 Flash |
| **Prompt** | Output **only** JSON. Classify overdue / due-this-week / stalled using supplied deadlines and statuses; **stalled** = open/in_progress with `updated_at` older than configurable threshold (e.g. 14 days) — threshold fixed in code and passed in payload. |
| **User payload structure** | `{ "brief_date": "YYYY-MM-DD", "items": [ { ...row fields... } ], "stalled_days_threshold": number }` |
| **Output schema** | `{ "brief_date": "YYYY-MM-DD", "overdue_count": number, "due_this_week_count": number, "stalled_count": number, "overdue": [ { "id": string, "title": string, "deadline": string, "department": string } ], "due_this_week": [ { "id": string, "title": string, "deadline": string } ], "stalled": [ { "id": string, "title": string, "reason": string } ] }` |

---

## 4. Orchestrator spec

| Field | Specification |
|-------|----------------|
| **Model** | Claude Sonnet 4.5 (`anthropic/claude-sonnet-4.5` or evaluated equivalent on OpenRouter). |
| **Input** | **Header:** `{ brief_date, departments_reported_n, departments_total_n, missing_departments[], kampala_generated_at }`. **Body:** four JSON objects from §3 as pretty-printed or minified strings + optional **legacy operational context** block reconstructed deterministically from occupancy + action JSON (to preserve current “urgency calibration” narrative, compute `todayUrgentCount` vs 4-week average still from DB in orchestrator prepass — **not** dropped without product sign-off). |
| **Prompt — system** | Same role and rules as current daily-digest system prompt: executive briefing for Chairman/CEO/GM; British English; sections **OVERVIEW**, **HIGHLIGHTS**, **ACTION ITEMS**, **NOT YET REPORTED**; plain text only; factual; never invent; skip all-clear departments in Highlights; integrate operational picture without parroting. Explicitly: sub-agent JSON is factual input — reconcile conflicts in favour of raw Supabase-backed fields passed alongside if provided. |
| **Prompt — user** | `Daily brief for {brief_date}` + header summary + `SUB-AGENT OUTPUTS (JSON):` + occupancy, stock, compliance, action blobs + if retained: `HISTORICAL URGENCY CONTEXT:` (today urgent count vs 4-week average from existing query). |
| **Output** | Same plain-text section shape as current `digest`; validated by existing `isValidDigestText`. |

---

## 5. Output schema — tightened daily briefing

Retain four mandatory sections. Optional fifth section **RISKS AHEAD** when occupancy/stock sub-agents emit predictive or next-day signals.

| Section | Target length | Tone | Must appear | Must not appear |
|---------|---------------|------|-------------|-----------------|
| **OVERVIEW** | 1–2 sentences (~35–45 words max) | Neutral, decisive | Count of departments reported vs total; single clearest situational clause grounded in inputs | Invented incidents; generic hospitality filler |
| **HIGHLIGHTS** | 1 line per **non-quiet** department (~max 12 lines); urgent lines first | British English; crisp | Only departments with substantive input or urgent flags; lead urgent per current rule | All-clear departments; markdown; bullets |
| **ACTION ITEMS** | 1 line per item where management attention needed; else exact phrase `No actions required.` | Directive | Items from meeting actions + any critical stock/compliance escalations present in JSON | Speculative “should consider” without source |
| **NOT YET REPORTED** | Single sentence or comma-separated list | Factual | Exact union of missing departments from header | Shaming language |
| **RISKS AHEAD** (optional) | 0–3 sentences | Forward-looking, cautious | Only if next-day occupancy or stock/critical shortage JSON non-empty | Alarmism without data support |

---

## 6. Cache interaction

| Decision | Detail |
|----------|--------|
| **Row identity** | Keep `period_type = 'daily_brief'`, `period_key = briefDate` (yesterday Kampala). |
| **`analysis_data` payload** | Continue returning `digest`, `report_count`, `total_departments`, `notes_count`, `missing_departments`, `signature`. Extend with optional `pipeline_version` (e.g. `multi_agent_v1`), `sub_agent_models`, `orchestrator_model`. |
| **Signature** | Extend `buildReportSignature` dependency: either **(a)** composite hash = `signature_reports + '|' + hash(normalised JSON of four agent inputs)` so stock/occupancy/action changes invalidate cache without report edits, or **(b)** keep report-only signature and accept stale operational sections — **(a)** recommended. |
| **TTL** | Preserve 2h freshness rule for matched signature (as today). |
| **Prune** | Keep existing 7-day prune for non-current keys. |
| **`model_used`** | Orchestrator model string (or JSON object if schema allows later migration). |

---

## 7. Open questions (for Joshua — before Chat 5)

1. **Brief date semantics:** Product confirmation that the brief remains anchored to **yesterday** Kampala (`briefDate`), not “today”, for reporting alignment.
2. **Composite cache signature:** Approve hashing **all** deterministic inputs (reports + domain datasets) vs report-only signature (trade-off: freshness vs cost).
3. **Stock v1 scope:** Whether day-one ships **`hod_verified_stock` + `hod_stock_flags` + report JSON extracts** only, or also new materialised views if introduced.
4. **Historical urgency block:** Keep 4-week `hod_daily_reports` urgent calibration query in orchestrator prepass vs folding into compliance sub-agent JSON (orchestrator still needs one number vs average).
5. **OpenRouter model IDs:** Final slugs for `gemini-2.5-flash` and `claude-sonnet-4.5` on OpenRouter at implementation time.

---

## 8. File index — code examined

| Path |
|------|
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/daily-digest/handler.ts` |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/daily-digest/route.ts` |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/analysis/generate/handler.ts` |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/analysis/generate/route.ts` |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/analysis/weekly-brief/route.ts` |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/analysis/trends/route.ts` |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/exports/generate/route.ts` |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/openrouter.ts` |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/openrouter.ts` |
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/stock/page.tsx` (stock table names: `hod_verified_stock`, `hod_stock_flags`) |
