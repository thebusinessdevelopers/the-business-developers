# 03 — Deploy Refresh Path Investigation

STATUS: awaiting-approval
Date: 2026-04-22
Scope: v2.12 Phase 3 — dev preview refresh for both Netlify sites
Mode: investigation only; no code, schema, deploy, or git state changes

---

## 1. Summary

- The `dev--` aliases are stale because both deploy repos' `dev` branches are still parked at the v2.11 release commits and the v2.12 source in the monorepo has never been copied across. The v2.12 work also lives in the monorepo working tree only — `4_development/` is not git-tracked inside the monorepo, so there is no branch-to-branch promotion path, only a manual file mirror.
- Deploy order should be **admin first, then portal**. Phase 3 scope (multi-agent daily-brief, background function, feedback textarea, `POST /api/daily-digest`) is almost entirely in the admin site, and the portal shares only `packages/shared/`. Getting admin green first lets us verify the new contract before introducing the parallel portal shared-package bump.
- The shared package (`packages/shared/`) is the primary skew risk. It must be byte-identical in both deploy repos at the end of the refresh, and any rollback of one deploy must be matched by the other.
- The fastest pre-push signal is `npx tsc --noEmit`, `npm run lint`, and `npm run build` run inside each deploy repo after the mirror but before `git push`. Together they catch every class of failure Netlify's build would surface.
- Live validation after the push must confirm (a) new commit SHA on both `dev--` aliases, (b) `POST /api/daily-digest` returns **202**, (c) `GET /api/daily-digest` is cache-only and fast (< 2 s), (d) oversized feedback → **400**, (e) Daily Brief card shows **Regenerate**, (f) no `/logo.png` 500.

---

## 2. Deployment topology confirmation

Confirmed from working-tree evidence:

| Repo | Local path | Remote | Current `dev` HEAD | Current `main` HEAD |
|---|---|---|---|---|
| Monorepo | `/Users/joshuaroy/the-business-developers` | `thebusinessdevelopers/the-business-developers` | `b507b6e` (docs up to v2.6) | — |
| Portal deploy | `/Users/joshuaroy/hod_daily_reports` | `thebusinessdevelopers/hod_daily_reports` | `bda114e` (v2.11 BUX-01) | `bda114e` |
| Admin deploy | `/Users/joshuaroy/hod_admin_portal` | `thebusinessdevelopers/hod_admin_portal` | `fac6542` (v2.11 BookingForm restore) | `fac6542` |

Evidence:

- `git -C ~/hod_daily_reports log dev --oneline -n 5` → top commit `bda114e feat(calendar): add sky-blue tint ...`.
- `git -C ~/hod_admin_portal log dev --oneline -n 5` → top commit `fac6542 fix(booking): restore BookingForm.tsx ...`.
- Both deploy repos' `dev` and `main` pointers are identical (promotion happened at v2.11 and no new branch work has followed).

