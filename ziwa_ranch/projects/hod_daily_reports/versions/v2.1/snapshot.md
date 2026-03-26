# HOD Daily Reports — Version 2.1 Snapshot

> **Purpose:** Point-in-time record of Version 2.1. Documents all changes from v2.0.
>
> **Built on:** 26 March 2026
> **Status:** v2.1 built on dev branch. Not yet merged to production.
> **Base version:** v2.0 (see `versions/v2.0/snapshot.md`)
> **Dev preview (HOD):** https://dev--hoddailyreports.netlify.app
> **Dev preview (Admin):** https://dev--hod-admin-portal.netlify.app

---

## What v2.1 is

Nine phases of feature additions and architectural changes on top of v2.0:

- **Phase A** — Photo attachments. AI-powered photo uploads with auto-generated filenames following the `YYYY_MM_DD_project_department_description` naming convention. Supabase Storage bucket, `hod_report_media` table, admin photo gallery, automated daily media sync to Google Drive via Python script.
- **Phase B** — Inventory grid. Replaced inefficient repeater fields for Kitchen, Store, and F&B with a tap-to-select grid component. Pre-populated from `hod_item_library`, quantity steppers, previous-report hints, running cost totals.
- **Phase C** — Activity log and edit logging. New admin `/activity` page showing all user actions. New server-side `/api/edit-report` route centralising edit logic, computing diffs, and logging to `hod_activity_log`. Closes the edit-logging blind spot from v2.0.
- **Phase D** — Password self-service. HODs can change their own password at `/account`. Admin can reset any user's password via `/api/reset-password`.
- **Phase E** — Announcements. `hod_announcements` table with priority levels, department targeting, and expiry. Admin management UI at `/announcements`. Announcements display on the HOD department hub.
- **Phase F** — Pre-fill from previous report. "Start from previous report" button on DepartmentHub. Server fetches latest report data (excluding photos) and passes to `NewReportForm` as initial values.
- **Phase G** — Admin overview enhancements. Dashboard cards now show the last submitted date per department and display red gap warnings when a department hasn't reported in 3+ days.
- **Phase H** — Security and fixes. Centralised `verifyAdminAuth` helper applied to all 8 admin API routes. Fixed the admin login redirect bug (`/dashboard` → `/report/[slug]`).
- **Phase I** — Hugging Face AI integration. Replaced OpenAI GPT-4o dependency with `@huggingface/inference`. Multi-model photo pipeline (object detection via DETR, zero-shot classification via BART-MNLI). Urgency detection on report notes (writes `ai_flags` JSONB column). Daily digest summarisation API and "Today's Highlights" card on admin overview. Urgency badges on admin report list and overview.

---

## Database changes (migrations 008–011)

| Migration | What it does |
|---|---|
| `008_report_media.sql` | Creates `hod_report_media` table for photo metadata. Links to reports and departments. Includes `synced_locally` flag for Drive sync. |
| `009_item_library_defaults.sql` | Adds `default_unit` and `default_cost_per_unit` columns to `hod_item_library`. |
| `010_announcements.sql` | Creates `hod_announcements` table with priority, department targeting, expiry, and active flag. |
| `011_ai_flags.sql` | Adds `ai_flags jsonb` column to `hod_daily_reports` for urgency detection results. |

Supabase Storage bucket `hod-report-media` created for photo uploads.

---

## New and modified files

### HOD Portal — new files

| File | Purpose |
|---|---|
| `lib/hf.ts` | Shared Hugging Face InferenceClient singleton |
| `app/api/upload-media/route.ts` | Photo upload with HF multi-model AI pipeline |
| `app/api/edit-report/route.ts` | Server-side edit with diff computation and activity logging |
| `app/api/change-password/route.ts` | HOD password change |
| `app/api/inventory-items/[slug]/route.ts` | Inventory item library and previous quantities |
| `app/account/page.tsx` | Account page with password change form |
| `app/account/ChangePasswordForm.tsx` | Client-side password change form |
| `components/PhotoUploader.tsx` | Photo selection, description, category, upload UI |
| `components/InventoryGrid.tsx` | Tap-to-select inventory input with quantity steppers |
| `supabase/migrations/008–011` | Database migrations |

### HOD Portal — modified files

