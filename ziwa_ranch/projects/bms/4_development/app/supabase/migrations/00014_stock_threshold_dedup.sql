-- R3.20: Only insert a new flag if no open flag already exists for this item
-- R3.21: Use 'critical' severity when current_quantity drops below zero

CREATE OR REPLACE FUNCTION check_stock_threshold()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  item RECORD;
  existing_flag_id UUID;
BEGIN
  SELECT name, current_quantity, minimum_quantity, org_id
  INTO item
  FROM stock_items
  WHERE id = NEW.item_id;

  IF item.current_quantity < item.minimum_quantity THEN
    SELECT id INTO existing_flag_id
    FROM intelligence_flags
    WHERE reference_id = NEW.item_id
      AND reference_type = 'stock_item'
      AND flag_type = 'stock_below_min'
      AND status = 'open'
    LIMIT 1;

    IF existing_flag_id IS NULL THEN
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
  END IF;

  RETURN NEW;
END;
$$;
