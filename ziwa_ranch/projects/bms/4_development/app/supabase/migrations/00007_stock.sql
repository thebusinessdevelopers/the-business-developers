CREATE TABLE stock_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organisations(id),
  name              TEXT NOT NULL,
  unit              TEXT NOT NULL,
  category          TEXT,
  minimum_quantity  DECIMAL DEFAULT 0,
  current_quantity  DECIMAL DEFAULT 0,
  cost_per_unit     DECIMAL,
  supplier          TEXT,
  active            BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, name)
);

CREATE TABLE stock_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organisations(id),
  item_id           UUID NOT NULL REFERENCES stock_items(id),
  transaction_type  TEXT NOT NULL CHECK (transaction_type IN ('inbound', 'outbound', 'requisition_fulfil', 'adjustment')),
  quantity          DECIMAL NOT NULL,
  reference_id      UUID,
  reference_type    TEXT,
  department_id     UUID REFERENCES departments(id),
  performed_by      UUID NOT NULL REFERENCES users(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE requisitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organisations(id),
  department_id   UUID NOT NULL REFERENCES departments(id),
  requested_by    UUID NOT NULL REFERENCES users(id),
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
  items           JSONB NOT NULL,
  notes           TEXT,
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  fulfilled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE purchase_orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES organisations(id),
  supplier_name  TEXT NOT NULL,
  status         TEXT DEFAULT 'received' CHECK (status IN ('ordered', 'received', 'discrepancy')),
  items          JSONB NOT NULL,
  total_amount   DECIMAL,
  currency       TEXT DEFAULT 'UGX',
  received_by    UUID NOT NULL REFERENCES users(id),
  received_at    TIMESTAMPTZ DEFAULT now(),
  notes          TEXT
);

ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- Stock items
CREATE POLICY "stock_items_select" ON stock_items FOR SELECT
  USING (is_org_member(org_id));
CREATE POLICY "stock_items_insert" ON stock_items FOR INSERT
  WITH CHECK (is_org_member(org_id) AND get_user_role() IN ('owner', 'admin', 'manager'));
CREATE POLICY "stock_items_update" ON stock_items FOR UPDATE
  USING (is_org_member(org_id) AND get_user_role() IN ('owner', 'admin', 'manager'));

-- Stock transactions
CREATE POLICY "stock_txn_select" ON stock_transactions FOR SELECT
  USING (is_org_member(org_id));
CREATE POLICY "stock_txn_insert" ON stock_transactions FOR INSERT
  WITH CHECK (is_org_member(org_id) AND performed_by = auth.uid());

-- Requisitions
CREATE POLICY "requisitions_select" ON requisitions FOR SELECT
  USING (is_org_member(org_id));
CREATE POLICY "requisitions_insert" ON requisitions FOR INSERT
  WITH CHECK (is_org_member(org_id) AND requested_by = auth.uid());
CREATE POLICY "requisitions_update" ON requisitions FOR UPDATE
  USING (is_org_member(org_id) AND get_user_role() IN ('owner', 'admin', 'manager'));

-- Purchase orders
CREATE POLICY "po_select" ON purchase_orders FOR SELECT
  USING (is_org_member(org_id));
CREATE POLICY "po_insert" ON purchase_orders FOR INSERT
  WITH CHECK (is_org_member(org_id) AND get_user_role() IN ('owner', 'admin', 'manager'));
CREATE POLICY "po_update" ON purchase_orders FOR UPDATE
  USING (is_org_member(org_id) AND get_user_role() IN ('owner', 'admin', 'manager'));
