import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UsersManager } from "@/components/settings/users-manager";

export default async function UsersSettingsPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("users")
    .select("*, departments:department_id(id, name)")
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: true });

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("org_id", profile.org_id)
    .eq("active", true)
    .order("name");

  return (
    <UsersManager
      users={users ?? []}
      departments={departments ?? []}
      orgId={profile.org_id}
      currentUserRole={profile.role}
    />
  );
}
