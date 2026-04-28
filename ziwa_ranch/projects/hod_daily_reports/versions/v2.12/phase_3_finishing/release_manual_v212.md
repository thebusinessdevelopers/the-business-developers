# HOD Daily Reports v2.12 Release Manual Checklist

STATUS: pending manual/live validation
Date created: 2026-04-28
Owner: Joshua Roy

## Use

Run this checklist only after the local release gate has passed and Joshua has confirmed the target environment for live validation.

Do not call production URLs unless Joshua explicitly confirms the target environment and approves live validation.

All result fields are pending until the exact check is run. Do not copy timings, deploy IDs, or smoke results from another run.

## Target Environment

| Field | Value |
| --- | --- |
| Environment approved by Joshua | Pending |
| Admin URL | Pending |
| Portal URL | Pending |
| Deploy ID / commit | Pending |
| Tester | Pending |
| Run date/time | Pending |

## D5/D6 Smoke Matrix

| ID | Check | Expected result | Result | Evidence / notes |
| --- | --- | --- | --- | --- |
| D5.1 | Admin `/logo.png` | HTTP 200, image body. | Pending | Pending |
| D5.2 | Portal `/logo.png` | HTTP 200, image body. | Pending | Pending |
| D5.3 | Portal booking UI | Rooms and booking UI load without unhandled errors. | Pending | Pending |
| D5.4 | Submit report with 2+ day lag and no `confirm_offset` | 4xx JSON with `needsConfirmOffset: true`; no insert. | Pending | Pending |
| D5.5 | Same lagged submit with `confirm_offset: true` | 200 success shape. | Pending | Pending |
| D6.1 | Admin booking: Augustu per-person, complimentary room, chalet pax override | All behave as the v2.12 plan states. | Pending | Pending |
| D6.2 | Portal submit-report today, lag confirmation, queue replay | Success paths work and drafts are not wrongly cleared. | Pending | Pending |
| D6.3 | Meeting attendance mode | Head Office attendees appear; phone/in-person mode stores and displays. | Pending | Pending |
| D6.4 | Rate display | Karungi FB STO 2026 = 300; Single Room BB 2026 = 85; A-Frame BB 2026 = 300. | Pending | Pending |
| D6.5 | A-Frame names | Mvule, Musambya, Mugavu, Mukooge appear in admin and HOD surfaces. | Pending | Pending |
| D6.6 | Isaac Room Management | `admin.isaac` can access Room Management, or the item is explicitly waived with reason. | Pending | Pending |

## Daily Brief Checks

| ID | Check | Expected result | Result | Evidence / notes |
| --- | --- | --- | --- | --- |
| R1 | Daily Brief post-P3F behaviour | Fresh cache does not false-stale; stale cache does not auto-regenerate; `RISKS AHEAD` renders as its own section. | Pending | Pending |
| R2 | Daily Brief API latency | Cached `GET /api/daily-digest` is fast; synchronous `POST /api/daily-digest` is measured and recorded honestly. | Pending | Pending |
| R3 | Feedback validation | 600-character feedback returns 400; valid feedback returns 200. | Pending | Pending |

## Feedback Validation Limits

| Case | Expected result | Result | Evidence / notes |
| --- | --- | --- | --- |
| `feedback` is a non-string value | 400 JSON error: `feedback must be a string`. | Pending | Pending |
| Trimmed `feedback` is more than 500 characters | 400 JSON error: `feedback must be 500 characters or fewer`. | Pending | Pending |
| 600-character `feedback` | 400 JSON error. | Pending | Pending |
| Valid non-empty `feedback` up to 500 trimmed characters | 200 response when generation succeeds; feedback applies only to that run. | Pending | Pending |
| Blank or whitespace-only `feedback` | Accepted as no feedback; generation proceeds without a user instruction prefix. | Pending | Pending |

## Performance Measurement

Use proportional manual measurement for this low-traffic admin workflow. Browser Network timings are acceptable if the run is authenticated and the exact target environment is recorded. If using scripted requests, record the authentication method and do not persist credentials in this file.

| Measurement | Method | Sample size | Proposed threshold / approval rule | Result |
| --- | --- | --- | --- | --- |
| Cached Daily Brief `GET /api/daily-digest` p95 | Hit a fresh-cache Daily Brief from the approved target environment and record response duration for each run. Calculate p95 from the recorded durations. | Pending, recommended at least 5 runs. | Proposed: p95 under 2 seconds on dev. | Pending |
| Synchronous Daily Brief `POST /api/daily-digest` p95 | Trigger manual Daily Brief Regenerate with `force: true` on approved real report dates. Record response duration, max duration, HTTP status, degraded flag, and any timeout. Calculate p95 from the recorded durations. | Pending, several real report days where practical. | No numeric threshold is approved yet. Joshua approves the POST numeric threshold after the run. | Pending |
| Manual Daily Brief Regenerate perceived latency | Time from clicking Regenerate to visible completion/error in the browser. | Pending | Record honestly; no separate threshold approved. | Pending |
| Admin booking save/reopen | Save a representative v2.12 booking, reopen it, and record visible latency. | Pending | No obvious multi-second blocking outside normal network variance. | Pending |
| HOD report submit and lag confirmation | Submit normal and lag-confirmation paths; record visible latency. | Pending | User-visible success within 3-5 seconds for normal path. | Pending |
| Queue replay, where practical | Replay a queued portal draft only in the approved target environment. | Pending | Drafts are not wrongly cleared and replay succeeds. | Pending |

## No-Go Signals

| Signal | Observed? | Notes |
| --- | --- | --- |
| Daily Brief `POST` times out or returns frequent 5xx. | Pending | Pending |
| Most Daily Brief generations are degraded. | Pending | Pending |
| Cached Daily Brief `GET` is slow even with a fresh cache. | Pending | Pending |
| Manual smoke flows cannot be completed in reasonable time. | Pending | Pending |

## Release Readiness

Phase 3 is not final from this checklist alone. Release readiness remains pending until all required manual/live smoke checks and performance measurements are complete, results are recorded, and Joshua approves release readiness.
