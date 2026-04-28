# A-08 — A-Frame unit naming: investigation

**Item:** A-08 (Track A)  
**Investigator:** Chat 1 parent agent  
**Date:** 20 Apr 2026  
**Status:** final

---

## Current DB state

```
name      | building | category | status   | rate_category | sort_order
Alfajiri  | a_frames | a_frame  | inactive | a_frame       | 500
Kilele    | a_frames | a_frame  | inactive | a_frame       | 501
Nyota     | a_frames | a_frame  | inactive | a_frame       | 502
Upeo      | a_frames | a_frame  | inactive | a_frame       | 503
```

All 4 placeholder Swahili names were seeded by migration `023_accommodation.sql`. All currently `inactive`.

---

## Confirmed new names (Joshua, 20 Apr 2026)

| sort_order | Old (placeholder) | New (confirmed) | Tree |
|------------|-------------------|-----------------|------|
| 500 | Alfajiri | **Mvule** | *Milicia excelsa* — African teak, Uganda's national tree |
| 501 | Kilele | **Musambya** | *Markhamia lutea* — Nile tulip |
| 502 | Nyota | **Mugavu** | *Albizia zygia* — West African albizia |
| 503 | Upeo | **Mukooge** | Ugandan indigenous hardwood (species to confirm with Head Office — culturally significant tree name) |

---

## Hardcoded references

Grep results for the placeholder names across the codebase:

```
4_development/portal/supabase/migrations/023_accommodation.sql   (INSERT seed — lines 132–135)
4_development/portal/supabase/migrations/025_room_pax_config.sql (UPDATE pax_config — lines 34–39)
```

**No hardcoded references in application code** (TypeScript / TSX / config files). The only place Alfajiri/Kilele/Nyota/Upeo appear is in historical migrations. Renaming via a new migration that UPDATEs `name` by matching the existing row keeps migration history immutable and requires no code edits.

The building-label mapping (`a_frames: 'A-Frames'` in `packages/shared/config/accommodation.ts` line 9) is unit-agnostic and needs no change.

---

## Required migration

```sql
-- v2.12: Rename A-Frame placeholder names to confirmed indigenous tree names
UPDATE accommodation_units SET name = 'Mvule'    WHERE name = 'Alfajiri';
UPDATE accommodation_units SET name = 'Musambya' WHERE name = 'Kilele';
UPDATE accommodation_units SET name = 'Mugavu'   WHERE name = 'Nyota';
UPDATE accommodation_units SET name = 'Mukooge'  WHERE name = 'Upeo';
```

Activation of the A-Frames (changing `status` from `'inactive'` to `'active'`) is a separate concern — per A-01 / Joshua, A-Frame activation is an admin Room Management action, not a seed/migration task. Do not toggle status in this migration.

---

## Validation

After migration:
- Admin Room Management tab shows the 4 A-Frames with new names (still `inactive` unless activated by admin).
- Calendar and HOD Rooms tab reflect new names.
- Any existing bookings (none expected since units are inactive) referencing these units by `unit_id` (uuid) continue to function since the id is unchanged.

---

## File index

- DB table: `public.accommodation_units` — 4 rows in `building = 'a_frames'`
- Historical migration (seed): `4_development/portal/supabase/migrations/023_accommodation.sql` (lines 131–135)
- Historical migration (pax): `4_development/portal/supabase/migrations/025_room_pax_config.sql` (lines 34–39)
- No application code changes required.
