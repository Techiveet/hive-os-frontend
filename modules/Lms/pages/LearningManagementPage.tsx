"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Archive,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Layers3,
  PenLine,
  Plus,
  Search,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/hooks/use-permissions";
import { LmsResourceField } from "@/modules/Lms/components/lms-resource-field";
import { useLmsCopy } from "@/modules/Lms/components/lms-dashboard-shell";
import { cn } from "@/lib/utils";
import {
  learningApi,
  type LmsCourse,
  type LmsCourseLevel,
  type LmsCourseStatus,
  type LmsEnrollment,
  type LmsEnrollmentStatus,
  type LmsLesson,
  type LmsUser,
} from "@/modules/Lms/api";

type LearningTab = "overview" | "courses" | "learners" | "reports" | "my-learning";

type LearningManagementPageProps = {
  initialTab?: LearningTab;
};

const courseLevels: LmsCourseLevel[] = ["beginner", "intermediate", "advanced", "expert"];
const courseStatuses: Array<LmsCourseStatus | "all"> = ["all", "draft", "published", "archived"];
const enrollmentStatuses: Array<LmsEnrollmentStatus | "all"> = ["all", "assigned", "in_progress", "completed", "overdue", "cancelled"];

export default function LearningManagementPage({ initialTab = "overview" }: LearningManagementPageProps) {
  const lms = useLmsCopy();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { hasAnyPermission } = usePermissions();
  const [activeTab, setActiveTab] = React.useState<LearningTab>(() =>
    searchParams.get("tab") === "my-learning" ? "my-learning" : initialTab
  );
  const [courseSearch, setCourseSearch] = React.useState("");
  const [courseStatus, setCourseStatus] = React.useState<LmsCourseStatus | "all">("all");
  const [courseLevel, setCourseLevel] = React.useState<LmsCourseLevel | "all">("all");
  const [enrollmentStatus, setEnrollmentStatus] = React.useState<LmsEnrollmentStatus | "all">("all");
  const [courseDialogOpen, setCourseDialogOpen] = React.useState(false);
  /** The course the dialog is editing; null means it is creating a new one. */
  const [editingCourse, setEditingCourse] = React.useState<LmsCourse | null>(null);
  const [lessonCourse, setLessonCourse] = React.useState<LmsCourse | null>(null);
  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = React.useState(false);

  React.useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "my-learning") {
      setActiveTab("my-learning");
    }
  }, [searchParams]);

  const canManageCourses = hasAnyPermission(["create_lms_courses", "manage_lms_courses", "manage_learning_management"]);
  const canAssignCourses = hasAnyPermission(["assign_lms_courses", "manage_lms_enrollments", "manage_learning_management"]);
  const canViewOverview = hasAnyPermission(["view_learning_management", "manage_learning_management", "view_lms_courses", "manage_lms_courses"]);
  const canViewCourses = hasAnyPermission(["view_lms_courses", "manage_lms_courses", "view_learning_management", "manage_learning_management"]);
  const canViewLearners = hasAnyPermission(["view_lms_learners", "manage_lms_enrollments", "manage_learning_management"]);
  const canViewReports = hasAnyPermission(["view_lms_reports", "manage_lms_reports", "manage_learning_management"]);
  const canViewMyLearning = hasAnyPermission(["view_my_learning", "view_learning_management", "manage_learning_management"]);

  const summaryQuery = useQuery({
    queryKey: ["learning-summary"],
    queryFn: learningApi.getSummary,
    enabled: canViewOverview,
  });

  const coursesQuery = useQuery({
    queryKey: ["learning-courses", { courseSearch, courseStatus, courseLevel }],
    queryFn: () => learningApi.getCourses({
      search: courseSearch || undefined,
      status: courseStatus,
      level: courseLevel,
      per_page: 100,
    }),
    enabled: canViewCourses || canAssignCourses,
  });

  const enrollmentsQuery = useQuery({
    queryKey: ["learning-enrollments", { enrollmentStatus }],
    queryFn: () => learningApi.getEnrollments({ status: enrollmentStatus, per_page: 100 }),
    enabled: canViewLearners || canAssignCourses,
  });

  const learnersQuery = useQuery({
    queryKey: ["learning-learners"],
    queryFn: learningApi.getLearners,
    enabled: canViewLearners,
  });

  const reportsQuery = useQuery({
    queryKey: ["learning-reports"],
    queryFn: learningApi.getReports,
    enabled: canViewReports,
  });

  const myLearningQuery = useQuery({
    queryKey: ["my-learning"],
    queryFn: learningApi.getMyLearning,
    enabled: canViewMyLearning,
  });

  const publishMutation = useMutation({
    mutationFn: learningApi.publishCourse,
    onSuccess: () => {
      toast.success(lms("admin.toast.course_published", "Course published."));
      invalidateLearning(queryClient);
    },
    onError: (error) => toast.error(errorMessage(error, lms("admin.toast.publish_failed", "Unable to publish course."))),
  });

  const archiveMutation = useMutation({
    mutationFn: learningApi.archiveCourse,
    onSuccess: () => {
      toast.success(lms("admin.toast.course_archived", "Course archived."));
      invalidateLearning(queryClient);
    },
    onError: (error) => toast.error(errorMessage(error, lms("admin.toast.archive_failed", "Unable to archive course."))),
  });

  const completeLessonMutation = useMutation({
    mutationFn: ({ enrollmentId, lessonId }: { enrollmentId: string; lessonId: string }) =>
      learningApi.updateLessonProgress(enrollmentId, lessonId, { status: "completed", progress_percent: 100 }),
    onSuccess: () => {
      toast.success(lms("admin.toast.lesson_complete", "Lesson marked complete."));
      invalidateLearning(queryClient);
    },
    onError: (error) => toast.error(errorMessage(error, lms("admin.toast.progress_failed", "Unable to update progress."))),
  });

  const courses = coursesQuery.data?.data || [];
  const enrollments = enrollmentsQuery.data?.data || [];
  const summary = summaryQuery.data;
  const reports = reportsQuery.data;
  const learners = learnersQuery.data || [];
  const myLearning = myLearningQuery.data || [];
  const loading = summaryQuery.isLoading || coursesQuery.isLoading;

  if (loading) {
    return <LearningSkeleton />;
  }

  return (
    <main className="space-y-8 pb-16" aria-labelledby="learning-management-title">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
            {lms("admin.badge", "Training operations")}
          </div>
          <div>
            <h1 id="learning-management-title" className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {lms("admin.title", "Learning Management")}
            </h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-muted-foreground">
              {lms(
                "admin.intro",
                "Build courses, assign training, monitor learner progress, and keep compliance-ready training reports in one tenant workspace.",
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAssignCourses && (
            <Button variant="outline" onClick={() => setEnrollmentDialogOpen(true)} className="min-h-11">
              <Send className="mr-2 h-4 w-4" aria-hidden="true" />
              {lms("admin.assign_learners", "Assign learners")}
            </Button>
          )}
          {canManageCourses && (
            <Button onClick={() => setCourseDialogOpen(true)} className="min-h-11">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {lms("admin.create_course", "Create course")}
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as LearningTab)} className="space-y-6">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1 md:w-fit" aria-label={lms("admin.tabs.aria", "Learning management sections")}>
          <TabsTrigger value="overview">{lms("admin.tabs.overview", "Overview")}</TabsTrigger>
          <TabsTrigger value="courses">{lms("admin.tabs.courses", "Courses")}</TabsTrigger>
          <TabsTrigger value="learners">{lms("admin.tabs.learners", "Learners")}</TabsTrigger>
          <TabsTrigger value="reports">{lms("admin.tabs.reports", "Reports")}</TabsTrigger>
          <TabsTrigger value="my-learning">{lms("admin.tabs.my_learning", "My Learning")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewSection summary={summary} courses={courses} enrollments={enrollments} />
        </TabsContent>

        <TabsContent value="courses" className="space-y-6">
          <CoursesSection
            courses={courses}
            search={courseSearch}
            status={courseStatus}
            level={courseLevel}
            canManageCourses={canManageCourses}
            onSearchChange={setCourseSearch}
            onStatusChange={setCourseStatus}
            onLevelChange={setCourseLevel}
            onCreateCourse={() => {
              setEditingCourse(null);
              setCourseDialogOpen(true);
            }}
            onEditCourse={(course) => {
              setEditingCourse(course);
              setCourseDialogOpen(true);
            }}
            onAddLesson={setLessonCourse}
            onPublish={(course) => publishMutation.mutate(course.id)}
            onArchive={(course) => archiveMutation.mutate(course.id)}
          />
        </TabsContent>

        <TabsContent value="learners" className="space-y-6">
          <LearnersSection
            learners={learners}
            enrollments={enrollments}
            enrollmentStatus={enrollmentStatus}
            onEnrollmentStatusChange={setEnrollmentStatus}
          />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <ReportsSection reports={reports} />
        </TabsContent>

        <TabsContent value="my-learning" className="space-y-6">
          <MyLearningSection
            enrollments={myLearning}
            onCompleteLesson={(enrollmentId, lessonId) => completeLessonMutation.mutate({ enrollmentId, lessonId })}
            isCompleting={completeLessonMutation.isPending}
          />
        </TabsContent>
      </Tabs>

      <CourseDialog
        open={courseDialogOpen}
        course={editingCourse}
        onOpenChange={(open) => {
          setCourseDialogOpen(open);
          if (!open) setEditingCourse(null);
        }}
      />
      <LessonDialog course={lessonCourse} onOpenChange={(open) => !open && setLessonCourse(null)} />
      <EnrollmentDialog open={enrollmentDialogOpen} onOpenChange={setEnrollmentDialogOpen} courses={courses} />
    </main>
  );
}

function OverviewSection({ summary, courses, enrollments }: { summary?: Awaited<ReturnType<typeof learningApi.getSummary>>; courses: LmsCourse[]; enrollments: LmsEnrollment[] }) {
  const lms = useLmsCopy();
  const stats = summary?.stats || {
    courses: 0,
    published_courses: 0,
    draft_courses: 0,
    enrollments: 0,
    active_enrollments: 0,
    completed_enrollments: 0,
    overdue_enrollments: 0,
    average_progress: 0,
  };

  return (
    <section className="space-y-6" aria-labelledby="learning-overview-heading">
      <h2 id="learning-overview-heading" className="sr-only">{lms("admin.overview.heading", "Learning overview")}</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title={lms("admin.overview.published_courses", "Published courses")} value={stats.published_courses} detail={`${stats.draft_courses} drafts`} icon={BookOpen} />
        <MetricCard title={lms("admin.overview.active_enrollments", "Active enrollments")} value={stats.active_enrollments} detail={`${stats.enrollments} total assignments`} icon={Users} tone="blue" />
        <MetricCard title={lms("admin.overview.completion", "Completion")} value={`${stats.average_progress}%`} detail={`${stats.completed_enrollments} completed`} icon={CheckCircle2} tone="emerald" />
        <MetricCard title={lms("admin.overview.overdue", "Overdue")} value={stats.overdue_enrollments} detail={lms("admin.overview.needs_follow_up", "Needs follow-up")} icon={AlertCircle} tone={stats.overdue_enrollments > 0 ? "rose" : "muted"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="space-y-4" aria-labelledby="recent-courses-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="recent-courses-heading" className="text-xl font-semibold tracking-tight">{lms("admin.overview.recent_courses", "Recent courses")}</h2>
            <Badge variant="outline">{courses.length} in catalog</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {courses.slice(0, 4).map((course) => (
              <CourseSummary key={course.id} course={course} />
            ))}
            {courses.length === 0 && <EmptyState
                title={lms("admin.overview.empty_title", "No courses yet")}
                description={lms("admin.overview.empty_desc", "Create your first course to start assigning training.")}
              />}
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="due-soon-heading">
          <h2 id="due-soon-heading" className="text-xl font-semibold tracking-tight">{lms("admin.overview.due_soon", "Due soon")}</h2>
          <div className="space-y-3">
            {(summary?.due_soon || enrollments.slice(0, 5)).map((enrollment) => (
              <div key={enrollment.id} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{enrollment.learner?.name || "Learner"}</p>
                    <p className="text-sm text-muted-foreground">{enrollment.course?.title || "Course assignment"}</p>
                  </div>
                  <StatusBadge status={enrollment.status} />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Progress value={enrollment.progress_percent} aria-label={`${enrollment.progress_percent}% complete`} />
                  <span className="w-12 text-right text-sm font-medium tabular-nums">{enrollment.progress_percent}%</span>
                </div>
              </div>
            ))}
            {(summary?.due_soon || []).length === 0 && enrollments.length === 0 && (
              <EmptyState
                title={lms("admin.overview.due_empty_title", "No urgent assignments")}
                description={lms("admin.overview.due_empty_desc", "Due soon assignments will appear here.")}
              />
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

function CoursesSection({
  courses,
  search,
  status,
  level,
  canManageCourses,
  onSearchChange,
  onStatusChange,
  onLevelChange,
  onCreateCourse,
  onEditCourse,
  onAddLesson,
  onPublish,
  onArchive,
}: {
  courses: LmsCourse[];
  search: string;
  status: LmsCourseStatus | "all";
  level: LmsCourseLevel | "all";
  canManageCourses: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: LmsCourseStatus | "all") => void;
  onLevelChange: (value: LmsCourseLevel | "all") => void;
  onCreateCourse: () => void;
  onEditCourse: (course: LmsCourse) => void;
  onAddLesson: (course: LmsCourse) => void;
  onPublish: (course: LmsCourse) => void;
  onArchive: (course: LmsCourse) => void;
}) {
  const lms = useLmsCopy();
  return (
    <section className="space-y-5" aria-labelledby="courses-heading">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 id="courses-heading" className="text-2xl font-semibold tracking-tight">{lms("admin.catalog.heading", "Course catalog")}</h2>
          <p className="text-sm text-muted-foreground">
            {lms("admin.catalog.subheading", "Filter courses, publish training, and extend lesson plans.")}
          </p>
        </div>
        {canManageCourses && (
          <Button onClick={onCreateCourse} className="min-h-11 lg:self-center">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {lms("admin.create_course", "Create course")}
          </Button>
        )}
      </div>

      <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1fr_180px_180px]">
        <div className="space-y-2">
          <Label htmlFor="lms-course-search">{lms("admin.catalog.search_label", "Search courses")}</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="lms-course-search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="pl-9"
              placeholder={lms("admin.catalog.search_placeholder", "Search by title, code, or category")}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lms-course-status">{lms("admin.catalog.status", "Status")}</Label>
          <Select value={status} onValueChange={(value) => onStatusChange(value as LmsCourseStatus | "all")}>
            <SelectTrigger id="lms-course-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {courseStatuses.map((item) => (
                <SelectItem key={item} value={item}>{enumLabel(lms, item)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lms-course-level">{lms("admin.catalog.level", "Level")}</Label>
          <Select value={level} onValueChange={(value) => onLevelChange(value as LmsCourseLevel | "all")}>
            <SelectTrigger id="lms-course-level" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{lms("admin.catalog.all_levels", "All levels")}</SelectItem>
              {courseLevels.map((item) => (
                <SelectItem key={item} value={item}>{enumLabel(lms, item)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableCaption>
            {lms(
              "admin.catalog.caption",
              "Courses with lesson count, enrollment count, completion, and available management actions.",
            )}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{lms("admin.catalog.col_course", "Course")}</TableHead>
              <TableHead scope="col">{lms("admin.catalog.col_level", "Level")}</TableHead>
              <TableHead scope="col">{lms("admin.catalog.col_lessons", "Lessons")}</TableHead>
              <TableHead scope="col">{lms("admin.catalog.col_enrollments", "Enrollments")}</TableHead>
              <TableHead scope="col">{lms("admin.catalog.col_completion", "Completion")}</TableHead>
              <TableHead scope="col">{lms("admin.catalog.col_status", "Status")}</TableHead>
              <TableHead scope="col" className="text-right">{lms("admin.catalog.col_actions", "Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell className="min-w-72 whitespace-normal">
                  <div className="font-medium">{course.title}</div>
                  <div className="text-sm text-muted-foreground">{course.code || "No code"} {course.category ? `- ${course.category}` : ""}</div>
                </TableCell>
                <TableCell>{enumLabel(lms, course.level)}</TableCell>
                <TableCell>{course.lessons_count ?? course.lessons?.length ?? 0}</TableCell>
                <TableCell>{course.enrollments_count ?? 0}</TableCell>
                <TableCell className="min-w-36">
                  <div className="flex items-center gap-3">
                    <Progress value={course.completion_rate || 0} aria-label={`${course.completion_rate || 0}% completion`} />
                    <span className="w-10 text-right text-sm tabular-nums">{course.completion_rate || 0}%</span>
                  </div>
                </TableCell>
                <TableCell><CourseStatusBadge status={course.status} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    {canManageCourses && (
                      <Button variant="outline" size="sm" onClick={() => onEditCourse(course)}>
                        <PenLine className="mr-2 h-4 w-4" aria-hidden="true" />
                        {lms("admin.catalog.edit", "Edit")}
                      </Button>
                    )}
                    {canManageCourses && (
                      <Button variant="outline" size="sm" onClick={() => onAddLesson(course)}>
                        <Layers3 className="mr-2 h-4 w-4" aria-hidden="true" />
                        {lms("admin.catalog.lesson", "Lesson")}
                      </Button>
                    )}
                    {canManageCourses && course.status !== "published" && (
                      <Button size="sm" onClick={() => onPublish(course)}>{lms("admin.catalog.publish", "Publish")}</Button>
                    )}
                    {canManageCourses && course.status !== "archived" && (
                      <Button variant="ghost" size="sm" onClick={() => onArchive(course)}>
                        <Archive className="mr-2 h-4 w-4" aria-hidden="true" />
                        {lms("admin.catalog.archive", "Archive")}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {courses.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10">
                  <EmptyState
                    title={lms("admin.catalog.empty_title", "No courses match this filter")}
                    description={lms("admin.catalog.empty_desc", "Clear filters or create a new course.")}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function LearnersSection({
  learners,
  enrollments,
  enrollmentStatus,
  onEnrollmentStatusChange,
}: {
  learners: Awaited<ReturnType<typeof learningApi.getLearners>>;
  enrollments: LmsEnrollment[];
  enrollmentStatus: LmsEnrollmentStatus | "all";
  onEnrollmentStatusChange: (status: LmsEnrollmentStatus | "all") => void;
}) {
  const lms = useLmsCopy();
  return (
    <section className="space-y-6" aria-labelledby="learners-heading">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 id="learners-heading" className="text-2xl font-semibold tracking-tight">{lms("admin.learners.heading", "Learners")}</h2>
          <p className="text-sm text-muted-foreground">
            {lms("admin.learners.subheading", "Track learner load, completion, and assignment status.")}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lms-enrollment-status">{lms("admin.learners.status_label", "Assignment status")}</Label>
          <Select value={enrollmentStatus} onValueChange={(value) => onEnrollmentStatusChange(value as LmsEnrollmentStatus | "all")}>
            <SelectTrigger id="lms-enrollment-status" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {enrollmentStatuses.map((item) => (
                <SelectItem key={item} value={item}>{enumLabel(lms, item)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {learners.map((learner) => (
          <div key={learner.user_id} className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">{learner.learner?.name || `User ${learner.user_id}`}</h3>
                <p className="text-sm text-muted-foreground">{learner.learner?.email || "No email available"}</p>
              </div>
              <Badge variant="outline">
                {learner.enrollments_count} {lms("admin.learners.assigned_count", "assigned")}
              </Badge>
            </div>
            <div className="mt-5 space-y-3">
              <Progress value={Number(learner.average_progress || 0)} aria-label={`${learner.average_progress || 0}% average progress`} />
              <div className="grid grid-cols-3 gap-2 text-sm">
                <MiniStat label={lms("admin.learners.active", "Active")} value={learner.active_count} />
                <MiniStat label={lms("admin.learners.done", "Done")} value={learner.completed_count} />
                <MiniStat label={lms("admin.learners.average", "Average")} value={`${learner.average_progress || 0}%`} />
              </div>
            </div>
          </div>
        ))}
        {learners.length === 0 && <EmptyState
            title={lms("admin.learners.empty_title", "No learner activity yet")}
            description={lms("admin.learners.empty_desc", "Assigned learners will appear here.")}
          />}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableCaption>{lms("admin.learners.caption", "Training assignment table filtered by selected status.")}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{lms("admin.learners.col_learner", "Learner")}</TableHead>
              <TableHead scope="col">{lms("admin.learners.col_course", "Course")}</TableHead>
              <TableHead scope="col">{lms("admin.learners.col_due", "Due")}</TableHead>
              <TableHead scope="col">{lms("admin.learners.col_progress", "Progress")}</TableHead>
              <TableHead scope="col">{lms("admin.learners.col_status", "Status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((enrollment) => (
              <TableRow key={enrollment.id}>
                <TableCell className="min-w-56 whitespace-normal">
                  <div className="font-medium">{enrollment.learner?.name || "Learner"}</div>
                  <div className="text-sm text-muted-foreground">{enrollment.learner?.email}</div>
                </TableCell>
                <TableCell className="min-w-64 whitespace-normal">{enrollment.course?.title || "Course"}</TableCell>
                <TableCell>{formatDate(enrollment.due_at)}</TableCell>
                <TableCell className="min-w-40">
                  <div className="flex items-center gap-3">
                    <Progress value={enrollment.progress_percent} aria-label={`${enrollment.progress_percent}% complete`} />
                    <span className="w-10 text-right text-sm tabular-nums">{enrollment.progress_percent}%</span>
                  </div>
                </TableCell>
                <TableCell><StatusBadge status={enrollment.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function ReportsSection({ reports }: { reports?: Awaited<ReturnType<typeof learningApi.getReports>> }) {
  const lms = useLmsCopy();
  const topCourses = reports?.top_courses || [];
  const statusBreakdown = reports?.status_breakdown || [];
  const categoryBreakdown = reports?.category_breakdown || [];

  return (
    <section className="space-y-6" aria-labelledby="reports-heading">
      <div>
        <h2 id="reports-heading" className="text-2xl font-semibold tracking-tight">{lms("admin.reports.heading", "Learning reports")}</h2>
        <p className="text-sm text-muted-foreground">
          {lms("admin.reports.subheading", "Completion, category, and catalog health for leadership review.")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownPanel title={lms("admin.reports.enrollment_status", "Enrollment status")} items={statusBreakdown.map((item) => ({ label: enumLabel(lms, item.status), value: item.value }))} />
        <BreakdownPanel title={lms("admin.reports.course_categories", "Course categories")} items={categoryBreakdown.map((item) => ({ label: item.category, value: item.value }))} />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableCaption>{lms("admin.reports.caption", "Top courses by enrollment volume.")}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{lms("admin.reports.col_course", "Course")}</TableHead>
              <TableHead scope="col">{lms("admin.reports.col_category", "Category")}</TableHead>
              <TableHead scope="col">{lms("admin.reports.col_enrollments", "Enrollments")}</TableHead>
              <TableHead scope="col">{lms("admin.reports.col_completed", "Completed")}</TableHead>
              <TableHead scope="col">{lms("admin.reports.col_completion", "Completion")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topCourses.map((course) => (
              <TableRow key={course.id}>
                <TableCell className="min-w-72 whitespace-normal">
                  <div className="font-medium">{course.title}</div>
                  <div className="text-sm text-muted-foreground">{course.code || "No code"}</div>
                </TableCell>
                <TableCell>{course.category || "Uncategorized"}</TableCell>
                <TableCell>{course.enrollments_count || 0}</TableCell>
                <TableCell>{course.completed_enrollments_count || 0}</TableCell>
                <TableCell className="min-w-40">
                  <Progress value={course.completion_rate || 0} aria-label={`${course.completion_rate || 0}% completion`} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function MyLearningSection({
  enrollments,
  onCompleteLesson,
  isCompleting,
}: {
  enrollments: LmsEnrollment[];
  onCompleteLesson: (enrollmentId: string, lessonId: string) => void;
  isCompleting: boolean;
}) {
  const lms = useLmsCopy();
  return (
    <section className="space-y-6" aria-labelledby="my-learning-heading">
      <div>
        <h2 id="my-learning-heading" className="text-2xl font-semibold tracking-tight">{lms("admin.tabs.my_learning", "My Learning")}</h2>
        <p className="text-sm text-muted-foreground">
          {lms("admin.my_learning.intro", "Continue assigned training and mark lessons complete as you finish them.")}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {enrollments.map((enrollment) => {
          const lessons = enrollment.course?.lessons || [];
          const progress = enrollment.lesson_progress || [];
          const nextLesson = lessons.find((lesson) => {
            const current = progress.find((item) => item.lesson_id === lesson.id);
            return current?.status !== "completed";
          });

          return (
            <div key={enrollment.id} className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{enrollment.course?.title || "Assigned course"}</h3>
                  <p className="text-sm text-muted-foreground">{enrollment.course?.summary || "Complete all required lessons for this course."}</p>
                </div>
                <StatusBadge status={enrollment.status} />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Progress value={enrollment.progress_percent} aria-label={`${enrollment.progress_percent}% complete`} />
                <span className="w-12 text-right text-sm font-medium tabular-nums">{enrollment.progress_percent}%</span>
              </div>
              <div className="mt-5 space-y-2">
                {lessons.map((lesson) => {
                  const current = progress.find((item) => item.lesson_id === lesson.id);
                  const completed = current?.status === "completed";
                  return (
                    <div key={lesson.id} className="flex items-center justify-between gap-3 rounded-md border bg-background p-3">
                      <div>
                        <p className="font-medium">{lesson.title}</p>
                        <p className="text-sm text-muted-foreground">{enumLabel(lms, lesson.content_type)} - {lesson.duration_minutes || 0} min</p>
                      </div>
                      {completed ? (
                        <Badge className="bg-emerald-700 text-white">{lms("admin.my_learning.complete", "Complete")}</Badge>
                      ) : (
                        <Badge variant="outline">{lms("admin.my_learning.open", "Open")}</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
              {nextLesson && (
                <Button
                  className="mt-5 min-h-11 w-full"
                  disabled={isCompleting}
                  onClick={() => onCompleteLesson(enrollment.id, nextLesson.id)}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  {lms("admin.my_learning.complete_next", "Complete next lesson")}
                </Button>
              )}
            </div>
          );
        })}
        {enrollments.length === 0 && <EmptyState
            title={lms("admin.my_learning.empty_title", "No assigned training")}
            description={lms("admin.my_learning.empty_desc", "Assigned courses will appear here when your team enrolls you.")}
          />}
      </div>
    </section>
  );
}

const BLANK_COURSE_FORM = {
  title: "",
  code: "",
  category: "",
  level: "beginner" as LmsCourseLevel,
  status: "draft" as LmsCourseStatus,
  summary: "",
  description: "",
  passing_score: 70,
  lesson_title: "",
  lesson_duration: 15,
};

/**
 * Creates a course, or edits one when `course` is set.
 *
 * The same dialog does both because the fields are the same; only the first
 * lesson is create-only, since an existing course grows its lessons through
 * the lesson dialog instead.
 */
function CourseDialog({
  open,
  course,
  onOpenChange,
}: {
  open: boolean;
  course?: LmsCourse | null;
  onOpenChange: (open: boolean) => void;
}) {
  const lms = useLmsCopy();
  const queryClient = useQueryClient();
  const editing = Boolean(course);
  const [form, setForm] = React.useState(BLANK_COURSE_FORM);

  // Seed from the course being edited, and clear back to blank for a new one.
  React.useEffect(() => {
    if (!open) return;

    setForm(
      course
        ? {
            ...BLANK_COURSE_FORM,
            title: course.title ?? "",
            code: course.code ?? "",
            category: course.category ?? "",
            level: (course.level as LmsCourseLevel) ?? "beginner",
            status: course.status === "archived" ? "draft" : (course.status as LmsCourseStatus),
            summary: course.summary ?? "",
            description: course.description ?? "",
            passing_score: course.passing_score ?? 70,
          }
        : BLANK_COURSE_FORM,
    );
  }, [open, course]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title,
        code: form.code || undefined,
        category: form.category || undefined,
        level: form.level,
        status: form.status,
        visibility: "internal" as const,
        summary: form.summary || undefined,
        description: form.description || undefined,
        passing_score: form.passing_score,
      };

      if (course) {
        return learningApi.updateCourse(course.id, payload);
      }

      return learningApi.createCourse({
        ...payload,
        lessons: form.lesson_title
          ? [{
              title: form.lesson_title,
              content_type: "article",
              duration_minutes: form.lesson_duration,
              sort_order: 0,
              is_required: true,
            }]
          : [],
      });
    },
    onSuccess: () => {
      toast.success(
        editing
          ? lms("admin.toast.course_updated", "Course updated.")
          : lms("admin.toast.course_created", "Course created."),
      );
      setForm(BLANK_COURSE_FORM);
      onOpenChange(false);
      invalidateLearning(queryClient);
    },
    onError: (error) =>
      toast.error(
        errorMessage(
          error,
          editing
            ? lms("admin.toast.update_failed", "Unable to update course.")
            : lms("admin.toast.create_failed", "Unable to create course."),
        ),
      ),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? lms("admin.course_dialog.edit_title", "Edit course")
              : lms("admin.course_dialog.create_title", "Create course")}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? lms(
                  "admin.course_dialog.edit_desc",
                  "Change the course details. Lessons are managed from the catalog row.",
                )
              : lms("admin.course_dialog.create_desc", "Add the course shell and an optional first lesson.")}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={lms("admin.course_dialog.title", "Course title")} htmlFor="lms-course-title" required>
              <Input id="lms-course-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            </Field>
            <Field label={lms("admin.course_dialog.code", "Course code")} htmlFor="lms-course-code">
              <Input id="lms-course-code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
            </Field>
            <Field label={lms("admin.course_dialog.category", "Category")} htmlFor="lms-course-category">
              <Input id="lms-course-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
            </Field>
            <Field label={lms("admin.course_dialog.passing_score", "Passing score")} htmlFor="lms-course-passing-score">
              <Input
                id="lms-course-passing-score"
                type="number"
                min={0}
                max={100}
                value={form.passing_score}
                onChange={(event) => setForm({ ...form, passing_score: Number(event.target.value) })}
              />
            </Field>
            <Field label={lms("admin.course_dialog.level", "Level")} htmlFor="lms-course-dialog-level">
              <Select value={form.level} onValueChange={(value) => setForm({ ...form, level: value as LmsCourseLevel })}>
                <SelectTrigger id="lms-course-dialog-level" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {courseLevels.map((level) => <SelectItem key={level} value={level}>{enumLabel(lms, level)}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={lms("admin.course_dialog.status", "Status")} htmlFor="lms-course-dialog-status">
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as LmsCourseStatus })}>
                <SelectTrigger id="lms-course-dialog-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{lms("admin.course_dialog.draft", "Draft")}</SelectItem>
                  <SelectItem value="published">{lms("admin.course_dialog.published", "Published")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label={lms("admin.course_dialog.summary", "Summary")} htmlFor="lms-course-summary">
            <Textarea id="lms-course-summary" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
          </Field>
          <Field label={lms("admin.course_dialog.description", "Description")} htmlFor="lms-course-description">
            <Textarea id="lms-course-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </Field>
          {editing ? null : (
            <div className="rounded-lg border bg-muted/30 p-4">
              <h3 className="font-medium">{lms("admin.course_dialog.first_lesson", "First lesson")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {lms("admin.course_dialog.first_lesson_hint", "Optional. You can add more lessons later.")}
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_160px]">
                <Field label={lms("admin.course_dialog.lesson_title", "Lesson title")} htmlFor="lms-first-lesson-title">
                  <Input id="lms-first-lesson-title" value={form.lesson_title} onChange={(event) => setForm({ ...form, lesson_title: event.target.value })} />
                </Field>
                <Field label={lms("admin.course_dialog.minutes", "Minutes")} htmlFor="lms-first-lesson-duration">
                  <Input
                    id="lms-first-lesson-duration"
                    type="number"
                    min={0}
                    value={form.lesson_duration}
                    onChange={(event) => setForm({ ...form, lesson_duration: Number(event.target.value) })}
                  />
                </Field>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {lms("admin.course_dialog.cancel", "Cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending || !form.title.trim()}>
              {editing
                ? lms("admin.course_dialog.save", "Save changes")
                : lms("admin.create_course", "Create course")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Best guess at a lesson's type from the resource it points at, so an uploaded
 * video is treated as one. Returns null when the extension says nothing useful,
 * leaving the author's choice alone.
 */
function inferLessonType(url: string): LmsLesson["content_type"] | null {
  const path = url.split(/[?#]/, 1)[0]?.toLowerCase() ?? "";
  const extension = path.slice(path.lastIndexOf(".") + 1);

  if (["mp4", "webm", "ogv", "mov", "m4v", "mkv", "avi", "m3u8"].includes(extension)) {
    return "video";
  }
  if (["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "csv", "zip", "txt"].includes(extension)) {
    return "file";
  }
  return null;
}

function LessonDialog({ course, onOpenChange }: { course: LmsCourse | null; onOpenChange: (open: boolean) => void }) {
  const lms = useLmsCopy();
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState({
    title: "",
    content_type: "article" as LmsLesson["content_type"],
    duration_minutes: 15,
    content: "",
    resource_url: "",
  });

  React.useEffect(() => {
    if (course) {
      setForm({ title: "", content_type: "article", duration_minutes: 15, content: "", resource_url: "" });
    }
  }, [course]);

  const mutation = useMutation({
    mutationFn: () => learningApi.addLesson(course?.id || "", {
      title: form.title,
      content_type: form.content_type,
      duration_minutes: form.duration_minutes,
      content: form.content || undefined,
      resource_url: form.resource_url || undefined,
      is_required: true,
    }),
    onSuccess: () => {
      toast.success(lms("admin.toast.lesson_added", "Lesson added."));
      onOpenChange(false);
      invalidateLearning(queryClient);
    },
    onError: (error) => toast.error(errorMessage(error, lms("admin.toast.lesson_failed", "Unable to add lesson."))),
  });

  return (
    <Dialog open={Boolean(course)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add lesson</DialogTitle>
          <DialogDescription>{course ? `Extend ${course.title}.` : "Add a lesson to a course."}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <Field label="Lesson title" htmlFor="lms-lesson-title" required>
            <Input id="lms-lesson-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={lms("admin.lesson_dialog.content_type", "Content type")} htmlFor="lms-lesson-type">
              <Select value={form.content_type} onValueChange={(value) => setForm({ ...form, content_type: value as LmsLesson["content_type"] })}>
                <SelectTrigger id="lms-lesson-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["article", "video", "live", "assessment", "file", "link"].map((type) => (
                    <SelectItem key={type} value={type}>{enumLabel(lms, type)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={lms("admin.course_dialog.minutes", "Minutes")} htmlFor="lms-lesson-minutes">
              <Input
                id="lms-lesson-minutes"
                type="number"
                min={0}
                value={form.duration_minutes}
                onChange={(event) => setForm({ ...form, duration_minutes: Number(event.target.value) })}
              />
            </Field>
          </div>
          <Field label={lms("admin.lesson_dialog.resource", "Resource (URL or file)")} htmlFor="lms-lesson-url">
            <LmsResourceField
              id="lms-lesson-url"
              value={form.resource_url}
              onChange={(url) =>
                setForm((current) => ({
                  ...current,
                  resource_url: url,
                  // Pick up the type from the file when the author has not
                  // chosen one. Uploading an .mp4 and having the lesson saved
                  // as an article — so it never reaches the video player — is
                  // never what was meant.
                  content_type:
                    current.content_type === "article"
                      ? inferLessonType(url) ?? current.content_type
                      : current.content_type,
                }))
              }
            />
          </Field>
          <Field label={lms("admin.lesson_dialog.content", "Lesson content")} htmlFor="lms-lesson-content">
            <Textarea id="lms-lesson-content" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending || !course || !form.title.trim()}>
              Add lesson
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EnrollmentDialog({ open, onOpenChange, courses }: { open: boolean; onOpenChange: (open: boolean) => void; courses: LmsCourse[] }) {
  const lms = useLmsCopy();
  const queryClient = useQueryClient();
  const [courseId, setCourseId] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [selectedUserIds, setSelectedUserIds] = React.useState<number[]>([]);
  const [dueAt, setDueAt] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const usersQuery = useQuery({
    queryKey: ["lms-user-search", search],
    queryFn: () => learningApi.searchUsers(search),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () => learningApi.createEnrollments({
      course_id: courseId,
      user_ids: selectedUserIds,
      due_at: dueAt || undefined,
      notes: notes || undefined,
    }),
    onSuccess: () => {
      toast.success(lms("admin.toast.learners_assigned", "Learners assigned."));
      setSelectedUserIds([]);
      setDueAt("");
      setNotes("");
      onOpenChange(false);
      invalidateLearning(queryClient);
    },
    onError: (error) => toast.error(errorMessage(error, lms("admin.toast.assign_failed", "Unable to assign learners."))),
  });

  const users = usersQuery.data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign learners</DialogTitle>
          <DialogDescription>Select a course, search active users, and assign training with an optional due date.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <Field label={lms("admin.enrollment_dialog.course", "Course")} htmlFor="lms-enrollment-course" required>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger id="lms-enrollment-course" className="w-full">
                <SelectValue placeholder={lms("admin.enrollment_dialog.select_course", "Select course")} />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={lms("admin.enrollment_dialog.search_label", "Search learners")} htmlFor="lms-learner-search">
            <Input id="lms-learner-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={lms("admin.enrollment_dialog.search_placeholder", "Search by name or email")} />
          </Field>
          <fieldset className="space-y-3 rounded-lg border p-4">
            <legend className="px-1 text-sm font-medium">Learners</legend>
            {users.map((user) => (
              <LearnerCheckbox
                key={user.id}
                user={user}
                checked={selectedUserIds.includes(user.id)}
                onCheckedChange={(checked) => {
                  setSelectedUserIds((current) => checked
                    ? Array.from(new Set([...current, user.id]))
                    : current.filter((id) => id !== user.id));
                }}
              />
            ))}
            {users.length === 0 && (
              <p className="text-sm text-muted-foreground">No matching learners found.</p>
            )}
          </fieldset>
          <Field label={lms("admin.enrollment_dialog.due_date", "Due date")} htmlFor="lms-enrollment-due-at">
            <Input id="lms-enrollment-due-at" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
          </Field>
          <Field label={lms("admin.enrollment_dialog.note", "Assignment note")} htmlFor="lms-enrollment-note">
            <Textarea id="lms-enrollment-note" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending || !courseId || selectedUserIds.length === 0}>
              Assign selected learners
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LearnerCheckbox({ user, checked, onCheckedChange }: { user: LmsUser; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  const id = `lms-user-${user.id}`;

  return (
    <div className="flex items-start gap-3 rounded-md border bg-background p-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      <Label htmlFor={id} className="block cursor-pointer leading-5">
        <span className="block font-medium">{user.name}</span>
        <span className="block text-sm font-normal text-muted-foreground">{user.email}</span>
      </Label>
    </div>
  );
}

function MetricCard({ title, value, detail, icon: Icon, tone = "muted" }: { title: string; value: React.ReactNode; detail: string; icon: React.ElementType; tone?: "muted" | "blue" | "emerald" | "rose" }) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <span className={cn(
          "rounded-md p-2",
          tone === "blue" && "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
          tone === "emerald" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
          tone === "rose" && "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200",
          tone === "muted" && "bg-muted text-muted-foreground",
        )}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function CourseSummary({ course }: { course: LmsCourse }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{course.title}</h3>
          <p className="text-sm text-muted-foreground">{course.summary || course.category || "No summary yet"}</p>
        </div>
        <CourseStatusBadge status={course.status} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <MiniStat label="Lessons" value={course.lessons_count ?? course.lessons?.length ?? 0} />
        <MiniStat label="Assigned" value={course.enrollments_count || 0} />
        <MiniStat label="Complete" value={`${course.completion_rate || 0}%`} />
      </div>
    </div>
  );
}

function BreakdownPanel({ title, items }: { title: string; items: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm" aria-labelledby={`${slug(title)}-heading`}>
      <h3 id={`${slug(title)}-heading`} className="font-semibold">{title}</h3>
      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{item.label}</span>
              <span className="font-medium tabular-nums">{item.value}</span>
            </div>
            <Progress value={(item.value / max) * 100} aria-label={`${item.label}: ${item.value}`} />
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">No report data yet.</p>}
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-muted/60 p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Field({ label, htmlFor, required, children }: { label: string; htmlFor: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span aria-hidden="true" className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: LmsEnrollmentStatus }) {
  const lms = useLmsCopy();
  const label = enumLabel(lms, status);
  const className = status === "completed"
    ? "bg-emerald-700 text-white"
    : status === "overdue"
      ? "bg-rose-600 text-white"
      : status === "in_progress"
        ? "bg-blue-600 text-white"
        : "";

  return <Badge variant={className ? "default" : "outline"} className={className}>{label}</Badge>;
}

function CourseStatusBadge({ status }: { status: LmsCourseStatus }) {
  const lms = useLmsCopy();
  const className = status === "published"
    ? "bg-emerald-700 text-white"
    : status === "archived"
      ? "bg-slate-700 text-white"
      : "";

  return <Badge variant={className ? "default" : "secondary"} className={className}>{enumLabel(lms, status)}</Badge>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center">
      <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function LearningSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-72" />
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-32 rounded-lg" />)}
      </div>
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}

function invalidateLearning(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["learning-summary"] });
  queryClient.invalidateQueries({ queryKey: ["learning-courses"] });
  queryClient.invalidateQueries({ queryKey: ["learning-enrollments"] });
  queryClient.invalidateQueries({ queryKey: ["learning-learners"] });
  queryClient.invalidateQueries({ queryKey: ["learning-reports"] });
  queryClient.invalidateQueries({ queryKey: ["my-learning"] });
}

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message || fallback;
  }

  return fallback;
}

/**
 * Label for an enum value — a status, a level, a lesson type.
 *
 * Was `titleCase(value)`, which turned "in_progress" into "In Progress" and
 * could never be translated, leaving English words scattered through an
 * otherwise Amharic table. The title-cased form stays as the fallback, so a
 * value with no dictionary entry still reads sensibly.
 */
function enumLabel(lms: (key: string, fallback: string) => string, value: string) {
  return lms(`admin.enum.${value}`, titleCase(value));
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString();
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
