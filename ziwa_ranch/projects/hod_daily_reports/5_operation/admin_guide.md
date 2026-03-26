# HOD Daily Reports — Admin Guide

> **For:** Joshua and Wellington
>
> **Admin dashboard:** [hod-admin-portal.netlify.app](https://hod-admin-portal.netlify.app)
> **Password:** `ziwajefes2005`

---

## Logging in

1. Open [hod-admin-portal.netlify.app](https://hod-admin-portal.netlify.app)
2. Enter the password: `ziwajefes2005`
3. You're in — the session lasts 24 hours

There are no individual admin accounts. Anyone with the password has full access.

---

## Overview page (home)

The home page shows:

- **KPI cards** — total reports today, departments submitted, departments missing
- **Today's submissions** — per-department status showing who has submitted and who hasn't
- **7-day and 30-day submission rates** — per department, excluding Sundays (no reports expected on Sundays)

Rates are Kampala-time-aware: today is not counted as "missed" until 4 PM.

---

## Reviewing reports

### Reports page

Go to **Reports** in the navigation. You'll see a filterable table of all submitted reports.

- **Filter** by department, date range, or review status
- **Review dots** show status: grey (unreviewed), green (reviewed), amber (needs attention)
- **CSV export** — download the filtered results as a spreadsheet

### Reviewing a single report

Tap any report row to open the detail page. You'll see the report exactly as the HOD sees it. From here you can:

- **Acknowledge** — mark it as reviewed (pick "Managing Director" or "General Manager" as reviewer)
- **Edit** — open the edit form to make corrections
- **Delete** — permanently remove the report (requires typing the department name to confirm)

### Batch review

To review multiple reports at once:

1. On the Reports page, tick the checkboxes next to the reports you want to review
2. Use "Select all unreviewed" to tick all unreviewed reports at once
3. A review bar appears at the bottom — pick the reviewer name and optionally add a comment
4. Tap **Review Selected** — all ticked reports are marked as reviewed in one go

---

## Compliance tracking

Go to **Compliance** in the navigation.

- **Per-department bars** show submission rates over a configurable period (7, 14, or 30 days)
- Sundays are excluded from the count (no reports expected)
- Today is excluded before 4 PM (too early to count as missed)

### WhatsApp compliance message

Tap **Copy WhatsApp message** to copy a formatted compliance summary to your clipboard. Paste it directly into a WhatsApp chat to share with staff. The format looks like:

```
*HOD Daily Reports — Compliance Summary*
19 Mar – 25 Mar 2026 (7 days, 6 reporting days)

Electrical: 6/6 (100%)
Kitchen: 5/6 (83%) — 1 missed
...

*Overall: 78/90 (87%)*
```

---

## Stock reconciliation

Go to **Stock** in the navigation.

Shows stock reconciliation for F&B and Store departments. Compares Monday baseline counts against daily stock added/used to flag discrepancies.

---

## Editing a report

From any report detail page, tap **Edit**. The admin edit form lets you:

- Change any field in the report
- **Change the report date** — a date input at the top lets you reassign the report to a different day (the system checks for duplicates)
- Save changes

Admin edits have no time limit — unlike HODs, you can edit reports at any time.

---

## Deleting a report

From any report detail page, tap **Delete**. You'll be asked to type the department name to confirm. This is permanent — deleted reports cannot be recovered.

---

## Error log

Go to **Errors** in the navigation.

Shows client-side errors logged by the HOD portal. Useful for diagnosing issues HODs report ("the form wouldn't submit", "the page went blank").

---

## HOD accounts

All HOD accounts use the password `ziwa2026`. The full list of accounts is in the v2 build handover (`4_development/next_chat_handover_v2.md`).

If an HOD is locked out or needs a password reset, the passwords are stored in the `password_display` column of the `hod_users` database table.

---

## Quick reference

| Task | Where |
|---|---|
| See who submitted today | Overview (home page) |
| Review a batch of reports | Reports > tick checkboxes > Review Selected |
| Check weekly compliance | Compliance page |
| Share compliance with staff | Compliance > Copy WhatsApp message |
| Edit a report | Reports > tap report > Edit |
| Delete a report | Reports > tap report > Delete |
| View stock data | Stock page |
| Check for errors | Errors page |

---

*Last updated: 26 March 2026*
