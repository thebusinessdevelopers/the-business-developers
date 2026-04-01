import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { FormSchema } from "@/types/forms";

// ----- Schema -----

export interface SyncQueueItem {
  id: string;
  orgId: string;
  userId: string;
  departmentId: string;
  reportDate: string;
  data: Record<string, unknown>;
  naSections: { key: string; reason: string }[];
  status: "pending" | "syncing" | "failed";
  error?: string;
  createdAt: number;
}

export interface CachedDepartment {
  id: string;
  name: string;
  formSchema: FormSchema;
  reportSchedule: { hour?: number; days?: number[] } | null;
  cachedAt: number;
}

export interface CachedStockItem {
  orgId: string;
  name: string;
  unit: string;
}

export interface CachedReport {
  id: string;
  departmentId: string;
  reportDate: string;
  data: Record<string, unknown>;
  status: string;
  submittedAt: string;
}

export interface CachedProfile {
  id: string;
  orgId: string;
  fullName: string;
  role: string;
  departmentId: string | null;
  email: string | null;
}

interface BmsDB extends DBSchema {
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: { "by-status": string };
  };
  departments: {
    key: string;
    value: CachedDepartment;
  };
  stockItems: {
    key: string;
    value: CachedStockItem;
    indexes: { "by-orgId": string };
  };
  reports: {
    key: string;
    value: CachedReport;
    indexes: { "by-departmentId": string };
  };
  profile: {
    key: string;
    value: CachedProfile;
  };
}

const DB_NAME = "bms-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<BmsDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<BmsDB>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB not available on server"));
  }

  if (!dbPromise) {
    dbPromise = openDB<BmsDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const syncStore = db.createObjectStore("syncQueue", { keyPath: "id" });
        syncStore.createIndex("by-status", "status");

        db.createObjectStore("departments", { keyPath: "id" });

        const stockStore = db.createObjectStore("stockItems", {
          keyPath: "name",
        });
        stockStore.createIndex("by-orgId", "orgId");

        const reportsStore = db.createObjectStore("reports", {
          keyPath: "id",
        });
        reportsStore.createIndex("by-departmentId", "departmentId");

        db.createObjectStore("profile", { keyPath: "id" });
      },
    });
  }

  return dbPromise;
}

// ----- Sync queue operations -----

export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  const db = await getDB();
  await db.put("syncQueue", item);
}

export async function getPendingItems(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex("syncQueue", "by-status", "pending");
}

export async function updateSyncItem(
  id: string,
  updates: Partial<SyncQueueItem>
): Promise<void> {
  const db = await getDB();
  const item = await db.get("syncQueue", id);
  if (item) {
    await db.put("syncQueue", { ...item, ...updates });
  }
}

export async function removeSyncItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("syncQueue", id);
}

export async function getSyncQueueCount(): Promise<number> {
  const db = await getDB();
  return db.countFromIndex("syncQueue", "by-status", "pending");
}

export async function getFailedItems(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex("syncQueue", "by-status", "failed");
}

// ----- Department schema cache -----

export async function cacheDepartment(
  dept: CachedDepartment
): Promise<void> {
  const db = await getDB();
  await db.put("departments", dept);
}

export async function getCachedDepartment(
  id: string
): Promise<CachedDepartment | undefined> {
  const db = await getDB();
  return db.get("departments", id);
}

// ----- Stock items cache -----

export async function cacheStockItems(
  items: CachedStockItem[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("stockItems", "readwrite");
  for (const item of items) {
    await tx.store.put(item);
  }
  await tx.done;
}

export async function getCachedStockItems(
  orgId: string
): Promise<CachedStockItem[]> {
  const db = await getDB();
  return db.getAllFromIndex("stockItems", "by-orgId", orgId);
}

// ----- Reports cache -----

export async function cacheReport(report: CachedReport): Promise<void> {
  const db = await getDB();
  await db.put("reports", report);
}

export async function getCachedReports(
  departmentId: string
): Promise<CachedReport[]> {
  const db = await getDB();
  return db.getAllFromIndex("reports", "by-departmentId", departmentId);
}

// ----- Profile cache -----

export async function cacheProfile(profile: CachedProfile): Promise<void> {
  const db = await getDB();
  await db.put("profile", profile);
}

export async function getCachedProfile(): Promise<CachedProfile | undefined> {
  const db = await getDB();
  const all = await db.getAll("profile");
  return all[0];
}
