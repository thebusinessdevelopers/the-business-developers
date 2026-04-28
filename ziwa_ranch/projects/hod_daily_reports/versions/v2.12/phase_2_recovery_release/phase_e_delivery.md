# Phase E Delivery - Daily Brief Regeneration Recovery

STATUS: complete
Date: 2026-04-26
Phase boundary outcome: **Daily Brief regeneration is working on the admin `dev` branch. The Netlify Background Function path was removed and replaced with direct synchronous API generation. A fresh `daily_brief` cache row exists with the expected v2.12 payload shape.**

---

## 1. Starting point

Phase D2 ended with the admin API successfully reaching `daily-digest-background`, but the background function never wrote a `daily_brief` row to `hod_analysis_cache`.

Known failure before Phase E:

- `POST /api/daily-digest` returned `202 { accepted: true }`.
- `daily-digest-background` accepted invocation on the dev alias.
- No `hod_analysis_cache` row appeared for `period_type = 'daily_brief'`.
- D3 failed; D4-D6 were not run.

Primary source documents:

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_d2_delivery.md`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_e_bg_debug_prompt.md`

---

## 2. Investigation summary

The original Phase E brief correctly identified the background function as the live blocker. During debugging, the evidence showed that the generation body itself could work, but the Netlify Background Function packaging and branch-alias deployment path created avoidable complexity:

- The function moved through several attempted forms (`.ts`, `.mts`, `.mjs`) to resolve Netlify runtime and bundling behaviour.
- Netlify CLI alias deploys produced confusing results where immutable deploy URLs could serve newer code while `dev--hod-admin-portal.netlify.app` continued to serve older server-handler logic.
- Local and deploy-level evidence showed the simpler path was to remove the background-function queue entirely and run generation directly from the authenticated API route.

Joshua requested simplification. The selected recovery path was:

> Option 2 - remove `daily-digest-background` and have `/api/daily-digest` call `runDailyDigestGeneration()` directly.

This keeps the code path inside the Next.js server handler already used by the admin app and removes the separate Netlify Background Function deployment surface.

---

## 3. Final code changes

Admin deploy repo:

- `/Users/joshuaroy/hod_admin_portal/app/api/daily-digest/handler.ts`
- `/Users/joshuaroy/hod_admin_portal/app/api/daily-digest/route.ts`
- `/Users/joshuaroy/hod_admin_portal/components/DailyDigestCard.tsx`
- `/Users/joshuaroy/hod_admin_portal/lib/daily-digest-generation.ts`
- `/Users/joshuaroy/hod_admin_portal/netlify/functions/daily-digest-background.ts` deleted
- `/Users/joshuaroy/hod_admin_portal/netlify/functions/_internal-auth.ts` deleted
- `/Users/joshuaroy/hod_admin_portal/__tests__/daily-digest-api-origin.test.mjs`

Monorepo mirror:

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/daily-digest/handler.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/daily-digest/route.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/components/DailyDigestCard.tsx`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/daily-digest-generation.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/netlify/functions/daily-digest-background.ts` deleted
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/netlify/functions/_internal-auth.ts` deleted
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/__tests__/daily-digest-api-origin.test.mjs`

Behavioural changes:

- `POST /api/daily-digest` now validates admin auth and optional feedback, then calls `runDailyDigestGeneration({ supabase, briefDate, force, feedback })` directly.
- The API response now returns the generated digest payload with `status`, `generated_at`, `cached`, and `brief_date`, instead of returning only `{ accepted: true }`.
- `DailyDigestCard` consumes the returned payload and updates the UI immediately after regeneration.
- `route.ts` exports both `GET` and `POST`, so the POST handler is reachable.
- The Netlify background function and its internal auth helper are removed.
- Temporary debug instrumentation was removed after successful verification.

---

## 4. Deploy record

Admin repo branch: `dev`

| Commit | Purpose | Netlify deploy | State |
|---|---|---|---|
| `ba4c701` | Replace background enqueue with direct API regeneration | `69eda6ebc0a9040008b83d38` | ready |
| `0dc8936` | Temporary browser-side response instrumentation | `69edac1d2dec54000842556c` | ready |
| `bd074be` | Remove temporary debug logging | `69edafdc782afa0008ec7a28` | ready |
| `3d847d4` | Rename regression test to ESM to satisfy lint rules | `69edb0fe5349f20008c66a72` | ready |
| `667fbb1` | Fail regeneration on Supabase cache write errors; wire regression into `npm test` | `69edb406f7116b00080efc1d` | ready |

Latest clean runtime evidence before this document:

