# v2.12 Phase Two Recovery Index

STATUS: complete; Phase E is the current source of truth.

This folder records the April 2026 recovery work for v2.12 AI and Daily Brief reliability. It is not the same as `phase_1_development/plan.md` Phase 2, which was the original form-and-logic implementation phase.

## Read Order

| Need | Read |
| --- | --- |
| Current result and production architecture | `phase_e_delivery.md` |
| Final release recommendation prompt | `phase_release_recommendation_prompt.md` |
| Recovery plan and sequencing | `phase_two_plan.md` |
| Original master synthesis before execution | `04_master_synthesis.md` |
| Evidence from 20 Apr testing | `../phase_1_development/tests.md/20_04_test.md` |

## Execution Chain

| Phase | File | Status | Meaning |
| --- | --- | --- | --- |
| A | `phase_a_delivery.md` | Complete | Fixed OpenRouter/local generation issues. |
| B | `phase_b_delivery.md` | Complete | Aligned cache schema for Daily/Weekly/Trend period types. |
| C | `phase_c_delivery.md` | Complete | Mirrored source into deploy repos and pushed admin `dev`. |
| D | `phase_d_delivery.md` | Complete but blocked | Found background function URL/routing failure. |
| D2 | `phase_d2_agent_prompt.md` and later notes | Superseded | Background function accepted 202 but did not persist `daily_brief`. |
| E | `phase_e_delivery.md` | Complete | Removed background function path and shipped direct synchronous regeneration. |

## Historical Snapshots

The numbered files `00_recovery_sequence.md` through `04_master_synthesis.md` and the early `phase_*_agent_prompt.md` files are planning and investigation snapshots. They are useful for understanding what was known at that time, but they may describe a background-function architecture that is no longer current.

As of 26 Apr 2026, the Daily Brief source of truth is:

```text
POST /api/daily-digest -> runDailyDigestGeneration() -> hod_analysis_cache daily_brief
```

Do not diagnose v2.12 by starting with Netlify Background Functions unless a future approved change explicitly reintroduces them.
