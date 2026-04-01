CREATE TABLE users (
  id                UUID PRIMARY KEY REFERENCES auth.users(id),
  org_id            UUID NOT NULL REFERENCES organisations(id),
  email             TEXT,
  full_name         TEXT NOT NULL,
  role              TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'hod', 'staff')),
  department_id     UUID,
  phone             TEXT,
  whatsapp_opt_in   BOOLEAN DEFAULT false,
  password_display  TEXT,
  active            BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select" ON users FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "users_insert" ON users FOR INSERT
  WITH CHECK (is_org_member(org_id) AND get_user_role() IN ('owner', 'admin', 'manager'));

CREATE POLICY "users_update" ON users FOR UPDATE
  USING (is_org_member(org_id) AND get_user_role() IN ('owner', 'admin', 'manager'));

-- Allow the sign-up flow to create the first user (service role bypasses RLS)
-- Self-select for the user's own record
CREATE POLICY "users_self_select" ON users FOR SELECT
  USING (id = auth.uid());
