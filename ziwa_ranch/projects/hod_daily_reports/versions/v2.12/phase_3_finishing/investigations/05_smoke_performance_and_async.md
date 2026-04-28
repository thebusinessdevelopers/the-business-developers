# P3F-05/P3F-06 Smoke, Performance, And Async Deferral Investigation

STATUS: in-progress
Date: 2026-04-26
Swarm model: `composer-2-fast`

## Purpose

This investigation consolidates the post-implementation smoke plan, performance plan, and the deferred async/background AI note for v2.12 Phase 3 Finishing.

## Post-Implementation Smoke Matrix

Run only after P3F implementation is complete and deployed to `dev`.

| ID | Check | Expected result |
| --- | --- | --- |
| D5.1 | Admin `/logo.png` | HTTP 200, image body. |
| D5.2 | Portal `/logo.png` | HTTP 200, image body. |
| D5.3 | Portal booking UI | Rooms and booking UI load without unhandled errors. |
| D5.4 | Submit report with 2+ day lag and no `confirm_offset` | 4xx JSON with `needsConfirmOffset: true`; no insert. |
| D5.5 | Same lagged submit with `confirm_offset: true` | 200 success shape. |
| D6.1 | Admin booking: Augustu per-person, complimentary room, chalet pax override | All behave as v2.12 plan states. |
| D6.2 | Portal submit-report today, lag confirmation, queue replay | Success paths work and drafts are not wrongly cleared. |
| D6.3 | Meeting attendance mode | Head Office attendees appear, phone/in-person mode stores and displays. |
| D6.4 | Rate display | Karungi FB STO 2026 = 300; Single Room BB 2026 = 85; A-Frame BB 2026 = 300. |
| D6.5 | A-Frame names | Mvule, Musambya, Mugavu, Mukooge appear in admin and HOD surfaces. |
| D6.6 | Isaac Room Management | `admin.isaac` can access Room Management, or item is explicitly waived with reason. |
| R1 | Daily Brief post-P3F | Fresh cache does not false-stale; stale cache does not auto-regenerate; `RISKS AHEAD` renders. |
| R2 | Daily Brief API latency | Cached GET is fast; synchronous POST is measured and recorded honestly. |
| R3 | Feedback validation | 600-character feedback returns 400; valid feedback returns 200. |

Recommended smoke report path:

```text
/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_3_finishing/p3f_05_post_implementation_smoke_report.md
```

## Performance Validation Plan

Do not introduce heavy load testing unless real concurrency issues appear. This is an admin tool with low expected traffic; proportional real-world timing is more useful.

Measure:

- `GET /api/daily-digest` with a fresh cache.
- `POST /api/daily-digest` with `force: true`.
- Manual Daily Brief Regenerate perceived browser latency.
- Admin booking save/reopen.
- HOD report submit and lag confirmation.
- Queue replay, where practical.

Suggested initial thresholds for Joshua to approve:

| Path | Proposed threshold |
| --- | --- |
| Cached Daily Brief GET | p95 under 2 seconds on dev. |
| Synchronous Daily Brief POST | Must complete within platform limits; record p95 and max across several real report days before approving a number. |
| HOD submit | User-visible success within 3-5 seconds for normal path. |
| Admin booking save/reopen | No obvious multi-second blocking outside normal network variance. |

No-go signals:

- Daily Brief POST times out or returns frequent 5xx.
- Most generations are degraded.
- Cached GET is slow even with a fresh cache.
- Manual smoke flows cannot be completed in reasonable time.

## v2.13+ Async Deferral Note

The original D-03 requirement remains valid as a future product goal:

- long AI jobs should not depend on a single synchronous frontend-host request,
- users should receive a fast acknowledgement,
- work should run asynchronously,
- cache should be the source of truth,
- normal page loads should not re-run AI work.

However, this is out of scope for v2.12 Phase 3 Finishing.

Lessons from v2.12:

- `202 accepted` did not prove the background job completed.
- Branch deploy URL resolution caused silent misrouting.
- Netlify Background Function packaging and invocation mode were a major complexity source.
- Separate runtime auth/env/bundling must be proven directly if async is revisited.

v2.13+ should consider a fresh approach such as a dedicated job row plus worker, Supabase Edge Functions, n8n, or another managed queue. It should not blindly restore the failed Netlify Background Function path.

## Documentation Required After Runs

After Phase 3 implementation and validation:

- Add smoke results to `p3f_05_post_implementation_smoke_report.md`.
- Add performance results to the same file or a separate dated performance run note.
- Update `phase_3_finishing/backlog.md` Decision Log with deploy IDs, command results, and go/no-go verdict.
