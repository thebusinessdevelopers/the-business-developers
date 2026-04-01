"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Json } from "@/types/database";

interface Transaction {
  id: string;
  transaction_type: string;
  quantity: number;
  notes: string | null;
  created_at: string | null;
  item_id: string;
  department_id: string | null;
  stock_items: { name: string; unit: string } | Json | null;
  users: { full_name: string } | Json | null;
  departments: { name: string } | Json | null;
}

interface Props {
  transactions: Transaction[];
  items: { id: string; name: string }[];
  departments: { id: string; name: string }[];
}

const TYPES = [
  { value: "all", label: "All types" },
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
  { value: "requisition_fulfil", label: "Requisition" },
  { value: "adjustment", label: "Adjustment" },
];

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

export function TransactionHistory({ transactions, items, departments }: Props) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [itemFilter, setItemFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = transactions.filter((txn) => {
    if (typeFilter !== "all" && txn.transaction_type !== typeFilter) return false;
    if (itemFilter !== "all" && txn.item_id !== itemFilter) return false;
    if (deptFilter !== "all" && txn.department_id !== deptFilter) return false;
    if (search) {
      const item = txn.stock_items as { name: string } | null;
      const user = txn.users as { full_name: string } | null;
      const term = search.toLowerCase();
      if (
        !item?.name.toLowerCase().includes(term) &&
        !user?.full_name.toLowerCase().includes(term) &&
        !(txn.notes?.toLowerCase().includes(term))
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
          <SelectTrigger className="sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={itemFilter} onValueChange={(v) => setItemFilter(v ?? "all")}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="All items" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All items</SelectItem>
            {items.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {i.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={(v) => setDeptFilter(v ?? "all")}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="All depts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="py-2 px-3 text-left font-medium">Date</th>
              <th className="py-2 px-3 text-left font-medium">Item</th>
              <th className="py-2 px-3 text-left font-medium">Type</th>
              <th className="py-2 px-3 text-right font-medium">Qty</th>
              <th className="py-2 px-3 text-left font-medium hidden sm:table-cell">
                By
              </th>
              <th className="py-2 px-3 text-left font-medium hidden md:table-cell">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  No transactions found
                </td>
              </tr>
            )}
            {filtered.map((txn) => {
              const item = txn.stock_items as { name: string; unit: string } | null;
              const user = txn.users as { full_name: string } | null;
              const dept = txn.departments as { name: string } | null;
              return (
                <tr key={txn.id} className="border-b last:border-0">
                  <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                    {txn.created_at
                      ? new Date(txn.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })
                      : "—"}
                  </td>
                  <td className="py-2 px-3 font-medium">
                    {item?.name ?? "Unknown"}
                    <span className="text-muted-foreground ml-1 text-xs">
                      {item?.unit}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <Badge variant="secondary" className="text-xs">
                      {txnLabel(txn.transaction_type)}
                    </Badge>
                    {dept && (
                      <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">
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
                  <td className="py-2 px-3 text-muted-foreground text-xs hidden md:table-cell max-w-48 truncate">
                    {txn.notes ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} transactions
      </p>
    </div>
  );
}
