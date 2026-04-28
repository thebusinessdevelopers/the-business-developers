-- v2.12 A-05: chalet pax correction (2+2, max 4, cot eligible)
UPDATE accommodation_units
SET pax_config = pax_config
  || '{"max_adults": 2, "max_children": 2, "max_total": 4, "cot_eligible": true}'::jsonb
WHERE name IN ('Kirungi', 'Murungi', 'The Family', 'The Clan');
