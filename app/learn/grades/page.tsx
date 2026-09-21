"use client";

import Link from "next/link";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  gradebookApi,
  type LmsGradeCell,
  type LmsGradeRow,
} from "@/modules/Lms/api/quizzes";
import { LMS_TOKENS, useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import { LmsDashboardShell, LmsPanel, useLmsCopy } from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";

/** --color-light-7, the template's tinted grader-report header row. */
const HEADER_BG = "#E5F0FD";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** One learner's mark for one quiz, or why there isn't one. */
function GradeCell({ cell }: { cell: LmsGradeCell | undefined }) {
  if (!cell || cell.status === "not_attempted") {
    return (
      <span className="text-[15px]" style={{ color: LMS_TOKENS.muted }}>
        —
      </span>
    );
  }

  if (cell.status === "awaiting_marking") {
    return (
      <Link
        href={`/learn/attempts/${cell.attempt_id}`}
        className="text-[15px] hover:underline"
        style={{ color: LMS_TOKENS.starYellow }}
      >
        Awaiting marking
      </Link>
    );
  }

  return (
    <Link
      href={`/learn/attempts/${cell.attempt_id}`}
      className="text-[15px] hover:underline"
      style={{ color: cell.passed === false ? "#DC2626" : LMS_TOKENS.navy }}
    >
      {cell.score}/{cell.max}
      <span className="ml-1.5" style={{ color: LMS_TOKENS.muted }}>
        ({cell.percent}%)
      </span>
    </Link>
  );
}

export default function GradesPage() {
  const { brandSettings, brandName } = useLmsPublicBrand();
  const lms = useLmsCopy();
  const { role, isStaff } = useLmsRole();

  const [courseId, setCourseId] = React.useState<string | undefined>(undefined);
  // The template's A–Z first-name filter. "All" clears it.
  const [letter, setLetter] = React.useState<string | null>(null);

  const gradebook = useQuery({
    queryKey: ["lms", "gradebook", courseId ?? "default"],
    queryFn: () => gradebookApi.get(courseId ? { course_id: courseId } : undefined),
  });

  const data = gradebook.data;
  const columns = data?.columns ?? [];

  const rows: LmsGradeRow[] = React.useMemo(() => {
    const all = data?.rows ?? [];
    if (!letter) return all;
    return all.filter((row) => row.user.name.trim().toUpperCase().startsWith(letter));
  }, [data, letter]);

  return (
    <LmsDashboardShell
      role={role}
      brandSettings={brandSettings}
      brandName={brandName}
      title={lms("page.grades.title", "Grades")}
      subtitle={
        isStaff
          ? lms(
              "page.grades.subtitle_staff",
              "Grader report — every enrolled learner against every published quiz.",
            )
          : lms("page.grades.subtitle_learner", "Your marks across this course's assessments.")
      }
      breadcrumbs={[{ label: lms("common.dashboard", "Dashboard"), href: "/learn" }, { label: lms("nav.grades", "Grades") }]}
      actions={
        (data?.courses.length ?? 0) > 1 ? (
          <Select value={data?.course?.id ?? ""} onValueChange={setCourseId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Choose a course" />
            </SelectTrigger>
            <SelectContent>
              {(data?.courses ?? []).map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : undefined
      }
    >
      <LmsPanel title={lms("page.grades.panel", "Grader Report")} bodyClassName="px-0 py-0">
        {gradebook.isPending ? (
          <p className="px-7 py-7" style={{ color: LMS_TOKENS.muted }}>
            Loading grades…
          </p>
        ) : !data?.course ? (
          <div className="px-7 py-12 text-center">
            <p style={{ color: LMS_TOKENS.muted }}>
              {isStaff
                ? "No courses to report on yet."
                : "You are not enrolled in a course with graded assessments yet."}
            </p>
          </div>
        ) : (
          <>
            {/* The template's A–Z filter strip, only where it earns its place. */}
            {isStaff ? (
              <div className="flex flex-wrap items-center gap-2 px-7 py-6">
                <span className="mr-2 text-[15px]" style={{ color: LMS_TOKENS.muted }}>
                  First name
                </span>
                <button
                  type="button"
                  onClick={() => setLetter(null)}
                  className="px-2 py-1 text-[15px]"
                  style={{ color: letter === null ? LMS_TOKENS.purple : LMS_TOKENS.muted }}
                >
                  All
                </button>
                {LETTERS.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setLetter(entry === letter ? null : entry)}
                    aria-pressed={entry === letter}
                    className="flex size-9 items-center justify-center rounded border text-[15px] transition"
                    style={{
                      borderColor: entry === letter ? LMS_TOKENS.purple : LMS_TOKENS.border,
                      color: entry === letter ? LMS_TOKENS.purple : LMS_TOKENS.navy,
                    }}
                  >
                    {entry}
                  </button>
                ))}
              </div>
            ) : null}

            {columns.length === 0 ? (
              <p className="px-7 py-12 text-center" style={{ color: LMS_TOKENS.muted }}>
                {data.course.title} has no published quizzes yet, so there is nothing to grade.
              </p>
            ) : (
              // Wide reports scroll inside the card rather than the page.
              <div className="overflow-x-auto px-7 pb-7">
                <table className="w-full min-w-[46rem] border-separate border-spacing-0 text-left">
                  <thead>
                    <tr style={{ backgroundColor: HEADER_BG }}>
                      <th
                        className="rounded-l-lg px-5 py-5 text-[15px] font-medium"
                        style={{ color: LMS_TOKENS.purple }}
                        scope="col"
                      >
                        First name / Surname
                      </th>
                      {isStaff ? (
                        <th
                          className="px-5 py-5 text-[15px] font-medium"
                          style={{ color: LMS_TOKENS.purple }}
                          scope="col"
                        >
                          Email address
                        </th>
                      ) : null}
                      {columns.map((column) => (
                        <th
                          key={column.id}
                          className="px-5 py-5 text-[15px] font-medium"
                          style={{ color: LMS_TOKENS.purple }}
                          scope="col"
                        >
                          {column.title}
                          <span className="ml-1.5 font-normal" style={{ color: LMS_TOKENS.muted }}>
                            /{column.points}
                          </span>
                        </th>
                      ))}
                      <th
                        className="rounded-r-lg px-5 py-5 text-[15px] font-medium"
                        style={{ color: LMS_TOKENS.purple }}
                        scope="col"
                      >
                        Course total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={columns.length + (isStaff ? 3 : 2)}
                          className="px-5 py-10 text-center text-[15px]"
                          style={{ color: LMS_TOKENS.muted }}
                        >
                          {letter
                            ? `No learners whose first name starts with ${letter}.`
                            : "Nobody is enrolled in this course yet."}
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={row.user.id ?? row.user.name}>
                          <td
                            className="border-b px-5 py-5 text-[15px]"
                            style={{ borderColor: LMS_TOKENS.border, color: LMS_TOKENS.navy }}
                          >
                            {row.user.name}
                          </td>
                          {isStaff ? (
                            <td
                              className="border-b px-5 py-5 text-[15px]"
                              style={{ borderColor: LMS_TOKENS.border, color: LMS_TOKENS.muted }}
                            >
                              {row.user.email ?? "—"}
                            </td>
                          ) : null}
                          {columns.map((column) => (
                            <td
                              key={column.id}
                              className="border-b px-5 py-5"
                              style={{ borderColor: LMS_TOKENS.border }}
                            >
                              <GradeCell cell={row.cells[column.id]} />
                            </td>
                          ))}
                          <td
                            className="border-b px-5 py-5 text-[15px] font-medium"
                            style={{ borderColor: LMS_TOKENS.border, color: LMS_TOKENS.navy }}
                          >
                            {row.total.score}/{row.total.max}
                            {row.total.percent !== null ? (
                              <span className="ml-1.5 font-normal" style={{ color: LMS_TOKENS.muted }}>
                                ({row.total.percent}%)
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </LmsPanel>
    </LmsDashboardShell>
  );
}
