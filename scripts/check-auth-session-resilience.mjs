import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync("lib/auth-sync.ts", "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

const store = new Map();
const fetchCalls = [];
const offlineScopes = [];
let fetchImplementation = async (url, options = {}) => {
  fetchCalls.push({ url, options });
  return { ok: true, status: 200, clone: () => ({ json: async () => ({}) }) };
};
let cacheResetCount = 0;

const safeStorage = {
  safeLocalStorageGetItem: (key) => store.get(key) ?? null,
  safeLocalStorageSetItem: (key, value) => {
    store.set(key, value);
    return true;
  },
  safeLocalStorageRemoveItem: (key) => store.delete(key),
  safeSessionStorageSetItem: (key, value) => {
    store.set(`session:${key}`, value);
    return true;
  },
};

const runtimeContext = {
  getAccessToken: () => store.get("hive_token") ?? null,
  getBackendApiRoot: () => "https://api.hive.test/api/v1",
  getTenantHeaders: (options = {}) => {
    const tenant = options.tenantOverride ?? store.get("hive_context");
    const signature =
      options.signatureOverride ?? store.get("hive_context_signature");

    return tenant && tenant !== "central"
      ? {
          "X-Tenant": tenant,
          ...(signature ? { "X-Tenant-Signature": signature } : {}),
        }
      : {};
  },
  isTenantSession: () => {
    const context = store.get("hive_context");
    return Boolean(context && context !== "central");
  },
};

const module = { exports: {} };
const sandbox = {
  module,
  exports: module.exports,
  console,
  URL,
  AbortController,
  Event,
  fetch: (...args) => fetchImplementation(...args),
  require: (specifier) => {
    if (specifier === "@/lib/safe-storage") return safeStorage;
    if (specifier === "./runtime-context") return runtimeContext;
    if (specifier === "./session-activity") {
      return { clearSessionActivity: () => {} };
    }
    if (specifier === "@/lib/offline/storage") {
      return {
        clearOfflineState: () => {
          offlineScopes.push(store.get("hive_context") ?? "guest");
        },
      };
    }
    if (specifier === "@/lib/offline/query-persistence") {
      return {
        resetQueryCachePersistence: () => {
          cacheResetCount += 1;
        },
      };
    }
    throw new Error(`Unexpected auth-sync dependency: ${specifier}`);
  },
  window: {
    setTimeout,
    clearTimeout,
    dispatchEvent: () => {},
    location: {
      pathname: "/dashboard",
      href: "",
      replace: () => {},
    },
  },
};

vm.runInNewContext(transpiled, sandbox, { filename: "auth-sync.cjs" });

const {
  isPublicEndpoint,
  logoutHiveSession,
  stopImpersonation,
} = module.exports;

assert.equal(isPublicEndpoint("/api/v1/public/brand"), true);
assert.equal(isPublicEndpoint("/api/v1/tenant/public/landing"), true);
assert.equal(isPublicEndpoint("/api/v1/settings/general/runtime"), false);

store.set("hive_token", "borrowed-token");
store.set("hive_context", "tenant-b");
store.set("hive_context_signature", "sig-b");
store.set("hive_original_token", "admin-token");
store.set("hive_original_context", "tenant-a");
store.set("hive_original_context_signature", "sig-a");

const revoked = await logoutHiveSession();
assert.equal(revoked, true);
assert.equal(fetchCalls.length, 2);
assert.equal(fetchCalls[0].options.headers["X-Tenant"], "tenant-b");
assert.equal(fetchCalls[1].options.headers["X-Tenant"], "tenant-a");
assert.equal(store.has("hive_token"), false);
assert.equal(store.has("hive_original_token"), false);
assert.ok(cacheResetCount > 0);

fetchCalls.length = 0;
store.set("hive_token", "offline-token");
fetchImplementation = async () => {
  throw new Error("network unavailable");
};
const revokedOffline = await logoutHiveSession();
assert.equal(revokedOffline, false);
assert.equal(store.has("hive_token"), false);

fetchCalls.length = 0;
offlineScopes.length = 0;
fetchImplementation = async (url, options = {}) => {
  fetchCalls.push({ url, options });
  if (url.includes("/tenant/user")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: 1, roles: ["Super Admin"] }),
    };
  }
  return { ok: true, status: 200 };
};
store.set("hive_token", "borrowed-token");
store.set("hive_user", "{\"id\":2}");
store.set("hive_context", "tenant-b");
store.set("hive_context_signature", "sig-b");
store.set("hive_original_token", "admin-token");
store.set("hive_original_user", "{\"id\":1}");
store.set("hive_original_context", "tenant-a");
store.set("hive_original_context_signature", "sig-a");

await stopImpersonation("/dashboard");

assert.equal(offlineScopes[0], "tenant-b");
assert.equal(store.get("hive_token"), "admin-token");
assert.equal(store.get("hive_context"), "tenant-a");
assert.equal(store.has("hive_original_token"), false);
assert.equal(fetchCalls[0].options.headers["X-Tenant"], "tenant-b");
assert.equal(fetchCalls[1].options.headers["X-Tenant"], "tenant-a");
assert.equal(sandbox.window.location.href, "/dashboard");

console.log("auth session resilience check passed");
