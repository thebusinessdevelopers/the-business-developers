import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole, type UserRole } from "@/types/forms";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { RequisitionLine } from "@/lib/stock";
import type { Json } from "@/types/database";

function statusColor(status: string) {
  if (status === "pending") return "outline" as const;
  if (status === "approved") return "secondary" as const;
  if (status === "fulfilled") return "default" as const;
  return "destructive" as const;
}

export default async function RequisitionsPage() {
  const profile = await requireAuth();
  const supabase = await createClient();
  const isAdmin = isAdminRole(profile.role as UserRole);

  let query = supabase
    .from("requisitions")
    .select(
      "*, departments:department_id(name)"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (!isAdmin && profile.department_id) {
    query = query.eq("department_id", profile.department_id);
  }

  const { data: requisitions } = await query;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Requisitions</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "All department requests" : "Your department requests"}
          </p>
        </div>
        <Link href="/stock/requisitions/new">
          <Button>New Requisition</Button>
        </Link>
      </div>

      {(requisitions ?? []).length === 0 ? (
        <p className="text-muted-foreground">No requisitions yet.</p>
      ) : (
        <div className="space-y-2">
          {(requisitions ?? []).map((req) => {
            const items = (req.items as unknown as RequisitionLine[]) ?? [];
            const dept = req.departments as { name: string } | null;
            const deptName = dept?.name ?? "Unknown";
            return (
              <Link key={req.id} href={`/stock/requisitions/${req.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer mb-2">
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">
                        {deptName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {items.length} item{items.length !== 1 ? "s" : ""} ·{" "}
                        {req.created_at
                          ? new Date(req.created_at).toLocaleDateString(
                              "en-GB",
                              {
                                day: "numeric",
                                month: "short",
                              }
                            )
                          : "—"}
                      </p>
                    </div>
                    <Badge variant={statusColor(req.status ?? "pending")}>
                      {req.status}
                    </Badge>
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
