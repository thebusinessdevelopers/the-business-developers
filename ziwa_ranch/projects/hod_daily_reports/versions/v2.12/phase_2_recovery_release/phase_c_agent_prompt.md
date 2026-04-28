# Phase C Agent Prompt — v2.12 Recovery

STATUS: complete
Date: 2026-04-23
Phase boundary: **Phase C only**

Use this prompt for the implementation agent responsible for Phase C (deploy refresh — admin first, portal second) of the v2.12 recovery effort. Phase A (orchestration fix) and Phase B (schema alignment) are both complete. The database now accepts all six v2.12 `period_type` values. The only remaining blocker for live validation is that both deploy repos are parked at v2.11 HEADs.

---

## Mission

Mirror the monorepo v2.12 source into both Netlify deploy repos and push to `dev`, so both `dev--` aliases serve v2.12 code. Admin first, portal second. Resolve the admin `/logo.png` conflict in the monorepo before mirroring. Do **not** touch schema. Do **not** promote anything to `main`. Do **not** change `"@hod/shared": "*"` in either deploy repo.

You must stop at the end of Phase C and hand back. You must not start Phase D (live validation).

---

## Read first, in this order

1. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_b_delivery.md`
2. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/03_deploy_refresh_path_investigation.md`
3. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_two_plan.md` §§Phase C
4. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/04_master_synthesis.md`

Resolved facts you do **not** need to re-investigate:

- Active app DB = `inidzwfjnkyinxhvbrdt`; both dev sites' `NEXT_PUBLIC_SUPABASE_URL` point to it.
- `hod_analysis_cache.period_type` CHECK now accepts `report`, `day`, `week`, `month`, `trend_alert`, `daily_brief`, `weekly_brief` (Phase B complete).
- Both deploy repos' `dev` and `main` HEADs are at v2.11: `fac6542` (admin), `bda114e` (portal).
- Monorepo `4_development/` is untracked — refresh is a manual `rsync` mirror, not a branch merge.
- Admin site serves logo from `public/logo.png` only (no route). Portal site serves logo from `app/logo.png/route.ts` only (no public file). Monorepo admin-portal currently has both — must be resolved before mirroring.
- Both deploy repos ship `"@hod/shared": "*"` in `package.json`. Production proves this works. Do not change it.

---

## Scope allowed

