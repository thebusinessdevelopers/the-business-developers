# Phase 7 Wave 2 Reproduction Plan Context

STATUS: scoping

## Objective

Define a controlled, evidence-led reproduction plan for Phase 7 without executing any data-writing checks.

This plan covers:

1. Head Office delete behaviour.
2. HQ Reception, Housekeeping, and Main Gate change-request regression behaviour.
3. Head Office Daily Summary access.
4. Room-level pax accuracy in booking UI, Daily Summary, and WhatsApp output.
5. Per-room room configuration assignment and allowed-option constraints.
6. WhatsApp rooming export format.
7. Cleanup and evidence capture.

## Environment Boundaries

Allowed now:

- Read Phase 7 documentation.
- Read current source code and tests.
- Draft reproduction steps, evidence matrices, cleanup rules, and stop conditions.

Not allowed now:

- Create, edit, delete, cancel, approve, or deny bookings.
- Submit change requests.
- Click UI controls that mutate dev-preview data.
- Query, inspect, or mutate production.
- Run migrations.
- Edit application source.
- Push, deploy, or commit.
- Capture secrets, cookies, auth headers, localStorage/session tokens, passwords, or unnecessary private guest details.

Execution environment for later approval:

- Dev-preview only.
- Production remains blocked unless Joshua gives `OVERRIDE: test_in_production`.
- Dev-preview data writes remain blocked unless Joshua gives `APPROVED: phase_7_dev_sandbox_writes`.

## Required Accounts And Missing Credentials

Known non-secret usernames from source:

- Head Office candidates: `headoffice.florence`, `headoffice.julie`, `headoffice.isaac`, `headoffice.faith`.
- HQ Reception required row: `reception.emilly`.
- Housekeeping required row: `housekeeping.anita`.
- Main Gate optional row: `maingate.jjuko`.
- Non-authorised department candidates: `fnb.howard`, `kitchen.sensio`, `security.salim`, `store.denis`, `accounts.musoni`, `it.benson`.

Approved for execution:

- Selected Head Office account: `headoffice.florence`.
- Approved dev-preview accounts: `headoffice.florence`, `reception.emilly`, `housekeeping.anita`, `maingate.jjuko`, and `fnb.howard`.
- Dev-preview HOD URL: `https://dev--hoddailyreports.netlify.app`.
- Dev-preview admin URL for admin-only comparison checks: `https://dev--hod-admin-portal.netlify.app`.
- Dev-preview DB read checks are approved for redacted evidence.
- Dev-preview writes are approved under `APPROVED: phase_7_dev_sandbox_writes`.
- Cleanup is mandatory for all Wave 2 test-owned data.

Passwords must not be written into this or any test report.

## Non-Secret Test Data Markers

Use markers that identify test-owned data without exposing private guest details:

- Group/name prefix: `P7W2 QA`.
- Head Office delete marker: `P7W2 QA DELETE`.
- Change-request regression marker: `P7W2 QA CR`.
- Rooming marker: `P7W2 QA ROOMING`.
- Same-day or one-night marker: `P7W2 QA 1N`.
- Multi-night marker: `P7W2 QA MULTI`.
- Notes marker: `P7W2 QA NOTES`.
- No-notes marker: `P7W2 QA NO NOTES`.
- Cleanup tag in notes where notes are available: `cleanup_required_by_phase_7_wave_2`.

Do not use real guest names, real phone numbers, real email addresses, or real booking references for new test data.

## Head Office Delete Authority Matrix

