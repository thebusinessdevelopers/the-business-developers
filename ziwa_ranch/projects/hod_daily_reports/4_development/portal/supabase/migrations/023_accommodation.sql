-- Accommodation Booking Portal — Phase 1
-- Tables: accommodation_units, accommodation_rates, bookings, booking_rooms, booking_change_requests

-- 1. Accommodation units (rooms, chalets, tents, campsite)
CREATE TABLE accommodation_units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  building TEXT NOT NULL,
  category TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  rate_category TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_units_building ON accommodation_units (building);
CREATE INDEX idx_units_status ON accommodation_units (status);

-- 2. Accommodation rates — flat rates per (rate_category, meal_plan, rate_type, year)
CREATE TABLE accommodation_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_category TEXT NOT NULL,
  meal_plan TEXT NOT NULL CHECK (meal_plan IN ('fb', 'hb', 'bb', 'none')),
  rate_type TEXT NOT NULL CHECK (rate_type IN ('rack', 'sto')),
  year INTEGER NOT NULL,
  adult_rate NUMERIC(10, 2),
  child_rate NUMERIC(10, 2),
  notes TEXT,
  UNIQUE (rate_category, meal_plan, rate_type, year)
);

CREATE INDEX idx_rates_lookup ON accommodation_rates (rate_category, year);

-- 3. Bookings
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_name TEXT NOT NULL,
  company_name TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  meal_plan TEXT NOT NULL DEFAULT 'fb' CHECK (meal_plan IN ('fb', 'hb', 'bb', 'none')),
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER NOT NULL DEFAULT 0,
  booking_source TEXT NOT NULL DEFAULT 'direct' CHECK (booking_source IN ('direct', 'whatsapp', 'email', 'agent', 'booking_com', 'other')),
  agent_name TEXT,
  rate_type TEXT NOT NULL DEFAULT 'rack' CHECK (rate_type IN ('rack', 'sto')),
  year INTEGER NOT NULL,
  agreed_rate_per_night NUMERIC(10, 2),
  special_notes TEXT,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'deposit_received', 'paid_in_full', 'complimentary', 'staff')),
  status TEXT NOT NULL DEFAULT 'tentative' CHECK (status IN ('tentative', 'confirmed', 'checked_in', 'checked_out', 'cancelled')),
  created_by UUID REFERENCES hod_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (check_out > check_in)
);

CREATE INDEX idx_bookings_dates ON bookings (check_in, check_out);
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_guest ON bookings (guest_name);

-- 4. Booking ↔ Unit junction (multi-room support)
CREATE TABLE booking_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES accommodation_units(id),
  UNIQUE (booking_id, unit_id)
);

CREATE INDEX idx_booking_rooms_unit ON booking_rooms (unit_id);
CREATE INDEX idx_booking_rooms_booking ON booking_rooms (booking_id);

