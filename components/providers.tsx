"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useTranslation } from "@/store/use-translation";
import { createQueryClient } from "@/lib/query-client";
import {
  restorePersistedQueryCache,
  subscribeToPersistedQueryCache,
} from "@/lib/offline/query-persistence";

// Code-split offline runtime (Axios interceptors, IndexedDB upload queue, and
// ERP offline mutation handlers) so the public landing page does not download
// or evaluate dashboard-only offline plumbing on initial load.
const OfflineRuntime = dynamic(
  () => import("@/components/providers/offline-runtime").then((m) => m.OfflineRuntime),
  { ssr: false, loading: () => null },
);
const OfflineStatusBanner = dynamic(
  () => import("@/components/offline/offline-status-banner").then((m) => m.OfflineStatusBanner),
  { ssr: false, loading: () => null },
);
const OfflineQueueInspector = dynamic(
  () => import("@/components/offline/queue-inspector").then((m) => m.OfflineQueueInspector),
  { ssr: false, loading: () => null },
);

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const [isRestored, setIsRestored] = useState(false);
  const { initLocale } = useTranslation();
  const pathname = usePathname() ?? "";
  const isPublicLanding = pathname === "/";

  useEffect(() => {
    initLocale();
  }, [initLocale]);

  useEffect(() => {
    if (isPublicLanding) {
      setIsRestored(true);
      return;
    }
    restorePersistedQueryCache(queryClient);
    setIsRestored(true);
  }, [queryClient, isPublicLanding]);

  useEffect(() => {
    if (!isRestored || isPublicLanding) {
      return;
    }

    return subscribeToPersistedQueryCache(queryClient);
  }, [queryClient, isRestored, isPublicLanding]);

  useEffect(() => {
    const handleSessionCleared = () => {
      queryClient.clear();
    };

    const handleSessionChanged = () => {
      // Re-hydrate the persisted cache for the new user/context so they
      // don't briefly see the previous session's cached rows.
      restorePersistedQueryCache(queryClient);
    };

    window.addEventListener("hive_session_cleared", handleSessionCleared);
    window.addEventListener("hive_session_changed", handleSessionChanged);
    return () => {
      window.removeEventListener("hive_session_cleared", handleSessionCleared);
      window.removeEventListener("hive_session_changed", handleSessionChanged);
    };
  }, [queryClient]);

  const isEmbedFrame = pathname.startsWith("/embed/");
  const showOfflineRuntime = !isPublicLanding && !isEmbedFrame;
  const showQueueInspector = pathname.startsWith("/dashboard");

  return (
    <QueryClientProvider client={queryClient}>
      {showOfflineRuntime && <OfflineRuntime />}

      {showOfflineRuntime && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex flex-col">
          <div className="pointer-events-auto">
            <OfflineStatusBanner />
          </div>
        </div>
      )}

      {showQueueInspector && <OfflineQueueInspector />}

      {children}
    </QueryClientProvider>
  );
}
