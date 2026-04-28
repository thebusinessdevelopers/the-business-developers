# Phase C Delivery — v2.12 Recovery

STATUS: complete
Date: 2026-04-23
Phase boundary outcome: **Phase C complete. Both deploy repos mirrored from the monorepo v2.12 source and pushed to `dev`. Both Netlify dev builds green. `packages/shared` byte-identical across repos.** Ready for Phase D (live validation).

---

## 1. Logo conflict resolution

Deleted the conflicting admin `app/logo.png/route.ts` and its empty parent directory from the monorepo admin-portal (`/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/logo.png/`). Retained `public/logo.png` (9,353 bytes). Cleared the `.next` build cache (which referenced the deleted route), then confirmed `npx tsc --noEmit` and `npm run build` both pass cleanly on the monorepo admin-portal. `/api/daily-digest` confirmed present as a dynamic route in the build output.

Portal `app/logo.png/route.ts` was not touched — it remains the production pattern for the portal site.

---

## 2. Mirror commands used

### Admin (`/Users/joshuaroy/hod_admin_portal`)

Dry-run first (`--dry-run --itemize-changes`), then live, per top-level directory:

```
MONO="…/4_development/admin-portal"
ADMIN="/Users/joshuaroy/hod_admin_portal"
EXCLUDES="--exclude=.git --exclude=node_modules --exclude=.next --exclude=.netlify --exclude=tsconfig.tsbuildinfo --exclude=.env --exclude=.env.local --exclude=.env.production"

rsync -a --delete $EXCLUDES "$MONO/app/"             "$ADMIN/app/"
rsync -a --delete $EXCLUDES "$MONO/components/"       "$ADMIN/components/"
rsync -a --delete $EXCLUDES "$MONO/config/"           "$ADMIN/config/"
rsync -a --delete $EXCLUDES "$MONO/hooks/"            "$ADMIN/hooks/"
rsync -a --delete $EXCLUDES "$MONO/lib/"              "$ADMIN/lib/"
rsync -a --delete $EXCLUDES "$MONO/types/"            "$ADMIN/types/"
rsync -a --delete $EXCLUDES "$MONO/public/"           "$ADMIN/public/"
rsync -a --delete $EXCLUDES "$MONO/netlify/functions/" "$ADMIN/netlify/functions/"
# Single files: netlify.toml, next.config.ts, tsconfig.json, postcss.config.mjs, eslint.config.mjs, package.json, .env.example
```

Atomic shared replacement:

```
rm -rf packages/shared && mkdir -p packages && rsync -a --exclude=node_modules "$MONO_SHARED/" packages/shared/
```

### Portal (`/Users/joshuaroy/hod_daily_reports`)

Same pattern with portal-specific paths from `03_deploy_refresh_path_investigation.md §4.2`, including `supabase/` directory. Single files include `middleware.ts`.

---

## 3. Admin commit SHA and Netlify deploy

- **Commit:** `67bb8e1` on `dev` (message: `v2.12 Phase 3: mirror admin from monorepo`)
- **Previous HEAD:** `fac6542` (v2.11)
- **Push:** `fac6542..67bb8e1 dev -> dev`
- **Netlify deploy ID:** `69e9cfc631266e0008bdb0f7`
- **Netlify state:** `ready`
- **Netlify timestamp:** 2026-04-23T07:52:39Z
- **Files changed:** 26 files, +1,282 / −392 lines

---

## 4. Portal commit SHA and Netlify deploy

- **Commit:** `86892a0` on `dev` (message: `v2.12 Phase 3: mirror portal from monorepo`)
- **Previous HEAD:** `bda114e` (v2.11)
- **Push:** `bda114e..86892a0 dev -> dev`
- **Netlify deploy ID:** `69e9d060123ba100087ce1f9`
- **Netlify state:** `ready`
- **Netlify timestamp:** 2026-04-23T07:55:12Z
- **Files changed:** 21 files, +339 / −149 lines (including 5 new migrations)

---

## 5. `packages/shared` parity

`diff -rq /Users/joshuaroy/hod_admin_portal/packages/shared /Users/joshuaroy/hod_daily_reports/packages/shared` → **no output** (byte-identical). Checked after both pushes.