-- 5. Change requests from HOD portal
CREATE TABLE booking_change_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES accommodation_units(id),
  requesting_dept_id UUID REFERENCES hod_departments(id),
  requesting_user_id UUID REFERENCES hod_users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by UUID REFERENCES hod_users(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_change_requests_status ON booking_change_requests (status) WHERE status = 'pending';
CREATE INDEX idx_change_requests_booking ON booking_change_requests (booking_id);

-- ============================================================
-- SEED DATA: Accommodation units
-- ============================================================

-- Guest House 1 (sort_order 100-199)
INSERT INTO accommodation_units (name, building, category, capacity, rate_category, sort_order) VALUES
  ('Obama',    'guest_house_1', 'double',  2, 'obama',       100),
  ('Sonic',    'guest_house_1', 'double',  2, 'double_room', 101),
  ('Malaika',  'guest_house_1', 'double',  2, 'double_room', 102),
  ('Nguzo',    'guest_house_1', 'double',  2, 'double_room', 103),
  ('Augustu',  'guest_house_1', 'family',  5, 'family_room', 104);

-- Guest House 2 (sort_order 200-299)
INSERT INTO accommodation_units (name, building, category, capacity, rate_category, sort_order) VALUES
  ('Lavender',       'guest_house_2', 'double',  2, 'double_room', 200),
  ('Violet',         'guest_house_2', 'double',  2, 'double_room', 201),
  ('Orange',         'guest_house_2', 'double',  2, 'double_room', 202),
  ('Neem Tree',      'guest_house_2', 'double',  2, 'double_room', 203),
  ('Iris',           'guest_house_2', 'twin',    2, 'twin_room',   204),
  ('Neem Tree Dorm', 'guest_house_2', 'dorm',    6, 'dorm',        205);

-- Chalets (sort_order 300-399)
INSERT INTO accommodation_units (name, building, category, capacity, rate_category, sort_order) VALUES
  ('Karungi',    'chalets', 'chalet', 2, 'superior_family',    300),
  ('Barungi',    'chalets', 'chalet', 2, 'superior_family',    301),
  ('Kirungi',    'chalets', 'chalet', 4, 'superior_family',    302),
  ('Murungi',    'chalets', 'chalet', 4, 'superior_family',    303),
  ('The Family', 'chalets', 'chalet', 5, 'superior_family',    304),
  ('The Clan',   'chalets', 'chalet', 5, 'superior_family',    305),
  ('The Tribe',  'chalets', 'chalet', 2, 'superior_executive', 306);

-- Tents (sort_order 400-499)
INSERT INTO accommodation_units (name, building, category, capacity, rate_category, sort_order) VALUES
  ('Pundamilia', 'tents', 'tent', 4, 'luxury_tent', 400),
  ('Twiga',      'tents', 'tent', 4, 'luxury_tent', 401);

-- A-Frames (sort_order 500-599, inactive until commissioned)
INSERT INTO accommodation_units (name, building, category, capacity, rate_category, status, sort_order) VALUES
  ('Alfajiri', 'a_frames', 'a_frame', 5, 'a_frame', 'inactive', 500),
  ('Kilele',   'a_frames', 'a_frame', 5, 'a_frame', 'inactive', 501),
  ('Nyota',    'a_frames', 'a_frame', 5, 'a_frame', 'inactive', 502),
  ('Upeo',     'a_frames', 'a_frame', 5, 'a_frame', 'inactive', 503);

-- Campsite (sort_order 600)
INSERT INTO accommodation_units (name, building, category, capacity, rate_category, sort_order, description) VALUES
  ('Camping Site', 'campsite', 'campsite', 50, 'camping', 600, 'Per-person nightly rate. No meal plan.');

-- ============================================================
-- SEED DATA: 2026 rates
-- ============================================================
INSERT INTO accommodation_rates (rate_category, meal_plan, rate_type, year, adult_rate, child_rate) VALUES
  -- superior_executive (FB + HB only)
  ('superior_executive', 'fb', 'rack', 2026, 550, NULL),
  ('superior_executive', 'fb', 'sto',  2026, 450, NULL),
  ('superior_executive', 'hb', 'rack', 2026, 520, NULL),
  ('superior_executive', 'hb', 'sto',  2026, 420, NULL),
  -- superior_family
  ('superior_family', 'fb', 'rack', 2026, 500, NULL),
  ('superior_family', 'fb', 'sto',  2026, 410, NULL),
  ('superior_family', 'hb', 'rack', 2026, 455, NULL),
  ('superior_family', 'hb', 'sto',  2026, 365, NULL),
  -- obama
  ('obama', 'fb', 'rack', 2026, 200, NULL),
  ('obama', 'fb', 'sto',  2026, 180, NULL),
  ('obama', 'hb', 'rack', 2026, 170, NULL),
  ('obama', 'hb', 'sto',  2026, 150, NULL),
  ('obama', 'bb', 'rack', 2026, 140, NULL),
  ('obama', 'bb', 'sto',  2026, 120, NULL),
  -- double_room
  ('double_room', 'fb', 'rack', 2026, 160, NULL),
  ('double_room', 'fb', 'sto',  2026, 140, NULL),
  ('double_room', 'hb', 'rack', 2026, 130, NULL),
  ('double_room', 'hb', 'sto',  2026, 110, NULL),
  ('double_room', 'bb', 'rack', 2026, 100, NULL),
  ('double_room', 'bb', 'sto',  2026,  80, NULL),
  -- twin_room
  ('twin_room', 'fb', 'rack', 2026, 150, NULL),
  ('twin_room', 'fb', 'sto',  2026, 140, NULL),
  ('twin_room', 'hb', 'rack', 2026, 120, NULL),
  ('twin_room', 'hb', 'sto',  2026, 110, NULL),
  ('twin_room', 'bb', 'rack', 2026,  90, NULL),
  ('twin_room', 'bb', 'sto',  2026,  80, NULL),
  -- dorm (per person)
  ('dorm', 'fb', 'rack', 2026, 70, NULL),
  ('dorm', 'fb', 'sto',  2026, 60, NULL),
  ('dorm', 'hb', 'rack', 2026, 55, NULL),
  ('dorm', 'hb', 'sto',  2026, 45, NULL),
  ('dorm', 'bb', 'rack', 2026, 40, NULL),
  ('dorm', 'bb', 'sto',  2026, 30, NULL),
  -- family_room (adult + child rates)
  ('family_room', 'fb', 'rack', 2026, 95,  55),
  ('family_room', 'fb', 'sto',  2026, 80,  45),
  ('family_room', 'hb', 'rack', 2026, 80,  45),
  ('family_room', 'hb', 'sto',  2026, 65,  35),
  ('family_room', 'bb', 'rack', 2026, 65,  35),
  ('family_room', 'bb', 'sto',  2026, 50,  25),
  -- luxury_tent
  ('luxury_tent', 'fb', 'rack', 2026, 260, NULL),
  ('luxury_tent', 'fb', 'sto',  2026, 240, NULL),
  ('luxury_tent', 'hb', 'rack', 2026, 230, NULL),
  ('luxury_tent', 'hb', 'sto',  2026, 210, NULL),
  ('luxury_tent', 'bb', 'rack', 2026, 200, NULL),
  ('luxury_tent', 'bb', 'sto',  2026, 180, NULL),
  -- camping (Ziwa tent = rack, own tent = sto for distinction; per-person, no meal plan)
  ('camping', 'none', 'rack', 2026, 35, NULL),
  ('camping', 'none', 'sto',  2026, 25, NULL);

-- ============================================================
-- SEED DATA: 2027 rates
-- ============================================================
INSERT INTO accommodation_rates (rate_category, meal_plan, rate_type, year, adult_rate, child_rate) VALUES
  -- superior_executive
  ('superior_executive', 'fb', 'rack', 2027, 600, NULL),
  ('superior_executive', 'fb', 'sto',  2027, 500, NULL),
  ('superior_executive', 'hb', 'rack', 2027, 570, NULL),
  ('superior_executive', 'hb', 'sto',  2027, 470, NULL),
  -- superior_family
  ('superior_family', 'fb', 'rack', 2027, 540, NULL),
  ('superior_family', 'fb', 'sto',  2027, 450, NULL),
  ('superior_family', 'hb', 'rack', 2027, 510, NULL),
  ('superior_family', 'hb', 'sto',  2027, 420, NULL),
  -- a_frame (new for 2027)
  ('a_frame', 'fb', 'rack', 2027, 340, NULL),
  ('a_frame', 'fb', 'sto',  2027, 240, NULL),
  ('a_frame', 'hb', 'rack', 2027, 320, NULL),
  ('a_frame', 'hb', 'sto',  2027, 220, NULL),
  ('a_frame', 'bb', 'rack', 2027, 300, NULL),
  ('a_frame', 'bb', 'sto',  2027, 200, NULL),
  -- obama
  ('obama', 'fb', 'rack', 2027, 200, NULL),
  ('obama', 'fb', 'sto',  2027, 180, NULL),
  ('obama', 'hb', 'rack', 2027, 170, NULL),
  ('obama', 'hb', 'sto',  2027, 150, NULL),
  ('obama', 'bb', 'rack', 2027, 140, NULL),
  ('obama', 'bb', 'sto',  2027, 120, NULL),
  -- double_room
  ('double_room', 'fb', 'rack', 2027, 160, NULL),
  ('double_room', 'fb', 'sto',  2027, 140, NULL),
  ('double_room', 'hb', 'rack', 2027, 130, NULL),
  ('double_room', 'hb', 'sto',  2027, 110, NULL),
  ('double_room', 'bb', 'rack', 2027, 100, NULL),
  ('double_room', 'bb', 'sto',  2027,  80, NULL),
  -- twin_room
  ('twin_room', 'fb', 'rack', 2027, 150, NULL),
  ('twin_room', 'fb', 'sto',  2027, 140, NULL),
  ('twin_room', 'hb', 'rack', 2027, 120, NULL),
  ('twin_room', 'hb', 'sto',  2027, 110, NULL),
  ('twin_room', 'bb', 'rack', 2027,  90, NULL),
  ('twin_room', 'bb', 'sto',  2027,  80, NULL),
  -- dorm
  ('dorm', 'fb', 'rack', 2027, 70, NULL),
  ('dorm', 'fb', 'sto',  2027, 60, NULL),
  ('dorm', 'hb', 'rack', 2027, 55, NULL),
  ('dorm', 'hb', 'sto',  2027, 45, NULL),
  ('dorm', 'bb', 'rack', 2027, 40, NULL),
  ('dorm', 'bb', 'sto',  2027, 30, NULL),
  -- family_room
  ('family_room', 'fb', 'rack', 2027, 95,  65),
  ('family_room', 'fb', 'sto',  2027, 80,  55),
  ('family_room', 'hb', 'rack', 2027, 80,  50),
  ('family_room', 'hb', 'sto',  2027, 65,  40),
  ('family_room', 'bb', 'rack', 2027, 65,  35),
  ('family_room', 'bb', 'sto',  2027, 50,  25),
  -- luxury_tent
  ('luxury_tent', 'fb', 'rack', 2027, 280, NULL),
  ('luxury_tent', 'fb', 'sto',  2027, 260, NULL),
  ('luxury_tent', 'hb', 'rack', 2027, 250, NULL),
  ('luxury_tent', 'hb', 'sto',  2027, 230, NULL),
  ('luxury_tent', 'bb', 'rack', 2027, 220, NULL),
  ('luxury_tent', 'bb', 'sto',  2027, 200, NULL),
  -- camping
  ('camping', 'none', 'rack', 2027, 35, NULL),
  ('camping', 'none', 'sto',  2027, 25, NULL);
