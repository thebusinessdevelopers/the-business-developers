-- Migration 024: Widen notification type CHECK constraint for meeting + action item types.
-- The original constraint (migration 013) only allowed: mention, review_comment, reply, global_message.
-- Meeting approval and action item flows insert additional types that were silently rejected.

ALTER TABLE hod_notifications
  DROP CONSTRAINT IF EXISTS hod_notifications_type_check;

ALTER TABLE hod_notifications
  ADD CONSTRAINT hod_notifications_type_check
  CHECK (type IN (
    'mention',
    'review_comment',
    'reply',
    'global_message',
    'meeting_approved',
    'action_item_assigned',
    'action_item_submitted',
    'action_item_verified',
    'action_item_rejected',
    'action_item_completed',
    'secretary_invited'
  ));
