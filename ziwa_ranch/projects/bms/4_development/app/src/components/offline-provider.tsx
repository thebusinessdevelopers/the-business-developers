"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { getSyncQueueCount } from "@/lib/offline/db";
import { drainSyncQueue, type SyncResult } from "@/lib/offline/sync";
import { toast } from "sonner";

interface OfflineContextValue {
  isOnline: boolean;
  queueCount: number;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  triggerSync: () => Promise<void>;
  refreshQueueCount: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue>({
  isOnline: true,
  queueCount: 0,
  isSyncing: false,
  lastSyncResult: null,
  triggerSync: async () => {},
  refreshQueueCount: async () => {},
});

export function useOffline() {
  return useContext(OfflineContext);
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus();
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(
    null
  );
  const syncingRef = useRef(false);

  const refreshQueueCount = useCallback(async () => {
    try {
      const count = await getSyncQueueCount();
      setQueueCount(count);
    } catch {
      // IndexedDB might not be ready yet
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const result = await drainSyncQueue();
      setLastSyncResult(result);

      if (result.synced > 0) {
        toast.success(
          `${result.synced} report${result.synced > 1 ? "s" : ""} synced`
        );
      }
      if (result.conflicts.length > 0) {
        toast.info(
          "Some reports were already submitted from another session"
        );
      }
      if (result.failed > 0) {
        toast.error(
          `${result.failed} report${result.failed > 1 ? "s" : ""} failed to sync — will retry`
        );
      }
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      await refreshQueueCount();
    }
  }, [refreshQueueCount]);

  // Poll queue count periodically
  useEffect(() => {
    refreshQueueCount();
    const interval = setInterval(refreshQueueCount, 5000);
    return () => clearInterval(interval);
  }, [refreshQueueCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && queueCount > 0) {
      triggerSync();
    }
  }, [isOnline, queueCount, triggerSync]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        queueCount,
        isSyncing,
        lastSyncResult,
        triggerSync,
        refreshQueueCount,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}
