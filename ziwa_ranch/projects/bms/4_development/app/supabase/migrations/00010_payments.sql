CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organisations(id),
  invoice_number  TEXT NOT NULL,
  status          TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'void')),
  guest_name      TEXT,
  guest_phone     TEXT,
  line_items      JSONB NOT NULL,
  total_amount    DECIMAL NOT NULL,
  amount_paid     DECIMAL DEFAULT 0,
  currency        TEXT DEFAULT 'UGX',
  due_date        DATE,
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, invoice_number)
);

CREATE TABLE payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organisations(id),
  invoice_id       UUID REFERENCES invoices(id),
  amount           DECIMAL NOT NULL,
  currency         TEXT DEFAULT 'UGX',
  method           TEXT NOT NULL CHECK (method IN ('cash', 'mtn_momo', 'airtel_money', 'stripe', 'bank_transfer', 'other')),
  status           TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  reference        TEXT,
  phone            TEXT,
  recorded_by      UUID NOT NULL REFERENCES users(id),
  webhook_payload  JSONB,
  receipt_photo_url TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE webhook_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      TEXT NOT NULL,
  event_type    TEXT NOT NULL,
  payload       JSONB NOT NULL,
  org_id        UUID REFERENCES organisations(id),
  processed     BOOLEAN DEFAULT false,
  processed_at  TIMESTAMPTZ,
  error         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Invoices
CREATE POLICY "invoices_select" ON invoices FOR SELECT
  USING (is_org_member(org_id));
CREATE POLICY "invoices_insert" ON invoices FOR INSERT
  WITH CHECK (is_org_member(org_id) AND created_by = auth.uid());
CREATE POLICY "invoices_update" ON invoices FOR UPDATE
  USING (is_org_member(org_id) AND get_user_role() IN ('owner', 'admin', 'manager'));

-- Payments
CREATE POLICY "payments_select" ON payments FOR SELECT
  USING (is_org_member(org_id));
CREATE POLICY "payments_insert" ON payments FOR INSERT
  WITH CHECK (is_org_member(org_id));

-- Webhook events: admin only
CREATE POLICY "webhook_select" ON webhook_events FOR SELECT
  USING (is_org_member(org_id) AND get_user_role() IN ('owner', 'admin'));