| Department/account | Booking id or test booking marker | Action attempted | Expected policy | Actual UI label | Network route expected | Network route to capture during execution | HTTP status to capture during execution | Response body summary to capture during execution | DB row result to capture during execution | Admin queue result, if applicable | Cleanup status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Head Office account supplied by Joshua | `P7W2 QA DELETE HO` | Attempt delete on test-owned booking only after write approval | Direct Head Office management; no change request | Current source suggests `Request Deletion`; capture actual | Should not use `/api/accommodation/change-requests`; expected future correct route is a HOD-authenticated direct delete path | Capture route without secrets | Capture status | Redact body; currently expected source failure is `Your department cannot submit change requests.` if routed to change requests | Capture booking row present/deleted/status only if dev DB reads are approved | Confirm no pending change-request queue row if direct delete is expected | Delete/cancel test booking or record blocked cleanup |
| `reception.emilly` | `P7W2 QA CR RECEPTION` | Attempt deletion/change request on test-owned booking only after write approval | Approval-gated change request allowed | Capture actual label | `/api/accommodation/change-requests` | Capture route | Capture status | Redact body; expected success or validation message depending safe setup | Capture `booking_change_requests` row count only if DB reads are approved | Pending queue row expected if request succeeds | Remove test booking and request artefacts if approved |
| `housekeeping.anita` | `P7W2 QA CR HOUSEKEEPING` | Attempt deletion/change request on test-owned booking only after write approval | Approval-gated change request allowed | Capture actual label | `/api/accommodation/change-requests` | Capture route | Capture status | Redact body; expected success or validation message depending safe setup | Capture `booking_change_requests` row count only if DB reads are approved | Pending queue row expected if request succeeds | Remove test booking and request artefacts if approved |
| `maingate.jjuko`, if safe credentials are available | `P7W2 QA CR MAIN GATE` | Attempt deletion/change request on test-owned booking only after write approval | Approval-gated change request allowed | Capture actual label | `/api/accommodation/change-requests` | Capture route | Capture status | Redact body; expected success or validation message depending safe setup | Capture `booking_change_requests` row count only if DB reads are approved | Pending queue row expected if request succeeds | Remove test booking and request artefacts if approved |
| Non-authorised department, preferably `it.benson` unless Joshua chooses another | `P7W2 QA DELETE BLOCKED` | Attempt to access/manage booking UI without mutating if possible | No direct management and no change-request write | Capture whether no action is exposed | No mutating route should fire | Capture only if user action is safe and approved | Capture status if route fires | Redact body; expected blocked/forbidden if route fires | No DB mutation expected; verify only if DB reads are approved | No queue row expected | No cleanup expected if no write occurs |

Execution notes:

- Do not attempt deletion on any real booking.
- Prefer creating test-owned bookings after write approval, then deleting only those same bookings.
- If the only available booking is real or private, stop.
- Capture the route and response body summary, not full private payloads.

## Approval-Gated Department Regression Matrix

| Department/account | Capability from source | Planned safe action | Expected result | Evidence to capture | Stop condition |
| --- | --- | --- | --- | --- | --- |
| `reception.emilly` | `canSubmitChangeRequest: true`, `requiresApproval: true` | Submit a change request against `P7W2 QA CR RECEPTION` only after write approval | Change request is accepted or reaches validation tied to test data, not a department-policy 403 | Browser route, UI label, network route, method, status, redacted request shape, redacted response summary, admin queue result | Any Head Office-style `Your department cannot submit change requests.` policy rejection |
| `housekeeping.anita` | `canSubmitChangeRequest: true`, `requiresApproval: true` | Submit a change request against `P7W2 QA CR HOUSEKEEPING` only after write approval | Change request is accepted or reaches validation tied to test data, not a department-policy 403 | Same as above | Any department-policy 403 |
| `maingate.jjuko` | `canSubmitChangeRequest: true`, `requiresApproval: true` | Run only if safe credentials and test setup exist | Change request path remains approval-gated | Same as above | Missing credentials or unsafe setup |
| Head Office account supplied by Joshua | `canSubmitChangeRequest: false`, `requiresApproval: false` | Confirm Head Office does not regress into approval request workflow | Head Office should use direct management, not change request | UI label and route evidence | Any write attempt without approval |

## Daily Summary Access Matrix

| Account | Route planned | Expected access | Source baseline | Evidence to capture | Stop condition |
| --- | --- | --- | --- | --- | --- |
| Admin account, if safe admin credentials are available | Admin Daily Summary route | Admin access remains behind admin auth and `accommodation_manage` | Admin API is `withAdminAuth` with `accommodation_manage` | Browser route, API route `/api/accommodation/daily-summary?date=YYYY-MM-DD`, status, redacted summary shape | No safe admin credentials |
| Head Office account supplied by Joshua | HOD route if one exists; otherwise HOD portal navigation | Head Office should have an operational rooming view without broad admin access | Wave 1 found no confirmed HOD-authenticated Daily Summary route | Browser route, visible menu/action, status, redacted error or missing-route evidence | If testing would require admin impersonation or production |
| `reception.emilly` | HOD portal | Not expected to receive Head Office-only Daily Summary access | Current policy is approval-gated booking management, not Head Office summary authority | Browser route, UI availability/absence, status if route requested | Any need to expose broad private data |
| Non-authorised department | HOD portal | No Head Office Daily Summary access | Default policy is view/no direct management | Browser route, UI availability/absence, status if route requested | Any need to inspect private guest lists |

