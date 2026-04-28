# 01 — AI Orchestration Investigation (v2.12 Phase 3 false-degrade)

STATUS: scoping
Date: 2026-04-22
Scope: read-only investigation of why `runDailyDigestGeneration()` marks **all four** sub-agents failed while standalone probes on the same model and inputs succeed.

## 1. Summary

- **Most likely root cause:** Gemini 2.5 Flash returns its reasoning / "thinking" output in `message.reasoning` and / or is truncated by `maxTokens: 900` after thinking tokens are spent, so `message.content` arrives empty or partial. `parseJsonOrError('')` fails, every sub-agent is classified `ok: false`, and the degraded label "Sub-agents failed: occupancy, stock, compliance, action_items" is produced. The team has already hit this exact class of bug once before with Claude Sonnet 4.6 — see `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/next_chat_handover.md`.
- **Second-most likely:** four parallel OpenRouter calls to `google/gemini-2.5-flash` with `response_format: {type: 'json_object'}` are rate-limited (HTTP 429) or 5xx'd by the upstream provider, causing `callOpenRouter` to throw in all four branches. `Promise.allSettled` then hands the catch-branch outcomes to the classifier.
- **Third-most likely:** `response_format: { type: 'json_object' }` is inconsistently supported on Gemini 2.5 Flash via OpenRouter — some routes reject it, some silently fall back, some return content as a structured parts array rather than a string.
- **Orchestration mis-classification is unlikely to be the root cause**, but the classifier is brittle: any JSON body that happens to contain `error: 'invalid_json'` or any transport throw would be classified as failed, and the error type is never logged.
- **Same class of bug is not present in the orchestrator call itself**, because the orchestrator is Claude Sonnet 4.5 without `response_format` and with a `1500` token budget — which is why the final `digest` string was still produced and only the sub-agents are listed as failed.

## 2. Code inspection findings

### 2.1 Sub-agent call shape

```
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/daily-digest-generation.ts (≈ lines 109–136)

async function callSubAgent(agent, input, model) {
  try {
    const result = await callOpenRouter({
      model,
      messages: [
        { role: 'system', content: SUB_AGENT_PROMPTS[agent] },
        { role: 'user', content: JSON.stringify(input) },
      ],
      maxTokens: 900,
      temperature: 0.1,
      responseFormat: 'json_object',
      referer: 'https://hod-admin-portal.netlify.app',
      title: `HOD Daily Brief — ${agent}`,
    })
    const parsed = parseJsonOrError(result.content)
    const isError = parsed && typeof parsed === 'object' && 'error' in parsed && parsed.error === 'invalid_json'
    return { agent, model, ok: !isError, json: parsed, error: isError ? 'invalid_json' : undefined }
  } catch (err) { /* … */ }
}
```

Key facts:

- `maxTokens: 900` is hard-coded. Tight for a reasoning-enabled model.
- `responseFormat: 'json_object'` is always on.
- `parseJsonOrError` only receives `result.content`, never `result.reasoning`.

### 2.2 JSON parser

```
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/daily-digest-generation.ts (≈ lines 77–84)

function parseJsonOrError(raw) {
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
  try { return JSON.parse(cleaned) }
  catch { return { error: 'invalid_json', raw: cleaned.slice(0, 500) } }
}
```

- Empty string or non-JSON preamble → `JSON.parse('')` throws → `ok: false`.
- Strips markdown code fences only; does not strip `<think>` wrappers, leading prose, trailing prose, or array-of-parts structures.
- No type guard on `raw` — if `result.content` were ever non-string, `.replace` would throw.

### 2.3 Outcome classification

```
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/daily-digest-generation.ts (≈ lines 392–410)

const subAgentSettled = await Promise.allSettled([
  callSubAgent('occupancy', occupancyInput, OPENROUTER_MODEL_FAST),
  callSubAgent('stock', stockInput, OPENROUTER_MODEL_FAST),
  callSubAgent('compliance', complianceInput, OPENROUTER_MODEL_FAST),
  callSubAgent('action_items', actionItemsInput, OPENROUTER_MODEL_FAST),
])

const subAgentOutcomes = subAgentSettled.map((s, idx) => {
  const agent = (['occupancy','stock','compliance','action_items'])[idx]
  if (s.status === 'fulfilled') return s.value
  const msg = s.reason instanceof Error ? s.reason.message : String(s.reason)
  return { agent, model: OPENROUTER_MODEL_FAST, ok: false,
    json: { error: 'sub_agent_rejected', agent, detail: msg.slice(0, 200) },
    error: msg.slice(0, 200) }
})
```

