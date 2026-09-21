"use client";

import Link from "next/link";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, Clock3, PenLine, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  assignmentApi,
  myAssignmentApi,
  type LmsAssignment,
  type LmsMyAssignment,
} from "@/modules/Lms/api/assignments";
import { LMS_TOKENS, useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import {
  LmsDashboardShell,
  useLmsCopy,
  LmsPanel,
  LmsStatCard,
} from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";

function Meta({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[14px]" style={{ color: LMS_TOKENS.muted }}>
      {children}
    </span>
  );
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** How a learner's submission reads at a glance. */
function submissionBadge(assignment: LmsMyAssignment) {
  const submission = assignment.submission;

  if (submission?.status === "graded") {
    return {
      label: `${submission.score ?? 0}/${assignment.points}`,
      bg: "#E6FBF3",
      color: LMS_TOKENS.greenDark,
    };
  }
  if (submission?.status === "submitted") {
    return { label: "Submitted", bg: LMS_TOKENS.lavender, color: LMS_TOKENS.purple };
  }
  if (submission?.status === "draft") {
    return { label: "Draft", bg: "#FDF3E4", color: LMS_TOKENS.starYellow };
  }
  if (assignment.is_overdue && !assignment.allow_late) {
    return { label: "Closed", bg: "#FDECEC", color: "#DC2626" };
  }
  if (assignment.is_overdue) {
    return { label: "Overdue", bg: "#FDECEC", color: "#DC2626" };
  }
  return { label: "Not started", bg: LMS_TOKENS.lightBg, color: LMS_TOKENS.muted };
}

export default function AssignmentsPage() {
  const { brandSettings, brandName } = useLmsPublicBrand();
  const lms = useLmsCopy();
  // A teaching assistant is staff and marks work, but cannot author. Every
  // authoring affordance below is gated on canAuthor rather than isStaff, so
  // they are not offered buttons that lead to a refusal.
  const { role, isStaff, canAuthor } = useLmsRole();

  const staffList = useQuery({
    queryKey: ["lms", "assignments"],
    queryFn: () => assignmentApi.list(),
    enabled: isStaff,
  });

  const learnerList = useQuery({
    queryKey: ["lms", "my-assignments"],
    queryFn: () => myAssignmentApi.list(),
    enabled: !isStaff,
  });

  /* ------------------------------ staff view ----------------------------- */
  if (isStaff) {
    const rows: LmsAssignment[] = staffList.data ?? [];
    const published = rows.filter((row) => row.status === "published").length;
    const needsGrading = rows.reduce((sum, row) => sum + (row.needs_grading_count ?? 0), 0);

    return (
      <LmsDashboardShell
        role={role}
        brandSettings={brandSettings}
        brandName={brandName}
        title={lms("page.assignments.title_staff", "Assignments")}
        subtitle={
          canAuthor
            ? lms("page.assignments.subtitle_author", "Set work, collect hand-ins, and mark them.")
            : lms("page.assignments.subtitle_marker", "Hand-ins waiting to be marked.")
        }
        breadcrumbs={[{ label: lms("common.dashboard", "Dashboard"), href: "/learn" }, { label: lms("nav.assignments", "Assignments") }]}
        actions={
          canAuthor ? (
            <Button asChild style={{ backgroundColor: LMS_TOKENS.purple }}>
              <Link href="/learn/assignments/new">New assignment</Link>
            </Button>
          ) : null
        }
      >
        <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
          <LmsStatCard label="Assignments" value={rows.length} icon={ClipboardList} />
          <LmsStatCard label="Published" value={published} icon={CheckCircle2} />
          <LmsStatCard label="Needs grading" value={needsGrading} icon={Users} />
        </div>

        <LmsPanel title={lms("page.assignments.panel_staff", "All assignments")} className="mt-7" bodyClassName="px-0 py-0">
          {staffList.isPending ? (
            <p className="px-7 py-7" style={{ color: LMS_TOKENS.muted }}>
              Loading assignments…
            </p>
          ) : rows.length === 0 ? (
            <div className="px-7 py-12 text-center">
              <p style={{ color: LMS_TOKENS.muted }}>
                {canAuthor
                  ? "No assignments yet. Create one and attach it to a course."
                  : "No assignments have been set yet. Hand-ins will appear here for marking once a teacher publishes one."}
              </p>
              {canAuthor ? (
                <Button asChild className="mt-5" style={{ backgroundColor: LMS_TOKENS.purple }}>
                  <Link href="/learn/assignments/new">Create the first assignment</Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <ul>
              {rows.map((assignment) => (
                <li
                  key={assignment.id}
                  className="flex flex-wrap items-center justify-between gap-4 border-b px-7 py-5 last:border-b-0"
                  style={{ borderColor: LMS_TOKENS.border }}
                >
                  <div className="min-w-0">
                    <Link
                      href={
                        canAuthor
                          ? `/learn/assignments/${assignment.id}/edit`
                          : `/learn/assignments/${assignment.id}/submissions`
                      }
                      className="text-[17px] font-medium hover:underline"
                      style={{ color: LMS_TOKENS.navy }}
                    >
                      {assignment.title}
                    </Link>
                    <div className="mt-1.5 flex flex-wrap items-center gap-4">
                      {assignment.course?.title ? <Meta>{assignment.course.title}</Meta> : null}
                      <Meta>{Number(assignment.points)} points</Meta>
                      {assignment.due_at ? (
                        <Meta>
                          <Clock3 className="size-4" />
                          Due {formatDate(assignment.due_at)}
                        </Meta>
                      ) : (
                        <Meta>No deadline</Meta>
                      )}
                      <Meta>{assignment.submissions_count ?? 0} submitted</Meta>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {(assignment.needs_grading_count ?? 0) > 0 ? (
                      <span
                        className="rounded-full px-3 py-1 text-[13px] font-medium"
                        style={{ backgroundColor: "#FDF3E4", color: LMS_TOKENS.starYellow }}
                      >
                        {assignment.needs_grading_count} to mark
                      </span>
                    ) : null}
                    <span
                      className="rounded-full px-3 py-1 text-[13px] font-medium"
                      style={
                        assignment.status === "published"
                          ? { backgroundColor: "#E6FBF3", color: LMS_TOKENS.greenDark }
                          : { backgroundColor: LMS_TOKENS.lavender, color: LMS_TOKENS.purple }
                      }
                    >
                      {assignment.status === "published" ? "Published" : "Draft"}
                    </span>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/learn/assignments/${assignment.id}/submissions`}>Marking</Link>
                    </Button>
                    {canAuthor ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/learn/assignments/${assignment.id}/edit`}>
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
  const rows: LmsMyAssignment[] = learnerList.data ?? [];
  const submitted = rows.filter((row) => row.submission && row.submission.status !== "draft").length;
  const graded = rows.filter((row) => row.submission?.status === "graded").length;

  return (
    <LmsDashboardShell
      role={role}
      brandSettings={brandSettings}
      brandName={brandName}
      title={lms("page.assignments.title_learner", "My assignments")}
      subtitle={lms(
        "page.assignments.subtitle_learner",
        "Work set on the courses you are enrolled in.",
      )}
      breadcrumbs={[{ label: lms("common.dashboard", "Dashboard"), href: "/learn" }, { label: lms("nav.assignments", "Assignments") }]}
    >
      <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
        <LmsStatCard label="Set" value={rows.length} icon={ClipboardList} />
        <LmsStatCard label="Handed in" value={submitted} icon={CheckCircle2} />
        <LmsStatCard label="Marked" value={graded} icon={Users} />
      </div>

      <LmsPanel title={lms("page.assignments.panel_learner", "Assignments")} className="mt-7" bodyClassName="px-0 py-0">
        {learnerList.isPending ? (
          <p className="px-7 py-7" style={{ color: LMS_TOKENS.muted }}>
            Loading your assignments…
          </p>
        ) : rows.length === 0 ? (
          <div className="px-7 py-12 text-center">
            <p style={{ color: LMS_TOKENS.muted }}>
              Nothing set for you yet. Assignments appear here once your instructor publishes one on
              a course you are enrolled in.
            </p>
          </div>
        ) : (
          <ul>
            {rows.map((assignment) => {
              const badge = submissionBadge(assignment);
              return (
                <li
                  key={assignment.id}
                  className="flex flex-wrap items-center justify-between gap-4 border-b px-7 py-5 last:border-b-0"
                  style={{ borderColor: LMS_TOKENS.border }}
                >
                  <div className="min-w-0">
                    <Link
                      href={`/learn/assignments/${assignment.id}`}
                      className="text-[17px] font-medium hover:underline"
                      style={{ color: LMS_TOKENS.navy }}
                    >
                      {assignment.title}
                    </Link>
                    <div className="mt-1.5 flex flex-wrap items-center gap-4">
                      {assignment.course?.title ? <Meta>{assignment.course.title}</Meta> : null}
                      <Meta>{assignment.points} points</Meta>
                      {assignment.due_at ? (
                        <Meta>
                          <Clock3 className="size-4" />
                          Due {formatDate(assignment.due_at)}
                        </Meta>
                      ) : (
                        <Meta>No deadline</Meta>
                      )}
                      {assignment.submission?.is_late ? (
                        <Meta>
                          <span style={{ color: "#DC2626" }}>Handed in late</span>
                        </Meta>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className="rounded-full px-3 py-1 text-[13px] font-medium"
                      style={{ backgroundColor: badge.bg, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                    <Button asChild size="sm" style={{ backgroundColor: LMS_TOKENS.purple }}>
                      <Link href={`/learn/assignments/${assignment.id}`}>
                        {assignment.submission?.status === "graded"
                          ? "View feedback"
                          : assignment.submission
                            ? "Continue"
                            : "Open"}
                      </Link>
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
