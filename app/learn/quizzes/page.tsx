"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, Clock3, PenLine, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  myQuizApi,
  quizApi,
  type LmsQuiz,
  type LmsQuizAttempt,
} from "@/modules/Lms/api/quizzes";
import { LMS_TOKENS, useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";
import {
  LmsDashboardShell,
  useLmsCopy,
  LmsPanel,
  LmsStatCard,
} from "@/modules/Lms/components/lms-dashboard-shell";

function Meta({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[14px]" style={{ color: LMS_TOKENS.muted }}>
      {children}
    </span>
  );
}

/** The learner's best result so far, or null if they have never finished one. */
function bestPercent(attempts: LmsQuizAttempt[] = []) {
  const scored = attempts.filter((a) => a.status !== "in_progress" && a.score_percent != null);
  return scored.length ? Math.max(...scored.map((a) => a.score_percent ?? 0)) : null;
}

export default function QuizzesPage() {
  const router = useRouter();
  const { brandSettings, brandName } = useLmsPublicBrand();
  const lms = useLmsCopy();
  // A teaching assistant is staff and marks work, but cannot author. Every
  // authoring affordance below is gated on canAuthor rather than isStaff, so
  // they are not offered buttons that lead to a refusal.
  const { role, isStaff, canAuthor } = useLmsRole();

  const learnerQuizzes = useQuery({
    queryKey: ["lms", "my-quizzes"],
    queryFn: () => myQuizApi.list(),
    enabled: !isStaff,
  });

  const staffQuizzes = useQuery({
    queryKey: ["lms", "quizzes"],
    queryFn: () => quizApi.list({ per_page: 100 }),
    enabled: isStaff,
  });

  const start = useMutation({
    mutationFn: (quizId: string) => myQuizApi.start(quizId),
    onSuccess: (attempt) => router.push(`/learn/attempts/${attempt.id}`),
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "This quiz could not be started.";
      toast.error(message);
    },
  });

  /* ------------------------------ staff view ----------------------------- */
  if (isStaff) {
    const quizzes: LmsQuiz[] = staffQuizzes.data?.data ?? [];
    const published = quizzes.filter((quiz) => quiz.status === "published");
    const totalAttempts = quizzes.reduce((sum, quiz) => sum + (quiz.attempts_count ?? 0), 0);

    return (
      <LmsDashboardShell
        role={role}
        brandSettings={brandSettings}
        brandName={brandName}
        title={lms("page.quizzes.title_staff", "Quizzes")}
        subtitle={
          canAuthor
            ? lms(
                "page.quizzes.subtitle_author",
                "Author assessments, publish them to a course, and mark what needs a human.",
              )
            : lms("page.quizzes.subtitle_marker", "Attempts waiting on a human marker.")
        }
        breadcrumbs={[{ label: lms("common.dashboard", "Dashboard"), href: "/learn" }, { label: lms("nav.quizzes", "Quizzes") }]}
        actions={
          canAuthor ? (
            <Button asChild style={{ backgroundColor: LMS_TOKENS.purple }}>
              <Link href="/learn/quizzes/new">New quiz</Link>
            </Button>
          ) : null
        }
      >
        <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
          <LmsStatCard label="Quizzes" value={quizzes.length} icon={ClipboardList} />
          <LmsStatCard label="Published" value={published.length} icon={CheckCircle2} />
          <LmsStatCard label="Attempts" value={totalAttempts} icon={Timer} />
        </div>

        <LmsPanel title={lms("page.quizzes.panel_staff", "All quizzes")} className="mt-7" bodyClassName="px-0 py-0">
          {staffQuizzes.isPending ? (
            <p className="px-7 py-7" style={{ color: LMS_TOKENS.muted }}>
              Loading quizzes…
            </p>
          ) : quizzes.length === 0 ? (
            <div className="px-7 py-12 text-center">
              <p style={{ color: LMS_TOKENS.muted }}>
                {canAuthor
                  ? "No quizzes yet. Create one and attach it to a course or a single lesson."
                  : "No quizzes have been set up yet. They will appear here for marking once a teacher publishes one."}
              </p>
              {canAuthor ? (
                <Button asChild className="mt-5" style={{ backgroundColor: LMS_TOKENS.purple }}>
                  <Link href="/learn/quizzes/new">Create the first quiz</Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <ul>
              {quizzes.map((quiz) => (
                <li
                  key={quiz.id}
                  className="flex flex-wrap items-center justify-between gap-4 border-b px-7 py-5 last:border-b-0"
                  style={{ borderColor: LMS_TOKENS.border }}
                >
                  <div className="min-w-0">
                    <Link
                      href={
                        canAuthor
                          ? `/learn/quizzes/${quiz.id}/edit`
                          : `/learn/quizzes/${quiz.id}/attempts`
                      }
                      className="text-[17px] font-medium hover:underline"
                      style={{ color: LMS_TOKENS.navy }}
                    >
                      {quiz.title}
                    </Link>
                    <div className="mt-1.5 flex flex-wrap items-center gap-4">
                      {quiz.course?.title ? <Meta>{quiz.course.title}</Meta> : null}
                      <Meta>{quiz.questions_count ?? quiz.questions?.length ?? 0} question{(quiz.questions_count ?? quiz.questions?.length ?? 0) === 1 ? "" : "s"}</Meta>
                      <Meta>
                        <Clock3 className="size-4" />
                        {quiz.duration_minutes > 0
                          ? `${quiz.duration_minutes} min`
                          : "No time limit"}
                      </Meta>
                      <Meta>Pass {Number(quiz.pass_mark)}%</Meta>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className="rounded-full px-3 py-1 text-[13px] font-medium"
                      style={
                        quiz.status === "published"
                          ? { backgroundColor: "#E6FBF3", color: LMS_TOKENS.greenDark }
                          : { backgroundColor: LMS_TOKENS.lavender, color: LMS_TOKENS.purple }
                      }
                    >
                      {quiz.status === "published" ? "Published" : "Draft"}
                    </span>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/learn/quizzes/${quiz.id}/attempts`}>Marking</Link>
                    </Button>
                    {canAuthor ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/learn/quizzes/${quiz.id}/edit`}>
                          <PenLine className="size-4" />
                          Edit
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </LmsPanel>
      </LmsDashboardShell>
    );
  }

  /* ----------------------------- learner view ---------------------------- */
  const quizzes = learnerQuizzes.data ?? [];
  const completed = quizzes.filter((quiz) =>
    (quiz.attempts ?? []).some((attempt) => attempt.status !== "in_progress"),
  );
  const passedCount = quizzes.filter((quiz) =>
    (quiz.attempts ?? []).some((attempt) => attempt.passed === true),
  ).length;

  return (
    <LmsDashboardShell
      role={role}
      brandSettings={brandSettings}
      brandName={brandName}
      title={lms("page.quizzes.title_learner", "My quizzes")}
      subtitle={lms(
        "page.quizzes.subtitle_learner",
        "Assessments from the courses you are enrolled in.",
      )}
      breadcrumbs={[{ label: lms("common.dashboard", "Dashboard"), href: "/learn" }, { label: lms("nav.quizzes", "Quizzes") }]}
    >
      <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
        <LmsStatCard label="Available" value={quizzes.length} icon={ClipboardList} />
        <LmsStatCard label="Attempted" value={completed.length} icon={Timer} />
        <LmsStatCard label="Passed" value={passedCount} icon={CheckCircle2} />
      </div>

      <LmsPanel title={lms("page.quizzes.panel_learner", "Assessments")} className="mt-7" bodyClassName="px-0 py-0">
        {learnerQuizzes.isPending ? (
          <p className="px-7 py-7" style={{ color: LMS_TOKENS.muted }}>
            Loading your quizzes…
          </p>
        ) : quizzes.length === 0 ? (
          <div className="px-7 py-12 text-center">
            <p style={{ color: LMS_TOKENS.muted }}>
              No quizzes are open to you yet. They appear here once your instructor publishes one
              on a course you are enrolled in.
            </p>
            <Button asChild className="mt-5" variant="outline">
              <Link href="/learn/courses">Browse courses</Link>
            </Button>
          </div>
        ) : (
          <ul>
            {quizzes.map((quiz) => {
              const attempts = quiz.attempts ?? [];
              const open = attempts.find((attempt) => attempt.status === "in_progress");
              const best = bestPercent(attempts);
              const exhausted =
                quiz.max_attempts != null && attempts.length >= quiz.max_attempts && !open;

              return (
                <li
                  key={quiz.id}
                  className="flex flex-wrap items-center justify-between gap-4 border-b px-7 py-5 last:border-b-0"
                  style={{ borderColor: LMS_TOKENS.border }}
                >
                  <div className="min-w-0">
                    <p className="text-[17px] font-medium" style={{ color: LMS_TOKENS.navy }}>
                      {quiz.title}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-4">
                      {quiz.course?.title ? <Meta>{quiz.course.title}</Meta> : null}
                      <Meta>{quiz.questions_count ?? 0} question{(quiz.questions_count ?? 0) === 1 ? "" : "s"}</Meta>
                      <Meta>
                        <Clock3 className="size-4" />
                        {quiz.duration_minutes > 0
                          ? `${quiz.duration_minutes} min`
                          : "No time limit"}
                      </Meta>
                      <Meta>
                        {quiz.max_attempts
                          ? `Attempt ${attempts.length} of ${quiz.max_attempts}`
                          : `${attempts.length} attempt${attempts.length === 1 ? "" : "s"}`}
                      </Meta>
                      {best !== null ? (
                        <Meta>
                          <span style={{ color: LMS_TOKENS.greenDark }}>Best {best}%</span>
                        </Meta>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {attempts
                      .filter((attempt) => attempt.status !== "in_progress")
                      .slice(0, 1)
                      .map((attempt) => (
                        <Button key={attempt.id} asChild variant="outline" size="sm">
                          <Link href={`/learn/attempts/${attempt.id}`}>Last result</Link>
                        </Button>
                      ))}

                    {exhausted ? (
                      <span className="text-[14px]" style={{ color: LMS_TOKENS.muted }}>
                        No attempts left
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        disabled={start.isPending}
                        onClick={() =>
                          open ? router.push(`/learn/attempts/${open.id}`) : start.mutate(quiz.id)
                        }
                        style={{ backgroundColor: LMS_TOKENS.purple }}
                      >
                        {open ? "Resume" : "Start quiz"}
                      </Button>
                    )}
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
