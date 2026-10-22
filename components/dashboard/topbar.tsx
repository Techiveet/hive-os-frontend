//compnents/dashboard/topbar.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, LogOut, Maximize, Minimize, HelpCircle, VenetianMask, Bell, UserCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MobileSidebar } from "./mobile-sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useTour } from "@/components/providers/tour-provider";
import { useTranslation } from "@/store/use-translation";
import { LanguageSwitcher } from "../layout/language-switcher";
import { GlobalSearch } from "./global-search";
import { TopbarMailIcon } from "./topbar-mail";
import { TopbarNotificationsIcon } from "./topbar-notifications";
import { ChatNotificationIcon } from "./chat-notification-icon";
import {
  getAccessToken,
  getBackendApiRoot,
  getTenantHeaders,
  getWorkspaceScopeKey,
} from "@/lib/runtime-context";
import { handleAuthFailureResponse, isImpersonatingSession, logoutHiveSession, stopImpersonation } from "@/lib/auth-sync";
import { startMasterSystemTour } from "@/lib/master-tour";
import { TourDropdown } from "./tour-dropdown";
import { usePermissions } from "@/hooks/use-permissions";
import { readStoredUser } from "@/lib/home-path";
import { PROFILE_ROUTE_PERMISSIONS } from "@/lib/route-permissions";
import { useAvatarUrl } from "@/hooks/use-avatar-url";

const getApiUrl = () => {
  return getBackendApiRoot();
};

const getTenantAwareEndpoint = (path: string) => {
  const base = getApiUrl();
  return `${base}${path}`;
};

type TopbarUser = {
  name?: string;
  avatar_path?: string | null;
  avatar_url?: string | null;
  updated_at?: string | null;
  avatar_revision?: number;
};

