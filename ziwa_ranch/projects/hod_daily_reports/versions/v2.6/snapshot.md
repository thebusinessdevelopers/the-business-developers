# HOD Daily Reports — v2.6 Release Snapshot

> **Purpose:** Release record for v2.6 reliability work.
>
> **Updated:** 8 April 2026
> **Status:** **v2.6 is production.** All five refinement phases complete. Both portals promoted to `main` on 8 Apr 2026. Deployed to https://hoddailyreports.netlify.app and https://hod-admin-portal.netlify.app.
> **Base version:** v2.5 (superseded)

---

## What v2.6 delivers

v2.6 is a reliability-first release with no feature expansion beyond agreed config updates. All 10 registered bugs are fixed, migration 017 has been executed, and both portals build with zero TypeScript errors.

### Completed items

| ID | Area | Status | Summary |
|---|---|---|---|
| `V26-001` | Trust boundaries | fixed | Submit/edit media linking enforces server-side department/date/unlinked ownership guards |
| `V26-002` | Internal routes | fixed | Internal-only routes (`process-media`, `harvest-items`) guarded with `isInternalRequest`; all routes have auth |
| `V26-003` | Offline replay | fixed | Queue lifecycle states, stale pruning, periodic replay, and improved sync visibility |
| `V26-004` | Analysis reliability | fixed | Shared reliability helpers, strict output validation, non-blocking cache, deterministic fallbacks |
| `V26-005` | Activity integrity | fixed | Auth-event dedupe guards and richer login/logout metadata in both portals |
| `V26-006` | Submitter editing | fixed | HOD edits within window, admin edits always; full audit trail in edit history and activity logs |
| `V26-007` | Roy Family access | fixed | `admin.royfamily` view-only account; server-enforced read-only; migration applied |
| `V26-008` | Wildlife accounts | fixed | `wildlife.samuel` added, `wildlife.wycliff` renamed to `wildlife.wycliffe`; migration applied |
| `V26-009` | IT job cards | fixed | Section-level N/A toggle for Job Cards |
| `V26-010` | Security gates | fixed | `Kyamukama Gate` added to shared gate options |

### Additional corrections

- Analysis route files (`daily-digest/route.ts`, `analysis/generate/route.ts`) had duplicated code blocks — split to clean handlers.
- Admin FormRenderer edit path was missing `submittedBy` in the API payload — fixed.
- N/A marker logic centralised in `packages/shared/lib/na-markers.ts`.
- Analysis reliability helpers centralised in `admin-portal/lib/analysis-reliability.ts`.
- Bug documentation automation script added: `scripts/v26-doc-workflow.mjs`.

---

## Database migration

Migration `017_v2_6_account_access_updates.sql` was executed on 7 April 2026:

- `admin.royfamily` created (admin, standard tier, Family Viewer)
- `admin.joshua` retired to `legacy.admin.joshua` (disabled, random password)
- `wildlife.wycliff` renamed to `wildlife.wycliffe`
- `wildlife.samuel` created (hod, wildlife department)

All four operations verified against the database.

---

## Verification completed

- `npm run build` passes in both `portal` and `admin-portal` with zero TypeScript errors
- `ReadLints` reports zero linter errors on all v2.6 modified files
- Full route audit: all 45 API routes across both portals have proper auth protection
- Database migration verified with post-execution query
- Code audit confirms all v2.6 requirements are correctly implemented
- **Live validation (8 Apr 2026):** Full record in [`final_validation.md`](final_validation.md) — AI (digest, analysis, trends, executive summary), compliance/overview, exports, stock, regression checks, and offline queue exercised on dev previews

---

## Live validation outcome (8 April 2026)

**Document:** [`versions/v2.6/final_validation.md`](final_validation.md)

**Passed on dev previews:** Period analysis (daily / weekly / monthly), trend insights, executive summary export, single-report export (including missing-report message), compliance/WhatsApp summary (6 reporting days in 7-day window), overview bars, stock edit/scan/flags, Roy Family gates/IT N/A, activity log sanity, offline queue successfully replayed to server.

**Observations for next refinement (not blockers to promotion unless business says so):**

- **Daily brief vs insights:** Insights load promptly; daily brief can feel **absent or very delayed** on overview — improve perceived load (ordering, skeletons, or fetch strategy).
- **Exports:** Housekeeping **room grid** (and similar structured fields) export as **raw JSON** — extend `renderSingleReport` / field formatters for human-readable room maps.
- **Offline queue UX:** After auto-submit, users want **clear success**, **readable banners**, and **navigation to the submitted report view** instead of staying on the form.
- **Activity:** Possible duplicate `thread_message_posted` rows for one action — verify if worth deduping.

