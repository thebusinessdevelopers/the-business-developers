"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FormSchema } from "@/types/forms";

interface NaSection {
  section_key: string;
  reason: string | null;
  flagged: boolean | null;
}

interface ReportViewerProps {
  schema: FormSchema;
  data: Record<string, unknown>;
  naSections: NaSection[];
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== 0);
    if (entries.length === 0) return "—";
    return entries.map(([k, v]) => `${k}: ${v}`).join(", ");
  }
  return String(value);
}

export function ReportViewer({ schema, data, naSections }: ReportViewerProps) {
  const naMap = new Map(naSections.map((na) => [na.section_key, na]));

  return (
    <div className="space-y-4">
      {schema.sections.map((section) => {
        const na = naMap.get(section.key);

        return (
          <Card key={section.key} className={na ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{section.title}</CardTitle>
                {na && (
                  <Badge variant={na.flagged ? "destructive" : "outline"} className="shrink-0">
                    {na.flagged ? "Flagged N/A" : "N/A"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {na ? (
                <p className="text-sm text-muted-foreground italic">
                  Reason: {na.reason || "No reason provided"}
                </p>
              ) : (
                <div className="space-y-3">
                  {section.fields.map((field) => {
                    const value = data[field.key];
                    return (
                      <div key={field.key}>
                        <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
                        <p className="text-sm mt-0.5">{renderValue(value)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
