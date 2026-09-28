"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Bookmark,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Megaphone,
  MessageSquare,
  Settings,
  Star,
  UserCircle,
  Users,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { logoutHiveSession } from "@/lib/auth-sync";
import { useTheme } from "next-themes";
import { useTranslation } from "@/store/use-translation";
import { LmsAnnouncementBar } from "@/modules/Lms/components/lms-announcement-bar";
import { cn } from "@/lib/utils";
import {
  BrandMark,
  LMS_FONT_HREF,
  LMS_FONT_STACK,
  LMS_TOKENS,
  type LmsBrandSettings,
} from "@/modules/Lms/components/lms-site";

/* ============================================================================
 * Dashboard chrome in the lms2 (Educrat) template style.
 *
 * The template's dashboard pages (dshb-*.html) are static HTML on a bespoke CSS
 * framework (text-17 / y-gap-30 / bg-light-4) driven by jQuery helpers such as
 * data-el-toggle and js-tabs. None of that can be dropped into this app: the
 * class names are not Tailwind, and the scripts would fight React for the DOM.
 * So the template is reproduced here from its design tokens instead — the same
 * approach already used for the public site in lms-site.tsx, which keeps the
 * signed-in experience visually identical to the marketing pages.
 * ==========================================================================*/

/** Card surface used by every panel in the template (rounded-16 + shadow-4). */
export const LMS_CARD =
  "rounded-2xl shadow-[0_6px_24px_rgba(20,3,66,0.06)] [background-color:var(--lms-surface,#fff)]";

/**
 * "assistant" is a teaching assistant: staff, marks work, watches the cohort,
 * but authors nothing. It sits between learner and instructor rather than
 * being folded into either, because the sidebar it needs is different from
 * both — it wants the marking screens without Create Course.
 */
export type LmsDashboardRole = "learner" | "assistant" | "instructor" | "admin";

type NavItem = {
  /** i18n key; `label` is the English fallback. */
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /** Roles that may see the entry. Learners get the study surface only. */
  roles: LmsDashboardRole[];
};

const ALL: LmsDashboardRole[] = ["learner", "assistant", "instructor", "admin"];
const STAFF: LmsDashboardRole[] = ["assistant", "instructor", "admin"];
/** Building and enrolling, as opposed to marking what already exists. */
const AUTHORS: LmsDashboardRole[] = ["instructor", "admin"];

/**
 * Mirrors the template's dashboard sidebar, split by audience. A learner has no
 * business seeing Create Course or Participants, so the same shell serves both
 * without a second layout.
 */
const NAV_ITEMS: NavItem[] = [
  { key: "lms.nav.dashboard", label: "Dashboard", href: "/learn", icon: LayoutDashboard, roles: ALL },
  { key: "lms.nav.my_courses", label: "My Courses", href: "/learn/courses", icon: BookOpen, roles: ALL },
  { key: "lms.nav.bookmarks", label: "Bookmarks", href: "/learn/bookmarks", icon: Bookmark, roles: ALL },
  { key: "lms.nav.grades", label: "Grades", href: "/learn/grades", icon: ListChecks, roles: ALL },
  { key: "lms.nav.calendar", label: "Calendar", href: "/learn/calendar", icon: CalendarDays, roles: ALL },
  { key: "lms.nav.messages", label: "Messages", href: "/learn/messages", icon: MessageSquare, roles: ALL },
  { key: "lms.nav.create_course", label: "Create Course", href: "/learn/manage?tab=courses", icon: FileText, roles: AUTHORS },
  { key: "lms.nav.participants", label: "Participants", href: "/learn/manage?tab=learners", icon: Users, roles: STAFF },
  { key: "lms.nav.assignments", label: "Assignments", href: "/learn/assignments", icon: ClipboardList, roles: ALL },
  // Open to learners as well: the page branches by role, giving students their
  // own assessments and staff the authoring list.
  { key: "lms.nav.quizzes", label: "Quizzes", href: "/learn/quizzes", icon: GraduationCap, roles: ALL },
  // Moderation is a staff job; learners rate a course from its own page.
  { key: "lms.nav.reviews", label: "Reviews", href: "/learn/reviews", icon: Star, roles: STAFF },
  // Writing the strip above the navigation is authoring, not marking.
  { key: "lms.nav.announcements", label: "Announcements", href: "/learn/announcements", icon: Megaphone, roles: AUTHORS },
  { key: "lms.nav.settings", label: "Settings", href: "/learn/settings", icon: Settings, roles: ALL },
];