Monorepo source of truth for v2.12 lives under:

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/`

Crucially, `git -C ~/the-business-developers ls-files --error-unmatch ziwa_ranch/projects/hod_daily_reports/4_development/...` returns `did not match any file(s) known to git`. The `4_development/` tree is **untracked** in the monorepo; every file listed in the initial `git status` for that path is `??` (untracked). This confirms the refresh path is a manual file mirror, not a branch merge.

---

## 3. Current staleness evidence

Netlify metadata (from the 20 Apr 2026 test report):

- `dev--hod-admin-portal.netlify.app` last built 2026-04-13 from commit `fac6542…`.
- `dev--hoddailyreports.netlify.app` last built 2026-04-13 from commit `bda114e…`.

Local diffs between the monorepo v2.12 source and the current deploy-repo HEADs:

### 3.1 Admin portal

Files only in monorepo (new in v2.12):

- `admin-portal/.env.example`
- `admin-portal/app/logo.png/` (contains `route.ts`) — but see §9 gotcha
- `admin-portal/lib/daily-digest-generation.ts`
- `admin-portal/netlify/functions/daily-digest-background.ts`
- `admin-portal/netlify/functions/_internal-auth.ts`

Files modified in v2.12 vs v2.11 deploy:

- `admin-portal/netlify.toml` (adds `[build.environment]` with `OPENROUTER_MODEL`, `OPENROUTER_MODEL_FAST`)
- `admin-portal/package.json` (adds `@netlify/functions ^2.8.2` devDep)
- `admin-portal/package-lock.json`
- `admin-portal/app/accommodation/AccommodationClient.tsx`
- `admin-portal/app/accommodation/BookingForm.tsx`
- `admin-portal/app/analysis/AnalysisPanel.tsx`
- `admin-portal/app/api/accommodation/bookings/[id]/route.ts`
- `admin-portal/app/api/accommodation/bookings/route.ts`
- `admin-portal/app/api/analysis/generate/handler.ts`
- `admin-portal/app/api/analysis/weekly-brief/route.ts`
- `admin-portal/app/api/daily-digest/handler.ts`
- `admin-portal/app/api/daily-digest/route.ts`
- `admin-portal/app/meetings/MeetingDetailView.tsx`
- `admin-portal/app/meetings/MeetingForm.tsx`
- `admin-portal/components/DailyDigestCard.tsx`

### 3.2 Portal

Files modified in v2.12 vs v2.11 deploy:

- `portal/app/api/accommodation/bookings/[id]/route.ts`
- `portal/app/api/accommodation/bookings/approve/route.ts`
- `portal/app/api/accommodation/bookings/route.ts`
- `portal/app/api/accommodation/change-requests/route.ts`
- `portal/app/api/accommodation/route.ts`
- `portal/app/api/submit-report/route.ts`
- `portal/app/report/[slug]/BookingManagerModal.tsx`
- `portal/app/report/[slug]/RoomsTab.tsx`
- `portal/components/FormRenderer.tsx`
- `portal/hooks/useSubmissionQueue.ts`
- `portal/next-env.d.ts`
- `portal/package-lock.json`

New migrations only in monorepo (v2.12 additions, need to travel with the portal mirror because `supabase/migrations/` lives under `portal/`):

- `042_v212_augustu.sql`
- `043_v212_chalet_pax.sql`
- `044_v212_a06_rate_corrections.sql`
- `045_v212_aframe_rename.sql`

### 3.3 Shared package

`packages/shared/` diffs (identical delta in both deploy repos):

- `components/AccommodationCalendar.tsx`
- `config/accommodation.ts`
- `config/meetings.ts`
- `lib/accommodation-guards.ts`
- `lib/openrouter.ts` (env-driven `OPENROUTER_MODEL` + `OPENROUTER_MODEL_FAST`)
- `types/index.ts`

Runtime confirmation of staleness (from `20_04_test.md`):

- Live admin `POST /api/daily-digest` → **405** (route not present on the v2.11 deploy).
- Live admin `GET /api/daily-digest` → **200** in ~8.5 s (old synchronous path).
- 600-char `feedback` on `POST /api/analysis/generate` → **200** (old pre-D-04 route).

Root cause, confirmed: there is no automation between monorepo working-tree v2.12 and the two deploy repos. The mirror step specified in `00_recovery_sequence.md §4 Phase C` has not been executed.

---

## 4. Monorepo → deploy repo mirror mapping

All paths below are absolute. "Source" is always in the monorepo working tree. "Destination" is always the deploy-repo root for that site.

### 4.1 Admin portal — source → destination

| Source (monorepo) | Destination (`hod_admin_portal` root) |
|---|---|
| `.../4_development/admin-portal/app/` | `/Users/joshuaroy/hod_admin_portal/app/` |
| `.../4_development/admin-portal/components/` | `/Users/joshuaroy/hod_admin_portal/components/` |
| `.../4_development/admin-portal/config/` | `/Users/joshuaroy/hod_admin_portal/config/` |
| `.../4_development/admin-portal/hooks/` | `/Users/joshuaroy/hod_admin_portal/hooks/` |
| `.../4_development/admin-portal/lib/` | `/Users/joshuaroy/hod_admin_portal/lib/` |
| `.../4_development/admin-portal/types/` | `/Users/joshuaroy/hod_admin_portal/types/` |
| `.../4_development/admin-portal/public/` | `/Users/joshuaroy/hod_admin_portal/public/` |
| `.../4_development/admin-portal/netlify/functions/` | `/Users/joshuaroy/hod_admin_portal/netlify/functions/` |
| `.../4_development/admin-portal/middleware.ts` (if present) | `/Users/joshuaroy/hod_admin_portal/middleware.ts` |
| `.../4_development/admin-portal/netlify.toml` | `/Users/joshuaroy/hod_admin_portal/netlify.toml` |
| `.../4_development/admin-portal/next.config.ts` | `/Users/joshuaroy/hod_admin_portal/next.config.ts` |
| `.../4_development/admin-portal/tsconfig.json` | `/Users/joshuaroy/hod_admin_portal/tsconfig.json` |
| `.../4_development/admin-portal/postcss.config.mjs` | `/Users/joshuaroy/hod_admin_portal/postcss.config.mjs` |
| `.../4_development/admin-portal/eslint.config.mjs` | `/Users/joshuaroy/hod_admin_portal/eslint.config.mjs` |
| `.../4_development/admin-portal/package.json` | `/Users/joshuaroy/hod_admin_portal/package.json` |
| `.../4_development/admin-portal/.env.example` | `/Users/joshuaroy/hod_admin_portal/.env.example` |
| `.../4_development/packages/shared/` | `/Users/joshuaroy/hod_admin_portal/packages/shared/` |

### 4.2 Portal — source → destination

| Source (monorepo) | Destination (`hod_daily_reports` root) |
|---|---|
| `.../4_development/portal/app/` | `/Users/joshuaroy/hod_daily_reports/app/` |
| `.../4_development/portal/components/` | `/Users/joshuaroy/hod_daily_reports/components/` |
| `.../4_development/portal/config/` | `/Users/joshuaroy/hod_daily_reports/config/` |
| `.../4_development/portal/hooks/` | `/Users/joshuaroy/hod_daily_reports/hooks/` |
| `.../4_development/portal/lib/` | `/Users/joshuaroy/hod_daily_reports/lib/` |
| `.../4_development/portal/types/` | `/Users/joshuaroy/hod_daily_reports/types/` |
| `.../4_development/portal/public/` | `/Users/joshuaroy/hod_daily_reports/public/` |
| `.../4_development/portal/middleware.ts` | `/Users/joshuaroy/hod_daily_reports/middleware.ts` |
| `.../4_development/portal/supabase/` (including `migrations/`) | `/Users/joshuaroy/hod_daily_reports/supabase/` |
| `.../4_development/portal/netlify.toml` | `/Users/joshuaroy/hod_daily_reports/netlify.toml` |
| `.../4_development/portal/next.config.ts` | `/Users/joshuaroy/hod_daily_reports/next.config.ts` |
| `.../4_development/portal/tsconfig.json` | `/Users/joshuaroy/hod_daily_reports/tsconfig.json` |
| `.../4_development/portal/postcss.config.mjs` | `/Users/joshuaroy/hod_daily_reports/postcss.config.mjs` |
| `.../4_development/portal/eslint.config.mjs` | `/Users/joshuaroy/hod_daily_reports/eslint.config.mjs` |
| `.../4_development/portal/package.json` | `/Users/joshuaroy/hod_daily_reports/package.json` |
| `.../4_development/packages/shared/` | `/Users/joshuaroy/hod_daily_reports/packages/shared/` |

### 4.3 Files and folders that MUST NOT be mirrored

- `.../4_development/package.json` — the monorepo workspace root. Deploy repos are not workspaces.
- `.../4_development/package-lock.json` — the monorepo root lockfile. Each deploy repo keeps its own lockfile.
- `.../4_development/node_modules/` and any nested `node_modules/`.
- Any `.next/`, `.netlify/`, `.turbo/`, `.cache/` build output.
- Any `.git/` folder.
- `.../4_development/scripts/` (monorepo tooling — does not belong in deploy repos).
- `.../4_development/deno.lock`.
- `.../4_development/ziwa_ranch/` (prior-version snapshot folder nested inside `4_development/` — not application code).
- Any per-checkout `tsconfig.tsbuildinfo`.
- Any `.env`, `.env.local`, `.env.production` — only `.env.example` may cross. Live secrets stay in Netlify UI.

### 4.4 Shared-package parity

`packages/shared/` in the two deploy repos MUST be byte-identical after the refresh. Drift is a latent bug that surfaces only when one portal calls a shared function the other has not been updated with. Safe pattern: copy the same `packages/shared/` tree into both deploy repos in the same pass, then diff `admin/packages/shared` against `portal/packages/shared` before either push.

---

## 5. Pre-push validation checklist per deploy repo

Run these from the deploy-repo root **after** the mirror, **before** `git add` / `git push`.

1. `git status` — review file list. Nothing outside §4 should appear. No `.env`, no `node_modules`, no build artefacts, no Mac metadata files.
2. `rm -rf node_modules && npm install` — confirm a clean install resolves. For the admin deploy, confirm `@netlify/functions` is installed.
3. `npx tsc --noEmit` — must be `0 errors`. The Netlify build does a full `tsc` check even if local Turbopack skips it (see §9).
4. `npm run lint` — must be `0 errors`. Warnings acceptable only if they match the pre-existing baseline recorded in `next_chat_handover.md` (admin: 0 err / 12–13 warn; portal: 0 err / 3–4 warn).
5. `npm run build` — must complete. For admin, confirm `/api/daily-digest` appears as a dynamic route in the build summary (proof that the new `POST` handler compiles).
6. `grep "\"@hod/shared\"" package.json` — confirm the repo keeps whatever spec v2.11 used. Currently both deploy repos ship `"@hod/shared": "*"`. Do not change it in this refresh; v2.11 production proves this works. **Open question:** `next_chat_handover.md §Deploy repos` says the spec should be `"file:packages/shared"`. Flag to synthesis agent.
7. `test -f .env.example` (admin only).
8. `grep "@netlify/functions" package.json` (admin only).
9. `grep "OPENROUTER_MODEL" netlify.toml` (admin only) — confirm `[build.environment]` block present.
10. `ls netlify/functions/daily-digest-background.ts netlify/functions/_internal-auth.ts` (admin only).
11. `diff -rq packages/shared ../<sibling-deploy>/packages/shared` — must print nothing. Shared-code skew check.
12. For the **portal** only: `ls supabase/migrations/042_v212_augustu.sql supabase/migrations/043_v212_chalet_pax.sql supabase/migrations/044_v212_a06_rate_corrections.sql supabase/migrations/045_v212_aframe_rename.sql`.

Only proceed to `git add -A && git commit -m "v2.12 dev mirror" && git push origin dev` after all twelve pass.

---

## 6. Step-by-step refresh sequence

Recommendation: **admin first, then portal.** Every Phase 3 observable behaviour change lives in the admin portal; the portal site's v2.12 changes are lower-risk accommodation and submit-report polish. Pushing admin first lets validation run on a single surface. If admin fails, portal dev is undisturbed.

### 6.1 Preconditions

Do not execute this sequence until `00_recovery_sequence.md §4` Phase A (orchestration bug fixed locally) and Phase B (schema aligned so `hod_analysis_cache` accepts `daily_brief` / `weekly_brief` / `trend_alert`) are complete. Redeploying known-bad orchestration or against a schema that rejects Phase 3 writes burns QA time.

### 6.2 Admin refresh

1. `cd ~/hod_admin_portal`
2. `git fetch origin && git checkout dev && git pull --ff-only`
3. Mirror per §4.1. Dry-run first:
   `rsync -a --delete --dry-run --exclude=.git --exclude=node_modules --exclude=.next --exclude=.netlify --exclude=tsconfig.tsbuildinfo <source>/ <dest>/`
   then the same command without `--dry-run`. Perform it per top-level directory listed in §4.1 so delete semantics are scoped.
4. Replace `packages/shared/` cleanly so stale files cannot linger:
   `rm -rf packages/shared && mkdir -p packages && rsync -a --exclude=node_modules <monorepo>/packages/shared/ packages/shared/`
5. Run the full §5 checklist. Stop on any fail, fix at source in the monorepo, re-mirror.
6. `git add -A`
7. `git status` — human-read the file list again.
8. `git commit -m "v2.12 Phase 3: mirror from monorepo"`
9. `git push origin dev`
10. Watch the admin Netlify dev build. On failure, capture the log, `git reset --hard origin/dev~1`, and do not push the portal.

### 6.3 Portal refresh

11. Only after admin's Netlify dev build succeeds and deploy metadata shows the new SHA:
12. `cd ~/hod_daily_reports`
13. Repeat steps 6.2.2–6.2.10 with portal paths from §4.2, including the four new migrations.
14. Confirm the `packages/shared/` content pushed to portal is **identical** to what was pushed to admin (§5 item 11).

### 6.4 Abort / resume

- On §5 failure, fix in the monorepo, re-mirror, re-run §5. Do not skip any step.
- If admin pushes successfully but the Netlify build fails, do not proceed to portal. The portal site depends on the same `packages/shared/` — if it failed on admin, it will fail on portal.

---

## 7. Post-deploy validation gate

All must pass against the newly built `dev--` aliases.

1. Netlify admin site shows a new deploy built from a commit SHA equal to the new admin `dev` HEAD. Same for the portal site.
2. Admin `POST /api/daily-digest` returns **202** with JSON `{ accepted: true, brief_date }` in under 2 seconds.
3. Admin `GET /api/daily-digest` returns `{ pending: true }`, `{ stale: true, ... }`, or the cached digest in well under 2 seconds. The ~8.5 s pre-refresh path must be gone.
4. Admin `POST /api/analysis/generate` with `feedback: 'x'.repeat(600)` → **400**. With `feedback: 'focus on kitchen'` → **200**.
5. Daily Brief card on the admin overview shows a **Regenerate** control in the header. Expanding it reveals a `maxLength={500}` textarea + **Start regeneration** button. Clicking flips the card into pending, then to a fresh digest within a few minutes.
6. Supabase row for `period_type='daily_brief'` after a regeneration carries `analysis_data.pipeline_version = 'v2.12-multi-agent'`, `sub_agent_models = ['google/gemini-2.5-flash']`, `orchestrator_model = 'anthropic/claude-sonnet-4.5'`. Prerequisite: Phase B schema migration applied.
7. Netlify Functions UI shows a `daily-digest-background` invocation completing. No 5xx.
8. `/logo.png` returns 200 on both sites. No 500, no 404.
9. Portal booking flows still work (BookingManagerModal loads, RoomsTab reads). No regression vs v2.11.
10. Deferred Phase 2 browser smokes from `20_04_test.md §12 (5)` are now executable and pass.

---

## 8. Rollback strategy

### 8.1 Admin pushes, admin Netlify build fails

- Production unaffected (no `main` promotion done).
- Either fix forward with another commit, or `git reset --hard <previous-dev-sha>` locally and `git push --force-with-lease origin dev`. Force-with-lease on `dev` is acceptable; never force-push `main`.
- Do not touch portal yet.

### 8.2 Admin succeeds, portal fails

- This is the shared-code-skew risk. Two safe options:
  - **Preferred:** fix-forward on the portal — diagnose, re-mirror what is needed, push a new portal commit.
  - **Safe revert:** if fix-forward is slow, revert admin back to `fac6542` with `git reset --hard fac6542 && git push --force-with-lease origin dev`. This re-aligns both deploys at the v2.11 `packages/shared/`.
- Do **not** leave admin on v2.12 `packages/shared` while portal stays on v2.11 `packages/shared`.

### 8.3 Both succeed but live validation fails

- Revert both `dev` branches to their v2.11 HEADs (`fac6542` admin, `bda114e` portal) with `git push --force-with-lease`.
- Re-publish the previous successful Netlify `dev` deploys via the Netlify UI as a belt-and-braces measure.
- Root-cause before retrying.

### 8.4 Production impact

None. `main` is untouched throughout.

---

## 9. Known gotchas from prior releases

1. **`/logo.png` route vs public-file conflict.** Monorepo admin-portal has both `admin-portal/app/logo.png/route.ts` and `admin-portal/public/logo.png`. v2.11 snapshot records deletion of `app/logo.png/route.ts` from the admin deploy to fix a 500 at `/logo.png`. `20_04_test.md` REL-005 reproduces the 500 on local `next dev`. Portal monorepo has only `app/logo.png/route.ts` (no `public/logo.png`), so that side is safe. **Action before mirroring admin:** decide route-backed or public-file-backed (not both). `next_chat_handover.md §Known issues #12` says route-backed; v2.11 deploy says public-file-backed. Open question for synthesis.
2. **Netlify runs full `tsc`, Turbopack does not.** `next_chat_handover.md §Known issues #5` flags `supabase-js` query builder returning `PromiseLike` — `.catch()` must be preceded by `Promise.resolve()`; join results typed as arrays must cast through `unknown`. Run `npx tsc --noEmit` before every push.
3. **`@netlify/plugin-nextjs` is a site-level plugin.** Do not declare it in `package.json`. `next_chat_handover.md §Known issues #3`.
4. **`@hod/shared` spec in deploy repos.** Currently `"*"` in both deploy `package.json`s. Handover says `"file:packages/shared"`. v2.11 production proves `"*"` works with the adjacent `packages/shared/` directory. Do not change in this refresh. Open question.
5. **Background function base URL.** Admin `POST /api/daily-digest` reads `process.env.URL || DEPLOY_URL || DEPLOY_PRIME_URL || NEXT_PUBLIC_SITE_URL`. Netlify supplies `URL` / `DEPLOY_PRIME_URL` automatically. Plain `next dev` cannot reach a BG function and returns 502 — expected, not a deploy bug. (`phase_3_handover.md §d`.)
6. **Internal token.** BG function authenticates via `x-hod-internal-token`, resolving to `INTERNAL_ROUTE_TOKEN` / `INTERNAL_JOB_TOKEN` if set, else `SUPABASE_SERVICE_ROLE_KEY`. Both sites already expose `SUPABASE_SERVICE_ROLE_KEY`. No new secret required. (`phase_3_handover.md §d`.)
7. **Active Supabase schema mismatch.** `hod_analysis_cache.period_type` CHECK rejects `daily_brief` / `weekly_brief` (`20_04_test.md §9 REL-002`). Must be aligned (recovery sequence Phase B) **before** the post-deploy validation gate will pass.
8. **Deploy repos are not workspaces.** No `"workspaces"` key in either deploy `package.json`. Never copy the monorepo root `package.json` or `package-lock.json` — they would break install.
9. **Monorepo `4_development/` is untracked.** `git diff` in the monorepo does not show the v2.12 delta. Canonical comparison is deploy-repo working tree vs monorepo working tree, directory by directory (per §4).

