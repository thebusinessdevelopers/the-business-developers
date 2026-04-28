# C-01 — Implementation context: Server-side date-offset guard + stuck-dept data correction

## Item summary

Add a Kampala-calendar offset guard on `POST /api/submit-report` (with an explicit client re-confirm path), correct the two calendar-lagged department reports after row-level review, and optionally add a complementary date-lag banner in the new-report flow because the hub only gates “today before 16:00”.

## Files to change

| File | What changes | Function / type name |
|------|--------------|----------------------|
| `ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/submit-report/route.ts` | Parse optional `confirm_offset` (or equivalent) from `request.json()`; compute `(now AT TIME ZONE 'Africa/Kampala')::date - report_date::date`; return a confirm response when lag ≥ threshold unless flag set; otherwise continue existing insert path. | `POST` handler (`withAuth` callback) |
| `ziwa_ranch/projects/hod_daily_reports/4_development/portal/components/FormRenderer.tsx` | On `fetch('/api/submit-report')` response, handle confirm flag and retry once with `{ confirm_offset: true }`; optional banner when chosen `report_date` is >1 calendar day behind Kampala today (per investigation). | Submit handler around `fetch('/api/submit-report'` |
| `ziwa_ranch/projects/hod_daily_reports/4_development/portal/hooks/useSubmissionQueue.ts` | Same confirm/retry behaviour for queued submissions calling the same route. | Queue submit function using `fetch('/api/submit-report'` |
| `ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/DepartmentHub.tsx` | Optional: surface a non-blocking warning when navigating to `/new` with a `date` query param that is ≥2 calendar days behind Kampala today (investigation’s complementary banner); not required if `FormRenderer` alone covers pre-submit UX. | `handleDateButton`, `router.push` to `new` |

## DB migration required

Y — row-level `UPDATE` for the two stuck latest rows (target `report_date` values must be chosen after business review; placeholders below). If any `hod_report_media` rows exist for the same `department_id` + old `report_date` with `report_id` set to that report, update `hod_report_media.report_date` in the same transaction (MCP: no media rows currently tied to these two report ids or that dept+date — still include pattern for Chat 5).

```sql
-- After row-level review: replace <NEW_DATE_ACCOUNTS> and <NEW_DATE_DRIVERS> with agreed operational dates.
-- Respect hod_daily_reports_dept_date_unique (department_id, report_date).

BEGIN;

UPDATE hod_daily_reports
SET report_date = '<NEW_DATE_ACCOUNTS>'
WHERE id = '438827bf-1bf3-4989-9826-ca4d2768729f';

UPDATE hod_daily_reports
SET report_date = '<NEW_DATE_DRIVERS>'
WHERE id = 'b076f356-321d-4ba6-8b5c-9194e58e4c31';

-- If media rows reference the old calendar date for linking or display, align them with the report.
-- (Adjust OLD_DATE_* to the pre-correction report_date if it differs from 2026-04-18 after review.)
UPDATE hod_report_media m
SET report_date = hod_daily_reports.report_date
FROM hod_daily_reports
WHERE m.report_id = hod_daily_reports.id
  AND hod_daily_reports.id IN (
    '438827bf-1bf3-4989-9826-ca4d2768729f',
    'b076f356-321d-4ba6-8b5c-9194e58e4c31'
  );

COMMIT;
```

## Dependencies

None

## Complexity

S — one bounded API branch plus a small client retry; S — isolated two-row correction with uniqueness and media coupling checks.

## Validation steps

1. Submit a report with `report_date` two or more calendar days before Kampala “today” without `confirm_offset`: expect the new JSON error shape and no insert (no new `hod_daily_reports` row).
2. Repeat the same payload with `confirm_offset: true` (or agreed field name): expect `200` and `{ reportId: "<uuid>" }` as today’s successful path (`ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/submit-report/route.ts:402`).
3. After applying the data migration on a staging project, confirm `hod_daily_reports_dept_date_unique` still holds and `hod_report_media` rows for affected `report_id` values show the updated `report_date` (`schema:hod_daily_reports` unique index; `schema:hod_report_media.report_date`).

## Evidence

