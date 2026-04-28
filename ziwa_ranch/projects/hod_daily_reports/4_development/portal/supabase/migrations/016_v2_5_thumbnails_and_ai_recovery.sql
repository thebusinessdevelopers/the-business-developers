-- Phase 8: Image thumbnails
ALTER TABLE hod_report_media ADD COLUMN IF NOT EXISTS thumbnail_path text;

-- Phase 9: AI failure tracking
ALTER TABLE hod_report_media ADD COLUMN IF NOT EXISTS ai_error_message text;

-- Index for finding failed AI items quickly
CREATE INDEX IF NOT EXISTS idx_report_media_ai_status ON hod_report_media(ai_status) WHERE ai_status IN ('failed', 'pending');
