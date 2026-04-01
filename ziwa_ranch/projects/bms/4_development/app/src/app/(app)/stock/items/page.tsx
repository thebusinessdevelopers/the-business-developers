import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole, type UserRole } from "@/types/forms";
import { StockItemsList } from "@/components/stock/stock-items-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function StockItemsPage() {
  const profile = await requireAuth();
  const supabase = await createClient();
  const isAdmin = isAdminRole(profile.role as UserRole);

  const { data: items } = await supabase
    .from("stock_items")
    .select("*")
    .order("name");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Items</h1>
          <p className="text-muted-foreground">
            {(items ?? []).filter((i) => i.active).length} active items
          </p>
        </div>
        {isAdmin && (
          <Link href="/stock/items/new">
            <Button>Add Item</Button>
          </Link>
        )}
      </div>
      <StockItemsList items={items ?? []} isAdmin={isAdmin} />
    </div>
  );
}
