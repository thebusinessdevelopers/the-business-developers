-- Global template library — not org-scoped, readable by all authenticated users

CREATE TABLE department_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  category     TEXT,
  form_schema  JSONB NOT NULL,
  description  TEXT,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE department_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_select" ON department_templates FOR SELECT
  TO authenticated
  USING (true);
