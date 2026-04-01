CREATE TABLE reports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES organisations(id),
  department_id  UUID NOT NULL REFERENCES departments(id),
  submitted_by   UUID NOT NULL REFERENCES users(id),
  report_date    DATE NOT NULL,
  status         TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'flagged')),
  data           JSONB NOT NULL,
  sync_id        TEXT,
  submitted_at   TIMESTAMPTZ DEFAULT now(),
  reviewed_by    UUID REFERENCES users(id),
  reviewed_at    TIMESTAMPTZ,
  UNIQUE(org_id, department_id, report_date)
);

CREATE TABLE report_section_na (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  reason      TEXT,
  flagged     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE report_reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES organisations(id),
  report_id    UUID NOT NULL REFERENCES reports(id),
  reviewer_id  UUID NOT NULL REFERENCES users(id),
  comment      TEXT,
  mentions     UUID[],
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_section_na ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_reviews ENABLE ROW LEVEL SECURITY;

-- Reports: all org members can read, HOD/staff can insert for their department
CREATE POLICY "reports_select" ON reports FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "reports_insert" ON reports FOR INSERT
  WITH CHECK (is_org_member(org_id) AND submitted_by = auth.uid());

CREATE POLICY "reports_update" ON reports FOR UPDATE
  USING (is_org_member(org_id) AND get_user_role() IN ('owner', 'admin', 'manager'));

-- Report section N/A: readable via report membership, insertable by report author
CREATE POLICY "report_na_select" ON report_section_na FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM reports r WHERE r.id = report_id AND is_org_member(r.org_id)
  ));

CREATE POLICY "report_na_insert" ON report_section_na FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM reports r WHERE r.id = report_id AND r.submitted_by = auth.uid()
  ));

-- Report reviews
CREATE POLICY "reviews_select" ON report_reviews FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "reviews_insert" ON report_reviews FOR INSERT
  WITH CHECK (is_org_member(org_id) AND reviewer_id = auth.uid());
