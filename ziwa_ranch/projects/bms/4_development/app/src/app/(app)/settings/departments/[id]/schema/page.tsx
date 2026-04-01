import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SchemaEditor } from "@/components/settings/schema-editor";
import { notFound } from "next/navigation";

export default async function SchemaEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: dept } = await supabase
    .from("departments")
    .select("id, name, form_schema")
    .eq("id", id)
    .single();

  if (!dept) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">{dept.name} — Form Schema</h2>
        <p className="text-sm text-muted-foreground">
          Edit the JSON form schema. Validates against the form schema contract before saving.
        </p>
      </div>
      <SchemaEditor departmentId={dept.id} initialSchema={dept.form_schema} />
    </div>
  );
}
