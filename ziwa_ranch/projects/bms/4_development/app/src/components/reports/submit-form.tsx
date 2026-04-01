"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FormRenderer } from "./form-renderer";
import { toast } from "sonner";
import { useOffline } from "@/components/offline-provider";
import { enqueueSubmission } from "@/lib/offline/sync";
import { warmDepartmentCache } from "@/lib/offline/cache-warm";
import type { FormSchema } from "@/types/forms";
import type { Json } from "@/types/database";

interface SubmitFormProps {
  departmentId: string;
  departmentName: string;
  orgId: string;
  userId: string;
  schema: FormSchema;
  stockItems: { name: string; unit: string }[];
  roomCount: number;
  todayReportId?: string;
}

export function SubmitForm({
  departmentId,
  departmentName,
  orgId,
  userId,
  schema,
  stockItems,
  roomCount,
  todayReportId,
}: SubmitFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { isOnline, refreshQueueCount, triggerSync } = useOffline();

  // Warm the IndexedDB cache with this department's data
  useEffect(() => {
    warmDepartmentCache(
      {
        id: departmentId,
        name: departmentName,
        formSchema: schema,
        reportSchedule: null,
        cachedAt: Date.now(),
      },
      stockItems.map((s) => ({ orgId, ...s })),
      []
    );
  }, [departmentId, departmentName, schema, stockItems, orgId]);

  if (todayReportId) {
    return (
      <div className="rounded-lg border p-6 text-center space-y-3">
        <p className="text-lg font-medium">Today&apos;s report has already been submitted.</p>
        <p className="text-sm text-muted-foreground">
          {departmentName} report for today is done. You can view it in the reports section.
        </p>
        <button
          onClick={() => router.push(`/reports/${todayReportId}`)}
          className="text-sm text-primary underline"
        >
          View submitted report
        </button>
      </div>
    );
  }

  async function handleSubmit(
    data: Record<string, unknown>,
    naSections: { key: string; reason: string }[]
  ) {
    setSubmitting(true);
    const today = new Date().toISOString().split("T")[0];

    try {
      if (isOnline) {
        // Online: submit directly to Supabase
        const supabase = createClient();

        const { data: report, error } = await supabase
          .from("reports")
          .insert({
            org_id: orgId,
            department_id: departmentId,
            submitted_by: userId,
            report_date: today,
            data: data as unknown as Json,
            status: "submitted",
          })
          .select("id")
          .single();

        if (error) {
          if (error.code === "23505") {
            toast.error("Today's report has already been submitted.");
          } else {
            toast.error(error.message);
          }
          return;
        }

        if (naSections.length > 0 && report) {
          const naRows = naSections.map((na) => ({
            report_id: report.id,
            section_key: na.key,
            reason: na.reason,
          }));
          await supabase.from("report_section_na").insert(naRows);
        }

        toast.success("Report submitted successfully");
        router.push("/reports");
        router.refresh();
      } else {
        // Offline: queue in IndexedDB for later sync
        await enqueueSubmission({
          orgId,
          userId,
          departmentId,
          reportDate: today,
          data,
          naSections,
        });

        await refreshQueueCount();
        toast.success("Saved — will sync when online");
        router.push("/dashboard");
      }
    } catch {
      // Network failed mid-request — fall back to offline queue
      try {
        await enqueueSubmission({
          orgId,
          userId,
          departmentId,
          reportDate: today,
          data,
          naSections,
        });
        await refreshQueueCount();
        toast.success("Saved locally — will sync when connection returns");
        router.push("/dashboard");
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {!isOnline && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            You are offline. Your report will be saved locally and synced when you reconnect.
          </p>
        </div>
      )}
      <FormRenderer
        schema={schema}
        stockItems={stockItems}
        roomCount={roomCount}
        submitting={submitting}
        onSubmit={handleSubmit}
      />
    </>
  );
}
