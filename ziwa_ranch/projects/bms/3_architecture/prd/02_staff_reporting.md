# PRD 02 — Staff Reporting

> **Covers:** Form renderer, report submission (online and offline), sync queue, admin review with comments and mentions, N/A section toggle, submission tracker on the admin dashboard.

---

## What we're building

The daily reporting loop: department heads submit their reports via dynamically rendered forms driven by the JSONB schema configured in their department. Admins review, comment, and flag. The system works offline — submissions queue locally and sync when connectivity returns. The admin dashboard shows at a glance which departments have and have not submitted for the day.

This is the core of BMS's data collection. Everything in the intelligence layer depends on clean, complete, consistent daily data from this module.

---

## Why

The brainstorm identified data quality as the foundation of intelligence. The HOD Daily Reports system at Ziwa already proved the concept at one property. BMS rebuilds it properly: generic (schema-driven, not hardcoded), multi-tenant, and offline-first. Without reliable daily data collection, the morning brief is empty and the product has no differentiation.

---

## Requirements

### Form renderer

**R2.1** — A department head navigating to `/submit/[departmentId]` sees a form rendered from their department's `form_schema` JSONB. The rendered form reflects the schema exactly — all sections, fields, types, labels, validation rules, and help text.

**R2.2** — All field types specified in the form schema contract render correctly: `text`, `textarea`, `number`, `number_stepper`, `select`, `multi_select`, `checkbox_group`, `inventory_grid`, `room_grid`, `repeater`, `photo`, `date`, `time`.

**R2.3** — Required fields are visually marked with a red asterisk. The asterisk appears on all field types, including `inventory_grid`, `room_grid`, `repeater`, and `checkbox_group` (not only simple text/number fields — this was a known bug in HOD v2.5).

**R2.4** — The form cannot be submitted if any required field is empty. The validation error appears adjacent to the field and the page scrolls to the first error.

**R2.5** — The `inventory_grid` field type renders as a list of named stock items with a numeric input for each. The item list is drawn from the organisation's `stock_items` table. A fuzzy search input filters the list for organisations with more than 20 items.

**R2.6** — The `room_grid` field type renders as a grid of room identifiers with a status selector for each. Room identifiers are drawn from the organisation's configured room count.

**R2.7** — The `repeater` field type renders as a dynamic list of rows, each with the sub-fields specified in the schema. Rows can be added and removed. Minimum and maximum row counts are respected.

**R2.8** — The `photo` field type allows the user to take a photo with their phone camera or upload from their gallery. Photos are uploaded to Supabase Storage and the URL is stored in the report data.

**R2.9** — A form schema change by an admin takes effect on the next form load, not retroactively on existing submitted reports.

### N/A sections

**R2.10** — Every section that has `na_allowed: true` in the form schema displays an "N/A" toggle at the section header. Toggling N/A bypasses all validation for that section and records a `report_section_na` row with the section key.

**R2.11** — The user must provide a reason for marking a section N/A before the section is accepted as N/A.

**R2.12** — In the admin review view, N/A sections are visually distinct from completed sections. An admin can flag an N/A section as suspicious, which sets `flagged = true` on the `report_section_na` row and creates an `intelligence_flags` entry.

### Report submission — online

**R2.13** — Submitting a completed form creates a row in `reports` with `status = 'submitted'`, `data` containing the form response keyed by field key, and `submitted_at` set to now.

**R2.14** — Only one report per department per day is permitted. Attempting to submit a second report for the same department and date returns an error: "Today's report has already been submitted."

**R2.15** — A department head can view their own submitted reports for the last 30 days from `/submit/[departmentId]`.

### Report submission — offline

**R2.16** — When the user is offline, the form loads from IndexedDB. The form schema is available because it was cached on last online access.

**R2.17** — When the user submits a form offline, the submission is written to IndexedDB with a client-generated `sync_id` and queued in the sync queue. The UI shows "Saved — will sync when online."

**R2.18** — When connectivity is restored, the service worker drains the sync queue: for each pending submission, it posts to `/api/sync`, which upserts the report to Supabase using `sync_id` as the conflict key.

**R2.19** — If a submission in the queue conflicts (a report for that department and date already exists on the server), the server version is kept and the user is notified: "Your report for [date] was already submitted by another session."

**R2.20** — The sync status indicator is always visible when there are items in the queue. The indicator disappears silently when the queue is empty. It never shows an alarming error unless sync has failed and requires user action.

**R2.21** — The following data is cached in IndexedDB and available offline: the user's department form schema, the organisation's stock items (name and unit only), the user's own reports for the last 7 days, and the user's profile.

### Admin review

**R2.22** — An admin or manager navigating to the reports list sees all reports submitted for their organisation for a selected date, grouped by department, with status indicators (submitted / reviewed / flagged / missing).

**R2.23** — Clicking a report opens the report detail view, showing all submitted data rendered in a read-only version of the form layout, alongside any N/A sections.

**R2.24** — An admin can leave a review comment on a report. The comment is saved to `report_reviews` with `reviewer_id` and `created_at`. Comments support @mention of other users.

**R2.25** — When a user is @mentioned in a review comment, they receive a notification of type `mention`.

**R2.26** — An admin can change a report's status to `reviewed` or `flagged`. Flagging a report creates an `intelligence_flags` entry of type `report_flagged`.

**R2.27** — An admin can view the previous day's report for a department alongside the current one ("compare with previous") as a toggle on the report detail view.

### Submission tracker

**R2.28** — The admin dashboard shows a submission tracker for today: a list of all active departments with a visual indicator for each — submitted (green), not yet submitted (yellow), overdue (red, if past the department's scheduled submission time).

**R2.29** — "Overdue" is defined as: the current time is more than 1 hour past the department's `report_schedule.hour` and no report has been submitted for today.

**R2.30** — Clicking a department in the submission tracker opens their report if submitted, or a detail view showing their last submission date if not.

---

## Done when

- [ ] A department head can complete and submit a report for their department on a mobile device in under 5 minutes (for a typical 3-section form)
- [ ] A department head can submit a report while offline, and the report appears in the admin dashboard within 30 seconds of connectivity being restored
- [ ] All 11 field types render correctly and validate correctly
- [ ] An admin can review, comment, and flag any report
- [ ] The submission tracker accurately shows which departments have and have not submitted for today
- [ ] Attempting to submit a second report for the same day returns an appropriate error
- [ ] N/A toggle works and reason is required
- [ ] All screens work on 375px mobile

**V2+ note:** The `inventory_grid` field in reports links to `stock_items` by item name. In V2, when POS is added, ingredient deductions from POS sales will create automatic stock transactions. The form schema's `inventory_grid` field should store item names (not IDs) in V1 report data to avoid FK issues when items are deleted or merged. In V2, a dedicated stock reconciliation view will correlate report inventory_grid data with actual stock_transactions.