---

## Files added/modified for v2.6

### New files
- `packages/shared/lib/na-markers.ts` — centralised N/A marker utilities
- `admin-portal/lib/analysis-reliability.ts` — shared analysis validation helpers
- `admin-portal/app/api/analysis/generate/handler.ts` — clean analysis generation handler
- `admin-portal/app/api/daily-digest/handler.ts` — clean digest handler
- `scripts/v26-doc-workflow.mjs` — bug documentation automation
- `versions/v2.6/bug_register.md`
- `versions/v2.6/fix_verification.md`
- `versions/v2.6/snapshot.md`
- `versions/v2.6/investigations/activity_log_integrity.md`
- `versions/v2.6/investigations/v26-004_analysis_reliability.md`

### Modified files
- `portal/app/api/submit-report/route.ts` — media linking guards
- `portal/app/api/edit-report/route.ts` — media linking guards + submitter editing
- `portal/components/FormRenderer.tsx` — N/A marker centralisation + draft management
- `portal/components/form/FormValidation.ts` — N/A marker + repeater validation
- `portal/components/ConnectivityBanner.tsx` — queue state messaging
- `portal/hooks/useSubmissionQueue.ts` — queue lifecycle + replay triggers
- `portal/lib/local-storage.ts` — queue storage model upgrade
- `portal/lib/auth.ts` — login/logout dedupe guards
- `portal/config/forms.ts` — IT Job Cards allowNA
- `portal/config/login-users.ts` — wildlife account updates
- `admin-portal/components/FormRenderer.tsx` — N/A marker + submittedBy fix
- `admin-portal/components/form/FormValidation.ts` — N/A marker centralisation
- `admin-portal/app/api/edit-report/route.ts` — submitter editing + audit trail
- `admin-portal/app/api/analysis/generate/route.ts` — cleanup to re-export
- `admin-portal/app/api/daily-digest/route.ts` — cleanup to re-export
- `admin-portal/app/api/analysis/trends/route.ts` — reliability helpers
- `admin-portal/app/api/exports/generate/route.ts` — N/A marker
- `admin-portal/lib/admin-auth.ts` — Roy Family view-only + dedupe guards
- `admin-portal/config/forms.ts` — IT Job Cards allowNA
- `packages/shared/config/locations.ts` — Kyamukama Gate
- `packages/shared/lib/extract-metrics.ts` — N/A marker centralisation
- `package.json` (root) — v26:doc script

---

## Prod-spec iteration (7 April 2026)

Following live dev preview testing, five additional issues were identified and fixed in a single iteration pass:

### AI pipeline — model retirement (critical)

OpenRouter retired `anthropic/claude-3.5-sonnet` (404 "No endpoints found"). All AI features (daily digest, period analysis, trend detection, executive summary export) were completely non-functional.

- **Fix:** Updated model to `anthropic/claude-sonnet-4` in `packages/shared/lib/openrouter.ts`. Verified via direct API test: 2.8s response time at 100 tokens, 8s for realistic 800-token digest prompt — well within Netlify's 26s timeout.
- **Observability:** Added `degraded_reason` field to catch-block JSON responses in all four AI endpoints (analysis/generate, daily-digest, trends, exports/generate), surfacing the actual error message for faster future diagnosis.

### Compliance tracker accuracy (critical)

Two bugs in `getExpectedReportingDays` (`packages/shared/lib/submission-status.ts`):
1. Sunday exclusion (`dayOfWeek !== 0`) — reporting is 7 days/week at Ziwa.
2. Today included as an expected day after 16:00 Kampala, causing a "1 missing" penalty for today's not-yet-submitted report.

- **Fix:** Removed Sunday exclusion entirely. Changed logic to `dateStr < todayKampala` — today is never counted as expected, so departments cannot show a false "1 missing".
- **UI:** Updated compliance page text from "Sundays excluded" to "all 7 days/week".

### Export system UX (high)

1. Single report export required a two-step flow (lookup report ID, then generate). User had to click "Find report" before "Generate Export".
2. Executive summary export failed completely when AI was unavailable, with no fallback.

