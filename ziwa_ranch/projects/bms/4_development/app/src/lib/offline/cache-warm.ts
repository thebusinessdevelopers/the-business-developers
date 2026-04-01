"use client";

import {
  cacheDepartment,
  cacheStockItems,
  cacheReport,
  type CachedDepartment,
  type CachedStockItem,
  type CachedReport,
} from "./db";

/**
 * Cache department schema and related data to IndexedDB.
 * Called from submit page when data is loaded from Supabase (online).
 */
export async function warmDepartmentCache(
  dept: CachedDepartment,
  stockItems: CachedStockItem[],
  recentReports: CachedReport[]
): Promise<void> {
  try {
    await cacheDepartment(dept);

    if (stockItems.length > 0) {
      await cacheStockItems(stockItems);
    }

    for (const report of recentReports) {
      await cacheReport(report);
    }
  } catch {
    // Cache warming is best-effort — don't block the user
  }
}
