"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formSchemaValidator } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import type { Json } from "@/types/database";

interface Props {
  departmentId: string;
  initialSchema: Json;
}

export function SchemaEditor({ departmentId, initialSchema }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(JSON.stringify(initialSchema, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function validate(): boolean {
    setError(null);
    try {
      const parsed = JSON.parse(value);
      const result = formSchemaValidator.safeParse(parsed);
      if (!result.success) {
        setError(result.error.issues.map((e: { message: string }) => e.message).join("; "));
        return false;
      }
      return true;
    } catch {
      setError("Invalid JSON");
      return false;
    }
  }

  async function handleSave() {
    if (!validate()) return;

    setSaving(true);
    setSaved(false);

    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("departments")
      .update({ form_schema: JSON.parse(value) as Json })
      .eq("id", departmentId);

    if (dbError) {
      setError(dbError.message);
    } else {
      setSaved(true);
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-4">
        <Textarea
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false); setError(null); }}
          className="font-mono text-xs min-h-[400px]"
          spellCheck={false}
        />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {saved && (
          <Alert>
            <AlertDescription>Schema saved successfully.</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={validate}>
            Validate
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save schema"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