## Room-Level Pax Matrix

| Test booking marker | Booking/group name | Rooms selected | Expected pax per room | Actual pax per room in booking UI | Actual pax per room in Daily Summary | Actual pax per room in WhatsApp export | Meal plan | Booking status | Room notes | Expected stay-night display | Actual stay-night display | Expected room configuration options | Actual room configuration options | Configuration saved per room | Configuration displayed in Daily Summary | Configuration displayed in WhatsApp export | Cleanup status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `P7W2 QA ROOMING 2X2` | `P7W2 QA Two Rooms` | Obama + Sonic, or any two safe active rooms | Obama: 2 pax; Sonic: 2 pax | Capture | Capture | Capture | `BB` | Confirmed if direct Head Office create is approved | `no notes` expected if blank | `1/1 nights` on occupied date | Capture | Obama/Sonic source bed config is one double each; no arbitrary options proven | Capture | Capture `booking_rooms.room_config` shape only if DB reads approved | Capture | Capture | Remove/cancel test booking |
| `P7W2 QA ROOMING UNEVEN` | `P7W2 QA Uneven` | Obama + Sonic, or any two safe active rooms | Room A: 2 pax; Room B: 1 pax | Capture | Capture | Capture | `FB` or selected safe plan | Confirmed if direct Head Office create is approved | `no notes` expected if blank | `1/1 nights` on occupied date | Capture | Allowed options must come from source/data, not free text | Capture | Capture | Capture | Capture | Remove/cancel test booking |
| `P7W2 QA CONFIG NGUZO` | `P7W2 QA Config` | Nguzo if available | 1-2 pax within capacity | Capture | Capture | Capture | `BB` | Confirmed if safe | Optional short non-private note | `1/1 nights` | Capture | Source proves Nguzo has one double bed in `pax_config`, but does not prove selectable Double/Twin-style stay configuration | Capture and mark blocked if no configured options exist | Capture | Capture | Capture | Remove/cancel test booking |
| `P7W2 QA CONFIG BLOCKED` | `P7W2 QA No Arbitrary Config` | A room with fixed one-double source config, e.g. Obama | Within capacity | Capture | Capture | Capture | `BB` | Confirmed if safe | `no notes` expected if blank | `1/1 nights` | Capture | Should not allow arbitrary unproven options | Capture | Capture | Capture | Capture | Remove/cancel test booking |
| `P7W2 QA 1N` | `P7W2 QA One Night` | Any safe active room | Per-room basket value | Capture | Capture | Capture | `BB` | Tentative or confirmed if safe | `no notes` expected if blank | `1/1 nights` | Capture | Per selected room | Capture | Capture | Capture | Capture | Remove/cancel test booking |
| `P7W2 QA MULTI` | `P7W2 QA Multi Night` | Any safe active room | Per-room basket value | Capture | Capture | Capture | `HB` or selected safe plan | Tentative or confirmed if safe | Short safe note | For a two-night stay, expect `1/2` then `2/2` by occupied date; if product chooses arrival-count wording, record exact behaviour | Capture | Per selected room | Capture | Capture | Capture | Capture | Remove/cancel test booking |
| `P7W2 QA STATUS TENTATIVE` | `P7W2 QA Tentative` | Any safe active room | Per-room basket value | Capture | Capture | Capture | Any safe plan | Tentative | `no notes` expected if blank | Capture | Capture | Per selected room | Capture | Capture | Capture | Capture | Remove/cancel test booking |
| `P7W2 QA STATUS CONFIRMED` | `P7W2 QA Confirmed` | Any safe active room | Per-room basket value | Capture | Capture | Capture | Any safe plan | Confirmed | Short safe note | Capture | Capture | Per selected room | Capture | Capture | Capture | Capture | Remove/cancel test booking |
| `P7W2 QA CAMPSITE` | `P7W2 QA Campsite` | Camping Site | Per-room/shared-capacity pax must not collapse incorrectly | Capture | Capture | Capture | Any safe plan | Confirmed if safe | `no notes` expected if blank | Capture | Capture | Campsite source has no beds and max total 50 | Capture | Capture | Capture | Capture | If existing dev data allows read-only check, no cleanup; otherwise blocked until write approval |

