"use client";

import { useForm, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { stockItemSchema, type StockItemInput, STOCK_CATEGORIES, STOCK_UNITS } from "@/lib/schemas";
import { checkItemNameUnique, type StockItemRow } from "@/lib/stock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  existing?: StockItemRow;
}

export function StockItemForm({ orgId, existing }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(stockItemSchema) as never,
    defaultValues: existing
      ? {
          name: existing.name,
          unit: existing.unit,
          category: existing.category ?? undefined,
          minimum_quantity: existing.minimum_quantity ?? 0,
          cost_per_unit: existing.cost_per_unit ?? undefined,
          supplier: existing.supplier ?? undefined,
        }
      : { minimum_quantity: 0 },
  });

  const selectedUnit = watch("unit");
  const selectedCategory = watch("category");

  async function onSubmit(data: FieldValues) {
    setSaving(true);
    try {
      const supabase = createClient();

      const d = data as StockItemInput;
      const isUnique = await checkItemNameUnique(
        supabase,
        orgId,
        d.name,
        existing?.id
      );
      if (!isUnique) {
        toast.error("An item with this name already exists");
        setSaving(false);
        return;
      }

      if (existing) {
        const { error } = await supabase
          .from("stock_items")
          .update({
            name: d.name,
            unit: d.unit,
            category: d.category || null,
            minimum_quantity: d.minimum_quantity,
            cost_per_unit: d.cost_per_unit ?? null,
            supplier: d.supplier || null,
          })
          .eq("id", existing.id);
        if (error) throw error;
        toast.success("Item updated");
      } else {
        const { error } = await supabase.from("stock_items").insert({
          org_id: orgId,
          name: d.name,
          unit: d.unit,
          category: d.category || null,
          minimum_quantity: d.minimum_quantity,
          cost_per_unit: d.cost_per_unit ?? null,
          supplier: d.supplier || null,
        });
        if (error) throw error;
        toast.success("Item created");
      }
      router.push("/stock/items");
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
        <Label htmlFor="name">Name *</Label>
        <Input id="name" {...register("name")} placeholder="e.g. Cooking Oil" />
        {errors.name && (
          <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="unit">Unit *</Label>
        <Select
          value={selectedUnit || ""}
          onValueChange={(v) => setValue("unit", v ?? "")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select unit" />
          </SelectTrigger>
          <SelectContent>
            {STOCK_UNITS.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.unit && (
          <p className="text-sm text-red-600 mt-1">{errors.unit.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Select
          value={selectedCategory || "none"}
          onValueChange={(v) => setValue("category", v === "none" ? undefined : v ?? undefined)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No category</SelectItem>
            {STOCK_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="minimum_quantity">Minimum Quantity</Label>
        <Input
          id="minimum_quantity"
          type="number"
          step="any"
          {...register("minimum_quantity", { valueAsNumber: true })}
          placeholder="0"
        />
        {errors.minimum_quantity && (
          <p className="text-sm text-red-600 mt-1">
            {errors.minimum_quantity.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="cost_per_unit">Cost per Unit (UGX)</Label>
        <Input
          id="cost_per_unit"
          type="number"
          step="any"
          {...register("cost_per_unit", { valueAsNumber: true })}
          placeholder="Optional"
        />
      </div>

      <div>
        <Label htmlFor="supplier">Supplier</Label>
        <Input
          id="supplier"
          {...register("supplier")}
          placeholder="Optional"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : existing ? "Update Item" : "Create Item"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
