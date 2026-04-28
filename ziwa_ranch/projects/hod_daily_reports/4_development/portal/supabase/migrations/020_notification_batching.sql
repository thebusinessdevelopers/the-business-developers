-- Groundwork for notification batching.
-- batch_key groups related notifications so the UI can collapse them.
-- e.g. "thread:<thread_id>" groups all replies in one thread.

ALTER TABLE hod_notifications
  ADD COLUMN IF NOT EXISTS batch_key TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_batch
  ON hod_notifications (recipient_user_id, batch_key)
  WHERE batch_key IS NOT NULL;
