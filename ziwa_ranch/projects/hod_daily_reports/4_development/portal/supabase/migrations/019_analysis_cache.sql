-- Formalise hod_analysis_cache as a tracked migration.
-- Table may already exist from manual creation; use IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS hod_analysis_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_type TEXT NOT NULL,
  period_key TEXT NOT NULL,
  analysis_data JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  model_used TEXT,
  UNIQUE (period_type, period_key)
);

CREATE INDEX IF NOT EXISTS idx_analysis_cache_lookup
  ON hod_analysis_cache (period_type, period_key);
