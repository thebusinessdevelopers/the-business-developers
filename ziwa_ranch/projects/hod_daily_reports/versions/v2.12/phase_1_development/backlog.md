# HOD Daily Reports — v2.12 Backlog

> **Status:** implementation and Phase E recovery complete on admin `dev`; final release approval still required.  
> **Theme:** Field feedback post-v2.11 — accommodation corrections, HOD meeting attendance expansion, report integrity fix, AI infrastructure overhaul, and HOD form experience fix  
> **Sources:** Head Office rooms report feedback; Joshua Roy observations on v2.11; Salim (Security HOD) auto-save feedback  
> **Prerequisite:** Authorisation from Joshua before any repository changes.
> **Navigation:** use `../README.md` for the current source-of-truth hierarchy.

---

## Guardrails (apply to all v2.12 work)

1. **Do not regress v2.11** — booking integrity, guest validation, calendar legibility, and admin flows must remain correct unless an item explicitly changes behaviour with sign-off.
2. **Evidence-led** — each item traces to a concrete feedback source.
3. **Simplicity** — smallest change that satisfies the feedback.

Historical note: this backlog began as a pre-implementation approval document. The current implementation/recovery state is recorded in the Decision Log and summarised in `README.md`.

---

## Theme summary

Five tracks:

| Track | Theme | Items |
|-------|-------|-------|
| A | Accommodation corrections | 9 |
| B | HOD meeting attendance expansion | 2 |
| C | Report date integrity | 1 (investigation first) |
| D | AI infrastructure overhaul | 4 |
| E | HOD form experience | 1 (investigation first) |

**Non-goals for v2.12:** New department forms, WhatsApp workflow changes, stock system changes, export changes.  
**Deferred to v2.13+:** Live Secretary Mode (carried from v2.10).

---

## Track A — Accommodation Corrections

*Source: Head Office rooms report feedback*

---

### A-01 — Head Office cannot access Room Management tab

**Feedback:** Head Office need the same room management ability Joshua has (block/unblock rooms, A-Frame activation). The Room Management tab already exists in the admin portal — this is an access change, not a feature build.

**Context:**
- Room Management is in `app/accommodation/RoomManagement.tsx` (admin portal), gated by the `accommodation_manage` capability.
- `admin.isaac` already exists as an admin account but may not have `accommodation_manage`.
- Florence, Julie, and Faith are HOD portal users — they do not currently have admin portal access. The right approach is to give Isaac's admin account the full `accommodation_manage` capability, since he is the Head Office Manager who would action room blocks.

**Scope:**
- Confirm which capabilities `admin.isaac` currently has in the admin auth configuration.
- Add `accommodation_manage` to `admin.isaac` so the Room Management tab and all its actions (block/unblock, A-Frame activation) are accessible.
- Validate: log in as `admin.isaac` → Accommodation section → Room Management tab is visible and functional (block a room, unblock it).

---

### A-02 — Cannot mark a single room as complimentary within a multi-room group booking

**Feedback:** When a group booking contains multiple rooms (e.g. Lantana Adventures: 3 doubles + 1 single for the tour leader), there is no way to mark just the tour-leader single as complimentary — only whole-booking discounts exist.

**Scope:**
- Add a per-room complimentary toggle within a booking that contains multiple rooms.
- A complimentary room contributes $0 to the booking total for that room while others remain at full rate.
- The booking summary and invoice view must reflect the per-room comp clearly (rate shown as "Complimentary" or "$0").
- Admin only — HOD portal does not need this.

---

### A-03 — Augustus: per-person rate not multiplying by guest count; make pricing type modular

**Feedback:** Augustus uses per-person pricing — the rate shown is $65/person but the booking total displays $65 flat instead of $65 × guest count. Only Augustus uses this pricing model currently, but the fix must be modular so any unit can be configured as per-person in the future without code changes.

**Scope:**
- Add a `pricing_type` field to `accommodation_units` (or `accommodation_rates`): values `flat` (default, current behaviour) and `per_person`.
- Set Augustus to `per_person` via migration.
- Booking form and cost summary: when `pricing_type = per_person`, total = rate × total guest count (adults + children, using their respective rates where applicable).
- All other units default to `flat` — no behaviour change for them.
- Validate: Augustus booking with 3 guests shows correct multiplied total; any flat-rate room is unaffected.

---

### A-04 — Augustus/Augusto: triple-pax error despite being a triple room

**Feedback:** An error appears when trying to add 3 guests to Augustus ("can't take 3 pax") even though it is a triple room and should accept either a triple-adult or family configuration.

**Context:** v2.11 set Augustus's `pax_config` to `max_adults: 2, max_children: 3, max_total: 5` to fix the children-blocking issue. This may have inadvertently capped adults at 2, which would block a standard triple (3 adults) booking.

**Scope:**
- Confirm current `pax_config` for Augustus in `accommodation_units`.
- Determine correct configuration: triple room should accept up to 3 adults or 2 adults + children (family mode) — not limited to 2 adults.
- Update `pax_config` via migration so the room accepts 3 adults max and remains compatible with child bookings.
- Validate: 3-adult booking for Augustus completes without error; existing child-booking behaviour is not regressed.

---

### A-05 — Chalets 3–6 (Kirungi, Murungi, The Family, The Clan): child limit too restrictive; admin pax override required

**Feedback:** Clan and Family room types are limited to a single child (or zero for The Clan), but they should accommodate 2 adults + 2 children as the standard max. Kirungi and Murungi are also in scope. Additionally, admins must be able to override pax limits "within reason" — a hard block is wrong for the admin portal.

**Confirmed scope (Joshua, 20 Apr 2026):**
- All four chalets 3–6 (Kirungi, Murungi, The Family, The Clan) use the same standard config: `max_adults: 2, max_children: 2, max_total: 4, cot_eligible: true`. Baby/cot does not count toward max_total.
- Admin pax override: the booking form pax check must convert from a hard error to a soft confirmation warning. Admins can acknowledge and proceed with over-capacity configurations within reason.

