# PRD 05 — Payments

> **Covers:** Invoice creation, cash payment recording, MTN Mobile Money webhook integration, payment history, and payment reconciliation display.

---

## What we're building

A payment tracking module for V1: create invoices, record payments (cash manually, MTN MoMo automatically via webhook), and view payment history. This is not a full POS — that is V2. V1 payments cover accommodation billing and any service invoices a lodge needs to issue.

---

## Why

Mobile money transactions and cash payments at Ugandan lodges currently leave no digital record. A guest pays by MTN MoMo; the receptionist notes it in a WhatsApp message. A month later, the owner cannot reconcile cash takings with actual guest stays. BMS's payment module creates an automatic, timestamped, webhook-confirmed payment record for every MTN MoMo transaction and a manually-confirmed record for cash. This is the audit trail that makes the morning brief's revenue summary meaningful and that surfaces the category of staff fraud most common in this market (misappropriated cash payments).

---

## Requirements

### Invoices

**R5.1** — An admin, manager, or reception user can create an invoice at `/payments/invoices/new`. An invoice requires: guest name, one or more line items (description, quantity, unit price), and an optional due date and notes.

**R5.2** — Invoice numbers are auto-generated per organisation in format `INV-[YEAR]-[sequential number]` (e.g., `INV-2026-001`). The sequence resets each year.

**R5.3** — An invoice's `total_amount` is calculated automatically from its line items. It is not manually editable.

**R5.4** — An invoice can be in one of four statuses: `unpaid`, `partial`, `paid`, `void`. Status is calculated from `amount_paid` vs `total_amount`: unpaid = 0 paid, partial = some paid, paid = fully paid, void = manually voided.

**R5.5** — An admin can void an invoice. Voided invoices are preserved in history but excluded from financial summaries.

**R5.6** — The invoice list shows all invoices filterable by status (unpaid, partial, paid, void) and sorted by creation date.

**R5.7** — An invoice detail view shows: invoice header (number, guest, date, status), line items, total, amount paid, outstanding balance, and payment history.

### Cash payment recording

**R5.8** — From an invoice, a user with admin, manager, or reception role can record a cash payment by clicking "Record payment." They enter the amount received (which may be partial or full payment) and optionally attach a photo of the cash receipt.

**R5.9** — Recording a payment creates a row in `payments` with `method = 'cash'`, `status = 'completed'`, `recorded_by = auth.uid()`, and the entered amount.

**R5.10** — Recording a payment updates `invoices.amount_paid` (sum of all non-failed payments against the invoice) and recalculates the invoice status.

**R5.11** — A cash payment can be marked as refunded by an admin. Refunding sets `payments.status = 'refunded'` and recalculates the invoice's `amount_paid`.

### MTN MoMo webhook integration

**R5.12** — BMS exposes a webhook endpoint at `/api/webhooks/mtn-momo`. This endpoint receives POST requests from the GovBill or SACC API gateway when a mobile money payment is made against a BMS-linked reference.

**R5.13** — The webhook endpoint verifies the request signature before processing. Requests with invalid or missing signatures return `401` and are not processed.

**R5.14** — On receiving a valid webhook, the endpoint:
  1. Writes the raw payload to `webhook_events` with `processed = false`
  2. Looks up the invoice by the reference in the payload
  3. Creates a `payments` row with `method = 'mtn_momo'`, `status = 'completed'`, and `webhook_payload` containing the raw payload
  4. Updates `invoices.amount_paid` and status
  5. Creates a notification for the reception/admin users: "Payment received: [amount] UGX via MTN MoMo for invoice [number]"
  6. Marks `webhook_events.processed = true`

**R5.15** — If the invoice cannot be found (unknown reference), the webhook event is stored with `processed = false` and an error note. No error is returned to the gateway (always return 200 to prevent retries).

**R5.16** — Webhook processing is idempotent: if the same `reference` arrives twice, the second is detected as a duplicate and ignored (no second payment created).

**R5.17** — The `webhook_events` table is visible to admins at `/payments/webhooks` (or within invoice detail) for debugging and audit purposes.

### Payment overview

**R5.18** — The payment history at `/payments` shows all payments for the organisation, sortable by date and filterable by method (cash, mtn_momo) and status.

**R5.19** — The payment overview shows total received for the current day, current week, and current month — by method (cash vs mobile money).

**R5.20** — The daily totals from `payments` feed the morning brief's `summary.payments` field: `{cash_today: number, momo_today: number, total_today: number}`.

---

## Done when

- [ ] An admin can create an invoice with line items and it calculates the total correctly
- [ ] Cash payment recording updates invoice status correctly (partial / paid)
- [ ] The MTN MoMo webhook endpoint receives a test payload, verifies the signature, creates a payment record, and updates the invoice status
- [ ] A duplicate webhook is ignored (idempotency check)
- [ ] Payment totals appear in the morning brief
- [ ] All payment screens work on 375px mobile
- [ ] Invoice detail shows full payment history including webhook payments

**V2+ note:** V2 adds POS (point of sale) with full restaurant/retail billing. POS orders will link to invoices via `invoices.pos_order_id`. The `payments` table requires no change — POS payments use the same method enum and same schema. V2 also adds Airtel Money (new method value: `airtel_money`) and Stripe (new method value: `stripe`), each with their own webhook handler at `/api/webhooks/airtel` and `/api/webhooks/stripe`. The `webhook_events` table's `provider` field already accommodates this.
