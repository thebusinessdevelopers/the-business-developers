import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type StockItemRow = Database["public"]["Tables"]["stock_items"]["Row"];
export type StockTransactionRow = Database["public"]["Tables"]["stock_transactions"]["Row"];
export type RequisitionRow = Database["public"]["Tables"]["requisitions"]["Row"];
export type PurchaseOrderRow = Database["public"]["Tables"]["purchase_orders"]["Row"];

export interface PurchaseOrderLine {
  item_id: string;
  item_name: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost?: number;
  unit: string;
}

export interface RequisitionLine {
  item_id: string;
  item_name: string;
  quantity_requested: number;
  quantity_approved?: number;
  unit: string;
  notes?: string;
}

export async function checkItemNameUnique(
  supabase: Client,
  orgId: string,
  name: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from("stock_items")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .ilike("name", name);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { count } = await query;
  return (count ?? 0) === 0;
}

export async function createPurchaseOrderTransactions(
  supabase: Client,
  orgId: string,
  userId: string,
  poId: string,
  items: PurchaseOrderLine[]
) {
  const transactions = items
    .filter((item) => item.quantity_received > 0)
    .map((item) => ({
      org_id: orgId,
      item_id: item.item_id,
      transaction_type: "inbound" as const,
      quantity: item.quantity_received,
      reference_id: poId,
      reference_type: "purchase_order" as const,
      performed_by: userId,
      notes: `PO inbound: ${item.item_name}`,
    }));

  if (transactions.length === 0) return;

  const { error } = await supabase.from("stock_transactions").insert(transactions);
  if (error) throw error;
}

export async function fulfillRequisitionTransactions(
  supabase: Client,
  orgId: string,
  userId: string,
  requisitionId: string,
  items: RequisitionLine[],
  departmentId: string
) {
  const transactions = items
    .filter((item) => (item.quantity_approved ?? 0) > 0)
    .map((item) => ({
      org_id: orgId,
      item_id: item.item_id,
      transaction_type: "requisition_fulfil" as const,
      quantity: -(item.quantity_approved ?? 0),
      reference_id: requisitionId,
      reference_type: "requisition" as const,
      department_id: departmentId,
      performed_by: userId,
      notes: `Requisition fulfilled: ${item.item_name}`,
    }));

  if (transactions.length === 0) return;

  const { error } = await supabase.from("stock_transactions").insert(transactions);
  if (error) throw error;
}