- **Fix (single):** Backend now accepts `department_id` + `date` directly alongside `report_id`. Frontend sends dept+date in one step — the lookup call is eliminated.
- **Fix (summary):** Wrapped AI call in isolated try/catch. On failure, generates a text-only fallback containing department notes and key metrics. Users always get a usable export.

### Stock management gaps (high)

1. Admins had no way to edit stock quantities or correct item spellings after HOD submission.
2. Duplicate scan was slow due to N+1 Supabase queries (one per department for items, one per duplicate group for flag existence check).

- **Fix (editing):** New `StockTable` client component with inline edit mode. New API route `POST /api/stock/edit-entry` with full audit trail (old items vs new items logged in admin activity). Items, quantities, and units are all editable.
- **Fix (scan performance):** Refactored to 3 parallel queries upfront (departments, all items, all open flags), client-side grouping, and batch insert. Eliminated per-department and per-group queries entirely.
- **UI feedback:** Scan button now shows result message ("No new duplicates found" or error) instead of silently doing nothing.

---

## Deployment

v2.6 code pushed to deploy repos on `dev` branch for Netlify preview:
- HOD portal: https://dev--hoddailyreports.netlify.app
- Admin portal: https://dev--hod-admin-portal.netlify.app

Both portals build with zero TypeScript errors. All changes deployed to dev previews for live validation.

---

### New/modified files in prod-spec iteration

- `packages/shared/lib/openrouter.ts` — model update
- `packages/shared/lib/submission-status.ts` — compliance fix
- `admin-portal/app/api/analysis/generate/handler.ts` — degraded_reason
- `admin-portal/app/api/daily-digest/handler.ts` — degraded_reason
- `admin-portal/app/api/analysis/trends/route.ts` — degraded_reason
- `admin-portal/app/api/exports/generate/route.ts` — one-step single export + AI fallback + degraded_reason
- `admin-portal/app/exports/ExportsPanel.tsx` — simplified single export flow
- `admin-portal/app/compliance/page.tsx` — UI text update
- `admin-portal/app/stock/page.tsx` — StockTable integration
- `admin-portal/app/stock/StockTable.tsx` — new: inline editing
- `admin-portal/app/stock/StockFlags.tsx` — scan feedback
- `admin-portal/app/api/stock/edit-entry/route.ts` — new: stock edit API
- `admin-portal/app/api/stock/scan-duplicates/route.ts` — batched queries

---

---

## v2.6 production refinement — Phase 1 (8 April 2026)

**Focus:** Admin overview — daily brief UX and trend insights degraded visibility.

### What shipped

**DailyDigestCard** (`admin-portal/components/DailyDigestCard.tsx`):
- **Labelled loading skeleton** — card now shows "Daily Brief" title with "Loading…" indicator and indigo-tinted shimmer bars while fetching, instead of a generic grey placeholder.
- **Empty state** — when `report_count === 0` the card stays visible with the message "No reports submitted yet today. The brief will appear once departments begin reporting." Previously returned `null` (invisible card).
- **Network error handling** — `.catch()` now captures the error message and renders a persistent amber warning ("Could not load the daily brief. It will retry automatically.") with the error detail below. Previously swallowed silently.
- **Degraded reason** — when the API returns `degraded_reason` (e.g. OpenRouter failure), an amber inline banner shows "AI summarisation degraded" with the reason, above the fallback digest text.
- Interface extended with `degraded` and `degraded_reason` fields.

**TrendInsightsCard** (`admin-portal/components/TrendInsightsCard.tsx`):
- **Labelled loading skeleton** — shows "Insights" title with "Loading…" and two placeholder insight cards during fetch. Previously a generic grey block.
- **Empty / no-data state** — when insights array is empty, the card stays visible and shows either the API's `message` (e.g. "Not enough data for trend analysis") or a default "No notable trends detected this week." Previously returned `null`.
- **Degraded / error state** — if `degraded_reason` is returned or a network error occurs, an amber card explains "Trend analysis unavailable" with the reason. Previously swallowed silently.
- **Degraded-with-insights** — if insights exist but the response is also marked degraded, an inline amber banner appears above the insight cards.
- Interface extended with `degraded`, `degraded_reason`, and `message` fields.

### How to verify

