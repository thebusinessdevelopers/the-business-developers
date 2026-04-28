# D-03 — Background execution architecture decision

**STATUS:** final (investigation artefact; no implementation)

---

## 1. Current execution model

### Synchronous request–response (no streaming)

- **Daily digest** (`GET` `/api/daily-digest`): single handler awaits OpenRouter, then returns JSON. No chunked/streaming response to the client.
  - Evidence: `await callOpenRouter({...})` then `NextResponse.json` — `4_development/admin-portal/app/api/daily-digest/handler.ts` L174–L252.
- **Period analysis** (`POST` `/api/analysis/generate`): awaits `callOpenRouter`, then responds.
  - Evidence: `4_development/admin-portal/app/api/analysis/generate/handler.ts` L280–L368.
- **Weekly brief** (`POST` `/api/analysis/weekly-brief`): same pattern.
  - Evidence: `4_development/admin-portal/app/api/analysis/weekly-brief/route.ts` L164–L260.
- **OpenRouter client**: single `fetch` to `https://openrouter.ai/api/v1/chat/completions`, awaits full JSON, parses `choices[0].message`. Not streaming from the model to the caller.
  - Evidence: `4_development/packages/shared/lib/openrouter.ts` L35–L69.

### Timeout exposure (Netlify)

- All of the above run inside the same Netlify-deployed Next.js serverless invocation for the route handler: database reads, prompt assembly, **blocking** OpenRouter HTTP, optional cache write, then response.
- Repository `netlify.toml` for the admin portal sets only `[build]` (`command`, `publish`); **no** `[functions]` timeout override.
  - Evidence: `4_development/admin-portal/netlify.toml` L1–L3.
