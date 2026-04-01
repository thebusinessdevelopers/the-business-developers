import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { PurchaseOrderLine } from "@/lib/stock";

export default async function InboundPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("purchase_orders")
    .select("*, users:received_by(full_name)")
    .order("received_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inbound Stock</h1>
          <p className="text-muted-foreground">Purchase orders and deliveries</p>
        </div>
        <Link href="/stock/inbound/new">
          <Button>Record Delivery</Button>
        </Link>
      </div>

      {(orders ?? []).length === 0 ? (
        <p className="text-muted-foreground">No purchase orders recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {(orders ?? []).map((po) => {
            const items = (po.items as unknown as PurchaseOrderLine[]) ?? [];
            const user = po.users as { full_name: string } | null;
            const hasDiscrepancy = items.some(
              (i) => i.quantity_received !== i.quantity_ordered
            );
            return (
              <Link key={po.id} href={`/stock/inbound/${po.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer mb-2">
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{po.supplier_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {items.length} item{items.length !== 1 ? "s" : ""} ·{" "}
                        {user?.full_name ?? "Unknown"} ·{" "}
                        {po.received_at
                          ? new Date(po.received_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {po.total_amount && (
                        <span className="text-sm font-mono">
                          {Number(po.total_amount).toLocaleString()} UGX
                        </span>
                      )}
                      <Badge
                        variant={
                          po.status === "discrepancy"
                            ? "destructive"
                            : po.status === "ordered"
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {po.status}
                        {hasDiscrepancy && po.status === "received" ? " ⚠" : ""}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