export function lmsNavForRole(role: LmsDashboardRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

/**
 * Copy lookup for the /learn screens, scoped to the `lms` translation group.
 *
 * Pages call it as lms("page.grades.title", "Grades"): the English text stays
 * inline as the fallback, so a screen still reads correctly on a tenant whose
 * dictionary has not been synced, and the key is what the seeded Amharic
 * (LmsDictionary) attaches to.
 */
export function useLmsCopy(): (
  key: string,
  fallback: string,
  replacements?: Record<string, string | number>,
) => string {
  const { t } = useTranslation();

  return React.useCallback(
    (key: string, fallback: string, replacements?: Record<string, string | number>) =>
      t(`lms.${key}`, fallback, replacements),
    [t],
  );
}

/** Loads DM Sans the same way lms-site.tsx does — a plain link, not next/font,
 *  so the build never reaches out for font files. */
function LmsFont() {
  return <link rel="stylesheet" href={LMS_FONT_HREF} />;
}

export function LmsBreadcrumbs({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mt-2.5">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]">
        {trail.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
            {index > 0 ? (
              <span aria-hidden="true" style={{ color: LMS_TOKENS.muted }}>
                /
              </span>
            ) : null}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="transition hover:underline"
                style={{ color: LMS_TOKENS.muted }}
              >
                {crumb.label}
              </Link>
            ) : (
              <span style={{ color: LMS_TOKENS.navy }}>{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** The template's four headline tiles: label, big number, delta, purple glyph. */
export function LmsStatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  return (
    <div className={cn(LMS_CARD, "flex items-center justify-between px-7 py-8")}>
      <div>
        <div className="text-[15px] font-medium" style={{ color: LMS_TOKENS.muted }}>
          {label}
        </div>
        <div className="mt-5 text-[24px] font-bold leading-none" style={{ color: LMS_TOKENS.navy }}>
          {value}
        </div>
        {hint ? (
          <div className="mt-6 text-[14px] leading-none" style={{ color: LMS_TOKENS.muted }}>
            {hint}
          </div>
        ) : null}
      </div>
      <Icon className="size-10 shrink-0" style={{ color: LMS_TOKENS.purple }} />
    </div>
  );
}

/** Card with the template's titled header rule and padded body. */
export function LmsPanel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn(LMS_CARD, "h-full overflow-hidden", className)}>
      {title ? (
        <header
          className="flex items-center justify-between gap-4 px-7 py-5"
          style={{ borderBottom: `1px solid ${LMS_TOKENS.border}` }}
        >
          <h2 className="text-[17px] font-medium leading-none" style={{ color: LMS_TOKENS.navy }}>
            {title}
          </h2>
          {action}
        </header>
      ) : null}
      <div className={cn("px-7 py-7", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Course/lesson completion bar — purple fill on a light track. */
export function LmsProgressBar({ percent, className }: { percent: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full", className)}
      style={{ backgroundColor: LMS_TOKENS.lavender }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${clamped}%`, backgroundColor: LMS_TOKENS.purple }}
      />
    </div>
  );
}

/**
 * Who is signed in, and the way out.
 *
 * The LMS shell is the entire app for everyone except the tenant Super Admin,
 * so it has to carry the account controls the ERP topbar provides. Without
 * this a learner had no way to sign out at all.
 */
function LmsAccountMenu({ brandName }: { brandName: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [user, setUser] = React.useState<{ name?: string; email?: string } | null>(null);

  // Read after mount, never during render: this component is also rendered on
  // the server, where localStorage does not exist.
  React.useEffect(() => {
    const read = () => {
      try {
        setUser(JSON.parse(window.localStorage.getItem("hive_user") ?? "null"));
      } catch {
        setUser(null);
      }
    };
    read();
    window.addEventListener("hive_session_changed", read);
    return () => window.removeEventListener("hive_session_changed", read);
  }, []);

  const handleLogout = async () => {
    // Revoke the token server-side before dropping local state; clearing
    // storage alone leaves the bearer token usable outside the browser.
    await logoutHiveSession();
    queryClient.clear();
    router.push("/sign-in");
  };

  const label = user?.name || user?.email || brandName;
  const initials =
    (user?.name || user?.email || "")
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition hover:opacity-80"
          aria-label="Account menu"
        >
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
            style={{ backgroundColor: LMS_TOKENS.lavender, color: LMS_TOKENS.purple }}
          >
            {initials}
          </span>
          <span
            className="hidden max-w-[9rem] truncate text-[15px] font-medium sm:block"
            style={{ color: LMS_TOKENS.navy }}
          >
            {label}
          </span>
          <ChevronDown className="hidden size-4 sm:block" style={{ color: LMS_TOKENS.muted }} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <div className="truncate font-medium">{user?.name || "Signed in"}</div>
          {user?.email ? (
            <div className="truncate text-xs font-normal text-muted-foreground">{user.email}</div>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/learn/settings">
            <UserCircle className="mr-2 size-4" />
            {t("topbar.profile_settings", "Profile settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer font-semibold text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut className="mr-2 size-4" />
          {t("nav.disconnect", "Log out")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const { t } = useTranslation();

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3.5 rounded-xl px-5 py-3.5 text-[17px] font-medium transition",
        // The hover ground was a hardcoded #F7F8FB, which stayed near-white
        // over the dark sidebar. It follows the theme now.
        active ? "font-semibold" : "hover:[background-color:var(--lms-light-bg,#F7F8FB)]",
      )}
      style={
        active
          ? { backgroundColor: LMS_TOKENS.lavender, color: LMS_TOKENS.purple }
          : { color: LMS_TOKENS.muted }
      }
    >
      <Icon className="size-5 shrink-0" />
      {t(item.key, item.label)}
    </Link>
  );
}

/**
 * Full dashboard layout: fixed sidebar, sticky header, tinted content well.
 * `role` decides which sidebar entries exist, so learners and teachers share
 * one shell and one visual language.
 */
export function LmsDashboardShell({
  role,
  title,
  subtitle,
  breadcrumbs,
  actions,
  brandSettings,
  brandName = "Learning",
  children,
}: {
  role: LmsDashboardRole;
  title: string;
  subtitle?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  brandSettings?: LmsBrandSettings | null;
  brandName?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const items = React.useMemo(() => lmsNavForRole(role), [role]);

  const isActive = React.useCallback(
    (href: string) => {
      const path = href.split("?")[0];
      // "/learn" prefixes every page in this shell, so it only lights up on an
      // exact match rather than for the whole section.
      if (path === "/learn" || path === "/dashboard/learning-management") {
        return pathname === path;
      }
      return pathname === path || pathname.startsWith(`${path}/`);
    },
    [pathname],
  );

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: LMS_TOKENS.lightBg, fontFamily: LMS_FONT_STACK }}
    >
      <LmsFont />

      {/*
        The same strip the course site carries, reading the learner feed rather
        than the public one. A deadline aimed at people already on a course
        belongs where they actually spend their time, not only on the page they
        saw before signing up.
      */}
      <LmsAnnouncementBar surface="learners" />

      <header
        className="sticky top-0 z-30 [background-color:var(--lms-surface,#fff)]"
        style={{ borderBottom: `1px solid ${LMS_TOKENS.border}` }}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 lg:px-8">
          <Link href="/learn" className="shrink-0">
            {/* The dark logo variant, or the header reads as a dark-on-dark
                smudge once the theme flips. */}
            <BrandMark
              brandSettings={brandSettings}
              fallbackLabel={brandName}
              onDark={resolvedTheme === "dark"}
            />
          </Link>
          <div className="flex items-center gap-2">
            {actions}
            <LanguageSwitcher />
            <ThemeToggle />
            <LmsAccountMenu brandName={brandName} />
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className="hidden w-[280px] shrink-0 [background-color:var(--lms-surface,#fff)] lg:block"
          style={{ borderRight: `1px solid ${LMS_TOKENS.border}`, minHeight: "calc(100vh - 73px)" }}
        >
          <nav className="flex flex-col gap-1 p-5" aria-label="Learning">
            {items.map((item) => (
              <SidebarLink key={item.label} item={item} active={isActive(item.href)} />
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-6 py-8 lg:px-10 lg:py-10">
          <div className="pb-8">
            <h1 className="text-[30px] font-bold leading-tight" style={{ color: LMS_TOKENS.navy }}>
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2.5 text-[15px]" style={{ color: LMS_TOKENS.muted }}>
                {subtitle}
              </p>
            ) : null}
            {breadcrumbs?.length ? <LmsBreadcrumbs trail={breadcrumbs} /> : null}
          </div>

          {children}

          {/* Horizontal scroll guard: wide tables inside panels scroll themselves. */}
          {/*
            The template's footer carried Privacy Policy and Terms of Use links,
            both pointing at /terms — a route this app does not have, so both
            404'd. They are left out until there are real pages to link to;
            add them back here, with their own hrefs, once those exist.

            Every piece of text sets its own colour rather than inheriting: an
            anchor's colour does not inherit reliably through the app's base
            styles, which left these links at #A8AFD0 on a near-white ground
            (2.04:1) in light mode.
          */}
          <footer
            className="mt-10 flex flex-wrap items-center justify-between gap-4 pt-6 text-[13px]"
            style={{ borderTop: `1px solid ${LMS_TOKENS.border}` }}
          >
            <span style={{ color: LMS_TOKENS.muted }}>
              © {new Date().getFullYear()} {brandName}. All rights reserved.
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