**Scope:**
- Update `pax_config` for Kirungi, Murungi, The Family, The Clan via DB migration.
- Modify pax enforcement in `BookingForm.tsx` (admin portal): replace hard block with a confirmation prompt when stated pax limits are exceeded.
- Validate: any of the four chalets accepts 2 adults + 2 children without error; adding 3 adults in admin portal shows a confirmation prompt and proceeds on confirm.

---

### A-06 — Audit and correct all accommodation rates (2026)

**Feedback:** Head Office flagged: Single room shows $100 (should be $85 BB rack); the twin/double chalet shows $410 (should be $300 FB STO). With the full chalet breakdown now confirmed, the root cause is clear — Karungi and Barungi are Superior Double/Twin units ($400/$300 FB) but the system is assigning them Superior Family rates ($500/$410 FB). A full audit against the authoritative 2026 rates is required, not a spot-fix.

---

**Authoritative 2026 rates — source of truth for this item**

*Chalets (7 named units, 3 rate tiers — flat rate per unit per night, no BB):*

| Unit | Type | FB Rack | FB STO | HB Rack | HB STO |
|------|------|---------|--------|---------|--------|
| Karungi (Chalet 1) | Superior Double/Twin | $400 | $300 | $370 | $270 |
| Barungi (Chalet 2) | Superior Double/Twin | $400 | $300 | $370 | $270 |
| Kirungi (Chalet 3) | Superior Family | $500 | $410 | $455 | $365 |
| Murungi (Chalet 4) | Superior Family | $500 | $410 | $455 | $365 |
| The Family (Chalet 5) | Superior Family | $500 | $410 | $455 | $365 |
| The Clan (Chalet 6) | Superior Family | $500 | $410 | $455 | $365 |
| The Tribe (Chalet 7) | Superior Executive | $550 | $450 | $520 | $420 |

*Other flat-rate units (per room per night):*

| Room type | FB Rack | FB STO | HB Rack | HB STO | BB Rack | BB STO |
|-----------|---------|--------|---------|--------|---------|--------|
| A-Frames | $340 | $240 | $320 | $220 | $300 | $200 |
| Obama | $200 | $180 | $170 | $150 | $140 | $120 |
| Double Room | $160 | $140 | $130 | $110 | $100 | $80 |
| Twin Room | $150 | $140 | $120 | $110 | $90 | $80 |
| Single Room | $115 | $100 | $100 | $85 | **$85** | $70 |
| Luxury Tents | $260 | $240 | $230 | $210 | $200 | $180 |

*Per-person units (rate × guest count = total — see also A-03):*

| Room type | FB Rack | FB STO | HB Rack | HB STO | BB Rack | BB STO |
|-----------|---------|--------|---------|--------|---------|--------|
| Family Room (per adult) | $95 | $80 | $80 | $65 | $65 | $50 |
| Family Room (per child) | $55 | $45 | $45 | $35 | $35 | $25 |
| Dorm (per person, min 4 / max 6) | $70 | $60 | $55 | $45 | $40 | $30 |

*Camping (without breakfast):*
- Ziwa tent hire: $35 rack / $20 STO
- Own tent: $25 rack / $20 STO
- Breakfast add-on: $10/person · Full meal: $15/person

---

**Scope:**
- Audit all rows in `accommodation_rates` and `accommodation_units` against the tables above.
- Correct Karungi and Barungi: reassign from Superior Family to Superior Double/Twin rate type.
- Correct Single Room: default BB rate must be $85 rack (not $100).
- Confirm A-Frames unit exists in `accommodation_units` with BB rates populated (chalets have no BB; A-Frames do).
- Apply all corrections via DB migration.
- Validate: open a new booking for Karungi → $300 FB STO default; Single room → $85 BB rack default; all other room types show correct defaults.

---

### A-07 — Introduce 2027 rates and year-based rate management

**Context:** The 2027 rate sheet introduces changes to Luxury Tents and Family Room child rates. All chalet and most other room rates are unchanged. A-Frames are formally included at the same rate as 2026. Activities rates are also published but are not stored in the booking system.

**2027 changes from 2026 (accommodation only):**

| Room type | Rate | 2026 | 2027 |
|-----------|------|------|------|
| Luxury Tents | FB Rack | $260 | $280 |
| Luxury Tents | FB STO | $240 | $260 |
| Luxury Tents | HB Rack | $230 | $250 |
| Luxury Tents | HB STO | $210 | $230 |
| Luxury Tents | BB Rack | $200 | $220 |
| Luxury Tents | BB STO | $180 | $200 |
| Family Room child | FB Rack | $55 | $65 |
| Family Room child | FB STO | $45 | $55 |
| Family Room child | HB Rack | $45 | $50 |
| Family Room child | HB STO | $35 | $40 |
| Family Room child | BB Rack | $35 | $35 (unchanged) |
| Family Room child | BB STO | $25 | $25 (unchanged) |
| Camping (Ziwa tent) | STO | not listed | $30 |
| All other rooms | all | — | unchanged |

*2027 Family Room adult rates are unchanged from 2026.*

**2027 activities rates (for reference — not currently stored in the booking system):**

| Activity | Foreign Non-Resident | Foreign Resident | Uganda Resident |
|----------|---------------------|------------------|-----------------|
| Entrance + Rhino Trekking | $60/A · $30/C | $50/A · $25/C | UGX 50,000/A · 15,000/C |
| Shoebill (6am–9pm) | $30/A · $15/C | $25/A · $10/C | UGX 30,000/A · 10,000/C |
| Birding | $30/A · $15/C | $25/A · $10/C | UGX 30,000/A · 10,000/C |
| Night/Nature Walks | $25/A · $10/C | $25/A · $10/C | UGX 30,000/A · 10,000/C |

