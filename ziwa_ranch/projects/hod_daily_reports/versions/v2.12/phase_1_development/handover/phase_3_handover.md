# Phase 3 — Handover

> **Scope:** AI infrastructure per `plan.md` §§3.1–3.4, executed in the mandated sequence D-01 → D-03 → D-02 → D-04.
> **Build status:** `tsc --noEmit` clean in admin-portal, portal, and packages/shared; `next build` clean for both apps; eslint clean on all modified files.
> **No DB migrations.** `hod_analysis_cache` schema unchanged — new fields live inside `analysis_data`. No `hod_analysis_jobs` table.
> **Status:** awaiting-approval — `APPROVED: phase_3_complete` required before v2.12 release.

---

## a. What was done

### 3.1 — D-01: OpenRouter model upgrade + env plumbing (`XS`)

- `packages/shared/lib/openrouter.ts`: `MODEL` now resolves from `process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4.5'`. New export `OPENROUTER_MODEL_FAST = process.env.OPENROUTER_MODEL_FAST ?? 'google/gemini-2.5-flash'`.
- `callOpenRouter` accepts optional `model` and `responseFormat: 'json_object'` arguments; body uses `opts.model ?? MODEL`.
- `admin-portal/.env.example` created documenting both variables and the internal-token fallback.
- `admin-portal/netlify.toml` gained a `[build.environment]` block pinning both model defaults (keeps non-secret defaults in the repo while real secrets stay in Netlify UI).
- Admin and portal `lib/openrouter.ts` remain barrel re-exports — no code changes needed at call-sites.

### 3.2 — D-03: Background function + combined `POST` kick-off (`M`)

- `admin-portal/package.json`: `@netlify/functions ^2.8.1` added as devDependency (for `Handler` typing).
- `admin-portal/netlify/functions/daily-digest-background.ts` (new): Netlify Background Function entrypoint. Validates method, shared internal-token header, parses `{ briefDate, force, feedback }`, creates a Supabase server client, and calls `runDailyDigestGeneration`. 15-minute ceiling.
- `admin-portal/netlify/functions/_internal-auth.ts` (new): small helper that checks `x-hod-internal-token` against the shared `getInternalRouteToken()` (reuses the existing `packages/shared/lib/internal-route-auth.ts` convention — fallback to `SUPABASE_SERVICE_ROLE_KEY` when no explicit token set).
- `admin-portal/app/api/daily-digest/handler.ts` split:
  - `GET` is now **cache-read-only**. Returns `{ digest: null, report_count: 0 }` when no reports exist, `{ pending: true }` when no cache row, cached payload + `stale: true` when signature mismatch or cache age ≥ 2 h, cached payload + `stale: false` when fresh. Never awaits OpenRouter.
  - `POST` performs `verifyAdminAuth('analysis')`, length-validates optional `feedback` (≤ 500 chars after trim → 400), fetches the background function URL (`${URL}/.netlify/functions/daily-digest-background`) with the internal-token header, and returns **202 `{ accepted: true, brief_date }`** without awaiting generation.
- `admin-portal/app/api/daily-digest/route.ts` now re-exports `{ GET, POST }`.
- `admin-portal/components/DailyDigestCard.tsx`: polling replaced by a recursive scheduler — 15 s when the last response was `pending` or `stale` (with reports present), 5 min otherwise. Auto-kicks the BG function when pending is detected. New UI state for the Regenerate control (below, D-04).
- `admin-portal/app/api/analysis/weekly-brief/route.ts`: signature-based cache read for parity with daily — signature rows fetched up front via `buildReportSignature`, cache hit requires `cachedData.signature === signature` AND age < 2 h.

### 3.3 — D-02: Multi-agent pipeline inside the BG function (`L`)

- `admin-portal/lib/daily-digest-generation.ts` (new) — sole host of the generation body, called by the BG function.
- Four Gemini 2.5 Flash sub-agents run in parallel via `Promise.allSettled`:
  - **Occupancy** — inputs: `brief_date`, `units_total`, raw booking overlap rows for `briefDate` and `briefDate + 1`.
  - **Stock** — inputs: last 7 days of `hod_verified_stock`, open `hod_stock_flags`, deterministic stock-key extracts from F&B / Kitchen / Store reports over the same window.
  - **Compliance** — inputs: same-day report rows (department, submitter, challenges_successes, urgent_flag, top_score), `missing_departments[]`, active department total.
  - **Action items** — inputs: open/in-progress items joined to `hod_departments` with `title`, `description`, `deadline`, `assignee`, `updated_at`, plus `stalled_days_threshold: 14`.
