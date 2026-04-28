-- Fix booking_activity_log: admin user IDs are not in hod_users,
-- so the FK constraint silently rejects every admin-initiated insert.
-- Drop the FK and make the column nullable.

ALTER TABLE booking_activity_log
  DROP CONSTRAINT booking_activity_log_actor_user_id_fkey;

ALTER TABLE booking_activity_log
  ALTER COLUMN actor_user_id DROP NOT NULL;
