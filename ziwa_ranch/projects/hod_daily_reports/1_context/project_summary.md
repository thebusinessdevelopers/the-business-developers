# HOD Daily Reports — Project Summary

> **What this is for:** A plain-language overview of the project for anyone who needs to understand it without technical background. If you're looking for technical detail, see `3_architecture/design.md`.

---

## What we've built

A website where every head of department (HOD) at Ziwa Rhino And Wildlife Ranch submits a short daily report about their department. Each of the 15 departments has its own form — tailored to what that department actually needs to report on. Reports are stored centrally and reviewed through a separate admin dashboard.

## Why

Ziwa has 15 departments. Each one generates important information every day — what work was done, what stock was used, how many guests arrived, what problems came up. Before this system, there was no reliable way to capture it. Some HODs reported informally, some stopped reporting entirely, and the information that came through was inconsistent and hard to act on.

This project gives every HOD a quick, structured way to file their daily report. It takes five minutes on a phone. The information is consistent, complete, and stored where management can see it.

## How it works

### For HODs

1. The HOD opens the reporting website on their phone or computer
2. They tap their department from a grid
3. They tap their name (or enter a name as a guest substitute)
4. They enter their password and log in
5. The department hub shows smart date buttons — they tap to start a report for the right day
6. A form appears with fields specific to their department — for example, Accounts reports balances and payments, Security reports gate checks and road status, Kitchen reports stock levels
7. They fill it in and press submit
8. Done — the report is stored. If they need to make a change, they can edit it until 6 PM the following day

Drafts save automatically every 30 seconds. If the phone loses signal, the report is saved locally and submits automatically when connectivity returns.

### For management

The admin dashboard (a separate website) lets management:

- See which departments have submitted today and which haven't
- Review and acknowledge individual reports
- Batch-review multiple reports at once
- Track compliance rates over 7-day and 30-day windows
- Copy a WhatsApp-formatted compliance summary to share with staff
- View stock reconciliation for F&B and Store
- Edit or delete reports when corrections are needed

## What it costs

- **Database:** Already available (Supabase, shared with the restaurant system)
- **Website hosting:** Free (Netlify free tier, two sites)
- **Ongoing cost:** Effectively zero at current scale

## What this means for management

- Every department reports daily, in the same structure, without fail
- Information is stored permanently — you can look back at any day's reports
- Problems, stock issues, and guest numbers are visible across the ranch in one place
- No more chasing HODs for updates or relying on informal messages
- Compliance tracking shows exactly who's reporting and who isn't
- The system is built to grow — WhatsApp submission, AI-assisted verification, and automated insights are planned for future phases

## What happens next

The web portal (v2.0) is live and in daily use. The next major addition is Phase 2 — WhatsApp-based submission, allowing HODs to submit reports via WhatsApp messages instead of (or alongside) the website. This is pending Meta Business verification. After that, Phase 3 adds an AI agent to check report quality, and Phase 4 brings automated summaries and trend analysis.

---

*Last updated: 26 March 2026*
