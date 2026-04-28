# P3F-02 Daily Brief Regeneration Policy Investigation

STATUS: in-progress
Date: 2026-04-26
Swarm model: `composer-2-fast`

## Question

When should the admin dashboard automatically regenerate the Daily Brief under the current synchronous v2.12 architecture?

## Current Behaviour

`DailyDigestCard` currently:

- fetches `GET /api/daily-digest`,
- treats `pending` or `stale` as a reason to call `POST /api/daily-digest`,
- sends that automatic POST with `{ force: true }`,
- polls every 15 seconds while pending or stale,
- relies on a client ref to avoid repeated POSTs in the same mount.

## Problems

- Because P3F-01 causes false stale responses, a normal warm cache can trigger a full multi-agent regeneration.
- Automatic POST uses `force: true`, which bypasses the server cache short-circuit and always runs the expensive OpenRouter path when reports exist.
- Stale does not necessarily mean urgent. A renderable stale brief is still useful to the admin; silent regeneration is costly.
- The fire-and-forget auto POST ignores the response and waits for the next GET.
- Repeated page loads by multiple admins can create avoidable OpenRouter calls.

## Recommended Policy

Use this policy for v2.12:

| State | UI behaviour | POST behaviour |
| --- | --- | --- |
| No reports | Show no-report state. | No POST. |
| Reports exist, no cache row (`pending: true`) | Auto-generate once to create the first brief. | POST with `force: false`. |
| Cache row exists and fresh | Render cached brief. | No POST. |
| Cache row exists and stale | Render cached brief with a small stale notice. | No automatic POST; user can click Regenerate. |
| User clicks Regenerate | Await response and update UI. | POST with `force: true` and optional feedback. |

## Why This Policy

It keeps v2.12 simple and reduces cost/rate-limit exposure. It also matches Joshua's direction: do not rebuild the async architecture now; refine the synchronous path for efficiency, reliability, and performance.

## Simplest Implementation Shape

- Fix P3F-01 first so `stale` is trustworthy.
- Change the auto-kick condition from `pending || stale` to `pending`.
- Change automatic `kickOffRegenerate` to send `{ force: false }`.
- Keep manual `submitRegenerate` as `{ force: true, feedback }`.
- Optionally show a small line when `stale && digest`: "New data may be available. Regenerate to update."

## Tests To Write First

1. `auto regeneration does not run for stale cache with digest`
   - Fixture: `pending: false`, `stale: true`, `report_count > 0`, `digest` present.
   - Desired pass: no POST.

2. `auto regeneration runs once for pending cache`
   - Fixture: `pending: true`, `report_count > 0`.
   - Desired pass: one POST with `force: false`.

3. `manual regenerate uses force true`
   - Fixture: user clicks Regenerate.
   - Desired pass: one POST with `force: true` and optional feedback.

4. `fresh cache resets auto kick state`
   - Fixture: fresh GET response after previous pending episode.
   - Desired pass: future pending state can trigger once again.

## Validation

Automated:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Manual after deploy:

- Warm-cache dashboard hard refresh twice; second load should not POST.
- Cold-cache or deleted-row test should trigger one auto generation.
- Manual Regenerate should POST once and update UI.
- OpenRouter call count should not spike from idle dashboard visits.
