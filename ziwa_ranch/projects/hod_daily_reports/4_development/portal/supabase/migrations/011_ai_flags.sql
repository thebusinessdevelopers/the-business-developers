-- Add AI-generated flags for urgency detection on daily reports
ALTER TABLE hod_daily_reports ADD COLUMN IF NOT EXISTS ai_flags jsonb;
