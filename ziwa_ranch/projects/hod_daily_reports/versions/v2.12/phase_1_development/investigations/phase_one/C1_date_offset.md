# C-01 — Report date integrity audit

**STATUS:** final  
**Anchor date (Kampala):** 2026-04-20  
**Database:** Supabase project `inidzwfjnkyinxhvbrdt`

## 1. Summary

Sixteen active departments have rows in `hod_daily_reports`. Two departments have a latest `report_date` at least two calendar days before 2026-04-20 (Accounts and Drivers & Mechanics — both latest `2026-04-18`), i.e. calendar-stuck relative to the audit anchor. Across all departments, in the rolling 30-day submission window ending 2026-04-20 Kampala, the maximum observed `(submitted_at AT TIME ZONE 'Africa/Kampala')::date - report_date` is **2**; there were **zero** negative offsets (future-dated `report_date` relative to Kampala submission date). The portal does **not** implement a dedicated “wrong report date / offset mismatch” warning tied to `submitted_at` vs `report_date`; the only prominent date nudge is a **hub modal** when opening a new report for **today** before 16:00 Kampala, plus a **static** “confirm the submission date” banner on the form. That combination does **not** detect or surface perpetual T-2+ reporting, so it is **not sufficient** to prevent or highlight the stuck departments’ calendar lag.

## 2. Department offset table

Rolling window for counts: `submitted_at >= TIMESTAMPTZ '2026-04-20 00:00:00+03' - INTERVAL '30 days'`.  
Offset per row: `(submitted_at AT TIME ZONE 'Africa/Kampala')::date - report_date`.

| Department | Latest `report_date` | Latest `submitted_at` (timestamptz) | Days behind 2026-04-20 | Reports submitted (30d) | Offset pattern |
|------------|----------------------|--------------------------------------|------------------------|---------------------------|----------------|
| Accounts | 2026-04-18 | 2026-04-19 11:22:04.629615+03 | 2 | 28 | **Stuck** (calendar); submissions mostly T-1 (`off_1`=26, `off_0`=2, `off_ge2`=0) |
| Craft Shop | 2026-04-20 | 2026-04-20 17:34:08.678221+03 | 0 | 29 | Healthy — same-day dominant (`off_0`=25) |
| Drivers & Mechanics | 2026-04-18 | 2026-04-20 11:52:08.332795+03 | 2 | 13 | **Stuck** (calendar); mixed offsets including `off_ge2`=1 |
| Electrical | 2026-04-20 | 2026-04-20 10:18:21.739218+03 | 0 | 28 | Healthy — same-day dominant (`off_0`=23) |
| Food & Beverage | 2026-04-19 | 2026-04-20 11:54:47.436417+03 | 1 | 31 | T-1 healthy — all rows `off_1` (AM-for-yesterday) |
| Head Office | 2026-04-20 | 2026-04-20 16:30:40.815595+03 | 0 | 21 | Mixed — includes `off_ge2`=1 |
| Housekeeping | 2026-04-19 | 2026-04-20 11:45:53.074764+03 | 1 | 30 | T-1 dominant; `off_ge2`=1 |
| HQ Maintenance | 2026-04-20 | 2026-04-20 10:17:18.187415+03 | 0 | 30 | Healthy — mixed `off_0` / `off_1` |
| HQ Reception | 2026-04-19 | 2026-04-19 19:44:59.289766+03 | 1 | 30 | Healthy — same-day dominant (`off_0`=26) |
| IT | 2026-04-20 | 2026-04-20 16:54:30.857224+03 | 0 | 24 | Mostly healthy; **`off_ge2`=5** (largest perpetual-offset count) |
| Kitchen | 2026-04-19 | 2026-04-20 10:46:20.44081+03 | 1 | 26 | T-1 healthy — all rows `off_1` |
| Main Gate | 2026-04-19 | 2026-04-20 09:26:49.126265+03 | 1 | 30 | T-1 dominant (`off_1`=29) |
| Plumbing | 2026-04-19 | 2026-04-19 22:38:37.025806+03 | 1 | 29 | Mixed |
| Security | 2026-04-19 | 2026-04-20 09:06:32.359107+03 | 1 | 29 | T-1 healthy — all rows `off_1` |
| Store | 2026-04-19 | 2026-04-19 20:56:31.638794+03 | 1 | 29 | Healthy — same-day dominant; `off_ge2`=1 |
| Wildlife | 2026-04-20 | 2026-04-20 16:20:33.246432+03 | 0 | 31 | Healthy — same-day dominant (`off_0`=30) |

**Decision — “stuck / perpetually offset”:** Departments whose latest `report_date` is ≥2 days behind the anchor date: **Accounts**, **Drivers & Mechanics**. Departments with notable `off_ge2` in the window but current latest date: **IT** (5 rows), plus single-row cases in Drivers, Head Office, Housekeeping, Store.

## 3. Warning UI status

