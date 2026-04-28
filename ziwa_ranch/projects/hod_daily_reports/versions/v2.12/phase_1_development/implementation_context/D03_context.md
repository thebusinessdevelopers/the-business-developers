# D-03 — Implementation context: Netlify Background Functions for daily brief

## Item summary

Move daily-brief generation off the synchronous Next.js route into a Netlify Background Function (15-minute ceiling), keep a thin authenticated kick-off that returns **202**, and let the UI poll `GET /api/daily-digest` until `hod_analysis_cache` satisfies the freshness contract.

## Files to change

| File | What changes | Function / type name |
|------|--------------|----------------------|
| `4_development/admin-portal/netlify.toml` | Add `[functions]` only if an explicit timeout or directory config is required beyond defaults; confirm against Netlify build output. | N/A |
| `4_development/admin-portal/netlify/functions/daily-digest-background.ts` | **New** — Netlify Background Function entrypoint; runs shared generation (OpenRouter + cache upsert/prune). | Default `Handler` export (`async (req: Request) => …`) |
| `4_development/admin-portal/app/api/daily-digest/handler.ts` | Split **read** path (`GET`: cache hit or “pending” body without awaiting OpenRouter) from **kick-off** (`POST`: `verifyAdminAuth`, invoke background URL, return **202**); extract generation body callable from the background file. | `GET`, `POST`, shared helpers / `runDailyDigestGeneration` (name TBD) |
| `4_development/admin-portal/app/api/daily-digest/route.ts` | Re-export `POST` alongside `GET` from `./handler`. | `GET`, `POST` |
| `4_development/admin-portal/components/DailyDigestCard.tsx` | Optional: faster polling after regenerate; optional `stale` / `pending` handling once API exposes them; align `DigestData` with API. | `DailyDigestCard`, `DigestData` |

## DB migration required

**N** — default plan is **poll-cache-until-fresh** (no `hod_analysis_jobs`). **Y** only if product requires explicit job rows for UX or auditing.

## Dependencies

- D-01 — env vars / model upgrade (background function uses same OpenRouter helper)
- D-02 — pipeline design (4 sub-agents run inside the background function)

## Complexity

**M** — thin sync kick-off plus one background entrypoint and factored shared generation; auth and same-site invoke wiring.

## Validation steps

1. Local or deploy preview: `POST /api/daily-digest` (or chosen path) with valid admin session returns **202** and does not await OpenRouter in the sync invocation.
2. Netlify Functions UI: `daily-digest-background` invocation appears and completes; logs show cache upsert without sync timeout.
3. Supabase: row for `period_type = 'daily_brief'` and expected `period_key` updates `analysis_data` / `generated_at` after background run.
4. Browser: `DailyDigestCard` eventually shows updated brief (poll or manual refresh); no **504** on the kick-off request under deliberate slow OpenRouter.

## Optional migration — hod_analysis_jobs (only if jobs-table path chosen)

```sql
-- portal/supabase/migrations/0XX_analysis_jobs.sql
-- Optional job visibility for async daily brief (and similar). Omit if polling hod_analysis_cache only.

CREATE TABLE IF NOT EXISTS hod_analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type TEXT NOT NULL,
  period_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'complete', 'failed')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error TEXT,
  correlation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_lookup
  ON hod_analysis_jobs (period_type, period_key, created_at DESC);
```

## Decisions and implementation notes (tasks a–f)

### a. Current function config

- **`[functions]` in `admin-portal/netlify.toml`:** **None** — file content is exactly `[build]` with `command` and `publish` only (`netlify.toml` L1–3).
- **Netlify-related dependencies in `package.json`:** **None** — no `@netlify/functions`, `@netlify/plugin-nextjs`, or similar in `dependencies` / `devDependencies` (`package.json` L11–30).

### b. File shape for the background function

- **Choice: Option A** — `4_development/admin-portal/netlify/functions/daily-digest-background.ts` (standalone Netlify Function with **`-background`** suffix).
- **Justification:** Netlify uses that suffix as the explicit switch to asynchronous background execution; App Router route handlers are not promoted to background functions automatically.
- **Minimal export sketch (Netlify, not Next.js):**

