-- Atomic booking + room updates for edit flows.
-- Prevents partial state where booking metadata updates but room replacement fails.

create or replace function save_booking_with_rooms_atomic(
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
  p_room_rows jsonb
)
returns void
language plpgsql
as $$
begin
  update bookings
  set
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
  where id = p_booking_id;

  if not found then
    raise exception 'Booking % not found.', p_booking_id using errcode = 'P0002';
  end if;

  delete from booking_rooms
  where booking_id = p_booking_id;

  insert into booking_rooms (booking_id, unit_id, room_config)
  select
    p_booking_id,
    (room_entry->>'unit_id')::uuid,
    case
      when room_entry ? 'room_config' then room_entry->'room_config'
      else null
    end
  from jsonb_array_elements(coalesce(p_room_rows, '[]'::jsonb)) as room_entry;
end;
$$;
