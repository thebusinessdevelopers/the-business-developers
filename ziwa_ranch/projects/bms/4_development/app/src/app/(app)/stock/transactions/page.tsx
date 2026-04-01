import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TransactionHistory } from "@/components/stock/transaction-history";

export default async function TransactionsPage() {
  const profile = await requireAuth();
  const supabase = await createClient();

  const { data: transactions } = await supabase
    .from("stock_transactions")
    .select(
      "*, stock_items:item_id(name, unit), users:performed_by(full_name), departments:department_id(name)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: items } = await supabase
    .from("stock_items")
    .select("id, name")
    .eq("active", true)
    .order("name");

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("active", true)
    .order("name");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground">All stock movements</p>
      </div>
      <TransactionHistory
        transactions={transactions ?? []}
        items={items ?? []}
        departments={departments ?? []}
      />
    </div>
  );
}
