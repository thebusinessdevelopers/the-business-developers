-- v2.12 A-03: add pricing_type column
ALTER TABLE accommodation_units
  ADD COLUMN pricing_type text NOT NULL DEFAULT 'flat'
  CHECK (pricing_type IN ('flat','per_person'));

UPDATE accommodation_units
SET pricing_type = 'per_person'
WHERE name = 'Augustu';

-- v2.12 A-04: Augustu pax correction (max_adults 2 -> 3)
UPDATE accommodation_units
SET pax_config = pax_config || '{"max_adults": 3}'::jsonb
WHERE name = 'Augustu';