Execution notes:

- Current source uses booking-level `adults` and `children` in Daily Summary and WhatsApp room lines, so reproduction should prove whether this appears at runtime.
- `booking_rooms.room_config` has per-room basket fields: `adults`, `children`, `meal_plan`, `rate_per_night`, and `notes`.
- Legacy/null `room_config` bookings must be labelled as legacy/null evidence and must not be used to prove uneven allocations.

## Room Configuration Matrix

| Room | Source evidence | Planned expected options | Planned negative check | Evidence to capture | Status before execution |
| --- | --- | --- | --- | --- | --- |
| Nguzo | `pax_config` has one double bed, max 2 adults, max 2 total | Only options proved by source/data. Current source proves bed capability, not a selectable stay-configuration list | No arbitrary Double/Twin/Triple/free-text option unless source/data proves it | UI options, redacted request body shape, saved `room_config` shape if DB reads approved | Blocked pending approved writes and route credentials |
| Obama | `pax_config` has one double bed, max 2 adults, max 2 total | Fixed one-double capability unless product defines selectable labels | Attempt to find or enter arbitrary configuration; do not save invalid data unless write approval explicitly covers negative validation | UI options and validation message | Blocked pending approved writes |
| Iris | `pax_config` has two single beds, max 2 adults, max 2 total | Fixed two-single capability unless product defines selectable labels | No unproved double option | UI options and validation message | Blocked pending approved writes |
| The Clan | `pax_config` has two double beds and one single, max 5 total | Capacity and bed capability can be checked, but selectable stay configuration is not proven | No arbitrary option outside actual metadata | UI options, saved config, summary/export display | Blocked pending approved writes |
| Camping Site | `pax_config` has no fixed beds, max 50 adults/children/total | Shared-capacity wording should not pretend a room bed configuration exists | No room-style Double/Twin labels if not applicable | UI options, summary/export display | Blocked pending approved writes or existing safe dev data |

## WhatsApp Rooming Export Matrix

Target format:

```text
*DD MONTH YYYY - ZIWA ROOMING*

Obama: Asigma Group (1 pax, Single, BB, 1/1 nights, tentative & no notes)
```

| Check | Expected | Evidence to capture | Source baseline |
| --- | --- | --- | --- |
| Title | Single bold title line: `*DD MONTH YYYY - ZIWA ROOMING*` with uppercase month | Copied text first line with date redacted only if needed | Current client text uses `*ZIWA RANCH — ROOMING LIST*` and a separate date line |
| Occupied room lines | One line per occupied room only | Copied text lines for test markers only | Current text loops all rooms and prints empty rooms as `—` |
| Room name | Begins each occupied line | Test marker lines only | Current text includes room name |
| Guest/group name | Uses test group marker, not private real data | Test marker lines only | Current text uses `guest_name` |
| Per-room pax | Uses each room's assigned pax | Compare booking UI, Daily Summary, and copied text | Current text uses booking-level pax |
| Room configuration | Includes selected/proved room configuration | Copied line and source of option | Current text omits configuration |
| Meal plan | Uses short meal plan such as `BB` | Copied line | Current text includes short meal plan |
| Stay night | Includes current/total stay night such as `1/1 nights`, `1/2`, or `2/2` | Copied line for one-night and multi-night cases | Current text omits stay-night count |
| Booking status | Includes status, lower-case acceptable if product chooses | Copied line | Current text omits status |
| Notes | Includes room notes or exact `no notes` wording | Notes and no-notes cases | Current text omits room notes |
| Privacy | No secrets, cookies, auth data, passwords, or unrelated private guest lists | Inspect copied text before storing evidence | Must remain enforced |

## Cleanup Plan

Cleanup is only executable after write approval. For each test marker:

