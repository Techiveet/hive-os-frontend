import { getBackendApiRoot } from "@/lib/runtime-context";

export type TenantAvailabilityStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "reserved"
  | "invalid"
  | "error";

export type TenantAvailabilityResult = {
  status: TenantAvailabilityStatus;
  available: boolean;
  message: string;
};

const TENANT_SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/;

export const RESERVED_TENANT_SLUGS = new Set([
  "admin",
  "administrator",
  "root",
  "system",
  "sysadmin",
  "support",
  "help",
  "billing",
  "checkout",
  "payment",
  "payments",
  "api",
  "app",
  "apps",
  "auth",
  "login",
  "signin",
  "signup",
  "register",
  "logout",
  "oauth",
  "sso",
  "cdn",
  "static",
  "assets",
  "media",
  "files",
  "storage",
  "www",
  "mail",
  "smtp",
  "imap",
  "pop",
  "ftp",
  "ssh",
  "vpn",
  "dns",
  "ns1",
  "ns2",
  "mx",
  "status",
  "health",
  "metrics",
  "grafana",
  "prometheus",
  "horizon",
  "telescope",
  "central",
  "portal",
  "dashboard",
  "console",
  "panel",
  "docs",
  "swagger",
  "openapi",
  "staging",
  "prod",
  "production",
  "dev",
  "development",
  "test",
  "testing",
  "sandbox",
  "localhost",
  "hive",
  "hive-os",
  "owner",
  "superadmin",
  "security",
  "abuse",
  "postmaster",
  "webmaster",
  "hostmaster",
  "noreply",
  "no-reply",
]);

/**
 * Mirrors `ReservedTenantIds::isValidFormat()` on the backend: 3-20 chars,
 * lowercase alphanumerics with single internal hyphens. IDNA/punycode labels
 * (`xn--...`) and any `--` run are rejected because they enable homograph /
 * lookalike workspace spoofing.
 */
export function isValidTenantSlug(slug: string): boolean {
  const normalized = slug.trim().toLowerCase();
  return (
    TENANT_SLUG_REGEX.test(normalized) &&
    !/^xn--/.test(normalized) &&
    !normalized.includes("--")
  );
}

export function isReservedTenantId(slug: string): boolean {
  return RESERVED_TENANT_SLUGS.has(slug.trim().toLowerCase());
}

export function sanitizeTenantSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20)
    .replace(/^-+|-+$/g, "");
}

/**
 * Checks tenant workspace slug availability against `/api/v1/check-tenant/{id}`,
 * distinguishing registered, reserved platform subdomains, and format errors.
 */
export async function checkTenantAvailability(
  rawSlug: string,
  signal?: AbortSignal,
): Promise<TenantAvailabilityResult> {
  const slug = rawSlug.trim().toLowerCase();

  if (!slug) {
    return { status: "idle", available: false, message: "" };
  }

  if (!isValidTenantSlug(slug)) {
    return {
      status: "invalid",
      available: false,
      message: "Use 3 to 20 lowercase letters, numbers, or single hyphens.",
    };
  }

  if (isReservedTenantId(slug)) {
    return {
      status: "reserved",
      available: false,
      message: "This workspace ID is reserved for platform use.",
    };
  }

  const res = await fetch(`${getBackendApiRoot()}/check-tenant/${encodeURIComponent(slug)}`, {
    signal,
  });

  const payload = (await res.json().catch(() => null)) as {
    valid?: boolean;
    available?: boolean;
    reserved?: boolean;
    status?: string;
    message?: string;
  } | null;

  if (payload?.status === "reserved" || payload?.reserved === true) {
    return {
      status: "reserved",
      available: false,
      message: payload?.message || "This workspace ID is reserved for platform use.",
    };
  }

  if (payload?.status === "invalid" || res.status === 422) {
    return {
      status: "invalid",
      available: false,
      message: payload?.message || "Use 3 to 20 lowercase letters, numbers, or hyphens.",
    };
  }

  if (payload?.status === "taken") {
    return {
      status: "taken",
      available: false,
      message: payload?.message || "This workspace ID is already taken. Choose another name.",
    };
  }

  if (payload?.status === "available" || payload?.available === true) {
    return {
      status: "available",
      available: true,
      message: payload?.message || "Workspace ID is available.",
    };
  }

  if (res.status === 200 && payload !== null && (payload.valid === true || payload.available === false)) {
    return {
      status: "taken",
      available: false,
      message: payload.message || "This workspace ID is already taken. Choose another name.",
    };
  }

  if (res.status === 404 && payload !== null && payload.valid === false) {
    return {
      status: "available",
      available: true,
      message: payload.message || "Workspace ID is available.",
    };
  }

  return {
    status: "error",
    available: false,
    message: "Unable to verify workspace availability right now.",
  };
}
