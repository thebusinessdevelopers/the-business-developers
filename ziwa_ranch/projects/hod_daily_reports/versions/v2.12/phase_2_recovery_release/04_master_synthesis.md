# 04 — Master Synthesis: v2.12 Recovery

STATUS: awaiting-approval
Date: 2026-04-22
Scope: reconciles the three Phase 2 investigations into a single recommended recovery sequence for the eventual implementation agent. Investigation only — no code, schema, or deploys changed.

Source documents:
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/00_recovery_sequence.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/01_ai_orchestration_investigation.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/02_schema_alignment_investigation.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/03_deploy_refresh_path_investigation.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/tests.md/20_04_test.md`

---

## 1. Headline conclusions

1. The three blockers identified on 20 Apr 2026 are real, distinct, and correctly ordered in `00_recovery_sequence.md`. The deep investigations confirm that document rather than contradict it. One refinement: the orchestration bug is now a specific, evidenced hypothesis, not an open mystery.
2. **Most likely orchestration root cause:** Gemini 2.5 Flash's built-in reasoning tokens, combined with a hard-coded `maxTokens: 900` and a `callOpenRouter` client that reads only `message.content` (ignoring `message.reasoning` and `finish_reason`), leave sub-agent `content` empty. `parseJsonOrError('')` fails for all four sub-agents and the wrapper marks every one failed. This is the same class of bug the project already hit with Claude Sonnet 4.6 (recorded in `4_development/next_chat_handover.md` lines 92 and 427).
3. **Schema drift is out-of-band, not a missing migration.** The live `hod_analysis_cache_period_type_check` was added directly in Supabase and never captured in repo. `019_analysis_cache.sql` has no CHECK on `period_type`. The safe fix is a new, additive migration (e.g. `046_analysis_cache_period_type_expand.sql`) that drops the restrictive CHECK and replaces it with the six-value allow-list required by current code.
4. **Deploy refresh is a manual file mirror, not a branch merge.** The monorepo's `4_development/` tree is untracked; both deploy repos' `dev` branches are still at their v2.11 `main` commits. Admin-first refresh is the safest ordering because Phase 3's observable behaviour change lives almost entirely in the admin site.
5. **Execution order matters.** Redeploying before the orchestration fix wastes QA time; redeploying before the schema fix causes every daily-brief BG run to fail with a `23514` check-violation. The correct order remains: fix code locally → apply schema migration → mirror and push deploy repos → run the live validation gate.

---

## 2. What is now known vs still unknown

### 2.1 Confirmed by the investigations

- `runDailyDigestGeneration` fires four sub-agents in parallel with `maxTokens: 900`, `responseFormat: 'json_object'`, and parses only `message.content`. Error paths are never logged. `degraded_reason` carries agent names only.
- `parseJsonOrError` returns `{ error: 'invalid_json' }` for empty or non-JSON strings — the exact failure shape seen in testing for all four sub-agents.
- The orchestrator uses Claude Sonnet 4.5 with larger `maxTokens` (1500) and no `response_format`, which is why the final `digest` text was still produced even while every sub-agent was marked failed.
- The repo's migration history for `hod_analysis_cache` is a single file (`019_analysis_cache.sql`) that declares no `period_type` CHECK. No later migration touches the table or column.
- Current code requires six `period_type` values across four routes (`day`, `week`, `month`, `trend_alert`, `daily_brief`, `weekly_brief`). Three are currently blocked by the live CHECK.
- Both deploy repos' `dev` HEADs equal their `main` HEADs at the v2.11 commits (`fac6542` admin, `bda114e` portal, built 2026-04-13).
- Monorepo `4_development/` is untracked; only a manual directory-mirror path exists from monorepo → deploy repos.
- `packages/shared/` delta is identical against both deploy repos — a single shared-package bump must travel with the refresh.

### 2.2 Still unknown (must be answered before code changes)

1. **Orchestration confirmation.** Exactly one of the following is the root cause and only an instrumented reproduction will confirm which:
   - reasoning-budget exhaustion on Gemini 2.5 Flash (H1)
   - concurrent rate-limit on four parallel calls (H2)
   - `response_format: json_object` incompatibility on the Gemini route (H3)
   The instrumentation to add is specified in `01_ai_orchestration_investigation.md §5 step 1` and `§6`.
2. **Verbatim live CHECK DDL.** `project-0-the-business-developers-supabase` MCP returned `Unauthorized` to every read query this session. Authenticated re-run of `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'hod_analysis_cache_period_type_check';` is required before authoring the replacement migration.
3. **Active database identity.** Test report line 116 infers the live app DB differs from `inidzwfjnkyinxhvbrdt`. Every other authoritative document states both apps share that project. Must be resolved by reading the Netlify site env for both sites (`NEXT_PUBLIC_SUPABASE_URL`) before any migration is applied.
4. **`/logo.png` conflict.** Monorepo admin has both `app/logo.png/route.ts` and `public/logo.png`; v2.11 deploy kept only the public file; handover says route-backed. A single source of truth must be picked before mirroring admin.
5. **`@hod/shared` spec.** Deploy repos ship `"*"`; handover documents `"file:packages/shared"`. Do not change in the refresh. Raise as a follow-up.

---

## 3. Corrected conclusions vs `00_recovery_sequence.md`

| Claim in `00_recovery_sequence.md` | Status after Phase 2 investigations |
|---|---|
| Dev previews are stale because split deploy repos were not refreshed | **Confirmed.** Both deploy `dev` branches still at v2.11 commits. No commits since 2026-04-13. |
| Live DB rejects `period_type='daily_brief'`; drift is schema, not wrong target | **Partially confirmed.** Schema drift is confirmed; "wrong target" question is still technically open — test report explicitly inferred a different active DB from the MCP-exposed project. Execution agent must verify the Netlify site env before migrating. |
| Orchestration bug is inside orchestration / result handling, not basic model availability | **Confirmed and sharpened.** Primary hypothesis is reasoning-budget exhaustion + content-field handling in `callOpenRouter`. Secondary hypotheses are concurrency rate-limit and `response_format` incompatibility. Mis-classification logic alone is not the root cause. |
| Runtime must support six `period_type` values | **Confirmed.** File-and-line evidence provided in `02_schema_alignment_investigation.md §4`. |
| Phase A (code) before Phase B (schema) before Phase C (deploy) before Phase D (validation) | **Confirmed.** Doing schema or deploy before the code fix produces either persistent cache misses or wasted QA time. |
| New migration should be authored, not an edit of `019_analysis_cache.sql` | **Confirmed.** Additive SQL and rollback drafted in `02_schema_alignment_investigation.md §6–§7`. |

No material claim in `00_recovery_sequence.md` is contradicted. Refinement, not correction.

---

## 4. Dependencies between the three tracks

```
Phase A — Code (orchestration fix, local only)
        │
        ▼
