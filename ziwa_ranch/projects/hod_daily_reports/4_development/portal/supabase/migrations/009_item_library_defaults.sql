-- Phase B: Inventory grid — add default unit and cost to item library

ALTER TABLE hod_item_library ADD COLUMN IF NOT EXISTS default_unit text;
ALTER TABLE hod_item_library ADD COLUMN IF NOT EXISTS default_cost_per_unit numeric;
