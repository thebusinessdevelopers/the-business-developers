-- Migration 013: v2.4 schema — performance indexes + messaging + Google Drive columns
-- Applied: v2.4 Phase 1+

-- =============================================================================
-- Performance indexes for hod_daily_reports
-- =============================================================================

-- Unreviewed reports (most common admin filter)
CREATE INDEX IF NOT EXISTS idx_reports_unreviewed
  ON hod_daily_reports(report_date DESC)
  WHERE acknowledged_at IS NULL;

-- Department + date descending (department hub, admin filters)
CREATE INDEX IF NOT EXISTS idx_reports_dept_date_desc
  ON hod_daily_reports(department_id, report_date DESC);

-- Submitted at descending (admin overview sort)
CREATE INDEX IF NOT EXISTS idx_reports_submitted_at
  ON hod_daily_reports(submitted_at DESC);

-- =============================================================================
-- Performance indexes for hod_activity_log
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_activity_created
  ON hod_activity_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_user_created
  ON hod_activity_log(user_id, created_at DESC);

-- =============================================================================
-- AI processing status on report media
-- =============================================================================

ALTER TABLE hod_report_media
  ADD COLUMN IF NOT EXISTS ai_status text NOT NULL DEFAULT 'pending'
    CHECK (ai_status IN ('pending', 'processing', 'complete', 'failed', 'skipped'));

-- =============================================================================
-- Google Drive sync columns on report media
-- =============================================================================

ALTER TABLE hod_report_media
  ADD COLUMN IF NOT EXISTS google_drive_file_id text,
  ADD COLUMN IF NOT EXISTS google_drive_url text,
  ADD COLUMN IF NOT EXISTS google_drive_synced_at timestamptz;

-- =============================================================================
-- Report thread messages
-- =============================================================================

CREATE TABLE IF NOT EXISTS hod_report_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES hod_daily_reports(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES hod_report_threads(id) ON DELETE SET NULL,
  author_user_id uuid NOT NULL REFERENCES hod_users(id),
  body text NOT NULL,
  mentions jsonb NOT NULL DEFAULT '[]',
  is_admin_note boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_thread_report ON hod_report_threads(report_id, created_at);
CREATE INDEX IF NOT EXISTS idx_thread_parent ON hod_report_threads(parent_id);
CREATE INDEX IF NOT EXISTS idx_thread_author ON hod_report_threads(author_user_id);

ALTER TABLE hod_report_threads ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Notifications
-- =============================================================================

CREATE TABLE IF NOT EXISTS hod_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES hod_users(id),
  type text NOT NULL CHECK (type IN ('mention', 'review_comment', 'reply', 'global_message')),
  source_thread_id uuid REFERENCES hod_report_threads(id) ON DELETE CASCADE,
  source_report_id uuid REFERENCES hod_daily_reports(id) ON DELETE CASCADE,
  triggered_by_user_id uuid REFERENCES hod_users(id),
  body_preview text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_recipient ON hod_notifications(recipient_user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_created ON hod_notifications(created_at DESC);

ALTER TABLE hod_notifications ENABLE ROW LEVEL SECURITY;