- Each sub-agent uses a terse JSON-only system prompt matching the D-02 §3 schemas and `responseFormat: 'json_object'`; on parse / transport failure the JSON is replaced with an error-tagged stub (`{ error: 'sub_agent_failed', agent, detail }`) and `degraded: true` is set.
- Orchestrator = Claude Sonnet 4.5 with the **existing** daily-digest system prompt verbatim, extended with the optional fifth **RISKS AHEAD** section instruction. User content: header JSON (`brief_date`, reported / total, missing departments, Kampala generation time, urgency calibration vs 4-week average) followed by the four sub-agent JSON blobs.
- Output validated via `isValidDigestText`; on failure falls back to `buildDigestFallbackText` with `degraded: true`.
- **Composite signature** = `signature_reports + '|' + sha256(stableStringify(sub_agent_inputs))` (first 16 hex chars) — operational changes (stock, bookings, action items) invalidate the cache without requiring a report edit. `buildReportSignature` unchanged (hash built locally in the generation module).
- `analysis_data` on upsert now carries `pipeline_version: 'v2.12-multi-agent'`, `sub_agent_models: ['google/gemini-2.5-flash']`, `orchestrator_model: 'anthropic/claude-sonnet-4.5'` (or whichever slugs the env vars resolve to).

### 3.4 — D-04: Feedback prompt injection + UI textareas (`S`)

- `feedback` validation (inline, no schema file changes): `typeof === 'string'`, trim, reject with 400 when trimmed length > 500. Empty feedback is a no-op.
- `feedbackPrefix = '[USER INSTRUCTION] ' + trimmed + ' [/USER INSTRUCTION]\n\n'` is prepended to the first line of the user message in three places:
  - `admin-portal/app/api/analysis/generate/handler.ts` (period analysis user message).
  - `admin-portal/app/api/analysis/weekly-brief/route.ts` (weekly brief user message).
  - `admin-portal/lib/daily-digest-generation.ts` (daily-brief orchestrator user content — invoked by `POST /api/daily-digest` via the BG function).
- `admin-portal/app/api/daily-digest/handler.ts` `POST` validates feedback length up-front (400 on breach), forwards the trimmed value into the BG function body.
- `admin-portal/app/analysis/AnalysisPanel.tsx`: adds `feedback` state + a `maxLength={500}` textarea beneath the primary controls. Both the primary `generateAnalysis()` button and the cached "Regenerate" link thread the trimmed value into the `/api/analysis/generate` fetch body when non-empty.
- `admin-portal/components/DailyDigestCard.tsx`: adds a header **Regenerate** toggle and, when expanded, a `maxLength={500}` textarea + "Start regeneration" button. Submission POSTs `{ force: true, feedback? }` to `/api/daily-digest`, resets the textarea on success, and surfaces the server's error message on 400.
- `feedback` is **never** written to `analysis_data`. The upserts in `daily-digest-generation.ts`, `analysis/generate/handler.ts`, and `analysis/weekly-brief/route.ts` still include only `{ period_type, period_key, analysis_data, generated_at, model_used }`.
- `console.error` audit: the three AI routes and the generation module log only error messages (`errMsg.slice(0, 200)` or Postgrest error objects). No body, no `feedback`, no prompt content is logged. Confirmed by grep.

---

## b. File index

### Shared (`packages/shared/`)

- `lib/openrouter.ts` — env-driven `OPENROUTER_MODEL` + new `OPENROUTER_MODEL_FAST`; `callOpenRouter` accepts optional `model` and `responseFormat` args; body uses `opts.model ?? MODEL`.

### Admin portal (`admin-portal/`)

- `.env.example` (new) — documents `OPENROUTER_MODEL`, `OPENROUTER_MODEL_FAST`, and internal-token env.
- `netlify.toml` — `[build.environment]` defaults for both model vars.
- `package.json` — `@netlify/functions` devDep added.
- `netlify/functions/daily-digest-background.ts` (new) — BG function entrypoint.
- `netlify/functions/_internal-auth.ts` (new) — header-dict internal-token helper.
- `lib/daily-digest-generation.ts` (new) — multi-agent pipeline host. Builds sub-agent inputs, runs four Flash calls in parallel, orchestrator call, composite signature, cache upsert + prune.
- `app/api/daily-digest/handler.ts` — `GET` cache-read-only; new `POST` kick-off.
- `app/api/daily-digest/route.ts` — re-exports `{ GET, POST }`.
- `app/api/analysis/generate/handler.ts` — `feedback` parsed, validated, injected.
- `app/api/analysis/weekly-brief/route.ts` — `feedback` parsed, validated, injected; signature-based cache read.
- `app/analysis/AnalysisPanel.tsx` — feedback textarea + threading in fetch body.
- `components/DailyDigestCard.tsx` — adaptive polling, auto-kick-off on pending, Regenerate control + feedback textarea.

