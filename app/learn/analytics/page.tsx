"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { learningApi, type LmsAnalytics } from "@/modules/Lms/api";
import { LMS_TOKENS, useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import { LmsDashboardShell, LmsPanel, useLmsCopy } from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";

function Tile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_6px_24px_rgba(20,3,66,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: LMS_TOKENS.muted }}>{label}</p>
      <p className="mt-2 text-3xl font-bold" style={{ color: LMS_TOKENS.navy }}>{value}</p>
      {hint ? <p className="mt-1 text-xs" style={{ color: LMS_TOKENS.muted }}>{hint}</p> : null}
    </div>
  );
}

/** A plain bar per day: no chart library, so it prints and loads instantly. */
function DayBars({ series, colour }: { series: LmsAnalytics["enrollments_by_day"]; colour: string }) {
  const max = Math.max(1, ...series.map((point) => point.count));

  return (
    <div className="flex h-28 items-end gap-[2px]" role="img" aria-label={`${series.reduce((sum, point) => sum + point.count, 0)} in this period`}>
      {series.map((point) => (
        <div
          key={point.date}
          title={`${point.date}: ${point.count}`}
          className="min-h-[2px] flex-1 rounded-t"
          style={{ height: `${Math.max(2, (point.count / max) * 100)}%`, backgroundColor: point.count > 0 ? colour : "#E5E7EB" }}
        />
      ))}
    </div>
  );
}

function PercentBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-28 overflow-hidden rounded-full bg-[#E9EAF3]">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: LMS_TOKENS.green }} />
    </div>
  );
}

