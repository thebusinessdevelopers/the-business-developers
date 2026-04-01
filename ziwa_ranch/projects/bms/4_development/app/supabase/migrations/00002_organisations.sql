CREATE TABLE organisations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  slug                 TEXT UNIQUE NOT NULL,
  type                 TEXT DEFAULT 'lodge',
  room_count           INTEGER,
  location             TEXT,
  country              TEXT DEFAULT 'UG',
  timezone             TEXT DEFAULT 'Africa/Kampala',
  onboarding_complete  BOOLEAN DEFAULT false,
  subscription_status  TEXT DEFAULT 'trial',
  created_at           TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select" ON organisations FOR SELECT
  USING (is_org_member(id));

CREATE POLICY "org_update" ON organisations FOR UPDATE
  USING (is_org_member(id) AND get_user_role() IN ('owner', 'admin'));
