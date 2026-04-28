-- Prevent overlapping room assignments across active bookings.
-- This closes the race window that application-only overlap checks cannot fully remove.

create or replace function assert_booking_room_available(p_booking_id uuid, p_unit_id uuid)
returns void
language plpgsql
as $$
declare
  v_booking record;
  v_conflict record;
  v_unit_name text;
begin
  select id, guest_name, check_in, check_out, status
  into v_booking
  from bookings
  where id = p_booking_id;

  if not found or v_booking.status = 'cancelled' then
    return;
  end if;

  select name
  into v_unit_name
  from accommodation_units
  where id = p_unit_id;

  select
    b.id,
    b.guest_name,
    b.check_in,
    b.check_out
  into v_conflict
  from booking_rooms br
  join bookings b on b.id = br.booking_id
  where br.unit_id = p_unit_id
    and br.booking_id <> p_booking_id
    and b.status <> 'cancelled'
    and b.check_in < v_booking.check_out
    and b.check_out > v_booking.check_in
  order by b.check_in
  limit 1;

  if found then
    raise exception 'Room % is already booked for % from % to %.',
      coalesce(v_unit_name, p_unit_id::text),
      v_conflict.guest_name,
      v_conflict.check_in,
      v_conflict.check_out
      using errcode = '23514';
  end if;
end;
$$;

create or replace function booking_rooms_prevent_overlap()
returns trigger
language plpgsql
as $$
begin
  perform assert_booking_room_available(new.booking_id, new.unit_id);
  return new;
end;
$$;

create or replace function bookings_prevent_overlap()
returns trigger
language plpgsql
as $$
declare
  v_room record;
begin
  if new.status = 'cancelled' then
    return new;
  end if;

  for v_room in
    select unit_id
    from booking_rooms
    where booking_id = new.id
  loop
    perform assert_booking_room_available(new.id, v_room.unit_id);
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_booking_rooms_prevent_overlap on booking_rooms;
create trigger trg_booking_rooms_prevent_overlap
before insert or update of booking_id, unit_id
on booking_rooms
for each row
execute function booking_rooms_prevent_overlap();

drop trigger if exists trg_bookings_prevent_overlap on bookings;
create trigger trg_bookings_prevent_overlap
before update of check_in, check_out, status
on bookings
for each row
execute function bookings_prevent_overlap();
