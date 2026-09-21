"use client";

import Link from "next/link";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Clock3, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { bookmarkApi, type LmsBookmark } from "@/modules/Lms/api/quizzes";
import { LMS_TOKENS, useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import { LmsDashboardShell, LmsPanel, useLmsCopy } from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";

export default function LearnBookmarksPage() {
  const { brandSettings, brandName } = useLmsPublicBrand();
  const lms = useLmsCopy();
  const { role } = useLmsRole();
  const queryClient = useQueryClient();

  const bookmarks = useQuery({
    queryKey: ["lms", "bookmarks"],
    queryFn: bookmarkApi.list,
  });

  const remove = useMutation({
    mutationFn: (id: string) => bookmarkApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms", "bookmarks"] });
      toast.success("Bookmark removed.");
    },
    onError: () => toast.error("The bookmark could not be removed."),
  });

  const rows: LmsBookmark[] = bookmarks.data ?? [];

  return (
    <LmsDashboardShell
      role={role}
      brandSettings={brandSettings}
      brandName={brandName}
      title={lms("page.bookmarks.title", "Bookmarks")}
      subtitle={lms("page.bookmarks.subtitle", "Courses and lessons you saved to come back to.")}
      breadcrumbs={[{ label: lms("common.dashboard", "Dashboard"), href: "/learn" }, { label: lms("nav.bookmarks", "Bookmarks") }]}
    >
      <LmsPanel title={lms("page.bookmarks.panel", "Saved items")} bodyClassName="px-0 py-0">
        {bookmarks.isPending ? (
          <p className="px-7 py-7" style={{ color: LMS_TOKENS.muted }}>
            Loading bookmarks…
          </p>
        ) : rows.length === 0 ? (
          <div className="px-7 py-12 text-center">
            <Bookmark className="mx-auto size-8" style={{ color: LMS_TOKENS.muted }} />
            <p className="mt-4" style={{ color: LMS_TOKENS.muted }}>
              Nothing saved yet. Use the bookmark button on a lesson to keep it here.
            </p>
            <Button asChild className="mt-5" variant="outline">
              <Link href="/learn/courses">Go to my courses</Link>
            </Button>
          </div>
        ) : (
          <ul>
            {rows.map((bookmark) => {
              const href = bookmark.lesson_id
                ? `/learn/courses/${bookmark.course_id}?lesson=${bookmark.lesson_id}`
                : `/learn/courses/${bookmark.course_id}`;

              return (
                <li
                  key={bookmark.id}
                  className="flex flex-wrap items-center justify-between gap-4 border-b px-7 py-5 last:border-b-0"
                  style={{ borderColor: LMS_TOKENS.border }}
                >
                  <div className="min-w-0">
                    <Link
                      href={href}
                      className="text-[17px] font-medium hover:underline"
                      style={{ color: LMS_TOKENS.navy }}
                    >
                      {bookmark.lesson?.title ?? bookmark.course?.title ?? "Saved item"}
                    </Link>
                    <div className="mt-1.5 flex flex-wrap items-center gap-4 text-[14px]" style={{ color: LMS_TOKENS.muted }}>
                      {bookmark.lesson ? <span>{bookmark.course?.title}</span> : null}
                      {bookmark.course?.category ? <span>{bookmark.course.category}</span> : null}
                      {bookmark.lesson?.duration_minutes ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="size-4" />
                          {bookmark.lesson.duration_minutes} min
                        </span>
                      ) : null}
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[13px]"
                        style={{ backgroundColor: LMS_TOKENS.lavender, color: LMS_TOKENS.purple }}
                      >
                        {bookmark.lesson_id ? "Lesson" : "Course"}
                      </span>
                    </div>
                    {bookmark.note ? (
                      <p className="mt-2 text-[14px]" style={{ color: LMS_TOKENS.muted }}>
                        {bookmark.note}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3">
                    <Button asChild variant="outline" size="sm">
                      <Link href={href}>Open</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove bookmark"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(bookmark.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </LmsPanel>
    </LmsDashboardShell>
  );
}
