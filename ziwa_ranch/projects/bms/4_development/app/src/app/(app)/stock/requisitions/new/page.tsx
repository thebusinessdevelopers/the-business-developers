import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RequisitionForm } from "@/components/stock/requisition-form";

export default async function NewRequisitionPage() {
  const profile = await requireAuth();
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("stock_items")
    .select("*")
    .eq("active", true)
    .order("name");

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("active", true)
    .order("name");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">New Requisition</h1>
      <RequisitionForm
        orgId={profile.org_id}
        userId={profile.id}
        userDepartmentId={profile.department_id}
        stockItems={items ?? []}
        departments={departments ?? []}
      />
    </div>
  );
}
