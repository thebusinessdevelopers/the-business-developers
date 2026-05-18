# Room Configuration Assignment Investigation

STATUS: scoping

## Question

Can the current system represent a selected room configuration per room, constrained to what that room can actually accommodate?

## Required Evidence

- Room capability metadata source.
- Existing `pax_config`, `room_config`, or equivalent fields.
- Booking create/edit UI support.
- Server-side validation support.
- Daily Summary and WhatsApp display support.

## Requirements

- Configuration must be per room, not booking-level only.
- Configuration must be selected from allowed options for the room.
- Configuration must not be free text.
- Configuration must appear in Daily Summary and WhatsApp rooming export.

## Findings

Wave 1 status: `CONCERNS`.

- Unit capability metadata exists on `accommodation_units`, including `category`, `capacity`, `pax_config`, `pricing_type`, and `max_concurrent_bookings`.
- `pax_config` includes bed/capacity information such as `beds[]`, `max_adults`, `max_children`, `max_total`, and cot eligibility.
- Per-room booking data currently lives in `booking_rooms.room_config` as a basket JSON payload.
- No inspected source proves a dedicated per-stay room configuration field such as `Double`, `Twin`, `Single`, or equivalent selected per room.
- Current metadata can inform allowed options, but Phase 7 still needs a verified source-of-truth mapping before exposing a constrained dropdown.

## Data Model Notes

The current structure may support adding a configuration value inside `booking_rooms.room_config`, but that would need validation and a verified allowed-options source. If this must be queryable or strongly constrained, a first-class `booking_rooms` column or controlled JSON schema may be safer.

Do not invent configuration options. For example, Nguzo as Double/Twin must be backed by source data or a minimal approved source-of-truth change.

## Wave 3 Codebase Fix Investigation Update

- `PaxConfig` and `PaxBed` model physical bed inventory and occupancy caps: bed type, count, max adults, max children, max total, and cot eligibility.
- `pax_config.beds` can support fixed inventory labels where product-approved, but it is not a constrained stay-configuration options list.
- `RoomBasketItem` does not currently include a selected room/stay configuration field.
- `booking_rooms.room_config` currently stores per-room basket values such as pax, meal plan, rate, and notes, but not a controlled configuration code.
- HOD accommodation data currently strips or omits enough unit metadata that a future dropdown would need real allowed options loaded from the API and validated server-side.
- `validateAccommodationWrite` validates occupancy/capacity; it does not validate a per-stay room configuration.
- Joshua confirmed on 2026-05-16 that room configuration blocks the first sandbox fix and must be implemented.
- The minimal path is a controlled source such as `accommodation_units.stay_configuration_options` plus a persisted selected value in `RoomBasketItem` or a dedicated `booking_rooms` column, with server-side validation.
- The first sandbox fix must show constrained options in the booking UI, save the selected option per room, and display it in Daily Summary and WhatsApp output.

Final investigation update:

- A new DDL migration is not strictly unavoidable for sandbox proof if the implementation uses existing JSONB fields.
- The smallest sandbox-safe model is explicit allowed-option metadata on each unit, plus a selected configuration field in `RoomBasketItem` persisted inside `booking_rooms.room_config`.
- `pax_config.beds` can describe bed inventory and may support product-approved fixed labels, but it must not be treated as an automatic stay-configuration options list.
- A first-class `booking_rooms` column or normalised option table remains viable if reporting, database constraints, or long-term maintainability justify the larger change.
- Any migration or data seed file may be drafted in sandbox, but it must not be applied to any database without `APPROVED: phase_7_migration_execution`.

## Open Questions

- Which rooms have one fixed configuration label versus multiple selectable stay configurations?
- Should terms like `Twin` be derived from two single beds, or explicitly configured as a product label?
- Should campsite/shared-capacity units show no room-style configuration, a generic shared-capacity label, or another controlled value?
- Should selected configuration live in `booking_rooms.room_config` JSON for minimum change, or in a first-class column for stronger reporting/querying?

## Final Investigation Update

Stage 1 final investigation status: `CONCERNS`.

The final read-only room-configuration and migration-safety agents confirmed:

- `RoomBasketItem` currently has no selected stay-configuration field.
- `PaxConfig` and `PaxBed` describe physical inventory and occupancy caps, not a guest-facing allowed-options catalogue.
- `booking_rooms.room_config` is already JSONB and can carry a selected configuration code for a minimal first fix.
- A DDL migration is not strictly unavoidable if allowed options and selected values are kept in existing JSON metadata, but explicit product-approved metadata is still required.
- A first-class `booking_rooms` column remains a stronger option if reporting, SQL constraints, or long-term analytics require it.

Final recommendation for sandbox design:

1. Define an explicit allowed stay-configuration option list per accommodation unit.
2. Add a typed selected configuration field to the per-room basket payload.
3. Validate the submitted option server-side against the selected unit's allowed list.
4. Persist the selected option per room, either inside `booking_rooms.room_config` for the first fix or in a first-class column if Joshua chooses the stricter schema path.
5. Display the selected option in Daily Summary and WhatsApp from the same normalised occupied-room row used for per-room pax.

Migration execution remains blocked unless Joshua gives:

```text
APPROVED: phase_7_migration_execution
```