1. Open the admin portal overview page.
2. **Before any reports are submitted today:** Daily Brief card should be visible with the empty-state message. Insights card should show either "No notable trends…" or trend cards from prior data.
3. **After reports are submitted:** Daily Brief should load with a labelled skeleton, then render content. Insights should load with a skeleton, then render insight cards.
4. **To test degraded state:** Temporarily invalidate the OpenRouter API key — the daily brief should show a fallback digest with an amber "AI summarisation degraded" banner; insights should show "Trend analysis unavailable" with the error detail.

### Files modified
- `admin-portal/components/DailyDigestCard.tsx`
- `admin-portal/components/TrendInsightsCard.tsx`

---

## v2.6 production refinement — Phase 2 (8 April 2026)

**Focus:** Exports — human-readable structured fields and error surfacing.

### What shipped

**Export route** (`admin-portal/app/api/exports/generate/route.ts`):
- **Room grid formatter** — `room_grid` fields (Housekeeping) now export as grouped, labelled lines organised by building (Guest House 1, Guest House 2, Chalets, Tents). Each room shows its status (Occupied/Vacant), condition, damages, and notes as dash-separated readable text, with occupancy totals at the end. Previously rendered as raw `JSON.stringify`.
- **Generic object fallback** — any non-array plain object field that isn't a room grid now exports as labelled key-value lines with underscores converted to title-cased words (e.g. `other_nationalities` → `Other Nationalities: ...`). Previously rendered as raw JSON.
- **Multiline field detection** — fields whose formatted output contains newlines (e.g. generic objects) are rendered with the label on its own line followed by the value, matching the repeater/inventory_grid pattern.

**ExportsPanel** (`admin-portal/app/exports/ExportsPanel.tsx`):
- **JSON parse failure** — if the server returns a non-JSON response (e.g. Netlify 502 or timeout), the panel now shows the HTTP status and status text with guidance, instead of a generic "Network error".
- **API error passthrough** — server-side error messages (including the 200-char detail from the catch block) are shown in full. The fallback text now includes the HTTP status code.
- **Network error detail** — the outer catch block surfaces the `Error.message` for connection-level failures.

### How to verify

1. Export a **single Housekeeping report** — room status should appear as readable lines grouped by building, not a JSON blob.
2. Export a report with any **non-array object field** — values should appear as labelled lines.
3. Export with a **deliberately invalid date range** or while offline — the error panel should show the full server message, not just "Export failed."

### Files modified
- `admin-portal/app/api/exports/generate/route.ts`
- `admin-portal/app/exports/ExportsPanel.tsx`

*Snapshot updated 8 April 2026. Phase 2 of v2.6 production refinement complete. Next: Phase 3 (Offline queue: success UX, report id, view link, banner diagnostics).*

---

## v2.6 production refinement — Phase 3 (8 April 2026)

**Focus:** Offline queue — success UX, report ID passthrough, view link, banner diagnostics.

### What shipped

**useSubmissionQueue hook** (`portal/hooks/useSubmissionQueue.ts`):
- Parses `reportId` (or `duplicateId` on 409) from the `/api/submit-report` response body after a successful queue retry.
- Extended `onRetrySuccess` callback signature to `(item, reportId?)` so callers receive the server-assigned report ID.
- Dispatches a `hod:submission-success` custom event with `{ reportId, slug, departmentId }` on every successful retry — decouples the banner from the form's callback.
- Exposes `lastFailedError` (first `lastError` text from failed/failed-auth queue items) for banner diagnostics.

**local-storage** (`portal/lib/local-storage.ts`):
- Added `SUBMISSION_SUCCESS_EVENT` constant.

**FormRenderer** (`portal/components/FormRenderer.tsx`):
- Queue retry callback now passes `reportId` through to `onSuccess(reportId)` instead of `onSuccess(undefined)`, so the success screen has the report ID.

**NewReportForm** (`portal/app/report/[slug]/new/NewReportForm.tsx`):
- Success screen now shows **"View this report"** link (`/report/{slug}/view/{id}`) above the existing "Edit this report" link when `lastReportId` is available. Both links appear for normal submissions and successful queue retries.

**ConnectivityBanner** (`portal/components/ConnectivityBanner.tsx`):
- **Success flash** — listens for `hod:submission-success` and shows a green sticky banner for 6 seconds with a "View report" link (when slug + reportId are available).
- **Failed-auth diagnostics** — the red failed-auth banner now shows the `lastError` text beneath the count (e.g. "Session expired. Please sign in again…").
- **Failed diagnostics** — the amber failed banner now shows the `lastError` text beneath the count (e.g. the actual server error message).

