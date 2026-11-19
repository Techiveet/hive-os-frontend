"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  Home,
  PlayCircle,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenantModuleAccess } from "@/hooks/use-tenant-module-access";
import { learningApi } from "@/modules/Lms/api";

type StatProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "warn";
};

function Stat({ label, value, hint, icon: Icon, tone = "default" }: StatProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className={tone === "warn" ? "size-4 text-amber-500" : "size-4 text-muted-foreground"} />
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Action({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-primary/50 hover:bg-card"
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </Link>
  );
}

/**
 * What the administrator of a school sees when they open /dashboard.
 *
 * The ERP dashboard is built around stock, fulfilment and shifts; none of it
 * means anything for a learning tenant. This shows the numbers a school owner
 * actually asks about, and puts the things only they can do — add teachers,
 * manage the plan — one click away, since the learning space itself lives at
 * /learn.
 */
export function LmsAdminDashboard() {
  const { hasModule } = useTenantModuleAccess();
  const hasVideo = hasModule("video_conferencing");

  const summary = useQuery({ queryKey: ["lms", "summary"], queryFn: () => learningApi.getSummary() });
  const staff = useQuery({ queryKey: ["lms", "staff"], queryFn: () => learningApi.getStaff() });

  const stats = summary.data?.stats;
  const teachers = staff.data?.length;
  const loading = summary.isLoading;
  const failed = summary.isError;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex w-full items-center justify-end">
        <Breadcrumbs items={[{ label: "Hive.OS", href: "/", icon: <Home className="h-4 w-4" /> }, { label: "Dashboard" }]} />
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">School overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Courses, learners and teaching staff at a glance.
          </p>
        </div>
        <Button asChild>
          <Link href="/learn">
            <GraduationCap className="mr-2 size-4" />
            Open learning space
          </Link>
        </Button>
      </div>

      {failed ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm">
          <p className="font-semibold">The learning data could not be loaded.</p>
          <p className="mt-1 text-muted-foreground">
            Check that Learning Management is included in this workspace&apos;s plan under Subscriptions, then reload.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href="/dashboard/subscriptions">Open subscriptions</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)
          ) : (
            <>
              <Stat
                label="Courses"
                value={stats?.courses ?? 0}
                hint={`${stats?.published_courses ?? 0} published · ${stats?.draft_courses ?? 0} draft`}
                icon={BookOpen}
              />
              <Stat
                label="Enrolments"
                value={stats?.enrollments ?? 0}
                hint={`${stats?.active_enrollments ?? 0} in progress`}
                icon={Users}
              />
              <Stat
                label="Completed"
                value={stats?.completed_enrollments ?? 0}
                hint={`${stats?.average_progress ?? 0}% average progress`}
                icon={CheckCircle2}
              />
              <Stat
                label="Overdue"
                value={stats?.overdue_enrollments ?? 0}
                hint="Past their due date"
                icon={AlertTriangle}
                tone={(stats?.overdue_enrollments ?? 0) > 0 ? "warn" : "default"}
              />
            </>
          )}
        </div>
      )}

      <section aria-labelledby="lms-admin-actions" className="space-y-3">
        <h2 id="lms-admin-actions" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Run your school
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Action
            href="/learn/staff"
            icon={UserPlus}
            title="Add a teacher"
            description={teachers === undefined ? "Create teacher and assistant accounts." : `${teachers} teaching staff so far. Create teacher and assistant accounts.`}
          />
          <Action href="/learn/courses" icon={PlayCircle} title="Courses" description="Create, publish and review courses." />
          {hasVideo ? (
            <Action href="/learn/live" icon={Video} title="Live classes" description="Schedule and join online classes." />
          ) : null}
          <Action href="/dashboard/subscriptions" icon={CreditCard} title="Plan & modules" description="Add modules and manage billing." />
          <Action href="/dashboard/security" icon={ShieldCheck} title="Users & security" description="Roles, access and sign-in policy." />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="size-4 text-muted-foreground" /> Recent courses
            </h2>
            <Link href="/learn/courses" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <ul className="mt-4 divide-y divide-border/50">
            {summary.data?.recent_courses?.length ? (
              summary.data.recent_courses.map((course) => (
                <li key={course.id} className="flex items-center justify-between gap-3 py-3">
                  <Link href={`/learn/courses/${course.id}`} className="min-w-0 truncate text-sm font-medium hover:underline">
                    {course.title}
                  </Link>
                  <Badge variant="outline" className="shrink-0 capitalize">{course.status}</Badge>
                </li>
              ))
            ) : (
              <li className="py-6 text-sm text-muted-foreground">
                {loading ? "Loading…" : "No courses yet. Add a teacher, or create the first course yourself."}
              </li>
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="size-4 text-muted-foreground" /> Due in the next 7 days
          </h2>
          <ul className="mt-4 divide-y divide-border/50">
            {summary.data?.due_soon?.length ? (
              summary.data.due_soon.map((enrollment) => (
                <li key={enrollment.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{enrollment.learner?.name ?? "Learner"}</span>
                    <span className="text-muted-foreground"> · {enrollment.course?.title}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {enrollment.due_at ? new Date(enrollment.due_at).toLocaleDateString() : ""}
                  </span>
                </li>
              ))
            ) : (
              <li className="py-6 text-sm text-muted-foreground">{loading ? "Loading…" : "Nothing is due this week."}</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
