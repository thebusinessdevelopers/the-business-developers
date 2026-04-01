CREATE TABLE intelligence_briefs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organisations(id),
  brief_date    DATE NOT NULL,
  brief_type    TEXT DEFAULT 'morning' CHECK (brief_type IN ('morning', 'weekly')),
  status        TEXT DEFAULT 'generated' CHECK (status IN ('generating', 'generated', 'failed')),
  alerts        JSONB,
  summary       JSONB,
  trends        JSONB,
  ai_narrative  TEXT,
  generated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, brief_date, brief_type)
);

CREATE TABLE intelligence_flags (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organisations(id),
  flag_type        TEXT NOT NULL,
  severity         TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title            TEXT NOT NULL,
  description      TEXT,
  reference_id     UUID,
  reference_type   TEXT,
  status           TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  triggered_at     TIMESTAMPTZ DEFAULT now(),
  acknowledged_by  UUID REFERENCES users(id),
  acknowledged_at  TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ
);

ALTER TABLE intelligence_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "briefs_select" ON intelligence_briefs FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "flags_select" ON intelligence_flags FOR SELECT
  USING (is_org_member(org_id));
CREATE POLICY "flags_update" ON intelligence_flags FOR UPDATE
  USING (is_org_member(org_id) AND get_user_role() IN ('owner', 'admin', 'manager'));