/** How learners are doing: who is learning, who finishes, and where they stall. Staff only. */
export default function LearningAnalyticsPage() {
  const { brandSettings, brandName } = useLmsPublicBrand();
  const lms = useLmsCopy();
  const { role, isStaff } = useLmsRole();

  const [days, setDays] = React.useState("30");
  const [courseId, setCourseId] = React.useState<string | null>(null);

  const analytics = useQuery({
    queryKey: ["lms", "analytics", days],
    queryFn: () => learningApi.getAnalytics(Number(days)),
    enabled: isStaff,
  });
  const lessons = useQuery({
    queryKey: ["lms", "analytics", "lessons", courseId],
    queryFn: () => learningApi.getLessonAnalytics(courseId as string),
    enabled: isStaff && courseId !== null,
  });

  const data = analytics.data;

  return (
    <LmsDashboardShell
      role={role}
      brandSettings={brandSettings}
      brandName={brandName}
      title={lms("page.analytics.title", "Analytics")}
      subtitle={lms("page.analytics.subtitle", "Who is learning, who finishes, and where people get stuck.")}
      breadcrumbs={[{ label: lms("common.dashboard", "Dashboard"), href: "/learn" }, { label: lms("nav.analytics", "Analytics") }]}
      actions={
        isStaff ? (
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        ) : undefined
      }
    >
      {!isStaff ? (
        <LmsPanel><p style={{ color: LMS_TOKENS.muted }}>Analytics are available to instructors and administrators.</p></LmsPanel>
      ) : analytics.isPending ? (
        <p style={{ color: LMS_TOKENS.muted }}><Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden="true" />Loading analytics…</p>
      ) : !data ? (
        <LmsPanel><p className="text-red-600">The analytics could not be loaded.</p></LmsPanel>
      ) : (
        <div className="flex flex-col gap-7">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Tile label="Enrolments" value={data.totals.enrollments} />
            <Tile label="Completion rate" value={`${data.totals.completion_rate}%`} hint={`${data.totals.completed} completed`} />
            <Tile label="Active this week" value={data.totals.active_learners_7d} hint="learners who opened a course" />
            <Tile label="Overdue" value={data.totals.overdue} hint="past their due date" />
            <Tile label="Certificates issued" value={data.totals.certificates_issued} />
            <Tile label="Average score" value={data.totals.average_score !== null ? `${data.totals.average_score}%` : "—"} hint="across graded work" />
          </div>

          <div className="grid gap-7 lg:grid-cols-2">
            <LmsPanel title={`New enrolments · last ${data.window_days} days`}>
              <DayBars series={data.enrollments_by_day} colour={LMS_TOKENS.navy} />
            </LmsPanel>
            <LmsPanel title={`Completions · last ${data.window_days} days`}>
              <DayBars series={data.completions_by_day} colour={LMS_TOKENS.green} />
            </LmsPanel>
          </div>

          <LmsPanel title="Courses" bodyClassName="px-0 py-0">
            {data.courses.length === 0 ? (
              <p className="px-7 py-6" style={{ color: LMS_TOKENS.muted }}>No published courses yet.</p>
            ) : (
              <table className="w-full text-left text-[15px]">
                <thead>
                  <tr className="text-xs uppercase tracking-wide" style={{ color: LMS_TOKENS.muted }}>
                    <th className="px-7 py-3">Course</th><th className="px-3 py-3">Enrolled</th><th className="px-3 py-3">Completed</th>
                    <th className="px-3 py-3">Completion</th><th className="px-3 py-3">Avg score</th><th className="px-3 py-3">Seats left</th>
                  </tr>
                </thead>
                <tbody>
                  {data.courses.map((course) => (
                    <tr key={course.id} className="cursor-pointer border-t hover:bg-[#F7F8FB]" style={{ borderColor: "#E9EAF3" }} onClick={() => setCourseId(course.id)}>
                      <td className="px-7 py-3 font-semibold" style={{ color: LMS_TOKENS.navy }}>{course.title}</td>
                      <td className="px-3 py-3">{course.enrollments}</td>
                      <td className="px-3 py-3">{course.completed}</td>
                      <td className="px-3 py-3"><div className="flex items-center gap-2"><PercentBar value={course.completion_rate} />{course.completion_rate}%</div></td>
                      <td className="px-3 py-3">{course.average_score !== null ? `${course.average_score}%` : "—"}</td>
                      <td className="px-3 py-3">{course.seats_left !== null ? course.seats_left : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </LmsPanel>

          {courseId !== null ? (
            <LmsPanel title={`Where learners stall${lessons.data ? ` · ${lessons.data.course.title}` : ""}`}>
              {lessons.isPending ? (
                <p style={{ color: LMS_TOKENS.muted }}>Loading…</p>
              ) : (
                <ul className="space-y-3">
                  {(lessons.data?.lessons ?? []).map((lesson) => (
                    <li key={lesson.id} className="flex flex-wrap items-center gap-3">
                      <span className="min-w-[200px] flex-1 text-[15px]" style={{ color: LMS_TOKENS.navy }}>
                        {lesson.title}{lesson.required ? "" : " (optional)"}
                      </span>
                      <PercentBar value={lesson.completion_rate} />
                      <span className="w-40 text-sm" style={{ color: LMS_TOKENS.muted }}>
                        {lesson.completed} finished · {lesson.started} started
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </LmsPanel>
          ) : (
            <p className="text-sm" style={{ color: LMS_TOKENS.muted }}>Select a course above to see which lessons learners finish and where they stop.</p>
          )}

          <LmsPanel title="Quizzes" bodyClassName="px-0 py-0">
            {data.quizzes.length === 0 ? (
              <p className="px-7 py-6" style={{ color: LMS_TOKENS.muted }}>No published quizzes yet.</p>
            ) : (
              <table className="w-full text-left text-[15px]">
                <thead>
                  <tr className="text-xs uppercase tracking-wide" style={{ color: LMS_TOKENS.muted }}>
                    <th className="px-7 py-3">Quiz</th><th className="px-3 py-3">Graded attempts</th><th className="px-3 py-3">Pass rate</th><th className="px-3 py-3">Average</th>
                  </tr>
                </thead>
                <tbody>
                  {data.quizzes.map((quiz) => (
                    <tr key={quiz.id} className="border-t" style={{ borderColor: "#E9EAF3" }}>
                      <td className="px-7 py-3 font-semibold" style={{ color: LMS_TOKENS.navy }}>{quiz.title}</td>
                      <td className="px-3 py-3">{quiz.attempts}</td>
                      <td className="px-3 py-3">{quiz.pass_rate !== null ? `${quiz.pass_rate}%` : "—"}</td>
                      <td className="px-3 py-3">{quiz.average_percent !== null ? `${quiz.average_percent}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </LmsPanel>
        </div>
      )}
    </LmsDashboardShell>
  );
}