**Investigation required before build:** Does `accommodation_rates` support a `year` or `valid_from` dimension? If not, the simplest approach is a `year` integer column on the rates table. Findings in `versions/v2.12/phase_1_development/investigations/phase_one/A7_rate_year.md`.

**Scope (post-investigation):**
- Add year dimension to `accommodation_rates` via migration.
- Seed 2027 rates for changed rows; all unchanged rows copy from 2026.
- Booking form selects rates based on the booking's check-in year.
- Admin rates view must show which year's rates are displayed.
- Validate: booking with 2027 check-in uses 2027 Luxury Tent and Family Room child rates; 2026 check-in uses 2026 rates; all unchanged room types are unaffected.

---

### A-08 — Confirm and apply final A-Frame unit names

**Context:** The 4 A-Frame units were seeded with placeholder Swahili names (Alfajiri, Kilele, Nyota, Upeo) with a note that final names are to be confirmed by Head Office. Three options per unit are proposed below — select one per unit before implementation.

**Theme: Indigenous trees of Nakasongola / central Uganda savanna**

Pick 4 from the longlist below — one per unit. Mvule is confirmed; choose 3 more.

| Name | Tree | Why it fits Ziwa |
|------|------|-----------------|
| **Mvule** | *Milicia excelsa* — African teak | Uganda's national tree; ancient, hardwood, landmark specimen — confirmed ✓ |
| **Musambya** | *Markhamia lutea* — Nile tulip tree | One of Uganda's most iconic trees; erupts yellow-gold in dry season; very common in central Uganda savanna |
| **Mugavu** | *Albizia zygia* — West African albizia | Wide spreading canopy, classic shade tree of the region; the genus the user referenced |
| **Ekooma** | *Borassus aethiopum* — Borassus palm | The tall palms silhouetted across Nakasongola's skyline are almost all Borassus — it is the visual signature of this exact landscape |
| **Muguwa** | *Ficus natalensis* — bark cloth fig | Culturally sacred in Uganda; bark cloth making originates here; a tree with deep local meaning |
| **Omurinzi** | *Erythrina abyssinica* — flame coral tree | Blazes red-orange in the dry season; grows throughout central Uganda savanna and rocky ground |
| **Muwafu** | *Albizia coriaria* — Ugandan albizia | Used historically for bark cloth beating mallets; deeply local to central Uganda |

**Confirmed names (Joshua, 20 Apr 2026):**

