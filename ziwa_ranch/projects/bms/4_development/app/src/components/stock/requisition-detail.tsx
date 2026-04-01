"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fulfillRequisitionTransactions, type RequisitionLine } from "@/lib/stock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Database, Json } from "@/types/database";

type RequisitionRow = Database["public"]["Tables"]["requisitions"]["Row"];

interface Props {
  requisition: RequisitionRow;
  requesterName: string;
  approverName: string | null;
  departmentName: string;
  isAdmin: boolean;
  userId: string;
  orgId: string;
}

function statusColor(status: string) {
  if (status === "pending") return "outline" as const;
  if (status === "approved") return "secondary" as const;
  if (status === "fulfilled") return "default" as const;
  return "destructive" as const;
}

export function RequisitionDetail({
  requisition: req,
  requesterName,
  approverName,
  departmentName,
  isAdmin,
  userId,
  orgId,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const items = (req.items as unknown as RequisitionLine[]) ?? [];

  const [approvedQtys, setApprovedQtys] = useState<Record<number, number>>(
    Object.fromEntries(
      items.map((item, idx) => [idx, item.quantity_approved ?? item.quantity_requested])
    )
  );

  async function handleApprove() {
    setSaving(true);
    try {
      const supabase = createClient();
      const updatedItems = items.map((item, idx) => ({
        ...item,
        quantity_approved: approvedQtys[idx] ?? item.quantity_requested,
      }));

      const { error } = await supabase
        .from("requisitions")
        .update({
          status: "approved",
          approved_by: userId,
          approved_at: new Date().toISOString(),
          items: updatedItems as unknown as Json,
        })
        .eq("id", req.id);
      if (error) throw error;

      toast.success("Requisition approved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("requisitions")
        .update({
          status: "rejected",
          approved_by: userId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", req.id);
      if (error) throw error;

      toast.success("Requisition rejected");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setSaving(false);
    }
  }

  async function handleFulfil() {
    setSaving(true);
    try {
      const supabase = createClient();

      await fulfillRequisitionTransactions(
        supabase,
        orgId,
        userId,
        req.id,
        items,
        req.department_id
      );

      const { error } = await supabase
        .from("requisitions")
        .update({
          status: "fulfilled",
          fulfilled_at: new Date().toISOString(),
        })
        .eq("id", req.id);
      if (error) throw error;

      toast.success("Requisition fulfilled — stock deducted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fulfil");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{departmentName}</h1>
          <p className="text-muted-foreground">
            Requested by {requesterName} ·{" "}
            {req.created_at
              ? new Date(req.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </p>
          {approverName && (
            <p className="text-sm text-muted-foreground">
              {req.status === "rejected" ? "Rejected" : "Approved"} by{" "}
              {approverName}
            </p>
          )}
        </div>
        <Badge variant={statusColor(req.status ?? "pending")}>
          {req.status}
        </Badge>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="py-2 px-3 text-left font-medium">Item</th>
              <th className="py-2 px-3 text-right font-medium">Requested</th>
              {req.status === "pending" && isAdmin ? (
                <th className="py-2 px-3 text-right font-medium">Approve Qty</th>
              ) : (
                <th className="py-2 px-3 text-right font-medium">Approved</th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="py-2 px-3">
                  {item.item_name}
                  <span className="text-muted-foreground ml-1 text-xs">
                    {item.unit}
                  </span>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground">{item.notes}</p>
                  )}
                </td>
                <td className="py-2 px-3 text-right font-mono">
                  {item.quantity_requested}
                </td>
                <td className="py-2 px-3 text-right">
                  {req.status === "pending" && isAdmin ? (
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      className="w-20 ml-auto text-right"
                      value={approvedQtys[idx] ?? ""}
                      onChange={(e) =>
                        setApprovedQtys((prev) => ({
                          ...prev,
                          [idx]: Number(e.target.value),
                        }))
                      }
                    />
                  ) : (
                    <span className="font-mono">
                      {item.quantity_approved ?? "—"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {req.notes && (
        <Card>
          <CardContent className="py-3">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <p className="text-sm">{req.notes}</p>
          </CardContent>
        </Card>
      )}

      {isAdmin && req.status === "pending" && (
        <div className="flex gap-2">
          <Button onClick={handleApprove} disabled={saving}>
            {saving ? "Processing..." : "Approve"}
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={saving}>
            Reject
          </Button>
        </div>
      )}

      {isAdmin && req.status === "approved" && (
        <Button onClick={handleFulfil} disabled={saving}>
          {saving ? "Processing..." : "Mark as Fulfilled"}
        </Button>
      )}

      <Button variant="ghost" onClick={() => router.back()}>
        Back
      </Button>
    </div>
  );
}
