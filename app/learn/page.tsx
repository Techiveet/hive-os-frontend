"use client";

import Link from "next/link";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, Clock3, GraduationCap, Users } from "lucide-react";

import { learningApi, type LmsEnrollment } from "@/modules/Lms/api";
import {
  LMS_TOKENS,
  useLmsPublicBrand,
} from "@/modules/Lms/components/lms-site";
import {
  LmsDashboardShell,
  useLmsCopy,
  LmsPanel,
  LmsProgressBar,
  LmsStatCard,
} from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";

/**
 * Signed-in LMS home, rebuilt from the template's dashboard.html.
 *
 * Teachers and admins see the cohort view (their catalogue and who is enrolled);
 * learners see only their own enrolments. Both render through one shell so the
 * two audiences never drift apart visually.
 */
export default function LearnDashboardPage() {
  const { brandSettings, brandName } = useLmsPublicBrand();
  const lms = useLmsCopy();

  // Anyone who can author, assign or mark is staff; everyone else studies.
  const { role, isStaff } = useLmsRole();

  const summary = useQuery({
    queryKey: ["lms", "summary"],
    queryFn: learningApi.getSummary,
    enabled: isStaff,
  });

  const myLearning = useQuery({
    queryKey: ["lms", "my-learning"],
    queryFn: learningApi.getMyLearning,
  });

  const enrolments: LmsEnrollment[] = myLearning.data ?? [];
  const completed = enrolments.filter((e) => e.status === "completed").length;
  const inProgress = enrolments.filter((e) => e.status === "in_progress").length;
  const averageProgress = enrolments.length
    ? Math.round(
        enrolments.reduce((total, e) => total + (e.progress_percent ?? 0), 0) / enrolments.length,
      )
    : 0;

  const stats = summary.data?.stats;

  return (
    <LmsDashboardShell
      role={role}
      brandSettings={brandSettings}
      brandName={brandName}
      title={lms("page.dashboard.title", "Dashboard")}
      subtitle={
        isStaff
          ? lms(
              "page.dashboard.subtitle_staff",
              "Your catalogue, enrolments and learner progress at a glance.",
            )
          : lms("page.dashboard.subtitle_learner", "Pick up where you left off.")
      }
      breadcrumbs={[
        { label: lms("common.home", "Home"), href: "/" },
        { label: lms("common.dashboard", "Dashboard") },
      ]}
    >
      <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-4">
        {isStaff ? (
          <>
            <LmsStatCard
              label="Total Courses"
              value={stats?.courses ?? "—"}
              hint={
                <>
                  <span style={{ color: LMS_TOKENS.purple }}>{stats?.published_courses ?? 0}</span>{" "}
                  published
                </>
              }
              icon={BookOpen}
            />
            <LmsStatCard
              label="Total Enrolments"
              value={stats?.enrollments ?? "—"}
              hint={
                <>
                  <span style={{ color: LMS_TOKENS.purple }}>{stats?.active_enrollments ?? 0}</span>{" "}
                  active
                </>
              }
              icon={Users}
            />
            <LmsStatCard
              label="Completed"
              value={stats?.completed_enrollments ?? "—"}
              hint={
                <>
                  <span style={{ color: LMS_TOKENS.purple }}>{stats?.overdue_enrollments ?? 0}</span>{" "}
                  overdue
                </>
              }
              icon={CheckCircle2}
            />
            <LmsStatCard
              label="Average Progress"
              value={`${Math.round(stats?.average_progress ?? 0)}%`}
              hint="across all learners"
              icon={GraduationCap}
            />
          </>
        ) : (
          <>
            <LmsStatCard label="My Courses" value={enrolments.length} icon={BookOpen} />
            <LmsStatCard label="In Progress" value={inProgress} icon={Clock3} />
            <LmsStatCard label="Completed" value={completed} icon={CheckCircle2} />
            <LmsStatCard
              label="Average Progress"
              value={`${averageProgress}%`}
              icon={GraduationCap}
            />
          </>
        )}
      </div>

      <div className="mt-7 grid gap-7 xl:grid-cols-3">
        <LmsPanel
          title="Continue learning"
          className="xl:col-span-2"
          action={
            <Link
              href="/learn/courses"
              className="text-[14px] underline"
              style={{ color: LMS_TOKENS.purple }}
            >
              View all
            </Link>
          }
        >
          {myLearning.isPending ? (
            <p className="text-[15px]" style={{ color: LMS_TOKENS.muted }}>
              Loading your courses…
            </p>
          ) : enrolments.length === 0 ? (
            <p className="text-[15px]" style={{ color: LMS_TOKENS.muted }}>
              You are not enrolled in any course yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-7">
              {enrolments.slice(0, 5).map((enrolment) => (
                <li key={enrolment.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span
                      className="text-[15px] font-medium"
                      style={{ color: LMS_TOKENS.navy }}
                    >
                      {enrolment.course?.title ?? "Course"}
                    </span>
                    <span className="text-[14px]" style={{ color: LMS_TOKENS.muted }}>
                      {Math.round(enrolment.progress_percent ?? 0)}%
                    </span>
                  </div>
                  <LmsProgressBar percent={enrolment.progress_percent ?? 0} className="mt-3" />
                </li>
              ))}
            </ul>
          )}
        </LmsPanel>

        <LmsPanel title={isStaff ? "Recent courses" : "Due soon"}>
          {isStaff ? (
            summary.isPending ? (
              <p className="text-[15px]" style={{ color: LMS_TOKENS.muted }}>
                Loading…
              </p>
            ) : (summary.data?.recent_courses?.length ?? 0) === 0 ? (
              <p className="text-[15px]" style={{ color: LMS_TOKENS.muted }}>
                No courses yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-5">
                {summary.data!.recent_courses.slice(0, 5).map((course) => (
                  <li key={course.id}>
                    <div className="text-[15px] font-medium" style={{ color: LMS_TOKENS.navy }}>
                      {course.title}
                    </div>
                    <div className="mt-1.5 text-[14px]" style={{ color: LMS_TOKENS.muted }}>
                      {course.lessons_count ?? 0} lessons · {course.enrollments_count ?? 0} enrolled
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : enrolments.filter((e) => e.due_at).length === 0 ? (
            <p className="text-[15px]" style={{ color: LMS_TOKENS.muted }}>
              Nothing due right now.
            </p>
          ) : (
            <ul className="flex flex-col gap-5">
              {enrolments
                .filter((e) => e.due_at)
                .slice(0, 5)
                .map((enrolment) => (
                  <li key={enrolment.id}>
                    <div className="text-[15px] font-medium" style={{ color: LMS_TOKENS.navy }}>
                      {enrolment.course?.title ?? "Course"}
                    </div>
                    <div className="mt-1.5 text-[14px]" style={{ color: LMS_TOKENS.muted }}>
                      Due {new Date(enrolment.due_at!).toLocaleDateString()}
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </LmsPanel>
      </div>
    </LmsDashboardShell>
  );
}
