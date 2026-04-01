import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReportViewer } from "@/components/reports/report-viewer";
import { ReviewPanel } from "@/components/reports/review-panel";
import { CompareToggle } from "@/components/reports/compare-toggle";
import { Badge } from "@/components/ui/badge";
import { isAdminRole, type FormSchema, type UserRole } from "@/types/forms";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireAuth();
  const supabase = await createClient();
  const isAdmin = isAdminRole(profile.role as UserRole);

  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();

  if (!report) redirect("/reports");

  const { data: department } = await supabase
    .from("departments")
    .select("id, name, form_schema")
    .eq("id", report.department_id)
    .single();

  if (!department) redirect("/reports");

  const schema = department.form_schema as unknown as FormSchema;
  const reportData = (report.data ?? {}) as Record<string, unknown>;

  const { data: naSections } = await supabase
    .from("report_section_na")
    .select("section_key, reason, flagged")
    .eq("report_id", id);

  const { data: reviewRows } = await supabase
    .from("report_reviews")
    .select("id, comment, created_at, reviewer_id, mentions")
    .eq("report_id", id)
    .order("created_at", { ascending: true });

  const reviewerIds = [...new Set((reviewRows ?? []).map((r) => r.reviewer_id))];
  let reviewerMap = new Map<string, string>();
  if (reviewerIds.length > 0) {
    const { data: reviewers } = await supabase
      .from("users")
      .select("id, full_name")
      .in("id", reviewerIds);
    reviewerMap = new Map((reviewers ?? []).map((u) => [u.id, u.full_name]));
  }

  const reviews = (reviewRows ?? []).map((r) => ({
    ...r,
    reviewer_name: reviewerMap.get(r.reviewer_id) ?? "Unknown",
  }));

  const { data: orgUsers } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("active", true)
    .order("full_name");

  const { data: submitter } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", report.submitted_by)
    .single();

  // Previous day's report for comparison (R2.27)
  const { data: previousReport } = await supabase
    .from("reports")
    .select("id, report_date, data")
    .eq("department_id", report.department_id)
    .lt("report_date", report.report_date)
    .order("report_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  let previousNa: { section_key: string; reason: string | null; flagged: boolean | null }[] = [];
  if (previousReport) {
    const { data: pNa } = await supabase
      .from("report_section_na")
      .select("section_key, reason, flagged")
      .eq("report_id", previousReport.id);
    previousNa = pNa ?? [];
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-8">
      <div className="flex items-center gap-2">
        <Link href="/reports" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold truncate">{department.name}</h1>
            <Badge variant={report.status === "flagged" ? "destructive" : report.status === "reviewed" ? "secondary" : "default"}>
              {report.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {new Date(report.report_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {" · "}by {submitter?.full_name ?? "Unknown"}
          </p>
        </div>
      </div>

      <ReportViewer
        schema={schema}
        data={reportData}
        naSections={naSections ?? []}
      />

      <CompareToggle
        previousData={previousReport ? (previousReport.data as Record<string, unknown>) : null}
        previousNaSections={previousNa}
        previousDate={previousReport?.report_date ?? null}
        schema={schema}
      />

      <ReviewPanel
        reportId={id}
        orgId={report.org_id}
        userId={profile.id}
        reportStatus={report.status ?? "submitted"}
        reviews={reviews}
        orgUsers={orgUsers ?? []}
        isAdmin={isAdmin}
      />
    </div>
  );
}
