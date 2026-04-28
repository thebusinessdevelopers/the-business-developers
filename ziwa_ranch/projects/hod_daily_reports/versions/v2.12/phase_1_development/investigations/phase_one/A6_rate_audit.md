# A-06 — Full accommodation rates audit (2026): investigation

**Item:** A-06 (Track A)  
**Investigator:** Chat 1 parent agent  
**Date:** 20 Apr 2026  
**Status:** final

---

## Methodology

Queried the full `accommodation_rates` table and cross-referenced with the authoritative 2026 rate table in `backlog.md` (A-06). 98 rows total (46 for 2026, 46 for 2027, plus 6 A-Frame rows for 2027 only).

---

## Major findings

### 1. Karungi and Barungi misassigned

```
Karungi | chalet | superior_family   ← should be superior_double_twin
Barungi | chalet | superior_family   ← should be superior_double_twin
```

This is the root cause of the "$410 FB STO twin/double chalet" bug — they are being priced as Superior Family ($410 FB STO) rather than Superior Double/Twin ($300 FB STO).

### 2. Rate category `superior_double_twin` does not exist in `accommodation_rates`

All rates for Karungi/Barungi per backlog (FB $400/$300, HB $370/$270) are missing. The migration must both:
- Insert new `superior_double_twin` rate rows for 2026 (and 2027 — same values, rates unchanged for this tier per backlog).
- Reassign Karungi + Barungi in `accommodation_units`.

### 3. Rate category `single_room` — resolved (out of scope)

**Joshua confirmed (20 Apr 2026):** there is no single-bed room at Ziwa. All rooms are at minimum a twin (two singles) or double. "Single Room" in the rate sheet refers to **single occupancy** pricing — one person in a standard twin or double room. At Ziwa, single occupancy does not change the rate; the standard twin/double rate applies regardless of occupancy count.

**Action:** Remove the `single_room` rate category from A-06 scope entirely. No DB entry is needed. The existing booking form already handles 1 adult / 0 children in a double or twin room at the standard rate. No change required.

### 4. A-Frames: 2026 rates missing entirely — resolved

**Joshua confirmed (20 Apr 2026):** 2026 A-Frame rates are exactly the same as 2027.

```
a_frame | 2026 | (no rows)   ← MISSING — must be backfilled
a_frame | 2027 | 6 rows (FB/HB/BB × rack/sto)  ← source of truth
```

Fix: insert 6 new rows for year=2026, copying the 2027 values exactly:

```
FB rack $340 / FB sto $240
HB rack $320 / HB sto $220
BB rack $300 / BB sto $200
```

### 5. 2027 chalet rates incorrect in DB — resolved

**Joshua confirmed (20 Apr 2026):** DB is wrong. The 2027 chalet rates must match 2026 exactly. All superior_family and superior_executive rows for year=2027 must be reverted.

Incorrect 2027 DB values and required corrections:

```
superior_family     FB rack: 2027=$540  → must be $500
superior_family     FB sto:  2027=$450  → must be $410
superior_family     HB rack: 2027=$510  → must be $455
superior_family     HB sto:  2027=$420  → must be $365
superior_executive  FB rack: 2027=$600  → must be $550
superior_executive  FB sto:  2027=$500  → must be $450
superior_executive  HB rack: 2027=$570  → must be $520
superior_executive  HB sto:  2027=$470  → must be $420
```

Fix: `UPDATE accommodation_rates SET adult_rate = [2026 value] WHERE year = 2027 AND rate_category IN ('superior_family', 'superior_executive')` per the table above.

### 6. Other rate categories — audit outcome

| Rate category | 2026 rates in DB vs backlog | Status |
|---------------|-----------------------------|--------|
| camping | $35 rack / $25 sto | ✅ matches |
| dorm | BB $40/$30, FB $70/$60, HB $55/$45 | ✅ matches |
| double_room | BB $100/$80, FB $160/$140, HB $130/$110 | ✅ matches |
| family_room | adult/child rates match backlog | ✅ matches |
| luxury_tent | BB $200/$180, FB $260/$240, HB $230/$210 | ✅ matches |
| obama | BB $140/$120, FB $200/$180, HB $170/$150 | ✅ matches |
| twin_room | BB $90/$80, FB $150/$140, HB $120/$110 | ✅ matches |
| superior_family (Kirungi, Murungi, Family, Clan) | FB $500/$410, HB $455/$365 | ✅ matches |
| superior_executive (The Tribe) | FB $550/$450, HB $520/$420 | ✅ matches |
| superior_double_twin | **MISSING — not in DB** | ❌ create + seed |
| single_room | Not a separate category — single occupancy uses standard twin/double rate. No change. | ✅ removed from scope |
| a_frame (2026) | **MISSING — only 2027 populated** | ❌ backfill 2026 (= copy 2027) |

### 7. 2027 camping STO incorrect in DB — resolved

**Joshua confirmed (20 Apr 2026):** 2027 camping rates are rack = $35 (unchanged), STO = $30.

DB currently shows 2027 STO = $25. Must be corrected to $30.

**Joshua confirmed (20 Apr 2026):** 2026 camping STO = $20. DB currently shows $25 — incorrect. Must also be corrected in Phase 1 migration.

Camping rate summary — both years:

| Year | Rack | STO |
|------|------|-----|
| 2026 | $35  | $20 (DB has $25 — fix) |
| 2027 | $35  | $30 (DB has $25 — fix) |

---

## Required migration work (Phase 1) — all decisions resolved

1. Insert `superior_double_twin` rates for 2026 and 2027 (8 rows total: FB/HB × rack/sto × 2 years — same values for both years, rates unchanged).
   - 2026/2027 FB rack $400, FB sto $300, HB rack $370, HB sto $270.
2. Reassign `Karungi` and `Barungi` units: `UPDATE accommodation_units SET rate_category = 'superior_double_twin' WHERE name IN ('Karungi', 'Barungi')`.
3. Backfill A-Frame 2026 rates — 6 rows: copy the 2027 values (FB $340/$240, HB $320/$220, BB $300/$200).
4. Revert incorrect 2027 chalet rates: UPDATE `superior_family` and `superior_executive` rows for year=2027 to match 2026 values (see section 5 above for exact figures).
5. Correct camping STO for both years:
   - 2026: `UPDATE accommodation_rates SET adult_rate = 20 WHERE year = 2026 AND rate_category = 'camping' AND rate_type = 'sto';`
   - 2027: `UPDATE accommodation_rates SET adult_rate = 30 WHERE year = 2027 AND rate_category = 'camping' AND rate_type = 'sto';`

**Out of scope:** single room / single occupancy rate — no DB change required.

---

## File index

- DB tables: `public.accommodation_rates` (98 rows), `public.accommodation_units` (25 rows)
- Authoritative rate source: `backlog.md` Track A, item A-06 (2026 rate table) and A-07 (2027 delta)
- Rate-lookup code: `4_development/packages/shared/config/accommodation.ts` (functions `calculateItemRate`, `lookupRate`)
- Migration precedent: `4_development/portal/supabase/migrations/023_accommodation.sql`
