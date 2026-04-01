import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isAdminRole, type UserRole } from "@/types/forms";
import Link from "next/link";
import { Package, TrendingDown, ClipboardList, Truck } from "lucide-react";

export default async function StockOverviewPage() {
  const profile = await requireAuth();
  const supabase = await createClient();
  const isAdmin = isAdminRole(profile.role as UserRole);

  const { data: items } = await supabase
    .from("stock_items")
    .select("id, name, unit, current_quantity, minimum_quantity, category, active")
    .eq("active", true)
    .order("name");

  const lowStock = (items ?? []).filter(
    (i) =>
      (i.current_quantity ?? 0) < (i.minimum_quantity ?? 0) &&
      (i.minimum_quantity ?? 0) > 0
  );

  const { count: pendingReqs } = await supabase
    .from("requisitions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: orderedPOs } = await supabase
    .from("purchase_orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "ordered");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock</h1>
          <p className="text-muted-foreground">
            {(items ?? []).length} active items
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/stock/items">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{(items ?? []).length}</p>
              <p className="text-xs text-muted-foreground">active items</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/stock/items">
          <Card
            className={`hover:bg-muted/50 transition-colors cursor-pointer ${
              lowStock.length > 0 ? "border-red-500/50" : ""
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Low Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${
                  lowStock.length > 0 ? "text-red-600" : ""
                }`}
              >
                {lowStock.length}
              </p>
              <p className="text-xs text-muted-foreground">below minimum</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/stock/requisitions">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Requisitions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{pendingReqs ?? 0}</p>
              <p className="text-xs text-muted-foreground">pending approval</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/stock/inbound">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Truck className="h-4 w-4" />
                On Order
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{orderedPOs ?? 0}</p>
              <p className="text-xs text-muted-foreground">awaiting delivery</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {lowStock.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-red-600 flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Low Stock Warnings
          </h2>
          <div className="grid gap-2">
            {lowStock.map((item) => (
              <Link key={item.id} href={`/stock/items/${item.id}`}>
                <Card className="border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer">
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">
                        {item.current_quantity} {item.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        min: {item.minimum_quantity}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {isAdmin && (
          <>
            <Link href="/stock/items/new">
              <Button>Add Item</Button>
            </Link>
            <Link href="/stock/inbound/new">
              <Button variant="outline">Record Delivery</Button>
            </Link>
            <Link href="/stock/adjustments/new">
              <Button variant="outline">Stock Adjustment</Button>
            </Link>
          </>
        )}
        <Link href="/stock/requisitions/new">
          <Button variant="outline">New Requisition</Button>
        </Link>
        <Link href="/stock/transactions">
          <Button variant="ghost">Transaction History</Button>
        </Link>
      </div>

      {(items ?? []).length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">All Items</h2>
            <Link
              href="/stock/items"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-2 px-3 text-left font-medium">Item</th>
                  <th className="py-2 px-3 text-right font-medium">Qty</th>
                  <th className="py-2 px-3 text-right font-medium hidden sm:table-cell">
                    Min
                  </th>
                </tr>
              </thead>
              <tbody>
                {(items ?? []).slice(0, 15).map((item) => {
                  const isBelowMin =
                    (item.current_quantity ?? 0) <
                      (item.minimum_quantity ?? 0) &&
                    (item.minimum_quantity ?? 0) > 0;
                  return (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2 px-3">
                        <Link
                          href={`/stock/items/${item.id}`}
                          className="hover:underline"
                        >
                          {item.name}
                        </Link>
                        {item.category && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {item.category}
                          </Badge>
                        )}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-mono ${
                          isBelowMin ? "text-red-600 font-bold" : ""
                        }`}
                      >
                        {item.current_quantity} {item.unit}
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground hidden sm:table-cell">
                        {item.minimum_quantity}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
