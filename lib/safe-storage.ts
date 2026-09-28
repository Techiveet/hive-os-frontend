"use client";

/**
 * Universal safe storage utilities to handle DOM storage quotas gracefully.
 * In Firefox and other browsers, localStorage and sessionStorage have a strict
 * quota (typically 5MB). When accumulated state (e.g. offline queues, large
 * permission catalogs, or cached items) reaches this limit, setItem throws
 * NS_ERROR_DOM_QUOTA_REACHED (QuotaExceededError: The quota has been exceeded).
 *
 * These utilities catch quota errors, automatically purge non-essential cached
 * data, prune bulky structures, and ensure critical login and session state
 * never crashes the application.
 */

const CRITICAL_LOCAL_STORAGE_KEYS = new Set([
  "hive_token",
  "hive_user",
  "hive_context",
  "hive_context_signature",
  "hive_original_token",
  "hive_original_user",
  "hive_original_context",
  "hive_original_context_signature",
  "hive_locale",
  "hive_welcome_tour_completed",
  "hive_tour_completed",
]);

const CRITICAL_SESSION_STORAGE_KEYS = new Set([
  "hive_pending_email",
  "hive_2fa_token",
  "hive_2fa_setup_qr",
  "hive_2fa_setup_secret",
  "hive_password_change_intended",
  "hive_billing_locked_from",
  "hive_eject_reason",
  "hive_post_login_redirect",
]);

/**
 * Offline work that has not reached the server yet. These are not a cache: a
 * queued mutation or a pending upload is the only copy of something the user
 * did, so freeing space by deleting them loses data silently. The disposable
 * React Query snapshot (`query-cache:*`) is deliberately absent — it is
 * regenerated from the network and is the right thing to drop first.
 */
const DURABLE_OFFLINE_KEY_PATTERN = /^hive:offline:.*:(mutation-queue:v\d+|uploads)$/;

export const isDurableOfflineKey = (key: string | null | undefined): boolean =>
  typeof key === "string" && DURABLE_OFFLINE_KEY_PATTERN.test(key);

const isReclaimableLocalKey = (key: string | null | undefined): boolean =>
  typeof key === "string" &&
  !CRITICAL_LOCAL_STORAGE_KEYS.has(key) &&
  !isDurableOfflineKey(key);

export const isQuotaExceededError = (error: unknown): boolean => {
  if (!error) return false;

  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return (
      error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 ||
      error.code === 1014 ||
      /quota/i.test(error.message)
    );
  }

  if (typeof error === "object" && error !== null) {
    const err = error as { name?: string; message?: string; number?: number; code?: number };
    if (
      err.name === "QuotaExceededError" ||
      err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      err.code === 22 ||
      err.code === 1014 ||
      err.number === -2147024882
    ) {
      return true;
    }
    if (typeof err.message === "string" && (/quota/i.test(err.message) || /storage.*exceeded/i.test(err.message))) {
      return true;
    }
  }

  return false;
};

/**
 * Frees space by dropping regenerable caches.
 *
 * Authentication/navigation state and un-synced offline work (queued mutations,
 * pending uploads) are preserved: those cannot be re-fetched, and quota
 * pressure is not a reason to throw a user's unsent edits away.
 */
export const purgeNonEssentialStorage = (): void => {
  if (typeof window === "undefined") return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (isReclaimableLocalKey(key)) {
        keysToRemove.push(key!);
      }
    }
    keysToRemove.forEach((key) => {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    });
  } catch {}

  purgeNonEssentialSessionStorage();
};

/** sessionStorage half of the purge, usable on its own. */
export const purgeNonEssentialSessionStorage = (): void => {
  if (typeof window === "undefined") return;

  try {
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key && !CRITICAL_SESSION_STORAGE_KEYS.has(key)) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach((key) => {
      try {
        window.sessionStorage.removeItem(key);
      } catch {}
    });
  } catch {}
};

/**
 * Prunes non-essential fields from a stored user object to minimize byte footprint.
 */
