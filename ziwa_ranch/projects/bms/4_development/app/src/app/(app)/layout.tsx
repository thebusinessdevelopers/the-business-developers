import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organisations")
    .select("id, name, onboarding_complete")
    .eq("id", profile.org_id)
    .single();

  return (
    <AppShell profile={profile} orgName={org?.name ?? "BMS"}>
      {children}
    </AppShell>
  );
}