Phase B — Schema (additive migration on inidzwfjnkyinxhvbrdt)
        │
        ▼
Phase C — Deploy refresh (admin first, then portal)
        │
        ▼
Phase D — Live validation gate
```

- **A → B:** Schema work requires no code. It can technically run in parallel with A. The recovery sequence still lists A first because (a) A is a local-only change with no shared-DB blast radius, (b) if A's fix changes sub-agent behaviour enough to invalidate the composite signature logic, you want to discover that before mutating prod schema. Running A first is cheap insurance.
- **B → C:** Schema must land before deploy push. If deploy pushes first, every `POST /api/daily-digest` BG run fails with check-violation on upsert, leaving the cache permanently `pending:true` and masking whether A's fix actually works.
- **C admin before C portal:** Phase 3 observable changes live almost entirely in admin-portal. Admin-first proves the new contract on a single surface before the portal-side shared-package bump is introduced. Shared-package skew between admin at v2.12 and portal at v2.11 is the only realistic cross-site failure mode; the §5 item 11 diff gate in `03_deploy_refresh_path_investigation.md` catches it.
- **C → D:** Validation requires both deploys to be live. Running D before both deploys complete is meaningless.

There is no path where Phase C or D is safe without both A and B being complete first.

---

## 5. Recommended recovery sequence for the execution agent

This supersedes `00_recovery_sequence.md §6` and carries the same intent with evidence-backed specificity.

### Phase A — Fix orchestration locally

A1. Add instrumentation only. No behavioural change. In `4_development/admin-portal/lib/daily-digest-generation.ts` `callSubAgent` error path, log `{ agent, model, contentType, contentLen, reasoningLen, first200, finishReason }`. In `4_development/packages/shared/lib/openrouter.ts`, surface `finish_reason` on the response object. Do not change any defaults yet.

A2. Reproduce the degraded result locally (as on 20 Apr). Read the instrumentation. One of the three signals in `01_ai_orchestration_investigation.md §6` will dominate — that tells you which fix to apply.

A3. Apply the minimum code fix for the observed signal:
- If empty `content` + non-empty `reasoning` or `finish_reason: 'length'`: raise sub-agent `maxTokens` to at least 2000 and add `reasoning: { exclude: true }` on the OpenRouter request (H1).
- If HTTP 429 / 5xx in the thrown message: add bounded retry (2 retries, 250 ms / 750 ms) on 429/5xx, or serialise the four calls (H2).
- If `response_format` rejection or non-string content: normalise `content` (array-of-parts → joined string) in `callOpenRouter`; optionally drop `responseFormat: 'json_object'` for the Gemini route and rely on prompt-enforced JSON (H3).

A4. Harden classification: add a `category` on `SubAgentOutcome` (`rate_limit`, `empty_content`, `invalid_json`, `http_error`, `truncated`) and extend `degraded_reason` to include categories. This is a low-cost upgrade that pays for itself the next time an AI route misbehaves.

A5. Build the regression harness from `01_ai_orchestration_investigation.md §7` before redeploy. Minimum: unit tests for `parseJsonOrError` and `callSubAgent`; a mocked end-to-end test of `runDailyDigestGeneration` asserting `degraded === false` under normal conditions.

A6. Re-run locally end-to-end and confirm `degraded === false` for a representative day. Gate: do not proceed to Phase B until this passes.

### Phase B — Align the schema

B1. Restore Supabase MCP auth (`project-0-the-business-developers-supabase`). Resolve the `Unauthorized` observed this session.

B2. Confirm the active Supabase project. Read `NEXT_PUBLIC_SUPABASE_URL` from both Netlify sites' build env. If it is `https://inidzwfjnkyinxhvbrdt.supabase.co`, proceed. If not, investigate and realign before any DDL (resolves §2.2 open question 3).

