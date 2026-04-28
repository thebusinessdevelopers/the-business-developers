-- Add medium_path column for 800px display variant.
ALTER TABLE hod_report_media
  ADD COLUMN IF NOT EXISTS medium_path TEXT;
