import { safeLocalStorageGetItem, safeLocalStorageSetItem, safeLocalStorageRemoveItem, safeSessionStorageSetItem } from "@/lib/safe-storage";
import { getAccessToken, getBackendApiRoot, getTenantHeaders, isTenantSession } from "./runtime-context";
import { clearSessionActivity } from "./session-activity";
import { clearOfflineState } from "@/lib/offline/storage";
import { resetQueryCachePersistence } from "@/lib/offline/query-persistence";

export const isImpersonatingSession = (): boolean => {
  if (typeof window === "undefined") return false;
  return Boolean(safeLocalStorageGetItem("hive_original_token"));
};

const revokeSessionToken = async (
  token: string,
  tenantHeaders: Record<string, string>,
): Promise<boolean> => {
  const abortController = new AbortController();
  const timeoutId = window.setTimeout(() => abortController.abort(), 5000);

  try {
    const response = await fetch(`${getBackendApiRoot()}/logout`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...tenantHeaders,
      },
      keepalive: true,
      signal: abortController.signal,
    });

    return response.ok || response.status === 401;
  } catch (error) {
    console.warn("Could not revoke the server session before local logout", error);
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const logoutHiveSession = async (): Promise<boolean> => {
  if (typeof window === "undefined") return false;

  const token = safeLocalStorageGetItem("hive_token");
  const originalToken = safeLocalStorageGetItem("hive_original_token");
  const originalContext = safeLocalStorageGetItem("hive_original_context");
  const originalSignature = safeLocalStorageGetItem("hive_original_context_signature");
  const revocations: Promise<boolean>[] = [];

  if (token) {
    revocations.push(revokeSessionToken(token, getTenantHeaders()));
  }

  if (originalToken && originalToken !== token) {
    revocations.push(
      revokeSessionToken(
        originalToken,
        originalContext && originalContext !== "central"
          ? getTenantHeaders({
              tenantOverride: originalContext,
              signatureOverride: originalSignature,
            })
          : {},
      ),
    );
  }

  const results = await Promise.all(revocations);
  clearHiveSession();

  return results.length === 0 || results.every(Boolean);
};

export const startImpersonationSession = (impersonationData: {
  token: string;
  user?: any;
  context?: string | null;
  context_signature?: string | null;
}) => {
  if (typeof window === "undefined") return;

  const currentToken = safeLocalStorageGetItem("hive_token");
  const currentUser = safeLocalStorageGetItem("hive_user");
  const currentContext = safeLocalStorageGetItem("hive_context");
  const currentSignature = safeLocalStorageGetItem("hive_context_signature");

  // Save the original super admin session only once (prevent nested overwriting)
  if (currentToken && !safeLocalStorageGetItem("hive_original_token")) {
    safeLocalStorageSetItem("hive_original_token", currentToken);
    if (currentUser) safeLocalStorageSetItem("hive_original_user", currentUser);
    if (currentContext) safeLocalStorageSetItem("hive_original_context", currentContext);
    if (currentSignature) safeLocalStorageSetItem("hive_original_context_signature", currentSignature);
  }

  safeLocalStorageSetItem("hive_token", impersonationData.token);
  if (impersonationData.user) {
    safeLocalStorageSetItem("hive_user", JSON.stringify(impersonationData.user));
  } else {
    safeLocalStorageRemoveItem("hive_user");
  }

  if (impersonationData.context && impersonationData.context !== "central") {
    safeLocalStorageSetItem("hive_context", impersonationData.context);
  } else {
    safeLocalStorageRemoveItem("hive_context");
  }

  if (impersonationData.context_signature && impersonationData.context !== "central") {
    safeLocalStorageSetItem("hive_context_signature", impersonationData.context_signature);
  } else {
    safeLocalStorageRemoveItem("hive_context_signature");
  }

  clearOfflineState();

  window.dispatchEvent(new Event("hive_session_changed"));
  window.dispatchEvent(new Event("hive_security_cleared"));
};

export const stopImpersonation = async (targetRedirectUrl = "/dashboard") => {
  if (typeof window === "undefined") return;

  const originalToken = safeLocalStorageGetItem("hive_original_token");
  const originalUser = safeLocalStorageGetItem("hive_original_user");
  const originalContext = safeLocalStorageGetItem("hive_original_context");
  const originalSignature = safeLocalStorageGetItem("hive_original_context_signature");

  if (originalToken) {
    const impersonationToken = safeLocalStorageGetItem("hive_token");
    if (impersonationToken && impersonationToken !== originalToken) {
      await revokeSessionToken(impersonationToken, getTenantHeaders());
    }

    // Clear the borrowed tenant/user cache while that context is still active.
    // Clearing after restoration targets the administrator's scope instead.
    clearOfflineState();
    resetQueryCachePersistence();

    safeLocalStorageSetItem("hive_token", originalToken);

    if (originalUser) {
      safeLocalStorageSetItem("hive_user", originalUser);
    } else {
      safeLocalStorageRemoveItem("hive_user");
    }

    if (originalContext && originalContext !== "central") {
      safeLocalStorageSetItem("hive_context", originalContext);
    } else {
      safeLocalStorageRemoveItem("hive_context");
    }

    if (originalSignature && originalContext !== "central") {
      safeLocalStorageSetItem("hive_context_signature", originalSignature);
    } else {
      safeLocalStorageRemoveItem("hive_context_signature");
    }

    safeLocalStorageRemoveItem("hive_original_token");
    safeLocalStorageRemoveItem("hive_original_user");
    safeLocalStorageRemoveItem("hive_original_context");
    safeLocalStorageRemoveItem("hive_original_context_signature");

    // Fetch fresh Super Admin profile before redirecting to guarantee complete state restoration
    try {
      const baseUrl = getBackendApiRoot();
      const endpoint = originalContext && originalContext !== "central" ? "/tenant/user" : "/user";
      const headers: Record<string, string> = {
        Accept: "application/json",
        Authorization: `Bearer ${originalToken}`,
      };
      Object.assign(
        headers,
        originalContext && originalContext !== "central"
          ? getTenantHeaders({
              tenantOverride: originalContext,
              signatureOverride: originalSignature,
            })
          : {},
      );
      const res = await fetch(`${baseUrl}${endpoint}?t=${Date.now()}`, { headers });
      if (res.ok) {
        const freshSuperAdmin = await res.json();
        if (freshSuperAdmin) {
          safeLocalStorageSetItem("hive_user", JSON.stringify(freshSuperAdmin));
        }
      }
    } catch (e) {
      console.warn("Could not pre-fetch super admin user on stop impersonation", e);
    }

    window.dispatchEvent(new Event("hive_session_changed"));
    window.dispatchEvent(new Event("hive_security_cleared"));

    window.location.href = targetRedirectUrl;
  }
};

export const clearHiveSession = (ejectReason?: string) => {
  if (typeof window === "undefined") return;

  clearOfflineState();
  resetQueryCachePersistence();
  safeLocalStorageRemoveItem("hive_token");
  safeLocalStorageRemoveItem("hive_user");
  safeLocalStorageRemoveItem("hive_context");
  safeLocalStorageRemoveItem("hive_context_signature");
  safeLocalStorageRemoveItem("hive_original_token");
  safeLocalStorageRemoveItem("hive_original_user");
  safeLocalStorageRemoveItem("hive_original_context");
  safeLocalStorageRemoveItem("hive_original_context_signature");
  clearSessionActivity();
  window.dispatchEvent(new Event("hive_session_cleared"));
  window.dispatchEvent(new Event("hive_session_changed"));

  if (ejectReason) {
    safeSessionStorageSetItem("hive_eject_reason", ejectReason);
  }
};

export const notifySessionChanged = (): void => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("hive_session_changed"));
};

