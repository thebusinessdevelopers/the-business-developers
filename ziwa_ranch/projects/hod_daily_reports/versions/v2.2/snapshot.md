# HOD Daily Reports — Version 2.2 Snapshot

> **Purpose:** Point-in-time record of Version 2.2. Documents all changes from v2.1.
>
> **Built on:** 26 March 2026
> **Status:** v2.2 deployed to dev branch. Live on dev preview URLs. Not yet merged to production.
> **Base version:** v2.1 (see `versions/v2.1/snapshot.md`)
> **Dev preview (HOD):** https://dev--hoddailyreports.netlify.app ✓ live
> **Dev preview (Admin):** https://dev--hod-admin-portal.netlify.app ✓ live

---

## What v2.2 is

Seven targeted technical improvements to simplify the architecture, improve user experience, and lay the foundation for the analytics vision. No new user-facing features beyond the Analysis tab — this version is about making the system faster, cleaner, and smarter.

- **S1 — Decouple AI from photo upload.** Photo uploads now return instantly. AI analysis (BLIP captioning, DETR object detection) runs as a background process after report submission.
- **S2 — Replace digest and urgency models with OpenRouter (Claude Sonnet 4.6).** Daily digest uses Claude for intelligent executive summaries instead of BART-CNN. Urgency detection uses Claude's structured classification instead of BART-MNLI zero-shot.
- **S3 — Shared workspace package.** 16 duplicated files extracted to `packages/shared/` (`@hod/shared`). Both apps use re-exports — existing `@/` imports unchanged.
- **S4 — FormRenderer split.** Both portal and admin `FormRenderer.tsx` split into `form/FieldRenderer.tsx` (field type switching) and `form/FormValidation.ts` (validation logic).
- **S5 — Admin edits behind API routes.** New `POST /api/edit-report` in admin portal. Admin edits now logged to `hod_activity_log` with diff, harvest trigger, and auth validation.
- **S6 — Analysis tab.** New `/analysis` page with Daily/Weekly/Monthly tabs. Period-locked results cached in `hod_analysis_cache` table. Powered by Claude Sonnet 4.6.
- **S7 — Cleanup pass.** Fixed HF token crash, activity filter, PhotoGallery signed URLs, broken admin links, edit window text, and added Users page with password reset UI.

---

## Database changes

| Change | What it does |
|---|---|
| `hod_analysis_cache` table | Caches AI analysis results for completed periods. Columns: `period_type` (day/week/month), `period_key`, `analysis_data` (JSONB), `generated_at`, `model_used`. Unique on `(period_type, period_key)`. |

No other schema changes. All new data flows use existing tables.

---

## New and modified files

### Root workspace

| File | Purpose |
|---|---|
| `4_development/package.json` | **New.** Root workspace config linking `portal`, `admin-portal`, and `packages/*`. |
| `packages/shared/package.json` | **New.** Shared package `@hod/shared` with subpath exports. |
| `packages/shared/types/index.ts` | **New.** Merged types from both apps (includes `InventoryGridConfig`, `ReportMedia`). |
| `packages/shared/config/rooms.ts` | **New.** Moved from both apps. |
| `packages/shared/config/calculations.ts` | **New.** Moved from both apps. |
| `packages/shared/config/locations.ts` | **New.** Moved from both apps. |
| `packages/shared/lib/supabase.ts` | **New.** Moved from both apps. |
| `packages/shared/lib/supabase-server.ts` | **New.** Moved from both apps. |
| `packages/shared/lib/submission-status.ts` | **New.** Merged version with `getExpectedReportingDays` from admin. |
| `packages/shared/lib/hf.ts` | **New.** Guarded HF client (returns `null` if `HF_TOKEN` missing). |
| `packages/shared/lib/openrouter.ts` | **New.** OpenRouter API wrapper for Claude Sonnet 4.6 with reasoning support. |
| `packages/shared/components/*.tsx` | **New.** 7 shared components (RoomGrid, RepeaterField, AutocompleteInput, CalculationHint, NumberStepper, EditHistory, StockProjectionDisplay). |

