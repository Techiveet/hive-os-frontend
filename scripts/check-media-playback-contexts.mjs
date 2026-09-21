import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const COMPILER_OPTIONS = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2022,
};

const compile = (file) =>
  ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: COMPILER_OPTIONS,
  }).outputText;

/*
 * runtime-context.ts imports its sibling modules by the "@/..." alias. The
 * sandbox had no `require`, so the moment the file grew its first import
 * (@/lib/safe-storage) this whole check died with "require is not defined"
 * before asserting anything - a green `npm run verify:media` that verified
 * nothing. This resolves the alias against the repo root and runs the real
 * dependency in the same sandbox, so the check keeps exercising real code.
 */
const moduleCache = new Map();

const sandboxRequire = (specifier) => {
  if (!specifier.startsWith("@/")) {
    throw new Error(`Unexpected import "${specifier}" in the runtime-context sandbox.`);
  }

  const resolved = path.resolve(specifier.slice(2) + ".ts");

  if (moduleCache.has(resolved)) {
    return moduleCache.get(resolved).exports;
  }

  const dependency = { exports: {} };
  moduleCache.set(resolved, dependency);

  // Run in the one shared context, temporarily pointing module/exports at this
  // dependency. Every module must see the same live `window`, because the
  // assertions below swap it between cases via setWindow().
  const outerModule = sandbox.module;
  const outerExports = sandbox.exports;

  sandbox.module = dependency;
  sandbox.exports = dependency.exports;

  try {
    vm.runInContext(compile(resolved), context, {
      filename: path.basename(resolved).replace(/\.ts$/, ".js"),
    });
  } finally {
    sandbox.module = outerModule;
    sandbox.exports = outerExports;
  }

  return dependency.exports;
};

const transpiled = compile("lib/runtime-context.ts");

const module = { exports: {} };
const requests = [];

const makeStorage = (values) => ({
  getItem: (key) => values[key] ?? null,
  setItem: (key, value) => {
    values[key] = String(value);
  },
  removeItem: (key) => {
    delete values[key];
  },
});

const sandbox = {
  module,
  exports: module.exports,
  URL,
  URLSearchParams,
  Map,
  Date,
  process: {
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:8085/api/v1",
      NEXT_PUBLIC_ROOT_DOMAIN: "gulfingot.com",
    },
  },
  fetch: async (url, options = {}) => {
    requests.push({ url, options });
    const tenant = options.headers?.["X-Tenant"];
    const expiresAt = Math.floor(Date.now() / 1000) + 300;
    const context = tenant || "central";

    return {
      ok: true,
      status: 200,
      json: async () => ({
        url: `http://localhost:8085/api/v1/media/stream/7?tenant=${context}&uid=1&exp=${expiresAt}&sig=signed-${context}`,
        expires_at: expiresAt,
      }),
    };
  },
  window: undefined,
  localStorage: undefined,
  console,
};

sandbox.require = sandboxRequire;
sandbox.globalThis = sandbox;

const context = vm.createContext(sandbox);

vm.runInContext(transpiled, context, { filename: "runtime-context.js" });
const runtime = module.exports;

const setWindow = (hostname, values) => {
  const localStorage = makeStorage(values);
  sandbox.window = {
    location: {
      hostname,
      protocol: "http:",
      origin: `http://${hostname}:3000`,
    },
    localStorage,
  };
  sandbox.localStorage = localStorage;
};

setWindow("localhost", {
  hive_context: "central",
  hive_token: "central-token",
});

const centralLegacyUrl = runtime.getStreamUrl(
  "http://localhost:8085/api/v1/files/7/serve",
);
const centralLegacyParams = new URL(centralLegacyUrl).searchParams;
assert.equal(centralLegacyParams.get("token"), "central-token");
assert.equal(centralLegacyParams.has("tenant"), false);

const centralSignedUrl = await runtime.getSignedMediaStreamUrl(
  "http://localhost:8085/api/v1/files/7/serve",
);
assert.equal(new URL(centralSignedUrl).searchParams.get("tenant"), "central");
assert.equal(new URL(requests[0].url).hostname, "localhost");
assert.equal(requests[0].options.headers.Authorization, "Bearer central-token");
assert.equal(requests[0].options.headers["X-Tenant"], undefined);
assert.equal(centralSignedUrl.includes("central-token"), false);

setWindow("acme.localhost", {
  hive_context_signature: "host-derived-signature",
  hive_token: "host-derived-token",
});
const hostDerivedUrl = runtime.getStreamUrl(
  "http://acme.localhost:8085/api/v1/files/8/serve",
);
assert.equal(new URL(hostDerivedUrl).searchParams.get("tenant"), "acme");

setWindow("techive.localhost", {
  hive_context: "techive",
  hive_context_signature: "tenant-context-signature",
  hive_token: "tenant-token",
});

const tenantLegacyUrl = runtime.getStreamUrl(
  "http://techive.localhost:8085/api/v1/files/7/serve",
);
const tenantLegacyParams = new URL(tenantLegacyUrl).searchParams;
assert.equal(tenantLegacyParams.get("tenant"), "techive");
assert.equal(tenantLegacyParams.get("signature"), "tenant-context-signature");

const tenantSignedUrl = await runtime.getSignedMediaStreamUrl(
  "http://techive.localhost:8085/api/v1/files/7/serve",
);
assert.equal(new URL(tenantSignedUrl).searchParams.get("tenant"), "techive");
assert.equal(new URL(requests[1].url).hostname, "techive.localhost");
assert.equal(requests[1].options.headers.Authorization, "Bearer tenant-token");
assert.equal(requests[1].options.headers["X-Tenant"], "techive");
assert.equal(
  requests[1].options.headers["X-Tenant-Signature"],
  "tenant-context-signature",
);
assert.equal(tenantSignedUrl.includes("tenant-token"), false);

const reusedTenantSignedUrl = await runtime.getSignedMediaStreamUrl(tenantSignedUrl);
assert.equal(reusedTenantSignedUrl, tenantSignedUrl);
assert.equal(requests.length, 2);

console.log("Media playback context checks passed for central and tenant workspaces.");
