import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DepartmentsManager } from "@/components/settings/departments-manager";

export default async function DepartmentsSettingsPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: departments } = await supabase
    .from("departments")
    .select("*")
    .eq("org_id", profile.org_id)
    .order("name");

  const { data: templates } = await supabase
    .from("department_templates")
    .select("*")
    .eq("is_active", true)
    .order("name");

  return (
    <DepartmentsManager
      departments={departments ?? []}
      templates={templates ?? []}
      orgId={profile.org_id}
    />
  );
}
