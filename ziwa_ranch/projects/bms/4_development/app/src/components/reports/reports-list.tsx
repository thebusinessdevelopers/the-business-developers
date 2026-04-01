"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ClipboardCheck, Clock, AlertTriangle, Minus } from "lucide-react";

interface Report {
  id: string;
  department_id: string;
  report_date: string;
  status: string | null;
  submitted_at: string | null;
  submitted_by_name: string;
  department_name: string;
}

interface Department {
  id: string;
  name: string;
}

interface ReportsListProps {
  reports: Report[];
  departments: Department[];
  initialDate: string;
}

const STATUS_CONFIG = {
  submitted: { label: "Submitted", variant: "default" as const, icon: Clock },
  reviewed: { label: "Reviewed", variant: "secondary" as const, icon: ClipboardCheck },
  flagged: { label: "Flagged", variant: "destructive" as const, icon: AlertTriangle },
} as const;

export function ReportsList({ reports, departments, initialDate }: ReportsListProps) {
  const [date, setDate] = useState(initialDate);
  const router = useRouter();

  function handleDateChange(newDate: string) {
    setDate(newDate);
    router.push(`/reports?date=${newDate}`);
  }

  const reportsByDept = new Map<string, Report>();
  for (const r of reports) {
    if (r.report_date === date) {
      reportsByDept.set(r.department_id, r);
    }
  }

  return (
    <div className="space-y-4">
      <Input
        type="date"
        value={date}
        onChange={(e) => handleDateChange(e.target.value)}
        className="w-auto"
      />

      <div className="space-y-2">
        {departments.map((dept) => {
          const report = reportsByDept.get(dept.id);
          const status = report?.status ?? "missing";
          const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];

          return (
            <Card
              key={dept.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${!report ? "opacity-60" : ""}`}
              onClick={() => report ? router.push(`/reports/${report.id}`) : undefined}
            >
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{dept.name}</p>
                  {report ? (
                    <p className="text-xs text-muted-foreground">
                      by {report.submitted_by_name} at{" "}
                      {new Date(report.submitted_at ?? "").toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Not submitted</p>
                  )}
                </div>
                {config ? (
                  <Badge variant={config.variant} className="shrink-0 gap-1">
                    <config.icon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0 gap-1">
                    <Minus className="h-3 w-3" />
                    Missing
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