### HOD Portal — new files

| File | Purpose |
|---|---|
| `app/api/ai/process-media/route.ts` | Background AI processing — downloads image from storage, runs HF pipeline, updates `hod_report_media`. |
| `components/form/FieldRenderer.tsx` | Extracted field type switching from FormRenderer (~210 lines). |
| `components/form/FormValidation.ts` | Extracted validation logic — pure function, no React. |

### HOD Portal — modified files

| File | Change |
|---|---|
| `app/api/upload-media/route.ts` | Stripped `analyseImage()` call. Upload now returns instantly with no AI blocking. |
| `app/api/submit-report/route.ts` | Urgency detection replaced with OpenRouter (Claude Sonnet 4.6 structured classification). Fires background `process-media` for each photo after linking. |
| `components/FormRenderer.tsx` | Slim orchestrator using extracted FieldRenderer and FormValidation modules. |
| `lib/hf.ts` | Re-export from `@hod/shared`. |
| `lib/openrouter.ts` | Re-export from `@hod/shared`. |
| `lib/supabase.ts` | Re-export from `@hod/shared`. |
| `lib/supabase-server.ts` | Re-export from `@hod/shared`. |
| `lib/submission-status.ts` | Re-export from `@hod/shared`. |
| `types/index.ts` | Re-export from `@hod/shared`. |
| `config/rooms.ts` | Re-export from `@hod/shared`. |
| `config/calculations.ts` | Re-export from `@hod/shared`. |
| `config/locations.ts` | Re-export from `@hod/shared`. |
| `components/RoomGrid.tsx` | Re-export from `@hod/shared`. |
| `components/RepeaterField.tsx` | Re-export from `@hod/shared`. |
| `components/AutocompleteInput.tsx` | Re-export from `@hod/shared`. |
| `components/CalculationHint.tsx` | Re-export from `@hod/shared`. |
| `components/NumberStepper.tsx` | Re-export from `@hod/shared`. |
| `components/EditHistory.tsx` | Re-export from `@hod/shared`. |
| `components/StockProjectionDisplay.tsx` | Re-export from `@hod/shared`. |
| `package.json` | Added `@hod/shared` workspace dependency. |
| `next.config.ts` | Added `transpilePackages: ['@hod/shared']`. |

### Admin Portal — new files

| File | Purpose |
|---|---|
| `app/api/edit-report/route.ts` | Admin edit route with auth validation, diff, edit history, activity logging, harvest trigger. |
| `app/api/analysis/generate/route.ts` | Analysis generation — validates period completion, checks cache, calls Claude, caches result. |
| `app/analysis/page.tsx` | Analysis page shell. |
| `app/analysis/AnalysisPanel.tsx` | Client component with Daily/Weekly/Monthly tabs, period selector, generate button. |
| `app/activity/ActivityFilter.tsx` | Client component — wired `<select>` filter with `router.push`. |
| `app/users/page.tsx` | Users page listing all HOD users. |
| `app/users/PasswordResetForm.tsx` | Inline password reset form per user. |
| `components/form/FieldRenderer.tsx` | Extracted field type switching from admin FormRenderer. |
| `components/form/FormValidation.ts` | Extracted validation logic for admin. |

### Admin Portal — modified files

| File | Change |
|---|---|
| `app/api/daily-digest/route.ts` | Replaced BART-CNN summarisation with OpenRouter (Claude Sonnet 4.6). Includes department names. Handles sparse input. |
| `app/activity/page.tsx` | Filter now uses extracted `ActivityFilter` client component (wired `onChange`). |
| `app/reports/[id]/page.tsx` | PhotoGallery now receives signed URLs generated server-side. |
| `app/page.tsx` | Added link to Analysis tab below DailyDigestCard. |
| `app/layout.tsx` | Added "Analysis" and "Users" navigation links. |
| `components/FormRenderer.tsx` | Uses extracted FieldRenderer and FormValidation. Edits routed through `/api/edit-report` instead of direct Supabase writes. Removed `diffValues` inline function. Fixed link to `/reports/${id}/edit`. Fixed edit window text to "6:00 PM". |
| `components/PhotoGallery.tsx` | Uses signed URLs instead of authenticated storage URLs. Removed `supabaseUrl` prop. |
| `lib/hf.ts` | Re-export from `@hod/shared`. |
| `lib/openrouter.ts` | Re-export from `@hod/shared`. |
| All shared files | Re-exports from `@hod/shared` (same list as portal). |
| `package.json` | Added `@hod/shared` workspace dependency. |
| `next.config.ts` | Added `transpilePackages: ['@hod/shared']`. |

