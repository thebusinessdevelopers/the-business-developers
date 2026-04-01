"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createPurchaseOrderTransactions, type PurchaseOrderLine } from "@/lib/stock";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import type { Json } from "@/types/database";

interface Order {
  id: string;
  org_id: string;
  supplier_name: string;
  status: string | null;
  items: Json;
  total_amount: number | null;
  currency: string | null;
  received_by: string;
  received_at: string | null;
  notes: string | null;
  users: { full_name: string } | Json | null;
}

interface Props {
  order: Order;
}

export function PurchaseOrderDetail({ order }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const items = (order.items as unknown as PurchaseOrderLine[]) ?? [];
  const user = order.users as { full_name: string } | null;

  async function confirmReceived() {
    setConfirming(true);
    try {
      const supabase = createClient();

      const hasDiscrepancy = items.some(
        (i) => i.quantity_received !== i.quantity_ordered
      );

      const { error } = await supabase
        .from("purchase_orders")
        .update({ status: hasDiscrepancy ? "discrepancy" : "received" })
        .eq("id", order.id);
      if (error) throw error;

      await createPurchaseOrderTransactions(
        supabase,
        order.org_id,
        order.received_by,
        order.id,
        items
      );

      toast.success("Delivery confirmed — stock updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{order.supplier_name}</h1>
          <p className="text-muted-foreground">
            {user?.full_name ?? "Unknown"} ·{" "}
            {order.received_at
              ? new Date(order.received_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </p>
        </div>
        <Badge
          variant={
            order.status === "discrepancy"
              ? "destructive"
              : order.status === "ordered"
                ? "outline"
                : "secondary"
          }
        >
          {order.status}
        </Badge>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="py-2 px-3 text-left font-medium">Item</th>
              <th className="py-2 px-3 text-right font-medium">Ordered</th>
              <th className="py-2 px-3 text-right font-medium">Received</th>
              <th className="py-2 px-3 text-right font-medium hidden sm:table-cell">
                Unit Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const mismatch = item.quantity_received !== item.quantity_ordered;
              return (
                <tr key={idx} className="border-b last:border-0">
                  <td className="py-2 px-3">
                    {item.item_name}
                    <span className="text-muted-foreground ml-1 text-xs">
                      {item.unit}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono">
                    {item.quantity_ordered}
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-mono ${
                      mismatch ? "text-red-600 font-bold" : ""
                    }`}
                  >
                    {item.quantity_received}
                  </td>
                  <td className="py-2 px-3 text-right text-muted-foreground hidden sm:table-cell">
                    {item.unit_cost
                      ? `${Number(item.unit_cost).toLocaleString()} UGX`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {order.total_amount && (
        <p className="text-sm font-medium">
          Total: {Number(order.total_amount).toLocaleString()}{" "}
          {order.currency ?? "UGX"}
        </p>
      )}

      {order.notes && (
        <Card>
          <CardContent className="py-3">
            <p className="text-sm">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      {order.status === "ordered" && (
        <Button onClick={confirmReceived} disabled={confirming}>
          {confirming ? "Confirming..." : "Confirm Delivery Received"}
        </Button>
      )}

      <Button variant="ghost" onClick={() => router.back()}>
        Back
      </Button>
    </div>
  );
}
