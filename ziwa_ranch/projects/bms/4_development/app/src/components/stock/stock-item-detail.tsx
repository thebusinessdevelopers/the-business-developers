"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { StockItemRow } from "@/lib/stock";
import type { Json } from "@/types/database";

interface Transaction {
  id: string;
  transaction_type: string;
  quantity: number;
  notes: string | null;
  created_at: string | null;
  users: { full_name: string } | Json | null;
  departments: { name: string } | Json | null;
}

interface Props {
  item: StockItemRow;
  transactions: Transaction[];
  isAdmin: boolean;
}

function txnLabel(type: string) {
  const labels: Record<string, string> = {
    inbound: "Inbound",
    outbound: "Outbound",
    requisition_fulfil: "Requisition",
    adjustment: "Adjustment",
  };
  return labels[type] ?? type;
}

function txnColor(type: string) {
  if (type === "inbound") return "text-green-600";
  if (type === "adjustment") return "text-blue-600";
  return "text-red-600";
}

export function StockItemDetail({ item, transactions, isAdmin }: Props) {
  const router = useRouter();
  const qty = item.current_quantity ?? 0;
  const min = item.minimum_quantity ?? 0;
  const isBelowMin = qty < min && min > 0;

  async function handleToggleActive() {
    const supabase = createClient();
    const { error } = await supabase
      .from("stock_items")
      .update({ active: !item.active })
      .eq("id", item.id);
    if (error) {
      toast.error("Failed to update");
      return;
    }
    toast.success(item.active ? "Item deactivated" : "Item reactivated");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{item.name}</h1>
            {!item.active && (
              <Badge variant="outline">Inactive</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {item.category?.replace("_", " ") ?? "No category"} · {item.unit}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/stock/items/${item.id}?edit=true`)}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleActive}
            >
              {item.active ? "Deactivate" : "Reactivate"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                isBelowMin ? "text-red-600" : ""
              }`}
            >
              {qty} {item.unit}
            </p>
            {isBelowMin && (
              <p className="text-xs text-red-600">Below minimum ({min})</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Minimum Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {min > 0 ? `${min} ${item.unit}` : "Not set"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unit Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {item.cost_per_unit
                ? `${Number(item.cost_per_unit).toLocaleString()} UGX`
                : "—"}
            </p>
            {item.supplier && (
              <p className="text-xs text-muted-foreground">{item.supplier}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No transactions yet</p>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-2 px-3 text-left font-medium">Date</th>
                  <th className="py-2 px-3 text-left font-medium">Type</th>
                  <th className="py-2 px-3 text-right font-medium">Qty</th>
                  <th className="py-2 px-3 text-left font-medium hidden sm:table-cell">
                    By
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => {
                  const user = txn.users as { full_name: string } | null;
                  const dept = txn.departments as { name: string } | null;
                  return (
                    <tr key={txn.id} className="border-b last:border-0">
                      <td className="py-2 px-3 text-muted-foreground">
                        {txn.created_at
                          ? new Date(txn.created_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })
                          : "—"}
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="secondary" className="text-xs">
                          {txnLabel(txn.transaction_type)}
                        </Badge>
                        {dept && (
                          <span className="text-xs text-muted-foreground ml-1">
                            {dept.name}
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-mono ${txnColor(
                          txn.transaction_type
                        )}`}
                      >
                        {txn.quantity > 0 ? "+" : ""}
                        {txn.quantity}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground hidden sm:table-cell">
                        {user?.full_name ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
