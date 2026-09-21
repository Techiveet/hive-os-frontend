"use client";

import Link from "next/link";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";

import {
  announcementApi,
  type LmsAnnouncementBarItem,
  type LmsAnnouncementVariant,
} from "@/modules/Lms/api/announcements";
import { useTranslation } from "@/store/use-translation";

/**
 * The strip above the navigation.
 *
 * It used to be one hard-coded sentence baked into the landing template. Now it
 * is whatever the tenant has scheduled: several messages rotate through the same
 * space rather than stacking bars down the page, which is how course platforms
 * use it — an enrolment deadline, a new cohort, a discount ending Friday.
 *
 * Dismissal is remembered per announcement, in this browser only. It cannot be
 * server-side without an identity, and the public bar has no signed-in user by
 * definition; and it must be per announcement, or closing this week's promotion
 * would silently hide next week's deadline.
 */

const STORAGE_KEY = "lms_dismissed_announcements";

/** How long each message holds the bar before the next one takes it. */
const ROTATE_MS = 7000;

/**
 * Colour per intent. Deliberately literal hexes rather than the LMS tokens:
 * this sits above the navigation on a dark header, where a token that flips
 * with the theme would leave the bar unreadable half the time.
 */
const VARIANT_STYLES: Record<LmsAnnouncementVariant, { background: string; color: string }> = {
  promo: { background: "#6440FB", color: "#FFFFFF" },
  info: { background: "#2B1C55", color: "#FFFFFF" },
  success: { background: "#04D697", color: "#08301F" },
  warning: { background: "#E59819", color: "#2A1B00" },
};

function readDismissed(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    // A private window, cleared site data, or storage the browser refuses.
    // Showing an announcement twice is a far smaller problem than throwing.
    return [];
  }
}

function remember(id: string) {
  try {
    const next = Array.from(new Set([...readDismissed(), id])).slice(-100);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* Same reasoning as above. */
  }
}

export function LmsAnnouncementBar({
  /** "public" reads the open endpoint; "learners" the one behind auth. */
  surface,
  /** Shown until the first fetch lands, so the header does not jump. */
  fallback,
}: {
  surface: "public" | "learners";
  fallback?: string | null;
}) {
  // Not useLmsCopy: this bar renders on the public site as well, outside the
  // dashboard shell that hook belongs to.
  const { t } = useTranslation();

  const query = useQuery({
    queryKey: ["lms", "announcements", surface],
    queryFn: () => (surface === "public" ? announcementApi.publicList() : announcementApi.mine()),
    staleTime: 5 * 60 * 1000,
    // A bar is decoration; a tenant without the module should not see errors.
    retry: false,
  });

  const [dismissed, setDismissed] = React.useState<string[]>([]);
  const [index, setIndex] = React.useState(0);

  // Read storage after mount: on the server there is no localStorage, and
  // seeding from it during render would mismatch on hydration.
  React.useEffect(() => setDismissed(readDismissed()), []);

  const items: LmsAnnouncementBarItem[] = React.useMemo(
    () => (query.data ?? []).filter((item) => !dismissed.includes(item.id)),
    [query.data, dismissed],
  );

  // Rotate, but only when there is something to rotate between.
  React.useEffect(() => {
    if (items.length < 2) {
      setIndex(0);
      return;
    }

    const id = window.setInterval(
      () => setIndex((current) => (current + 1) % items.length),
      ROTATE_MS,
    );

    return () => window.clearInterval(id);
  }, [items.length]);

  // Keep the pointer in range when one is dismissed out from under it.
  const current = items[Math.min(index, Math.max(items.length - 1, 0))];

  const dismiss = React.useCallback((id: string) => {
    remember(id);
    setDismissed((now) => [...now, id]);
  }, []);

  // Nothing scheduled: fall back to the template's line if there is one, so a
  // tenant that has never written an announcement is not left with a gap.
  if (!current) {
    if (!fallback) return null;

    return (
      <div
        className="px-4 py-2 text-center text-xs font-medium"
        style={VARIANT_STYLES.promo}
      >
        {fallback}
      </div>
    );
  }

  const style = VARIANT_STYLES[current.variant] ?? VARIANT_STYLES.promo;

  return (
    <div className="relative overflow-hidden" style={{ backgroundColor: style.background }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="flex items-center justify-center gap-3 px-10 py-2 text-center"
        >
          <p className="text-xs font-medium sm:text-[13px]" style={{ color: style.color }}>
            {current.message}
          </p>

          {current.link_url ? (
            <Link
              href={current.link_url}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-bold underline-offset-4 hover:underline sm:text-[13px]"
              style={{ color: style.color }}
            >
              {current.link_label || t("lms.admin.announcements.learn_more", "Learn more")}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          ) : null}
        </motion.div>
      </AnimatePresence>

      {current.is_dismissible ? (
        <button
          type="button"
          onClick={() => dismiss(current.id)}
          aria-label={t("lms.admin.announcements.dismiss", "Dismiss announcement")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 opacity-70 transition hover:opacity-100"
          style={{ color: style.color }}
        >
          <X className="size-3.5" />
        </button>
      ) : null}

      {/* Which of several is showing. Only worth drawing when there are several. */}
      {items.length > 1 ? (
        <div className="absolute left-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {items.map((item, position) => (
            <button
              key={item.id}
              type="button"
              aria-label={t(
                "lms.admin.announcements.goto",
                `Show announcement ${position + 1} of ${items.length}`,
                { position: position + 1, total: items.length },
              )}
              aria-current={position === index}
              onClick={() => setIndex(position)}
              className="size-1.5 rounded-full transition"
              style={{
                backgroundColor: style.color,
                opacity: position === index ? 0.95 : 0.35,
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