- Netlify documents **60 seconds** as the default execution limit for **synchronous** functions (background functions are separate at **15 minutes**).
  - Source: [Netlify Functions overview](https://docs.netlify.com/build/functions/overview/) (retrieved investigation date).
- **Conclusion:** worst-case wall time for a request is bounded by that synchronous limit plus cold start; any slow OpenRouter or large Supabase fan-out increases timeout risk. `package.json` gives no alternative runtime (`4_development/admin-portal/package.json` L1–L18) — deployment remains standard `next build` on Netlify.

### `hod_analysis_cache` — reads and writes

| Surface | Read | Write / invalidate |
|--------|------|---------------------|
| Daily digest | `period_type = 'daily_brief'`, `period_key = briefDate`; serve if `analysis_data.signature` matches **and** `generated_at` &lt; 2h | Upsert same keys after generation; delete stale `daily_brief` rows older than 7 days except current key |
| Analysis generate | `period_type` ∈ `{day, week, month}` + `period_key`; hit if signature matches (unless `force`) | `force`: delete row first; else miss → generate → upsert; prune &gt;7 days for that `period_type` |
| Weekly brief | `weekly_brief` + `period_key = weekly_brief:{weekStart}`; hit if present and **age &lt; 2h** (no signature check on read) | Upsert; prune old `weekly_brief` rows |
| Trends (`GET` `/api/analysis/trends`) | `trend_alert` + `trend:{thisWeekStart}`; hit if `analysis_data.signature` matches | Upsert; prune old `trend_alert` rows |

Evidence by file and line:

- Daily digest read/TTL/signature: `handler.ts` L53–L71; write/prune: L232–L247.
- Generate read/force/delete: `generate/handler.ts` L149–L170; write/prune: L348–L363.
- Weekly read: `weekly-brief/route.ts` L32–L52; write/prune: L240–L255.
- Trends read: `trends/route.ts` L54–L67; write/prune: L198–L213.

**Schema:** migration defines unique `(period_type, period_key)` — `4_development/portal/supabase/migrations/019_analysis_cache.sql` L4–L15.

**Other repo references:** planning/backlog text only (e.g. `versions/v2.12/backlog.md`); BMS `database.ts` type mirror — not runtime paths for this portal.

---

## 2. Option A — Netlify Background Functions

| Criterion | Assessment |
|-----------|--------------|
| **Feasibility** | **High.** Same repository and host as today; no new primary vendor. Netlify documents background functions for longer work and links **Next.js** guidance for background API routes ([Background Functions](https://docs.netlify.com/functions/background-functions/), [Next.js advanced API routes](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/legacy-runtime/advanced-api-routes#background-api-routes)). |
| **Max execution time** | **15 minutes** (background); synchronous remains **60 s** default unless plan allows custom options where documented. |
| **Complexity** | **M.** Split “read cache only” from “enqueue generation”; secure the trigger (reuse `verifyAdminAuth` or shared secret for server-to-server); ensure background entrypoint can run the same logic as today (shared module import). |
| **Fit with `hod_analysis_cache`** | **Direct.** Same `upsert` / prune patterns as existing handlers; same `period_type` / `period_key` contract. |
| **Reliability / observability** | Async invocation returns **202**; retries on invoke failure (per Netlify docs). Logs in Netlify Functions UI. No built-in job row — optional `hod_analysis_jobs` or status field if product needs polling state. |
| **Cost posture** | Uses existing Netlify function billing/credits; background invocations counted as functions. |

**Pros:** Native to current deployment; keeps **all** TypeScript in one place (`@hod/shared`, `@/lib/*`); largest headroom without leaving Netlify.

**Cons:** Next.js + Netlify wiring must follow current adapter rules (verify against installed Netlify Next plugin version); background payload size limit **256 KB** per Netlify docs — large prompts must stay built server-side from IDs/dates, not posted as huge bodies.

**Trigger pattern:** authenticated `POST` (or action) on a **sync** route validates input → `fetch` same-site background endpoint or Netlify-scheduled pattern → returns **202** + optional `job_id`; background function runs pipeline and writes Supabase.

---

## 3. Option B — Supabase Edge Functions

| Criterion | Assessment |
|-----------|--------------|
| **Feasibility** | **Medium.** Supabase is already the database; service-role writes to `hod_analysis_cache` are natural. **Downside:** today’s pipeline is **Node/Next**-centric (`verifyAdminAuth`, `@/lib/extract-metrics`, forms config, etc.). Porting or duplicating that into **Deno** edge code is non-trivial. |
| **Max execution time** | **Wall clock:** 150 s (free) / **400 s** (paid) per [Supabase Edge Function limits](https://supabase.com/docs/guides/functions/limits). **Request idle timeout:** 150 s before **504** if no response sent. **CPU time:** 2 s per request (I/O-bound OpenRouter waits do not consume CPU quota the same way, but very heavy JS could bite). |
| **Complexity** | **L** if logic is **moved** wholesale; **M** if edge function only orchestrates by calling back into a minimal HTTP API (adds hops). |
| **Fit with `hod_analysis_cache`** | **Strong** — native Postgres access via `supabase-js` and `upsert` on `(period_type, period_key)`. |
| **Reliability / observability** | Supabase function logs; HTTP invoke from admin portal or **pg_cron** + `net.http_post` for schedules. Cold starts and 504 behaviour need explicit “return 202 early + worker” pattern if wall clock is tight — Edge Functions are not a full queue product. |
| **Cost posture** | Supabase invocations and bandwidth; OpenRouter unchanged. |

**Pros:** Decouples long work from Netlify entirely (aligns with “not constrained by frontend host” product goal). Central secrets in Supabase.

**Cons:** Highest **code motion / duplication** risk for this stack; **400 s** ceiling still below Netlify background **15 min** if pipelines grow (e.g. multi-model).

---

## 4. Option C — n8n workflow

| Criterion | Assessment |
|-----------|--------------|
| **Feasibility** | **Medium–high** conceptually: webhook → n8n → HTTP to OpenRouter → HTTP/Postgres to Supabase with service role. Requires secrets and workflow maintenance outside the repo. |
| **Max execution time** | **Instance-dependent.** Self-hosted n8n often allows **hours** if configured; n8n Cloud tiers differ. Not derivable from this repo — **Joshua to confirm** n8n hosting limits and timeout settings. |
| **Complexity** | **M–L.** Rebuild or mirror prompt assembly in n8n nodes (or pass a large pre-built payload — fragile). Change control is split between Git and n8n JSON. |
| **Fit with `hod_analysis_cache`** | **Good** via Supabase REST or SQL node with service role — same table contract. |
| **Reliability / observability** | n8n execution history, retries, alerting; depends on n8n deployment quality. |
| **Cost posture** | n8n compute + workflow runs; may simplify Netlify function duration to “webhook only”. |

**n8n MCP (this workspace):** Directory `/Users/joshuaroy/.cursor/projects/Users-joshuaroy-the-business-developers/mcps/project-0-the-business-developers-n8n/` contained only `SERVER_METADATA.json` (server id `project-0-the-business-developers-n8n`). **No** `tools/` descriptor files were present locally to enumerate tool names. Reading `STATUS.md` returned an MCP error — **Cursor MCP server status should be checked** before relying on MCP-driven triggers in implementation.

**Likely implementation pattern (when MCP available):** invoke whatever tool the n8n MCP exposes for **executing a workflow** or **firing a webhook** after inspecting live tool schemas in Cursor Settings → MCP.

**Pros:** Non-developers can adjust orchestration; strong for multi-step integrations (email, Slack, future steps).

**Cons:** Logic drift vs TypeScript source of truth; secrets sprawl; max runtime and SLAs are **environment-specific**.

---

## 5. Recommendation

**Primary: Option A — Netlify Background Functions.**

**Reasoning:** Keeps a **single TypeScript source of truth** with existing `@hod/shared` OpenRouter client and analysis helpers; minimal operational surface (one host); **15-minute** ceiling exceeds Supabase Edge **400 s** paid cap; writes already target `hod_analysis_cache` with clear keys. Matches v2.12 direction: **decouple** user-facing routes from generation work without introducing a second runtime (Deno) or workflow DSL.

**Hybrid (optional):** If Netlify background routes prove awkward with a future Next.js adapter, **Option C (n8n)** for **weekly** or **multi-step** briefs only — sync routes stay thin; n8n owns long orchestration. Use **Option B** only if policy mandates **all** AI off Netlify regardless of background mode.

**Trigger / cache flow (target):**

1. **Page load / read path:** Route handler (or Server Component data loader) **reads** `hod_analysis_cache` only; returns cached payload + `stale` / `pending` flag if absent.
2. **Manual “Regenerate”:** Authenticated mutation calls a **short** endpoint that validates scope and **invokes** a Netlify **background** function (or posts to `/.netlify/functions/...-background` if using classic functions layout) — returns **202** + optional correlation id.
3. **Background job:** Runs current generation logic (OpenRouter + validation + `upsert` + prune) — same as `handler.ts` / `route.ts` bodies today, factored into a shared module.
4. **UI:** Polls read endpoint or uses soft reload until `hod_analysis_cache.generated_at` / signature satisfies the UI contract.

---

## 6. Open questions

1. **Exact Netlify Next.js adapter** in use for `admin-portal` (OpenNext vs legacy): confirm background API route support and any **effective** timeout that differs from standard function docs.
2. **n8n** hosting tier and **workflow execution timeout** — needed only if Option C or hybrid is pursued.
3. **Job visibility:** Is a **`processing` row** or separate jobs table required for UX, or is “poll cache until fresh” enough?
4. **Weekly brief cache semantics:** today’s read path uses **2h TTL without signature** (`weekly-brief/route.ts` L40–L51) — product decision whether regenerate-on-report-change should align with digest/analysis **signature** pattern.
5. **MCP n8n descriptors missing locally** — confirm Cursor MCP installation and tool list when implementing Option C.

---

## 7. File index (absolute paths examined)

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/daily-digest/handler.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/daily-digest/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/analysis/generate/handler.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/analysis/generate/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/analysis/weekly-brief/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/analysis/trends/route.ts` (cache usage; not in original bullet list but required for complete `hod_analysis_cache` map)
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/openrouter.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/openrouter.ts` (re-export; content not duplicated)
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/netlify.toml`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/netlify.toml`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/package.json`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/019_analysis_cache.sql`
- `/Users/joshuaroy/.cursor/projects/Users-joshuaroy-the-business-developers/mcps/project-0-the-business-developers-n8n/SERVER_METADATA.json`
- Grep: `hod_analysis_cache` across `/Users/joshuaroy/the-business-developers` (hits listed in §1 and backlog/docs only)
- External: [Netlify Functions overview](https://docs.netlify.com/build/functions/overview/), [Netlify Background Functions](https://docs.netlify.com/functions/background-functions/), [Supabase Edge Function limits](https://supabase.com/docs/guides/functions/limits)
