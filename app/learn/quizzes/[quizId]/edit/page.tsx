"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { quizApi } from "@/modules/Lms/api/quizzes";
import { LMS_TOKENS, useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import { LmsDashboardShell, LmsPanel } from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";
import { QuizBuilder } from "@/modules/Lms/components/quiz-builder";

export default function EditQuizPage() {
  const params = useParams<{ quizId: string }>();
  const quizId = params.quizId;
  const { brandSettings, brandName } = useLmsPublicBrand();
  const { canAuthor } = useLmsRole();

  const quiz = useQuery({
    queryKey: ["lms", "quiz", quizId],
    queryFn: () => quizApi.get(quizId),
    enabled: Boolean(quizId) && canAuthor,
  });

  return (
    <LmsDashboardShell
      role="instructor"
      brandSettings={brandSettings}
      brandName={brandName}
      title={quiz.data?.title ?? "Edit quiz"}
      subtitle={
        quiz.data
          ? `${quiz.data.status === "published" ? "Published" : "Draft"} · ${
              quiz.data.attempts_count ?? 0
            } attempt${(quiz.data.attempts_count ?? 0) === 1 ? "" : "s"}`
          : undefined
      }
      breadcrumbs={[
        { label: "Dashboard", href: "/learn" },
        { label: "Quizzes", href: "/learn/quizzes" },
        { label: quiz.data?.title ?? "Edit" },
      ]}
      actions={
        <Button asChild variant="outline">
          <Link href={`/learn/quizzes/${quizId}/attempts`}>Marking queue</Link>
        </Button>
      }
    >
      {!canAuthor ? (
        <LmsPanel>
          <p>You do not have permission to edit quizzes.</p>
        </LmsPanel>
      ) : quiz.isPending ? (
        <LmsPanel>
          <p style={{ color: LMS_TOKENS.muted }}>Loading quiz…</p>
        </LmsPanel>
      ) : quiz.isError || !quiz.data ? (
        <LmsPanel>
          <p style={{ color: LMS_TOKENS.muted }}>This quiz could not be loaded.</p>
          <Button asChild className="mt-5" variant="outline">
            <Link href="/learn/quizzes">Back to quizzes</Link>
          </Button>
        </LmsPanel>
      ) : (
        // Keyed so switching quizzes remounts the form rather than carrying
        // the previous quiz's local state across.
        <QuizBuilder key={quiz.data.id} quiz={quiz.data} />
      )}
    </LmsDashboardShell>
  );
}