B3. Run the pre-apply read-only queries from `02_schema_alignment_investigation.md §6`:
- `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.hod_analysis_cache'::regclass AND contype = 'c';`
- `SELECT period_type, COUNT(*) FROM public.hod_analysis_cache GROUP BY period_type ORDER BY period_type;`
- `SELECT COUNT(*) AS non_core_rows FROM public.hod_analysis_cache WHERE period_type NOT IN ('day','week','month');`
- `SELECT polname, pg_get_expr(polqual, polrelid) FROM pg_policy WHERE polrelid = 'public.hod_analysis_cache'::regclass;`

Quote the exact CHECK DDL into the migration's header comment.

B4. Author `4_development/portal/supabase/migrations/046_analysis_cache_period_type_expand.sql` from the SQL in `02_schema_alignment_investigation.md §6`. Do not edit `019_analysis_cache.sql`.

B5. Apply the migration via Supabase MCP `apply_migration`. Run the post-apply verification DDL read and the dry-insert / rollback smoke from `02_schema_alignment_investigation.md §6`.

B6. Record the migration in `versions/v2.12/backlog.md` Decision Log with the apply timestamp.

Gate: `daily_brief`, `weekly_brief`, `trend_alert` inserts all succeed under a rolled-back transaction before proceeding to Phase C.

### Phase C — Refresh the deploy repos (admin first, then portal)

C1. Resolve the `/logo.png` conflict in the monorepo before mirroring admin. Pick route-backed or public-file-backed, delete the other. Update `next_chat_handover.md §Known issues #12` to match whichever is chosen.

C2. Admin refresh per `03_deploy_refresh_path_investigation.md §6.2`:
- Mirror directories per §4.1.
- Run the full §5 pre-push checklist.
- Commit, push to `hod_admin_portal:dev`.
- Wait for Netlify admin dev build to succeed and confirm the new commit SHA appears in deploy metadata.

C3. Portal refresh per `03_deploy_refresh_path_investigation.md §6.3`:
- Mirror directories per §4.2 (including migrations 042–045).
- Run the full §5 pre-push checklist — especially the `diff -rq packages/shared ../hod_admin_portal/packages/shared` skew check.
- Commit, push to `hod_daily_reports:dev`.
- Wait for Netlify portal dev build to succeed.

C4. Do **not** change the `@hod/shared` `package.json` spec in this refresh. Keep whatever v2.11 shipped (`"*"`). Raise the `"*"` vs `"file:packages/shared"` question as a separate follow-up.

### Phase D — Live validation gate

D1. Verify both deploy metadata SHAs match the new `dev` HEADs.

