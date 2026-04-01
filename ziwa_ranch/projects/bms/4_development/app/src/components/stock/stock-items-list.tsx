"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STOCK_CATEGORIES } from "@/lib/schemas";
import type { StockItemRow } from "@/lib/stock";

interface Props {
  items: StockItemRow[];
  isAdmin: boolean;
}

export function StockItemsList({ items, isAdmin }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showInactive, setShowInactive] = useState(false);

  const filtered = items.filter((item) => {
    if (!showInactive && !item.active) return false;
    if (category !== "all" && item.category !== category) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={category} onValueChange={(v) => setCategory(v ?? "all")}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {STOCK_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isAdmin && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive
          </label>
        )}
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="py-2 px-3 text-left font-medium">Name</th>
              <th className="py-2 px-3 text-right font-medium">Current</th>
              <th className="py-2 px-3 text-right font-medium hidden sm:table-cell">
                Minimum
              </th>
              <th className="py-2 px-3 text-right font-medium hidden sm:table-cell">
                Unit Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted-foreground">
                  No items found
                </td>
              </tr>
            )}
            {filtered.map((item) => {
              const qty = item.current_quantity ?? 0;
              const min = item.minimum_quantity ?? 0;
              const isBelowMin = qty < min && min > 0;
              const isNegative = qty < 0;
              return (
                <tr
                  key={item.id}
                  className={`border-b last:border-0 ${!item.active ? "opacity-50" : ""}`}
                >
                  <td className="py-2 px-3">
                    <Link
                      href={`/stock/items/${item.id}`}
                      className="hover:underline font-medium"
                    >
                      {item.name}
                    </Link>
                    <div className="flex gap-1 mt-0.5">
                      {item.category && (
                        <Badge variant="secondary" className="text-xs">
                          {item.category.replace("_", " ")}
                        </Badge>
                      )}
                      {!item.active && (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-mono ${
                      isNegative
                        ? "text-red-600 font-bold"
                        : isBelowMin
                          ? "text-amber-600 font-bold"
                          : ""
                    }`}
                  >
                    {qty} {item.unit}
                  </td>
                  <td className="py-2 px-3 text-right text-muted-foreground hidden sm:table-cell">
                    {min > 0 ? min : "—"}
                  </td>
                  <td className="py-2 px-3 text-right text-muted-foreground hidden sm:table-cell">
                    {item.cost_per_unit
                      ? `${Number(item.cost_per_unit).toLocaleString()} UGX`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        {filtered.length} of {items.filter((i) => showInactive || i.active).length} items shown
      </p>
    </div>
  );
}
