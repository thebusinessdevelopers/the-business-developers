# Room-Level Pax Accuracy Investigation

STATUS: scoping

## Question

Does the current system store and display pax per individual room, or does it reuse the total booking pax for each room?

## Required Evidence

- Booking data model fields for total pax.
- `booking_rooms` fields and JSON payload shape.
- Booking create/edit UI room assignment payload.
- Daily Summary query and transformation.
- WhatsApp export source data and formatting.
- Tests covering multi-room pax.

## Required Reproduction Cases For Later Waves

1. Two rooms with 2 pax each: expected 2 and 2, not 4 and 4.
2. Uneven allocation, for example 2 pax and 1 pax.
3. Shared-capacity/campsite rows not collapsed incorrectly.

## Findings

Wave 1 status: `CONCERNS`.

Wave 2 runtime status: `CONCERNS`.

- Booking-level pax is stored on `bookings.adults` and `bookings.children`.
- Multi-room assignments are stored in `booking_rooms`.
- Per-room pax can be stored inside `booking_rooms.room_config` when the basket path is used; `RoomBasketItem` includes `adults` and `children`.
- Legacy or non-basket rows can have `room_config: null`.
- Admin booking UI currently reconstructs missing per-room data by splitting booking totals across rooms, which is not authoritative and fails uneven allocations.
- Admin Daily Summary query selects booking-level `adults` and `children`, not `booking_rooms.room_config`.
- WhatsApp text uses booking-level `b.adults` and `b.children` on each room line.

Wave 2 runtime evidence:

- Head Office API-created marker `P7W2 QA 1778951161 2X2` saved Obama and Sonic with `2 adults` each in `booking_rooms.room_config`.
- Head Office API-created marker `P7W2 QA 1778951161 UNEVEN` saved Obama with `2 adults` and Sonic with `1 adult` in `booking_rooms.room_config`.
- Head Office API-created marker `P7W2 QA 1778951161 MULTI` saved Obama with `2 adults`, `hb`, a room note, and booking status `tentative`.
- Head Office browser modal showed per-room adults, children, meal plan, rate/night, and room-notes controls for the marker booking.
- All runtime marker bookings were cancelled during cleanup.

Interpretation: current create/edit paths can preserve authoritative per-room pax in `booking_rooms.room_config`, but Daily Summary and WhatsApp remain at risk because their source/query/formatter path does not use that authoritative per-room JSON.

## Fix Planning Notes

Preferred direction:

1. Select `booking_rooms.room_config` in the Daily Summary data route.
2. Render per-room adults/children from `room_config` when present.
3. Mark legacy/null `room_config` rows explicitly rather than silently dividing totals across rooms.
4. Add tests for equal multi-room, uneven multi-room, and legacy/null room_config behaviour.
5. Use the same per-room data shape for UI summary and WhatsApp formatting.

Wave 3 codebase fix investigation update:

- `RoomBasketItem` is the canonical per-room payload shape and includes `adults`, `children`, `meal_plan`, rates, and `notes`.
- Portal create and create/update paths persist basket entries into `booking_rooms.room_config`.
- The atomic save RPC sets `room_config` to null when a room row lacks a `room_config` key, so legacy/null rows are expected.
- Admin create/edit and portal edit can still produce null `room_config` rows when no basket is supplied.
- `BookingForm` currently infers missing per-room data by splitting booking totals; that inference must not be reused for Daily Summary or WhatsApp correctness.
- Recommended normalised row should carry a `pax_source` or equivalent marker such as `room_config`, `booking_only`, or `mixed`.
- For null legacy rows, show a conservative fallback such as `per-room pax not recorded` or booking-level totals once, rather than booking totals on every room line.

## Evidence Interpretation

Joshua's reported two-room/two-pax-each bug is consistent with the static source: if a booking has four total pax and the summary renders each room using booking-level pax, each room can display `4` rather than its individual allocation.

## Stop Conditions

Do not create test bookings before `APPROVED: phase_7_dev_sandbox_writes`.

Do not silently divide booking totals across rooms as a fix. That would fail uneven allocations.
