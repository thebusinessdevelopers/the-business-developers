CREATE TABLE sync_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organisations(id),
  user_id       UUID NOT NULL REFERENCES users(id),
  operation     TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
  table_name    TEXT NOT NULL,
  local_id      TEXT,
  payload       JSONB NOT NULL,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
  error         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  synced_at     TIMESTAMPTZ
);

ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_select" ON sync_queue FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "sync_insert" ON sync_queue FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "sync_update" ON sync_queue FOR UPDATE
  USING (user_id = auth.uid());
