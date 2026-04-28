-- Atomic change-request review and booking auto-apply.
-- Keeps booking updates and request review state in one transaction.

create or replace function review_booking_change_request_atomic(
  p_request_id uuid,
  p_action text,
  p_reviewed_by uuid,
  p_review_note text default null
)
returns void
language plpgsql
as $$
declare
  v_request booking_change_requests%rowtype;
begin
  if p_action not in ('approved', 'denied') then
    raise exception 'Invalid change-request action: %', p_action using errcode = '22023';
  end if;

  select *
  into v_request
  from booking_change_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Change request % not found.', p_request_id using errcode = 'P0002';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Change request % has already been reviewed.', p_request_id using errcode = '23514';
  end if;

  if p_action = 'approved' and v_request.requested_changes is not null and v_request.booking_id is not null then
    update bookings
    set
      check_in = coalesce((v_request.requested_changes->>'check_in')::date, check_in),
      check_out = coalesce((v_request.requested_changes->>'check_out')::date, check_out),
      adults = coalesce((v_request.requested_changes->>'adults')::integer, adults),
      children = coalesce((v_request.requested_changes->>'children')::integer, children),
      meal_plan = coalesce(v_request.requested_changes->>'meal_plan', meal_plan),
      special_notes = case
        when v_request.requested_changes ? 'special_notes' then nullif(v_request.requested_changes->>'special_notes', '')
        else special_notes
      end,
      year = case
        when v_request.requested_changes ? 'check_in' then extract(year from (v_request.requested_changes->>'check_in')::date)::integer
        else year
      end,
      updated_at = now()
    where id = v_request.booking_id;
  end if;

  update booking_change_requests
  set
    status = p_action,
    reviewed_by = p_reviewed_by,
    reviewed_at = now(),
    review_note = p_review_note
  where id = p_request_id;
end;
$$;