- **Duplicate check location:** existence query `hod_daily_reports` `.eq('department_id', …).eq('report_date', …)` then `if (existing) return … 409` — `ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/submit-report/route.ts:242-254`.
- **Offset guard placement:** **Before** the duplicate block at lines 242–254 — same-line justification: date-only guard needs no extra DB round-trip and should fail fast before the duplicate `select` (`ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/submit-report/route.ts:242-247`).
- **Existing JSON error patterns on this route:** `400` + `{ error: string }` (`176:177`, `187:188`, `192:193`, `196:197`, `199:200`, `234:236`, `291:291`); `403` + `{ error: string }` (`192:193`, `196:197`, `234:236`); `409` + `{ error: string, duplicateId?: string }` (`249:253`, `269:272`); `401` + `{ error: string }` (`199:200`).
- **Soft-confirm path:** Match `NextResponse.json({ error: '…' }, { status: 4xx })` and extend with an optional key mirroring `duplicateId` (e.g. `needsConfirmOffset: true`, `lagDays`) on first refusal; client retries the **same** body plus `{ confirm_offset: true }` (`ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/submit-report/route.ts:249-253` as precedent for extra fields).
- **Recommendation (≥2 days):** **Soft-confirm-only with client retry** — investigation explicitly pairs “reject **or** require explicit confirmation” for lag ≥2 (`ziwa_ranch/projects/hod_daily_reports/versions/v2.12/../investigations/phase_one/C1_date_offset.md:53-59`), which preserves recoverability versus an unconditional hard block.
- **Primary prevention approach (one line):** Server-side choke-point as primary recommendation (`ziwa_ranch/projects/hod_daily_reports/versions/v2.12/../investigations/phase_one/C1_date_offset.md:59`).
- **Hub modal (not offset detection):** `todayKampala` + hour `< 16` opens modal — `ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/DepartmentHub.tsx:106-115`, `465-488`.
- **`submitted_at` vs `report_date` in hub:** `getSubmissionStatus(report.submitted_at, report.report_date)` drives deadline badge only — `357:358` — `ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/DepartmentHub.tsx:357-358`; that helper implements deadline bands, not “report_date vs Kampala today” lag (`ziwa_ranch/projects/hod_daily_reports/4_development/packages/shared/lib/submission-status.ts:17-31`).
- **Complementary UI:** Investigation calls for a client banner when selected `report_date` is more than one day before Kampala today, distinct from the pre-16:00 modal (`ziwa_ranch/projects/hod_daily_reports/versions/v2.12/../investigations/phase_one/C1_date_offset.md:55`); effectiveness gap vs perpetual lag (`ziwa_ranch/projects/hod_daily_reports/versions/v2.12/../investigations/phase_one/C1_date_offset.md:49`); **server guard alone is insufficient** for pre-submit visibility — add banner in `FormRenderer` (and optionally hub date navigation); hub modal lines remain `ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/report/[slug]/DepartmentHub.tsx:106-115`, `465-488`.
- **Media coupling:** `hod_report_media` carries **both** `report_id` (nullable) and `report_date` (`NOT NULL`); linking updates `report_id` while filtering `department_id`, `report_date`, null `report_id` (`ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/008_report_media.sql:11-22`; `ziwa_ranch/projects/hod_daily_reports/4_development/portal/app/api/submit-report/route.ts:54-59`). No unique index on `(department_id, report_date)` for media — only non-unique btree index (`MCP query: pg_indexes hod_report_media` → `idx_report_media_dept_date`).
- **Uniqueness on reports:** `CREATE UNIQUE INDEX hod_daily_reports_dept_date_unique ON hod_daily_reports(department_id, report_date)` — `ziwa_ranch/projects/hod_daily_reports/4_development/portal/supabase/migrations/004_v16_schema.sql:17-25`; **MCP query:** `pg_indexes` on `hod_daily_reports` returns `hod_daily_reports_dept_date_unique` on `(department_id, report_date)`.
- **Stuck rows (Accounts, Drivers & Mechanics, `report_date` 2026-04-18):** **MCP query:** `SELECT d.name, r.id, r.report_date, r.submitted_at … WHERE d.name IN ('Accounts','Drivers & Mechanics') AND r.report_date = DATE '2026-04-18'` → Accounts `id` `438827bf-1bf3-4989-9826-ca4d2768729f`, `submitted_at` `2026-04-19 11:22:04.629615+03`; Drivers & Mechanics `id` `b076f356-321d-4ba6-8b5c-9194e58e4c31`, `submitted_at` `2026-04-20 11:52:08.332795+03`.
- **Media rows for those reports / dept+date:** **MCP query:** `hod_report_media` joined to departments for those `report_id` or dept+`2026-04-18` returned **zero rows** — no current FK/`report_date` drift for these two ids in production snapshot queried here.
- **Data correction approach:** **Row-level review** before any `UPDATE` — investigation default (`ziwa_ranch/projects/hod_daily_reports/versions/v2.12/../investigations/phase_one/C1_date_offset.md:53`, `59`).