| Location | Lines (approx.) | Behaviour |
|----------|-----------------|------------|
| `portal/app/report/[slug]/DepartmentHub.tsx` | 106–115, 465–488 | **Renders:** full-screen dimmed overlay (`fixed inset-0 z-50`, white card). **Condition:** user taps a smart-date button for **today’s** Kampala date **and** Kampala hour **&lt; 16**. **Copy:** “It’s before 4:00 PM. Most HODs report for yesterday…” with primary “Report for today” and secondary “Report for yesterday instead”. **Dismissible:** only by choosing a button (no backdrop-dismiss in code). **Prominence:** high — blocks navigation until a choice is made. |
| `portal/components/FormRenderer.tsx` | 507–508, 514–526 | **Renders:** static amber callout: “Please confirm the submission date is correct before submitting.” plus date input (`min`/`max` clamp) and optional `deadlineBadge` (deadline / lateness messaging from `getDeadlineBadge`, not offset detection). **Condition:** always on new-report form header when not `editMode` and not `lockedDate`. **Dismissible:** N/A (not a modal). **Prominence:** medium — small text, not tied to detected mismatch. |
| `portal/components/SessionGuard.tsx` | 1–18 | **No** date or `report_date` logic — session idle timer only. |
| `portal/app/api/submit-report/route.ts` | 166–264 | **No** validation comparing `reportDate` to Kampala “today” or to inferred offset from server time; duplicate check on `(department_id, report_date)` only. |
| `packages/shared/lib/submission-status.ts` (re-exported via `portal/lib/submission-status.ts`) | 17–32, 62–91 | `getSubmissionStatus` / `getDeadlineBadge` classify timeliness vs deadline rules; **they do not** compare chosen `report_date` to the calendar date of submission for a “wrong date” warning. |

**Screenshot-in-words (HOD):** (A) From the department hub before 16:00, tapping “today” shows a centred white dialog on a dark scrim: bold “Are you sure?”, explanatory paragraph, green primary button “Report for today”, outlined “Report for yesterday instead”. (B) On the form, a pale grey panel contains name, then a light amber strip with small text asking to confirm the date, then a native-style date picker and a small coloured badge for deadline status when applicable.

**Decision — effectiveness:** The hub modal is **effective only** for the narrow case “I chose today before 16:00”. It does **not** warn when `report_date` lags the operational calendar by multiple days while the user picks “yesterday” or older allowed dates, and the API does not reject those patterns. **Not effective** for detecting or correcting perpetual multi-day lag.

## 4. Recommended rectification approach

**(a) Data rectification:** Run a **scoped admin correction** (SQL or small internal tool) for the two calendar-stuck departments: identify missing `report_date` values between latest and anchor, decide whether gaps are genuine non-submission or mis-dated rows, then either insert placeholders / chase HODs or **update `report_date`** only where business evidence supports it. Avoid blind bulk shifts without row-level review (downstream stock, media `report_date`, uniqueness on `(department_id, report_date)`).

**(b) Prevention:** Add **server-side** guardrails on submit: e.g. reject or require explicit confirmation when `(now() AT TIME ZONE 'Africa/Kampala')::date - report_date::date` exceeds a threshold (≥2), and optionally log/notify ops. Complement with a **client banner** when the selected `report_date` is more than one day before Kampala today (distinct from the existing pre-16:00 “today vs yesterday” modal).

**(c) Migration considerations:** Any mass `UPDATE` to `report_date` must respect unique constraints, rewrite `hod_report_media.report_date` and any other tables keyed by that date, and avoid breaking edit history semantics.

**Primary recommendation:** **Server-side offset / lag check with hard or soft block** — single choke-point, works for guest and authenticated clients, auditable, and closes the gap the UI does not cover. Use targeted data fixes for Accounts and Drivers & Mechanics after confirming ground truth.

## 5. Sources

### Schema (information_schema)

```sql
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('hod_daily_reports', 'hod_departments')
ORDER BY table_name, ordinal_position;
```

**Result (relevant):**  
`hod_daily_reports`: `department_id` (uuid), `report_date` (date), `submitted_at` (timestamptz), `submitted_by` (text), `report_data` (jsonb), `edited_at`, `acknowledged_*`, etc.  
`hod_departments`: `id`, `name`, `slug`, `hods`, `sort_order`, `is_active`, `created_at`.

### Aggregates

```sql
SELECT d.name AS department,
  MAX(r.report_date) AS latest_report_date,
  MAX(r.submitted_at) AS latest_submitted_at,
  (DATE '2026-04-20' - MAX(r.report_date))::int AS days_behind_today
FROM hod_daily_reports r
JOIN hod_departments d ON d.id = r.department_id
WHERE d.is_active IS DISTINCT FROM false
GROUP BY d.id, d.name
ORDER BY d.name;
```

```sql
WITH recent AS (
  SELECT r.department_id,
    d.name AS department,
    ((r.submitted_at AT TIME ZONE 'Africa/Kampala')::date - r.report_date) AS day_offset
  FROM hod_daily_reports r
  JOIN hod_departments d ON d.id = r.department_id
  WHERE r.submitted_at >= (TIMESTAMPTZ '2026-04-20 00:00:00+03' - INTERVAL '30 days')
)
SELECT department,
  COUNT(*) AS reports_30d,
  COUNT(*) FILTER (WHERE day_offset = 0) AS off_0_same_day,
  COUNT(*) FILTER (WHERE day_offset = 1) AS off_1_t_minus_1,
  COUNT(*) FILTER (WHERE day_offset >= 2) AS off_ge2,
  COUNT(*) FILTER (WHERE day_offset < 0) AS off_negative,
  MAX(day_offset) AS max_offset_30d,
  MIN(day_offset) AS min_offset_30d
FROM recent
GROUP BY department_id, department
ORDER BY department;
```

### Code paths reviewed

- `ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/DepartmentHub.tsx` — lines 73–127, 465–488  
- `ziwa_ranch/projects/hod_daily_reports/4_development/portal/components/FormRenderer.tsx` — lines 58–71, 502–527  
- `ziwa_ranch/projects/hod_daily_reports/4_development/portal/components/SessionGuard.tsx` — lines 1–18  
- `ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/submit-report/route.ts` — lines 166–264  
- `ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/new/page.tsx` — lines 22–31  
- `ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/submission-status.ts` — lines 17–91  

**Tooling:** Supabase MCP server `project-0-the-business-developers-supabase`, tool `execute_sql`.