// 🚀 SECURE TOPBAR AVATAR
const SecureTopbarAvatar = ({
  user,
  fallbackInitials,
  canViewProfile,
}: {
  user: TopbarUser | null;
  fallbackInitials: string;
  canViewProfile: boolean;
}) => {
  const avatarUrl = useAvatarUrl(
    canViewProfile ? user : null,
    user?.avatar_revision ?? user?.updated_at ?? 0,
  );

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${user?.name || "Operator"} profile picture`}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <AvatarFallback className="bg-primary text-primary-foreground font-black tracking-widest">
      {fallbackInitials}
    </AvatarFallback>
  );
};

export function DashboardTopbar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [localUser, setLocalUser] = useState<TopbarUser | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const { startTour } = useTour();
  const { t } = useTranslation();
  const { hasAnyPermission } = usePermissions();
  const canViewProfile = hasAnyPermission([...PROFILE_ROUTE_PERMISSIONS]);
  const scopeKey = getWorkspaceScopeKey();
  const [tokenFingerprint, setTokenFingerprint] = useState<string>(() => {
    if (typeof window === "undefined") return "none";
    const t = localStorage.getItem("hive_token");
    return t ? t.slice(-12) : "none";
  });

  const { data: serverUser } = useQuery({
    queryKey: ["authUserProfile", scopeKey, tokenFingerprint],
    queryFn: async () => {
      const activeToken = getAccessToken();
      if (!activeToken) throw new Error("No token");
      const res = await fetch(getTenantAwareEndpoint("/user"), {
        headers: {
          Authorization: `Bearer ${activeToken}`,
          Accept: "application/json",
          ...getTenantHeaders(),
        },
      });
      if (await handleAuthFailureResponse(res)) {
        throw new Error("Session invalidated");
      }
      if (!res.ok) throw new Error("Failed to fetch user data");
      return res.json();
    },
    staleTime: 60000,
    // The auth guard fetched and stored this same /user payload moments before
    // the topbar mounted; start from it instead of requesting it again.
    initialData: () => readStoredUser() ?? undefined,
    initialDataUpdatedAt: () => (readStoredUser() ? Date.now() : 0),
    enabled: canViewProfile && tokenFingerprint !== "none",
  });

  const activeUser = serverUser || localUser;

  useEffect(() => {
    setIsImpersonating(isImpersonatingSession());
    const storedUser = localStorage.getItem("hive_user");
    if (storedUser) {
      try {
        setLocalUser(JSON.parse(storedUser));
      } catch {}
    }

    const handleSessionChange = () => {
      setIsImpersonating(isImpersonatingSession());
      const t = localStorage.getItem("hive_token");
      setTokenFingerprint(t ? t.slice(-12) : "none");
      const u = localStorage.getItem("hive_user");
      if (u) {
        try {
          setLocalUser(JSON.parse(u));
        } catch {
          setLocalUser(null);
        }
      } else {
        setLocalUser(null);
      }
      queryClient.invalidateQueries({ queryKey: ["authUserProfile"] });
    };

    window.addEventListener("hive_session_changed", handleSessionChange);
    window.addEventListener("hive_security_cleared", handleSessionChange);
    const handleFullscreenChange = () =>
      setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("hive_session_changed", handleSessionChange);
      window.removeEventListener("hive_security_cleared", handleSessionChange);
    };
  }, [queryClient]);

  const handleLogout = async () => {
    // Revoke the token server-side before dropping local state; clearing
    // storage alone leaves the bearer token usable outside the browser.
    await logoutHiveSession();
    queryClient.clear();
    router.push("/sign-in");
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .catch((err) => console.error(err));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const triggerMasterTour = async () => {
    await startMasterSystemTour({ startTour, t });
  };

  const userInitials = activeUser?.name
    ? activeUser.name.substring(0, 2).toUpperCase()
    : "OP";

  return (
    <header className="sticky top-0 z-40 mb-4 px-2 sm:px-0">
      <div className="relative rounded-2xl md:rounded-[2rem]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/70 via-background/35 to-transparent rounded-2xl md:rounded-[2rem]" />

        <div className="glass-panel rounded-2xl md:rounded-[2rem] px-3 py-2 md:px-5 md:py-3 backdrop-blur-2xl border border-border/50 bg-card/40 relative z-10 shadow-lg">
          <div className="flex items-center justify-between gap-2 md:gap-3">
            <div className="flex min-w-0 items-center gap-2 md:gap-3">
              <div className="lg:hidden shrink-0 scale-90 sm:scale-100">
                <MobileSidebar />
              </div>
              <div
                id="tour-topbar-search"
                className="hidden lg:flex lg:items-center"
              >
                <GlobalSearch />
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <TourDropdown
                id="tour-topbar-help"
                className="hidden md:flex"
              />

              <div className="flex items-center gap-0.5 sm:gap-1">
                <LanguageSwitcher id="tour-topbar-language" />

                <div id="tour-topbar-theme" className="px-0.5 hidden sm:block">
                  <ThemeToggle />
                </div>

                <Button
                  id="tour-topbar-fullscreen"
                  variant="ghost"
                  aria-label={
                    isFullscreen
                      ? t("global.exit_fullscreen", "Exit full screen")
                      : t("global.enter_fullscreen", "Enter full screen")
                  }
                  className="h-10 w-10 rounded-xl p-0 shrink-0 text-muted-foreground hover:text-foreground hidden sm:flex items-center justify-center transform active:scale-95 transition-transform"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize className="h-5 w-5" />
                  ) : (
                    <Maximize className="h-5 w-5" />
                  )}
                </Button>
              </div>

              {/* Wrappers carry the tour anchors: the icons themselves are shared
                  components, and the tour previously had no target for chat or
                  mail so it jumped straight past them. */}
              <div className="flex items-center gap-0.5 sm:gap-1">
                <span id="tour-topbar-chat" className="flex">
                  <ChatNotificationIcon />
                </span>
                <span id="tour-topbar-notifications" className="flex">
                  <TopbarNotificationsIcon activeUser={activeUser} />
                </span>
                <span id="tour-topbar-mail" className="flex">
                  <TopbarMailIcon activeUser={activeUser} />
                </span>
              </div>

              {isImpersonating && (
                <Button
                  size="sm"
                  onClick={() => stopImpersonation('/dashboard/security')}
                  className="h-9 px-3 rounded-xl bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black shrink-0 hidden sm:inline-flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                  title={t("users.return_to_central", "Return to Central Account")}
                >
                  <VenetianMask className="h-4 w-4 animate-pulse text-amber-500" />
                  <span>{t("users.return_to_central", "Return to Central")}</span>
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    id="tour-topbar-profile"
                    variant="ghost"
                    className="h-10 rounded-xl px-1 sm:px-2 hover:bg-muted/50 transition-colors transform active:scale-95"
                  >
                    <Avatar className="h-8 w-8 border border-border/50 shrink-0 shadow-sm bg-muted flex items-center justify-center overflow-hidden ring-2 ring-transparent transition-all group-hover:ring-primary/20">
                      <SecureTopbarAvatar
                        user={activeUser}
                        fallbackInitials={userInitials}
                        canViewProfile={canViewProfile}
                      />
                    </Avatar>
                    <div className="ml-2 hidden text-left md:block">
                      <div className="text-xs font-bold leading-4 truncate max-w-[100px] lg:max-w-[150px]">
                        {activeUser?.name || "Operator"}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono leading-4 truncate max-w-[100px] lg:max-w-[150px]">
                        {activeUser?.email || "sys@hive.os"}
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 z-[100] rounded-2xl border-border/60 shadow-xl p-2 mt-2"
                >
                  <DropdownMenuLabel className="font-space font-bold">
                    {t("topbar.my_account", "My Account")}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {canViewProfile && (
                    <>
                      <DropdownMenuItem
                        onClick={() => router.push("/dashboard/profile?tab=account")}
                        className="cursor-pointer font-medium rounded-xl mb-1"
                      >
                        <UserCircle className="mr-2 h-4 w-4 text-primary" />
                        {t("topbar.profile_settings", "Profile Settings")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push("/dashboard/profile?tab=notifications")}
                        className="cursor-pointer font-medium rounded-xl mb-1"
                      >
                        <Bell className="mr-2 h-4 w-4 text-sky-500" />
                        {t("topbar.notification_channels", "Notification Channels")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive font-bold cursor-pointer rounded-xl focus:text-destructive focus:bg-destructive/10 mt-1"
                  >
                    <LogOut className="mr-2 h-4 w-4" />{" "}
                    {t("nav.disconnect", "Disconnect Node")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
