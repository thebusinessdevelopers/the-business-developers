"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, FileEdit, Settings2 } from "lucide-react";
import type { Database, Json } from "@/types/database";

type DeptRow = Database["public"]["Tables"]["departments"]["Row"];
type TemplateRow = Database["public"]["Tables"]["department_templates"]["Row"];

interface Props {
  departments: DeptRow[];
  templates: TemplateRow[];
  orgId: string;
}

export function DepartmentsManager({ departments, templates, orgId }: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{departments.length} departments</p>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-1" /> Add department
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Department</DialogTitle>
            </DialogHeader>
            <AddDepartmentForm
              templates={templates}
              orgId={orgId}
              onSuccess={() => { setAddOpen(false); router.refresh(); }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {departments.map((dept) => (
          <Card key={dept.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{dept.name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{dept.slug}</span>
                  {!dept.active && (
                    <Badge variant="outline" className="text-xs text-destructive">Inactive</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Link href={`/settings/departments/${dept.id}/schema`}>
                  <Button variant="ghost" size="icon" title="Edit form schema">
                    <FileEdit className="h-4 w-4" />
                  </Button>
                </Link>
                <EditDepartmentButton dept={dept} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AddDepartmentForm({
  templates,
  orgId,
  onSuccess,
}: {
  templates: TemplateRow[];
  orgId: string;
  onSuccess: () => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateRow | null>(null);
  const [customName, setCustomName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    const name = selectedTemplate?.name ?? customName;
    if (!name || name.length < 2) {
      setError("Name is required");
      return;
    }

    setLoading(true);
    setError(null);

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

    const formSchema: Json = selectedTemplate?.form_schema ?? { sections: [] };

    const supabase = createClient();
    const { error: insertError } = await supabase.from("departments").insert({
      org_id: orgId,
      template_id: selectedTemplate?.id ?? null,
      name,
      slug,
      form_schema: formSchema,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block">Choose a template</Label>
        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setSelectedTemplate(t); setCustomName(""); }}
              className={`text-left p-3 rounded-md border text-sm transition-colors ${
                selectedTemplate?.id === t.id
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted"
              }`}
            >
              <p className="font-medium">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.category}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground">or</div>

      <div className="space-y-2">
        <Label>Custom department name</Label>
        <Input
          value={customName}
          onChange={(e) => { setCustomName(e.target.value); setSelectedTemplate(null); }}
          placeholder="e.g. Laundry"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        className="w-full"
        onClick={handleCreate}
        disabled={loading || (!selectedTemplate && !customName)}
      >
        {loading ? "Creating..." : "Create department"}
      </Button>
    </div>
  );
}

function EditDepartmentButton({ dept }: { dept: DeptRow }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggleActive() {
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("departments")
      .update({ active: !dept.active })
      .eq("id", dept.id);
    router.refresh();
    setLoading(false);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      title={dept.active ? "Deactivate" : "Reactivate"}
      onClick={toggleActive}
      disabled={loading}
    >
      <Settings2 className="h-4 w-4" />
    </Button>
  );
}
