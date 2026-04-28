-- Room pax configuration mapping — Phase 4 (F1)
-- Adds pax_config JSONB to accommodation_units with bed configs, max pax, cot eligibility

ALTER TABLE accommodation_units ADD COLUMN pax_config JSONB;

-- Guest House 1
UPDATE accommodation_units SET pax_config = '{"max_adults": 2, "max_children": 0, "max_total": 2, "cot_eligible": false, "beds": [{"type": "double", "count": 1}]}' WHERE name = 'Obama';
UPDATE accommodation_units SET pax_config = '{"max_adults": 2, "max_children": 0, "max_total": 2, "cot_eligible": false, "beds": [{"type": "double", "count": 1}]}' WHERE name = 'Sonic';
UPDATE accommodation_units SET pax_config = '{"max_adults": 2, "max_children": 0, "max_total": 2, "cot_eligible": false, "beds": [{"type": "double", "count": 1}]}' WHERE name = 'Malaika';
UPDATE accommodation_units SET pax_config = '{"max_adults": 2, "max_children": 0, "max_total": 2, "cot_eligible": false, "beds": [{"type": "double", "count": 1}]}' WHERE name = 'Nguzo';
UPDATE accommodation_units SET pax_config = '{"max_adults": 4, "max_children": 1, "max_total": 5, "cot_eligible": true, "beds": [{"type": "double", "count": 2}]}' WHERE name = 'Augustu';

-- Guest House 2
UPDATE accommodation_units SET pax_config = '{"max_adults": 2, "max_children": 0, "max_total": 2, "cot_eligible": false, "beds": [{"type": "double", "count": 1}]}' WHERE name = 'Lavender';
UPDATE accommodation_units SET pax_config = '{"max_adults": 2, "max_children": 0, "max_total": 2, "cot_eligible": false, "beds": [{"type": "double", "count": 1}]}' WHERE name = 'Violet';
UPDATE accommodation_units SET pax_config = '{"max_adults": 2, "max_children": 0, "max_total": 2, "cot_eligible": false, "beds": [{"type": "double", "count": 1}]}' WHERE name = 'Orange';
UPDATE accommodation_units SET pax_config = '{"max_adults": 2, "max_children": 0, "max_total": 2, "cot_eligible": false, "beds": [{"type": "double", "count": 1}]}' WHERE name = 'Neem Tree';
UPDATE accommodation_units SET pax_config = '{"max_adults": 2, "max_children": 0, "max_total": 2, "cot_eligible": false, "beds": [{"type": "single", "count": 2}]}' WHERE name = 'Iris';
UPDATE accommodation_units SET pax_config = '{"max_adults": 6, "max_children": 0, "max_total": 6, "cot_eligible": false, "beds": [{"type": "bunk", "count": 6}]}' WHERE name = 'Neem Tree Dorm';

-- Chalets
UPDATE accommodation_units SET pax_config = '{"max_adults": 2, "max_children": 0, "max_total": 2, "cot_eligible": false, "beds": [{"type": "double", "count": 1}]}' WHERE name = 'Karungi';
UPDATE accommodation_units SET pax_config = '{"max_adults": 2, "max_children": 0, "max_total": 2, "cot_eligible": false, "beds": [{"type": "double", "count": 1}]}' WHERE name = 'Barungi';
UPDATE accommodation_units SET pax_config = '{"max_adults": 4, "max_children": 0, "max_total": 4, "cot_eligible": false, "beds": [{"type": "double", "count": 2}]}' WHERE name = 'Kirungi';
UPDATE accommodation_units SET pax_config = '{"max_adults": 4, "max_children": 0, "max_total": 4, "cot_eligible": false, "beds": [{"type": "double", "count": 2}]}' WHERE name = 'Murungi';
UPDATE accommodation_units SET pax_config = '{"max_adults": 4, "max_children": 1, "max_total": 5, "cot_eligible": true, "beds": [{"type": "double", "count": 2}]}' WHERE name = 'The Family';
UPDATE accommodation_units SET pax_config = '{"max_adults": 5, "max_children": 0, "max_total": 5, "cot_eligible": true, "beds": [{"type": "double", "count": 2}, {"type": "single", "count": 1}]}' WHERE name = 'The Clan';
UPDATE accommodation_units SET pax_config = '{"max_adults": 2, "max_children": 1, "max_total": 3, "cot_eligible": true, "beds": [{"type": "double", "count": 1}]}' WHERE name = 'The Tribe';

-- Tents (strict capacity)
UPDATE accommodation_units SET pax_config = '{"max_adults": 4, "max_children": 0, "max_total": 4, "cot_eligible": false, "beds": [{"type": "double", "count": 2}]}' WHERE name = 'Pundamilia';
UPDATE accommodation_units SET pax_config = '{"max_adults": 4, "max_children": 0, "max_total": 4, "cot_eligible": false, "beds": [{"type": "double", "count": 2}]}' WHERE name = 'Twiga';

-- A-Frames
UPDATE accommodation_units SET pax_config = '{"max_adults": 4, "max_children": 1, "max_total": 5, "cot_eligible": true, "beds": [{"type": "double", "count": 2}]}' WHERE name = 'Alfajiri';
UPDATE accommodation_units SET pax_config = '{"max_adults": 4, "max_children": 1, "max_total": 5, "cot_eligible": true, "beds": [{"type": "double", "count": 2}]}' WHERE name = 'Kilele';
UPDATE accommodation_units SET pax_config = '{"max_adults": 4, "max_children": 1, "max_total": 5, "cot_eligible": true, "beds": [{"type": "double", "count": 2}]}' WHERE name = 'Nyota';
UPDATE accommodation_units SET pax_config = '{"max_adults": 4, "max_children": 1, "max_total": 5, "cot_eligible": true, "beds": [{"type": "double", "count": 2}]}' WHERE name = 'Upeo';

-- Campsite (no fixed bed limit, per-person)
UPDATE accommodation_units SET pax_config = '{"max_adults": 50, "max_children": 50, "max_total": 50, "cot_eligible": false, "beds": []}' WHERE name = 'Camping Site';
