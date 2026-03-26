# HOD Daily Reports — Brainstorm

> **Type:** Software
> **Depth:** Quick
> **Staging:** Staged — Phase 1: web portal with forms and database storage. Phase 2: WhatsApp Business templates. Phase 3: AI verification agent. Phase 4: automated insights, trends, follow-ups.
> **Complexity stance:** Simple as possible — get to functional fast, iterate from there
> **Started:** 14 March 2026

---

## The problem

Ziwa Ranch has 13 departments, each with an HOD (head of department). Daily reports are mandatory. But there's no system — reports happen informally, inconsistently, and without structure. Some HODs stopped filing them entirely because "nothing happened with them under previous management" (Salim's words from the 13/03 HOD meeting). The mandate is now clear: report daily or it's a failure of responsibilities. What's missing is the tool that makes it easy to do.

## What we're building (Phase 1)

A dedicated online portal — a website link that every HOD visits daily. They choose their department, which loads a form designed specifically for what that department needs to report. They fill it in, hit submit, and the data goes into a database. That's it. No login systems. No dashboards. No AI. Just: link → department → form → submit → stored.

The priority is removing friction. These are people working on a ranch — they need something they can fill in on their phone at the end of the day in five minutes.

## Who uses it

**Submitters:** 13 HODs (some departments share — Kanja & Roger for Vehicle Maintenance)

**Consumers:** Joshua (primary), Wellington (GM)

## Departments and their HODs

| # | Department | HOD(s) |
|---|---|---|
| 1 | Electrical | Robert |
| 2 | HQ Reception | Emilly |
| 3 | Finance | Musoni |
| 4 | Kitchen | Sensio |
| 5 | Housekeeping | Elly |
| 6 | Vehicle Maintenance | Kanja & Roger |
| 7 | HQ Maintenance | David |
| 8 | Food & Beverage | Howard |
| 9 | Security | Salim |
| 10 | Store | Denis |
| 11 | Main Gate | Jjuko |
| 12 | Plumbing | Richard |
| 13 | IT | Benson |

## Draft report templates

These were discussed in the HOD all-hands meeting on 13/03/2026. They are drafts — pending GM response and HOD consultation. For Phase 1, we build what's here and refine through use.

**Electrical (Robert)**
- Fence status report (areas patrolled, damage reports, recent repairs, power report, cleanliness report)
- Work done today (project, what was done, where)
- Work to be done tomorrow (project, what will be done, where)
- Challenges or successes to note

**HQ Reception (Emilly)**
- How many pax signed in
- Challenges or successes to note

**Finance (Musoni)**
- Balances at start of day (Petty cash & Mobile Money)
- Balances at end of day (Petty cash & Mobile Money)
- Payments made today (to whom, for what and how much)
- Challenges or successes to note

**Kitchen (Sensio)**
- Opening stock
- Closing stock (what was added, what was used)
- Challenges or successes to note

**Housekeeping (Elly)**
- Status of rooms (damages, missing items, condition)
- Laundry (damaged clothes, etc.)
- Challenges or successes to note

**Vehicle Maintenance (Kanja & Roger)**
- Work done (vehicle number plate, what was done, cost, parts used, repair success or failure)
- Regular vehicle checks (starts, runs, drives, oil, coolant, tyres, lights)
- Challenges or successes to note

**HQ Maintenance (David)**
- Work done (project, what was done, where, materials used)
- What to be done tomorrow
- Challenges or successes to note

**Food & Beverage (Howard)**
- Opening bar stock
- Closing bar stock
- Number of pax for breakfast; dishes ordered
- Number of pax for lunch (including à la carte if present)
- Number of pax for dinner; dishes ordered
- Service observations (lack of energy, slacking on techniques, uniform violations, etc.)
- Challenges or successes to note

**Security (Salim)**
- Gate status (which gates checked, books checked)
- Road status
- Unregistered people observed (area, number, male/female, suspected nature of business)
- Challenges or successes to note

**Store (Denis)**
- Opening stock
- Closing stock
- What was taken today (why, by whom)
- What was added today
- Challenges or successes to note

**Main Gate (Jjuko)**
- How many pax entered (per entry reason): rhino trekking, shoebill, night walk, nature walk
- Challenges or successes to note

**Plumbing (Richard)**
- Work done today (project, what was done, where)
- Work to be done tomorrow (project, what will be done, where)
- Challenges or successes to note

**IT (Benson)**
- Template not yet defined — needs consultation with Benson

## Tech decisions

- **Database:** Supabase (already in use at Ziwa for the restaurant management system)
- **Frontend:** Needs to be simple, easy to connect with Supabase, and suitable for AI-assisted development (vibe coding)
- **Hosting:** TBD — needs to be free or very cheap

## Phased approach rationale

The owner is deliberately keeping Phase 1 technically simple and low-barrier. The reasoning: get the system functional and in use immediately, then iterate. Phase 2 (WhatsApp Business integration) is deferred — it requires Meta Business developer account setup, which itself depends on company registration decisions still being worked through. Phase 3 and 4 are future vision captured for direction but not designed yet.

> *"I am having trouble with keeping the project focused on the simplicity aspect and doing things in a serviceable and foundational approach. I need to get to a functional phase as soon as possible then I can start iteration and improvement."* — Owner

## Resolved questions

1. **IT template for Benson** — still needs defining. Can be added to the portal later without architectural changes. Not a blocker for Phase 1.
2. **Authentication for Phase 1** — No passwords or logins. HODs select their department, then select their name from a list (or auto-filled if there's only one HOD). This ties reports to a person without any account setup. Passwords come in a later phase.
3. **Notifications** — None in Phase 1. Future: email notifications first, then migrate to WhatsApp once the Business account is live.
4. **Device compatibility** — Must work well on mobile phones (primary use case) AND on desktop/POS machines in the restaurant and office computers. Responsive design, not mobile-only.

## Still open

1. **IT template for Benson** — needs consultation before his form can be built. Not a Phase 1 blocker — can be added later.

---

## Synthesis

We're building the simplest possible daily reporting system for 13 Ziwa Ranch departments. Phase 1 is a web form portal backed by Supabase — no authentication, no dashboards, no AI. HODs visit a link, pick their department, fill in their department-specific form, and submit. The data is stored and available for Joshua and the GM to review.

The report templates are already drafted from the 13/03 HOD meeting. The tech stack is Supabase (already available) plus Next.js on Vercel for the frontend — simple, well-supported by AI tooling, and free to host. No authentication beyond name selection, no notifications, no dashboards. The goal is to have this functional as quickly as possible so HODs can start using it immediately — iteration and sophistication come later in Phases 2–4.
