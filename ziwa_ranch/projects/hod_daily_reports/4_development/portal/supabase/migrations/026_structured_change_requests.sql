-- Structured change requests — Phase 4 (F4)
-- Adds requested_changes JSONB to store structured edit data instead of free text only

ALTER TABLE booking_change_requests ADD COLUMN requested_changes JSONB;
