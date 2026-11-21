import { headers } from "next/headers";

import { fetchPublicBrandSettings, tenantSlugFromRequest } from "@/lib/seo";

const LESSON_ROWS = ["78%", "62%", "84%", "54%"] as const;
const CHIPS = ["Courses", "Lessons", "Certificates"] as const;
const ACRONYMS = new Set(["lms", "hr", "it", "erp", "ict", "mba", "stem"]);

function prettyName(name?: string | null) {
  if (!name) return "Learning";

  return name
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) =>
      ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function isLmsSlug(slug: string): boolean {
  return slug === "lms-demo" || slug.includes("lms") || slug.includes("academy");
}

/**
 * Pure Server Component root loading boundary.
 *
 * Keeping this file free of `"use client"` imports (like FullScreenPlaceholder /
 * DataTableLoading and LmsPreloader / framer-motion / lms-site) prevents Next.js
 * from serializing ~350 KB of client chunks into the root <LoadingBoundary>
 * <head> preload tags of every public page.
 */
export default async function RootLoading() {
  const requestHeaders = await headers();
  const slug = tenantSlugFromRequest(requestHeaders);

  if (slug && isLmsSlug(slug)) {
    const brand = await fetchPublicBrandSettings(requestHeaders).catch(
      () => ({}) as Awaited<ReturnType<typeof fetchPublicBrandSettings>>,
    );
    const name = prettyName(brand.app_title || slug);

    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[var(--lms-light-bg,#f7f8fb)] text-[var(--lms-navy,#140342)]"
        role="status"
        aria-live="polite"
        aria-label={`Loading ${name}`}
      >
        <div className="relative w-[19rem] overflow-hidden rounded-3xl bg-[var(--lms-surface,#ffffff)] shadow-2xl sm:w-[22rem]">
          <div className="flex h-28 items-center justify-center bg-[var(--lms-lavender,#ebeafe)]">
            <div className="h-11 w-11 animate-bounce rounded-2xl bg-[var(--lms-purple,#6440fb)]/15" />
          </div>
          <div className="flex flex-col gap-4 px-6 py-7">
            {LESSON_ROWS.map((width, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-[var(--lms-purple,#6440fb)] bg-[var(--lms-purple,#6440fb)]/20" />
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--lms-light-3,#eef2f6)]">
                  <div
                    className="h-full animate-pulse rounded-full bg-[var(--lms-purple,#6440fb)]"
                    style={{ width }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative mt-10 flex flex-col items-center px-6 text-center">
          <h1 className="text-[26px] font-bold tracking-tight">{name}</h1>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--lms-muted,#4f547b)]">
            Preparing your courses
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            {CHIPS.map((chip) => (
              <span
                key={chip}
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--lms-muted,#4f547b)]"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-6">
      <div className="pointer-events-none absolute -left-24 top-12 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />

      <div className="relative w-full max-w-3xl rounded-[2rem] border border-border/50 bg-card/70 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <span className="h-6 w-6 animate-pulse rounded-full bg-primary/40" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-primary/80">
              HIVE.OS
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-foreground">
              Preparing HIVE.OS
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Booting the application shell and synchronizing your environment.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.5rem] border border-border/50 bg-background/60 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="h-4 w-28 animate-pulse rounded-full bg-muted" />
                <div className="mt-3 h-8 w-52 animate-pulse rounded-xl bg-muted" />
              </div>
              <div className="h-12 w-12 animate-pulse rounded-2xl bg-muted" />
            </div>
            <div className="mt-6 space-y-3">
              <div className="h-10 w-full animate-pulse rounded-xl bg-muted" />
              <div className="h-10 w-5/6 animate-pulse rounded-xl bg-muted" />
              <div className="h-10 w-4/6 animate-pulse rounded-xl bg-muted" />
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/50 bg-background/60 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">
              Secure Boot
            </p>
            <div className="mt-5 space-y-4">
              {["Session", "Translations", "Branding"].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/50 p-4"
                >
                  <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
                  <div className="flex-1">
                    <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
                    <div className="mt-2 h-3 w-40 animate-pulse rounded-full bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
