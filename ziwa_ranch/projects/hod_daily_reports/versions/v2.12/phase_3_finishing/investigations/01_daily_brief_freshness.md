# P3F-01 Daily Brief Freshness Investigation

STATUS: in-progress
Date: 2026-04-26
Swarm model: `composer-2-fast`

## Question

Is the audit finding correct that `GET /api/daily-digest` compares a report-only signature against the composite signature stored by `runDailyDigestGeneration`?

## Finding

Yes. The finding is correct.

The generator stores a composite signature:

```text
buildReportSignature(reportRows) + "|" + hashJsonStable(subAgentInputs)
```

The GET handler currently computes only:

```text
buildReportSignature(reportRows)
```

It then compares that report-only value to `cachedData.signature`. A normal v2.12 cache row therefore looks stale even when it was just generated and is still valid.

## Evidence

Relevant implementation files:

- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/daily-digest-generation.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/app/api/daily-digest/handler.ts`
- `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal/lib/analysis-reliability.ts`

Generation builds and stores the full composite signature. Generation's internal cache-read path also compares against that same composite signature when `force` is false.

GET does not rebuild the sub-agent inputs hash. It only sees report rows, so it cannot correctly decide whether the cached Daily Brief is fresh under the v2.12 D-02 contract.

## Edge Cases

- A v2.12 composite cache row can be falsely marked stale.
- A legacy report-only cache row can be falsely marked fresh even if operational inputs changed.
- No-report days are unaffected because GET returns before comparing signatures.
- The two-hour freshness window is not enough by itself; the signature side of the check must be correct.

## Fix Options

| Option | Summary | Assessment |
| --- | --- | --- |
| A | Extract a shared function that computes the same composite Daily Brief signature for GET and generation. | Recommended. Correct and keeps one source of truth. |
| B | Store split fields such as `report_signature` and `inputs_hash`. | Clearer, but larger payload/schema semantics change. |
| C | Accept report-only freshness on GET. | Not acceptable for v2.12 because operational inputs can change without report edits. |

## Recommended Fix

Use option A.

Create a small shared freshness/signature helper that:

- fetches or accepts the required non-AI Daily Brief inputs,
- builds the same `subAgentInputs` shape used by generation,
- computes `inputsHash`,
- returns the composite signature,
- exposes a freshness check with an injectable `now` for tests.

The helper should be used by both:

- `GET /api/daily-digest`
- `runDailyDigestGeneration`

## Tests To Write First

1. `daily brief freshness marks matching composite cache as fresh`
   - Fixture: report rows and operational inputs match cached signature.
   - Current expected failure: GET marks `stale: true`.
   - Desired pass: GET returns `stale: false`.

2. `daily brief freshness marks changed operational inputs as stale without report edits`
   - Fixture: same report rows, changed stock/bookings/action items input.
   - Current expected failure: no reliable way to detect because GET does not compute inputs hash.
   - Desired pass: GET returns `stale: true`.

3. `daily brief signature helper matches generation signature`
   - Fixture: same report rows and sub-agent inputs.
   - Desired pass: helper output equals stored generated signature.

## Validation Commands

Run from `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/admin-portal`:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

If TypeScript tests remain outside `npm test`, run the TypeScript test command added by P3F-04 as well.
