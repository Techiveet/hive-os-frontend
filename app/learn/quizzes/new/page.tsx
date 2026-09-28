"use client";

import { useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import { LmsDashboardShell, LmsPanel } from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";
import { QuizBuilder } from "@/modules/Lms/components/quiz-builder";

export default function NewQuizPage() {
  const { brandSettings, brandName } = useLmsPublicBrand();
  const { canAuthor } = useLmsRole();

  return (
    <LmsDashboardShell
      role="instructor"
      brandSettings={brandSettings}
      brandName={brandName}
      title="New quiz"
      subtitle="Build the questions, then save it as a draft or publish it straight away."
      breadcrumbs={[
        { label: "Dashboard", href: "/learn" },
        { label: "Quizzes", href: "/learn/quizzes" },
        { label: "New" },
      ]}
    >
      {canAuthor ? (
        <QuizBuilder />
      ) : (
        <LmsPanel>
          <p>You do not have permission to author quizzes.</p>
        </LmsPanel>
      )}
    </LmsDashboardShell>
  );
}
