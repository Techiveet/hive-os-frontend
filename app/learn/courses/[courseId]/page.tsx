"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark as BookmarkIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Link2,
  Play,
  Radio,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VideoPlayer } from "@/components/ui/video-player";
import { cn } from "@/lib/utils";
import { getStreamUrl } from "@/lib/runtime-context";
import { bookmarkApi } from "@/modules/Lms/api/quizzes";
import {
  learningApi,
  type LmsEnrollment,
  type LmsLesson,
  type LmsLessonProgress,
} from "@/modules/Lms/api";
import { LMS_HEX, LMS_TOKENS, useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import {
  LMS_CARD,
  LmsDashboardShell,
  LmsPanel,
  LmsProgressBar,
} from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";
import { CourseReviews } from "@/modules/Lms/components/course-reviews";

const LESSON_ICONS = {
  video: Play,
  article: FileText,
  file: FileText,
  link: Link2,
  live: Radio,
  assessment: FileText,
} as const;

function lessonIcon(type: LmsLesson["content_type"]) {
  return LESSON_ICONS[type] ?? FileText;
}

/**
 * The course player, from lesson-single-1.html: the lesson body on the left and
 * a tinted "Course Content" rail on the right that tracks what is finished.
 */
function CoursePlayerContent() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { brandSettings, brandName } = useLmsPublicBrand();
  const { role } = useLmsRole();

  const course = useQuery({
    queryKey: ["lms", "course", courseId],
    queryFn: () => learningApi.getCourse(courseId),
    enabled: Boolean(courseId),
  });

  const myLearning = useQuery({
    queryKey: ["lms", "my-learning"],
    queryFn: learningApi.getMyLearning,
  });

  const enrolment: LmsEnrollment | undefined = (myLearning.data ?? []).find(
    (row) => row.course_id === courseId,
  );

  const lessons: LmsLesson[] = React.useMemo(
    () => [...(course.data?.lessons ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [course.data],
  );

  const progressByLesson = React.useMemo(() => {
    const map = new Map<string, LmsLessonProgress>();
    for (const entry of enrolment?.lesson_progress ?? []) map.set(entry.lesson_id, entry);
    return map;
  }, [enrolment]);

  // The lesson in the URL wins; otherwise resume at the first unfinished one.
  const requested = searchParams.get("lesson");
  const activeLesson: LmsLesson | undefined = React.useMemo(() => {
    if (requested) {
      const match = lessons.find((lesson) => lesson.id === requested);
      if (match) return match;
    }
    return (
      lessons.find((lesson) => progressByLesson.get(lesson.id)?.status !== "completed") ?? lessons[0]
    );
  }, [requested, lessons, progressByLesson]);

  // Pin the resolved lesson in the URL. Without this the choice is re-derived
  // on every render, so finishing the last lesson made "first unfinished" fall
  // through to lesson one and threw the learner back to the start of the course.
  React.useEffect(() => {
    if (requested || !activeLesson) return;
    router.replace(`/learn/courses/${courseId}?lesson=${activeLesson.id}`, { scroll: false });
  }, [requested, activeLesson, courseId, router]);

  const activeIndex = activeLesson ? lessons.findIndex((l) => l.id === activeLesson.id) : -1;
  const previous = activeIndex > 0 ? lessons[activeIndex - 1] : undefined;
  const next = activeIndex >= 0 && activeIndex < lessons.length - 1 ? lessons[activeIndex + 1] : undefined;

  const [search, setSearch] = React.useState("");
  const term = search.trim().toLowerCase();
  const visibleLessons = term
    ? lessons.filter((lesson) => lesson.title.toLowerCase().includes(term))
    : lessons;

  const completedCount = lessons.filter(
    (lesson) => progressByLesson.get(lesson.id)?.status === "completed",
  ).length;

  const goTo = (lessonId: string) =>
    router.replace(`/learn/courses/${courseId}?lesson=${lessonId}`, { scroll: false });

  const bookmarks = useQuery({
    queryKey: ["lms", "bookmarks"],
    queryFn: bookmarkApi.list,
  });

  const activeBookmarked = Boolean(
    activeLesson &&
      (bookmarks.data ?? []).some(
        (entry) => entry.course_id === courseId && entry.lesson_id === activeLesson.id,
      ),
  );

  const toggleBookmark = useMutation({
    mutationFn: (lessonId: string) =>
      bookmarkApi.toggle({ course_id: courseId, lesson_id: lessonId }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["lms", "bookmarks"] });
      toast.success(result.bookmarked ? "Saved to bookmarks." : "Removed from bookmarks.");
    },
    onError: () => toast.error("The bookmark could not be saved."),
  });

  const markProgress = useMutation({
    mutationFn: ({
      lessonId,
      status,
      percent,
    }: {
      lessonId: string;
      status: "in_progress" | "completed";
      percent: number;
    }) => {
      if (!enrolment) throw new Error("You are not enrolled in this course.");
      return learningApi.updateLessonProgress(enrolment.id, lessonId, {
        status,
        progress_percent: percent,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lms", "my-learning"] }),
    onError: (error: unknown) =>
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Your progress could not be saved.",
      ),
  });

  const completeAndAdvance = () => {
    if (!activeLesson) return;
    markProgress.mutate(
      { lessonId: activeLesson.id, status: "completed", percent: 100 },
      {
        onSuccess: () => {
          toast.success("Lesson complete.");
          if (next) goTo(next.id);
        },
      },
    );
  };

  const title = course.data?.title ?? "Course";
  const activeSrc = activeLesson?.resource_url ? getStreamUrl(activeLesson.resource_url) : null;
  const activeStatus = activeLesson ? progressByLesson.get(activeLesson.id)?.status : undefined;

  return (
    <LmsDashboardShell
      role={role}
      brandSettings={brandSettings}
      brandName={brandName}
      title={title}
      subtitle={
        lessons.length
          ? `${completedCount} of ${lessons.length} lessons complete`
          : "This course has no lessons yet."
      }
      breadcrumbs={[
        { label: "Dashboard", href: "/learn" },
        { label: "My Courses", href: "/learn/courses" },
        { label: title },
      ]}
    >
      {course.isPending ? (
        <LmsPanel>
          <p style={{ color: LMS_TOKENS.muted }}>Loading course…</p>
        </LmsPanel>
      ) : !course.data ? (
        <LmsPanel>
          <p style={{ color: LMS_TOKENS.muted }}>This course could not be loaded.</p>
          <Button asChild className="mt-5" variant="outline">
            <Link href="/learn/courses">Back to my courses</Link>
          </Button>
        </LmsPanel>
      ) : (
        <div className="grid gap-7 xl:grid-cols-3">
          {/* ------------------------------ lesson body ----------------------------- */}
          <div className="flex flex-col gap-7 xl:col-span-2">
            <section className={cn(LMS_CARD, "overflow-hidden")}>
              {activeLesson?.content_type === "video" && activeSrc ? (
                <VideoPlayer
                  src={activeSrc}
                  title={activeLesson.title}
                  watermark={brandName}
                  resumeKey={`lms-course:${courseId}:lesson:${activeLesson.id}`}
                  rememberProgress
                  onPrevious={previous ? () => goTo(previous.id) : undefined}
                  onNext={next ? () => goTo(next.id) : undefined}
                  onComplete={() =>
                    activeLesson &&
                    markProgress.mutate({
                      lessonId: activeLesson.id,
                      status: "completed",
                      percent: 100,
                    })
                  }
                />
              ) : (
                <div
                  className="flex h-56 items-center justify-center"
                  style={{ backgroundColor: LMS_TOKENS.lavender }}
                >
                  {activeLesson ? (
                    React.createElement(lessonIcon(activeLesson.content_type), {
                      className: "size-12",
                      style: { color: LMS_TOKENS.purple },
                    })
                  ) : (
                    <FileText className="size-12" style={{ color: LMS_TOKENS.purple }} />
                  )}
                </div>
              )}

              <div className="px-7 py-8 sm:px-10">
                <h2 className="text-[24px] font-bold leading-snug" style={{ color: LMS_TOKENS.navy }}>
                  {activeLesson?.title ?? "No lesson selected"}
                </h2>

                <div className="mt-3 flex flex-wrap items-center gap-5 text-[15px]" style={{ color: LMS_TOKENS.muted }}>
                  {activeLesson ? <span className="capitalize">{activeLesson.content_type}</span> : null}
                  {activeLesson?.duration_minutes ? <span>{activeLesson.duration_minutes} min</span> : null}
                  {activeStatus === "completed" ? (
                    <span className="inline-flex items-center gap-1.5" style={{ color: LMS_TOKENS.greenDark }}>
                      <Check className="size-4" />
                      Completed
                    </span>
                  ) : null}

                  {activeLesson ? (
                    <button
                      type="button"
                      onClick={() => toggleBookmark.mutate(activeLesson.id)}
                      disabled={toggleBookmark.isPending}
                      aria-pressed={activeBookmarked}
                      className="inline-flex items-center gap-1.5 transition hover:opacity-80"
                      style={{ color: activeBookmarked ? LMS_TOKENS.purple : LMS_TOKENS.muted }}
                    >
                      <BookmarkIcon
                        className="size-4"
                        fill={activeBookmarked ? LMS_HEX.purple : "none"}
                      />
                      {activeBookmarked ? "Bookmarked" : "Bookmark"}
                    </button>
                  ) : null}
                </div>

                {activeLesson?.content ? (
                  <>
                    <h3 className="mt-8 text-[18px] font-medium" style={{ color: LMS_TOKENS.navy }}>
                      Description
                    </h3>
                    <p className="mt-3 whitespace-pre-wrap text-[16px] leading-relaxed" style={{ color: LMS_TOKENS.muted }}>
                      {activeLesson.content}
                    </p>
                  </>
                ) : null}

                {activeLesson?.resource_url && activeLesson.content_type !== "video" ? (
                  <a
                    href={activeLesson.resource_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex items-center gap-2 text-[15px] underline"
                    style={{ color: LMS_TOKENS.purple }}
                  >
                    <Link2 className="size-4" />
                    Open lesson resource
                  </a>
                ) : null}

                <div className="mt-9 flex flex-wrap items-center justify-between gap-4">
                  <Button
                    variant="outline"
                    disabled={!previous}
                    onClick={() => previous && goTo(previous.id)}
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </Button>

                  {enrolment && activeLesson && activeStatus !== "completed" ? (
                    <Button
                      disabled={markProgress.isPending}
                      onClick={completeAndAdvance}
                      style={{ backgroundColor: LMS_TOKENS.purple }}
                    >
                      {markProgress.isPending ? "Saving…" : "Mark complete"}
                    </Button>
                  ) : null}

                  <Button variant="outline" disabled={!next} onClick={() => next && goTo(next.id)}>
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </section>

            {/* Rating the course from where the learner actually studies it,
                rather than only on the public marketing page. */}
            <LmsPanel>
              <CourseReviews courseId={courseId} />
            </LmsPanel>
          </div>

          {/* ---------------------------- course content ---------------------------- */}
          <aside className="flex flex-col gap-7">
            <LmsPanel title="Course Content" bodyClassName="px-0 py-0">
              <div className="px-7 py-6">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                    style={{ color: LMS_TOKENS.muted }}
                  />
                  <Input
                    className="pl-9"
                    placeholder="Search lessons"
                    aria-label="Search lessons"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                {lessons.length ? (
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-[14px]">
                      <span style={{ color: LMS_TOKENS.muted }}>Progress</span>
                      <span style={{ color: LMS_TOKENS.navy }}>
                        {completedCount}/{lessons.length}
                      </span>
                    </div>
                    <LmsProgressBar
                      percent={(completedCount / lessons.length) * 100}
                      className="mt-2.5"
                    />
                  </div>
                ) : null}
              </div>

              <ul style={{ backgroundColor: LMS_TOKENS.light3 }}>
                {visibleLessons.length === 0 ? (
                  <li className="px-7 py-8 text-[15px]" style={{ color: LMS_TOKENS.muted }}>
                    {lessons.length === 0 ? "No lessons yet." : `Nothing matches “${search.trim()}”.`}
                  </li>
                ) : (
                  visibleLessons.map((lesson) => {
                    const done = progressByLesson.get(lesson.id)?.status === "completed";
                    const active = lesson.id === activeLesson?.id;
                    const Icon = done ? Check : lessonIcon(lesson.content_type);

                    return (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          onClick={() => goTo(lesson.id)}
                          aria-current={active ? "true" : undefined}
                          className="flex w-full items-start gap-3 border-b px-7 py-4 text-left transition"
                          style={{
                            borderColor: LMS_TOKENS.border,
                            // The active row used a hardcoded white, which in dark mode put white
                            // text on a white ground — the lesson title vanished.
                            backgroundColor: active ? LMS_TOKENS.surface : "transparent",
                          }}
                        >
                          <span
                            className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full"
                            style={{
                              backgroundColor: done ? LMS_TOKENS.greenDark : LMS_TOKENS.lavender,
                              color: done ? "#FFFFFF" : LMS_TOKENS.purple,
                            }}
                          >
                            <Icon className="size-3.5" />
                          </span>
                          <span className="min-w-0">
                            <span
                              className="block text-[15px] leading-snug"
                              style={{ color: LMS_TOKENS.navy, fontWeight: active ? 600 : 400 }}
                            >
                              {lesson.title}
                            </span>
                            {lesson.duration_minutes ? (
                              <span className="mt-1 block text-[13px]" style={{ color: LMS_TOKENS.muted }}>
                                {lesson.duration_minutes} min
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </LmsPanel>

            {!enrolment ? (
              <LmsPanel>
                <p className="text-[15px]" style={{ color: LMS_TOKENS.muted }}>
                  You are not enrolled in this course, so your progress will not be recorded.
                </p>
              </LmsPanel>
            ) : null}
          </aside>
        </div>
      )}
    </LmsDashboardShell>
  );
}

export default function CoursePlayerPage() {
  return (
    <React.Suspense fallback={null}>
      <CoursePlayerContent />
    </React.Suspense>
  );
}