---

## AI platform split (confirmed)

| Platform | Model | Purpose | Status |
|---|---|---|---|
| **OpenRouter** | `anthropic/claude-sonnet-4.6` (with reasoning) | All text reasoning: digest, urgency, analysis, cross-departmental intelligence | Connected and tested |
| **Hugging Face (Pro)** | `facebook/detr-resnet-50`, `Salesforce/blip-image-captioning-large` | Image analysis: object detection, captioning (background processing) | Existing, upgrading to Pro |

---

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | Both Netlify sites + `.env.local` | OpenRouter API key for Claude Sonnet 4.6 |
| `HF_TOKEN` | Both Netlify sites + `.env.local` | Hugging Face Inference API token |

All existing env vars (`SUPABASE_*`, `ADMIN_PASSWORD`) unchanged.

---

## Architecture changes

### npm workspaces

The development directory (`4_development/`) is now an npm workspace root:

```
4_development/
├── package.json              ← workspace root
├── portal/                   ← HOD portal (depends on @hod/shared)
├── admin-portal/             ← Admin portal (depends on @hod/shared)
└── packages/
    └── shared/               ← @hod/shared package
        ├── types/
        ├── config/
        ├── lib/
        └── components/
```

Both apps have thin re-export files (e.g. `portal/types/index.ts` re-exports from `@hod/shared/types`). Existing `@/` import paths work unchanged. The shared package is transpiled by Next.js via `transpilePackages`.

### Photo upload flow (v2.2)

```
HOD uploads photo
  → POST /api/upload-media (instant: validate, store, return)
  → HOD sees success immediately

HOD submits report
  → POST /api/submit-report
    → Links photos to report
    → Fires POST /api/ai/process-media for each photo (non-blocking)
    → Fires urgency detection via OpenRouter (non-blocking)
```

### Analysis flow

```
Admin opens /analysis
  → Selects period type (day/week/month) and key
  → POST /api/analysis/generate
    → Check: is period complete? (day: after 6 PM next day; week: next Monday; month: next 1st)
    → Check: cached in hod_analysis_cache?
    → If cached: return cached result
    → If not: fetch reports, call Claude Sonnet 4.6, cache result, return
```

---

## What v2.2 does NOT include (deferred)

- Vision-language model analysis of photos (requires HF Pro — foundation laid)
- WhatsApp alerts for urgent flags
- PWA / service worker
- Cross-departmental action item orchestration
- Food cost projections and purchase forecasting
- Shared `config/forms.ts` in the workspace package (forms differ between apps)

---

## Deployment fixes (applied during dev deploy)

Three TypeScript compile errors surfaced during the Netlify build that did not surface locally (local dev uses Turbopack which is less strict):

| File | Error | Fix |
|---|---|---|
| `portal/app/api/submit-report/route.ts` | Supabase query builder returns `PromiseLike`, not `Promise` — `.catch()` not available | Wrapped in `Promise.resolve()` |
| `admin-portal/app/api/analysis/generate/route.ts` | `hod_departments(name)` join inferred as `{ name: any }[]` (array), cast as single object | Cast through `unknown`, handle both array/object shapes |
| `admin-portal/app/api/daily-digest/route.ts` | Same join type issue as above | Same fix |
| `admin-portal/app/api/edit-report/route.ts` | Same `PromiseLike` / `.catch()` issue | Same `Promise.resolve()` wrap |

All fixes are minimal and do not change runtime behaviour.

---

*Snapshot created: 26 March 2026.*
