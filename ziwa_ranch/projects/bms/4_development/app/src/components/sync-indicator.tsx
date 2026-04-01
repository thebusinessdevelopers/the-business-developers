"use client";

import { useOffline } from "./offline-provider";
import { WifiOff, RefreshCw, CloudOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SyncIndicator() {
  const { isOnline, queueCount, isSyncing, triggerSync } = useOffline();

  // Silence = good (R2.20)
  if (isOnline && queueCount === 0 && !isSyncing) {
    return null;
  }

  if (isSyncing) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-blue-600 px-4 py-2 text-white text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Syncing...</span>
      </div>
    );
  }

  if (!isOnline && queueCount === 0) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-amber-600 px-4 py-2 text-white text-sm">
        <WifiOff className="h-4 w-4" />
        <span>Offline — working locally</span>
      </div>
    );
  }

  if (!isOnline && queueCount > 0) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-amber-600 px-4 py-2 text-white text-sm">
        <CloudOff className="h-4 w-4" />
        <span>
          Offline — {queueCount} item{queueCount !== 1 ? "s" : ""} queued
        </span>
      </div>
    );
  }

  // Online but has pending items (failed sync, needs retry)
  if (isOnline && queueCount > 0) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-white text-sm">
        <RefreshCw className="h-4 w-4" />
        <span>
          {queueCount} item{queueCount !== 1 ? "s" : ""} waiting to sync
        </span>
        <Button
          variant="secondary"
          size="sm"
          className="ml-2 h-6 text-xs"
          onClick={() => triggerSync()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return null;
}
