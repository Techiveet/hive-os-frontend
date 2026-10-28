"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useOfflineStatus } from "@/hooks/use-offline-status";
import { processOfflineMutationQueue } from "@/lib/offline/mutation-queue";
import {
  processFileUploadQueue,
  refreshUploadQueueCount,
} from "@/lib/offline/file-upload-queue";
import { installAxiosOfflineInterceptor, uninstallAxiosOfflineInterceptor } from "@/lib/offline/axios-offline-interceptor";
import { installFetchOfflineInterceptor, uninstallFetchOfflineInterceptor } from "@/lib/offline/fetch-offline-interceptor";
import { ensureOfflineMutationDefinitionsRegistered } from "@/modules/shared/offline-mutations";
import { OfflineQueueToastListener } from "@/components/offline/offline-queue-toast-listener";

export function OfflineRuntime() {
  const queryClient = useQueryClient();
  const { isOnline } = useOfflineStatus();

  React.useEffect(() => {
    ensureOfflineMutationDefinitionsRegistered();

    const syncUploadQueue = () => {
      void refreshUploadQueueCount();
    };

    syncUploadQueue();

    if (typeof window === "undefined") return;

    window.addEventListener("hive_session_changed", syncUploadQueue);
    return () => window.removeEventListener("hive_session_changed", syncUploadQueue);
  }, []);

  React.useEffect(() => {
    installAxiosOfflineInterceptor();
    installFetchOfflineInterceptor();
    return () => {
      uninstallAxiosOfflineInterceptor();
      uninstallFetchOfflineInterceptor();
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const isDev =
      process.env.NODE_ENV !== "production" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.endsWith(".localhost") ||
      window.location.port === "3000" ||
      window.location.port === "3001";

    // In development mode, service workers interfere with Turbopack/Next.js HMR chunk graph.
    // Cleanly unregister any active service worker and clear caches to guarantee fresh module chunks.
    if (isDev) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const registration of registrations) {
            const worker = registration.active ?? registration.waiting ?? registration.installing;
            if (worker && new URL(worker.scriptURL).pathname === "/sw.js") {
              void registration.unregister();
            }
          }
        })
        .catch(() => {});

      if ("caches" in window) {
        caches
          .keys()
          .then((keys) => {
            for (const key of keys) {
              if (key.startsWith("hive-os-shell-")) void caches.delete(key);
            }
          })
          .catch(() => {});
      }
      return;
    }

    const registerSW = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // Silently catch if running in an unsupported or restricted environment
      }
    };

    if (document.readyState === "complete") {
      void registerSW();
    } else {
      window.addEventListener("load", registerSW);
      return () => window.removeEventListener("load", registerSW);
    }
  }, []);

  React.useEffect(() => {
    if (!isOnline) {
      return;
    }
    void processOfflineMutationQueue(queryClient);
    void processFileUploadQueue(queryClient);
  }, [isOnline, queryClient]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "hidden") return;
      void processOfflineMutationQueue(queryClient);
      void processFileUploadQueue(queryClient);
    };

    const handleOnline = () => {
      void processOfflineMutationQueue(queryClient);
      void processFileUploadQueue(queryClient);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    const initialHandle = window.setTimeout(handleVisibilityOrFocus, 500);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.clearTimeout(initialHandle);
    };
  }, [queryClient]);

  return (
    <>
      <OfflineQueueToastListener />
    </>
  );
}
