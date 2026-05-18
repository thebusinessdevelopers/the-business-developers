# Phase 7 Sandbox Fix Testing Prompt

STATUS: scoping

## Current State

Not approved. Do not use this prompt until Joshua gives:

```text
APPROVED: phase_7_sandbox_fix_testing
```

## Future Mission

After approval, create an isolated sandbox or branch/worktree and test candidate fixes for:

- Head Office direct delete.
- Head Office Daily Summary access.
- Room-level pax correctness.
- Per-room constrained room configuration.
- Shared WhatsApp rooming formatter.

## Hard Limits

- Do not implement in the real dev branch.
- Do not mutate production.
- Do not run migrations without exact approval.
- Do not push, deploy, or promote production.
- Do not expose secrets or unnecessary private data.

## Required Evidence

- Tests added or updated.
- Commands run and summaries.
- Expected versus actual behaviour.
- Sandbox limitations.
- Remaining risks.
- Recommended implementation path.