export const pruneUserPayload = (rawValue: string): string => {
  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") return rawValue;

    const prunedUser = {
      id: parsed.id,
      name: parsed.name,
      email: parsed.email,
      avatar_url: parsed.avatar_url,
      roles: Array.isArray(parsed.roles)
        ? parsed.roles.map((r: any) => (typeof r === "string" ? r : r?.name || r?.id))
        : parsed.roles,
      permissions: Array.isArray(parsed.permissions)
        ? Array.from(new Set(parsed.permissions.map((p: any) => (typeof p === "string" ? p : p?.name || p?.id))))
        : parsed.permissions,
      business_type: parsed.business_type,
      home_path: parsed.home_path,
      must_change_password: parsed.must_change_password,
      has_completed_welcome_tour: parsed.has_completed_welcome_tour,
      two_factor_enabled: parsed.two_factor_enabled,
      central_control_override: parsed.central_control_override,
      module_access: parsed.module_access,
    };

    return JSON.stringify(prunedUser);
  } catch {
    return rawValue;
  }
};

/**
 * Safely writes a key-value pair to localStorage with automatic quota recovery.
 * Never throws QuotaExceededError or DOMException.
 */
export const safeLocalStorageSetItem = (key: string, value: string): boolean => {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (!isQuotaExceededError(error)) {
      // Storage is blocked (private mode, disabled site data). Nothing to
      // reclaim, and purging would delete state that is still readable.
      console.warn(`[Storage] Could not write "${key}": storage unavailable.`, error);
      return false;
    }

    console.warn(
      `[Storage] Quota exceeded writing "${key}". Purging non-essential cache and retrying...`
    );
    purgeNonEssentialStorage();

    try {
      const payloadToStore = key === "hive_user" ? pruneUserPayload(value) : value;
      window.localStorage.setItem(key, payloadToStore);
      return true;
    } catch (retryError) {
      console.warn(`[Storage] Second attempt failed for "${key}". Attempting aggressive recovery...`);

      try {
        if (key === "hive_user") {
          const parsed = JSON.parse(value);
          // Permissions and module access stay in even here. Without them
          // the sidebar renders empty and every route guard denies access, so
          // a transient quota blip looked exactly like a broken account.
          const minimalUser = {
            id: parsed.id,
            name: parsed.name,
            email: parsed.email,
            roles: parsed.roles,
            permissions: parsed.permissions,
            module_access: parsed.module_access,
            business_type: parsed.business_type,
            home_path: parsed.home_path,
            must_change_password: parsed.must_change_password,
          };
          window.localStorage.setItem(key, JSON.stringify(minimalUser));
          return true;
        }
      } catch {}
    }
    return false;
  }
};

/**
 * Safely reads a key from localStorage.
 */
export const safeLocalStorageGetItem = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(key);
    if (!value || value === "undefined" || value === "null") {
      return null;
    }
    return value;
  } catch {
    return null;
  }
};

/**
 * Safely removes a key from localStorage.
 */
export const safeLocalStorageRemoveItem = (key: string): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {}
};

/**
 * Safely writes a key-value pair to sessionStorage with quota recovery.
 * Never throws QuotaExceededError.
 */
export const safeSessionStorageSetItem = (key: string, value: string): boolean => {
  if (typeof window === "undefined") return false;

  try {
    window.sessionStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (!isQuotaExceededError(error)) {
      console.warn(`[Storage] Could not write session key "${key}": storage unavailable.`, error);
      return false;
    }

    // Scoped to sessionStorage: the two quotas are separate, so pressure here
    // is no reason to drop localStorage caches or offline queues.
    console.warn(`[Storage] Session quota exceeded writing "${key}". Purging and retrying...`);
    purgeNonEssentialSessionStorage();
    try {
      window.sessionStorage.setItem(key, value);
      return true;
    } catch {
      console.warn(`[Storage] Could not store sessionStorage key "${key}".`);
    }
    return false;
  }
};

/**
 * Safely reads a key from sessionStorage.
 */
export const safeSessionStorageGetItem = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(key);
    if (!value || value === "undefined" || value === "null") {
      return null;
    }
    return value;
  } catch {
    return null;
  }
};

/**
 * Safely removes a key from sessionStorage.
 */
export const safeSessionStorageRemoveItem = (key: string): void => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {}
};
