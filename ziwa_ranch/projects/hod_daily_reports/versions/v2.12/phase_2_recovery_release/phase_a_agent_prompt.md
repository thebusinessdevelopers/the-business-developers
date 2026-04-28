# Phase A Agent Prompt — v2.12 Recovery

STATUS: awaiting-approval
Date: 2026-04-22
Phase boundary: **Phase A only**

Use this prompt for the implementation agent responsible for Phase A of the v2.12 recovery effort.

---

## Mission

Your job is to execute **Phase A only** of the v2.12 recovery plan for HOD Daily Reports:

- identify the actual root cause of the false degraded multi-agent daily-digest path using instrumentation;
- apply the minimum safe code fix for the confirmed signal;
- add the targeted regression harness;
- prove the local path is green.

You must stop at the end of Phase A and hand back. You must **not** start schema work, deploy work, or live validation.

---

## Read first, in this order

1. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_two_plan.md`
2. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/01_ai_orchestration_investigation.md`
3. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/04_master_synthesis.md`
4. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/tests.md/20_04_test.md`
5. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/handover/phase_3_handover.md`
6. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/daily-digest-generation.ts`
7. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/openrouter.ts`
8. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/daily-digest/handler.ts`

Resolved facts you do **not** need to re-investigate:

- Active app DB is `inidzwfjnkyinxhvbrdt`.
- `/logo.png` conflict is an admin deploy-refresh issue, not a Phase A issue.
- `@hod/shared` stays as `"*"` in deploy repos for v2.12.

---

## Scope allowed

You may change only what is needed for Phase A inside:

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/backlog.md` (Decision Log entries only)

Allowed actions:

- add instrumentation to the OpenRouter client and daily-digest generation path
- run the local reproduction
- apply the minimum safe fix once the signal is confirmed
- add / update targeted tests for the daily-digest parse and orchestration path
- run type-check, lint, build, and the new tests
- write the mandatory Phase A handoff artefacts

---

## Forbidden actions

Do **not**:

- touch database schema or apply migrations
- authenticate or use Supabase MCP for Phase B work
- push anything to deploy repos
- commit to or push `hod_admin_portal` / `hod_daily_reports`
- start Phase B, C, or D
- make unrelated refactors
- change `/logo.png` handling
- change `@hod/shared` package spec in deploy repos
- promote anything to `main`

---

## Required execution order

### 1. Add instrumentation only

In `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/openrouter.ts`:

- extend `OpenRouterResponse` with `finishReason?: string`
- pass through `data.choices?.[0]?.finish_reason`
- do not change request defaults yet

In `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/daily-digest-generation.ts`:

- instrument `callSubAgent` so the error path logs:
  - `agent`
  - `model`
  - `contentType`
  - `contentLen`
  - `reasoningLen`
  - `finishReason`
  - `first200`
  - `errorName`
  - `errorMsgFirst200`

Do not change `maxTokens`, `responseFormat`, or other defaults before the reproduction is captured.

### 2. Reproduce locally

Run the same kind of direct `runDailyDigestGeneration()` reproduction used in the 20 Apr test run, against a real `briefDate` in `inidzwfjnkyinxhvbrdt`.

From the captured signal, choose exactly one branch:

- **H1** if the dominant signal is empty `content`, non-empty `reasoning`, `finishReason === 'length'`, or clearly non-string content on all four calls
- **H2** if the dominant signal is `OpenRouter 429` / `OpenRouter 5xx`
- **H3** if the dominant signal is `response_format` rejection or array-of-parts / unsupported content shape

Record the dominant signal in `versions/v2.12/backlog.md` Decision Log before changing defaults.

### 3. Apply the minimum safe fix

If **H1**:

- raise sub-agent `maxTokens` to `2000`
- add `excludeReasoning?: boolean` to `OpenRouterOptions`
- send `reasoning: { exclude: true }` when that flag is true
- pass `excludeReasoning: true` in `callSubAgent`

If **H2**:

- add bounded retry in `callSubAgent` for `429` / `5xx` only
- if that still fails, serialise the four sub-agent calls

If **H3**:

- normalise `msg?.content` to a string in `openrouter.ts`
- if the model is Gemini 2.5 Flash via OpenRouter, remove `responseFormat: 'json_object'` from `callSubAgent` and rely on the strict JSON prompt

In every branch:

- extend `SubAgentOutcome` with a `category`
- include categories in `degraded_reason`

### 4. Build the regression harness

Add targeted tests covering:

- `parseJsonOrError`
- `callOpenRouter` content-shape handling
- `callSubAgent` category classification
- mocked end-to-end `runDailyDigestGeneration()` with a non-degraded result

Prefer the smallest test harness already supported by the repo. Do not add unnecessary tooling.

### 5. Run the Phase A gate

All must pass:

- `npx tsc --noEmit` in `4_development/admin-portal`
- `npx tsc --noEmit` in `4_development/packages/shared`
- `npm run lint -w admin-portal`
- `npm run build` in `4_development/admin-portal`
- the new regression harness
- a real local `runDailyDigestGeneration()` reproduction returning `status: 'generated'` and `degraded === false`

Stop immediately if the dominant signal does not cleanly match H1, H2, or H3 after instrumentation. If that happens, document it and hand back rather than improvising a larger refactor.

---

## Documentation requirements before handoff

Phase A is **not complete** until you write both files below:

1. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_a_delivery.md`
2. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_b_agent_prompt.md`

### `phase_a_delivery.md` must include

- `STATUS:` token
- date
- exact files changed
- exact root-cause signal captured in the instrumentation
- which fix branch was used (H1 / H2 / H3) and why
- exact validation commands run
- evidence summary
- cleanup performed
- unresolved risks
- exact next starting point for Phase B

### `phase_b_agent_prompt.md` must include

- mission: Phase B only
- read-first file list
- exact allowed scope
- exact forbidden actions
- the authenticated-MCP requirement
- the exact SQL reads required before migration
- the migration filename to author
- the verification gate
- explicit instruction to stop at the Phase B boundary and hand back

Also update `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/backlog.md` Decision Log with:

- the dominant orchestration signal
- the Phase A commit SHA
- validation result
- absolute paths to `phase_a_delivery.md` and `phase_b_agent_prompt.md`

---

## Delivery format in chat

When Phase A is complete, return a concise summary containing:

1. which root-cause branch was confirmed
2. which files were changed
3. what tests / checks passed
4. whether the real local reproduction now returns `degraded === false`
5. exact paths written for `phase_a_delivery.md` and `phase_b_agent_prompt.md`
6. any residual risks Phase B should know about

Do not continue into Phase B in the same run.

---

## Final instruction

Execute **Phase A only**. Do the smallest safe change set that satisfies the gate. Write the handoff artefacts. Then stop and hand back.
