# Phase A Delivery — v2.12 Recovery

STATUS: complete
Date: 2026-04-22
Phase boundary outcome: **Phase A complete. Local multi-agent daily-digest path returns `status: 'generated'`, `degraded: false` against a real `briefDate` in `inidzwfjnkyinxhvbrdt`.** Ready for Phase B (schema widening).

Root-cause branches applied: **H5** (non-ASCII header) ⇒ **H1** (reasoning-budget / truncation). Both were confirmed via instrumentation; H2 and H3 were ruled out.

---

## 1. Files changed in Phase A

### `4_development/packages/shared/lib/openrouter.ts`
- Added `finishReason?: string` on `OpenRouterResponse`; populated from `data.choices?.[0]?.finish_reason`.
- Added `excludeReasoning?: boolean` on `OpenRouterOptions`; when true, sends `reasoning: { exclude: true }` in the request body (Gemini-style built-in thinking suppressed).
- Added `toAsciiHeader` helper; `HTTP-Referer` and `X-Title` are sanitised before being set, so any non-Latin-1 character (em-dash, smart quotes, emoji) can no longer raise a pre-flight `TypeError` in `fetch`.

### `4_development/admin-portal/lib/daily-digest-generation.ts`
- `console.error('daily-digest-subagent:', { … })` on both the `isError` and `catch` branches of `callSubAgent` (full object: `agent, model, contentType, contentLen, reasoningLen, finishReason, first200, errorName, errorMsgFirst200, category`).
- `SubAgentOutcome` gained `category: SubAgentCategory`. Allowed values: `'ok' | 'empty_content' | 'invalid_json' | 'truncated' | 'rate_limit' | 'http_error' | 'transport_error'`.
- New exports for tests: `parseJsonOrError`, `classifySubAgentError`.
- Sub-agent call changed: `maxTokens: 900 → 2000`, `excludeReasoning: true` added, `title: 'HOD Daily Brief - ${agent}'` (U+2014 replaced with U+002D).
- `Promise.allSettled` rejection branch also classifies via `classifySubAgentError`.
- `degraded_reason` now includes categories, e.g. `Sub-agents failed: stock (truncated)`.

### `4_development/admin-portal/__tests__/` (new directory)
- `parse-json-or-error.test.ts` — 9 cases.
- `call-open-router.test.ts` — 7 cases (string/missing content, `finish_reason: length`, 429, 503, U+2014 title, non-ASCII referer).
- `classify-sub-agent-error.test.ts` — 6 cases.
- `run-daily-digest-generation.test.ts` — 2 cases (happy path with real model slugs, rate-limit path with category surfacing).

### `4_development/admin-portal/scripts/phase_a_reproduce.ts` (new)
- Minimal harness that loads `.env.local`, picks the most recent `report_date`, and runs `runDailyDigestGeneration({ supabase, briefDate, force: true })`. Used for A2 and the final A6 validation; kept for Phase D live comparisons.

### `4_development/admin-portal/package.json`
- Added `"test": "tsx --test __tests__/*.test.ts"` script. No new dependency in `package.json` — tests run via `npx tsx` on demand.

No deploy repo touched. No schema touched. No `main` promotion.

## 2. Root-cause signal captured

### 2.1 First reproduction (instrumentation only, no fix)

All four sub-agents threw an identical pre-flight `TypeError`:

```
errorName:  'TypeError'
errorMsgFirst200: 'Cannot convert argument to a ByteString because the character at index 16 has a value of 8212 which is greater than 255.'
contentType: null, contentLen: 0, reasoningLen: 0, finishReason: null
```

Character at index 16 = U+2014 (em-dash) inside `X-Title: HOD Daily Brief — ${agent}`. `fetch` requires header values to be ByteStrings — non-ASCII characters throw synchronously before any HTTP round-trip. Orchestrator unaffected because its title is ASCII-only.

**This matched none of H1/H2/H3.** Stopped and handed back (commit of this intermediate state retained in the working tree). Joshua approved a new branch "H5 — non-ASCII header" with the minimum safe fix.

### 2.2 Second reproduction (after H5 fix)

Three of four sub-agents now succeeded. One failure remained — `stock` sub-agent:

```
finishReason: 'length'
contentLen:   2603
category:     'truncated'
first200:     '{ "brief_date": "2026-04-22", "low_stock_items": [ { "item": "Green Curry Paste", ...'
```

Classic **H1** (reasoning-budget / truncation): Gemini 2.5 Flash's built-in "thinking" tokens plus the 2.6 kB stock JSON payload exceeded the hard-coded `maxTokens: 900` ceiling — the JSON was being emitted but cut off mid-object.

### 2.3 Third reproduction (after H5 + H1 fixes)

All four sub-agents succeeded. Final result against `briefDate = 2026-04-22` in `inidzwfjnkyinxhvbrdt`:

```
elapsedMs:           22851
status:              'generated'
degraded:            false
degraded_reason:     null
pipeline_version:    'v2.12-multi-agent'
sub_agent_models:    ['google/gemini-2.5-flash']
orchestrator_model:  'anthropic/claude-sonnet-4.5'
report_count:        6
total_departments:   16
digest_preview:      'OVERVIEW\nSix of sixteen departments reported today; low occupancy with all four guests departing tomorrow, and critical stock shortages flagged in Store.\n\nHIGHLIGHTS\nWildlife — ...'
```

## 3. Fix branches chosen and why

