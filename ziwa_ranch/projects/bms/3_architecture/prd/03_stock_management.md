# PRD 03 — Stock Management

> **Covers:** Stock items library, inbound stock (purchase orders), outbound stock, requisitions (create, approve, fulfil), automatic quantity tracking via DB trigger, and threshold alerts.

---

## What we're building

A complete goods-movement tracking system. Every item that enters the organisation (purchase orders) and every item that leaves it (requisitions, outbound allocations) is recorded. The system maintains a running current quantity for every stock item via a database trigger. When any item falls below its minimum quantity, an alert fires automatically.

---

## Why

Staff fraud — specifically stock theft — is the primary documented financial loss for Ugandan lodges (the Rafiki Lodge case: 60M UGX lost to fake invoices and stock manipulation). BMS's stock module creates an audit trail that makes unexplained stock disappearance visible. Every movement has a person, a timestamp, and a reference. The intelligence layer correlates stock movements with kitchen reports, requisitions, and purchase orders to surface discrepancies that no individual record reveals.

---

## Requirements

### Stock items library

**R3.1** — An admin or manager can create stock items at `/stock/items`. Each item has: name, unit (kg, litres, units, bottles, bags, etc.), category (produce, dry_goods, beverages, cleaning, maintenance, other), minimum quantity, current quantity (system-maintained), cost per unit (optional), and supplier (optional).

**R3.2** — Item names within an organisation must be unique. The create form enforces this with a real-time check before submission.

**R3.3** — An admin can edit all fields on an existing item. Editing the name does not invalidate historical `stock_transactions` (which record item name in denormalised form inside JSONB where needed).

**R3.4** — An admin can deactivate an item (`active = false`). Inactive items do not appear in the items library or in `inventory_grid` dropdowns. Historical transactions referencing the item are preserved.

**R3.5** — The items library is searchable by name and filterable by category.

**R3.6** — The items list shows current quantity for each item and visually flags items below minimum quantity (red quantity indicator).

### Purchase orders (inbound stock)

**R3.7** — A stock manager or admin can record an inbound delivery at `/stock/inbound`. They select a supplier name, then add line items: each line item is a stock item, quantity ordered, quantity actually received, and unit cost.

**R3.8** — On saving a purchase order with status `received`, a `stock_transaction` of type `inbound` is created for each line item with quantity = `quantity_received`. The `current_quantity` on `stock_items` is updated accordingly by the trigger.

**R3.9** — If `quantity_received` differs from `quantity_ordered` for any item, the purchase order status is set to `discrepancy` and an `intelligence_flags` entry of type `stock_discrepancy` is created.

**R3.10** — A purchase order can be saved with status `ordered` (delivery not yet arrived) and updated to `received` when the delivery is confirmed.

**R3.11** — The inbound stock history shows all purchase orders, sortable by date and filterable by supplier.

### Requisitions

**R3.12** — A department head can create a requisition at `/stock/requisitions/new`. They select items from the stock library and enter the quantity requested for each. They can add a note.

**R3.13** — A new requisition has status `pending` and creates a notification for all admin and manager users in the organisation.

**R3.14** — An admin or manager can open a pending requisition and approve or reject it. On approval, they can adjust the `quantity_approved` for any line item (e.g., approve a partial quantity).

**R3.15** — Approving a requisition does not yet update stock quantities. Stock is deducted when the requisition is marked `fulfilled`.

**R3.16** — When a stock manager marks a requisition as `fulfilled`, a `stock_transaction` of type `requisition_fulfil` is created for each approved line item with quantity = `-quantity_approved` (negative, as stock is leaving). The `current_quantity` on `stock_items` is updated accordingly by the trigger.

**R3.17** — A rejected requisition has status `rejected` and the requesting department head receives a notification with the rejection (reason optional).

**R3.18** — A department head can view all their department's requisitions and their current status.

### Quantity tracking trigger

**R3.19** — A PostgreSQL trigger on `stock_transactions` (`AFTER INSERT`) recalculates and updates `stock_items.current_quantity` for the affected item. The update is: `current_quantity = current_quantity + transaction.quantity`. Negative quantities (outbound) reduce the total; positive quantities (inbound) increase it.

**R3.20** — The trigger also checks: if the new `current_quantity` is less than `minimum_quantity`, and no `intelligence_flags` entry of type `stock_below_min` is already open for that item, insert a new flag with severity `warning`.

**R3.21** — If `current_quantity` drops below zero, the trigger inserts a flag with severity `critical` (stock deficit — more has been recorded as used than was ever received).

**R3.22** — The trigger must complete within the same transaction as the stock transaction insert. It must not make external HTTP calls (those are handled by the intelligence layer polling open flags, not by the trigger directly).

### Manual adjustments

**R3.23** — An admin can create a `stock_transaction` of type `adjustment` with a positive or negative quantity and a mandatory reason note. This is used for physical stock counts that reveal discrepancies.

**R3.24** — An adjustment transaction appears in the transaction history with the reason note visible. It is distinguishable from inbound and requisition transactions by type.

### Stock overview

**R3.25** — The stock overview at `/stock` shows: all active items with current quantity, items below minimum (highlighted), and a summary count of pending requisitions.

**R3.26** — The stock transaction history at `/stock/transactions` shows all transactions for the organisation, sortable by date and filterable by item, type, and department.

---

## Done when

- [ ] An admin can create stock items and they appear in the inventory_grid field of department forms
- [ ] Recording an inbound delivery updates current quantities correctly
- [ ] A department head can create a requisition; an admin can approve it; fulfilment deducts stock
- [ ] Items falling below minimum quantity create an intelligence flag that appears on the dashboard
- [ ] A stock deficit (current_quantity < 0) creates a critical flag
- [ ] All stock screens work on 375px mobile
- [ ] Transaction history shows a full, accurate audit trail

**V2+ note:** When POS is added in V2, POS sales will create `outbound` stock transactions automatically via a trigger on `pos_order_items`. The stock schema requires no changes for this — `reference_type = 'pos_order'` and `reference_id = pos_order.id` is sufficient. The V1 `stock_transactions` table is already designed with this FK pattern.