```ts
import type { Handler } from '@netlify/functions' // optional; add package if types wanted

const handler: Handler = async (event, context) => {
  // validate payload / secret, run shared generation, return 200 when work is finished
  return { statusCode: 200, body: JSON.stringify({ ok: true }) }
}

export { handler as default }
```

(Align the handler signature with the Netlify runtime template in use; Netlify may also document `export default async (req: Request) => new Response(...)` for newer function formats.)

### c. Kick-off endpoint

- **`route.ts` today:** **Two lines** — re-exports **`GET`** only from `./handler` (`route.ts` L1); logic lives in `handler.ts` (**272 lines** end-to-end for `GET`).
- **Refactor:** Extend the same surface: add **`POST`** in `handler.ts`, re-export **`export { GET, POST } from './handler'`** in `route.ts`. **`POST`** performs `verifyAdminAuth`, `fetch` to `/.netlify/functions/daily-digest-background` with a small JSON body, returns **`202`** without awaiting OpenRouter. A separate thin route is optional if you want a smaller `handler.ts`.
- **Response shape:** **`202 Accepted`** with body e.g. `{ "accepted": true, "correlation_id": "<optional uuid>" }`.
- **`GET`:** Evolve to read-only (cache hit or explicit pending) so navigation never blocks on generation (`phase_one/D3_background_execution.md` L116–117).

### d. UI polling

- **Lines:** `DailyDigestCard.tsx` L56 (`REFRESH_INTERVAL = 5 * 60 * 1000`); L63–74 `fetchDigest` (`fetch('/api/daily-digest')`); L76–80 `useEffect` + `setInterval(fetchDigest, REFRESH_INTERVAL)`.
- **Fetch cadence:** **`GET /api/daily-digest` every five minutes** — verified.
- **`stale` / `pending`:** Not present on `DigestData` (`DailyDigestCard.tsx` L5–16); the card does not expect those flags; it uses `digest`, `report_count`, `cached`, `generated_at`, `error`, `degraded`, etc.
- **Tightening:** After a kick-off, **shorter polling** (e.g. 10–30 s) until the cache read shows a fresh digest, then **revert** to five minutes.

### e. Job visibility decision

- **Default (Chat 2 / investigation):** **Poll cache until fresh** — no jobs table required (`phase_one/D3_background_execution.md` L117–121, L129).
- **Jobs-table path:** Optional SQL in **Optional migration** above; add `updated_at` maintenance (trigger or application updates) if the product adopts it.

### f. Timeout risk today

- **Sync path:** Netlify **60 s** default for synchronous functions; **15 min** for background (`phase_one/D3_background_execution.md` L22–27, L55–56).
- **Highest risk:** Routes that **await OpenRouter** inside the sync invocation — **`GET` `/api/daily-digest`** on cache miss (`handler.ts` L174–252), and per the same investigation **`POST` `/api/analysis/generate`** and **`POST` `/api/analysis/weekly-brief`** (`phase_one/D3_background_execution.md` L13–16).
- **Under background:** **Safest** is generation inside **`daily-digest-background`** (sync layer only validates and enqueues, or reads cache).

## Evidence

- `4_development/admin-portal/netlify.toml` L1–3 — no `[functions]` block; only `[build]`.
- `4_development/admin-portal/package.json` L11–30 — no Netlify-scoped npm dependencies.
- `4_development/admin-portal/app/api/daily-digest/route.ts` L1 — `export { GET } from './handler'`.
- `4_development/admin-portal/app/api/daily-digest/handler.ts` L35–71 — cache read / hit; L174–252 — `await callOpenRouter`, upsert, JSON response.
- `4_development/admin-portal/components/DailyDigestCard.tsx` L5–16 — `DigestData` fields; L56 — five-minute interval; L63–64, L76–79 — fetch and interval wiring.
- `4_development/portal/supabase/migrations/019_analysis_cache.sql` L4–11 — `hod_analysis_cache` shape and unique key.
- `versions/v2.12/../investigations/phase_one/D3_background_execution.md` L22–27, L55–56, L109–111, L116–121, L129 — timeouts, recommendation, trigger flow, jobs vs cache.
- Glob `netlify/functions/**` under `4_development/admin-portal/` — **0** files (no functions directory present).