### H5 — non-ASCII header (initial fix)
- **Why:** identical pre-flight `TypeError` on all four sub-agents, zero HTTP round-trip, error message explicitly names the offending character and position. H1/H2/H3 all require an HTTP response, which never occurred.
- **Minimum safe fix applied:**
  - Replace `—` (U+2014) with `-` (U+002D) in `callSubAgent` title template.
  - `toAsciiHeader` sanitisation wrapped around `HTTP-Referer` and `X-Title` in `callOpenRouter` — the failure mode cannot recur from any future caller.

### H1 — reasoning-budget / truncation (follow-on fix)
- **Why:** after H5 cleared, one sub-agent (`stock`, the largest payload) still failed with `finish_reason: 'length'` — the documented H1 symptom. Occupancy, compliance, and action_items succeed at 900 tokens; stock does not.
- **Minimum safe fix applied:**
  - Sub-agent `maxTokens: 900 → 2000`.
  - Added `excludeReasoning` option to `OpenRouterOptions`; sub-agents pass `excludeReasoning: true` so Gemini's thinking tokens don't consume the completion budget.

Neither the `responseFormat: 'json_object'` default nor the parallel `Promise.allSettled` concurrency was changed. Temperature unchanged. Retry not added — it wasn't needed.

## 4. Hypotheses ruled out

- **H2 (429 / 5xx):** no HTTP error text ever surfaced. The 20 Apr failure was entirely local.
- **H3 (response_format rejection, array-of-parts):** after H5 cleared, all four content strings were strings; no error mentioned `response_format` or `json_object`; no content came back as an array.

## 5. Gate A validation (A6)

Exact commands run from `4_development/`:

| Command | Result |
|---|---|
| `npx tsc --noEmit` in `admin-portal` | 0 errors |
| `npx tsc --noEmit` in `portal` (covers `@hod/shared` usage) | 0 errors |
| `npm run lint -w admin-portal` | 0 errors, 13 pre-existing warnings (baseline) |
| `npm run build` in `admin-portal` | Pass; `/api/daily-digest` surfaced as dynamic route |
| `npx tsx --test admin-portal/__tests__/*.test.ts` | 24/24 pass |
| `npx tsx --env-file=admin-portal/.env.local admin-portal/scripts/phase_a_reproduce.ts` | `status: 'generated'`, `degraded: false` |

Note: `packages/shared/` has no standalone `tsconfig.json`; its types are exercised through both workspace apps, both of which typecheck clean.

## 6. Cleanup performed

- No schema changes. No deploy repo changes. No `main` promotion.
- The three `runDailyDigestGeneration(..., force: true)` runs each attempted a `hod_analysis_cache` upsert with `period_type='daily_brief'`. The live CHECK constraint still rejects that value (REL-002 — the subject of Phase B), and the upsert errors are swallowed by the non-blocking `cacheErr` branch. **Net effect: no rows written to the live database by Phase A.** Confirmed by inspecting the generation path; nothing to clean up.
- Phase A reproduction harness retained at `admin-portal/scripts/phase_a_reproduce.ts`. Intentional — it is tiny, has no runtime footprint on the deployed app, and is reused for Phase D live comparisons.

## 7. Evidence summary (sample `analysis_data` shape returned, secret-redacted)

```jsonc
{
  "digest": "OVERVIEW\nSix of sixteen departments reported today; low occupancy with all four guests departing tomorrow, and critical stock shortages flagged in Store.\n\nHIGHLIGHTS\n[…]",
  "report_count": 6,
  "total_departments": 16,
  "notes_count": <n>,
  "missing_departments": ["<dept>", "…"],
  "signature": "<report-signature>|<sub-agent-inputs-hash>",
  "pipeline_version": "v2.12-multi-agent",
  "sub_agent_models": ["google/gemini-2.5-flash"],
  "orchestrator_model": "anthropic/claude-sonnet-4.5"
}
```

No `feedback` key. No `degraded` key (absence = `false`). No raw brief text stored.

## 8. Unresolved risks / open questions

- **Cache persistence is still blocked locally and live until Phase B lands.** Every `runDailyDigestGeneration` run will silently eat the `hod_analysis_cache` upsert until the CHECK is widened to include `daily_brief` / `weekly_brief`. This is exactly the Phase B remit — no action needed in Phase A.
- **Model route assumption.** The H1 fix relies on `google/gemini-2.5-flash` via OpenRouter honouring `reasoning: { exclude: true }` and completing the stock JSON inside 2000 tokens. Holds on today's route; if the provider route changes, the regression harness will catch regressions on the signal (`finishReason: 'length'` still triggers the `'truncated'` category) but not the underlying budget need. Watch for `truncated` appearing in `degraded_reason` post-deploy.
- **Parse tolerance.** `parseJsonOrError` still treats prose-prefixed, prose-trailing, and `<think>`-wrapped content as `invalid_json`. Gemini has been well-behaved under `responseFormat: 'json_object'` in this run; if a future model route emits prose around JSON, classification `invalid_json` will make it visible. Not fixed in Phase A — any expansion of tolerance would be scope creep.
- **Deploy-repo drift.** Phase A only touches the monorepo. Both dev deploy aliases remain on 13 Apr HEADs until Phase C mirrors. This is the plan's explicit phasing.

## 9. Exact next starting point for Phase B

`/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_b_agent_prompt.md`

Phase B begins with restoring Supabase MCP auth (`plugin-supabase-supabase` `mcp_auth`), pre-apply read-only reconnaissance SQL against `inidzwfjnkyinxhvbrdt`, authoring `046_analysis_cache_period_type_expand.sql` under `4_development/portal/supabase/migrations/`, applying via MCP `apply_migration`, and verifying with rollback-guarded smoke inserts. No code changes in Phase B.

---

*Phase A closed. Decision Log updated. Ready for Phase B on Joshua's word.*
