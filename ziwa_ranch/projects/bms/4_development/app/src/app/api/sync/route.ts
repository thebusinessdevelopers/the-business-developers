import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { Json } from "@/types/database";

const syncPayloadSchema = z.object({
  syncId: z.string(),
  orgId: z.string().uuid(),
  userId: z.string().uuid(),
  departmentId: z.string().uuid(),
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  data: z.record(z.string(), z.unknown()),
  naSections: z.array(
    z.object({ key: z.string(), reason: z.string() })
  ),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = syncPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", code: "validation" },
        { status: 400 }
      );
    }

    const { syncId, orgId, userId, departmentId, reportDate, data, naSections } =
      parsed.data;

    const supabase = await createClient();

    // Verify the user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorised", code: "auth" },
        { status: 401 }
      );
    }

    // Check for existing report (conflict detection)
    const { data: existing } = await supabase
      .from("reports")
      .select("id, sync_id")
      .eq("org_id", orgId)
      .eq("department_id", departmentId)
      .eq("report_date", reportDate)
      .maybeSingle();

    if (existing) {
      if (existing.sync_id === syncId) {
        // Same sync — idempotent, already synced
        return NextResponse.json({ id: existing.id, status: "already_synced" });
      }
      // Different submission exists — conflict, server wins
      return NextResponse.json(
        {
          error:
            "A report for this department and date already exists. The server version has been kept.",
          code: "conflict",
          existingId: existing.id,
        },
        { status: 409 }
      );
    }

    // Insert the report
    const { data: report, error } = await supabase
      .from("reports")
      .insert({
        org_id: orgId,
        department_id: departmentId,
        submitted_by: userId,
        report_date: reportDate,
        data: data as unknown as Json,
        status: "submitted",
        sync_id: syncId,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Report already exists", code: "conflict" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: error.message, code: "db_error" },
        { status: 500 }
      );
    }

    // Insert N/A sections
    if (naSections.length > 0 && report) {
      const naRows = naSections.map((na) => ({
        report_id: report.id,
        section_key: na.key,
        reason: na.reason,
      }));
      await supabase.from("report_section_na").insert(naRows);
    }

    // Mark in sync_queue table for audit
    await supabase.from("sync_queue").insert({
      org_id: orgId,
      user_id: userId,
      operation: "insert",
      table_name: "reports",
      local_id: syncId,
      payload: { report_id: report.id, report_date: reportDate },
      status: "synced",
      synced_at: new Date().toISOString(),
    });

    return NextResponse.json({ id: report.id, status: "synced" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "internal" },
      { status: 500 }
    );
  }
}
