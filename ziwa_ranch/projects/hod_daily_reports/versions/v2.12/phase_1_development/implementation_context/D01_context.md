# D-01 — Implementation context: OpenRouter model upgrade + env-var plumbing

## Item summary

Resolve the primary OpenRouter model from env (default Sonnet 4.5), export a fast-model slug for later routes, and document both in admin-portal env examples whilst keeping all call sites on `callOpenRouter` / `OPENROUTER_MODEL` from shared.

## Files to change

| File | What changes | Function / type name |
|------|--------------|----------------------|
| `ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/openrouter.ts` | Replace hard-coded `MODEL`; add `OPENROUTER_MODEL_FAST` export | `MODEL`, `OPENROUTER_MODEL`, `OPENROUTER_MODEL_FAST`, `callOpenRouter` |
| `ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/.env.example` | **Create** (file absent today) with two documented vars | — |
| `ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/netlify.toml` | Optional only: codify non-secret defaults under `[build.environment]` if you want in-repo defaults; otherwise rely on Netlify UI | — |

## DB migration required

N

## Dependencies

None (but D-02 and D-03 consume the new env vars).

## Complexity

XS — single module owns the slug; re-exports propagate unchanged.

## Validation steps

1. Deploy or run locally with `OPENROUTER_API_KEY` set; omit `OPENROUTER_MODEL` and confirm requests use `anthropic/claude-sonnet-4.5` (e.g. via OpenRouter usage dashboard or logged `model_used` rows where present).
2. Set `OPENROUTER_MODEL` to a different slug temporarily and confirm API routes still succeed and persisted `model_used` matches the override.
3. Smoke-test one admin flow (daily digest or period analysis) and portal `submit-report` urgency path for correct JSON / no regressions in British English plain-text behaviour per `phase_one/D1_model_evaluation.md`.

## Exact diff (authoritative for Chat 5 plan)

### packages/shared/lib/openrouter.ts (authoritative; admin-portal and portal `lib/openrouter.ts` are barrel re-exports)

```diff
- const MODEL = 'anthropic/claude-sonnet-4'
- export const OPENROUTER_MODEL = MODEL
+ const MODEL = process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4.5'
+ export const OPENROUTER_MODEL = MODEL
+ export const OPENROUTER_MODEL_FAST = process.env.OPENROUTER_MODEL_FAST ?? 'google/gemini-2.5-flash'
```

### admin-portal/.env.example

`admin-portal/.env.example` does not exist in the repo today; add a new file (or append if introduced elsewhere) containing:

```diff
+ OPENROUTER_MODEL=anthropic/claude-sonnet-4.5
+ OPENROUTER_MODEL_FAST=google/gemini-2.5-flash
```

### admin-portal/netlify.toml (if required)

Not required for correctness: Next.js server routes read runtime env from Netlify site settings. Current file has only `[build]` (`command`, `publish`) — no `[build.environment]`.

Optional (non-secret defaults only; skip if you prefer UI-only configuration):

```toml
[build.environment]
  OPENROUTER_MODEL = "anthropic/claude-sonnet-4.5"
  OPENROUTER_MODEL_FAST = "google/gemini-2.5-flash"
```

## Evidence

- **Hard-coded model:** `const MODEL = 'anthropic/claude-sonnet-4'` — `ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/openrouter.ts:2`
- **Request body uses same `MODEL`:** `model: MODEL` — same file `:48`
- **Alias export:** `export const OPENROUTER_MODEL = MODEL` — same file `:3`
- **Admin re-export (not duplicate logic):** `export * from '@hod/shared/lib/openrouter'` — `ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/openrouter.ts:1`
- **Portal re-export:** same pattern — `ziwa_ranch/projects/hod_daily_reports/4_development/portal/lib/openrouter.ts:1`
- **`OPENROUTER_MODEL` / `OPENROUTER_MODEL_FAST` in `4_development/`:** only `OPENROUTER_MODEL` appears as the **exported constant name** in TS sources; no `process.env.OPENROUTER_MODEL` or `OPENROUTER_MODEL_FAST` usage yet — grep across `4_development/` (hits: `packages/shared/lib/openrouter.ts:3`; five admin-portal API files and `portal/app/api/submit-report/route.ts` importing `OPENROUTER_MODEL` for metadata / JSON). **Env var names not declared** in `netlify.toml` or `packages/shared/` beyond future change; `.env.example` **absent** at `admin-portal/.env.example` (read returned not found; glob under `4_development` found only `admin-portal/.env.local` and `portal/.env.local`).
- **`netlify.toml`:** `ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/netlify.toml:1-4` — `[build]` only, no env keys.
- **Callers / `MODEL`:** `MODEL` appears only inside `packages/shared/lib/openrouter.ts` (`:2`, `:48`); no other `.ts` imports `MODEL`.
- **Imports from `@/lib/openrouter`:** six API modules — `admin-portal/app/api/daily-digest/handler.ts:4`, `admin-portal/app/api/analysis/generate/handler.ts:4`, `admin-portal/app/api/analysis/weekly-brief/route.ts:4`, `admin-portal/app/api/analysis/trends/route.ts:4`, `admin-portal/app/api/exports/generate/route.ts:4` (imports `callOpenRouter` only), `portal/app/api/submit-report/route.ts:5`. None import the model slug string directly; the only code literal `anthropic/claude-sonnet-4` outside docs is `packages/shared/lib/openrouter.ts:2`.
- **Investigation alignment:** primary `anthropic/claude-sonnet-4.5`, fast `google/gemini-2.5-flash`, env-driven config recommendation — `ziwa_ranch/projects/hod_daily_reports/versions/v2.12/../investigations/phase_one/D1_model_evaluation.md` (e.g. config section and recommendation blocks).
