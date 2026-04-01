CREATE TABLE threads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES organisations(id),
  title        TEXT NOT NULL,
  thread_type  TEXT DEFAULT 'general' CHECK (thread_type IN ('general', 'announcement', 'department')),
  department_id UUID REFERENCES departments(id),
  created_by   UUID NOT NULL REFERENCES users(id),
  pinned       BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organisations(id),
  thread_id   UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES users(id),
  content     TEXT NOT NULL,
  mentions    UUID[],
  attachments JSONB,
  edited_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organisations(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT,
  reference_id    UUID,
  reference_type  TEXT,
  read            BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Threads
CREATE POLICY "threads_select" ON threads FOR SELECT
  USING (is_org_member(org_id));
CREATE POLICY "threads_insert" ON threads FOR INSERT
  WITH CHECK (is_org_member(org_id) AND created_by = auth.uid());
CREATE POLICY "threads_update" ON threads FOR UPDATE
  USING (is_org_member(org_id) AND get_user_role() IN ('owner', 'admin', 'manager'));

-- Messages
CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (is_org_member(org_id));
CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (is_org_member(org_id) AND author_id = auth.uid());
CREATE POLICY "messages_update" ON messages FOR UPDATE
  USING (is_org_member(org_id) AND author_id = auth.uid());

-- Notifications: user can only see their own
CREATE POLICY "notifications_select" ON notifications FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "notifications_update" ON notifications FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON notifications FOR INSERT
  WITH CHECK (is_org_member(org_id));
