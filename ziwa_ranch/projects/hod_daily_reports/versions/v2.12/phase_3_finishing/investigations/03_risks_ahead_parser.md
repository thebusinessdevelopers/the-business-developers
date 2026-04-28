# P3F-03 `RISKS AHEAD` Parser Investigation

STATUS: in-progress
Date: 2026-04-26
Swarm model: `composer-2-fast`

## Question

Does the Daily Brief UI correctly render the optional `RISKS AHEAD` section promised by the v2.12 multi-agent Daily Brief prompt?

## Finding

No. The audit finding is correct.

The orchestrator prompt permits an optional fifth section:

```text
RISKS AHEAD
```

The client parser only recognises:

```text
OVERVIEW
HIGHLIGHTS
ACTION ITEMS
NOT YET REPORTED
```

Therefore `RISKS AHEAD` is not split into its own UI section. It is appended inside the previous section body, usually `NOT YET REPORTED`.

## Recommended Fix

Smallest safe fix:

- Add `RISKS AHEAD` to the recognised section headers.
- Preserve the current exact-line matching behaviour.
- Add regression tests for four-section and five-section briefs.

Best testability fix:

- Move `parseDigestSections` out of `DailyDigestCard.tsx` into a small pure helper module.
- Import the helper back into the card.
- Unit-test the helper directly.

## Tests To Write First

1. `parse digest sections supports risks ahead`
   - Input: Daily Brief with all four standard headers plus `RISKS AHEAD`.
   - Current failure: only four sections; risks text sits inside `NOT YET REPORTED`.
   - Desired pass: five sections; final section title is `RISKS AHEAD`.

2. `parse digest sections preserves four section briefs`
   - Input: existing four-section brief.
   - Desired pass: existing section titles and bodies unchanged.

3. Optional: `parse digest sections handles empty risks body`
   - Input: `RISKS AHEAD` with no body.
   - Desired pass: section exists with empty body.

## Validation

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Manual after deploy:

- Use or simulate a brief containing `RISKS AHEAD`.
- Confirm it renders as a distinct section.
- Confirm a normal four-section brief is unchanged.
