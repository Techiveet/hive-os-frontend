import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient, dehydrate } from "@tanstack/react-query";
import { restorePersistedQueryCache, subscribeToPersistedQueryCache, resetQueryCachePersistence } from "../lib/offline/query-persistence";
import { getOfflineStorageKey } from "../lib/offline/storage";

test("MFA material never survives offline query persistence or legacy hydration", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  const values = new Map<string, string>([["hive_context", "central"], ["hive_user", JSON.stringify({ id: 77 })]]);
  const localStorage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage, setTimeout: (callback: () => void) => { callback(); return 1; }, clearTimeout: () => {} } });
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  const old = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  let unsubscribe: (() => void) | undefined;
  try {
    resetQueryCachePersistence();
    old.setQueryData(["twoFactorDetails", "central"], { secret: "synthetic-legacy-mfa-fixture", qr_code_url: "synthetic-legacy-qr" });
    old.setQueryData(["ordinary-summary"], { count: 3 });
    const key = getOfflineStorageKey("query-cache:v1");
    const queued = getOfflineStorageKey("mutation-queue:v1");
    values.set(queued, "durable-offline-fixture");
    values.set(key, JSON.stringify({ persistedAt: Date.now(), state: dehydrate(old) }));
    restorePersistedQueryCache(client);
    assert.equal(client.getQueryData(["twoFactorDetails", "central"]), undefined);
    assert.deepEqual(client.getQueryData(["ordinary-summary"]), { count: 3 });
    assert.equal(values.has(key), false);
    assert.equal(values.get(queued), "durable-offline-fixture");
    unsubscribe = subscribeToPersistedQueryCache(client);
    client.setQueryData(["twoFactorDetails", "central"], { secret: "synthetic-new-mfa-fixture" });
    client.setQueryData(["twoFactorStatus", "central"], { secret: "synthetic-rollback-mfa-fixture" });
    client.setQueryData(["ordinary-summary"], { count: 4 });
    const stored = values.get(key)!;
    assert.ok(stored.includes("ordinary-summary"));
    assert.ok(!stored.includes("synthetic-"));
    assert.ok(!stored.includes("twoFactor"));
    assert.equal(values.get(queued), "durable-offline-fixture");
  } finally {
    unsubscribe?.(); client.clear(); old.clear();
    if (original) Object.defineProperty(globalThis, "window", original); else Reflect.deleteProperty(globalThis, "window");
  }
});
