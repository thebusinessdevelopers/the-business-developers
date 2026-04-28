# D-01 Investigation — Model Evaluation

## Status

Partial — OpenRouter model pages were used as the primary evidence base (fetched where possible on 20 Apr 2026). The **Exa** MCP server was not available in this environment, so catalogue figures were taken from **openrouter.ai** model and pricing pages plus targeted web search snippets that mirror those pages. Re-check pricing and throughput immediately before any production change; OpenRouter shows rolling “effective” pricing and provider-specific performance.

## Current setup

### Model in use

**Anthropic Claude Sonnet 4** — OpenRouter slug: `anthropic/claude-sonnet-4` (listed as 1M context; input $3 / output $15 per 1M tokens for prompts up to 200K tokens, with a higher tier above 200K on the model page).

### Config location

The model is **not** driven by an `OPENROUTER_MODEL` environment variable in code today. It is a **hard-coded constant** in the shared package:

- `ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/openrouter.ts` — `const MODEL = 'anthropic/claude-sonnet-4'`; `OPENROUTER_MODEL` is exported as an alias for logging and cache metadata only.
- Admin and portal apps re-export via `admin-portal/lib/openrouter.ts` and `portal/lib/openrouter.ts`.
- **AI call sites** (all use `callOpenRouter` / `OPENROUTER_MODEL` from `@/lib/openrouter` or shared):
  - Daily brief: `admin-portal/app/api/daily-digest/handler.ts`
  - Period analysis: `admin-portal/app/api/analysis/generate/handler.ts`
  - Weekly brief: `admin-portal/app/api/analysis/weekly-brief/route.ts`
  - Trends: `admin-portal/app/api/analysis/trends/route.ts`
  - Executive export: `admin-portal/app/api/exports/generate/route.ts`
  - Report urgency flags (tool-calling): `portal/app/api/submit-report/route.ts`

Only `OPENROUTER_API_KEY` is required from the environment (see `next_chat_handover.md`).

### Prompt style / data sources

**Daily brief** (`daily-digest/handler.ts`):

- **System prompt:** Executive briefing assistant; British English; fixed plain-text sections (`OVERVIEW`, `HIGHLIGHTS`, `ACTION ITEMS`, `NOT YET REPORTED`); no markdown; factual; do not invent; skip “all clear” departments in highlights; integrate operational context without parroting.
- **User payload:** Yesterday’s date (Kampala); counts; per-department lines built from Supabase `hod_daily_reports.report_data.challenges_successes`, submitter, and optional urgent flag from `ai_flags.top_label`; optional “Not yet reported” list from `hod_departments`.
- **Operational context block** (same handler, appended to user message): aggregates from Supabase — `bookings` + `booking_rooms` + `accommodation_units` (occupancy, arrivals, check-outs, guests on-site), open `hod_meeting_action_items` (overdue / due this week), and a **four-week** slice of `hod_daily_reports` for urgent-flag rate vs today (calibration text).

Other OpenRouter jobs (weekly brief, analysis, trends, export summaries, urgency tool-call) use their own system prompts but the **same model constant**.

## OpenRouter model survey (Apr 2026)

Throughput figures below are **OpenRouter-published averages by provider** where available from the model Performance section (varies by route and time). Cost rows use **list** prices from each model’s OpenRouter page unless noted. Reasoning rating is a **qualitative** label from OpenRouter’s positioning and public benchmark claims, not a re-run of benchmarks.

