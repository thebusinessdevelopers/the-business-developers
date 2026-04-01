# BMS V1 — PRD Scope Overview

> Five PRDs cover V1. Each is a coherent, independently buildable unit. They are ordered by dependency — build in this sequence.

---

| PRD | File | What it covers | Dependencies |
|---|---|---|---|
| 01 | `01_foundation.md` | Supabase setup, schema migrations, RLS, auth, onboarding wizard, org/user management, department template library | None — this is the base |
| 02 | `02_staff_reporting.md` | Form renderer (JSONB schema → React form), report submission, offline queue, admin review, N/A sections | 01 |
| 03 | `03_stock_management.md` | Stock items library, purchase orders (inbound), requisitions, automatic quantity tracking, threshold alerts | 01 |
| 04 | `04_communication_intelligence.md` | Threads, messages, mentions, notifications, intelligence flags, morning brief (scheduled + display) | 01, 02, 03 |
| 05 | `05_payments.md` | Invoice creation, cash payment recording, MTN MoMo webhook integration, payment history | 01 |

---

## V1 scope boundary

V1 ships when all five PRDs are complete and the system has been in real operational use at Ziwa for at least one week without critical issues.

V1 does **not** include: POS, reservations, full accounting, Stripe, Airtel Money, HR/payroll, WhatsApp send (infrastructure is built but activation depends on Meta verification), multi-property dashboard.

---

## How to read the PRDs

Each PRD follows this structure:
- **What we're building** — scope, not design detail (design is in design.md)
- **Why** — the value it delivers
- **Requirements** — specific, testable conditions
- **Done when** — verification criteria

V2+ considerations are noted inline where a V1 implementation decision would block or enable a future stage.
