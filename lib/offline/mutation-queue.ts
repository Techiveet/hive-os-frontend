"use client";

import {
  onlineManager,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import { getOfflineStorageKey, isOfflineStorageKey } from "@/lib/offline/storage";
import { getInvalidationKeysForRequest } from "@/lib/offline/url-invalidation";

const MUTATION_QUEUE_NAMESPACE = "mutation-queue:v2";
const QUEUE_EVENT_NAME = "hive_offline_queue_change";
const QUEUE_RESULT_EVENT_NAME = "hive_offline_queue_result";

const subscribers = new Set<() => void>();
const mutationRegistry = new Map<string, OfflineMutationDefinition<unknown, unknown>>();
const EMPTY_OFFLINE_QUEUE: OfflineQueueItem[] = [];

let isProcessingQueue = false;
let cachedQueueStorageKey: string | null = null;
let cachedQueueRawValue: string | null = null;
let cachedQueueSnapshot: OfflineQueueItem[] = EMPTY_OFFLINE_QUEUE;
let inFlightOfflineManagedRequest = 0;

export type OfflineQueuedMutationResult = {
  __offlineQueued: true;
  queueId: string;
  label: string;
};

export type OfflineMutationDefinition<TVariables = unknown, TResult = unknown> = {
  key: string;
  label: string;
  execute: (variables: TVariables) => Promise<TResult>;
  invalidateKeys?:
    | QueryKey[]
    | ((variables: TVariables, result: TResult) => QueryKey[]);
};

type OfflineMutationQueueItem = {
  kind: "mutation";
  id: string;
  key: string;
  label: string;
  variables: unknown;
  createdAt: string;
};

export type OfflineRequestQueueItem = {
  kind: "request";
  id: string;
  method: string;
  url: string;
  data: unknown;
  params: unknown;
  headers: Record<string, string>;
  label: string;
  createdAt: string;
};

export type OfflineQueueItem = OfflineMutationQueueItem | OfflineRequestQueueItem;

export type OfflineQueueResult =
  | { type: "queued"; id: string; label: string; url?: string }
  | { type: "processed"; id: string; label: string; url?: string }
  | { type: "dropped"; id: string; label: string; reason: string; url?: string };

const getQueueStorageKey = (): string => getOfflineStorageKey(MUTATION_QUEUE_NAMESPACE);

const emitQueueChange = (): void => {
  subscribers.forEach((listener) => listener());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(QUEUE_EVENT_NAME));
  }
};

const emitQueueResult = (result: OfflineQueueResult): void => {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(QUEUE_RESULT_EVENT_NAME, { detail: result }));
};

export const isOfflineMutationQueuedResult = (
  value: unknown,
): value is OfflineQueuedMutationResult => {
  if (!value || typeof value !== "object") {
    return false;
  }
  return (value as OfflineQueuedMutationResult).__offlineQueued === true;
};

const normalizeQueueItem = (raw: unknown): OfflineQueueItem | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;

  if (record.kind === "request") {
    if (typeof record.method !== "string" || typeof record.url !== "string") {
      return null;
    }
    return {
      kind: "request",
      id: String(record.id ?? ""),
      method: record.method,
      url: record.url,
      data: record.data,
      params: record.params,
      headers:
        record.headers && typeof record.headers === "object"
          ? (record.headers as Record<string, string>)
          : {},
      label: typeof record.label === "string" ? record.label : "queued change",
      createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
    };
  }

  // Treat anything else as a legacy mutation item (kind === "mutation" or undefined).
  if (typeof record.key !== "string") {
    return null;
  }

  return {
    kind: "mutation",
    id: String(record.id ?? ""),
    key: record.key,
    label: typeof record.label === "string" ? record.label : "queued change",
    variables: record.variables,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
  };
};

