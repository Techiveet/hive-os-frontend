"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { GraduationCap, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useTranslation } from "@/store/use-translation";
import { Button } from "@/components/ui/button";
import {
  getBackendApiRoot,
  getBackendStorageUrl,
  getTenantHeaders,
  getWorkspaceScopeKey,
} from "@/lib/runtime-context";
import { cn } from "@/lib/utils";
import { LmsAnnouncementBar } from "@/modules/Lms/components/lms-announcement-bar";

/* ============================================================================
 * Shared design tokens lifted from the lms2 (Educrat) template.
 * Kept in one place so the landing, course list, and course detail pages match.
 * ==========================================================================*/
/*
 * Every value points at a CSS custom property defined in app/globals.css, with
 * the template's own dark palette under `.dark`.
 *
 * These are consumed almost entirely through inline `style`, which CSS cannot
 * override — so hard-coded hex meant the whole LMS stayed white when the rest
 * of the app went dark. Indirecting through variables makes all of it follow
 * the theme without touching the call sites.
 *
 * The literal hex remains as the fallback, so anything rendered outside the
 * document (or before globals.css loads) still gets the light palette rather
 * than an empty colour. Use LMS_HEX where a raw colour is required — an SVG
 * presentation attribute such as `fill` will not accept var().
 */
export const LMS_TOKENS = {
  navy: "var(--lms-navy, #140342)",
  navy2: "var(--lms-navy-2, #1A064F)",
  navyCard: "var(--lms-navy-card, #2B1C63)",
  /** --color-dark-5: the quiz template's dark question header. */
  dark5: "var(--lms-dark-5, #282664)",
  /** --color-light-3: the quiz navigation button ground. */
  light3: "var(--lms-light-3, #EEF2F6)",
  purple: "var(--lms-purple, #6440FB)",
  lavender: "var(--lms-lavender, #EBEAFE)",
  green: "var(--lms-green, #00FF84)",
  greenDark: "var(--lms-green-dark, #04D697)",
  beige: "var(--lms-beige, #FEFBF4)",
  starYellow: "var(--lms-star-yellow, #E59819)",
  muted: "var(--lms-muted, #4F547B)",
  lightBg: "var(--lms-light-bg, #F7F8FB)",
  border: "var(--lms-border, #EDEDED)",
  /** Card/panel ground. White in light, deep navy in dark. */
  surface: "var(--lms-surface, #FFFFFF)",
  /**
   * The brand navy as a *surface*, which does not flip with the theme.
   *
   * `navy` above is the primary text colour and inverts to white in dark mode.
   * The template's navy header, footer and hero are navy in both themes with
   * white text on top, so they need a colour that stays put — using `navy` for
   * those made them white-on-white the moment the theme flipped.
   */
  navySolid: "#140342",
} as const;

/** Raw colours, for the few places var() is not allowed. */
export const LMS_HEX = {
  purple: "#6440FB",
  green: "#00FF84",
} as const;

export const LMS_FONT_STACK =
  '"DM Sans", "DM Sans Fallback", ui-sans-serif, system-ui, sans-serif';
export const LMS_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap";

/**
 * Where a signed-in student lands from the LMS site.
 *
 * This used to point into the ERP dashboard, which meant a learner who signed
 * in from the course site went straight past the LMS interface into the admin
 * workspace — the exact surface they are not supposed to see.
 */
export const LMS_MY_LEARNING_PATH = "/learn/courses";
export const LOGIN_HREF = `/lms-login?redirect=${encodeURIComponent(LMS_MY_LEARNING_PATH)}`;
export const REGISTER_HREF = "/lms-register";
export const COURSES_HREF = "/courses";

export type LmsBrandSettings = {
  app_title?: string | null;
  logo_light?: string | null;
  logo_dark?: string | null;
  primary_color?: string | null;
};

export const normalizeHexColor = (value: string | null | undefined, fallback: string): string => {
  const raw = (value ?? "").trim();
  if (!raw) return fallback;

  const normalized =
    raw.length === 4 ? `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}` : raw;

  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toUpperCase() : fallback;
};