D2. Run the ten checks in `03_deploy_refresh_path_investigation.md §7`:
- `POST /api/daily-digest` → 202
- `GET /api/daily-digest` fast, cache-only
- 600-char feedback → 400
- Daily Brief card shows Regenerate + textarea
- Background function invocation visible and completes
- Cache row carries `pipeline_version`, `sub_agent_models`, `orchestrator_model`
- `/logo.png` → 200 on both sites
- Portal booking flows still work
- Deferred Phase 2 browser smokes pass

D3. Record results in `versions/v2.12/backlog.md` Decision Log with deploy IDs. If any check fails, stop and decide between fix-forward and rollback per `03_deploy_refresh_path_investigation.md §8`.

Only after all D checks pass should Joshua's `APPROVED: phase_3_complete` token be requested and only after that should `main` promotion be considered.

---

## 6. Risks, blockers, and rollback points

### Risks

- **Orchestration fix is wrong.** Probability mitigated by instrumenting first and not changing defaults until data confirms the hypothesis. Blast radius if wrong: wasted local time only. No deploy, no schema.
- **Schema migration reveals unexpected rows.** Mitigated by pre-apply `non_core_rows` count. If rows exist with non-`day|week|month` `period_type` values, stop and re-scope; widening is still safe (superset) but rollback semantics change.
- **Shared-package skew between admin and portal.** Mitigated by the §5 item 11 diff gate and the explicit "admin first, then portal" ordering. If admin builds green but portal fails, rollback per `03_deploy_refresh_path_investigation.md §8.2`.
- **Logo 500 regression.** Mitigated by resolving the conflict in the monorepo before mirror. Explicitly checked in D2.
- **Background-function auth.** Internal token resolves to `SUPABASE_SERVICE_ROLE_KEY` if no explicit `INTERNAL_ROUTE_TOKEN` is set. Both sites already expose the service-role key, so no new secret is required.

### Blockers that must be cleared before Phase A work starts

- Supabase MCP auth restored (needed for Phase B pre-checks; nice-to-have for Phase A confirmation on cache behaviour).
- Clear decision on `/logo.png` source of truth (needed before Phase C admin mirror).
- Confirmed active Supabase project identity (needed before Phase B apply).

### Rollback points

| After | Rollback surface | Rollback action |
|---|---|---|
| Phase A | Local git working tree only | `git restore` the touched files. No other state changed. |
| Phase B | Live `hod_analysis_cache` constraint | Apply the rollback SQL in `02_schema_alignment_investigation.md §7.2`. Includes refuse-if-widened-rows guard. |
| Phase C admin only | `hod_admin_portal:dev` branch | `git reset --hard fac6542 && git push --force-with-lease origin dev`. Do not start portal refresh. |
| Phase C both | Both deploy `dev` branches | `git reset --hard` to v2.11 commits on both, force-push with lease. Re-publish previous successful Netlify `dev` builds via UI as belt-and-braces. |
| Phase D failure | Same as Phase C both | Same as above. |

Production `main` is never touched by any of this work.

---

## 7. Minimum safe starting point for the implementation agent

Start with Phase A step A1 only. Specifically:

1. Read `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/01_ai_orchestration_investigation.md` in full.
2. In `4_development/admin-portal/lib/daily-digest-generation.ts` `callSubAgent`, add `console.error` logging on the error path capturing: `agent`, `model`, `contentType` (`typeof result.content`), `contentLen`, `reasoningLen`, `first200`, `finishReason`. Do not change `maxTokens`, `responseFormat`, or any other default.
3. In `4_development/packages/shared/lib/openrouter.ts`, extend `OpenRouterResponse` with `finishReason?: string` and populate it from `data.choices?.[0]?.finish_reason`. No behaviour change.
4. Run `npx tsc --noEmit` on both touched projects. Must be clean.
5. Reproduce the degraded path locally against real data, capture the log, and report back. The instrumentation alone is the first deliverable — nothing else is changed until the log confirms which hypothesis is correct.

This is the smallest possible starting commit. It introduces zero risk, produces decisive evidence, and keeps every later phase honest.

---

## 8. Files created in `phase_two/` by this investigation set

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/00_recovery_sequence.md` (pre-existing, unchanged)
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/01_ai_orchestration_investigation.md` (new)
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/02_schema_alignment_investigation.md` (new)
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/03_deploy_refresh_path_investigation.md` (new)
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/04_master_synthesis.md` (this file, new)

No code, schema, or deploys were changed by any of the above.

---

*End of synthesis. Investigation only. No chain-of-thought. Evidence, findings, and recommendations.*
