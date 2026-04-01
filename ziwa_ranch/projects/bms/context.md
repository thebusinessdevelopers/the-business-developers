# BMS (Business Management Software) — Context Guide

> **Front door for any AI agent working on this project.** Read this first. It tells you what the project is, where everything lives, and how to load the right level of context for your task.

---

## Project overview

| Field | Value |
|---|---|
| Type | Software |
| Depth | Deep |
| Staging | Staged — V1: core platform (staff reporting, admin dashboard, stock management, communication). V2: Point of Sale. V3+: advanced analytics, client onboarding portal, further modules. |
| Complexity stance | Simple as possible — seamless, robust functionality. No overcomplication. |
| Current phase | **Development** |
| Started | 30 March 2026 |

BMS is a hospitality and tourism business management platform — a single unified product that any lodge, hotel, or tourism operation can onboard, configure, and use without any custom development. Intelligence is the centrepiece: the system collects operational data across every department, processes it cleanly, and surfaces what matters to the right people at the right time. It replaces legacy systems like Karibu not by doing the same thing better, but by doing what they cannot — connecting the dots across departments, spotting problems before they become crises, and giving owners and managers an accurate, real-time picture of their entire operation. Ziwa Rhino and Wildlife Ranch is the first client and live proving ground. The architecture is generic and multi-tenant from day one.

## Project structure

```
bms/
├── context.md              ← You are here
├── 1_context/
│   ├── brainstorm.md       ← Brainstorm record (pre-brainstorm context seeded)
│   └── project_summary.md  ← Stakeholder summary (created after brainstorm)
├── 2_research/
│   ├── successful_examples.md
│   ├── market_research.md
│   ├── competition.md
│   └── creative_solutions.md
├── 3_architecture/
│   ├── design.md
│   ├── materials_tools_list.md
│   ├── build_rules.md
│   └── prd/
├── 4_development/
└── 5_operation/
    ├── stakeholder_index.md
    ├── guides/
    ├── notes/
    ├── records/
    ├── media/
    └── scripts/
```

### Related project (reference, not part of BMS)

The HOD Daily Reports system at `ziwa_ranch/projects/hod_daily_reports/` is the predecessor — a proven staff reporting and admin dashboard system at v2.5 in production. Its architecture, database schema, and operational learnings are valuable context for BMS design, but BMS is a ground-up rebuild on a clean database.

## Standing operating rule — one phase per chat

**Every chat executes exactly one phase.** At the end of every chat, the AI produces a `next_chat_handover.md` at the project root. The next chat reads the handover, loads the context it specifies, and executes its single phase. This applies for the entire lifetime of the project — planning, research, architecture, development, and operation.

**To start a new chat on this project:**
> "Read `ziwa_ranch/projects/bms/next_chat_handover.md` and follow the instructions."

---

## How to load context

### For a specific task (Targeted)
1. Read the "Project overview" section above
2. Identify which section your task relates to
3. Read the files in that section, plus any foundational files listed below

**Foundational files (always relevant):**
- `3_architecture/build_rules.md` — for any build or architecture task
- `5_operation/stakeholder_index.md` — for any operational or people-related task
- `3_architecture/design.md` — for any task that might affect project structure

### For a working foundation (Standard)
Read these files in order:
1. This file (done)
2. `1_context/project_summary.md`
3. The synthesis section at the end of `1_context/brainstorm.md`
4. `3_architecture/design.md`
5. `3_architecture/build_rules.md`
6. `5_operation/stakeholder_index.md`
7. `change_log.md` (if it exists)

### For full understanding (Deep)
Read everything in Standard, then:
- Full `1_context/brainstorm.md`
- All files in `2_research/`
- `3_architecture/materials_tools_list.md`
- All files in `3_architecture/prd/`
- All files in `4_development/`
- All files in `5_operation/guides/`
- All files in `5_operation/scripts/`
- Recent files in `5_operation/records/`

## Key people

| Role | Person |
|---|---|
| Project owner / architect | Joshua |
| First client GM (Ziwa) | Wellington |
| First client IT (Ziwa) | Benson |

## Recent changes

- 30/03/2026 — Project created. Workspace initialised. Pre-brainstorm context seeded from HOD v2.5 and Karibu research.
- 30/03/2026 — Brainstorm complete. Product philosophy, module roadmap, architecture decisions, intelligence layer vision, and six open questions for research/architecture all captured. Project summary written. Moving to research phase.
- 30/03/2026 — Research complete. Five key findings: intelligence gap confirmed, offline-first required, mobile money first-class, WhatsApp+spreadsheets the real incumbent, Karibu has zero intelligence. Moving to architecture phase.
- 30/03/2026 — Architecture complete. Full schema (18 tables), RLS model, offline-first spec, intelligence trigger model, 9 department templates, 5 PRDs with 131 testable requirements. Moving to development.
