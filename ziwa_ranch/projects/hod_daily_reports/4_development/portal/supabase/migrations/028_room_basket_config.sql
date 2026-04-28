-- Migration 028: Add room_config JSONB to booking_rooms for per-room basket data.
-- Keeps booking-level adults/children/meal_plan as computed aggregates for backwards compat.

ALTER TABLE booking_rooms ADD COLUMN IF NOT EXISTS room_config JSONB;

COMMENT ON COLUMN booking_rooms.room_config IS
  'Per-room booking config: { adults, children, meal_plan, rate_per_night, notes }';