- Four calls fire truly in parallel. No retry, no spacing, no per-agent timeout.
- Thrown errors are captured but only the first 200 chars are kept and never routed to `console.error`.

### 2.4 Degraded-reason composition

```
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/daily-digest-generation.ts (≈ lines 412–518)

const subAgentFailures = subAgentOutcomes.filter((o) => !o.ok)
...
const anySubAgentFailure = subAgentFailures.length > 0
const degraded = degradedOrchestrator || !validOutput || anySubAgentFailure
...
...(anySubAgentFailure
  ? { degraded: true, degraded_reason: `Sub-agents failed: ${subAgentFailures.map((f) => f.agent).join(', ')}` }
  : {}),
```

`degraded_reason` carries only agent names, not failure categories — so the observed string `Sub-agents failed: occupancy, stock, compliance, action_items` is compatible with every one of the candidate root causes.

### 2.5 OpenRouter client — content extraction

```
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/openrouter.ts (≈ lines 31–74)

interface OpenRouterResponse {
  content: string
  reasoning: string | null
  usage: { prompt_tokens: number; completion_tokens: number }
  tool_calls?: { function: { name: string; arguments: string } }[]
}

export async function callOpenRouter(opts) {
  ...
  const data = await response.json()
  const msg = data.choices?.[0]?.message
  return {
    content: msg?.content ?? '',
    reasoning: msg?.reasoning ?? null,
    ...
  }
}
```

- `content` is coerced to `''` when missing. A reasoning-model response that puts tokens into `reasoning` (or exhausts the budget before emitting `content`) will surface here as `''`.
- `reasoning` is captured but no caller in the multi-agent path reads it.
- No handling for `content` returned as an array of parts (OpenRouter does this on some provider routes when structured output or tool calls are involved).
- No visibility into `finish_reason` — a truncation (`length`) would be invisible.

### 2.6 Known prior incident in the same codebase

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/next_chat_handover.md` line 92: "Claude Sonnet 4.6's `reasoning` parameter consumed the token budget — do not use."
- Same file, line 427: "OpenRouter model history. … Claude Sonnet 4.6's reasoning parameter consumed token budget — do not use."
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_1_development/investigations/phase_one/D1_model_evaluation.md` line 49 describes Gemini 2.5 Flash as a "strong reasoning workhorse (built-in thinking)".

The exact "reasoning consumes budget" failure mode has a historical precedent in this project and is specifically called out as a rule to honour.

## 3. Evidence mapping to test report

| Test report observation | Code location explaining it |
|---|---|
| `degraded: true` with all four agents named | `subAgentFailures.length > 0` triggers via `callSubAgent` returning `ok: false` for every call |
| `degraded_reason` contains only names, no category | `Sub-agents failed: ${subAgentFailures.map((f) => f.agent).join(', ')}` |
| Final `digest` still produced | Orchestrator uses Claude Sonnet 4.5 with `maxTokens: 1500` and no `response_format`; reasoning-budget trap does not apply |
| Standalone Occupancy / Compliance probes succeed | Different call shape (likely no `response_format`, higher `maxTokens`, and serial rather than four-way parallel) — rules out model, input, and prompt as root cause |
| `pipeline_version` is correct | PIPELINE_VERSION constant is emitted regardless of sub-agent outcome |

## 4. Root cause hypothesis ranking

### H1 — Reasoning-budget exhaustion / content-in-wrong-field (most likely)

Evidence:

- Gemini 2.5 Flash is documented as a "built-in thinking" model in this project.
- `callSubAgent` uses `maxTokens: 900`, tight for a thinking model producing multi-field JSON.
- `callOpenRouter` extracts only `msg?.content ?? ''` and ignores `reasoning`.
- `parseJsonOrError('')` fails → `ok: false` → every sub-agent classified failed.
- Same class of failure recorded previously in `next_chat_handover.md` for Claude Sonnet 4.6.
- Failure affects all four sub-agents deterministically — consistent with a systemic model / client issue, not data variance.