| Model | OpenRouter slug | Context window | Cost (input / output per 1M) | Reasoning rating | Notes |
|-------|-----------------|------------------|--------------------------------|------------------|-------|
| Claude Sonnet 4 (current) | `anthropic/claude-sonnet-4` | 1M | $3 / $15 (prompt ≤200K); $6 / $22.50 (prompt over 200K) | Strong general + coding/reasoning | ~39–44 tok/s (Vertex Global / Anthropic / Bedrock). |
| Claude Sonnet 4.5 | `anthropic/claude-sonnet-4.5` | 1M | Same list tier as Sonnet 4: $3 / $15 (≤200K); $6 / $22.50 (over 200K) | Stronger agent / long-task (per Anthropic/OpenRouter copy) | ~36–39 tok/s; direct successor for agentic workflows. |
| Claude 3.7 Sonnet | `anthropic/claude-3.7-sonnet` | 200K | $3 / $15 | Strong (prior gen) | Smaller context than Sonnet 4; not an upgrade for long-context needs. |
| Gemini 2.5 Pro | `google/gemini-2.5-pro` | ~1.05M | $1.25 / $10 | Frontier “thinking” model (OpenRouter description) | High throughput on Google routes (~90–99 tok/s cited on performance pages). Lower input cost than Sonnet 4; different style guardrails. |
| Gemini 2.5 Flash | `google/gemini-2.5-flash` | ~1.05M | $0.30 / $2.50 | Strong reasoning workhorse (built-in thinking) | ~13–72 tok/s by provider. Good cost/latency vs Sonnet 4. |
| Gemini 2.0 Flash | `google/gemini-2.0-flash-001` | ~1M | $0.10 / $0.40 | Fast, capable Flash | **OpenRouter lists “Going away June 1, 2026”.** ~75–82 tok/s. Max output **8.2K** on page — check against `maxTokens` (e.g. 1500) — OK for current briefs. |
| DeepSeek R1 | `deepseek/deepseek-r1` | ~64K (provider variants exist) | $0.70 / $2.50 | Reasoning-specialist | Strong price; **context far smaller** than Sonnet/Gemini 1M — poor fit if prompts grow. Slower on some providers (~30–80 tok/s). |
| DeepSeek V3 | `deepseek/deepseek-chat` (and variants e.g. v3.1) | ~164K (V3) / lower on some variants | ~$0.32 / $0.89 (V3 list) | Strong general, not R1-style chain-of-thought | Cheap; good for classification / lighter tasks; context under 1M. |
| OpenAI o3 | `openai/o3` | 200K | ~$2 / $8 (list; effective varies) | Reasoning-first | Strong for hard reasoning; **200K context** and different latency/cost profile than 1M Sonnet. |

## Recommendation

### Primary (orchestrator / intelligence-first)

**`anthropic/claude-sonnet-4.5`** — Same vendor line and OpenRouter slug family as today, **1M context**, identical **list** input/output tier to Sonnet 4 for typical prompt sizes, and OpenRouter/Anthropic positioning explicitly emphasises **improved agentic behaviour, tool orchestration, and long-running context handling** — which matches the product goal (faithful synthesis across departments, flags, accommodation, and meetings). Risk: lowest-change migration path and consistent instruction-following style with existing prompts.

**Runner-up:** **`google/gemini-2.5-pro`** if the priority shifts to **lower input cost** and you accept re-validation of tone (British English, plain-text section compliance) and any provider routing quirks — OpenRouter lists substantially cheaper input than Sonnet 4 with a similar ~1M context class.

### Sub-agent / fallback (fast + cheap)

**`google/gemini-2.5-flash`** — Strong OpenRouter throughput on Vertex Global, **much lower** cost than Sonnet 4, ~1M context, and suited to **high-volume, shorter** jobs (e.g. urgency labelling in `submit-report` if you split models later).

**Avoid relying on `google/gemini-2.0-flash-001` for new work** past mid-2026: OpenRouter marks it as **ending 1 Jun 2026**.

**`deepseek/deepseek-chat` (V3)** remains a valid **budget** option for simple structured tasks if prompts stay well under ~200K tokens — not a like-for-like “more intelligent than Sonnet 4” claim without your own eval.

## Config change required

1. **Today there is no `OPENROUTER_MODEL` env var in code.** To align with the backlog wording and avoid redeploys for model tweaks, implement something like:  
   `const MODEL = process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4'`  
   in `packages/shared/lib/openrouter.ts`, and document the variable in deployment env (Netlify etc.). Keep `OPENROUTER_MODEL` export in sync with the resolved value.

2. **Immediate one-line upgrade (no env plumbing):** change the constant to  
   `anthropic/claude-sonnet-4.5`.

3. **Prompt adjustments:** No structural change is **required** for Sonnet 4.5 if behaviour matches Sonnet 4. After any switch, run a **short validation window**: check daily brief section headers, “never invent” compliance, and urgent-flag handling. If moving to **Gemini 2.5 Pro/Flash**, run the same checks and watch for markdown leakage or US spelling; tighten the system line if needed.

4. **Optional split routing:** Use Sonnet 4.5 (or Gemini 2.5 Pro) for digest/analysis/export, and **Gemini 2.5 Flash** (or DeepSeek V3) for `submit-report` urgency JSON — requires a second model constant or env key (e.g. `OPENROUTER_MODEL_FAST`).

## Sources

- https://openrouter.ai/models/anthropic/claude-sonnet-4  
- https://openrouter.ai/google/gemini-2.5-pro-preview/pricing (effective pricing + `google/gemini-2.5-pro`)  
- https://openrouter.ai/models/google/gemini-2.5-flash  
- https://openrouter.ai/models/google/gemini-2.0-flash-001  
- https://openrouter.ai/models/anthropic/claude-sonnet-4.5 (pricing parity with Sonnet 4; cross-checked via search)  
- Repository paths under `ziwa_ranch/projects/hod_daily_reports/4_development/` as cited above.
