# Phase 2 — Chat Handover Prompt

> Paste this prompt verbatim to begin the Phase 2 build chat.

---

You are executing Phase 2 (Form + Logic Fixes) of the authorised v2.12 build plan.

Read these files before doing anything else, in this order:

1. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_1_development/plan.md` — authoritative build plan; Phase 2 is §§2.1–2.10.
2. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/phase_1_development/progress/phase_2_checklist.md` — your task list; tick each item as you complete it.
3. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/handover/phase_1_handover.md` — Phase 1 completion record; confirms the schema that is now live.
4. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/implementation_context/A02_context.md` — A-02 per-room complimentary toggle.
5. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/implementation_context/A0304_context.md` — A-03 per-person pricing (Phase 2 code branch; DB column is already live).
6. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/implementation_context/A05_context.md` — A-05 admin pax soft override.
7. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/implementation_context/A07_context.md` — A-07 admin year selector.
8. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/implementation_context/B0102_context.md` — B-01/B-02 meeting attendance.
9. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/implementation_context/C01_context.md` — C-01 server guard + client retry + lag banner.
10. `/Users/joshuaroy/the-business-developers/ziwa_ranch/projects/hod_daily_reports/versions/v2.12/implementation_context/E01_context.md` — E-01 auto-save queue guard.

**Phase 1 schema state (already applied — do not re-migrate):**
- `accommodation_units.pricing_type text NOT NULL DEFAULT 'flat' CHECK (pricing_type IN ('flat','per_person'))` — live.
- Augustu: `pricing_type = 'per_person'`, `max_adults = 3`.
- Chalets (Kirungi, Murungi, The Family, The Clan): `pax_config` = `max_adults: 2, max_children: 2, max_total: 4, cot_eligible: true`.
- `superior_double_twin` rate rows inserted; Karungi + Barungi reassigned.
- A-Frame 2026 rates backfilled; camping STO corrected; 2027 superior_family + superior_executive rates reverted.
- A-Frame units renamed: Mvule, Musambya, Mugavu, Mukooge.
- C-01: report dates for Accounts and Drivers & Mechanics confirmed correct as-is; no data migration applied.

**What to do:**

Execute the 10 items in Phase 2 in the following sequencing:

- **2.1 (A-01)** — verification only; no code change; record result in the Decision Log.
- **2.2 + 2.3 (A-02 + A-03)** — land together; they share edits to `index.ts` (shared types) and `accommodation.ts` (shared config). Do not split the shared-type file edits across two passes.
- **2.4 (A-05)** — follows 2.2/2.3 because `BookingForm.tsx` is shared.
- **2.5 (A-06)** — verification only; no code change; confirm rate display in the admin booking form.
- **2.6 (A-07)** — year selector in `AccommodationClient.tsx` only; do not touch `BookingForm.tsx`.
- **2.7 (A-08)** — grep check only; no code change expected; record outcome.
- **2.8 (B-01/B-02)** — meeting attendance; independent of accommodation track.
- **2.9 (C-01)** — server guard + client retry + banner; independent.
- **2.10 (E-01)** — queue-callback guard in `FormRenderer.tsx` only; independent.

**After completing all 10 items:**

1. Run `pnpm build` (or equivalent) in both `admin-portal/` and `portal/`; confirm zero TypeScript errors.
2. Run the whole-phase validation list in `plan.md` Phase 2 validation section.
3. Tick all completed items in `progress/phase_2_checklist.md`.
4. Update `progress/README.md` Phase 2 rows to `Completed`.
5. Append a Decision Log entry to `backlog.md` with commit SHAs and validation outcomes.
6. Write `versions/v2.12/handover/phase_2_handover.md` — three sections: (a) what was done, (b) open items, (c) file index.

**Hard rules:**

- No DB migrations in Phase 2 — all schema changes are already live.
- A-02 and A-03 shared-type edits must land in the same file pass; do not leave `index.ts` in a half-edited state.
- Do not soften HOD portal pax validation — portal routes must not receive the `adminPaxOverride` flag.
- C-01 server guard placement: **before** the existing duplicate check at `route.ts:242`; no new DB round-trip.
- E-01 change is `FormRenderer.tsx` only — do not modify `useSubmissionQueue.ts`, `QueuedSubmission`, or any parent component.
- British English in all prose output.
- No chain-of-thought in output files — evidence, actions, results only.
- Do not begin Phase 3 work until Joshua records `APPROVED: phase_2_complete` in `backlog.md`.
