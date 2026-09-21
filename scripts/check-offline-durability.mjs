import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const transpile = (path) =>
  ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

const entries = new Map([
  ["hive_context", "tenant-b"],
  ["hive_user", JSON.stringify({ id: 22 })],
  ["hive:offline:tenant-a:11:mutation-queue:v2", "tenant-a-work"],
  ["hive:offline:tenant-b:22:mutation-queue:v2", "tenant-b-work"],
  ["hive:offline:tenant-b:99:mutation-queue:v2", "other-user-work"],
]);
const localStorage = {
  get length() { return entries.size; },
  key: (index) => [...entries.keys()][index] ?? null,
  getItem: (key) => entries.get(key) ?? null,
  setItem: (key, value) => entries.set(key, value),
  removeItem: (key) => entries.delete(key),
};

const storageModule = { exports: {} };
vm.runInNewContext(transpile("lib/offline/storage.ts"), {
  module: storageModule,
  exports: storageModule.exports,
  window: { localStorage },
}, { filename: "offline-storage.cjs" });

storageModule.exports.clearOfflineState();
assert.equal(entries.has("hive:offline:tenant-b:22:mutation-queue:v2"), false);
assert.equal(entries.get("hive:offline:tenant-a:11:mutation-queue:v2"), "tenant-a-work");
assert.equal(entries.get("hive:offline:tenant-b:99:mutation-queue:v2"), "other-user-work");

const mutationModule = { exports: {} };
const mutationWindow = {
  localStorage: {
    getItem: () => null,
    removeItem: () => {},
  },
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};
vm.runInNewContext(transpile("lib/offline/mutation-queue.ts"), {
  module: mutationModule,
  exports: mutationModule.exports,
  console,
  window: mutationWindow,
  crypto: { randomUUID: () => "queue-id" },
  CustomEvent: class {},
  require: (specifier) => {
    if (specifier === "@/lib/safe-storage") {
      return {
        safeLocalStorageRemoveItem: () => {},
        safeLocalStorageSetItem: () => false,
      };
    }
    if (specifier === "@tanstack/react-query") {
      return { onlineManager: { isOnline: () => false } };
    }
    if (specifier === "@/lib/offline/storage") {
      return {
        getOfflineStorageKey: () => "hive:offline:tenant-b:22:mutation-queue:v2",
        isOfflineStorageKey: () => true,
      };
    }
    if (specifier === "@/lib/offline/url-invalidation") {
      return { getInvalidationKeysForRequest: () => [] };
    }
    throw new Error(`Unexpected mutation queue dependency: ${specifier}`);
  },
}, { filename: "mutation-queue.cjs" });

assert.throws(
  () => mutationModule.exports.enqueueOfflineRequest({
    method: "POST",
    url: "/bookings",
    data: { reference: "durable" },
    params: null,
    headers: {},
    label: "Create booking",
  }),
  (error) => error?.name === "OfflineMutationStorageError",
);
assert.equal(mutationModule.exports.getOfflineQueueLength(), 0);

let indexedDbDeletes = 0;
const quotaError = Object.assign(new Error("quota exceeded"), { name: "QuotaExceededError" });
const indexedDB = {
  open: () => {
    const request = {};
    queueMicrotask(() => {
      request.result = {
        objectStoreNames: { contains: () => true },
        close: () => {},
        transaction: () => {
          const transaction = {
            objectStore: () => ({
              put: () => {
                const putRequest = {};
                queueMicrotask(() => {
                  putRequest.error = quotaError;
                  putRequest.onerror?.();
                });
                return putRequest;
              },
              delete: () => {
                indexedDbDeletes += 1;
                return {};
              },
            }),
          };
          return transaction;
        },
      };
      request.onsuccess?.();
    });
    return request;
  },
};
const uploadModule = { exports: {} };
vm.runInNewContext(transpile("lib/offline/file-upload-queue.ts"), {
  module: uploadModule,
  exports: uploadModule.exports,
  console,
  window: { dispatchEvent: () => {} },
  indexedDB,
  Blob,
  crypto: { randomUUID: () => "upload-id" },
  CustomEvent: class {},
  require: (specifier) => {
    if (specifier === "@tanstack/react-query") {
      return { onlineManager: { isOnline: () => false } };
    }
    if (specifier === "@/lib/runtime-context") {
      return {
        getAuthHeaders: () => ({}),
        getBackendApiRoot: () => "https://api.hive.test/api/v1",
      };
    }
    if (specifier === "@/lib/offline/storage") {
      return { getOfflineStorageKey: () => "hive:offline:tenant-b:22:uploads" };
    }
    throw new Error(`Unexpected upload queue dependency: ${specifier}`);
  },
}, { filename: "file-upload-queue.cjs" });

await assert.rejects(
  uploadModule.exports.enqueueFileUpload({
    file: new Blob(["new upload"]),
    fileName: "new.txt",
    label: "New upload",
  }),
  (error) => error?.name === "UploadQueueFullError",
);
assert.equal(indexedDbDeletes, 0);

console.log("offline durability check passed");
