-- Migration 029: Add hod_pending booking status + HOD booking notification types.

-- Add hod_pending to bookings status constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('tentative', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'hod_pending'));

-- Widen notification type constraint for booking workflow types
ALTER TABLE hod_notifications DROP CONSTRAINT IF EXISTS hod_notifications_type_check;
ALTER TABLE hod_notifications ADD CONSTRAINT hod_notifications_type_check
  CHECK (type IN (
    'mention', 'review_comment', 'reply', 'global_message',
    'meeting_approved', 'action_item_assigned', 'action_item_submitted',
    'action_item_verified', 'action_item_rejected', 'action_item_completed',
    'secretary_invited',
    'booking_submitted', 'booking_approved', 'booking_denied'
  ));
