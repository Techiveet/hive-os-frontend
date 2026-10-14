import { QueryClient } from "@tanstack/react-query";

const BROWSER_CACHE_RETENTION_MS = 24 * 60 * 60 * 1000;

/** Create an isolated cache; never share a server cache between tenant requests. */
export function createQueryClient(
  runtime: "server" | "browser" = typeof window === "undefined" ? "server" : "browser",
): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        // A finite SSR gcTime creates timers retaining each completed request's
        // cache. Infinity disables those timers so normal GC can reclaim the
        // request. Preserve the browser's 24-hour offline-cache behavior.
        gcTime: runtime === "server" ? Infinity : BROWSER_CACHE_RETENTION_MS,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: false,
        networkMode: "online",
      },
      mutations: {
        retry: false,
        // Offline mutations still reach the existing axios queue interceptor.
        networkMode: "always",
      },
    },
  });
}
