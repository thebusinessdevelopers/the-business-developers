# HOD Daily Reports — Context Guide

> **Front door for any AI agent working on this project.** Read this first. It tells you what the project is, where everything lives, and how to load context.

---

## Project overview

Ziwa Ranch has 15 departments, each with a head of department (HOD) who must submit a daily report. This project builds the system that makes that easy and reliable — starting with a web portal and admin dashboard (Phase 1, v1.6 live), evolving through WhatsApp integration, AI verification, and automated insights in later phases.

## Metadata

| Field | Value |
|---|---|
| Type | Software |
| Depth | Quick |
| Staging | Phased — Phase 1 (web portal + dashboard), Phase 2 (WhatsApp), Phase 3 (AI agent), Phase 4 (insights & automation) |
| Complexity stance | Simple as possible — functional first, iterate later |
| Current phase | Phase 1 v1.6 live. Phase 2 blocked on Meta setup. |
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
│   ├── next_chat_handover.md   ← Current build state + next steps (read for any dev task)
│   ├── 01_portal_build.md      ← Phase 1 build log
│   ├── 02_whatsapp_build.md    ← Phase 2 build log + setup checklist
│   └── portal/                 ← Next.js source code (deployed to Netlify)
├── 5_operation/                ← Empty — will hold guides, records, and stakeholder index
└── versions/
    ├── v1/snapshot.md          ← V1 project snapshot (point-in-time record)
    ├── v1.2/snapshot.md        ← V1.2 snapshot
    ├── v1.4/snapshot.md        ← V1.4 snapshot
    └── v1.6/snapshot.md        ← V1.6 snapshot (current)
```

## Context loading

### Targeted
Read this file only. You know what the project is, where everything lives, and what's happening next.

### Standard
Read in order:
1. This file (done)
2. `4_development/next_chat_handover.md` — current build state and next steps
3. `1_context/project_summary.md` — plain-language overview
4. `3_architecture/design.md` — Phase 1 system design
5. `3_architecture/design_phase2.md` — Phase 2 WhatsApp design
6. `3_architecture/build_rules.md` — scope boundaries and standards

### Deep
Everything in Standard, then:
- `1_context/brainstorm.md` (full brainstorm — synthesis is at the end)
- `3_architecture/materials_tools_list.md`
- `4_development/02_whatsapp_build.md` — Phase 2 setup checklist and progress
- `4_development/01_portal_build.md` — Phase 1 build history
- `versions/v1.6/snapshot.md` — current version snapshot
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
| DB tables | `hod_departments` (15), `hod_daily_reports`, `hod_verified_stock`, `hod_item_library` |
| DB timezone | `Africa/Kampala` |
| Frontend | Next.js 16, Tailwind v4, React 19 — code at `4_development/portal/` |
| Live URL | `https://hoddailyreports.netlify.app` |
| Dashboard | `https://hoddailyreports.netlify.app/dashboard` (password-protected) |
| Hosting | Netlify — project ID `3e5bb9b4-c0b2-4031-9f28-0132cbb1d303` |
| Repository | `https://github.com/thebusinessdevelopers/hod_daily_reports` |

## Recent changes

- 14/03/2026 — Project created. Phase 1 portal built. Deployed to Netlify.
- 14/03/2026 — Phase 2 started. Meta Business registration underway.
- 14/03/2026 — **v1.2 live.** Rebranded with Ziwa identity, all forms refined, 3 new departments added (IT, Wildlife, Craft Shop), admin dashboard with stats and report viewer. Commit `cceeffb`.
- 15/03/2026 — HOD rollout complete. First reports received. System performing correctly.
- 15/03/2026 — **v1.4 live.** Save Draft, F&B/Store overhaul, stock projection, three-tier late timing, silent item harvesting. Commit `d0bf233`.
- 16/03/2026 — **v1.6 live.** Report editing + audit trail, autocomplete, auto-calculations, stock reconciliation, dashboard upgrades (CSV export, compliance tracking, acknowledgements), name selector rework, Africa/Kampala timezone, KML-sourced locations, form refinements across all 15 departments. Commit `a53a538`. Ready for v1.8 planning.