---

## 10. Confirmed facts vs likely conclusions vs open questions

### Confirmed facts

- Both deploy-repo `dev` HEADs equal their `main` HEADs at v2.11 commits (`bda114e` portal, `fac6542` admin). No commits exist since v2.11 promotion.
- Monorepo `4_development/` is entirely untracked; no commit in the monorepo contains v2.12 source.
- Monorepo admin-portal carries new files not in the admin deploy: `.env.example`, `lib/daily-digest-generation.ts`, `netlify/functions/daily-digest-background.ts`, `netlify/functions/_internal-auth.ts`, and a populated `[build.environment]` block in `netlify.toml`; `@netlify/functions` is a new devDep.
- Monorepo admin-portal has both `app/logo.png/route.ts` and `public/logo.png` present simultaneously.
- Monorepo portal carries four new migrations (042–045) under `supabase/migrations/` not present in the portal deploy.
- `packages/shared/` has the same six-file delta against both deploy repos — a single shared-package bump travels with the refresh.
- Live admin `POST /api/daily-digest` returns 405 today; live admin `GET` takes ~8.5 s; live admin oversized-feedback returns 200 instead of 400 (`20_04_test.md`).

### Likely conclusions

- The v2.10 release used a mirror-and-push procedure (`versions/v2.10/progress/phase_6.md §Step 2b`) worded simply as "monorepo synced to deploy repos `dev` branches". Exact shell commands were not recorded; this document reconstructs them from file-layout evidence.
- `rsync -a --delete` per top-level directory, scoped by the explicit include list in §4, is the minimum-risk mirror primitive given the monorepo's untracked state.
- Admin-first deploy order is safer than portal-first because Phase 3's observable behaviour changes are almost entirely in admin.
- Shared-code skew is the only realistic cross-site failure mode; the pre-push diff gate in §5 item 11 catches it.

### Open questions

- `/logo.png`: route-backed or public-file-backed? v2.11 snapshot says public-file; handover says route-backed. Must be resolved before mirroring admin or the 500 observed in local `next dev` will reappear on the admin dev alias.
- `@hod/shared` spec: `"*"` (as-shipped) or `"file:packages/shared"` (as-documented)? Do not change in this refresh; raise for separate decision.
- Live validation requiring writes (e.g. `POST /api/daily-digest` end-to-end, which creates an `hod_analysis_cache` row) cannot be executed under investigation mode. Post-deploy validation gate (§7) must be executed under the execution SOP.
- The `netlify` CLI is installed but blocked in the current sandbox by an `EPERM` on its config store. Live `netlify status` / `netlify api listSiteDeploys` must be re-run by the execution agent outside the sandbox.

---

*End of investigation. No file outside this report was created or modified.*
