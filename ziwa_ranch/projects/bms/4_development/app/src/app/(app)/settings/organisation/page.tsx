import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OrganisationForm } from "@/components/settings/organisation-form";

export default async function OrganisationSettingsPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organisations")
    .select("*")
    .eq("id", profile.org_id)
    .single();

  if (!org) return <p>Organisation not found.</p>;

  return <OrganisationForm org={org} />;
}