- `667fbb1` deploy `69edb406f7116b00080efc1d` was `ready`.
- Unauthenticated `POST https://dev--hod-admin-portal.netlify.app/api/daily-digest` returned `401`, confirming the live route is active and auth-gated.
- Netlify available functions listed only `___netlify-server-handler`; `daily-digest-background` is absent.

---

## 5. Database verification

Supabase project: `inidzwfjnkyinxhvbrdt`

Latest `daily_brief` row:

```text
period_type: daily_brief
period_key: 2026-04-25
generated_at: 2026-04-26 09:13:32.431+03
model_used: anthropic/claude-sonnet-4.5
pipeline_version: v2.12-multi-agent
digest_chars: 2937
report_count: 7
total_departments: 16
missing_departments: array
degraded key present: false
```

Payload keys present:

```text
digest
missing_departments
notes_count
orchestrator_model
pipeline_version
report_count
signature
sub_agent_models
total_departments
```

Report count cross-check:

```text
report_date: 2026-04-25
submitted_reports: 7
distinct_departments: 7
```

This matches the dashboard text reported by Joshua: `7/16 reported`, updated around `09:13`.

---

## 6. Verification gates

Commands run from `/Users/joshuaroy/hod_admin_portal` unless noted:

| Check | Result |
|---|---|
| `npm test` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| `npm run lint` | FAIL only on pre-existing baseline shared-package issues after new test was converted to ESM |
| Live unauthenticated `POST /api/daily-digest` | 401 auth-gated |
| Supabase latest `daily_brief` row shape | PASS |

Commands also run from the monorepo mirror at `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal`:

| Check | Result |
|---|---|
| `npm test` | PASS |
| `npx tsc --noEmit` | PASS |

Known lint baseline still present in the deploy repo:

- `packages/shared/components/AccommodationCalendar.tsx` - `react-hooks/set-state-in-effect`
- `packages/shared/components/AutocompleteInput.tsx` - `react-hooks/set-state-in-effect`
- `packages/shared/lib/harvest-items.ts` - `@typescript-eslint/no-explicit-any`
- 14 warnings in unrelated files

These are not introduced by Phase E and should be handled as a separate cleanup track if the release gate requires full `eslint` green.

Additional review hardening:

- Code review found that Supabase upsert failures could still be ignored because Supabase returns `{ error }` rather than throwing.
- Commit `667fbb1` now throws on `hod_analysis_cache` upsert errors, so `POST /api/daily-digest` cannot return success if the `daily_brief` row was not written.
- The regression test asserts this cache-write failure path is present.
- `package.json` now runs the ESM regression through `npm test`.

---

## 7. Phase D gate reinterpretation

The original D3 gate expected:

`POST /api/daily-digest` -> background function -> `daily_brief` cache row.

The production path is now:

`POST /api/daily-digest` -> direct `runDailyDigestGeneration()` -> `daily_brief` cache row.

Therefore:

- D3 is **PASS by replacement architecture**: cache persistence is verified and the removed background function is no longer part of the production contract.
- D4 is **PASS by user-observed dashboard run**: Joshua reported the Daily Brief updated to a fresh v2.12 brief at `09:13`.
- D7 cleanup is **COMPLETE** for instrumentation: temporary local debug logging was removed from both deploy and monorepo source.
- D5-D6 were not exhaustively re-run in this Phase E pass and remain separate broader smoke coverage if the release recommendation requires a full Phase D matrix.

---

## 8. Production-readiness verdict

For the Daily Brief regeneration blocker:

**Ready on admin `dev`.**

The blocker is resolved by removing the fragile background-function queue and using the direct API route. Backend evidence confirms the route is active, auth-gated, deployed from Git, writes the expected v2.12 cache shape, and the dashboard displays the regenerated brief.

For full v2.12 release:

**Do not promote to `main` until Joshua gives the explicit approval token required by the release process.**

Recommended next step:

1. Optionally run the broader D5-D6 smoke checks if the release recommendation agent needs a complete Phase D matrix.
2. Produce the final release recommendation from `phase_release_recommendation_prompt.md`.

---

## 9. Handover for future agents

Do not resurrect `daily-digest-background` unless there is a new product requirement for asynchronous generation. The simplest working architecture is now the direct API call.

If Daily Brief fails again, start with:

1. `GET /api/daily-digest` result shape and freshness.
2. Authenticated `POST /api/daily-digest` status and response payload.
3. Latest `hod_analysis_cache` row for `period_type = 'daily_brief'`.
4. `runDailyDigestGeneration()` inputs and OpenRouter/Supabase env availability.

Avoid spending time on Netlify Background Function invocation mode, background function auth, or separate function bundling unless the background function is intentionally reintroduced.