### H2 — Concurrent rate-limiting of Gemini 2.5 Flash

Evidence:

- Four calls fire truly in parallel via `Promise.allSettled`.
- OpenRouter and some paid Gemini routes throttle when multiple requests hit the same key concurrently.
- `callOpenRouter` throws on any non-OK HTTP status; the catch branch produces `ok: false` with a 200-char error string never logged.
- Standalone probes that succeed imply the issue only appears under concurrency.
- Four-out-of-four 429s would be unusual unless the key is on a low tier — keeps this below H1.

### H3 — `response_format: json_object` incompatibility on Gemini via OpenRouter

Evidence:

- `response_format: { type: 'json_object' }` always on for sub-agents.
- OpenRouter support for structured output on Gemini is historically inconsistent; some provider routes return content as a parts array, some ignore the flag, some reject with 4xx.
- If rejected → `callOpenRouter` throws → same failure label.
- If array-of-parts → `.replace` on a non-string raises → same catch branch.

### H4 — Sub-agent parser is too strict (contributing factor)

Evidence:

- `parseJsonOrError` only strips markdown code fences. Leading prose, `<think>` blocks, "Here is the JSON:" preambles, or trailing commentary all yield invalid-json.
- Gemini Flash in JSON mode typically suppresses preambles, but parser would not survive a truncated body (H1 symptom).

### H5 — Misclassification of successful JSON as failed

Evidence:

- Classifier only rules out the literal `{ error: 'invalid_json' }` shape. A legitimate JSON whose top-level field happens to be `error: 'invalid_json'` would be misclassified. Not plausible given sub-agent schemas. Paranoia check only.

## 5. Minimum safe fix sequence (to apply later, not now)

Apply in order; stop once local reproduction returns `degraded === false`.

1. **Add per-sub-agent instrumentation first, no behavioural change.**
   - In `callSubAgent` error path, log: `{ agent, model, contentType: typeof result.content, contentLen, reasoningLen, first200, finishReason }`.
   - In `callOpenRouter`, pass through `data.choices?.[0]?.finish_reason` on a new optional field.
2. **Reproduce locally once** and read the instrumentation. Remainder of the fix is conditional on what it shows.
3. **Fix A — reasoning-budget exhaustion (H1):**
   - Raise sub-agent `maxTokens` from 900 to ≥ 2000.
   - In `callOpenRouter`, accept an `excludeReasoning: boolean` option and send `reasoning: { exclude: true }` when true.
   - Belt-and-braces: if `content === ''` and `reasoning` contains a parseable JSON substring, fall back to parsing from reasoning.
4. **Fix B — concurrency / rate limit (H2):**
   - Bounded retry in `callSubAgent` (e.g. 2 retries, 250 ms / 750 ms backoff) on HTTP 429 / 5xx.
   - Alternative: serialise the four sub-agent calls. Gemini 2.5 Flash is fast enough to fit inside the 15-minute BG ceiling.
5. **Fix C — response shape (H3):**
   - In `callOpenRouter`, normalise `content`: if array of parts, concatenate `.text`; if missing, consider `msg?.reasoning` as last resort.
   - Detect `finish_reason === 'length'` and surface a distinct truncation label.
6. **Fix D — parser robustness (H4):**
   - Strip `<think>…</think>` blocks and any leading non-`{` preamble before `JSON.parse`.
   - Reject empty / whitespace-only input with a dedicated `'empty_content'` label.
7. **Harden classification:**
   - Surface a failure category on each `SubAgentOutcome` (`rate_limit`, `empty_content`, `invalid_json`, `http_error`, `truncated`).
   - Extend `degraded_reason` to include categories, not agent names alone.
8. **Re-run end-to-end locally** and only then consider deploy-repo refresh.

## 6. Confirming-evidence checklist before any code change

Instrumented run must produce at least one of the following unambiguous signals for every failed sub-agent:

- `typeof result.content === 'string' && result.content.length === 0` plus `result.reasoning.length > 0` ⇒ confirms H1.
- `finish_reason === 'length'` ⇒ confirms H1 (truncation variant).
- Caught error message matches `OpenRouter 429` or `OpenRouter 5\d\d` ⇒ confirms H2.
- Caught error message mentions `response_format` / `json_object` not supported ⇒ confirms H3.
- `typeof result.content === 'object'` (e.g. array) ⇒ confirms H3 variant.
- Non-empty string content that fails `JSON.parse` ⇒ confirms H4.

Additional confirming experiments:

- Rerun with `responseFormat` disabled in `callSubAgent` for one agent only — if that one succeeds while others fail → H3.
- Rerun with sub-agents serialised — if all succeed → H2.
- Rerun with `maxTokens: 2000` unchanged parallelism — if all succeed → H1.

## 7. Proposed regression harness

### 7.1 Unit tests

- `parseJsonOrError` — empty, whitespace, plain JSON, fenced JSON, prose-prefixed, prose-trailing, `<think>` wrapper, truncated JSON.
- `callOpenRouter` with mocked `fetch`:
  - `choices[0].message.content` string → returned verbatim
  - content null / missing → returned as `''`
  - content as array of parts → (after fix) joined string
  - non-OK HTTP 429 → throw carries status
  - `finish_reason === 'length'` → surfaced
- `callSubAgent` with mocked `callOpenRouter`:
  - Empty content → `ok: false`, category `empty_content`
  - Valid JSON → `ok: true`
  - Thrown 429 → `ok: false`, category `rate_limit`

### 7.2 Dry-run end-to-end

- `runDailyDigestGeneration` test with mocked Supabase and mocked OpenRouter client returning valid JSON for all four sub-agents and a valid digest for the orchestrator.
- Assert: `status === 'generated'`, `data.degraded` falsy, `data.pipeline_version === 'v2.12-multi-agent'`, fast-model in `sub_agent_models`, Sonnet in `orchestrator_model`, digest passes `isValidDigestText`.

### 7.3 Live smoke (opt-in)

- Script gated on `OPENROUTER_API_KEY` running `runDailyDigestGeneration` against a fixed past `briefDate`, printing per-sub-agent outcome categories and `degraded`.
- Acceptance: `degraded === false` for a representative day.

## 8. Confirmed facts vs likely conclusions vs open questions

### Confirmed facts

- `callSubAgent` uses `maxTokens: 900`, `temperature: 0.1`, `responseFormat: 'json_object'`, fires all four via `Promise.allSettled`.
- `parseJsonOrError` only strips markdown code fences; returns `{ error: 'invalid_json' }` on any parse failure including empty string.
- `callOpenRouter` extracts `msg?.content ?? ''`; captures `reasoning` but no sub-agent reads it; no array normalisation; no `finish_reason` exposure.
- `degraded_reason` is composed from agent names only.
- Orchestrator uses Claude Sonnet 4.5, larger `maxTokens` (1500), no `response_format` — explains why orchestrator still produces a digest.
- Project has prior record of reasoning-budget trap (`next_chat_handover.md` lines 92, 427).

### Likely conclusions

- Four sub-agents fail because `result.content` is empty or non-parseable (H1 primary; H2 / H3 plausible secondary).
- Failure is systemic, not data-dependent — two reruns failing the same four agents is inconsistent with data or rate-limit variance alone.
- Raising `maxTokens` to ≥ 2000 and requesting `reasoning: { exclude: true }` is likely to restore correct behaviour without other changes.

### Open questions

- Is `result.content` empty, truncated, or a non-string shape?
- Does `result.reasoning` contain the intended JSON body?
- What is `finish_reason` for each failed call?
- Do any of the four calls return 429 / 5xx transport errors? At what concurrency?
- Does the standalone Occupancy probe (which succeeded) use `response_format: 'json_object'` and `maxTokens: 900`, or different settings?
- Is the active OpenRouter key on a provider route that silently disables `response_format` on Gemini 2.5 Flash?

---

*Evidence only. No chain-of-thought. No code, schema, or deploys changed by this investigation.*
