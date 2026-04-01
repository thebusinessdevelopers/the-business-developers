import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReportsList } from "@/components/reports/reports-list";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const profile = await requireAuth();
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];
  const selectedDate = date ?? today;

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("org_id", profile.org_id)
    .eq("active", true)
    .order("name");

  const { data: reports } = await supabase
    .from("reports")
    .select("id, department_id, report_date, status, submitted_at, submitted_by")
    .eq("report_date", selectedDate)
    .order("submitted_at", { ascending: false });

  const submitterIds = [...new Set((reports ?? []).map((r) => r.submitted_by))];
  let usersMap: Map<string, string> = new Map();
  if (submitterIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name")
      .in("id", submitterIds);
    usersMap = new Map((users ?? []).map((u) => [u.id, u.full_name]));
  }

  const enrichedReports = (reports ?? []).map((r) => ({
    ...r,
    status: r.status,
    submitted_by_name: usersMap.get(r.submitted_by) ?? "Unknown",
    department_name: (departments ?? []).find((d) => d.id === r.department_id)?.name ?? "Unknown",
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Daily department submissions</p>
      </div>
      <ReportsList
        reports={enrichedReports}
        departments={departments ?? []}
        initialDate={selectedDate}
      />
    </div>
  );
}
