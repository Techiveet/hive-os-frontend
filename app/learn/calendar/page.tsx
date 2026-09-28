"use client";

import Link from "next/link";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { learningApi } from "@/modules/Lms/api";
import { myQuizApi, quizApi } from "@/modules/Lms/api/quizzes";
import { LMS_TOKENS, useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import { LmsDashboardShell, LmsPanel, useLmsCopy } from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";

/** The template's colour-coded event legend. */
const EVENT_KINDS = {
  due: { label: "Course deadlines", color: "#DC2626", tint: "#FDECEC" },
  quiz: { label: "Quiz deadlines", color: "#6440FB", tint: "#EBEAFE" },
  starts: { label: "Course starts", color: "#E59819", tint: "#FDF3E4" },
  ends: { label: "Course ends", color: "#2563EB", tint: "#E5F0FD" },
} as const;

type EventKind = keyof typeof EVENT_KINDS;

type CalendarEvent = {
  id: string;
  kind: EventKind;
  title: string;
  href?: string;
  /** Local YYYY-MM-DD, so events land on the day the learner sees. */
  day: string;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dayKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * The cells of a month grid, padded so the month always starts on a Monday and
 * fills whole weeks — the shape the template's table-calendar expects.
 */
function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  // getDay() is Sunday-first; the template's grid starts on Monday.
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - lead);

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    cells.push({ date, inMonth: date.getMonth() === month });
  }

  // Drop a trailing all-next-month week rather than always showing six rows.
  return cells.slice(0, cells.slice(35).every((cell) => !cell.inMonth) ? 35 : 42);
}

