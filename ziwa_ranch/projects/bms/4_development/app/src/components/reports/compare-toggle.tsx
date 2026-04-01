"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ReportViewer } from "./report-viewer";
import type { FormSchema } from "@/types/forms";

interface NaSection {
  section_key: string;
  reason: string | null;
  flagged: boolean | null;
}

interface CompareToggleProps {
  previousData: Record<string, unknown> | null;
  previousNaSections: NaSection[];
  previousDate: string | null;
  schema: FormSchema;
}

export function CompareToggle({ previousData, previousNaSections, previousDate, schema }: CompareToggleProps) {
  const [showPrevious, setShowPrevious] = useState(false);

  if (!previousData) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Switch checked={showPrevious} onCheckedChange={setShowPrevious} />
        <Label className="text-sm text-muted-foreground">
          Compare with previous ({previousDate})
        </Label>
      </div>
      {showPrevious && (
        <div className="opacity-70">
          <p className="text-xs font-medium text-muted-foreground mb-2">Previous report — {previousDate}</p>
          <ReportViewer
            schema={schema}
            data={previousData}
            naSections={previousNaSections}
          />
        </div>
      )}
    </div>
  );
}