| Unit | Name | Tree |
|------|------|------|
| A-Frame 1 | **Mvule** | *Milicia excelsa* — African teak (Uganda's national tree) |
| A-Frame 2 | **Musambya** | *Markhamia lutea* — Nile tulip tree |
| A-Frame 3 | **Mugavu** | *Albizia zygia* — West African albizia, wide spreading canopy |
| A-Frame 4 | **Mukooge** | *Albizia coriaria* / *Warburgia ugandensis* — Ugandan indigenous hardwood, culturally significant |

**Scope (post-decision):**
- Update `accommodation_units` for all 4 A-Frame rows with the confirmed names via DB migration.
- Update any hardcoded name references in `accommodation.ts` config or UI.
- Validate: admin Room Management tab and calendar display the new names; HOD Rooms tab reflects them.

---

## Track B — HOD Meeting Attendance Expansion

*Source: Joshua Roy feedback on v2.11*

---

### B-01 — Add Head Office attendees (Florence + substitutes) to HOD meeting attendance

**Feedback:** Head Office needs to be included in HOD meeting attendance. Florence is the HOD for Head Office; she is substituted by either Julie or Faith. Their attendance is almost always virtual. The attendance selector must include them and support an attendance type of "Phone" or "In-Person", defaulting to "Phone".

**Scope:**
- Add Florence, Julie, and Faith to the attendable persons list in the HOD meeting tool if not already present.
- Add an attendance-type field per attendee (Phone | In-Person) in the meeting form and stored record.
- Default: Phone.
- Admin meeting summary must display attendance type alongside name.
- Validate: select Florence as an attendee — type defaults to Phone; can be changed to In-Person.

*Investigation required: confirm whether Julie and Faith already exist as users (Faith was added in v2.10 as a Head Office substitute); confirm meeting schema supports an attendance-type field per attendee or whether a schema migration is needed.*

---

### B-02 — Add Isaac (Head Office Manager) to HOD meeting attendance

**Feedback:** Isaac, the Head Office Manager, must also be included in HOD meeting attendance. His attendance will also be virtual, with the same Phone/In-Person type field defaulting to Phone.

**Scope:**
- Add Isaac to the attendable persons list for HOD meetings.
- Same attendance-type field as B-01.
- Validate: select Isaac as an attendee — type defaults to Phone; can be changed to In-Person.

*Implement alongside B-01 — they share the same schema and UI change.*

---

## Track C — Report Date Integrity

*Source: Joshua Roy feedback on v2.11*

---

### C-01 — HODs submitting reports on the wrong date (perpetual offset loop)

**Feedback:** Some HODs (Robert Electrician cited by name) have fallen into a loop where they submitted yesterday's report today, and now the system only allows them to continue submitting for yesterday, perpetuating the offset. Joshua needs to know: how many departments are affected, how many reports need rectifying, whether the wrong-date warning is actually being shown, and a plan to fix the current state.

**This item begins with an investigation, not a build.**

**Investigation scope:**
1. Query `hod_daily_reports` to identify departments where the latest submitted report date is consistently one day behind the calendar date (i.e., perpetual T-1 pattern).
2. Count how many reports per department are offset and by how many days.
3. Confirm whether the existing wrong-date warning UI is rendering correctly for HODs in this state — inspect the portal's date-check logic.
4. Produce a report: affected departments, offset magnitude, recommended rectification steps (data correction and/or admin override tool).

**Fix scope (post-investigation, subject to sign-off):**
- Admin tool or one-time migration to correct offset report dates for affected departments.
- Ensure the wrong-date warning is unmissable (surface prominently if it is currently easy to dismiss or invisible).
- Validate: Robert Electrician's department can submit for today after correction; offset departments no longer show T-1 pattern.

**Output:** Investigation summary in `versions/v2.12/phase_1_development/investigations/phase_one/C1_date_offset.md` before any fix is applied.

---

## Track D — AI Infrastructure Overhaul

*Source: Joshua Roy feedback on v2.11*

---

### D-01 — Model evaluation and upgrade

**Feedback:** The current model (Claude Sonnet 4 via OpenRouter) should be re-evaluated. Priority is intelligence — the ability to accurately navigate and extract context from the diverse data sources available. OpenRouter's catalogue should be surveyed for candidates that are faster and more capable.

**Scope:**
- Survey OpenRouter's current model catalogue for candidates with higher reasoning capability than Claude Sonnet 4 at comparable or better cost/speed.
- Benchmark shortlisted models against a representative prompt from the existing daily brief generation.
- Recommend a primary model (intelligence-first) and a fallback.
- Update `OPENROUTER_MODEL` configuration and any model-specific prompt tuning required.
- Document findings in `versions/v2.12/phase_1_development/investigations/phase_one/D1_model_evaluation.md`.

---

### D-02 — Multi-agent architecture for AI analysis

**Feedback:** AI functionality needs a concentrated prompting and context overhaul. A multi-agent structure is required: fast, cheap sub-agents handle specific extraction/analysis tasks; an intelligent orchestrating agent synthesises and produces final output. Outputs must use a more naturally communicative schema.

**Scope:**
- Design a multi-agent pipeline:
  - **Sub-agents** (fast, cheap models): each assigned a specific extraction task (e.g. stock anomalies, occupancy trends, compliance gaps, action item surfacing). Run in parallel where possible.
  - **Orchestrating agent** (intelligent model from D-01): receives sub-agent outputs, synthesises, and produces a structured final output.
- Improve the output schema: structured but written in natural, direct language — not lists of raw data. The output should read as an intelligent briefing.
- Prompts for each sub-agent must be tightly scoped with the specific data slice they need.
- Validate: daily brief quality visibly improved; sub-agent outputs individually coherent; orchestrator synthesis adds value beyond concatenation.

*Investigation/design document required before build: `versions/v2.12/phase_1_development/investigations/phase_one/D2_multi_agent_design.md`.*

---

### D-03 — Decouple AI execution from Netlify timeout

**Feedback:** AI tasks must not be constrained by Netlify's function timeout. Processes should run in the background, unaffected by the frontend host. When complete, they push results to the cache (`hod_analysis_cache`) and serve from there. Re-execution should only happen when explicitly triggered, not on every page load.

**Scope:**
- Evaluate execution options: Netlify Background Functions (up to 15 min), Supabase Edge Functions, or an alternative background queue.
- AI generation routes must become async: the client receives an immediate acknowledgment ("Analysis running…"), then polls for completion or receives a push notification.
- On completion, result is written to `hod_analysis_cache`. Subsequent loads serve from cache without re-triggering the agent.
- Manual "Regenerate" action remains available to force a fresh run.
- Validate: triggering AI analysis does not time out; cache is populated; page load after first generation serves cached result without re-invoking the pipeline.

*Architecture decision required before build: document chosen approach in `versions/v2.12/phase_1_development/investigations/phase_one/D3_background_execution.md`.*

---

### D-04 — Feedback/observation prompting on AI regeneration

**Feedback:** When regenerating an AI output, there must be the ability to provide feedback or observations to steer the next generation towards a better result.

**Scope:**
- Add a text input to the "Regenerate" action in the admin portal (AI analysis panel and daily brief).
- The prompt is optional — if left blank, regeneration proceeds as before.
- User-supplied feedback is injected into the orchestrating agent's prompt as a "user instruction" context block, framed to guide emphasis, corrections, or focus areas.
- Feedback is not persisted beyond the single regeneration request.
- Validate: submit a regeneration with feedback — the output reflects the steering; submit without feedback — baseline behaviour unchanged.

---

## Track E — HOD Form Experience

*Source: Salim, Security HOD*

---

### E-01 — Auto-save must not navigate away from the form

**Feedback:** Salim is frustrated because the auto-save feature is taking him away from the report and submitting it before he is finished, forcing him to then edit the report even when he was mid-flow. Expectation: auto-save runs silently in the background and behaves exactly like the existing "Save Draft" button — the form stays open, no navigation, no submission — allowing the HOD to keep editing until their session ends.

**Root cause candidates (from code review):**

1. **Primary — queue callback re-entry.** `portal/components/FormRenderer.tsx` lines 143–148 — `useSubmissionQueue` invokes `onSuccess` when a previously offline-queued submission for the same department resolves. If Salim had a submission queued in an earlier session (e.g. patchy connectivity), reconnecting mid-form fires the callback and replaces his open form with the success screen.
2. **Secondary — paged-form button type.** If the "Next" button in paged forms is `type="submit"` rather than `type="button"`, a tap on mobile can trigger `handleSubmit` on a partially completed form, routing through submission rather than draft save.
3. **Tertiary — flush listener side effect.** `addSessionFlushListener(flushDraft)` and the `pagehide`/`beforeunload` persist logic should only call `saveDraft` (upserts to `hod_drafts`). Confirm no path from flush/persist hooks reaches `handleSubmit`.

**This item begins with an investigation, not a build.**

**Investigation scope:**
1. Reproduce the issue with the Security department form — ideally with Salim's user session (or equivalent) — to confirm which path fires.
2. Trace every caller of `onSuccess` in `FormRenderer.tsx` and surrounding components; map each trigger.
3. Confirm paged "Next" button `type` attribute and whether it can submit the form unintentionally on mobile.
4. Check whether any pending offline submission currently exists in the browser submission queue for Security/Salim.
5. Produce a root-cause report with the exact code path responsible.

**Fix scope (post-investigation, subject to sign-off):**
- Guard the `useSubmissionQueue` callback so it never calls `onSuccess` while there is an active, unsubmitted draft that does not correspond to the resolving queue item.
- Ensure paged "Next" buttons are `type="button"`.
- Auto-save timer (`scheduleSave`, 30 s) must only ever invoke `saveDraft` against `hod_drafts` — never `/api/submit-report`.
- Visual contract: during auto-save, only the "Draft saved" indicator appears; the form remains open; the submit button remains distinct and unchanged.
- Validate: Salim can fill the Security form across multiple sessions; "Draft saved" indicator appears; form never navigates or submits until Salim explicitly clicks the Submit button.

**Output:** Investigation summary in `versions/v2.12/phase_1_development/investigations/phase_one/E1_autosave_navigation.md` before any fix is applied.

---

## Decision log

| Date | Decision | Owner |
|------|----------|-------|
| 15 Apr 2026 | Backlog seeded from Head Office rooms feedback and Joshua v2.11 observations. 13 items across 4 tracks. Status: scoping. | Joshua |
| 15 Apr 2026 | A-01 revised: room blocking already exists — task is granting `admin.isaac` the `accommodation_manage` capability. A-08 added: A-Frame name confirmation (3 options per unit proposed). Track A grows to 9 items (16 total). |  Joshua |
| 15 Apr 2026 | A-06 expanded to full rate audit. All 7 chalets named and mapped to correct rate tiers (Karungi/Barungi = Superior Double/Twin; Kirungi–The Clan = Superior Family; The Tribe = Superior Executive). Root cause of $410 twin/double chalet default confirmed: wrong room type assigned in DB. A-07 updated with accurate 2027 delta and activities rates for reference. | Joshua |
| 20 Apr 2026 | Track E added from Salim (Security HOD) auto-save feedback. E-01 seeded with three root-cause candidates identified from code review. Primary suspect: `useSubmissionQueue` callback in `FormRenderer.tsx` firing `onSuccess` mid-form. Investigation required before fix. Total items now 17 across 5 tracks. | Joshua |
| 20 Apr 2026 | A-08 A-Frame names confirmed by Joshua: A-Frame 1 = Mvule, A-Frame 2 = Musambya, A-Frame 3 = Mugavu, A-Frame 4 = Mukooge. Pre-build decision resolved. | Joshua |
| 20 Apr 2026 | Chat 1 investigation decisions confirmed by Joshua: (1) "Augustu" is the correct unit name — do not rename. (2) A-05 scope expanded to all four chalets 3–6 (Kirungi, Murungi, The Family, The Clan) with standard config 2+2+cot; admin override required (soft warning, not hard block). (3) No single-room rate category needed — single occupancy uses standard twin/double rate unchanged. (4) A-Frame 2026 rates identical to 2027 — backfill 2026 from 2027 values. (5) 2027 chalet DB rates are wrong — revert superior_family and superior_executive 2027 rows to match 2026. (6) 2027 camping STO = $30 (rack = $35). 2026 camping STO confirmed = $20 (DB has $25 — fix in Phase 1 alongside 2027 correction). | Joshua |
| 20 Apr 2026 | Chat 5 complete. `versions/v2.12/phase_1_development/plan.md` authored in three phases (DB migrations, form + logic, AI infrastructure) with every open decision from `chat_4_handover.md` §b resolved using the recorded defaults. Progress tracker plus per-phase checklists written to `versions/v2.12/phase_1_development/progress/`. Migration numbering assigned: `042` (A-03 + A-04), `043` (A-05), `044` (A-06 + A-07 data), `045` (A-08), `046` (C-01 conditional). Status: awaiting-approval. | Joshua |
| 20 Apr 2026 | Phase 1 migrations `042_v212_augustu.sql`, `043_v212_chalet_pax.sql`, `044_v212_a06_rate_corrections.sql`, `045_v212_aframe_rename.sql` applied to Supabase project `inidzwfjnkyinxhvbrdt` at 2026-04-20 ~20:08 Africa/Kampala via Supabase MCP `execute_sql`. Smoke-query results: Augustu `pricing_type = per_person` with `max_adults = 3`, `max_total = 5`, `max_children = 3`, `cot_eligible = true`, `beds` preserved; zero rows with `pricing_type <> flat` outside Augustu; CHECK constraint rejects `pricing_type = 'other'` (23514 check_violation verified); four chalets (Kirungi, Murungi, The Family, The Clan) all carry `max_adults: 2`, `max_children: 2`, `max_total: 4`, `cot_eligible: true` with `beds` arrays preserved; 8 `superior_double_twin` rate rows (2026 + 2027) at 400/300/370/270; Karungi and Barungi both reassigned to `superior_double_twin`; 6 `a_frame` 2026 rate rows match 2027 (340/240, 320/220, 300/200); camping STO = 20 (2026) and 30 (2027); 2027 `superior_family` reverted to 500/410/455/365 and `superior_executive` to 550/450/520/420; A-Frame unit names now Mvule, Musambya, Mugavu, Mukooge with `sort_order` 500–503 and `status` unchanged; zero placeholder names remain. B-01/B-02 require no Phase 1 DDL (`hod_meetings.attendance` is `jsonb` — new keys merge at application layer in Phase 2.8). C-01: Joshua confirmed `report_date = 2026-04-18` is correct for both Accounts (`438827bf-1bf3-4989-9826-ca4d2768729f`) and Drivers & Mechanics (`b076f356-321d-4ba6-8b5c-9194e58e4c31`) — no row-level correction required. `046_v212_c01_date_corrections.sql` deleted from repo. `APPROVED: phase_1_complete` — Joshua, 20 Apr 2026. | Joshua |
| 20 Apr 2026 | Phase 2 form + logic change-set implemented per `plan.md` §§2.1–2.10 — no DB migrations. A-02 + A-03 landed together (shared types, `calculateItemRate`/`calculateBasketRate` per-person + complimentary branches, basket constructors in admin `BookingForm.tsx` and portal `BookingManagerModal.tsx`, `pricing_type` added to the four typed `accommodation_units(…)` projections). A-05 admin pax soft override via `validateAccommodationWrite.adminOverride` + `window.confirm` in `BookingForm.tsx`; HOD portal routes remain strict. A-07 year selector + collapsible rates reference in `AccommodationClient.tsx`. A-08 grep confirmed zero runtime hardcoded placeholder A-Frame names. B-01/B-02 — four `headoffice.*` usernames appended to `CORE_ATTENDEE_USERNAMES`; optional `MeetingAttendee.attendance_mode` with per-row control in `MeetingForm.tsx` and rendering in `MeetingDetailView.tsx`. C-01 — Kampala-lag guard in `/api/submit-report` before the duplicate check, `FormRenderer` confirm-retry + lag banner, `useSubmissionQueue` transparent retry on queued replay. E-01 — three-condition guard on the queue-success callback in `FormRenderer.tsx`. `tsc --noEmit` clean in both apps; `eslint` clean on modified files. A-01, A-06, and A-08 visual checks deferred to post-deploy manual smoke. Status: `APPROVED: phase_2_complete` — Joshua, 20 Apr 2026. Phase 3 may begin. | Joshua |
| 22 Apr 2026 | v2.12 recovery — Phase A complete. Two-stage root cause: (1) **H5** non-ASCII header — `X-Title: HOD Daily Brief — ${agent}` contained U+2014 em-dash, which `fetch` rejects as a non-Latin-1 ByteString pre-flight; all four sub-agents threw identically, zero HTTP round-trip. Fix: replaced em-dash with hyphen in `callSubAgent`; added `toAsciiHeader` sanitisation around `X-Title` and `HTTP-Referer` in `packages/shared/lib/openrouter.ts`. (2) **H1** reasoning-budget / truncation — after H5 cleared, the `stock` sub-agent alone (largest JSON payload) hit `finish_reason: 'length'` at the hard-coded `maxTokens: 900`. Fix: `maxTokens: 900 → 2000`; added `excludeReasoning?: boolean` option on `OpenRouterOptions` sending `reasoning: { exclude: true }`; sub-agents pass `excludeReasoning: true`. Additional hardening: `SubAgentOutcome` gained `category: 'ok'\|'empty_content'\|'invalid_json'\|'truncated'\|'rate_limit'\|'http_error'\|'transport_error'`, surfaced in `degraded_reason` (e.g. `Sub-agents failed: stock (truncated)`); `OpenRouterResponse` exposes optional `finishReason` from `data.choices[0].finish_reason`; instrumentation `console.error` on both error branches of `callSubAgent`. Regression harness (`admin-portal/__tests__/`, 24 tests via `node --test` + tsx) covers `parseJsonOrError`, `callOpenRouter` content-shape handling including the em-dash regression lock-in, `classifySubAgentError`, and a mocked E2E `runDailyDigestGeneration` that asserts `degraded: false`, correct model slugs, and category surfacing on 429. Gate A: `tsc --noEmit` clean in admin-portal and portal; `npm run lint -w admin-portal` clean (13 pre-existing warnings); `npm run build` admin-portal pass; 24/24 tests pass; real local `runDailyDigestGeneration` against `briefDate=2026-04-22` in `inidzwfjnkyinxhvbrdt` now returns `status: 'generated'`, `degraded: false`, `pipeline_version: 'v2.12-multi-agent'`, `sub_agent_models: ['google/gemini-2.5-flash']`, `orchestrator_model: 'anthropic/claude-sonnet-4.5'`. No schema touched (live `hod_analysis_cache` still rejects `daily_brief` — upserts silently swallowed by the non-blocking `cacheErr` branch, so no rows were written by Phase A). No deploy repo touched. No `main` promotion. Delivery note: `versions/v2.12/phase_2_recovery_release/phase_a_delivery.md`. Next prompt: `versions/v2.12/phase_2_recovery_release/phase_b_agent_prompt.md`. `APPROVED: phase_a_complete` — Joshua, 22 Apr 2026 (path A authorised mid-execution after H5 was isolated). | Joshua |
| 23 Apr 2026 | v2.12 recovery — Phase B complete. `hod_analysis_cache.period_type` CHECK widened on `inidzwfjnkyinxhvbrdt` via migration `046_analysis_cache_period_type_expand.sql`, applied at 2026-04-23 ~10:41 Africa/Kampala (~07:41 UTC) using MCP `apply_migration` on `plugin-supabase-supabase`. Pre-apply CHECK: `CHECK ((period_type = ANY (ARRAY['report','day','week','month'])))` — notably included `report` (undocumented, zero rows). Post-apply CHECK: `CHECK ((period_type = ANY (ARRAY['report','day','week','month','trend_alert','daily_brief','weekly_brief'])))`. Seven-value allow-list (original four preserved + three new v2.12 values). Smoke inserts for `trend_alert`, `daily_brief`, `weekly_brief` all succeeded under `BEGIN … ROLLBACK`; zero stray rows; `day`/`month`/`week` counts unchanged (3/1/1). Migration file: `4_development/portal/supabase/migrations/046_analysis_cache_period_type_expand.sql`. Delivery note: `versions/v2.12/phase_2_recovery_release/phase_b_delivery.md`. Next prompt: `versions/v2.12/phase_2_recovery_release/phase_c_agent_prompt.md`. | Joshua |
| 23 Apr 2026 | v2.12 recovery — Phase C complete. Both deploy repos mirrored from monorepo v2.12 source and pushed to `dev`. Approach: `rsync -a --delete` per top-level directory with mandatory excludes (`.git`, `node_modules`, `.next`, `.netlify`, `tsconfig.tsbuildinfo`, `.env*`), atomic `packages/shared/` replacement. Admin commit `67bb8e1` on `dev` (Netlify deploy `69e9cfc631266e0008bdb0f7`, state: ready, 2026-04-23T07:52:39Z). Portal commit `86892a0` on `dev` (Netlify deploy `69e9d060123ba100087ce1f9`, state: ready, 2026-04-23T07:55:12Z). Previous HEADs: `fac6542` (admin), `bda114e` (portal). Pre-mirror: resolved admin `/logo.png` conflict by deleting `app/logo.png/route.ts` from monorepo (kept `public/logo.png`); monorepo `tsc --noEmit` and `npm run build` clean after deletion. Pre-push checklist: `tsc --noEmit` 0 errors on both repos; `npm run build` pass on both; `packages/shared` byte-identical via `diff -rq`; `@hod/shared` still `"*"` in both; all v2.12 migrations (042–046) present in portal; Netlify BG function files present in admin. Live verification: `POST /api/daily-digest` now returns 401 (v2.11: 405); `GET /api/daily-digest` responds in 0.82s (v2.11: ~8.5s). Note: 3 `packages/shared/` lint errors in deploy repos from newer eslint resolution (`react-hooks/set-state-in-effect`, `no-explicit-any`) — pre-existing patterns, monorepo lints clean, Netlify build unaffected. No `main` promotion. Delivery note: `versions/v2.12/phase_2_recovery_release/phase_c_delivery.md`. Next prompt: `versions/v2.12/phase_2_recovery_release/phase_d_agent_prompt.md`. | Joshua |
| 23 Apr 2026 | v2.12 recovery — Phase D halted at D3. D1 (deploy freshness) PASS: admin `67bb8e1` deploy `69e9cfc631266e0008bdb0f7` ready; portal `86892a0` deploy `69e9d060123ba100087ce1f9` ready. D2 (API contract) PASS: `POST /api/daily-digest` → 202 in 857 ms; `GET /api/daily-digest` → 200 in 1,034 ms (8.5 s stall gone); 600-char feedback → 400 on both analysis endpoints; valid feedback → 200. D3 (background function + cache persistence) FAIL: `resolveBackgroundBaseUrl()` in `handler.ts` resolves `process.env.URL` (main site `https://hod-admin-portal.netlify.app`) which returns 404 for the BG function; the dev alias (`https://dev--hod-admin-portal.netlify.app`) returns 202. The POST handler's `fetch` does not check response status, silently swallowing the 404. No `daily_brief` cache row was ever created. D4–D6 not run (stopped at D3 per instructions). D7 cleanup: deleted 2 test-created `hod_analysis_cache` rows — `day / 2026-04-20` (id `5ae4526a-39d4-48c9-bb9b-01c6012010f8`) and `trend_alert / trend:2026-04-20` (id `4efd6f28-67b3-42b2-9d0f-dcff926ebec5`); zero rows remaining from validation run. Fix required: change URL priority in `resolveBackgroundBaseUrl()` to use `DEPLOY_PRIME_URL` over `URL`; add response-status check on the BG function fetch. No code changes made. No `main` promotion. Delivery note: `versions/v2.12/phase_2_recovery_release/phase_d_delivery.md`. Next prompt: `versions/v2.12/phase_2_recovery_release/phase_release_recommendation_prompt.md`. | Joshua |
| 23 Apr 2026 | v2.12 recovery — Phase E investigation prompt authored. Three prioritised hypotheses for BG function runtime failure: H1 (function not executing as a background function — `invocation_mode: null` in current deploy vs `invocation_mode: background` in Phase C deploy, likely v1 Handler API incompatibility with nodejs22.x); H2 (internal auth token mismatch — token resolution may differ between Next.js API route and Netlify Function context); H3 (esbuild bundling failure — workspace symlink or relative import not resolved at runtime). Investigation prompt: `versions/v2.12/phase_2_recovery_release/phase_e_bg_debug_prompt.md`. | Joshua |
| 23 Apr 2026 | v2.12 recovery — Phase D2 (BG URL fix). Fix applied to `handler.ts`: (1) `resolveBackgroundBaseUrl()` priority reordered to `DEPLOY_PRIME_URL → DEPLOY_URL → URL → NEXT_PUBLIC_SITE_URL`; (2) response-status guard added on BG function `fetch` — non-202 responses now logged via `console.error`. Pre-push gate: `tsc --noEmit` 0 errors, `npm run lint` 0 errors (13 warnings baseline), `npm run build` pass. Deployed to admin repo commit `92e994a` on `dev`, Netlify deploy `69ea694b3108bc00089fd4c6` (ready). Post-deploy curl validation: main site → 404 (unchanged), dev alias → 202 (correct). Authenticated POST from browser → 202 with `{ accepted: true, brief_date: "2026-04-22" }`. D3 re-run FAIL: BG function accepts invocations (202) but never writes `daily_brief` cache row — after 15+ minutes and two invocations (normal + force), zero rows. Supabase postgres logs show `authenticator` connections during test window, confirming function reaches DB query phase, but function fails during OpenRouter API call phase or later. This is the first time the BG function has been invoked at the correct URL — Phase C deployed the function, Phase D found the URL wrong, Phase D2 fixed the URL but uncovered a deeper runtime issue. D4–D6 not run. D7 addendum cleanup: deleted `trend_alert / trend:2026-04-20` (id `e1a4c5ba-6fa1-4eeb-8aa8-265dc9d91450`); zero test rows remain. Required next: debug BG function runtime execution with Netlify function logs or local `netlify dev` reproduction. No `main` promotion. Delivery note: `versions/v2.12/phase_2_recovery_release/phase_d2_delivery.md`. Updated prompt: `versions/v2.12/phase_2_recovery_release/phase_release_recommendation_prompt.md`. | Joshua |
| 26 Apr 2026 | v2.12 recovery — Phase E complete. The background-function path was abandoned per Joshua's simplification request and replaced by direct synchronous regeneration in `POST /api/daily-digest`. Admin repo commits: `ba4c701` (direct regeneration), `bd074be` (remove temporary debug logs), `3d847d4` (ESM regression test), `667fbb1` (fail regeneration on Supabase cache upsert errors and wire regression into `npm test`). Latest Netlify `dev` deploy `69edb406f7116b00080efc1d` is ready and lists only `___netlify-server-handler`; `daily-digest-background` is absent. Supabase verification on `inidzwfjnkyinxhvbrdt`: latest `hod_analysis_cache` row `daily_brief / 2026-04-25` generated at `2026-04-26 09:13:32.431+03`, `pipeline_version = v2.12-multi-agent`, 2,937 digest characters, `report_count = 7`, `total_departments = 16`, `missing_departments` is an array, no `degraded` key. Joshua confirmed the dashboard Daily Brief displays the updated 7/16 brief. Verification: `npm test`, `npx tsc --noEmit`, and `npm run build` pass in the deploy repo; `npm test` and `npx tsc --noEmit` pass in the monorepo mirror; live unauthenticated `POST /api/daily-digest` returns 401. Full lint still fails only on pre-existing shared-package baseline issues outside the Daily Brief change-set. Delivery note: `versions/v2.12/phase_2_recovery_release/phase_e_delivery.md`. No `main` promotion. | Joshua |
| 20 Apr 2026 | Phase 3 AI infrastructure change-set implemented per `plan.md` §§3.1–3.4 in the mandated sequence (D-01 → D-03 → D-02 → D-04). D-01: shared `packages/shared/lib/openrouter.ts` now resolves `OPENROUTER_MODEL` from env (default `anthropic/claude-sonnet-4.5`) and exports `OPENROUTER_MODEL_FAST` (default `google/gemini-2.5-flash`); `callOpenRouter` gained an optional `model` and `responseFormat: 'json_object'` argument; `admin-portal/.env.example` created; `[build.environment]` defaults codified in `admin-portal/netlify.toml`. D-03: `@netlify/functions` added as admin-portal devDep; `admin-portal/netlify/functions/daily-digest-background.ts` added as the Netlify Background Function host; shared internal-token guard via `_internal-auth.ts` helper; `app/api/daily-digest/handler.ts` split into `GET` (cache-read-only — returns fresh / `stale: true` / `pending: true`) and `POST` (verifyAdminAuth + length-validated `feedback` → `fetch` BG function → **202**); `route.ts` re-exports both; `DailyDigestCard.tsx` polls every 15 s while pending/stale and reverts to 5 min when fresh, auto-kicks when pending; weekly-brief route now reads cache on signature match (parity with daily). D-02: inside the BG function, the generation body (`admin-portal/lib/daily-digest-generation.ts`) runs four Gemini 2.5 Flash sub-agents (Occupancy, Stock, Compliance, Action items) via `Promise.allSettled`, then one Claude Sonnet 4.5 orchestrator; new `bookings` overlap query for `briefDate + 1`; stock sub-agent pulls `hod_verified_stock` (7-day window), open `hod_stock_flags`, and deterministic stock-key extracts from F&B/Kitchen/Store reports; action-items select expanded with `hod_departments` join, `title`, `description`, `assignee`, `updated_at`; composite signature = `signature_reports + '|' + sha256(stable-stringified sub-agent inputs)`; degraded sub-agents surface as error-tagged JSON with `degraded: true`; `analysis_data` now carries `pipeline_version: 'v2.12-multi-agent'`, `sub_agent_models`, `orchestrator_model`; orchestrator system prompt inherits the existing daily-digest prompt verbatim and adds the optional fifth **RISKS AHEAD** section. D-04: `feedback` parsed + length-validated (≤ 500 chars after trim → 400) and prepended as `[USER INSTRUCTION] … [/USER INSTRUCTION]` in `analysis/generate/handler.ts`, `analysis/weekly-brief/route.ts`, and the daily-brief generation module; `AnalysisPanel.tsx` and `DailyDigestCard.tsx` expose 500-character textareas; `feedback` is never written to `analysis_data` and never logged. `tsc --noEmit` clean across admin-portal, portal, shared; `next build` clean for both apps; eslint clean on all modified files. Validation steps requiring a live Netlify deploy (BG-function invocation, deploy-preview env swaps, sample brief audit) deferred to post-deploy smoke. Status: awaiting-approval — `APPROVED: phase_3_complete` required to close v2.12. | Joshua |

---

## References

- Head Office feedback: `versions/v2.12/phase_1_development/head_office_feedback.md`
- Joshua feedback: `versions/v2.12/phase_1_development/joshua_feedback.md`
- Salim feedback: captured in E-01 above (no separate source file)
- v2.11 release record: `versions/v2.11/snapshot.md`
- Phase 1 investigations: `versions/v2.12/phase_1_development/investigations/phase_one/`
- Phase 2 recovery: `versions/v2.12/phase_2_recovery_release/`
- Implementation context: `versions/v2.12/phase_1_development/implementation_context/`
- Chat handovers: `versions/v2.12/phase_1_development/handover/`
- Progress: `versions/v2.12/phase_1_development/progress/`
- Maintenance / hygiene (separate track): `versions/v2.13/`
