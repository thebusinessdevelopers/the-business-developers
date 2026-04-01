import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmissionTracker } from "@/components/reports/submission-tracker";
import { isAdminRole, type UserRole } from "@/types/forms";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

export default async function DashboardPage() {
  const profile = await requireAuth();
  const supabase = await createClient();
  const isAdmin = isAdminRole(profile.role as UserRole);

  const today = new Date().toISOString().split("T")[0];
  const nowHour = new Date().getUTCHours() + 3; // EAT offset

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, report_schedule")
    .eq("org_id", profile.org_id)
    .eq("active", true)
    .order("name");

  const { data: todayReports } = await supabase
    .from("reports")
    .select("id, department_id, submitted_at")
    .eq("report_date", today);

  const reportMap = new Map((todayReports ?? []).map((r) => [r.department_id, r]));

  const departmentStatuses = (departments ?? []).map((dept) => {
    const report = reportMap.get(dept.id);
    const schedule = dept.report_schedule as { hour?: number } | null;
    const scheduledHour = schedule?.hour ?? null;
    let status: "submitted" | "pending" | "overdue" = "pending";

    if (report) {
      status = "submitted";
    } else if (scheduledHour !== null && nowHour > scheduledHour + 1) {
      status = "overdue";
    }

    return {
      id: dept.id,
      name: dept.name,
      reportId: report?.id ?? null,
      submittedAt: report?.submitted_at ?? null,
      scheduledHour,
      status,
    };
  });

  const submitted = departmentStatuses.filter((d) => d.status === "submitted").length;
  const overdue = departmentStatuses.filter((d) => d.status === "overdue").length;

  // HOD view: show their department's submit link
  const hodDepartment = profile.department_id
    ? (departments ?? []).find((d) => d.id === profile.department_id)
    : null;
  const hodReport = hodDepartment ? reportMap.get(hodDepartment.id) : null;

  const { count: flagCount } = await supabase
    .from("intelligence_flags")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Good morning, {profile.full_name.split(" ")[0]}</h1>
        <p className="text-muted-foreground">Here&apos;s your daily overview</p>
      </div>

      {/* HOD quick submit */}
      {hodDepartment && !hodReport && (
        <Link href={`/submit/${hodDepartment.id}`}>
          <Card className="border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 py-4">
              <ClipboardList className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium">Submit today&apos;s {hodDepartment.name} report</p>
                <p className="text-sm text-muted-foreground">Tap to open the form</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {hodDepartment && hodReport && (
        <Link href={`/reports/${hodReport.id}`}>
          <Card className="border-green-500/30 bg-green-50 dark:bg-green-950/20 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 py-4">
              <ClipboardList className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">Today&apos;s {hodDepartment.name} report submitted</p>
                <p className="text-sm text-muted-foreground">Tap to view</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reports Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{submitted}/{(departments ?? []).length}</p>
            <p className="text-xs text-muted-foreground">departments submitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${overdue > 0 ? "text-red-600" : ""}`}>{overdue}</p>
            <p className="text-xs text-muted-foreground">past scheduled time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{flagCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">requiring attention</p>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Submission Tracker</h2>
          <SubmissionTracker departments={departmentStatuses} />
        </div>
      )}
    </div>
  );
}
