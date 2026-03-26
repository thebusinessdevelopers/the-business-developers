# HOD Daily Reports — Context Guide

> **Front door for any AI agent working on this project.** Read this first. It tells you what the project is, where everything lives, and how to load context.

---

## Project overview

Ziwa Rhino And Wildlife Ranch has 15 departments, each with a head of department (HOD) who must submit a daily report. This project builds the system that makes that easy and reliable — starting with a web portal and admin dashboard (Phase 1, v1.9 live), evolving through WhatsApp integration, AI verification, and automated insights in later phases.

## Metadata

| Field | Value |
|---|---|
| Type | Software |
| Depth | Quick |
| Staging | Phased — Phase 1 (web portal + dashboard), Phase 2 (WhatsApp), Phase 3 (AI agent), Phase 4 (insights & automation) |
| Complexity stance | Simple as possible — functional first, iterate later |
| Current phase | **v2.0 complete (Phases A–F).** Phase 2 (WhatsApp) blocked on Meta setup. |
| Started | 14 March 2026 |

## Folder structure

```
hod_daily_reports/
├── context.md                  ← You are here
├── 1_context/
│   ├── brainstorm.md           ← Full brainstorm record (synthesis at the end)
│   └── project_summary.md      ← Stakeholder summary (plain language)
├── 3_architecture/
│   ├── design.md               ← Technical design for Phase 1
│   ├── design_v1.4.md          ← v1.4 design addendum
│   ├── design_phase2.md        ← Technical design for Phase 2 (WhatsApp)
│   ├── materials_tools_list.md ← Tech stack and services
│   └── build_rules.md          ← Standards, principles, and scope boundaries
├── 4_development/
│   ├── next_chat_handover.md   ← v1.x build state (historical)
│   ├── next_chat_handover_v2.md ← **v2 build handover — read this for any v2 dev task**
│   ├── 01_portal_build.md      ← Phase 1 build log
│   ├── 02_whatsapp_build.md    ← Phase 2 build log + setup checklist
│   ├── portal/                 ← HOD portal Next.js source (deployed to Netlify)
│   └── admin-portal/           ← Admin dashboard Next.js source (separate Netlify site)
├── 5_operation/
│   ├── hod_user_guide.md      ← Plain-language guide for HODs (login, submit, draft, edit, offline)
│   └── admin_guide.md         ← Admin portal guide for Joshua/Wellington
└── versions/
    ├── v1/snapshot.md          ← V1 project snapshot (point-in-time record)
    ├── v1.2/snapshot.md        ← V1.2 snapshot
    ├── v1.4/snapshot.md        ← V1.4 snapshot
    ├── v1.6/snapshot.md        ← V1.6 snapshot
    ├── v1.8/snapshot.md        ← V1.8 snapshot
    ├── v1.9/snapshot.md        ← V1.9 snapshot
    └── v2.0/snapshot.md        ← V2.0 snapshot (current)
```

## Context loading

### Targeted
Read this file only. You know what the project is, where everything lives, and what's happening next.

### Standard
Read in order:
1. This file (done)
2. `4_development/next_chat_handover_v2.md` — **v2 build handover (read this for any v2 work)**
3. `4_development/next_chat_handover.md` — v1.x build state (historical reference)
4. `1_context/project_summary.md` — plain-language overview
5. `3_architecture/design.md` — Phase 1 system design
6. `3_architecture/build_rules.md` — scope boundaries and standards

### Deep
Everything in Standard, then:
- `1_context/brainstorm.md` (full brainstorm — synthesis is at the end)
- `3_architecture/materials_tools_list.md`
- `4_development/02_whatsapp_build.md` — Phase 2 setup checklist and progress
- `4_development/01_portal_build.md` — Phase 1 build history
- `versions/v2.0/snapshot.md` — current version snapshot
- Source code in `4_development/portal/config/forms.ts` and `components/FormRenderer.tsx`

## Key people

| Role | Person |
|---|---|
| Project owner | Joshua |
| General Manager | Wellington |
| HODs | Robert, Emilly, Musoni, Sensio, Elly, Kanja & Roger, David, Howard, Salim, Denis, Jjuko, Richard, Benson, Martine, Halima |

## Technical state

