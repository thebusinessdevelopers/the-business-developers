-- booking_activities: bookable excursion/service line items per booking
CREATE TABLE booking_activities (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  activity_name  TEXT NOT NULL CHECK (activity_name IN (
                   'Entrance & Rhino Trekking',
                   'Shoebill Trekking (6am-9am)',
                   'Birding',
                   'Night Walks (8pm-10pm)'
                 )),
  guest_category TEXT NOT NULL CHECK (guest_category IN (
                   'foreign_non_resident',
                   'foreign_resident',
                   'resident'
                 )),
  activity_date  DATE NOT NULL,
  adults         INT NOT NULL DEFAULT 0,
  children       INT NOT NULL DEFAULT 0,
  adult_rate     NUMERIC(10,2) NOT NULL,
  child_rate     NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency_code  TEXT NOT NULL CHECK (currency_code IN ('USD', 'UGX')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_booking_activities_booking_id ON booking_activities(booking_id);

-- Drop and recreate the atomic RPC with p_activities parameter
DROP FUNCTION IF EXISTS save_booking_with_rooms_atomic(
  uuid, text, text, boolean, date, date, text, integer, integer,
  text, text, text, integer, numeric, text, text, text, jsonb
);

CREATE OR REPLACE FUNCTION save_booking_with_rooms_atomic(
  p_booking_id uuid,
  p_guest_name text,
  p_company_name text,
  p_is_private boolean,
  p_check_in date,
  p_check_out date,
  p_meal_plan text,
  p_adults integer,
  p_children integer,
  p_booking_source text,
  p_agent_name text,
  p_rate_type text,
  p_year integer,
  p_agreed_rate_per_night numeric,
  p_special_notes text,
  p_payment_status text,
  p_status text,
  p_room_rows jsonb,
  p_activities jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE bookings
  SET
    guest_name = p_guest_name,
    company_name = p_company_name,
    is_private = p_is_private,
    check_in = p_check_in,
    check_out = p_check_out,
    meal_plan = p_meal_plan,
    adults = p_adults,
    children = p_children,
    booking_source = p_booking_source,
    agent_name = p_agent_name,
    rate_type = p_rate_type,
    year = p_year,
    agreed_rate_per_night = p_agreed_rate_per_night,
    special_notes = p_special_notes,
    payment_status = p_payment_status,
    status = p_status,
    updated_at = now()
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found.', p_booking_id USING errcode = 'P0002';
  END IF;

  DELETE FROM booking_rooms WHERE booking_id = p_booking_id;

  INSERT INTO booking_rooms (booking_id, unit_id, room_config)
  SELECT
    p_booking_id,
    (room_entry->>'unit_id')::uuid,
    CASE WHEN room_entry ? 'room_config' THEN room_entry->'room_config' ELSE NULL END
  FROM jsonb_array_elements(COALESCE(p_room_rows, '[]'::jsonb)) AS room_entry;

  DELETE FROM booking_activities WHERE booking_id = p_booking_id;

  INSERT INTO booking_activities (
    booking_id, activity_name, guest_category, activity_date,
    adults, children, adult_rate, child_rate, currency_code, notes
  )
  SELECT
    p_booking_id,
    act->>'activity_name',
    act->>'guest_category',
    (act->>'activity_date')::date,
    COALESCE((act->>'adults')::int, 0),
    COALESCE((act->>'children')::int, 0),
    COALESCE((act->>'adult_rate')::numeric, 0),
    COALESCE((act->>'child_rate')::numeric, 0),
    act->>'currency_code',
    act->>'notes'
  FROM jsonb_array_elements(COALESCE(p_activities, '[]'::jsonb)) AS act
  WHERE act->>'activity_name' IS NOT NULL;
END;
$$;
