"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { assignmentApi } from "@/modules/Lms/api/assignments";
import { LMS_TOKENS, useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import { LmsDashboardShell, LmsPanel } from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";
import { AssignmentBuilder } from "@/modules/Lms/components/assignment-builder";

export default function EditAssignmentPage() {
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = params.assignmentId;
  const { brandSettings, brandName } = useLmsPublicBrand();
  const { canAuthor } = useLmsRole();

  const assignment = useQuery({
    queryKey: ["lms", "assignment", assignmentId],
    queryFn: () => assignmentApi.get(assignmentId),
    enabled: Boolean(assignmentId) && canAuthor,
  });

  return (
    <LmsDashboardShell
      role="instructor"
      brandSettings={brandSettings}
      brandName={brandName}
      title={assignment.data?.title ?? "Edit assignment"}
      subtitle={
        assignment.data
          ? `${assignment.data.status === "published" ? "Published" : "Draft"} · ${
              assignment.data.submissions_count ?? 0
            } submitted`
          : undefined
      }
      breadcrumbs={[
        { label: "Dashboard", href: "/learn" },
        { label: "Assignments", href: "/learn/assignments" },
        { label: assignment.data?.title ?? "Edit" },
      ]}
      actions={
        <Button asChild variant="outline">
          <Link href={`/learn/assignments/${assignmentId}/submissions`}>Marking queue</Link>
        </Button>
      }
    >
      {!canAuthor ? (
        <LmsPanel>
          <p>You do not have permission to edit assignments.</p>
        </LmsPanel>
      ) : assignment.isPending ? (
        <LmsPanel>
          <p style={{ color: LMS_TOKENS.muted }}>Loading assignment…</p>
        </LmsPanel>
      ) : assignment.isError || !assignment.data ? (
        <LmsPanel>
          <p style={{ color: LMS_TOKENS.muted }}>This assignment could not be loaded.</p>
          <Button asChild className="mt-5" variant="outline">
            <Link href="/learn/assignments">Back to assignments</Link>
          </Button>
        </LmsPanel>
      ) : (
        // Keyed so switching assignments remounts the form rather than
        // carrying the previous one's local state across.
        <AssignmentBuilder key={assignment.data.id} assignment={assignment.data} />
      )}
    </LmsDashboardShell>
  );
}
