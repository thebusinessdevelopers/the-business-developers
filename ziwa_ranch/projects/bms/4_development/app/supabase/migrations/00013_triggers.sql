-- Stock quantity trigger: update current_quantity after every stock transaction

CREATE OR REPLACE FUNCTION update_stock_quantity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE stock_items
  SET current_quantity = current_quantity + NEW.quantity
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stock_quantity
  AFTER INSERT ON stock_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_quantity();

-- Stock threshold alert: fire intelligence flag when below minimum

CREATE OR REPLACE FUNCTION check_stock_threshold()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  item RECORD;
BEGIN
  SELECT name, current_quantity, minimum_quantity, org_id
  INTO item
  FROM stock_items
  WHERE id = NEW.item_id;

  IF item.current_quantity < item.minimum_quantity THEN
    INSERT INTO intelligence_flags (org_id, flag_type, severity, title, description, reference_id, reference_type)
    VALUES (
      item.org_id,
      'stock_below_min',
      CASE
        WHEN item.current_quantity <= 0 THEN 'critical'
        WHEN item.current_quantity < item.minimum_quantity * 0.5 THEN 'warning'
        ELSE 'info'
      END,
      item.name || ' is below minimum stock',
      item.name || ': ' || item.current_quantity || ' remaining (minimum: ' || item.minimum_quantity || ')',
      NEW.item_id,
      'stock_item'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stock_threshold
  AFTER INSERT ON stock_transactions
  FOR EACH ROW
  EXECUTE FUNCTION check_stock_threshold();

-- Payment trigger: update invoice amount_paid and status

CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  inv RECORD;
BEGIN
  IF NEW.invoice_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT total_amount, amount_paid INTO inv FROM invoices WHERE id = NEW.invoice_id;

  UPDATE invoices
  SET
    amount_paid = amount_paid + NEW.amount,
    status = CASE
      WHEN (inv.amount_paid + NEW.amount) >= inv.total_amount THEN 'paid'
      WHEN (inv.amount_paid + NEW.amount) > 0 THEN 'partial'
      ELSE 'unpaid'
    END
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invoice_payment
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_on_payment();