You may change files only within:

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/` — the `§C0` monorepo logo cleanup only (delete `app/logo.png/route.ts` and the `app/logo.png/` directory if empty; keep `public/logo.png`).
- `/Users/joshuaroy/hod_admin_portal/` — the admin deploy repo working directory (mirror destination).
- `/Users/joshuaroy/hod_daily_reports/` — the portal deploy repo working directory (mirror destination).
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/` — delivery note and Phase D prompt.
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/backlog.md` — Decision Log entry only.

Allowed actions:

- Delete the admin `/logo.png` route conflict in the monorepo (`app/logo.png/route.ts` and parent directory).
- Run `rsync -a --delete` mirrors per `03_deploy_refresh_path_investigation.md §4.1` and `§4.2`, with the mandatory excludes.
- Replace `packages/shared/` atomically in both deploy repos.
- Run the full pre-push checklist per `03_deploy_refresh_path_investigation.md §5`.
- `git add -A`, `git commit`, `git push origin dev` on each deploy repo.
- Observe Netlify build status (CLI or UI).

---

## Forbidden actions

Do **not**:

- change `"@hod/shared": "*"` in either deploy repo's `package.json`.
- touch the portal's `app/logo.png/route.ts` — it is the production pattern and has no conflicting `public/logo.png`.
- touch any existing migration file (019 through 045).
- run any Supabase MCP migration or `execute_sql` DDL.
- promote anything to `main` or merge `dev` into `main`.
- change any TypeScript / TSX / JS file in the monorepo (the `§C0` logo cleanup is a file deletion, not a code change).
- push to `main` on either deploy repo.
- use `git push --force` on `main` of any repository.
- start Phase D.

---

## Required execution order

### C0. Monorepo admin-portal logo cleanup

1. Delete `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/logo.png/route.ts`.
2. Remove the now-empty `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/logo.png/` directory.
3. Confirm `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/public/logo.png` still exists.
4. Run `npx tsc --noEmit` and `npm run build` on the monorepo admin-portal to confirm nothing referenced the deleted route.

### C1. Admin deploy refresh

Working dir: `/Users/joshuaroy/hod_admin_portal`

1. `git fetch origin && git checkout dev && git pull --ff-only`
2. Mirror directories per `03_deploy_refresh_path_investigation.md §4.1`. Use `rsync -a --delete` per top-level directory, with these excludes on every call:
   ```
   --exclude=.git --exclude=node_modules --exclude=.next --exclude=.netlify --exclude=tsconfig.tsbuildinfo --exclude=.env --exclude=.env.local --exclude=.env.production
   ```
   Start with `--dry-run` first; only then run the live mirror.
3. Replace `packages/shared/` atomically:
   ```
   rm -rf packages/shared && mkdir -p packages && rsync -a --exclude=node_modules <monorepo>/packages/shared/ packages/shared/
   ```
4. Run the full pre-push checklist (all must pass):
   - `git status` — file list scanned; nothing outside §4.1 appears; no `.env`, `node_modules`, build artefacts, or Mac metadata files.
   - `rm -rf node_modules && npm install` — clean install resolves; `@netlify/functions` installed.
   - `npx tsc --noEmit` → 0 errors.
   - `npm run lint` → 0 errors (warnings within baseline).
   - `npm run build` → pass; `/api/daily-digest` appears as a dynamic route.
   - `grep '"@hod/shared"' package.json` → still `"*"`.
   - `test -f .env.example` → exists.
   - `grep '@netlify/functions' package.json` → devDep present.
   - `grep OPENROUTER_MODEL netlify.toml` → `[build.environment]` block present.
   - `ls netlify/functions/daily-digest-background.ts netlify/functions/_internal-auth.ts` → both present.
   - `ls app/logo.png 2>&1` → "No such file or directory" (route not shipped).
   - `ls public/logo.png` → exists.
5. `git add -A && git status` (review).
6. `git commit -m "v2.12 Phase 3: mirror admin from monorepo"`
7. `git push origin dev`
8. Watch the Netlify admin dev build. If it fails, capture the log and do not proceed to portal. Follow rollback per `03_deploy_refresh_path_investigation.md §8.1`.

### C2. Portal deploy refresh

Only run after C1 succeeds and `dev--hod-admin-portal.netlify.app` shows the new commit SHA.

Working dir: `/Users/joshuaroy/hod_daily_reports`

1. `git fetch origin && git checkout dev && git pull --ff-only`
2. Mirror directories per `03_deploy_refresh_path_investigation.md §4.2`, same excludes as C1. Include `supabase/migrations/` in the mirror. Start with `--dry-run` first.
3. Replace `packages/shared/` atomically (same as C1, from the same monorepo source).
4. Run the full pre-push checklist:
   - All items from C1 that apply to the portal.
   - `ls supabase/migrations/042_v212_augustu.sql supabase/migrations/043_v212_chalet_pax.sql supabase/migrations/044_v212_a06_rate_corrections.sql supabase/migrations/045_v212_aframe_rename.sql supabase/migrations/046_analysis_cache_period_type_expand.sql` → all present.
   - `diff -rq packages/shared ../hod_admin_portal/packages/shared` → must print nothing (shared-code skew check, **mandatory**).
   - Logo: `ls app/logo.png` → directory exists; `ls public/logo.png` → not present (only `.media_ref` placeholders).
5. `git add -A && git status` (review).
6. `git commit -m "v2.12 Phase 3: mirror portal from monorepo"`
7. `git push origin dev`
8. Watch the Netlify portal dev build. Follow rollback per `03_deploy_refresh_path_investigation.md §8.2` if it fails.

### C3. Gate C

All must pass:

- Both deploy repos pushed successfully.
- Both Netlify dev builds green.
- Deploy metadata on both `dev--` aliases shows the new commit SHAs (not `fac6542` / `bda114e`).
- `packages/shared` is byte-identical across the two deploy repos (re-run the diff after both pushes).
- Record both commit SHAs and Netlify deploy IDs in the Decision Log.

Stop immediately if any check fails. Follow rollback per `03_deploy_refresh_path_investigation.md §8`.

---

## Documentation requirements before handoff

Phase C is **not complete** until you write both files below:

1. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_c_delivery.md`
2. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_d_agent_prompt.md`

### `phase_c_delivery.md` must include

- `STATUS:` token
- date
- exact mirror commands used (rsync invocations with flags)
- admin and portal commit SHAs
- Netlify deploy IDs and timestamps
- proof that `packages/shared` matched across both deploy repos
- note of the resolved admin `/logo.png` conflict
- pre-push checklist results for both deploy repos
- cleanup performed (if any)
- unresolved risks
- exact next starting point for Phase D

### `phase_d_agent_prompt.md` must include

- mission: Phase D only (live validation gate)
- read-first file list (include `phase_c_delivery.md`, `phase_two_plan.md §§Phase D`, and `20_04_test.md`)
- exact allowed scope (browser automation, API calls, database reads against `dev--` aliases)
- exact forbidden actions (no code changes, no schema changes, no deploy repo pushes, no `main` promotion)
- the full validation checklist from `phase_two_plan.md §§D1–D6`
- cleanup requirements (D7)
- explicit instruction to stop at the Phase D boundary and hand back with a release recommendation

Also update `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/backlog.md` Decision Log with:

- both commit SHAs and Netlify deploy IDs
- the authenticated deploy approach used (rsync mirror)
- absolute paths to `phase_c_delivery.md` and `phase_d_agent_prompt.md`

---

## Delivery format in chat

When Phase C is complete, return a concise summary containing:

1. admin commit SHA and Netlify deploy ID
2. portal commit SHA and Netlify deploy ID
3. proof that `packages/shared` is byte-identical across both repos
4. the logo conflict resolution applied
5. any pre-push checklist items that required attention
6. exact paths written for `phase_c_delivery.md` and `phase_d_agent_prompt.md`
7. any residual risks Phase D should know about

Do not continue into Phase D in the same run.

---

## Final instruction

Execute **Phase C only**. Resolve the admin logo conflict, mirror both deploy repos, push to `dev`, verify Netlify builds. Write the handoff artefacts. Then stop and hand back.