export default function LearnCalendarPage() {
  const { brandSettings, brandName } = useLmsPublicBrand();
  const lms = useLmsCopy();
  const { role, isStaff } = useLmsRole();

  const today = React.useMemo(() => new Date(), []);
  const [cursor, setCursor] = React.useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [hidden, setHidden] = React.useState<Set<EventKind>>(new Set());

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

  // Quizzes carry their own closing time now, so their deadlines sit on the
  // calendar alongside the course ones.
  const quizzes = useQuery({
    queryKey: ["lms", "quizzes", "calendar"],
    queryFn: () => (isStaff ? quizApi.list({ per_page: 200 }).then((r) => r.data) : myQuizApi.list()),
  });

  const events: CalendarEvent[] = React.useMemo(() => {
    const rows: CalendarEvent[] = [];

    for (const quiz of quizzes.data ?? []) {
      if (!quiz.due_at) continue;
      rows.push({
        id: `quiz-${quiz.id}`,
        kind: "quiz",
        title: quiz.title,
        href: isStaff ? `/learn/quizzes/${quiz.id}/edit` : "/learn/quizzes",
        day: dayKey(quiz.due_at),
      });
    }

    if (isStaff) {
      for (const course of catalogue.data?.data ?? []) {
        if (course.starts_at) {
          rows.push({
            id: `${course.id}-starts`,
            kind: "starts",
            title: course.title,
            href: `/learn/courses/${course.id}`,
            day: dayKey(course.starts_at),
          });
        }
        if (course.ends_at) {
          rows.push({
            id: `${course.id}-ends`,
            kind: "ends",
            title: course.title,
            href: `/learn/courses/${course.id}`,
            day: dayKey(course.ends_at),
          });
        }
      }
      return rows;
    }

    for (const enrolment of myLearning.data ?? []) {
      if (enrolment.due_at) {
        rows.push({
          id: `${enrolment.id}-due`,
          kind: "due",
          title: enrolment.course?.title ?? "Course",
          href: `/learn/courses/${enrolment.course_id}`,
          day: dayKey(enrolment.due_at),
        });
      }
      if (enrolment.course?.starts_at) {
        rows.push({
          id: `${enrolment.id}-starts`,
          kind: "starts",
          title: enrolment.course.title,
          href: `/learn/courses/${enrolment.course_id}`,
          day: dayKey(enrolment.course.starts_at),
        });
      }
    }
    return rows;
  }, [isStaff, catalogue.data, myLearning.data, quizzes.data]);

  const byDay = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      if (!event.day || hidden.has(event.kind)) continue;
      map.set(event.day, [...(map.get(event.day) ?? []), event]);
    }
    return map;
  }, [events, hidden]);

  const cells = monthGrid(cursor.getFullYear(), cursor.getMonth());
  const todayKey = dayKey(today);

  const toggle = (kind: EventKind) =>
    setHidden((current) => {
      const next = new Set(current);
      if (!next.delete(kind)) next.add(kind);
      return next;
    });

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <LmsDashboardShell
      role={role}
      brandSettings={brandSettings}
      brandName={brandName}
      title={lms("page.calendar.title", "Calendar")}
      subtitle={
        isStaff
          ? lms("page.calendar.subtitle_staff", "When your courses run.")
          : lms("page.calendar.subtitle_learner", "Your course deadlines at a glance.")
      }
      breadcrumbs={[{ label: lms("common.dashboard", "Dashboard"), href: "/learn" }, { label: lms("nav.calendar", "Calendar") }]}
    >
      <div className="grid gap-7 xl:grid-cols-4">
        <LmsPanel
          title={monthLabel}
          className="xl:col-span-3"
          bodyClassName="px-4 py-4 sm:px-7 sm:py-7"
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous month"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next month"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <div className="min-w-[42rem]">
              <div className="grid grid-cols-7">
                {WEEKDAYS.map((weekday) => (
                  <div
                    key={weekday}
                    className="border-b px-3 py-3 text-[14px] font-medium"
                    style={{ borderColor: LMS_TOKENS.border, color: LMS_TOKENS.muted }}
                  >
                    {weekday}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {cells.map(({ date, inMonth }) => {
                  const key = dayKey(date);
                  const dayEvents = byDay.get(key) ?? [];
                  const isToday = key === todayKey;

                  return (
                    <div
                      key={key}
                      className={cn("min-h-24 border-b border-r p-2 last:border-r-0")}
                      style={{
                        borderColor: LMS_TOKENS.border,
                        backgroundColor: inMonth ? "transparent" : LMS_TOKENS.lightBg,
                      }}
                    >
                      <div
                        className={cn(
                          "flex size-7 items-center justify-center rounded-full text-[14px]",
                          isToday && "font-semibold",
                        )}
                        style={{
                          backgroundColor: isToday ? LMS_TOKENS.purple : "transparent",
                          color: isToday
                            ? "#FFFFFF"
                            : inMonth
                              ? LMS_TOKENS.navy
                              : LMS_TOKENS.muted,
                        }}
                      >
                        {date.getDate()}
                      </div>

                      <ul className="mt-1.5 flex flex-col gap-1">
                        {dayEvents.map((event) => {
                          const kind = EVENT_KINDS[event.kind];
                          const body = (
                            <span
                              className="block truncate rounded px-1.5 py-1 text-[12px]"
                              style={{ backgroundColor: kind.tint, color: kind.color }}
                              title={`${kind.label}: ${event.title}`}
                            >
                              {event.title}
                            </span>
                          );
                          return (
                            <li key={event.id}>
                              {event.href ? <Link href={event.href}>{body}</Link> : body}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </LmsPanel>

        <LmsPanel title={lms("page.calendar.panel", "Event Keys")}>
          <ul className="flex flex-col gap-4">
            {(Object.keys(EVENT_KINDS) as EventKind[]).map((kind) => {
              const entry = EVENT_KINDS[kind];
              const off = hidden.has(kind);
              return (
                <li key={kind}>
                  <button
                    type="button"
                    onClick={() => toggle(kind)}
                    aria-pressed={!off}
                    className="flex w-full items-center gap-3 text-left text-[15px] transition"
                    style={{ color: off ? LMS_TOKENS.muted : LMS_TOKENS.navy, opacity: off ? 0.55 : 1 }}
                  >
                    <span
                      aria-hidden="true"
                      className="size-4 shrink-0 rounded"
                      style={{ backgroundColor: entry.color }}
                    />
                    {off ? `Show ${entry.label.toLowerCase()}` : entry.label}
                  </button>
                </li>
              );
            })}
          </ul>

          {events.length === 0 ? (
            <p className="mt-6 text-[14px]" style={{ color: LMS_TOKENS.muted }}>
              Nothing scheduled yet. Course start dates and deadlines appear here.
            </p>
          ) : null}
        </LmsPanel>
      </div>
    </LmsDashboardShell>
  );
}