1. Record the marker, booking id, room ids, date range, account used, and action performed.
2. Prefer deleting or cancelling only `P7W2 QA` test-owned bookings created during Wave 2.
3. Remove or close related change requests created by Wave 2 if the approved tools allow it.
4. If cleanup cannot run safely, leave the marker documented with owner, reason, and required follow-up.
5. Never cleanup real bookings, unmarked bookings, or bookings whose ownership is uncertain.

Cleanup evidence to capture:

- Browser route or API route used.
- Method.
- HTTP status.
- Redacted response summary.
- DB row count or redacted row shape only if dev DB reads are approved.
- Final marker status: `removed`, `cancelled`, `left for manual cleanup`, or `not created`.

## Wave 2 Execution Evidence

Executed on 2026-05-16 against dev-preview only.

Run marker:

```text
P7W2 QA 1778951161
```

Credentials handling:

- The approved password was entered through a hidden local prompt and was not written into files or command output.
- Approved accounts were recorded by username only.
- All tested HOD sessions were logged out after the probes.

Head Office booking and delete evidence:

| Marker | Rooms | Expected room pax | Create status | Runtime status | Delete route probe | Cleanup result |
| --- | --- | --- | --- | --- | --- | --- |
| `P7W2 QA 1778951161 2X2` | Obama, Sonic | 2 adults each | `200` | `confirmed` | `POST /api/accommodation/change-requests` returned `403`, `Your department cannot submit change requests.` | Cancelled by `PUT /api/accommodation/bookings/[id]`; follow-up detail read showed `status: cancelled`. |
| `P7W2 QA 1778951161 UNEVEN` | Obama, Sonic | Obama: 2 adults; Sonic: 1 adult | `200` | `confirmed` | Not repeated; covered by first Head Office delete probe. | Cancelled by `PUT /api/accommodation/bookings/[id]`; follow-up detail read showed `status: cancelled`. |
| `P7W2 QA 1778951161 MULTI` | Obama | Obama: 2 adults | `200` | `tentative` | Not repeated; covered by first Head Office delete probe. | Cancelled by `PUT /api/accommodation/bookings/[id]`; follow-up detail read showed `status: cancelled`. |

Room-level pax evidence:

- `2X2` saved `booking_rooms.room_config` with Obama `2 adults`, Sonic `2 adults`, meal plan `bb`, blank room notes.
- `UNEVEN` saved `booking_rooms.room_config` with Obama `2 adults`, Sonic `1 adult`, meal plan `fb`; one room note present and one blank note.
- `MULTI` saved `booking_rooms.room_config` with Obama `2 adults`, meal plan `hb`, room note present, and booking status `tentative`.

Approval-gated department regression evidence:

| Account | Probe | Status | Result | Write created |
| --- | --- | --- | --- | --- |
| `reception.emilly` | `POST /api/accommodation/change-requests` with intentionally incomplete body | `400` | `Booking and reason are required.` | No |
| `housekeeping.anita` | `POST /api/accommodation/change-requests` with intentionally incomplete body | `400` | `Booking and reason are required.` | No |
| `maingate.jjuko` | `POST /api/accommodation/change-requests` with intentionally incomplete body | `400` | `Booking and reason are required.` | No |

Interpretation: these accounts passed the department policy guard and reached request validation, unlike Head Office's `403` policy rejection. Full successful change-request submission was intentionally not run because it would create admin queue rows and no approved admin cleanup path was available.

Non-authorised department evidence:

| Account | Probe | Status | Result | Write created |
| --- | --- | --- | --- | --- |
| `fnb.howard` | `POST /api/accommodation/bookings` | `403` | `Your department cannot create bookings.` | No |

Daily Summary access evidence:

| Account/context | Probe | Status | Result |
| --- | --- | --- | --- |
| `headoffice.florence` on HOD dev-preview | `GET /api/accommodation/daily-summary?date=2026-06-13` | `404` | HOD Daily Summary API route is absent. |
| Unauthenticated admin dev-preview | `GET /api/accommodation/daily-summary?date=2026-06-13` | `401` | Admin Daily Summary remains behind admin auth. |

Browser UI evidence:

