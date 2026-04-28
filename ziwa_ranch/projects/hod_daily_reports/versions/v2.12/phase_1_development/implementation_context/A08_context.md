# A-08 — Implementation context: A-Frame renames

## Item summary

Rename the four A-Frame units from placeholder Swahili names (Alfajiri, Kilele, Nyota, Upeo) to confirmed indigenous tree names (Mvule, Musambya, Mugavu, Mukooge) via one data-only migration; no application code changes required.

## Files to change

| File | What changes | Function / type name |
|------|--------------|----------------------|
| `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/0NN_v212_aframe_rename.sql` | New migration: four `UPDATE` statements on `accommodation_units` | — |

No application code changes.

## DB migration required

Y — exact SQL (unit IDs verified via Supabase MCP `execute_sql`):

```sql
-- v2.12 A-08: A-Frame placeholder name -> confirmed indigenous tree name
UPDATE accommodation_units SET name = 'Mvule'    WHERE name = 'Alfajiri'; -- id: 77aae283-528c-4f4c-a2b9-9a2c8b0224dc (sort_order 500)
UPDATE accommodation_units SET name = 'Musambya' WHERE name = 'Kilele';   -- id: f34fabfb-c6a6-414d-859f-614db1a3d76b (sort_order 501)
UPDATE accommodation_units SET name = 'Mugavu'   WHERE name = 'Nyota';    -- id: 0a5e4464-4505-4bf3-9b7d-4db75c4a80cf (sort_order 502)
UPDATE accommodation_units SET name = 'Mukooge'  WHERE name = 'Upeo';     -- id: 8747c529-7dd5-47c9-8fc6-4cfacb3675e1 (sort_order 503)
```

Use the next free migration number prefix when landing. `status` is unchanged in this migration — activation of the A-Frames is a separate admin Room Management action.

## Dependencies

None.

## Complexity

XS — data-only, 4 rows, no code change.

## Validation steps

1. `SELECT id, name, sort_order, status FROM accommodation_units WHERE building = 'a_frames' ORDER BY sort_order;` — names are Mvule, Musambya, Mugavu, Mukooge with `sort_order` 500–503 and `status` still `inactive`.
2. Load the admin Room Management tab — the four A-Frames show the new names.
3. Load the HOD Rooms tab and calendar — new names appear; `unit_id` foreign keys unchanged so any latent references still resolve.

## Evidence

- Current A-Frame rows (from Supabase MCP):

  | id | name | sort_order | status |
  |----|------|------------|--------|
  | `77aae283-528c-4f4c-a2b9-9a2c8b0224dc` | Alfajiri | 500 | inactive |
  | `f34fabfb-c6a6-414d-859f-614db1a3d76b` | Kilele | 501 | inactive |
  | `0a5e4464-4505-4bf3-9b7d-4db75c4a80cf` | Nyota | 502 | inactive |
  | `8747c529-7dd5-47c9-8fc6-4cfacb3675e1` | Upeo | 503 | inactive |

- Grep for `Alfajiri|Kilele|Nyota|Upeo` across `4_development/` returns matches only in historical migrations (`portal/supabase/migrations/023_accommodation.sql:132–135`, `025_room_pax_config.sql:34–39`). No TypeScript/TSX hardcoding. Building-label mapping at `packages/shared/config/accommodation.ts:9` (`a_frames: 'A-Frames'`) is unit-agnostic.
