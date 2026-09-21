"use client";

import {
  dehydrate,
  hydrate,
  type DehydratedState,
  type QueryClient,
} from "@tanstack/react-query";

import { getOfflineStorageKey } from "@/lib/offline/storage";
import {
  isQuotaExceededError,
  safeLocalStorageGetItem,
  safeLocalStorageRemoveItem,
} from "@/lib/safe-storage";

const QUERY_CACHE_NAMESPACE = "query-cache:v1";
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

/*
 * localStorage is ~5MB for the whole origin, shared with the session, the
 * queued offline mutations and the pending uploads. Dehydrating the entire
 * query cache unbounded ate all of it on a busy workspace — Firefox then threw
 * NS_ERROR_DOM_QUOTA_REACHED on the next write from anywhere in the app.
 *
 * So the snapshot gets a budget. Queries are kept newest-first until the budget
 * is spent and the rest are simply left out: this cache is an optimisation, and
 * a partial one is worth more than none.
 */
const INITIAL_BUDGET_BYTES = 1_500_000;
const MIN_BUDGET_BYTES = 64_000;

let budgetBytes = INITIAL_BUDGET_BYTES;
let persistenceDisabled = false;

type PersistedQueryCache = {
  persistedAt: number;
  state: DehydratedState;
};

const getQueryCacheStorageKey = (): string => getOfflineStorageKey(QUERY_CACHE_NAMESPACE);

export const restorePersistedQueryCache = (queryClient: QueryClient): void => {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = getQueryCacheStorageKey();
  const rawValue = safeLocalStorageGetItem(storageKey);

  if (!rawValue) {
    return;
  }

  try {
    const parsed = JSON.parse(rawValue) as PersistedQueryCache;
    if (!parsed.persistedAt || Date.now() - parsed.persistedAt > MAX_CACHE_AGE_MS) {
      safeLocalStorageRemoveItem(storageKey);
      return;
    }

    // Strip any previously-persisted product detail queries (they are now excluded
    // from persistence, but old snapshots might still contain them).
    if (parsed.state?.queries) {
      parsed.state.queries = parsed.state.queries.filter((q) => {
        const key = q.queryKey;
        return !(
          Array.isArray(key) &&
          key[0] === "inventory" &&
          key[1] === "products" &&
          key[2] === "detail"
        );
      });
    }

    hydrate(queryClient, parsed.state);
  } catch {
    safeLocalStorageRemoveItem(storageKey);
  }
};

/** Serialized size of one dehydrated query, in bytes (2 bytes per UTF-16 unit
 * is close enough to rank and budget by, and avoids a TextEncoder allocation
 * on every cache notification). */
const measureBytes = (value: unknown): number => {
  try {
    return JSON.stringify(value).length * 2;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
};

/** Called on sign-in/sign-out: the next session deserves a clean budget rather
 * than inheriting a shrunken or disabled one from the previous user. */
export const resetQueryCachePersistence = (): void => {
  budgetBytes = INITIAL_BUDGET_BYTES;
  persistenceDisabled = false;
};

const persistQueryCache = (queryClient: QueryClient): void => {
  if (typeof window === "undefined") {
    return;
  }

  if (persistenceDisabled) {
    return;
  }

  const state = dehydrate(queryClient, {
    shouldDehydrateQuery: (query) => {
      if (query.state.status !== "success") return false;
      // Do not persist mutable per-record detail queries — they must always
      // be fetched fresh so edits (e.g. currency, prices) are never masked by
      // a stale localStorage snapshot.
      const key = query.queryKey;
      if (
        Array.isArray(key) &&
        key[0] === "inventory" &&
        key[1] === "products" &&
        key[2] === "detail"
      ) {
        return false;
      }
      return true;
    },
    shouldDehydrateMutation: () => false,
  });

  const storageKey = getQueryCacheStorageKey();
  if (state.queries.length === 0) {
    safeLocalStorageRemoveItem(storageKey);
    return;
  }

  // Newest first, so what survives the budget is what the user just looked at.
  const ranked = [...state.queries].sort(
    (a, b) => (b.state?.dataUpdatedAt ?? 0) - (a.state?.dataUpdatedAt ?? 0),
  );

  const kept: DehydratedState["queries"] = [];
  let usedBytes = 0;

  for (const query of ranked) {
    const size = measureBytes(query);
    // One oversized query must not evict everything behind it, so skip it and
    // keep walking rather than breaking out of the loop.
    if (usedBytes + size > budgetBytes) continue;
    kept.push(query);
    usedBytes += size;
  }

  if (kept.length === 0) {
    safeLocalStorageRemoveItem(storageKey);
    return;
  }

  const payload: PersistedQueryCache = {
    persistedAt: Date.now(),
    state: { ...state, queries: kept },
  };

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch (error) {
    // This snapshot is optional. Remove only it — never purge queued offline
    // mutations or uploads for space — then try again next time with a smaller
    // budget instead of giving up on caching for the whole page lifetime.
    safeLocalStorageRemoveItem(storageKey);

    if (isQuotaExceededError(error) && budgetBytes > MIN_BUDGET_BYTES) {
      budgetBytes = Math.max(MIN_BUDGET_BYTES, Math.floor(budgetBytes / 2));
      console.warn(
        `Offline query cache shrunk to ${budgetBytes} bytes after a storage quota error.`,
      );
      return;
    }

    persistenceDisabled = true;
    console.warn(
      isQuotaExceededError(error)
        ? "Offline query cache disabled because browser storage is full."
        : "Offline query cache disabled because browser storage is unavailable.",
      error,
    );
  }
};

export const subscribeToPersistedQueryCache = (queryClient: QueryClient): (() => void) => {
  let timeoutId: number | null = null;

  const schedulePersist = () => {
    if (typeof window === "undefined") {
      return;
    }

    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
      persistQueryCache(queryClient);
    }, 250);
  };

  const unsubscribeQueryCache = queryClient.getQueryCache().subscribe(schedulePersist);
  const unsubscribeMutationCache = queryClient.getMutationCache().subscribe(schedulePersist);

  return () => {
    if (timeoutId !== null && typeof window !== "undefined") {
      window.clearTimeout(timeoutId);
    }

    unsubscribeQueryCache();
    unsubscribeMutationCache();
  };
};
