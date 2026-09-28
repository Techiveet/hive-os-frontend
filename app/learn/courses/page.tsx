"use client";

import Link from "next/link";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Clock3, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { learningApi, type LmsCourse, type LmsEnrollment } from "@/modules/Lms/api";
import { LMS_TOKENS, useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import {
  LMS_CARD,
  LmsDashboardShell,
  useLmsCopy,
  LmsPanel,
  LmsProgressBar,
} from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";

type Tab = "all" | "in_progress" | "finished";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All Courses" },
  { key: "in_progress", label: "In progress" },
  { key: "finished", label: "Finished" },
];

/** The template's tab strip: purple underline on the active button. */
function Tabs({ value, onChange }: { value: Tab; onChange: (tab: Tab) => void }) {
  return (
    <div
      className="flex items-center gap-8 px-7 pt-5"
      style={{ borderBottom: `1px solid ${LMS_TOKENS.border}` }}
      role="tablist"
    >
      {TABS.map((tab) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className="relative pb-4 text-[15px] transition"
            style={{ color: active ? LMS_TOKENS.purple : LMS_TOKENS.muted }}
          >
            {tab.label}
            {active ? (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full"
                style={{ backgroundColor: LMS_TOKENS.purple }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function CourseTile({
  title,
  category,
  lessons,
  minutes,
  percent,
  href,
  footer,
}: {
  title: string;
  category?: string | null;
  lessons?: number;
  minutes?: number;
  percent?: number;
  href: string;
  footer?: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(LMS_CARD, "flex flex-col p-6 transition hover:shadow-lg")}>
      <div
        className="flex h-32 items-center justify-center rounded-xl"
        style={{ backgroundColor: LMS_TOKENS.lavender }}
      >
        <BookOpen className="size-9" style={{ color: LMS_TOKENS.purple }} />
      </div>

      {category ? (
        <div className="mt-5 text-[13px] font-medium uppercase tracking-wide" style={{ color: LMS_TOKENS.purple }}>
          {category}
        </div>
      ) : null}

      <h3 className="mt-2 text-[17px] font-medium leading-snug" style={{ color: LMS_TOKENS.navy }}>
        {title}
      </h3>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[14px]" style={{ color: LMS_TOKENS.muted }}>
        {typeof lessons === "number" ? <span>{lessons} lesson{lessons === 1 ? "" : "s"}</span> : null}
        {minutes ? (
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-4" />
            {minutes} min
          </span>
        ) : null}
      </div>

      {typeof percent === "number" ? (
        <div className="mt-5">
          <div className="flex items-center justify-between text-[14px]">
            <span style={{ color: LMS_TOKENS.muted }}>Progress</span>
            <span style={{ color: LMS_TOKENS.navy }}>{Math.round(percent)}%</span>
          </div>
          <LmsProgressBar percent={percent} className="mt-2.5" />
        </div>
      ) : null}

      {footer ? <div className="mt-5">{footer}</div> : null}
    </Link>
  );
}

export default function LearnCoursesPage() {
  const { brandSettings, brandName } = useLmsPublicBrand();
  const lms = useLmsCopy();
  const { role, isStaff } = useLmsRole();

  const [tab, setTab] = React.useState<Tab>("all");
  const [search, setSearch] = React.useState("");

  const myLearning = useQuery({
    queryKey: ["lms", "my-learning"],
    queryFn: learningApi.getMyLearning,
    enabled: !isStaff,
  });

  const catalogue = useQuery({
    queryKey: ["lms", "courses", "catalogue"],
    queryFn: () => learningApi.getCourses({ per_page: 200 }),
    enabled: isStaff,
  });

  const term = search.trim().toLowerCase();

  const enrolments: LmsEnrollment[] = React.useMemo(() => {
    let rows = myLearning.data ?? [];
    if (tab === "finished") rows = rows.filter((row) => row.status === "completed");
    if (tab === "in_progress") rows = rows.filter((row) => row.status !== "completed");
    if (term) {
      rows = rows.filter((row) => (row.course?.title ?? "").toLowerCase().includes(term));
    }
    return rows;
  }, [myLearning.data, tab, term]);

  const courses: LmsCourse[] = React.useMemo(() => {
    let rows = catalogue.data?.data ?? [];
    if (tab === "finished") rows = rows.filter((row) => row.status === "archived");
    if (tab === "in_progress") rows = rows.filter((row) => row.status === "published");
    if (term) rows = rows.filter((row) => row.title.toLowerCase().includes(term));
    return rows;
  }, [catalogue.data, tab, term]);

  const pending = isStaff ? catalogue.isPending : myLearning.isPending;
  const empty = isStaff ? courses.length === 0 : enrolments.length === 0;

  return (
    <LmsDashboardShell
      role={role}
      brandSettings={brandSettings}
      brandName={brandName}
      title={lms("page.courses.title", "My Courses")}
      subtitle={
        isStaff
          ? lms("page.courses.subtitle_staff", "Every course in your catalogue.")
          : lms(
              "page.courses.subtitle_learner",
              "The courses you are enrolled in, and how far through you are.",
            )
      }
      breadcrumbs={[
        { label: lms("common.dashboard", "Dashboard"), href: "/learn" },
        { label: lms("page.courses.title", "My Courses") },
      ]}
    >
      <LmsPanel bodyClassName="px-0 py-0">
        <Tabs value={tab} onChange={setTab} />

        <div className="flex flex-wrap items-center justify-between gap-4 px-7 py-6">
          <div className="relative w-full max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
              style={{ color: LMS_TOKENS.muted }}
            />
            <Input
              className="pl-9"
              placeholder="Search Courses"
              aria-label="Search courses"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="px-7 pb-7">
          {pending ? (
            <p className="py-6" style={{ color: LMS_TOKENS.muted }}>
              Loading courses…
            </p>
          ) : empty ? (
            <div className="py-12 text-center">
              <p style={{ color: LMS_TOKENS.muted }}>
                {term
                  ? `Nothing matches “${search.trim()}”.`
                  : isStaff
                    ? "No courses in the catalogue yet."
                    : "You are not enrolled in any course yet."}
              </p>
              {!isStaff && !term ? (
                <Link
                  href="/courses"
                  className="mt-4 inline-block text-[15px] underline"
                  style={{ color: LMS_TOKENS.purple }}
                >
                  Browse the course catalogue
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {isStaff
                ? courses.map((course) => (
                    <CourseTile
                      key={course.id}
                      href={`/courses/${course.id}`}
                      title={course.title}
                      category={course.category}
                      lessons={course.lessons_count ?? course.lessons?.length}
                      minutes={course.duration_minutes}
                      percent={course.completion_rate}
                      footer={
                        <span className="text-[14px]" style={{ color: LMS_TOKENS.muted }}>
                          {course.enrollments_count ?? 0} enrolled · {course.status}
                        </span>
                      }
                    />
                  ))
                : enrolments.map((enrolment) => (
                    <CourseTile
                      key={enrolment.id}
                      href={`/learn/courses/${enrolment.course_id}`}
                      title={enrolment.course?.title ?? "Course"}
                      category={enrolment.course?.category}
                      lessons={enrolment.course?.lessons_count ?? enrolment.course?.lessons?.length}
                      minutes={enrolment.course?.duration_minutes}
                      percent={enrolment.progress_percent ?? 0}
                      footer={
                        enrolment.due_at ? (
                          <span className="text-[14px]" style={{ color: LMS_TOKENS.muted }}>
                            Due {new Date(enrolment.due_at).toLocaleDateString()}
                          </span>
                        ) : null
                      }
                    />
                  ))}
            </div>
          )}
        </div>
      </LmsPanel>
    </LmsDashboardShell>
  );
}
