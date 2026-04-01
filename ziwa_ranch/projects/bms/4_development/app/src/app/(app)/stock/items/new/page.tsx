import { requireAdmin } from "@/lib/auth";
import { StockItemForm } from "@/components/stock/stock-item-form";

export default async function NewStockItemPage() {
  const profile = await requireAdmin();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Add Stock Item</h1>
      <StockItemForm orgId={profile.org_id} />
    </div>
  );
}
