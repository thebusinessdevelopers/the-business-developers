"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";

interface DepartmentStatus {
  id: string;
  name: string;
  reportId: string | null;
  submittedAt: string | null;
  scheduledHour: number | null;
  status: "submitted" | "pending" | "overdue";
}

interface SubmissionTrackerProps {
  departments: DepartmentStatus[];
}

export function SubmissionTracker({ departments }: SubmissionTrackerProps) {
  const router = useRouter();

  const submitted = departments.filter((d) => d.status === "submitted").length;
  const total = departments.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {submitted}/{total} submitted
        </p>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-600" /> Submitted</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-yellow-600" /> Pending</span>
          <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-red-600" /> Overdue</span>
        </div>
      </div>

      <div className="space-y-2">
        {departments.map((dept) => (
          <Card
            key={dept.id}
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => {
              if (dept.reportId) {
                router.push(`/reports/${dept.reportId}`);
              } else {
                router.push(`/submit/${dept.id}`);
              }
            }}
          >
            <CardContent className="flex items-center gap-3 py-3 px-4">
              {dept.status === "submitted" && <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />}
              {dept.status === "pending" && <Clock className="h-5 w-5 text-yellow-600 shrink-0" />}
              {dept.status === "overdue" && <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{dept.name}</p>
                {dept.submittedAt ? (
                  <p className="text-xs text-muted-foreground">
                    Submitted at {new Date(dept.submittedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {dept.status === "overdue" ? "Overdue" : "Not yet submitted"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
