"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createPurchaseOrderTransactions,
  type StockItemRow,
  type PurchaseOrderLine,
} from "@/lib/stock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { Json } from "@/types/database";

interface Props {
  orgId: string;
  userId: string;
  stockItems: StockItemRow[];
}

interface LineItem {
  item_id: string;
  item_name: string;
  unit: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
}

export function PurchaseOrderForm({ orgId, userId, stockItems }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [status, setStatus] = useState<"ordered" | "received">("received");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        item_id: "",
        item_name: "",
        unit: "",
        quantity_ordered: 0,
        quantity_received: 0,
        unit_cost: 0,
      },
    ]);
  }

  function updateLine(index: number, updates: Partial<LineItem>) {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...updates } : line))
    );
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function selectItem(index: number, itemId: string) {
    const item = stockItems.find((i) => i.id === itemId);
    if (!item) return;
    updateLine(index, {
      item_id: item.id,
      item_name: item.name,
      unit: item.unit,
      unit_cost: item.cost_per_unit ?? 0,
    });
  }

  const totalAmount = lines.reduce(
    (sum, l) => sum + l.quantity_received * l.unit_cost,
    0
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierName.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    if (lines.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    if (lines.some((l) => !l.item_id)) {
      toast.error("Select an item for every line");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      const hasDiscrepancy =
        status === "received" &&
        lines.some((l) => l.quantity_received !== l.quantity_ordered);

      const poItems: PurchaseOrderLine[] = lines.map((l) => ({
        item_id: l.item_id,
        item_name: l.item_name,
        quantity_ordered: l.quantity_ordered,
        quantity_received: l.quantity_received,
        unit_cost: l.unit_cost || undefined,
        unit: l.unit,
      }));

      const { data: po, error } = await supabase
        .from("purchase_orders")
        .insert({
          org_id: orgId,
          supplier_name: supplierName,
          status: hasDiscrepancy ? "discrepancy" : status,
          items: poItems as unknown as Json,
          total_amount: totalAmount || null,
          received_by: userId,
          notes: notes || null,
        })
        .select("id")
        .single();

      if (error) throw error;

      if (status === "received" && po) {
        await createPurchaseOrderTransactions(
          supabase,
          orgId,
          userId,
          po.id,
          poItems
        );
      }

      if (hasDiscrepancy) {
        await supabase.from("intelligence_flags").insert({
          org_id: orgId,
          flag_type: "stock_discrepancy",
          severity: "warning",
          title: `Delivery discrepancy from ${supplierName}`,
          description: `${lines.filter((l) => l.quantity_received !== l.quantity_ordered).length} item(s) with quantity mismatch`,
          reference_id: po?.id,
          reference_type: "purchase_order",
        });
      }

      toast.success("Purchase order recorded");
      router.push("/stock/inbound");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="supplier">Supplier *</Label>
          <Input
            id="supplier"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="e.g. Kampala Fresh Produce"
          />
        </div>
        <div>
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) => { if (v) setStatus(v as "ordered" | "received"); }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="ordered">Ordered (not yet delivered)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>
        {lines.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-md">
            No items added yet. Click &quot;Add Item&quot; to start.
          </p>
        )}
        <div className="space-y-2">
          {lines.map((line, idx) => (
            <Card key={idx}>
              <CardContent className="py-3 space-y-2">
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Select
                      value={line.item_id || ""}
                        onValueChange={(v) => { if (v) selectItem(idx, v); }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {stockItems
                          .filter((si) => si.active)
                          .map((si) => (
                            <SelectItem key={si.id} value={si.id}>
                              {si.name} ({si.unit})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(idx)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Ordered</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={line.quantity_ordered || ""}
                      onChange={(e) =>
                        updateLine(idx, {
                          quantity_ordered: Number(e.target.value),
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Received</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={line.quantity_received || ""}
                      onChange={(e) =>
                        updateLine(idx, {
                          quantity_received: Number(e.target.value),
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Unit cost</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={line.unit_cost || ""}
                      onChange={(e) =>
                        updateLine(idx, {
                          unit_cost: Number(e.target.value),
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
                {line.unit && (
                  <p className="text-xs text-muted-foreground">Unit: {line.unit}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {totalAmount > 0 && (
        <p className="text-sm font-medium">
          Total: {totalAmount.toLocaleString()} UGX
        </p>
      )}

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
          rows={2}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Purchase Order"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