---

## 6. Pre-push checklist results

### Admin

| Check | Result |
|---|---|
| `git status` — no `.env`, `node_modules`, build artefacts, Mac metadata | Pass |
| `rm -rf node_modules && npm install` | Pass (2 pre-existing audit vulns) |
| `npx tsc --noEmit` | Pass — 0 errors |
| `npm run lint` | 0 errors from application code; 3 errors in `packages/shared/` from upgraded eslint `react-hooks/set-state-in-effect` and `no-explicit-any` rules (see §9 below) |
| `npm run build` | Pass — `/api/daily-digest` present as dynamic route |
| `grep '"@hod/shared"' package.json` → `"*"` | Pass |
| `test -f .env.example` | Pass |
| `grep '@netlify/functions' package.json` | Pass — `^2.8.2` devDep |
| `grep OPENROUTER_MODEL netlify.toml` | Pass — `[build.environment]` block present |
| `ls netlify/functions/daily-digest-background.ts _internal-auth.ts` | Pass — both present |
| `ls app/logo.png` → "No such file or directory" | Pass |
| `ls public/logo.png` → exists | Pass |

### Portal

| Check | Result |
|---|---|
| `git status` — clean of artefacts | Pass |
| `rm -rf node_modules && npm install` | Pass (4 pre-existing audit vulns) |
| `npx tsc --noEmit` | Pass — 0 errors |
| `npm run lint` | Same 3 `packages/shared/` baseline errors as admin |
| `npm run build` | Pass — `/logo.png` route present |
| `grep '"@hod/shared"' package.json` → `"*"` | Pass |
| `ls supabase/migrations/042..046` | Pass — all 5 v2.12 migrations present |
| `diff -rq packages/shared ../hod_admin_portal/packages/shared` → no diff | Pass |
| `ls app/logo.png` → directory exists (`route.ts`) | Pass |
| `ls public/logo.png` → not present | Pass |

---

## 7. Live behaviour verification

| Check | v2.11 (before) | v2.12 (after) |
|---|---|---|
| `POST /api/daily-digest` | 405 (route absent) | 401 (route exists, auth required) |
| `GET /api/daily-digest` | ~8.5 s (synchronous) | 0.82 s (cache-read-only) |
| Portal `/login` | 200 | 200 |

---

## 8. Cleanup performed

- Removed `.next` build cache from monorepo admin-portal after logo deletion (contained stale type references to the deleted route).
- Unstaged `tsconfig.tsbuildinfo` from admin deploy repo staging (generated by local `tsc --noEmit`, not application code).

---

## 9. Unresolved risks

- **`packages/shared/` lint errors in deploy repos.** The deploy repos resolve eslint 9.39.4 (from `package.json` ranges), while the monorepo lockfile pins 9.33.0. The newer version introduces `react-hooks/set-state-in-effect` which flags `AccommodationCalendar.tsx` and `AutocompleteInput.tsx`, plus `no-explicit-any` in `harvest-items.ts`. These are pre-existing code patterns — the monorepo's own `npm run lint` reports 0 errors / 13 warnings because it resolves the older eslint. Netlify's build command is `npm run build` (not lint), so these do not block deployment. Recommend resolving in v2.13 hygiene by either pinning the eslint version in deploy repos or suppressing the rules for `packages/shared/`.
- **Admin `main` branch auto-deploy.** The Netlify API shows a `new` state deploy triggered on admin `main` (deploy ID `69e9d11d66ec96532daf69a9`, timestamp 2026-04-23T07:58:21Z). This appears to be an automatic rebuild triggered by Netlify, not by a push — `main` HEAD is still `fac6542`. No action required unless it surfaces an error.
- **`@hod/shared: "*"`** remains unchanged per plan. Separate v2.13 hygiene item.

---

## 10. Exact next starting point for Phase D

`/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_2_recovery_release/phase_d_agent_prompt.md`

Phase D runs the live validation gate against both `dev--` aliases using browser automation, API calls, and database reads. No code changes, no schema changes, no pushes. The goal is to confirm the v2.12 Phase 3 contract end-to-end and produce a release recommendation.

---

*Phase C closed. Decision Log updated. Ready for Phase D on Joshua's word.*
