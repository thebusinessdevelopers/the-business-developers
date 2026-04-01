import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdjustmentForm } from "@/components/stock/adjustment-form";

export default async function NewAdjustmentPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("stock_items")
    .select("*")
    .eq("active", true)
    .order("name");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Stock Adjustment</h1>
      <p className="text-muted-foreground">
        Use this for physical stock count corrections. Positive values add stock,
        negative values remove it.
      </p>
      <AdjustmentForm
        orgId={profile.org_id}
        userId={profile.id}
        stockItems={items ?? []}
      />
    </div>
  );
}