export const readOfflineMutationQueue = (): OfflineQueueItem[] => {
  if (typeof window === "undefined") {
    return EMPTY_OFFLINE_QUEUE;
  }

  const storageKey = getQueueStorageKey();
  const rawValue = window.localStorage.getItem(storageKey);

  if (cachedQueueStorageKey === storageKey && cachedQueueRawValue === rawValue) {
    return cachedQueueSnapshot;
  }

  cachedQueueStorageKey = storageKey;
  cachedQueueRawValue = rawValue;

  if (!rawValue) {
    cachedQueueSnapshot = EMPTY_OFFLINE_QUEUE;
    return cachedQueueSnapshot;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown[];
    if (!Array.isArray(parsed)) {
      cachedQueueSnapshot = EMPTY_OFFLINE_QUEUE;
      return cachedQueueSnapshot;
    }
    const normalized = parsed
      .map((entry) => normalizeQueueItem(entry))
      .filter((entry): entry is OfflineQueueItem => entry !== null);
    cachedQueueSnapshot = normalized;
    return cachedQueueSnapshot;
  } catch {
    cachedQueueSnapshot = EMPTY_OFFLINE_QUEUE;
    return cachedQueueSnapshot;
  }
};

export const getEmptyOfflineMutationQueue = (): OfflineQueueItem[] =>
  EMPTY_OFFLINE_QUEUE;

const writeOfflineMutationQueue = (queue: OfflineQueueItem[]): void => {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = getQueueStorageKey();
  const normalizedQueue =
    queue.length === 0 ? EMPTY_OFFLINE_QUEUE : [...queue];

  if (normalizedQueue.length === 0) {
    window.localStorage.removeItem(storageKey);
  } else {
    window.localStorage.setItem(storageKey, JSON.stringify(normalizedQueue));
  }

  cachedQueueStorageKey = storageKey;
  cachedQueueRawValue = normalizedQueue.length === 0 ? null : JSON.stringify(normalizedQueue);
  cachedQueueSnapshot = normalizedQueue;

  emitQueueChange();
};

