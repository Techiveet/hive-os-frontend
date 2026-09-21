"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSystemSettings } from "@/components/providers/settings-provider";
import { handleAuthFailureResponse, logoutHiveSession } from "@/lib/auth-sync";
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

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading: settingsLoading } = useSystemSettings();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  // Bumped by "Try again" so the validation effect re-runs without a full
  // reload — the guard used to fail closed onto a dead end with no way out.
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setCheckingAuth(true);
    setIsAuthorized(false);
    setAuthError(null);

    const validateSession = async () => {
      const token = getAccessToken();

      if (!token) {
        if (!isMounted) return;
        setIsAuthorized(false);

        if (pathname !== "/sign-in") {
          router.replace("/sign-in");
        }

        setCheckingAuth(false);
        return;
      }

      // Decided before the refresh call, from the session already on hand.
      //
      // This check used to live inside the `response.ok` branch below, which
      // meant a failed or slow /user refresh let an LMS learner straight into
      // the ERP dashboard — the guard's own catch marks the session authorized.
      // Doing it here makes the redirect deterministic and removes the flash of
      // dashboard while the refresh is in flight. The post-refresh check still
      // runs, to catch a role that changed server-side.
      if (pathname.startsWith("/dashboard") && isLmsOnlyUser(readStoredUser())) {
        router.replace("/learn");
        if (isMounted) {
          setIsAuthorized(false);
          setCheckingAuth(false);
        }
        return;
      }

      try {
        const endpoint = isTenantSession() ? "/tenant/user" : "/user";

        const response = await fetch(`${getBackendApiRoot()}${endpoint}`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            ...getTenantHeaders(),
          },
        });

        if (await handleAuthFailureResponse(response)) {
          if (isMounted) {
            setIsAuthorized(false);
            setCheckingAuth(false);
          }
          return;
        }

        if (response.ok) {
          const freshUser = await response.json();
          safeLocalStorageSetItem("hive_user", JSON.stringify(freshUser));
          window.dispatchEvent(new Event("hive_security_cleared"));
          window.dispatchEvent(new Event("hive_session_changed"));
          if (freshUser?.must_change_password) {
            router.replace("/change-password");
            if (isMounted) {
              setIsAuthorized(false);
              setCheckingAuth(false);
            }
            return;
          }


          // On an LMS tenant the ERP dashboard belongs to the Super Admin
          // alone. Everyone else works in the course-site interface, so a
          // /dashboard URL — bookmarked, or linked from older navigation —
          // lands them on their own surface instead of a workspace they were
          // never meant to see.
          if (isLmsOnlyUser(freshUser) && pathname.startsWith("/dashboard")) {
            router.replace("/learn");
            if (isMounted) {
              setIsAuthorized(false);
              setCheckingAuth(false);
            }
            return;
          }

          const subscriptionStatus = String(freshUser?.module_access?.subscription_status ?? "active");
          const subscriptionAllowsAccess = ["active", "trial", "grace_period"].includes(subscriptionStatus);
          const isBillingWorkspace = pathname.startsWith("/dashboard/subscriptions");

          if (isTenantSession() && !subscriptionAllowsAccess && !isBillingWorkspace) {
            safeSessionStorageSetItem("hive_billing_locked_from", pathname);
            router.replace("/dashboard/subscriptions");
            if (isMounted) {
              setIsAuthorized(false);
              setCheckingAuth(false);
            }
            return;
          }

          if (
            pathname.startsWith("/dashboard") &&
            pathname !== "/dashboard/subscription-required" &&
            !canAccessDashboardPath(pathname, freshUser)
          ) {
            router.replace(
              `/dashboard/subscription-required?from=${encodeURIComponent(pathname)}`,
            );
            if (isMounted) {
              setIsAuthorized(false);
              setCheckingAuth(false);
            }
            return;
          }
        } else {
          if (!isMounted) return;
          setIsAuthorized(false);
          setAuthError(
            response.status === 403
              ? "Your account is signed in but is not authorized to open this workspace. Contact your administrator."
              : `The server could not verify this session (HTTP ${response.status}). Check your connection and refresh the page.`,
          );
          setCheckingAuth(false);
          return;
        }

        if (!isMounted) return;

        setIsAuthorized(true);
        setCheckingAuth(false);
      } catch (error) {
        if (!isMounted) return;
        console.error("Session verification failed", error);
        setIsAuthorized(false);
        setAuthError(
          "The application could not securely verify this session. Check your connection and refresh the page.",
        );
        setCheckingAuth(false);
      }
    };

    validateSession();

    return () => {
      isMounted = false;
    };
  }, [router, pathname, retryToken]);

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

  if (!isAuthorized) return null;

  return <>{children}</>;
}
