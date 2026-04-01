import {
  getPendingItems,
  updateSyncItem,
  removeSyncItem,
  type SyncQueueItem,
} from "./db";

export interface SyncResult {
  synced: number;
  failed: number;
  conflicts: string[];
}

export async function drainSyncQueue(): Promise<SyncResult> {
  const pending = await getPendingItems();
  const result: SyncResult = { synced: 0, failed: 0, conflicts: [] };

  for (const item of pending) {
    await updateSyncItem(item.id, { status: "syncing" });

    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syncId: item.id,
          orgId: item.orgId,
          userId: item.userId,
          departmentId: item.departmentId,
          reportDate: item.reportDate,
          data: item.data,
          naSections: item.naSections,
        }),
      });

      if (response.ok) {
        await removeSyncItem(item.id);
        result.synced++;
      } else {
        const body = await response.json().catch(() => ({ error: "Unknown" }));

        if (body.code === "conflict") {
          await removeSyncItem(item.id);
          result.conflicts.push(item.departmentId);
        } else {
          await updateSyncItem(item.id, {
            status: "failed",
            error: body.error ?? `HTTP ${response.status}`,
          });
          result.failed++;
        }
      }
    } catch {
      await updateSyncItem(item.id, {
        status: "pending",
        error: "Network error — will retry",
      });
      result.failed++;
    }
  }

  return result;
}

export function generateSyncId(): string {
  return `${Date.now()}-${crypto.randomUUID()}`;
}

export async function enqueueSubmission(
  submission: Omit<SyncQueueItem, "id" | "status" | "createdAt">
): Promise<string> {
  const { addToSyncQueue } = await import("./db");
  const id = generateSyncId();

  await addToSyncQueue({
    ...submission,
    id,
    status: "pending",
    createdAt: Date.now(),
  });

  return id;
}