const hexToRgb = (hex: string) => {
  const normalized = normalizeHexColor(hex, LMS_TOKENS.purple).slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

const toLinear = (channel: number) => {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
};

const luminance = (hex: string) => {
  const rgb = hexToRgb(hex);
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
};

const contrastRatio = (first: string, second: string) => {
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (lighter + 0.05) / (darker + 0.05);
};

export const readableTextOn = (background: string) =>
  contrastRatio("#FFFFFF", background) >= 4.5 ? "#FFFFFF" : "#0F172A";

export const blendWithWhite = (hex: string, ratio: number) => {
  const rgb = hexToRgb(hex);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * ratio);
  return `#${[mix(rgb.r), mix(rgb.g), mix(rgb.b)]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
};

export const resolveTemplateImageSrc = (src: string) => {
  const trimmed = (src ?? "").trim();
  if (!trimmed) return src;
  if (
    trimmed.startsWith("/lms2/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }
  return getBackendStorageUrl(trimmed) || trimmed;
};

export function TemplateImage({
  src,
  alt,
  className,
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const resolved = resolveTemplateImageSrc(src);
  return (
    <Image
      src={resolved}
      alt={alt}
      fill
      unoptimized={resolved.startsWith("http") || resolved.startsWith("/lms2/")}
      priority={priority}
      sizes={sizes ?? "(min-width: 1024px) 33vw, 100vw"}
      className={cn("object-cover", className)}
    />
  );
}

/**
 * Star rating for a course.
 *
 * Two things this deliberately does not do: it never draws five filled stars
 * regardless of the score (it used to, so a 3.0 course looked like a 5.0), and
 * it never invents a rating for a course nobody has reviewed — that shows
 * "New" instead, which is the honest thing to tell a prospective learner.
 */
export function Stars({
  rating,
  count,
  className,
}: {
  rating?: string | number | null;
  count?: number | null;
  className?: string;
}) {
  const value = rating === null || rating === undefined || rating === "" ? null : Number(rating);
  const rated = value !== null && Number.isFinite(value) && value > 0;

  if (!rated) {
    return (
      <span className={cn("inline-flex items-center gap-1", className)}>
        <span className="text-sm font-medium" style={{ color: LMS_TOKENS.muted }}>
          New
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      aria-label={`Rated ${value!.toFixed(1)} out of 5${count ? ` from ${count} reviews` : ""}`}
    >
      <span className="text-sm font-bold" style={{ color: LMS_TOKENS.starYellow }}>
        {value!.toFixed(1)}
      </span>
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className="size-3"
            style={{
              color: LMS_TOKENS.starYellow,
              // Only as many stars as the score actually earned.
              fill: index < Math.round(value!) ? "#E59819" : "transparent",
            }}
          />
        ))}
      </span>
      {count ? (
        <span className="text-xs" style={{ color: LMS_TOKENS.muted }}>
          ({count})
        </span>
      ) : null}
    </span>
  );
}

/* Fetch the same public brand settings the landing/homepage use. */
export function useLmsPublicBrand() {
  const workspaceScope = getWorkspaceScopeKey();

  const { data } = useQuery({
    queryKey: ["publicBrandSettings", workspaceScope],
    queryFn: async () => {
      const res = await fetch(`${getBackendApiRoot()}/settings/brand/public`, {
        headers: { Accept: "application/json", ...getTenantHeaders() },
      });
      if (!res.ok) throw new Error("Failed to fetch brand settings");
      return res.json();
    },
    staleTime: 600000,
    retry: 1,
  });

  const brandSettings = (data?.data ?? null) as LmsBrandSettings | null;
  const brandName = brandSettings?.app_title || "Learning Portal";
  const accent = normalizeHexColor(brandSettings?.primary_color, LMS_TOKENS.purple);

  return { brandSettings, brandName, accent };
}

export function BrandMark({
  brandSettings,
  fallbackLabel,
  onDark = false,
}: {
  brandSettings?: LmsBrandSettings | null;
  fallbackLabel: string;
  onDark?: boolean;
}) {
  const [failed, setFailed] = React.useState(false);
  const logoUrl = getBackendStorageUrl(
    onDark
      ? brandSettings?.logo_dark || brandSettings?.logo_light
      : brandSettings?.logo_light || brandSettings?.logo_dark
  );
  const label = brandSettings?.app_title || fallbackLabel;

  React.useEffect(() => {
    setFailed(false);
  }, [logoUrl]);

  if (logoUrl && !failed) {
    return (
      <span className="relative block h-11 w-36">
        <Image
          src={logoUrl}
          alt={`${label} logo`}
          fill
          unoptimized={logoUrl.startsWith("http")}
          sizes="144px"
          className="object-contain object-left"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 text-lg font-bold tracking-tight",
        onDark ? "text-white" : "text-[#140342]"
      )}
    >
      <span
        className="grid size-10 place-items-center rounded-xl text-white"
        style={{ backgroundColor: LMS_TOKENS.purple }}
      >
        <GraduationCap className="size-5" aria-hidden="true" />
      </span>
      <span>{label}</span>
    </span>
  );
}

/**
 * The public site's navigation, shared by every page in the LMS template so a
 * learner sees the same bar on the landing page, the catalogue and a course.
 *
 * Every href is absolute, including the on-page anchors: written as "#faq" they
 * resolved against whatever page you were already on, so from a course page the
 * Categories and FAQ tabs went nowhere.
 */
const NAV_LINKS = [
  { key: "lms.site.nav.home", label: "Home", href: "/" },
  { key: "lms.site.nav.courses", label: "Courses", href: COURSES_HREF },
  { key: "lms.site.nav.categories", label: "Categories", href: "/#categories" },
  { key: "lms.site.nav.instructors", label: "Instructors", href: "/#instructors" },
  { key: "lms.site.nav.faq", label: "FAQ", href: "/#faq" },
];

/**
 * Which tab reads as current. Anchor links only count on the landing page they
 * point into, and /courses stays lit while you are inside a course.
 */
const isNavLinkActive = (href: string, pathname: string): boolean => {
  const [path, hash] = href.split("#");

  // In-page jumps never claim the active tab. Treating them as active lit up
  // Categories, Instructors and FAQ all at once on the landing page, because
  // every one of them points at "/".
  if (hash) return false;

  const target = path || "/";
  if (target === "/") return pathname === "/";
  return pathname === target || pathname.startsWith(`${target}/`);
};

export function LmsSiteHeader({
  brandSettings,
  brandName,
  announcement,
}: {
  brandSettings?: LmsBrandSettings | null;
  brandName: string;
  announcement?: string;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40" style={{ backgroundColor: LMS_TOKENS.navySolid }}>
      {/*
        Whatever the tenant has scheduled, rotating through one strip. The
        template's own line is the fallback, so a tenant that has never written
        an announcement still shows something rather than a gap.
      */}
      <LmsAnnouncementBar surface="public" fallback={announcement} />
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8"
        aria-label="Main"
      >
        <Link
          href="/"
          className="shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF84] focus-visible:ring-offset-2 focus-visible:ring-offset-[#140342]"
        >
          <BrandMark brandSettings={brandSettings} fallbackLabel={brandName} onDark />
        </Link>
        <div className="hidden items-center gap-8 text-[15px] font-medium text-white/85 lg:flex">
          {NAV_LINKS.map((link) => {
            const active = isNavLinkActive(link.href, pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative py-1 transition hover:text-[#00FF84]",
                  active && "text-white",
                )}
              >
                {t(link.key, link.label)}
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full"
                    style={{ backgroundColor: LMS_TOKENS.green }}
                  />
                ) : null}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-2.5">
          {/* The header sits on navy in both themes, so these are forced to the
              light-on-dark treatment rather than the app's default chrome. */}
          <div className="flex items-center gap-1 text-white [&_button]:text-white/85 [&_button:hover]:bg-white/10 [&_button:hover]:text-white">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <Button
            asChild
            variant="ghost"
            className="hidden h-11 rounded-lg px-5 text-[15px] font-medium text-white hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            <Link href={LOGIN_HREF}>Log in</Link>
          </Button>
          <Button
            asChild
            className="h-11 rounded-lg bg-white px-6 text-[15px] font-medium text-[#140342] shadow-none transition hover:bg-[#00FF84] hover:text-[#140342]"
          >
            <Link href={REGISTER_HREF}>Sign up</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}

export function LmsSiteFooter({
  brandSettings,
  brandName,
}: {
  brandSettings?: LmsBrandSettings | null;
  brandName: string;
}) {
  const { t } = useTranslation();

  return (
    <footer style={{ backgroundColor: LMS_TOKENS.navySolid }} className="text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 border-b border-white/10 py-10 md:flex-row">
          <BrandMark brandSettings={brandSettings} fallbackLabel={brandName} onDark />
          <nav
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/70"
            aria-label="Footer"
          >
            {/* Driven by the same NAV_LINKS as the header, so the two can no
                longer drift apart. */}
            {NAV_LINKS.filter((link) => link.href !== "/").map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-white">
                {t(link.key, link.label)}
              </Link>
            ))}
            <Link href={LOGIN_HREF} className="transition hover:text-white">
              {t("lms.site.nav.login", "Log in")}
            </Link>
          </nav>
        </div>
        <div className="flex flex-col items-center justify-between gap-3 py-6 text-sm text-white/50 md:flex-row">
          <p>© {new Date().getFullYear()} {brandName}. All rights reserved.</p>
          <p>Powered by the {brandName} learning portal.</p>
        </div>
      </div>
    </footer>
  );
}