/**
 * Requests that a signed-out visitor is expected to make.
 *
 * Matched on a `public` path segment anywhere, not on a fixed `/api/v1/public/`
 * prefix: the tenant landing page calls `/api/v1/tenant/public/landing`, which
 * the prefix form classified as protected and ejected visitors over.
 */
export const isPublicEndpoint = (url: string): boolean => {
  try {
    const { pathname } = new URL(url, "http://hive.local");
    return pathname.split("/").includes("public");
  } catch {
    return false;
  }
};

export const handleAuthFailureResponse = async (response: Response): Promise<boolean> => {
  /*
   * A 401 only means "this session is finished" if there was a session to
   * finish, and if the request needed one.
   *
   * Without these two guards, a signed-out visitor loading a tenant landing
   * page was ejected to /sign-in the moment any public endpoint answered 401 —
   * the page legitimately calls several, and losing one of them should not
   * look like an expired login.
   */
  if (isPublicEndpoint(response.url) || !getAccessToken()) {
    return false;
  }

  const isUnauthorized = response.status === 401;

  let payload: any = null;

  try {
    payload = await response.clone().json();
  } catch {}

  const message = String(payload?.message || "");
  const code = String(payload?.code || "");
  const isEjected = response.status === 403 && message.includes("CRITICAL:");
  const isTenantContextInvalid = code === "TENANT_CONTEXT_INVALID";
  const isTenantNotFound = response.status === 404 && code === "TENANT_NOT_FOUND" && isTenantSession();

  if (!isUnauthorized && !isEjected && !isTenantContextInvalid && !isTenantNotFound) {
    return false;
  }

  const ejectReason = isEjected
    ? message.replace("CRITICAL: ", "")
    : code === "SESSION_EXPIRED"
      || code === "TENANT_CONTEXT_INVALID"
      || code === "TENANT_CONTEXT_SIGNATURE_INVALID"
      ? message
      : undefined;

  clearHiveSession(ejectReason);

  if (typeof window !== "undefined" && !window.location.pathname.includes("/sign-in")) {
    window.location.replace("/sign-in");
  }

  return true;
};

export const syncUserSession = async () => {
  try {
    if (typeof window === "undefined") return;

    const token = getAccessToken();
    if (!token) return;

    const endpoint = isTenantSession() ? "/tenant/user" : "/user";

    const response = await fetch(
      `${getBackendApiRoot()}${endpoint}?t=${Date.now()}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          ...getTenantHeaders(),
        },
      }
    );

    if (await handleAuthFailureResponse(response)) {
      return;
    }

    if (!response.ok) {
      return;
    }

    const freshUserData = await response.json();
    const localUserStr = safeLocalStorageGetItem("hive_user");

    if (freshUserData) {
      const localUser = localUserStr ? JSON.parse(localUserStr) : {};

      const updatedUser = {
        ...localUser,
        ...freshUserData,
        roles: freshUserData.roles || localUser.roles,
        permissions: freshUserData.permissions || localUser.permissions,
        module_access: freshUserData.module_access || localUser.module_access,
      };

      // 🚀 Save the fresh data and ALWAYS dispatch the event
      safeLocalStorageSetItem("hive_user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("hive_security_cleared"));
    }
  } catch (error) {
    console.error("Failed to sync security session with Hive Control", error);
  }
};
