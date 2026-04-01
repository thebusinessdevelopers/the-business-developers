import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SubmitForm } from "@/components/reports/submit-form";
import type { FormSchema } from "@/types/forms";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function SubmitReportPage({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  const { departmentId } = await params;
  const profile = await requireAuth();
  const supabase = await createClient();

  const { data: department } = await supabase
    .from("departments")
    .select("id, name, form_schema, org_id")
    .eq("id", departmentId)
    .single();

  if (!department) redirect("/dashboard");

  const schema = department.form_schema as unknown as FormSchema;
  const today = new Date().toISOString().split("T")[0];

  const { data: existingReport } = await supabase
    .from("reports")
    .select("id")
    .eq("department_id", departmentId)
    .eq("report_date", today)
    .maybeSingle();

  const { data: stockItems } = await supabase
    .from("stock_items")
    .select("name, unit")
    .eq("org_id", department.org_id)
    .eq("active", true)
    .order("name");

  const { data: org } = await supabase
    .from("organisations")
    .select("room_count")
    .eq("id", department.org_id)
    .single();

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-8">
      <div className="flex items-center gap-2">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{department.name}</h1>
          <p className="text-sm text-muted-foreground">
            Daily report — {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <SubmitForm
        departmentId={department.id}
        departmentName={department.name}
        orgId={department.org_id}
        userId={profile.id}
        schema={schema}
        stockItems={stockItems ?? []}
        roomCount={org?.room_count ?? 0}
        todayReportId={existingReport?.id}
      />
    </div>
  );
}
