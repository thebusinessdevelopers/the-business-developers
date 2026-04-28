# Phase 3 — AI Infrastructure Checklist

> Original order was D-01 → D-03 background function → D-02 pipeline → D-04 feedback. Phase E superseded the background-function implementation on 26 Apr 2026. Current Daily Brief architecture is direct synchronous `POST /api/daily-digest` regeneration; see `../../phase_2_recovery_release/phase_e_delivery.md`.

## 3.1 — D-01 OpenRouter model upgrade and env plumbing

- [x] 1. In shared `openrouter.ts`, replace the hard-coded `MODEL` with `process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4.5'`.
- [x] 2. Export `OPENROUTER_MODEL_FAST = process.env.OPENROUTER_MODEL_FAST ?? 'google/gemini-2.5-flash'`.
- [x] 3. Create `admin-portal/.env.example` documenting both variables.
- [x] 4. Optional: add a `[build.environment]` block in `admin-portal/netlify.toml` with the same defaults.
- [ ] 5. Deploy preview with `OPENROUTER_MODEL` unset — requests resolve to Sonnet 4.5. (Deferred: post-deploy smoke.)
- [ ] 6. Override `OPENROUTER_MODEL` — requests resolve to the override; `model_used` reflects it. (Deferred: post-deploy smoke.)
- [ ] 7. Smoke one admin AI route and the portal submit-report urgency classifier. (Deferred: post-deploy smoke.)

## 3.2 — D-03 Direct Daily Brief POST regeneration

- [x] 8. Original: add `@netlify/functions` for the background-function experiment. Superseded by Phase E when the background function was removed.
- [x] 9. Original: add `daily-digest-background.ts`. Superseded by Phase E; the file was deleted from the deploy repo and monorepo mirror.
- [x] 10. Refactor `daily-digest/handler.ts`: `GET` remains cache-read-only (fresh, stale, pending); `POST` performs `verifyAdminAuth`, calls `runDailyDigestGeneration()` directly with `force: true` and optional `feedback`, and returns the generated payload.
- [x] 11. Re-export `POST` alongside `GET` in `daily-digest/route.ts`.
- [x] 12. Background-function Netlify configuration no longer required after Phase E.
- [x] 13. In `DailyDigestCard.tsx`, await the direct `POST` response and update state from the returned payload; normal 5-minute refresh remains.
- [x] 14. Switch the weekly-brief route (`analysis/weekly-brief/route.ts`) to signature-based cache reads for parity with daily.
- [x] 15. Extend `analysis-reliability.ts` with the weekly signature helper if required. (Reused `buildReportSignature` — no new helper needed.)
- [x] 16. Phase E validation complete for the Daily Brief path: tests, typecheck, build, live auth-gated POST, and Supabase `daily_brief` cache row verified. See `../../phase_2_recovery_release/phase_e_delivery.md`.

## 3.3 — D-02 Multi-agent daily-brief pipeline

- [x] 17. In the generation body now callable from the direct API route, add the second `bookings` overlap query for `briefDate + 1` to support Occupancy.
- [x] 18. Add the Stock data queries: `hod_verified_stock`, `hod_stock_flags`, and deterministic extractors across `report_data` (7-day trailing window).
- [x] 19. Expand the Action-items select to join `hod_departments` and include title/description/assignee/`updated_at` per the D-02 schema.
- [x] 20. Build four `callOpenRouter` calls for Occupancy / Stock / Compliance / Action items using `OPENROUTER_MODEL_FAST`, run via `Promise.allSettled`.
- [x] 21. On per-sub-agent failure, substitute an empty / error-tagged JSON stub and set `degraded: true` (parity with existing degraded path).
- [x] 22. Build the orchestrator call with `OPENROUTER_MODEL`, inheriting the existing daily-digest system prompt verbatim and passing the four JSON blobs plus the header context.
- [x] 23. Add the optional fifth **RISKS AHEAD** section when sub-agent JSON exposes predictive/next-day signals.
- [x] 24. Extend `buildReportSignature` in `analysis-reliability.ts` to `signature_reports + '|' + hash(normalised JSON of all four sub-agent inputs)`; keep the upsert shape unchanged. (Composite signature built inside the generation module using `stableStringify` + SHA-256 — no change to the shared helper signature.)
- [x] 25. Add `pipeline_version`, `sub_agent_models`, and `orchestrator_model` inside `analysis_data` on upsert.
- [x] 26. Daily Brief generation validated in Phase E with a fresh `hod_analysis_cache` row containing `pipeline_version`, model metadata, digest sections, report counts, and no `degraded` key.

## 3.4 — D-04 Feedback prompt injection and UI textareas

- [x] 27. In `analysis/generate/handler.ts` (~line 310), parse `feedback` from the body, validate (`typeof === 'string'`, trim, reject with 400 when trimmed length > 500), and prepend the `[USER INSTRUCTION] … [/USER INSTRUCTION]` block.
- [x] 28. Same injection in the direct Daily Brief generation path — only when `feedback` is present on the `POST` / regenerate body. (Validated in POST; injected inside the generation module's orchestrator user content.)
- [x] 29. Same injection in `analysis/weekly-brief/route.ts` (~line 195).
- [x] 30. Audit `console.error` call-sites in all three handlers; confirm no body or raw `feedback` is logged.
- [x] 31. In `AnalysisPanel.tsx`, add a `<textarea maxLength={500}>` beside the existing Regenerate controls; thread `feedback` into the `/api/analysis/generate` fetch body (both primary button and cached Regenerate link).
- [x] 32. In `DailyDigestCard.tsx`, add Regenerate control + feedback textarea that `POST`s `{ force: true, feedback }` to `/api/daily-digest` (merging with 3.2's kick-off).
- [x] 33. Confirm `hod_analysis_cache` upserts (3 call-sites in the three routes) never include a `feedback` field.
- [ ] 34. End-to-end feedback steering still needs an authenticated browser smoke before final release recommendation.

## Phase 3 closure

- [x] 35. Local build passes across `admin-portal/`, `portal/`, and `packages/shared/`.
- [x] 36. End-to-end Daily Brief smoke for the current path (`POST` → direct generation → cache → UI render) with `pipeline_version` / `sub_agent_models` / `orchestrator_model` present.
- [ ] 37. End-to-end period analysis and weekly brief Regenerate with feedback produce steered outputs. (Deferred: post-deploy smoke.)
- [ ] 38. Deliberate sub-agent failure drill — degraded brief surfaces, `degraded: true` carried through. (Deferred: post-deploy smoke.)
- [x] 39. Update `progress/README.md` statuses to `Completed`.
- [x] 40. Record commit SHAs, Netlify deploy IDs, and sample brief outputs in `backlog.md` Decision Log. (Phase E delivery and backlog updated.)
- [ ] 41. Request `APPROVED: phase_3_complete` from Joshua to close v2.12.