### How to verify

1. Submit a report normally — success screen should show **"View this report"** and **"Edit this report"** links.
2. Queue a report while offline, then reconnect — the sticky banner should flash green with "Queued report submitted successfully" and a "View report" link for ~6 seconds.
3. Simulate a failed queue item (e.g. expired session) — the red banner should show the count **and** the reason text beneath.

### Files modified
- `portal/lib/local-storage.ts`
- `portal/hooks/useSubmissionQueue.ts`
- `portal/components/FormRenderer.tsx`
- `portal/app/report/[slug]/new/NewReportForm.tsx`
- `portal/components/ConnectivityBanner.tsx`

*Snapshot updated 8 April 2026. Phase 3 of v2.6 production refinement complete. Next: Phase 4 (Thread double-submit guard).*

---

## v2.6 production refinement — Phase 4 (8 April 2026)

**Focus:** Thread double-submit guard — prevent duplicate `thread_message_posted` activity rows from rapid double-clicks.

### What shipped

**ThreadView** (`packages/shared/components/ThreadView.tsx`):
- Added a synchronous `useRef` lock (`sendingRef`) alongside the existing `sending` state in `handleSend`. The ref is checked and set immediately on entry — two rapid calls cannot both pass the guard because the ref update is synchronous, unlike `setSending` which is batched by React. The ref resets in `finally` to match the state lifecycle.

### Why a ref, not just state

`setSending(true)` is asynchronous — React batches state updates, so two near-simultaneous clicks can both read `sending === false` and both proceed. A `useRef` is updated synchronously on the calling thread, so the second call sees `sendingRef.current === true` immediately and returns early.

### How to verify

1. Open any report discussion thread (HOD or admin portal).
2. Type a message and rapidly double-click **Send**.
3. Only one message should appear; only one `thread_message_posted` activity row should be created.

### Files modified
- `packages/shared/components/ThreadView.tsx`

*Snapshot updated 8 April 2026. Phase 4 of v2.6 production refinement complete. Next: Phase 5 (Build verification + final documentation close-out).*

---

## v2.6 production refinement — Phase 5 (8 April 2026)

**Focus:** Build verification and final documentation close-out.

### What shipped

No code changes — Phase 5 is a verification and close-out gate.

### Verification results

- **Portal build:** `npm run build` passes with zero TypeScript errors. 22 routes compiled successfully (Next.js 16.1.6 / Turbopack).
- **Admin portal build:** `npm run build` passes with zero TypeScript errors. 38 routes compiled successfully (Next.js 16.1.6 / Turbopack).
- **Linter:** Zero linter errors across all files modified during Phases 1–4 (10 files checked).

### Refinement summary

All five refinement phases are now complete:

| Phase | Scope | Outcome |
|-------|-------|---------|
| 1 | Daily brief UX + insights degraded visibility | DailyDigestCard and TrendInsightsCard show labelled skeletons, empty states, and error/degraded banners |
| 2 | Room grid + structured object exports + error surfacing | Human-readable room maps grouped by building; generic objects as labelled lines; ExportsPanel shows full API errors |
| 3 | Offline queue success UX + diagnostics | reportId passthrough, "View this report" link, green success flash banner, failure diagnostics in banners |
| 4 | Thread double-submit guard | useRef-based synchronous lock prevents duplicate thread_message_posted activity rows |
| 5 | Build verification + documentation close-out | Both portals build clean; all docs finalised |

### Deployment readiness

v2.6 is fully verified on dev previews and all refinement is complete. To promote to production:

```bash
cd ~/hod_daily_reports && git checkout main && git merge dev && git push origin main
cd ~/hod_admin_portal && git checkout main && git merge dev && git push origin main
```

*Snapshot updated 8 April 2026. Phase 5 of v2.6 production refinement complete. All five phases shipped. v2.6 is ready for production promotion.*

---

## Production deployment (8 April 2026)

**v2.6 is live on production.**

| Deploy repo | Branch | Commit | URL |
|---|---|---|---|
| `hod_daily_reports` | `main` | `658b162` | https://hoddailyreports.netlify.app |
| `hod_admin_portal` | `main` | `a803f6d` | https://hod-admin-portal.netlify.app |

**Validation passed on dev previews before promotion** (see `final_validation.md`). All five refinement phases shipped in the same promotion.

v2.6 is the current production version. v2.5 is superseded. v2.7+ is the next development cycle.
