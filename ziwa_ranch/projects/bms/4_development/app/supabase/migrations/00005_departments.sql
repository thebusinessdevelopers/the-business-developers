CREATE TABLE departments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organisations(id),
  template_id      UUID REFERENCES department_templates(id),
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL,
  form_schema      JSONB NOT NULL,
  report_schedule  JSONB,
  active           BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, slug)
);

-- Add FK from users.department_id now that departments table exists
ALTER TABLE users
  ADD CONSTRAINT users_department_fk
  FOREIGN KEY (department_id) REFERENCES departments(id);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "departments_select" ON departments FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "departments_insert" ON departments FOR INSERT
  WITH CHECK (is_org_member(org_id) AND get_user_role() IN ('owner', 'admin', 'manager'));

CREATE POLICY "departments_update" ON departments FOR UPDATE
  USING (is_org_member(org_id) AND get_user_role() IN ('owner', 'admin', 'manager'));
