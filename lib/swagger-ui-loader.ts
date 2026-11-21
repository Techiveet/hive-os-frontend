import { useEffect, useState } from "react";
import { getBackendOrigin, getTenantHeaders } from "@/lib/runtime-context";

/**
 * Shared local asset loader for the vendored Swagger UI v5 distribution.
 *
 * Serving Swagger UI scripts and stylesheets from `/vendor/swagger-ui/` avoids
 * external CDN supply-chain dependencies and enables a strict CSP without
 * third-party script hosts.
 */

export const SWAGGER_CSS_ID = "swagger-ui-dist-css";
export const SWAGGER_CSS_HREF = "/vendor/swagger-ui/swagger-ui.css";
export const SWAGGER_BUNDLE_SRC = "/vendor/swagger-ui/swagger-ui-bundle.js";
export const SWAGGER_PRESET_SRC = "/vendor/swagger-ui/swagger-ui-standalone-preset.js";

/**
 * Ensures the vendored Swagger UI stylesheet is attached to `document.head` once.
 */
export function ensureSwaggerCss(): void {
  if (document.getElementById(SWAGGER_CSS_ID)) {
    return;
  }

  const link = document.createElement("link");
  link.id = SWAGGER_CSS_ID;
  link.rel = "stylesheet";
  link.href = SWAGGER_CSS_HREF;
  document.head.appendChild(link);
}

/**
 * Dynamically loads a same-origin script once and resolves when ready.
 */
export function loadSwaggerScript(src: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => {
        script.remove();
        reject(new Error(`Failed to load ${src}`));
      },
      { once: true },
    );
    document.body.appendChild(script);
  });
}

/**
 * Ensures Swagger UI CSS, bundle, and standalone preset scripts are loaded in order.
 */
export async function loadSwaggerUiAssets(): Promise<void> {
  ensureSwaggerCss();
  await loadSwaggerScript(SWAGGER_BUNDLE_SRC);
  await loadSwaggerScript(SWAGGER_PRESET_SRC);
}

/**
 * Resolves the browser-facing backend origin after mount so SSR HTML (which uses
 * container-internal env vars) never mismatches the hydrated client tree.
 */
export function useClientBackendOrigin(): string {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(getBackendOrigin());
  }, []);

  return origin;
}

export type SwaggerRequestConfig = {
  mode: "central" | "tenant";
  token: string;
  tenant: string;
  tenantSignature: string;
};

type SwaggerRequest = { url?: string; headers?: Record<string, string> };

const CREDENTIAL_HEADERS = ["Authorization", "X-Tenant", "X-Tenant-Signature"] as const;

/**
 * True only when a Swagger "Try it out" request targets the Hive backend.
 * Specs can declare other servers, and a user can type any URL, so the
 * bearer token and tenant headers must never follow a request elsewhere.
 */
export function isBackendRequest(url: string | undefined, backendOrigin: string): boolean {
  if (!url || !backendOrigin) return false;

  try {
    const expected = new URL(backendOrigin).origin;
    return new URL(url, expected).origin === expected;
  } catch {
    return false;
  }
}

/**
 * Swagger UI requestInterceptor body shared by both API docs pages: attaches
 * the bearer token and (in tenant mode) signed tenant headers to backend
 * requests only, and strips them from anything else.
 */
export function applySwaggerRequestCredentials<T extends SwaggerRequest>(
  request: T,
  backendOrigin: string,
  config: SwaggerRequestConfig,
): T {
  const headers: Record<string, string> = { ...(request.headers || {}) };

  for (const header of CREDENTIAL_HEADERS) {
    delete headers[header];
  }

  if (isBackendRequest(request.url, backendOrigin)) {
    if (config.token) {
      headers.Authorization = `Bearer ${config.token}`;
    }

    const tenantHeaders = config.mode === "tenant"
      ? getTenantHeaders({
          tenantOverride: config.tenant || null,
          signatureOverride: config.tenantSignature || null,
          allowUnsigned: !config.token,
        })
      : {};

    if (tenantHeaders["X-Tenant"]) {
      headers["X-Tenant"] = tenantHeaders["X-Tenant"];
    }
    if (tenantHeaders["X-Tenant-Signature"]) {
      headers["X-Tenant-Signature"] = tenantHeaders["X-Tenant-Signature"];
    }
  }

  request.headers = headers;
  return request;
}
