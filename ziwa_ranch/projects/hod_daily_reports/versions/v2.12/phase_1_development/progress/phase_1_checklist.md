# Phase 1 — Database Migrations Checklist

> SQL only. No application-code changes in this phase.

## 1.1 — A-03 + A-04 Augustu pricing_type and pax (`042_v212_augustu.sql`)

- [x] 1. Author `042_v212_augustu.sql` with the `ALTER TABLE accommodation_units ADD COLUMN pricing_type …` and CHECK constraint.
- [x] 2. Append `UPDATE accommodation_units SET pricing_type = 'per_person' WHERE name = 'Augustu';`.
- [x] 3. Append the jsonb merge `UPDATE` raising Augustu's `max_adults` from 2 to 3.
- [x] 4. Apply to staging via Supabase MCP; confirm column, CHECK, and Augustu values.
- [x] 5. Apply to production once staging smoke is clean.

## 1.2 — A-05 Chalet pax correction (`043_v212_chalet_pax.sql`)

- [x] 6. Author `043_v212_chalet_pax.sql` with the jsonb merge `UPDATE` across Kirungi, Murungi, The Family, The Clan.
- [x] 7. Apply to staging; verify `max_adults: 2`, `max_children: 2`, `max_total: 4`, `cot_eligible: true` on all four rows with `beds` preserved.
- [x] 8. Apply to production.

## 1.3 — A-06 + A-07 data Rate corrections (`044_v212_a06_rate_corrections.sql`)

- [x] 9. Author `044_v212_a06_rate_corrections.sql` with INSERTs for `superior_double_twin` rates (2026 + 2027) **before** the Karungi/Barungi reassignment UPDATE.
- [x] 10. Append A-Frame 2026 INSERTs (6 rows matching 2027 values).
- [x] 11. Append camping STO UPDATEs (2026 = 20, 2027 = 30).
- [x] 12. Append 2027 `superior_family` and `superior_executive` reverts to 2026 values.
- [x] 13. Apply to staging; run all smoke queries in `plan.md` §1.3 validation; confirm booking form shows $300 FB STO for Karungi.
- [x] 14. Apply to production.

## 1.4 — A-08 A-Frame rename (`045_v212_aframe_rename.sql`)

- [x] 15. Author `045_v212_aframe_rename.sql` with the four `UPDATE … name` statements (Alfajiri → Mvule, Kilele → Musambya, Nyota → Mugavu, Upeo → Mukooge).
- [x] 16. Apply to staging; verify `sort_order` 500–503 and `status` unchanged.
- [x] 17. Apply to production.

## 1.5 — B-01 / B-02 no-DDL record

- [x] 18. Record in the Decision Log that B-01/B-02 require no Phase 1 migration (`hod_meetings.attendance` is `jsonb`).

## 1.6 — C-01 Stuck-row date corrections (resolved — no migration required)

- [x] 19. Author `046_v212_c01_date_corrections.sql`. _Authored then deleted — see below._
- [x] 20. **Conditional gate resolved:** Joshua confirmed `report_date = 2026-04-18` is correct for both Accounts and Drivers & Mechanics. No date correction needed. `046_v212_c01_date_corrections.sql` deleted from the repo.
- [x] 21. N/A — no substitution or apply required.
- [x] 22. N/A — no production apply required.

## Phase 1 closure

- [x] 23. Run the whole-phase validation checklist in `plan.md` (migrations apply clean, smoke queries green, admin Accommodation page loads without runtime error).
- [x] 24. Update `progress/README.md` statuses to `Completed`.
- [x] 25. Record migration filenames, apply timestamps, and C-01 resolution in `backlog.md` Decision Log.
- [x] 26. `APPROVED: phase_1_complete` — Joshua, 20 Apr 2026.