export const subscribeOfflineMutationQueue = (listener: () => void): (() => void) => {
  subscribers.add(listener);

  if (typeof window === "undefined") {
    return () => {
      subscribers.delete(listener);
    };
  }

  const handleStorage = (event: StorageEvent) => {
    if (isOfflineStorageKey(event.key) && event.key?.endsWith(MUTATION_QUEUE_NAMESPACE)) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    subscribers.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
};

export const registerOfflineMutation = <TVariables, TResult>(
  definition: OfflineMutationDefinition<TVariables, TResult>,
): void => {
  mutationRegistry.set(
    definition.key,
    definition as OfflineMutationDefinition<unknown, unknown>,
  );
};

const generateQueueId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const fingerprintMutation = (key: string, variables: unknown): string => {
  try {
    return `${key}::${JSON.stringify(variables ?? null)}`;
  } catch {
    return `${key}::${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
};

const fingerprintRequest = (
  method: string,
  url: string,
  data: unknown,
  params: unknown,
): string => {
  let dataHash = "";
  let paramsHash = "";
  try {
    dataHash = JSON.stringify(data ?? null);
  } catch {
    dataHash = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  try {
    paramsHash = JSON.stringify(params ?? null);
  } catch {
    paramsHash = "";
  }
  return `${method.toUpperCase()}::${url}::${dataHash}::${paramsHash}`;
};

const findExistingFingerprint = (
  queue: OfflineQueueItem[],
  fingerprint: string,
): boolean => {
  for (const item of queue) {
    if (item.kind === "mutation") {
      if (fingerprintMutation(item.key, item.variables) === fingerprint) {
        return true;
      }
    } else if (item.kind === "request") {
      if (
        fingerprintRequest(item.method, item.url, item.data, item.params) === fingerprint
      ) {
        return true;
      }
    }
  }
  return false;
};

export const enqueueOfflineMutation = <TVariables>(
  key: string,
  label: string,
  variables: TVariables,
): OfflineQueuedMutationResult => {
  const queue = [...readOfflineMutationQueue()];
  const fingerprint = fingerprintMutation(key, variables);
  if (findExistingFingerprint(queue, fingerprint)) {
    const existing = queue.find(
      (item) =>
        item.kind === "mutation" &&
        fingerprintMutation(item.key, item.variables) === fingerprint,
    );
    return {
      __offlineQueued: true,
      queueId: existing?.id ?? "duplicate",
      label,
    };
  }

  const queueId = generateQueueId();
  queue.push({
    kind: "mutation",
    id: queueId,
    key,
    label,
    variables,
    createdAt: new Date().toISOString(),
  });

  writeOfflineMutationQueue(queue);

  return {
    __offlineQueued: true,
    queueId,
    label,
  };
};

export const enqueueOfflineRequest = (params: {
  method: string;
  url: string;
  data: unknown;
  params: unknown;
  headers: Record<string, string>;
  label: string;
}): OfflineQueuedMutationResult => {
  const queue = [...readOfflineMutationQueue()];
  const fingerprint = fingerprintRequest(params.method, params.url, params.data, params.params);
  if (findExistingFingerprint(queue, fingerprint)) {
    const existing = queue.find(
      (item) =>
        item.kind === "request" &&
        fingerprintRequest(item.method, item.url, item.data, item.params) === fingerprint,
    );
    return {
      __offlineQueued: true,
      queueId: existing?.id ?? "duplicate",
      label: params.label,
    };
  }

  const queueId = generateQueueId();
  queue.push({
    kind: "request",
    id: queueId,
    method: params.method.toUpperCase(),
    url: params.url,
    data: params.data,
    params: params.params,
    headers: params.headers,
    label: params.label,
    createdAt: new Date().toISOString(),
  });

  writeOfflineMutationQueue(queue);

  return {
    __offlineQueued: true,
    queueId,
    label: params.label,
  };
};

const resolveInvalidationKeys = <TVariables, TResult>(
  definition: OfflineMutationDefinition<TVariables, TResult>,
  variables: TVariables,
  result: TResult,
): QueryKey[] => {
  if (!definition.invalidateKeys) {
    return [];
  }
  return typeof definition.invalidateKeys === "function"
    ? definition.invalidateKeys(variables, result)
    : definition.invalidateKeys;
};

const isLikelyNetworkError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const e = error as {
    code?: string;
    name?: string;
    message?: string;
    response?: { status?: number };
    cause?: unknown;
  };

  // Axios network failure
  if (e.code === "ERR_NETWORK") {
    return true;
  }

  // Native fetch failure (TypeError: Failed to fetch / Load failed)
  if (e instanceof TypeError) {
    return true;
  }
  if (typeof e.name === "string" && e.name === "TypeError") {
    return true;
  }

  // Browsers throw DOMException with name "AbortError" or "NetworkError"
  if (typeof e.name === "string" && (e.name === "AbortError" || e.name === "NetworkError")) {
    return true;
  }

  // No HTTP response at all (server unreachable, DNS failure, CORS preflight, etc.)
  if (!e.response && typeof e.message === "string" && /network|fetch|timeout/i.test(e.message)) {
    return true;
  }

  return false;
};

export const isRetryableQueueError = (error: unknown): boolean => {
  if (isLikelyNetworkError(error)) {
    return true;
  }

  const status = (error as { response?: { status?: number } })?.response?.status;
  if (!status) {
    // Unknown error shape (e.g. a thrown TypeError that wasn't caught above).
    // Treat as NON-retryable so a code bug cannot poison the queue.
    return false;
  }

  return status >= 500 || status === 408 || status === 429;
};

export const isLikelyOfflineMutationError = (error: unknown): boolean => {
  if (!onlineManager.isOnline()) {
    return true;
  }

  if (isLikelyNetworkError(error)) {
    return true;
  }

  // Backward-compat: axios-style errors with no response and ERR_NETWORK
  const maybeError = error as {
    code?: string;
    response?: { status?: number };
  };
  return !maybeError?.response?.status && maybeError?.code === "ERR_NETWORK";
};

const isMutationItem = (
  item: OfflineQueueItem,
): item is OfflineMutationQueueItem => item.kind === "mutation";

const isRequestItem = (
  item: OfflineQueueItem,
): item is OfflineRequestQueueItem => item.kind === "request";

const runMutationItem = async (
  item: OfflineMutationQueueItem,
): Promise<{ invalidationKeys: QueryKey[]; result: unknown }> => {
  const definition = mutationRegistry.get(item.key);
  if (!definition) {
    throw new Error(`No registered definition for offline mutation key: ${item.key}`);
  }
  const result = await definition.execute(item.variables);
  const invalidationKeys = resolveInvalidationKeys(definition, item.variables, result);
  return { invalidationKeys, result };
};

const runRequestItem = async (
  item: OfflineRequestQueueItem,
): Promise<{ invalidationKeys: QueryKey[] }> => {
  const { default: api } = await import("@/modules/shared/api/http");
  await api.request({
    method: item.method,
    url: item.url,
    data: item.data,
    params: item.params,
    headers: item.headers,
  });
  const invalidationKeys = getInvalidationKeysForRequest(item.method, item.url);
  return { invalidationKeys };
};

export const processOfflineMutationQueue = async (
  queryClient: QueryClient,
): Promise<void> => {
  if (typeof window === "undefined" || !onlineManager.isOnline() || isProcessingQueue) {
    return;
  }

  isProcessingQueue = true;

  try {
    let queue = readOfflineMutationQueue();

    while (queue.length > 0 && onlineManager.isOnline()) {
      const currentItem = queue[0]!;

      if (isMutationItem(currentItem)) {
        const definition = mutationRegistry.get(currentItem.key);
        if (!definition) {
          console.warn(
            `Dropping offline mutation "${currentItem.key}" because no definition is registered.`,
          );
          queue = queue.slice(1);
          writeOfflineMutationQueue(queue);
          emitQueueResult({
            type: "dropped",
            id: currentItem.id,
            label: currentItem.label,
            reason: "No definition registered",
          });
          continue;
        }
      }

      try {
        const outcome = isMutationItem(currentItem)
          ? await runMutationItem(currentItem)
          : await runRequestItem(currentItem);

        queue = queue.slice(1);
        writeOfflineMutationQueue(queue);

        if (outcome.invalidationKeys.length > 0) {
          await Promise.all(
            outcome.invalidationKeys.map((queryKey) =>
              queryClient.invalidateQueries({ queryKey }),
            ),
          );
        }

        emitQueueResult({
          type: "processed",
          id: currentItem.id,
          label: currentItem.label,
          url: isRequestItem(currentItem) ? currentItem.url : undefined,
        });
      } catch (error) {
        if (isRetryableQueueError(error)) {
          // Stop processing; keep the head of the queue and try again later.
          break;
        }

        const reason =
          (error as { message?: string })?.message || "Unrecoverable error";
        console.error("Dropping unrecoverable offline mutation.", error);
        queue = queue.slice(1);
        writeOfflineMutationQueue(queue);
        emitQueueResult({
          type: "dropped",
          id: currentItem.id,
          label: currentItem.label,
          reason,
          url: isRequestItem(currentItem) ? currentItem.url : undefined,
        });
      }
    }
  } finally {
    isProcessingQueue = false;
  }
};

export const getOfflineQueueLength = (): number =>
  readOfflineMutationQueue().length;

export const clearOfflineQueue = (): void => {
  writeOfflineMutationQueue([]);
};

export const removeOfflineQueueItem = (id: string): boolean => {
  const queue = readOfflineMutationQueue();
  const next = queue.filter((item) => item.id !== id);
  if (next.length === queue.length) {
    return false;
  }
  writeOfflineMutationQueue(next);
  return true;
};

export const isOfflineManagedRequestInFlight = (): boolean =>
  inFlightOfflineManagedRequest > 0;

export const markOfflineManagedRequest = (): (() => void) => {
  inFlightOfflineManagedRequest += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    inFlightOfflineManagedRequest = Math.max(0, inFlightOfflineManagedRequest - 1);
  };
};