### Portal (`portal/`)

- None. D-01's shared change propagates to portal's submit-report urgency classifier transparently via the barrel re-export; no runtime code edits.

---

## c. Validation summary

| Check | Result |
|---|---|
| `tsc --noEmit` admin-portal | Pass (0 errors) |
| `tsc --noEmit` portal | Pass (0 errors) |
| `next build` admin-portal | Pass — `/api/daily-digest` surfaced as dynamic route |
| `next build` portal | Pass |
| `eslint` on all modified admin-portal files | Clean |
| `console.error` audit across AI routes + generation module | No body / feedback ever logged |
| `hod_analysis_cache` upsert payloads | No `feedback` field in any of the three call-sites |
| Composite signature | `signature_reports + '|' + sha256(stableStringify(sub_agent_inputs))[:16]` — operational-only edits invalidate cache |

### Deferred to post-deploy smoke on Netlify

These require a live Netlify deploy (the BG function only exists in the Netlify runtime) and are listed in the Phase 3 checklist as unticked:

1. Kick-off `POST /api/daily-digest` returns **202** in < 2 s; Netlify Functions UI shows a `daily-digest-background` invocation that completes (§3.2 validation 1–4).
2. Supabase: `hod_analysis_cache` row for `period_type = 'daily_brief'` updates with fresh `analysis_data`, `generated_at`, `model_used` after the BG run; `pipeline_version`, `sub_agent_models`, `orchestrator_model` present.
3. Deploy preview with `OPENROUTER_MODEL` unset → requests resolve to Sonnet 4.5; override env → `model_used` reflects the override.
4. Period analysis and weekly brief Regenerate with `feedback` produce steered outputs; `hod_analysis_cache` still carries no `feedback` key.
5. Deliberate sub-agent failure drill — orchestrator still runs; `degraded: true` surfaces.
6. Four-Flash parallel execution visible in logs; end-to-end wall time inside the BG function < 15 min for a representative dataset.

---

## d. Operational notes

- **Internal token for BG invocation.** The POST handler attaches the `x-hod-internal-token` header built by `buildInternalHeaders`. This resolves to `INTERNAL_ROUTE_TOKEN` / `INTERNAL_JOB_TOKEN` if set, otherwise falls back to `SUPABASE_SERVICE_ROLE_KEY`. As long as the admin-portal Netlify site exposes `SUPABASE_SERVICE_ROLE_KEY` to the runtime (already the case for all server routes), the BG function will auth successfully with no new secret to manage. Set `INTERNAL_ROUTE_TOKEN` explicitly if you want a dedicated rotation surface.
- **Background base URL.** The POST handler reads `process.env.URL || DEPLOY_URL || DEPLOY_PRIME_URL || NEXT_PUBLIC_SITE_URL` to build the absolute BG URL. Netlify populates `URL` in prod and `DEPLOY_PRIME_URL` on branch deploys; no configuration required. For `netlify dev` local runs, `URL=http://localhost:8888` works out of the box. Plain `next dev` (no Netlify) cannot reach a BG function — regenerate path will return 502 there, which is expected.
- **Cache invalidation.** The composite signature includes all four sub-agent inputs. Any change to `bookings`, `hod_verified_stock`, `hod_stock_flags`, `hod_meeting_action_items`, or the relevant `hod_daily_reports` rows will invalidate the cache on the next kick-off.
- **Poll cost.** The new `GET` path is cache-only — no OpenRouter calls. Polling at 15 s during regeneration is Supabase-only traffic.

---

## e. Open items / follow-ups

- **Post-deploy smokes** — see §c "Deferred" list above. Record Netlify deploy IDs and sample `analysis_data` payloads in `backlog.md` Decision Log once confirmed.
- **Approval gate** — awaiting `APPROVED: phase_3_complete` from Joshua before the v2.12 release. No release until approval.
- **Future optimisations (not Phase 3):**
  - Materialised-view-backed stock metrics (noted as deferred in D-02 investigation) would let the Stock sub-agent run on pre-aggregated data instead of raw JSON from `report_data`.
  - A `hod_analysis_jobs` visibility table remains opt-in (Chat 2 decision retained). Revisit only if end users need explicit "generation in progress" affordances beyond the current pending/stale surface.
  - The generation module's `SupabaseLike = { from: (t) => any }` is a pragmatic workaround for cross-workspace `@supabase/supabase-js` type divergence between admin-portal and shared. Cleaner fix: pin supabase-js in `packages/shared/package.json` so both workspaces resolve the same type declaration. Deferred to v2.13 hygiene.