| Check | Evidence | Result |
| --- | --- | --- |
| Head Office login | `headoffice.florence` logged into `https://dev--hoddailyreports.netlify.app` through the browser. | `200` login, redirected to `/report/head-office`. |
| Head Office Rooms tab | Browser UI showed the `Rooms` tab, `Bookings confirmed immediately.`, and `+ New Booking`. | Confirms direct create/manage affordance is visible to Head Office. |
| Head Office booking modal | A temporary marker booking `P7W2 QA UI 1778951904285` opened in the Head Office `Manage Booking` modal. | Modal heading was `Manage Booking`; delete control label was `Request Deletion`. |
| Room-level UI controls | The modal showed per-room adults, children, meal plan, rate/night, and room-notes controls for Obama. | Per-room pax and notes are editable in the booking UI. No dedicated room-configuration dropdown was visible. |
| UI cleanup | Marker `P7W2 QA UI 1778951904285`, booking id suffix `62171234`, was cancelled by API cleanup after the browser probe. | Follow-up read showed `status: cancelled`. |

Browser/tool notes:

- Browser MCP became available after the first API reproduction pass.
- The browser page became `about:blank` while probing the delete confirmation, so no destructive UI click was submitted.
- WhatsApp clipboard output still was not captured because the required admin/summary UI path is unavailable to Head Office and no admin credentials were approved.

## Wave 2 Execution Stop Conditions Hit

- Full successful change-request submission for `reception.emilly`, `housekeeping.anita`, and `maingate.jjuko` was not executed because it would leave `booking_change_requests` queue rows and no admin cleanup route/credential was approved.
- Admin Daily Summary and WhatsApp runtime output were not executed because no admin account was approved.
- Direct dev DB reads were approved by Joshua but could not be run because the Supabase MCP server is not exposed in the current tool registry. Redacted API reads were used instead.

## Evidence Capture Rules

For each planned check, capture:

- Browser route.
- UI label.
- Network route.
- Method.
- HTTP status.
- Redacted request body shape.
- Redacted response summary.
- Booking/test marker.
- DB row count or redacted row shape only if DB checks are later approved.
- Admin queue result if applicable.
- Cleanup evidence.

Redaction rules:

- Do not record passwords, cookies, auth headers, localStorage tokens, session tokens, or complete private payloads.
- Do not capture broad guest lists.
- Use test markers instead of real guest names.
- Screenshots are optional. If used, crop or redact browser/session details and unrelated private data.

## Stop Conditions

Stop immediately and check in with Joshua if:

- Any required safe credential is missing.
- Any step would write to dev-preview before `APPROVED: phase_7_dev_sandbox_writes`.
- Any step would inspect, write, or depend on production without `OVERRIDE: test_in_production`.
- Any step would mutate real or unmarked bookings.
- Any step exposes private guest lists beyond the minimum redacted test-marker evidence.
- Any cleanup action would affect non-test data.
- The observed route/environment cannot be identified as dev-preview.
- Source edits, migrations, deploys, or commits become necessary.

## Approval State After Execution

Wave 2 dev-preview API execution was approved and partially completed under:

```text
APPROVED: phase_7_dev_sandbox_writes
```

Further writes remain inside the same approval boundary and must have a confirmed cleanup path before execution.

Production remains blocked unless Joshua gives:

```text
OVERRIDE: test_in_production
```

Sandbox fixes, implementation, promotion, and manual validation remain separately blocked unless Joshua later gives the exact relevant token:

```text
APPROVED: phase_7_sandbox_fix_testing
APPROVED: phase_7_implementation_dev
APPROVED: phase_7_production_promotion
APPROVED: phase_7_manual_validation
```

## Decision Log

| Date | Decision | Owner | Evidence |
| --- | --- | --- | --- |
| 2026-05-16 | Wave 2 reproduction plan drafted without execution, data writes, production access, source edits, migrations, deploys, commits, or credential capture. | Agent | Joshua instructed the Wave 2 reproduction planning task from `03_phase_7_wave_2_reproduction_plan_prompt.md`. |
| 2026-05-16 | Wave 2 dev-preview reproduction execution approved; cleanup mandatory. | Joshua | `APPROVED: phase_7_dev_sandbox_writes`; approved accounts recorded by username only; password not recorded. |
