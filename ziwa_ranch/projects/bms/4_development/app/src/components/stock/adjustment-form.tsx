"use client";

import { useForm, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { adjustmentSchema, type AdjustmentInput } from "@/lib/schemas";
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
import { toast } from "sonner";

interface Props {
  orgId: string;
  userId: string;
  stockItems: StockItemRow[];
}

export function AdjustmentForm({ orgId, userId, stockItems }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(adjustmentSchema) as never,
  });

  const selectedItemId = watch("item_id");
  const selectedItem = stockItems.find((i) => i.id === selectedItemId);

  async function onSubmit(data: FieldValues) {
    setSaving(true);
    try {
      const supabase = createClient();
      const d = data as AdjustmentInput;
      const { error } = await supabase.from("stock_transactions").insert({
        org_id: orgId,
        item_id: d.item_id,
        transaction_type: "adjustment",
        quantity: d.quantity,
        performed_by: userId,
        notes: d.notes,
      });
      if (error) throw error;

      toast.success("Adjustment recorded");
      router.push("/stock/transactions");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div>
        <Label>Item *</Label>
        <Select
          value={selectedItemId || ""}
          onValueChange={(v) => { if (v) setValue("item_id", v); }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select item" />
          </SelectTrigger>
          <SelectContent>
            {stockItems.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name} ({item.unit}) — current: {item.current_quantity ?? 0}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.item_id && (
          <p className="text-sm text-red-600 mt-1">{String(errors.item_id.message ?? "")}</p>
        )}
      </div>

      {selectedItem && (
        <p className="text-sm text-muted-foreground">
          Current stock: <strong>{selectedItem.current_quantity ?? 0} {selectedItem.unit}</strong>
        </p>
      )}

      <div>
        <Label htmlFor="quantity">Adjustment Quantity *</Label>
        <Input
          id="quantity"
          type="number"
          step="any"
          {...register("quantity", { valueAsNumber: true })}
          placeholder="e.g. +5 or -3"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Positive = stock found, negative = stock missing
        </p>
        {errors.quantity && (
          <p className="text-sm text-red-600 mt-1">{String(errors.quantity.message ?? "")}</p>
        )}
      </div>

      <div>
        <Label htmlFor="notes">Reason *</Label>
        <Textarea
          id="notes"
          {...register("notes")}
          placeholder="e.g. Physical count on 1 April — found 5 more bags than system shows"
          rows={3}
        />
        {errors.notes && (
          <p className="text-sm text-red-600 mt-1">{String(errors.notes.message ?? "")}</p>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Record Adjustment"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
