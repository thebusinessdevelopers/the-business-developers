-- Booking activity log — Phase 4 (F7)
-- Lifecycle thread for every booking: creation, edits, status changes, change requests

CREATE TABLE booking_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_user_id UUID REFERENCES hod_users(id),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_activity_booking ON booking_activity_log (booking_id, created_at);
