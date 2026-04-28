# A-05 — Clan / Family room child limit: investigation

**Item:** A-05 (Track A — expanded scope confirmed 20 Apr 2026)  
**Investigator:** Chat 1 parent agent; decisions confirmed by Joshua  
**Date:** 20 Apr 2026  
**Status:** final

---

## DB state (chalets 3–6, all `superior_family`)

```
name       | max_adults | max_children | max_total | cot_eligible
Kirungi    | 4          | 0            | 4         | false
Murungi    | 4          | 0            | 4         | false
The Family | 4          | 1            | 5         | true
The Clan   | 5          | 0            | 5         | true
```

---

## Confirmed scope (Joshua, 20 Apr 2026)

**All four of chalets 3–6 (Kirungi, Murungi, The Family, The Clan)** are in scope — not just The Family and The Clan as originally stated in the backlog.

**Correct rule for chalets 3–6:**
- Standard configuration: up to 2 adults + 2 children (max_total 4), plus a baby/cot (cot_eligible = true, cot does not count toward max_total).
- A baby via cot is permitted on top of the 4-guest max.
- `max_adults = 2`, `max_children = 2`, `max_total = 4`, `cot_eligible = true`.

**Admin override requirement (new, from Joshua):**
- An admin user should be able to exceed the stated pax limits ("within reason") — e.g. adding 3 adults or 3 children to a chalet where normal config caps at 2+2.
- This means pax validation in the booking form must be a **soft warning for admins, not a hard block**. The current behaviour (error if exceeds pax_config) must be relaxed so admins can acknowledge and proceed.
- HOD portal (if it shows room capacity) should retain the soft pax display without allowing booking creation.

---

## Required changes

### 1. Migration — `pax_config` for all four chalets

```sql
UPDATE accommodation_units
SET pax_config = pax_config
  || '{"max_adults": 2, "max_children": 2, "max_total": 4, "cot_eligible": true}'::jsonb
WHERE name IN ('Kirungi', 'Murungi', 'The Family', 'The Clan');
```

Verify bed layout is preserved (jsonb merge does not overwrite keys not listed):
- Kirungi/Murungi: `beds: [{"type":"double","count":2}]` — unchanged.
- The Family: `beds: [{"type":"double","count":2}]` — unchanged.
- The Clan: `beds: [{"type":"double","count":2},{"type":"single","count":1}]` — unchanged.

### 2. Booking form — admin pax override

In `BookingForm.tsx` (admin portal), the pax validation against `pax_config` must change from hard-error to **soft confirmation**:
- If an admin enters a combination that exceeds `max_adults`, `max_children`, or `max_total`, show a warning dialog: "This booking exceeds the standard capacity for [room name]. Proceed anyway?" with Confirm/Cancel.
- On confirm, the booking saves normally with the over-capacity pax values recorded.
- On cancel, the form remains editable without locking.
- This override pattern is **admin portal only**. Any HOD-portal or public-facing capacity display is informational and unchanged.

Implementation note: the guard in Chat 3 should trace where `pax_config` enforcement currently lives — likely a client-side check in `BookingForm.tsx` or a shared utility — and convert it from throw/block to a confirmation prompt.

---

## Validation

After migration:
- Kirungi, Murungi, The Family, The Clan all show `max_children = 2`, `max_adults = 2`, `max_total = 4`, `cot_eligible = true`.
- A booking with 2 adults + 2 children for any of these chalets completes without error.
- A booking with 2 adults + 2 children + cot is permitted (cot does not block booking).
- A booking with 3 adults for one of these chalets in the admin portal prompts a confirmation warning, and on confirm, saves successfully.

---

## File index

- DB table: `public.accommodation_units` — 4 rows (Kirungi, Murungi, The Family, The Clan)
- Booking form (pax validation): `4_development/admin-portal/app/accommodation/BookingForm.tsx`
- Pax validation location (confirm in Chat 3): likely also `4_development/packages/shared/config/accommodation.ts` or inline in BookingForm
- Migration precedent: `4_development/portal/supabase/migrations/025_room_pax_config.sql`