| File | Change |
|---|---|
| `types/index.ts` | Added `photo`, `inventory_grid` field types, `PhotoConfig`, `InventoryGridConfig`, `ReportMedia` interfaces |
| `config/forms.ts` | Photo sections for Electrical/Housekeeping/Security/Kitchen. Inventory grid for Kitchen/Store/F&B. General photo section injection via `getFormBySlug`. |
| `components/FormRenderer.tsx` | Renders `photo` and `inventory_grid` field types. Removed client-side edit diffing. |
| `app/api/submit-report/route.ts` | Links photos to report post-submission. Fire-and-forget HF urgency detection on `challenges_successes`. |
| `app/api/harvest-items/route.ts` | Extended rules to capture `default_unit` and `default_cost_per_unit`. |
| `app/api/auth/login/route.ts` | Fixed admin redirect from `/dashboard` to `/report/[slug]`. |
| `app/report/[slug]/page.tsx` | Fetches announcements and prefill data. |
| `app/report/[slug]/DepartmentHub.tsx` | Account link, pre-fill button, announcements display. |
| `app/report/[slug]/new/page.tsx` | Prefill search param handling. |
| `app/report/[slug]/new/NewReportForm.tsx` | Accepts and passes `prefillData`. |
| `package.json` | Added `@huggingface/inference`, removed `openai`. |

### Admin Portal — new files

| File | Purpose |
|---|---|
| `lib/admin-auth.ts` | Shared `verifyAdminAuth` helper (HMAC cookie check) |
| `lib/hf.ts` | Shared Hugging Face InferenceClient singleton |
| `app/activity/page.tsx` | Activity log page with filtering and pagination |
| `app/announcements/page.tsx` | Announcement management server page |
| `app/announcements/AnnouncementManager.tsx` | Create/deactivate announcements client component |
| `app/api/announcements/route.ts` | POST (create) and DELETE (deactivate) announcements |
| `app/api/daily-digest/route.ts` | HF summarisation of today's report notes |
| `app/api/reset-password/route.ts` | Admin password reset |
| `components/DailyDigestCard.tsx` | "Today's Highlights" card on admin overview |
| `components/PhotoGallery.tsx` | Read-only photo display for admin report detail |

### Admin Portal — modified files

| File | Change |
|---|---|
| `app/page.tsx` | DailyDigestCard, urgency/maintenance alert banners, `ai_flags` in report query |
| `app/reports/page.tsx` | `ai_flags` in query, urgency badge computation |
| `app/reports/ReportsTable.tsx` | `urgencyLabel`/`urgencyClasses` props, inline badges |
| `app/reports/[id]/page.tsx` | PhotoGallery integration, media query |
| `app/layout.tsx` | Navigation links to `/activity` and `/announcements` |
| `components/FormRenderer.tsx` | Read-only rendering for `photo` and `inventory_grid` fields |
| `types/index.ts` | Synced with portal (photo, inventory_grid types) |
| `All 8 API routes` | `verifyAdminAuth` check added to every handler |
| `package.json` | Added `@huggingface/inference`, `bcryptjs`, `@types/bcryptjs` |

---

## Automated media sync

New Python tool at `global/projects/hod_media_sync/`:

| File | Purpose |
|---|---|
| `media_sync.py` | Downloads unsynced media from Supabase Storage, marks as synced, triggers Google Drive sync |
| `config.yaml` | Supabase bucket, local path, Drive sync script path |
| `requirements.txt` | `pyyaml`, `requests` |
| `com.thebusinessdevelopers.hod-media-sync.plist` | macOS launchd schedule (daily at midnight) |

---

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `HF_TOKEN` | Both Netlify sites + `.env.local` | Hugging Face Inference API token (Read scope) |
| `OPENAI_API_KEY` | Removed | No longer needed — replaced by HF |

---

## AI model status (free tier)

| Model | Task | Status |
|---|---|---|
| `facebook/detr-resnet-50` | Object detection (photos) | Working |
| `facebook/bart-large-mnli` | Zero-shot classification (category verification, urgency detection) | Working |
| `facebook/bart-large-cnn` | Summarisation (daily digest) | Working |
| `Salesforce/blip-image-captioning-large` | Image captioning | Unavailable on free tier — graceful fallback to HOD description |

---

## What v2.1 does NOT include (deferred)

- Image captioning (requires HF Pro or alternative provider)
- Vision-language model analysis of photos
- Deep cross-departmental analytics
- WhatsApp alerts for urgent flags
- PWA / service worker

---

*Snapshot created: 26 March 2026.*
