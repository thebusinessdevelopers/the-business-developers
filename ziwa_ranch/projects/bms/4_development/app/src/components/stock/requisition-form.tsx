"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { StockItemRow } from "@/lib/stock";
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
  userDepartmentId: string | null;
  stockItems: StockItemRow[];
  departments: { id: string; name: string }[];
}

interface LineItem {
  item_id: string;
  item_name: string;
  unit: string;
  quantity_requested: number;
  notes: string;
}

export function RequisitionForm({
  orgId,
  userId,
  userDepartmentId,
  stockItems,
  departments,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [departmentId, setDepartmentId] = useState(userDepartmentId ?? "");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);

  function addLine() {
    setLines((prev) => [
      ...prev,
      { item_id: "", item_name: "", unit: "", quantity_requested: 0, notes: "" },
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
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!departmentId) {
      toast.error("Select a department");
      return;
    }
    if (lines.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    if (lines.some((l) => !l.item_id || l.quantity_requested <= 0)) {
      toast.error("Every line needs an item and quantity");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      const reqItems = lines.map((l) => ({
        item_id: l.item_id,
        item_name: l.item_name,
        quantity_requested: l.quantity_requested,
        unit: l.unit,
        notes: l.notes || undefined,
      }));

      const { error } = await supabase.from("requisitions").insert({
        org_id: orgId,
        department_id: departmentId,
        requested_by: userId,
        items: reqItems as unknown as Json,
        notes: notes || null,
      });
      if (error) throw error;

      toast.success("Requisition submitted");
      router.push("/stock/requisitions");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <div>
        <Label>Department *</Label>
        <Select value={departmentId} onValueChange={(v) => setDepartmentId(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            No items added yet.
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
                        {stockItems.map((si) => (
                          <SelectItem key={si.id} value={si.id}>
                            {si.name} ({si.unit}) — {si.current_quantity ?? 0} in
                            stock
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
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Quantity {line.unit && `(${line.unit})`}</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={line.quantity_requested || ""}
                      onChange={(e) =>
                        updateLine(idx, {
                          quantity_requested: Number(e.target.value),
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Note (optional)</Label>
                    <Input
                      value={line.notes}
                      onChange={(e) =>
                        updateLine(idx, { notes: e.target.value })
                      }
                      placeholder="e.g. Urgent"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Overall Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
          rows={2}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Submitting..." : "Submit Requisition"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
