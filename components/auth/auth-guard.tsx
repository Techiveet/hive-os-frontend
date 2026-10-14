"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSystemSettings } from "@/components/providers/settings-provider";
import { handleAuthFailureResponse, logoutHiveSession, markUserSessionFresh } from "@/lib/auth-sync";
import { canAccessDashboardPath } from "@/lib/dashboard-access";
import { isLmsOnlyUser, readStoredUser } from "@/lib/home-path";
import {
  getAccessToken,
  getBackendApiRoot,
  getTenantHeaders,
  isTenantSession,
} from "@/lib/runtime-context";
import { Button } from "@/components/ui/button";
import { FullScreenPlaceholder } from "@/components/ui/loading-states";
import { safeLocalStorageSetItem, safeSessionStorageSetItem } from "@/lib/safe-storage";

/**
 * How stale the verified session may get before a navigation re-checks it with
 * the server in the background. Role, subscription and password changes made
 * server-side are still picked up — just without blocking the screen.
 */
const REVALIDATE_AFTER_MS = 60_000;

type SessionUser = Record<string, any> | null;

/** A /user response the server refused, with the message to show for it. */
class SessionCheckError extends Error {}

/**
 * Where this user must be sent instead of `pathname`, or null when they may
 * stay. Pure — the same rules the guard has always enforced, now applied
 * instantly on navigation from the already-verified session.
 */
function redirectFor(user: SessionUser, pathname: string): string | null {
  if (!user) return null;

  if (user.must_change_password) {
    return "/change-password";
  }

  // On an LMS tenant the ERP dashboard belongs to the Super Admin alone.
  // Everyone else works in the course-site interface, so a /dashboard URL —
  // bookmarked, or linked from older navigation — lands them on their own
  // surface instead of a workspace they were never meant to see.
  if (isLmsOnlyUser(user) && pathname.startsWith("/dashboard")) {
    return "/learn";
  }

  const subscriptionStatus = String(user?.module_access?.subscription_status ?? "active");
  const subscriptionAllowsAccess = ["active", "trial", "grace_period"].includes(subscriptionStatus);
  const isBillingWorkspace = pathname.startsWith("/dashboard/subscriptions");

  if (isTenantSession() && !subscriptionAllowsAccess && !isBillingWorkspace) {
    return "/dashboard/subscriptions";
  }

  if (
    pathname.startsWith("/dashboard") &&
    pathname !== "/dashboard/subscription-required" &&
    !canAccessDashboardPath(pathname, user)
  ) {
    return `/dashboard/subscription-required?from=${encodeURIComponent(pathname)}`;
  }

  return null;
}

