import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PurchaseOrderForm } from "@/components/stock/purchase-order-form";

export default async function NewPurchaseOrderPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("stock_items")
    .select("*")
    .eq("active", true)
    .order("name");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Record Delivery</h1>
      <PurchaseOrderForm
        orgId={profile.org_id}
        userId={profile.id}
        stockItems={items ?? []}
      />
    </div>
  );
}