| Service | Detail |
|---|---|
| Supabase project | Shared with restaurant management system — `inidzwfjnkyinxhvbrdt` |
| Supabase URL | `https://inidzwfjnkyinxhvbrdt.supabase.co` |
| DB tables | `hod_departments` (15), `hod_daily_reports`, `hod_verified_stock`, `hod_item_library`, `hod_drafts`, `hod_error_log`, `hod_users`, `hod_sessions`, `hod_activity_log` |
| DB timezone | `Africa/Kampala` |
| Frontend (HOD) | Next.js 16, Tailwind v4, React 19 — code at `4_development/portal/` |
| Frontend (Admin) | Next.js 16, Tailwind v4, React 19 — code at `4_development/admin-portal/` |
| HOD portal URL | `https://hoddailyreports.netlify.app` |
| Admin portal URL | `https://hod-admin-portal.netlify.app` |
| Hosting | Netlify — HOD: `3e5bb9b4-c0b2-4031-9f28-0132cbb1d303`, Admin: `d501089b-06cc-4d50-84eb-cb5ab4890b9b` |
| Repository (monorepo) | `https://github.com/thebusinessdevelopers/the-business-developers` |
| Repository (HOD deploy) | `https://github.com/thebusinessdevelopers/hod_daily_reports` |
| Repository (Admin deploy) | `https://github.com/thebusinessdevelopers/hod_admin_portal` |
| Branching | `main` = production, `dev` = development preview (all three repos) |

## Recent changes

- 14/03/2026 — Project created. Phase 1 portal built. Deployed to Netlify.
- 14/03/2026 — Phase 2 started. Meta Business registration underway.
- 14/03/2026 — **v1.2 live.** Rebranded with Ziwa identity, all forms refined, 3 new departments added (IT, Wildlife, Craft Shop), admin dashboard with stats and report viewer. Commit `cceeffb`.
- 15/03/2026 — HOD rollout complete. First reports received. System performing correctly.
- 15/03/2026 — **v1.4 live.** Save Draft, F&B/Store overhaul, stock projection, three-tier late timing, silent item harvesting. Commit `d0bf233`.
- 16/03/2026 — **v1.6 live.** Report editing + audit trail, autocomplete, auto-calculations, stock reconciliation, dashboard upgrades (CSV export, compliance tracking, acknowledgements), name selector rework, Africa/Kampala timezone, KML-sourced locations, form refinements across all 15 departments. Commit `a53a538`.
- 16/03/2026 — **v1.8 live.** Fixed critical submission bug (RLS), error infrastructure, DB drafts, structured review workflow with three-colour dot system, HOD inline editing, Monday-only stock gating, dynamic deadline badge, HOD landing page redesign, admin date change, admin report deletion, F&B crash fix, timezone corrections, rebranded to Ziwa Rhino And Wildlife Ranch. Commit `322fff0`.
- 16/03/2026 — **v1.9 live.** Kitchen stock overhaul (Monday-only count, daily stock added/used repeaters, projections, auto-calculated food cost). On-duty checkbox pickers for Kitchen and F&B across breakfast/lunch/dinner. FormRenderer stock write refactored to config-driven. Commit `63c57da`.
- 25/03/2026 — **v2.0 Phase A live.** Custom auth with login picker, guest flow, session management, admin portal separated into standalone app. 5 new substitute accounts. Commit `26f092a`.
- 25/03/2026 — **v2.0 Phase B complete.** Two-stage HOD hub with smart date buttons, server-side submission (`POST /api/submit-report`), read-only report viewer, edit window extended to 6 PM, draft management extracted to hook, same-day warning modal. Build handover at `4_development/next_chat_handover_v2.md`. Snapshot at `versions/v2.0/snapshot.md`.
- 25/03/2026 — **v2.0 Phase C complete.** Admin portal: compliance timezone fix (Kampala-aware dates), rate formula fix (excludes Sundays, today before 4 PM), batch review on reports page, date change merged into admin edit form, WhatsApp compliance message button, admin report detail uses FormRenderer readOnly mode, submission-status.ts synced with portal (6 PM edit window), dead files cleaned up.
- 26/03/2026 — **v2.0 Phase D complete.** Connectivity resilience: dual-write drafts (Supabase + localStorage), submission queue with automatic retry on reconnect, connectivity banner. No PWA or service worker — browser APIs only. No database changes.
- 26/03/2026 — **v2.0 Phase E complete.** Form updates: Housekeeping 20-room grid (grouped by building, conditional Vacant/Occupied fields), Kitchen near-expired items repeater, legacy report handling in admin portal. No database changes.
- 26/03/2026 — **v2.0 Phase F complete.** Documentation: updated context.md, project_summary.md, build_rules.md. Created HOD user guide and admin guide in `5_operation/`. Finalised snapshot and handover.
- 26/03/2026 — **Deployment and branching setup.** Both portals now deploy from GitHub via Netlify. Admin portal repo created (`hod_admin_portal`). Dev/prod branching on all repos — `main` for production, `dev` for development previews.