/**
 * Session gate for the dashboard and learning surfaces.
 *
 * The session is verified against the server with a full-screen check ONCE,
 * when the surface mounts. It used to re-run that check on every pathname
 * change: each module click unmounted the entire dashboard behind a
 * "Verifying session integrity" screen until /user answered, then rebuilt the
 * sidebar, topbar and page from nothing — that, not the module itself, was
 * most of the wait when opening any page. Navigation now applies the access
 * rules immediately from the verified session and refreshes it in the
 * background when it is older than REVALIDATE_AFTER_MS.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading: settingsLoading } = useSystemSettings();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sessionUser, setSessionUser] = useState<SessionUser>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  // Bumped by "Try again" so the validation effect re-runs without a full
  // reload — the guard used to fail closed onto a dead end with no way out.
  const [retryToken, setRetryToken] = useState(0);

  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const verifiedAtRef = useRef(0);
  const refreshingRef = useRef(false);

  /** GET /user. Returns the user, null after an auth failure was handled, or throws. */
  const fetchSessionUser = useCallback(async (token: string): Promise<SessionUser | "auth_failed"> => {
    const endpoint = isTenantSession() ? "/tenant/user" : "/user";
    const response = await fetch(`${getBackendApiRoot()}${endpoint}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...getTenantHeaders(),
      },
    });

    if (await handleAuthFailureResponse(response)) {
      return "auth_failed";
    }

    if (!response.ok) {
      throw new SessionCheckError(
        response.status === 403
          ? "Your account is signed in but is not authorized to open this workspace. Contact your administrator."
          : `The server could not verify this session (HTTP ${response.status}). Check your connection and refresh the page.`,
      );
    }

    const freshUser = await response.json();
    safeLocalStorageSetItem("hive_user", JSON.stringify(freshUser));
    window.dispatchEvent(new Event("hive_security_cleared"));
    window.dispatchEvent(new Event("hive_session_changed"));
    verifiedAtRef.current = Date.now();
    markUserSessionFresh();

    return freshUser;
  }, []);

  // ── Initial verification (and "Try again"): blocking, full-screen. ──────
  useEffect(() => {
    let isMounted = true;
    setCheckingAuth(true);
    setSessionUser(null);
    setAuthError(null);

    const validateSession = async () => {
      const token = getAccessToken();

      if (!token) {
        if (!isMounted) return;
        if (pathnameRef.current !== "/sign-in") {
          router.replace("/sign-in");
        }
        setCheckingAuth(false);
        return;
      }

      // Decided before the refresh call, from the session already on hand, so
      // a failed or slow /user refresh can never let an LMS learner into the
      // ERP dashboard, and there is no flash of dashboard while it is in
      // flight. The post-refresh rules still run, to catch a role that
      // changed server-side.
      if (pathnameRef.current.startsWith("/dashboard") && isLmsOnlyUser(readStoredUser())) {
        router.replace("/learn");
        if (isMounted) setCheckingAuth(false);
        return;
      }

      try {
        const freshUser = await fetchSessionUser(token);
        if (!isMounted) return;

        if (freshUser !== "auth_failed") {
          setSessionUser(freshUser);
        }
        setCheckingAuth(false);
      } catch (error) {
        if (!isMounted) return;
        console.error("Session verification failed", error);
        setAuthError(
          error instanceof SessionCheckError
            ? error.message
            : "The application could not securely verify this session. Check your connection and refresh the page.",
        );
        setCheckingAuth(false);
      }
    };

    validateSession();

    return () => {
      isMounted = false;
    };
  }, [router, retryToken, fetchSessionUser]);

  const redirectTarget = redirectFor(sessionUser, pathname);

  // ── Navigation: enforce rules instantly; refresh the session in the background. ──
  useEffect(() => {
    if (checkingAuth || !sessionUser) return;

    if (redirectTarget) {
      if (redirectTarget === "/dashboard/subscriptions") {
        // Lets the billing page send them back once the subscription is fixed.
        safeSessionStorageSetItem("hive_billing_locked_from", pathname);
      }
      router.replace(redirectTarget);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      // Signed out in another tab, or the token was revoked locally.
      router.replace("/sign-in");
      return;
    }

    if (refreshingRef.current || Date.now() - verifiedAtRef.current < REVALIDATE_AFTER_MS) {
      return;
    }

    refreshingRef.current = true;
    fetchSessionUser(token)
      .then((freshUser) => {
        if (freshUser && freshUser !== "auth_failed") setSessionUser(freshUser);
      })
      .catch((error) => {
        // A transient failure must not eject someone mid-task; the next
        // navigation retries. Real auth failures are handled above.
        console.warn("Background session refresh failed", error);
      })
      .finally(() => {
        refreshingRef.current = false;
      });
  }, [pathname, checkingAuth, sessionUser, redirectTarget, router, fetchSessionUser]);

  if (checkingAuth || settingsLoading) {
    return (
      <FullScreenPlaceholder
        label="Verifying session integrity"
        detail="Checking your token, tenant context, and secure dashboard access."
      />
    );
  }

  if (authError) {
    return (
      <FullScreenPlaceholder
        tone="error"
        label="Unable to verify session"
        detail={authError}
        actions={
          <>
            <Button onClick={() => setRetryToken((value) => value + 1)}>
              Try again
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                await logoutHiveSession();
                router.replace("/sign-in");
              }}
            >
              Sign out
            </Button>
          </>
        }
      />
    );
  }

  // Not verified, or this path is about to be redirected away: render nothing
  // rather than flash a page the user may not open.
  if (!sessionUser || redirectTarget) return null;

  return <>{children}</>;
}
