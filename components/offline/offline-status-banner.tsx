"use client";

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, X } from "lucide-react";

import { useOfflineStatus } from "@/hooks/use-offline-status";

export function OfflineStatusBanner() {
  const { isOnline, queuedCount } = useOfflineStatus();
  const [dismissed, setDismissed] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setDismissed(false);
    }
  }, [isOnline]);

  useEffect(() => {
    if (isOnline && queuedCount === 0) {
      setDismissed(false);
      setWasOffline(false);
    }
  }, [isOnline, queuedCount]);

  if (dismissed) {
    return null;
  }

  const showOffline = !isOnline;
  const showSyncing = isOnline && queuedCount > 0;

  if (!showOffline && !showSyncing) {
    return null;
  }

  const Icon = showOffline ? CloudOff : RefreshCw;
  const title = showOffline ? "Offline mode active" : "Syncing queued changes";
  const description = showOffline
    ? queuedCount > 0
      ? `${queuedCount} change${queuedCount === 1 ? "" : "s"} saved locally and ready to sync when the network returns.`
      : "Cached data is available, and new supported changes will queue automatically until you reconnect."
    : `${queuedCount} queued change${queuedCount === 1 ? "" : "s"} are syncing in the background.`;

  const dismissible = showSyncing && !wasOffline;

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full border-b border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 backdrop-blur-md shadow-sm"
    >
      <div className="mx-auto flex max-w-[2400px] items-start gap-3 px-4 py-2.5 sm:px-6">
        <div className="mt-0.5 shrink-0 rounded-full bg-amber-500/15 p-1.5 text-amber-600 dark:text-amber-400">
          <Icon className={`h-3.5 w-3.5 ${showSyncing ? "animate-spin" : ""}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-tight">{title}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-amber-700/80 dark:text-amber-300/80">
            {description}
          </p>
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="shrink-0 rounded-md p-1 text-amber-700/70 hover:bg-amber-500/20 hover:text-amber-800 dark:text-amber-300/70 dark:hover:text-amber-200"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
