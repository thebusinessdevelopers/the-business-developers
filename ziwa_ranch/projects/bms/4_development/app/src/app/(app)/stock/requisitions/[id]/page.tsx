import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole, type UserRole } from "@/types/forms";
import { notFound } from "next/navigation";
import { RequisitionDetail } from "@/components/stock/requisition-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RequisitionPage({ params }: Props) {
  const { id } = await params;
  const profile = await requireAuth();
  const supabase = await createClient();
  const isAdmin = isAdminRole(profile.role as UserRole);

  const { data: req } = await supabase
    .from("requisitions")
    .select("*")
    .eq("id", id)
    .single();

  if (!req) notFound();

  const { data: requester } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", req.requested_by)
    .single();

  const approverName = req.approved_by
    ? (
        await supabase
          .from("users")
          .select("full_name")
          .eq("id", req.approved_by)
          .single()
      ).data?.full_name ?? null
    : null;

  const { data: dept } = await supabase
    .from("departments")
    .select("name")
    .eq("id", req.department_id)
    .single();

  return (
    <RequisitionDetail
      requisition={req}
      requesterName={requester?.full_name ?? "Unknown"}
      approverName={approverName}
      departmentName={dept?.name ?? "Unknown"}
      isAdmin={isAdmin}
      userId={profile.id}
      orgId={profile.org_id}
    />
  );
}
