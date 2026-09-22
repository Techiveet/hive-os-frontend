"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/store/use-translation";
import { usePermissions } from "@/hooks/use-permissions";
import { getWorkspaceScopeKey } from "@/lib/runtime-context";

import { DataTable, type DataTableQuery } from "@/components/datatable/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { hrFetch } from "@/modules/humanresources/api";
import { talentApi } from "@/modules/humanresources/talent/api";
import type {
  Competency,
  DevelopmentPlan,
  TrainingCourse,
  TrainingEnrollment,
  TrainingSession,
  TrainingSummary,
} from "@/modules/humanresources/talent/types";
import { StatTile } from "@/modules/shared/charts/primitives";
import { ColumnChart } from "@/modules/shared/charts/charts";

const n = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: unknown) =>
  `ETB ${n(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const TABS = ["courses", "sessions", "enrollments", "plans"] as const;
type Tab = (typeof TABS)[number];

const OUTCOMES = ["attended", "completed", "failed", "no_show", "cancelled"] as const;
const SESSION_STATUSES = ["scheduled", "running", "completed", "cancelled"] as const;
const PLAN_STATUSES = ["draft", "active", "completed", "abandoned"] as const;
const DELIVERY_MODES = ["classroom", "online", "on_the_job", "external", "mentorship"] as const;
const ENROLLMENT_STATUSES = [
  "registered",
  "attended",
  "completed",
  "failed",
  "no_show",
  "cancelled",
] as const;

type LiteEmployee = { id: number; primary_name?: string; employee_number?: string };
type LitePosition = { id: number; title?: string; code?: string };

const ENROLLMENT_TONE: Record<string, string> = {
  completed: "default",
  registered: "secondary",
  attended: "secondary",
  failed: "destructive",
  no_show: "destructive",
  cancelled: "outline",
};

const emptyCourseForm = () => ({
  id: undefined as number | undefined,
  code: "",
  title: "",
  category: "",
  provider: "",
  delivery_mode: "classroom",
  duration_hours: "8",
  cost_per_seat: "0",
  default_capacity: "",
  objectives: "",
  prerequisites: "",
  competency_id: "",
  target_level: "",
  is_active: true,
});

const emptySessionForm = () => ({
  id: undefined as number | undefined,
  course_id: "",
  starts_at: "",
  ends_at: "",
  location: "",
  trainer: "",
  capacity: "",
  budget_amount: "0",
  actual_cost: "0",
  status: "scheduled",
  notes: "",
});

const emptyPlanForm = () => ({
  id: undefined as number | undefined,
  employee_id: "",
  title: "",
  objective: "",
  competency_id: "",
  target_position_id: "",
  mentor_employee_id: "",
  target_level: "",
  current_level: "",
  progress_percent: "0",
  status: "draft",
  starts_on: "",
  due_on: "",
  notes: "",
});

const employeeLabel = (emp: LiteEmployee) =>
  `${emp.primary_name ?? `#${emp.id}`}${emp.employee_number ? ` (${emp.employee_number})` : ""}`;

const positionLabel = (pos: LitePosition) =>
  `${pos.title ?? `#${pos.id}`}${pos.code ? ` (${pos.code})` : ""}`;

export default function TrainingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const scope = getWorkspaceScopeKey();
  const { hasAnyPermission } = usePermissions();

  const canManage = hasAnyPermission(["manage_training", "manage_talent"]);
  const canEnrol = hasAnyPermission(["enrol_training", "manage_training", "manage_talent"]);

  const [tab, setTab] = React.useState<Tab>("courses");
  const [tableQuery, setTableQuery] = React.useState({ page: 1, pageSize: 10, search: "" });
  const [summaryRange, setSummaryRange] = React.useState({ from: "", to: "" });
  const [sessionFilters, setSessionFilters] = React.useState({ course_id: "", status: "" });
  const [enrollmentFilters, setEnrollmentFilters] = React.useState({
    employee_id: "",
    status: "",
  });
  const [planFilters, setPlanFilters] = React.useState({
    employee_id: "",
    status: "",
    competency_id: "",
  });

  const [courseOpen, setCourseOpen] = React.useState(false);
  const [courseForm, setCourseForm] = React.useState(emptyCourseForm);

  const [sessionOpen, setSessionOpen] = React.useState(false);
  const [sessionForm, setSessionForm] = React.useState(emptySessionForm);

  const [enrolOpen, setEnrolOpen] = React.useState(false);
  const [enrolForm, setEnrolForm] = React.useState({ session_id: "", employee_id: "", cost: "" });

  const [planOpen, setPlanOpen] = React.useState(false);
  const [planForm, setPlanForm] = React.useState(emptyPlanForm);

  const [outcomeFor, setOutcomeFor] = React.useState<TrainingEnrollment | null>(null);
  const [outcomeForm, setOutcomeForm] = React.useState({
    status: "completed",
    score: "",
    feedback_rating: "",
    feedback_notes: "",
  });

  const [deleteCourseOpen, setDeleteCourseOpen] = React.useState(false);
  const [courseToDelete, setCourseToDelete] = React.useState<TrainingCourse | null>(null);
  const [deleteSessionOpen, setDeleteSessionOpen] = React.useState(false);
  const [sessionToDelete, setSessionToDelete] = React.useState<TrainingSession | null>(null);
  const [deletePlanOpen, setDeletePlanOpen] = React.useState(false);
  const [planToDelete, setPlanToDelete] = React.useState<DevelopmentPlan | null>(null);

  const employeesQuery = useQuery({
    queryKey: ["hr-employees-lite", scope],
    queryFn: () => hrFetch<{ data: LiteEmployee[] }>("/employees?per_page=500"),
    staleTime: 5 * 60 * 1000,
  });
  const employees = employeesQuery.data?.data ?? [];

  const positionsQuery = useQuery({
    queryKey: ["hr-positions-lite", scope],
    queryFn: () => hrFetch<{ data: LitePosition[] }>("/positions?per_page=200"),
    staleTime: 5 * 60 * 1000,
  });
  const positions = positionsQuery.data?.data ?? [];

  const summaryQuery = useQuery({
    queryKey: ["hr-talent", "training", "summary", summaryRange],
    queryFn: () =>
      talentApi
        .trainingSummary({
          from: summaryRange.from || undefined,
          to: summaryRange.to || undefined,
        })
        .then((res) => res.data),
  });

  const coursesQuery = useQuery({
    queryKey: ["hr-talent", "training", "courses", tableQuery],
    queryFn: () =>
      talentApi
        .listCourses({ page: tableQuery.page, limit: tableQuery.pageSize, search: tableQuery.search || undefined })
        .then((res) => res.data),
    enabled: tab === "courses",
  });

  const courseOptionsQuery = useQuery({
    queryKey: ["hr-talent", "training", "course-options"],
    queryFn: () => talentApi.listCourses({ limit: 100, is_active: true }).then((res) => res.data),
  });

  const sessionOptionsQuery = useQuery({
    queryKey: ["hr-talent", "training", "session-options"],
    queryFn: () => talentApi.listSessions({ limit: 100 }).then((res) => res.data),
    enabled: enrolOpen || tab === "enrollments",
  });

  const sessionsQuery = useQuery({
    queryKey: ["hr-talent", "training", "sessions", tableQuery, sessionFilters],
    queryFn: () =>
      talentApi
        .listSessions({
          page: tableQuery.page,
          limit: tableQuery.pageSize,
          course_id: sessionFilters.course_id || undefined,
          status: sessionFilters.status || undefined,
        })
        .then((res) => res.data),
    enabled: tab === "sessions",
  });

  const enrollmentsQuery = useQuery({
    queryKey: ["hr-talent", "training", "enrollments", tableQuery, enrollmentFilters],
    queryFn: () =>
      talentApi
        .listEnrollments({
          page: tableQuery.page,
          limit: tableQuery.pageSize,
          employee_id: enrollmentFilters.employee_id
            ? Number(enrollmentFilters.employee_id)
            : undefined,
          status: enrollmentFilters.status || undefined,
        })
        .then((res) => res.data),
    enabled: tab === "enrollments",
  });

  const plansQuery = useQuery({
    queryKey: ["hr-talent", "training", "plans", tableQuery, planFilters],
    queryFn: () =>
      talentApi
        .listPlans({
          page: tableQuery.page,
          limit: tableQuery.pageSize,
          employee_id: planFilters.employee_id ? Number(planFilters.employee_id) : undefined,
          status: planFilters.status || undefined,
          competency_id: planFilters.competency_id
            ? Number(planFilters.competency_id)
            : undefined,
        })
        .then((res) => res.data),
    enabled: tab === "plans",
  });

  const competencyQuery = useQuery({
    queryKey: ["hr-talent", "competency-options"],
    queryFn: () => talentApi.listCompetencies({ limit: 100, is_active: true }).then((res) => res.data),
  });

  const invalidate = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["hr-talent"] });
  }, [queryClient]);

  const errorText = (error: any, fallback: string) => error?.response?.data?.message || fallback;

  const saveCourse = useMutation({
    mutationFn: () => {
      const payload = {
        code: courseForm.code,
        title: courseForm.title,
        category: courseForm.category || null,
        provider: courseForm.provider || null,
        delivery_mode: courseForm.delivery_mode || "classroom",
        duration_hours: Number(courseForm.duration_hours || 0),
        cost_per_seat: Number(courseForm.cost_per_seat || 0),
        default_capacity: courseForm.default_capacity
          ? Number(courseForm.default_capacity)
          : null,
        objectives: courseForm.objectives || null,
        prerequisites: courseForm.prerequisites || null,
        competency_id: courseForm.competency_id ? Number(courseForm.competency_id) : null,
        target_level: courseForm.target_level ? Number(courseForm.target_level) : null,
        is_active: courseForm.is_active,
      };

      return courseForm.id ? talentApi.updateCourse(courseForm.id, payload) : talentApi.createCourse(payload);
    },
    onSuccess: () => {
      toast.success(t("hr_talent.training.course_saved", "Course saved."));
      invalidate();
      setCourseOpen(false);
    },
    onError: (error: any) =>
      toast.error(errorText(error, t("hr_talent.training.course_failed", "Could not save the course."))),
  });

  const removeCourse = useMutation({
    mutationFn: (id: number) => talentApi.deleteCourse(id),
    onSuccess: (res: any) => {
      toast.success(
        res?.data?.message || t("hr_talent.training.course_deleted", "Course deleted."),
      );
      invalidate();
    },
    onError: (error: any) =>
      toast.error(errorText(error, t("hr_talent.training.course_delete_failed", "Could not delete the course."))),
  });

  const saveSession = useMutation({
    mutationFn: () => {
      const payload = {
        starts_at: sessionForm.starts_at || null,
        ends_at: sessionForm.ends_at || null,
        location: sessionForm.location || null,
        trainer: sessionForm.trainer || null,
        capacity: sessionForm.capacity ? Number(sessionForm.capacity) : null,
        budget_amount: Number(sessionForm.budget_amount || 0),
        actual_cost: Number(sessionForm.actual_cost || 0),
        status: sessionForm.status,
        notes: sessionForm.notes || null,
      };

      if (sessionForm.id) {
        return talentApi.updateSession(sessionForm.id, payload);
      }

      return talentApi.createSession({
        ...payload,
        course_id: Number(sessionForm.course_id),
      });
    },
    onSuccess: () => {
      toast.success(
        sessionForm.id
          ? t("hr_talent.training.session_updated", "Session updated.")
          : t("hr_talent.training.session_saved", "Session scheduled."),
      );
      invalidate();
      setSessionOpen(false);
    },
    onError: (error: any) =>
      toast.error(errorText(error, t("hr_talent.training.session_failed", "Could not save the session."))),
  });

  const removeSession = useMutation({
    mutationFn: (id: number) => talentApi.deleteSession(id),
    onSuccess: (res: any) => {
      toast.success(
        res?.data?.message || t("hr_talent.training.session_deleted", "Session deleted."),
      );
      invalidate();
    },
    onError: (error: any) =>
      toast.error(
        errorText(error, t("hr_talent.training.session_delete_failed", "Could not delete the session.")),
      ),
  });

  const enrol = useMutation({
    mutationFn: () =>
      talentApi.enrol(Number(enrolForm.session_id), {
        employee_id: Number(enrolForm.employee_id),
        cost: enrolForm.cost !== "" ? Number(enrolForm.cost) : null,
      }),
    onSuccess: () => {
      toast.success(t("hr_talent.training.enrolled", "Employee enrolled."));
      invalidate();
      setEnrolOpen(false);
    },
    onError: (error: any) =>
      toast.error(errorText(error, t("hr_talent.training.enrol_failed", "Could not enrol that employee."))),
  });

  const savePlan = useMutation({
    mutationFn: () => {
      const shared = {
        title: planForm.title || undefined,
        objective: planForm.objective || null,
        competency_id: planForm.competency_id ? Number(planForm.competency_id) : null,
        target_position_id: planForm.target_position_id
          ? Number(planForm.target_position_id)
          : null,
        mentor_employee_id: planForm.mentor_employee_id
          ? Number(planForm.mentor_employee_id)
          : null,
        target_level: planForm.target_level ? Number(planForm.target_level) : null,
        current_level: planForm.current_level ? Number(planForm.current_level) : null,
        progress_percent: Number(planForm.progress_percent || 0),
        status: planForm.status,
        starts_on: planForm.starts_on || null,
        due_on: planForm.due_on || null,
        notes: planForm.notes || null,
      };

      if (planForm.id) {
        return talentApi.updatePlan(planForm.id, shared);
      }

      return talentApi.createPlan({
        ...shared,
        employee_id: Number(planForm.employee_id),
        title: planForm.title,
      });
    },
    onSuccess: () => {
      toast.success(t("hr_talent.training.plan_saved", "Development plan saved."));
      invalidate();
      setPlanOpen(false);
    },
    onError: (error: any) =>
      toast.error(errorText(error, t("hr_talent.training.plan_failed", "Could not save the plan."))),
  });

  const removePlan = useMutation({
    mutationFn: (id: number) => talentApi.deletePlan(id),
    onSuccess: () => {
      toast.success(t("hr_talent.training.plan_deleted", "Development plan deleted."));
      invalidate();
    },
    onError: (error: any) =>
      toast.error(errorText(error, t("hr_talent.training.plan_delete_failed", "Could not delete the plan."))),
  });

  const recordOutcome = useMutation({
    mutationFn: () =>
      talentApi.recordOutcome(outcomeFor!.id, {
        status: outcomeForm.status,
        score: outcomeForm.score ? Number(outcomeForm.score) : null,
        feedback_rating: outcomeForm.feedback_rating ? Number(outcomeForm.feedback_rating) : null,
        feedback_notes: outcomeForm.feedback_notes || null,
      }),
    onSuccess: () => {
      toast.success(
        t("hr_talent.training.outcome_saved", "Outcome recorded. A pass raises the linked competency."),
      );
      invalidate();
      setOutcomeFor(null);
    },
    onError: (error: any) =>
      toast.error(errorText(error, t("hr_talent.training.outcome_failed", "Could not record the outcome."))),
  });

  const handleTableQueryChange = React.useCallback((query: DataTableQuery) => {
    setTableQuery({
      page: Number(query.page || 1),
      pageSize: Number(query.pageSize || 10),
      search: String(query.search ?? ""),
    });
  }, []);

  const confirmDeleteCourse = (course: TrainingCourse) => {
    setCourseToDelete(course);
    setDeleteCourseOpen(true);
  };

  const handleDeleteCourse = () => {
    if (courseToDelete) {
      removeCourse.mutate(courseToDelete.id);
      setDeleteCourseOpen(false);
      setCourseToDelete(null);
    }
  };

  const confirmDeleteSession = (session: TrainingSession) => {
    setSessionToDelete(session);
    setDeleteSessionOpen(true);
  };

  const handleDeleteSession = () => {
    if (sessionToDelete) {
      removeSession.mutate(sessionToDelete.id);
      setDeleteSessionOpen(false);
      setSessionToDelete(null);
    }
  };

  const confirmDeletePlan = (plan: DevelopmentPlan) => {
    setPlanToDelete(plan);
    setDeletePlanOpen(true);
  };

  const handleDeletePlan = () => {
    if (planToDelete) {
      removePlan.mutate(planToDelete.id);
      setDeletePlanOpen(false);
      setPlanToDelete(null);
    }
  };

  const openEditSession = (session: TrainingSession) => {
    setSessionForm({
      id: session.id,
      course_id: String(session.course_id),
      starts_at: session.starts_at ? String(session.starts_at).slice(0, 10) : "",
      ends_at: session.ends_at ? String(session.ends_at).slice(0, 10) : "",
      location: session.location ?? "",
      trainer: session.trainer ?? "",
      capacity: session.capacity != null ? String(session.capacity) : "",
      budget_amount: String(n(session.budget_amount)),
      actual_cost: String(n(session.actual_cost)),
      status: session.status || "scheduled",
      notes: session.notes ?? "",
    });
    setSessionOpen(true);
  };

  const openEditPlan = (plan: DevelopmentPlan) => {
    setPlanForm({
      id: plan.id,
      employee_id: String(plan.employee_id),
      title: plan.title ?? "",
      objective: plan.objective ?? "",
      competency_id: plan.competency_id ? String(plan.competency_id) : "",
      target_position_id: plan.target_position_id ? String(plan.target_position_id) : "",
      mentor_employee_id: plan.mentor_employee_id ? String(plan.mentor_employee_id) : "",
      target_level: plan.target_level != null ? String(plan.target_level) : "",
      current_level: plan.current_level != null ? String(plan.current_level) : "",
      progress_percent: String(n(plan.progress_percent)),
      status: plan.status || "draft",
      starts_on: plan.starts_on ? String(plan.starts_on).slice(0, 10) : "",
      due_on: plan.due_on ? String(plan.due_on).slice(0, 10) : "",
      notes: plan.notes ?? "",
    });
    setPlanOpen(true);
  };

  const summary: TrainingSummary | undefined = summaryQuery.data?.data;
  const competencies = (competencyQuery.data?.data ?? []) as Competency[];
  const courseOptions = (courseOptionsQuery.data?.data ?? []) as TrainingCourse[];
  const sessionOptions = (sessionOptionsQuery.data?.data ?? []) as TrainingSession[];

  const courseColumns = React.useMemo<ColumnDef<TrainingCourse>[]>(
    () => [
      {
        id: "course",
        header: t("hr_talent.training.course", "Course"),
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-bold">{row.original.title}</p>
            <p className="font-mono text-[11px] text-muted-foreground">{row.original.code}</p>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: t("hr_talent.common.category", "Category"),
        cell: ({ row }) => <span className="text-xs">{row.original.category ?? "—"}</span>,
      },
      {
        id: "builds",
        header: t("hr_talent.training.builds", "Builds"),
        cell: ({ row }) =>
          row.original.competency_id ? (
            <Badge variant="outline" className="text-[11px]">
              {row.original.competency?.name ?? `#${row.original.competency_id}`}
              {row.original.target_level ? ` → L${row.original.target_level}` : ""}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "duration_hours",
        header: t("hr_talent.training.duration", "Hours"),
        cell: ({ row }) => <span className="tabular-nums">{n(row.original.duration_hours)}</span>,
      },
      {
        accessorKey: "cost_per_seat",
        header: t("hr_talent.training.cost_per_seat", "Per seat"),
        cell: ({ row }) => <span className="tabular-nums">{money(row.original.cost_per_seat)}</span>,
      },
      {
        accessorKey: "is_active",
        header: t("hr_talent.common.status", "Status"),
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "secondary"} className="text-[11px]">
            {row.original.is_active
              ? t("hr_talent.common.active", "Active")
              : t("hr_talent.common.retired", "Retired")}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          canManage ? (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCourseForm({
                    id: row.original.id,
                    code: row.original.code,
                    title: row.original.title,
                    category: row.original.category ?? "",
                    provider: row.original.provider ?? "",
                    delivery_mode: row.original.delivery_mode ?? "classroom",
                    duration_hours: String(n(row.original.duration_hours)),
                    cost_per_seat: String(n(row.original.cost_per_seat)),
                    default_capacity:
                      row.original.default_capacity != null
                        ? String(row.original.default_capacity)
                        : "",
                    objectives: row.original.objectives ?? "",
                    prerequisites: row.original.prerequisites ?? "",
                    competency_id: row.original.competency_id
                      ? String(row.original.competency_id)
                      : "",
                    target_level: row.original.target_level
                      ? String(row.original.target_level)
                      : "",
                    is_active: row.original.is_active,
                  });
                  setCourseOpen(true);
                }}
              >
                {t("hr_talent.common.edit", "Edit")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => confirmDeleteCourse(row.original)}
              >
                {t("hr_talent.common.delete", "Delete")}
              </Button>
            </div>
          ) : null,
      },
    ],
    [t, canManage],
  );

  const sessionColumns = React.useMemo<ColumnDef<TrainingSession>[]>(
    () => [
      {
        id: "session",
        header: t("hr_talent.training.session", "Session"),
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-bold">{row.original.course?.title ?? `#${row.original.course_id}`}</p>
            <p className="text-[11px] text-muted-foreground">
              {row.original.location ?? t("hr_talent.training.no_location", "Location not set")}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "starts_at",
        header: t("hr_talent.training.starts", "Starts"),
        cell: ({ row }) => (
          <span className="text-xs tabular-nums">
            {row.original.starts_at ? String(row.original.starts_at).slice(0, 10) : "—"}
          </span>
        ),
      },
      {
        id: "seats",
        header: t("hr_talent.training.seats", "Seats"),
        cell: ({ row }) => (
          <span className="text-xs tabular-nums">
            {row.original.capacity
              ? `${n(row.original.enrollments?.length)} / ${row.original.capacity}`
              : t("hr_talent.training.unlimited", "Unlimited")}
          </span>
        ),
      },
      {
        accessorKey: "budget_amount",
        header: t("hr_talent.training.budget", "Budget"),
        cell: ({ row }) => (
          <div className="space-y-0.5 text-xs tabular-nums">
            <p>{money(row.original.budget_amount)}</p>
            <p className="text-muted-foreground">
              {t("hr_talent.training.actual", "Actual")} {money(row.original.actual_cost)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: t("hr_talent.common.status", "Status"),
        cell: ({ row }) => (
          <Badge variant="outline" className="text-[11px] capitalize">
            {String(row.original.status).replace(/_/g, " ")}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            {canManage ? (
              <Button variant="ghost" size="sm" onClick={() => openEditSession(row.original)}>
                {t("hr_talent.common.edit", "Edit")}
              </Button>
            ) : null}
            {canEnrol ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEnrolForm({
                    session_id: String(row.original.id),
                    employee_id: "",
                    cost: "",
                  });
                  setEnrolOpen(true);
                }}
              >
                {t("hr_talent.training.enrol", "Enrol")}
              </Button>
            ) : null}
            {canManage ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => confirmDeleteSession(row.original)}
              >
                {t("hr_talent.common.delete", "Delete")}
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [t, canManage, canEnrol],
  );

  const enrollmentColumns = React.useMemo<ColumnDef<TrainingEnrollment>[]>(
    () => [
      {
        id: "employee",
        header: t("hr_talent.common.employee", "Employee"),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.employee?.primary_name ?? `#${row.original.employee_id}`}
          </span>
        ),
      },
      {
        id: "course",
        header: t("hr_talent.training.course", "Course"),
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.session?.course?.title ?? `#${row.original.session_id}`}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: t("hr_talent.common.status", "Status"),
        cell: ({ row }) => (
          <Badge variant={(ENROLLMENT_TONE[row.original.status] ?? "outline") as any} className="text-[11px] capitalize">
            {row.original.status.replace(/_/g, " ")}
          </Badge>
        ),
      },
      {
        accessorKey: "score",
        header: t("hr_talent.training.score", "Score"),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.score ?? "—"}</span>
        ),
      },
      {
        id: "applied",
        header: t("hr_talent.training.applied", "Competency"),
        cell: ({ row }) =>
          row.original.competency_applied ? (
            <Badge className="text-[11px]">{t("hr_talent.training.raised", "Raised")}</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          canManage ? (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOutcomeFor(row.original);
                  const current = row.original.status;
                  setOutcomeForm({
                    status: (OUTCOMES as readonly string[]).includes(current)
                      ? current
                      : "completed",
                    score: row.original.score ? String(row.original.score) : "",
                    feedback_rating: row.original.feedback_rating
                      ? String(row.original.feedback_rating)
                      : "",
                    feedback_notes: row.original.feedback_notes ?? "",
                  });
                }}
              >
                {t("hr_talent.training.record_outcome", "Outcome")}
              </Button>
            </div>
          ) : null,
      },
    ],
    [t, canManage],
  );

  const planColumns = React.useMemo<ColumnDef<DevelopmentPlan>[]>(
    () => [
      {
        id: "employee",
        header: t("hr_talent.common.employee", "Employee"),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.employee?.primary_name ?? `#${row.original.employee_id}`}
          </span>
        ),
      },
      {
        id: "objective",
        header: t("hr_talent.training.objective", "Objective"),
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{row.original.title || "—"}</p>
            <p className="text-sm text-muted-foreground">{row.original.objective ?? ""}</p>
            <p className="text-[11px] text-muted-foreground">
              {row.original.competency?.name ?? ""}
              {row.original.target_level ? ` → L${row.original.target_level}` : ""}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "progress_percent",
        header: t("hr_talent.training.progress", "Progress"),
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums">{n(row.original.progress_percent)}%</span>
        ),
      },
      {
        accessorKey: "due_on",
        header: t("hr_talent.common.due", "Due"),
        cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.due_on ?? "—"}</span>,
      },
      {
        accessorKey: "status",
        header: t("hr_talent.common.status", "Status"),
        cell: ({ row }) => (
          <Badge variant="outline" className="text-[11px] capitalize">
            {String(row.original.status).replace(/_/g, " ")}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          canManage ? (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={() => openEditPlan(row.original)}>
                {t("hr_talent.common.edit", "Edit")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => confirmDeletePlan(row.original)}
              >
                {t("hr_talent.common.delete", "Delete")}
              </Button>
            </div>
          ) : null,
      },
    ],
    [t, canManage],
  );

  const activeQuery =
    tab === "courses"
      ? coursesQuery
      : tab === "sessions"
        ? sessionsQuery
        : tab === "enrollments"
          ? enrollmentsQuery
          : plansQuery;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            {t("hr_talent.training.title", "Training and Development")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "hr_talent.training.subtitle",
              "Courses, seats and outcomes. Completing a course raises the competency it was built for, which is what closes a succession gap.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full px-5" asChild>
            <Link href="/dashboard/human-resources/talent/competencies">
              {t("hr_talent.training.open_competencies", "Competency profiles")}
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button variant="outline" className="rounded-full px-5" asChild>
            <Link href="/dashboard/human-resources/talent/succession">
              {t("hr_talent.training.open_succession", "Succession gaps")}
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
          {canManage ? (
            tab === "plans" ? (
              <Button
                className="rounded-full px-5"
                onClick={() => {
                  setPlanForm(emptyPlanForm());
                  setPlanOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("hr_talent.training.add_plan", "Add Plan")}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="rounded-full px-5"
                  onClick={() => {
                    setSessionForm(emptySessionForm());
                    setSessionOpen(true);
                  }}
                >
                  {t("hr_talent.training.schedule", "Schedule Session")}
                </Button>
                <Button
                  className="rounded-full px-5"
                  onClick={() => {
                    setCourseForm(emptyCourseForm());
                    setCourseOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("hr_talent.training.add_course", "Add Course")}
                </Button>
              </>
            )
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="summary-from">{t("hr_talent.common.from", "From")}</Label>
          <Input
            id="summary-from"
            type="date"
            className="h-9 w-40"
            value={summaryRange.from}
            onChange={(event) => setSummaryRange((prev) => ({ ...prev, from: event.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="summary-to">{t("hr_talent.common.to", "To")}</Label>
          <Input
            id="summary-to"
            type="date"
            className="h-9 w-40"
            value={summaryRange.to}
            min={summaryRange.from || undefined}
            onChange={(event) => setSummaryRange((prev) => ({ ...prev, to: event.target.value }))}
          />
        </div>
        {(summaryRange.from || summaryRange.to) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => setSummaryRange({ from: "", to: "" })}
          >
            {t("hr_talent.common.clear", "Clear")}
          </Button>
        )}
      </div>

      {summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label={t("hr_talent.training.completion", "Completion rate")}
              value={`${n(summary.completion_rate_percent).toFixed(0)}%`}
              meta={t("hr_talent.training.completion_meta", "{done} of {total} seats").replace(
                "{done}",
                String(n(summary.completed)),
              ).replace("{total}", String(n(summary.enrollments)))}
            />
            <StatTile
              label={t("hr_talent.training.no_show", "No-show rate")}
              value={`${n(summary.no_show_rate_percent).toFixed(0)}%`}
              alert={n(summary.no_show_rate_percent) > 10}
            />
            <StatTile
              label={t("hr_talent.training.spend", "Spend against budget")}
              value={money(summary.actual_cost)}
              meta={t("hr_talent.training.budget_meta", "{budget} budgeted").replace(
                "{budget}",
                money(summary.budget),
              )}
              alert={n(summary.actual_cost) > n(summary.budget)}
            />
            <StatTile
              label={t("hr_talent.training.hours", "Hours delivered")}
              value={n(summary.training_hours).toLocaleString()}
              meta={
                summary.average_rating !== null && summary.average_rating !== undefined
                  ? t("hr_talent.training.rating_meta", "{rating}/5 average rating").replace(
                      "{rating}",
                      n(summary.average_rating).toFixed(1),
                    )
                  : t("hr_talent.training.no_rating", "Not rated yet")
              }
            />
          </div>

          <ColumnChart
            title={t("hr_talent.training.by_category", "Seats by category")}
            description={t(
              "hr_talent.training.by_category_desc",
              "Where training effort is actually going, and what it cost.",
            )}
            rows={(summary.by_category ?? []).map((row) => ({
              key: row.category,
              label: row.category,
              value: n(row.enrollments),
              meta: `${n(row.sessions)} ${t("hr_talent.training.sessions", "sessions")} · ${money(row.cost)}`,
            }))}
            valueLabel={t("hr_talent.training.enrollments", "Enrollments")}
            emptyLabel={t("hr_talent.training.no_data", "No training recorded yet.")}
          />
        </>
      ) : null}

      <div className="flex gap-2 border-b border-border/60">
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setTab(value);
              setTableQuery((prev) => ({ ...prev, page: 1 }));
            }}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold capitalize transition-colors ${
              tab === value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            aria-current={tab === value ? "page" : undefined}
          >
            {value}
          </button>
        ))}
      </div>

      {tab === "sessions" ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="filter-course">{t("hr_talent.training.course", "Course")}</Label>
            <select
              id="filter-course"
              value={sessionFilters.course_id}
              onChange={(event) => {
                setSessionFilters((prev) => ({ ...prev, course_id: event.target.value }));
                setTableQuery((prev) => ({ ...prev, page: 1 }));
              }}
              className="h-9 min-w-[12rem] rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("hr_talent.common.all", "All")}</option>
              {courseOptions.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-status">{t("hr_talent.common.status", "Status")}</Label>
            <select
              id="filter-status"
              value={sessionFilters.status}
              onChange={(event) => {
                setSessionFilters((prev) => ({ ...prev, status: event.target.value }));
                setTableQuery((prev) => ({ ...prev, page: 1 }));
              }}
              className="h-9 min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm capitalize"
            >
              <option value="">{t("hr_talent.common.all", "All")}</option>
              {SESSION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {tab === "enrollments" ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="filter-enrol-employee">{t("hr_talent.common.employee", "Employee")}</Label>
            <select
              id="filter-enrol-employee"
              value={enrollmentFilters.employee_id}
              onChange={(event) => {
                setEnrollmentFilters((prev) => ({ ...prev, employee_id: event.target.value }));
                setTableQuery((prev) => ({ ...prev, page: 1 }));
              }}
              className="h-9 min-w-[14rem] rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("hr_talent.common.all", "All")}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {employeeLabel(emp)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-enrol-status">{t("hr_talent.common.status", "Status")}</Label>
            <select
              id="filter-enrol-status"
              value={enrollmentFilters.status}
              onChange={(event) => {
                setEnrollmentFilters((prev) => ({ ...prev, status: event.target.value }));
                setTableQuery((prev) => ({ ...prev, page: 1 }));
              }}
              className="h-9 min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm capitalize"
            >
              <option value="">{t("hr_talent.common.all", "All")}</option>
              {ENROLLMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {tab === "plans" ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="filter-plan-employee">{t("hr_talent.common.employee", "Employee")}</Label>
            <select
              id="filter-plan-employee"
              value={planFilters.employee_id}
              onChange={(event) => {
                setPlanFilters((prev) => ({ ...prev, employee_id: event.target.value }));
                setTableQuery((prev) => ({ ...prev, page: 1 }));
              }}
              className="h-9 min-w-[14rem] rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("hr_talent.common.all", "All")}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {employeeLabel(emp)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-plan-status">{t("hr_talent.common.status", "Status")}</Label>
            <select
              id="filter-plan-status"
              value={planFilters.status}
              onChange={(event) => {
                setPlanFilters((prev) => ({ ...prev, status: event.target.value }));
                setTableQuery((prev) => ({ ...prev, page: 1 }));
              }}
              className="h-9 min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm capitalize"
            >
              <option value="">{t("hr_talent.common.all", "All")}</option>
              {PLAN_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-plan-competency">
              {t("hr_talent.competencies.competency", "Competency")}
            </Label>
            <select
              id="filter-plan-competency"
              value={planFilters.competency_id}
              onChange={(event) => {
                setPlanFilters((prev) => ({ ...prev, competency_id: event.target.value }));
                setTableQuery((prev) => ({ ...prev, page: 1 }));
              }}
              className="h-9 min-w-[12rem] rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("hr_talent.common.all", "All")}</option>
              {competencies.map((competency) => (
                <option key={competency.id} value={competency.id}>
                  {competency.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      <DataTable
        columns={
          (tab === "courses"
            ? courseColumns
            : tab === "sessions"
              ? sessionColumns
              : tab === "enrollments"
                ? enrollmentColumns
                : planColumns) as ColumnDef<any>[]
        }
        data={(activeQuery.data?.data ?? []) as any[]}
        totalEntries={activeQuery.data?.meta?.total ?? 0}
        loading={activeQuery.isLoading}
        pageIndex={tableQuery.page}
        pageSize={tableQuery.pageSize}
        onQueryChange={handleTableQueryChange}
        searchPlaceholder={t("hr_talent.training.search", "Search training...")}
        resourceName={`hr-training-${tab}`}
      />

      {/* Course */}
      <Dialog open={courseOpen} onOpenChange={setCourseOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">
                {courseForm.id
                  ? t("hr_talent.training.edit_course", "Edit Course")
                  : t("hr_talent.training.new_course", "New Course")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "hr_talent.training.course_desc",
                  "Link a course to the competency it builds and the level it certifies — that link is what makes completion move a succession gap.",
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="course-code">{t("hr_talent.common.code", "Code")}</Label>
              <Input
                id="course-code"
                value={courseForm.code}
                onChange={(event) => setCourseForm({ ...courseForm, code: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-title">{t("hr_talent.common.title", "Title")}</Label>
              <Input
                id="course-title"
                value={courseForm.title}
                onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-category">{t("hr_talent.common.category", "Category")}</Label>
              <Input
                id="course-category"
                value={courseForm.category}
                onChange={(event) => setCourseForm({ ...courseForm, category: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-provider">{t("hr_talent.training.provider", "Provider")}</Label>
              <Input
                id="course-provider"
                value={courseForm.provider}
                onChange={(event) => setCourseForm({ ...courseForm, provider: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-delivery">{t("hr_talent.training.delivery_mode", "Delivery")}</Label>
              <select
                id="course-delivery"
                value={courseForm.delivery_mode}
                onChange={(event) => setCourseForm({ ...courseForm, delivery_mode: event.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
              >
                {DELIVERY_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-hours">{t("hr_talent.training.duration", "Hours")}</Label>
              <Input
                id="course-hours"
                type="number"
                min={0}
                value={courseForm.duration_hours}
                onChange={(event) => setCourseForm({ ...courseForm, duration_hours: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-cost">{t("hr_talent.training.cost_per_seat", "Cost per seat")}</Label>
              <Input
                id="course-cost"
                type="number"
                min={0}
                value={courseForm.cost_per_seat}
                onChange={(event) => setCourseForm({ ...courseForm, cost_per_seat: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-capacity">{t("hr_talent.training.default_capacity", "Default capacity")}</Label>
              <Input
                id="course-capacity"
                type="number"
                min={1}
                value={courseForm.default_capacity}
                onChange={(event) => setCourseForm({ ...courseForm, default_capacity: event.target.value })}
                placeholder={t("hr_talent.training.unlimited", "Unlimited")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-competency">
                {t("hr_talent.training.competency_built", "Competency built")}
              </Label>
              <select
                id="course-competency"
                value={courseForm.competency_id}
                onChange={(event) => setCourseForm({ ...courseForm, competency_id: event.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("hr_talent.common.none", "None")}</option>
                {competencies.map((competency) => (
                  <option key={competency.id} value={competency.id}>
                    {competency.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-target">{t("hr_talent.training.target_level", "Certifies level")}</Label>
              <Input
                id="course-target"
                type="number"
                min={1}
                max={10}
                value={courseForm.target_level}
                onChange={(event) => setCourseForm({ ...courseForm, target_level: event.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="course-objectives">{t("hr_talent.training.objectives", "Objectives")}</Label>
              <Textarea
                id="course-objectives"
                rows={3}
                value={courseForm.objectives}
                onChange={(event) => setCourseForm({ ...courseForm, objectives: event.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="course-prerequisites">
                {t("hr_talent.training.prerequisites", "Prerequisites")}
              </Label>
              <Textarea
                id="course-prerequisites"
                rows={2}
                value={courseForm.prerequisites}
                onChange={(event) => setCourseForm({ ...courseForm, prerequisites: event.target.value })}
              />
            </div>
            <div className="flex items-center justify-between gap-3 sm:col-span-2 rounded-lg border border-border/50 px-3 py-2.5">
              <Label htmlFor="course-active" className="cursor-pointer">
                {t("hr_talent.common.active", "Active")}
              </Label>
              <Switch
                id="course-active"
                checked={courseForm.is_active}
                onCheckedChange={(checked) => setCourseForm({ ...courseForm, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border/40 px-6 py-4">
            <Button variant="ghost" onClick={() => setCourseOpen(false)}>
              {t("hr_talent.common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={() => saveCourse.mutate()}
              disabled={saveCourse.isPending || !courseForm.code.trim() || !courseForm.title.trim()}
            >
              {t("hr_talent.common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session */}
      <Dialog open={sessionOpen} onOpenChange={setSessionOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">
                {sessionForm.id
                  ? t("hr_talent.training.edit_session", "Edit Session")
                  : t("hr_talent.training.schedule", "Schedule Session")}
              </DialogTitle>
              <DialogDescription>
                {t("hr_talent.training.session_desc", "A dated running of a course, with its own seats and budget.")}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="session-course">{t("hr_talent.training.course", "Course")}</Label>
              <select
                id="session-course"
                value={sessionForm.course_id}
                disabled={Boolean(sessionForm.id)}
                onChange={(event) => setSessionForm({ ...sessionForm, course_id: event.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
              >
                <option value="">{t("hr_talent.common.select", "Select...")}</option>
                {courseOptions.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-starts">{t("hr_talent.training.starts", "Starts")}</Label>
              <Input
                id="session-starts"
                type="date"
                value={sessionForm.starts_at}
                onChange={(event) => setSessionForm({ ...sessionForm, starts_at: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-ends">{t("hr_talent.training.ends", "Ends")}</Label>
              <Input
                id="session-ends"
                type="date"
                value={sessionForm.ends_at}
                min={sessionForm.starts_at || undefined}
                onChange={(event) => setSessionForm({ ...sessionForm, ends_at: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-location">{t("hr_talent.training.location", "Location")}</Label>
              <Input
                id="session-location"
                value={sessionForm.location}
                onChange={(event) => setSessionForm({ ...sessionForm, location: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-trainer">{t("hr_talent.training.trainer", "Trainer")}</Label>
              <Input
                id="session-trainer"
                value={sessionForm.trainer}
                onChange={(event) => setSessionForm({ ...sessionForm, trainer: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-capacity">{t("hr_talent.training.capacity", "Capacity")}</Label>
              <Input
                id="session-capacity"
                type="number"
                min={1}
                value={sessionForm.capacity}
                onChange={(event) => setSessionForm({ ...sessionForm, capacity: event.target.value })}
                placeholder={t("hr_talent.training.unlimited", "Unlimited")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-budget">{t("hr_talent.training.budget", "Budget")}</Label>
              <Input
                id="session-budget"
                type="number"
                min={0}
                value={sessionForm.budget_amount}
                onChange={(event) => setSessionForm({ ...sessionForm, budget_amount: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-actual">{t("hr_talent.training.actual_cost", "Actual cost")}</Label>
              <Input
                id="session-actual"
                type="number"
                min={0}
                value={sessionForm.actual_cost}
                onChange={(event) => setSessionForm({ ...sessionForm, actual_cost: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-status">{t("hr_talent.common.status", "Status")}</Label>
              <select
                id="session-status"
                value={sessionForm.status}
                onChange={(event) => setSessionForm({ ...sessionForm, status: event.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
              >
                {SESSION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="session-notes">{t("hr_talent.common.notes", "Notes")}</Label>
              <Textarea
                id="session-notes"
                rows={2}
                value={sessionForm.notes}
                onChange={(event) => setSessionForm({ ...sessionForm, notes: event.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border/40 px-6 py-4">
            <Button variant="ghost" onClick={() => setSessionOpen(false)}>
              {t("hr_talent.common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={() => saveSession.mutate()}
              disabled={
                saveSession.isPending ||
                (!sessionForm.id && (!sessionForm.course_id || !sessionForm.starts_at))
              }
            >
              {t("hr_talent.common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enrol */}
      <Dialog open={enrolOpen} onOpenChange={setEnrolOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">
                {t("hr_talent.training.enrol", "Enrol")}
              </DialogTitle>
              <DialogDescription>
                {t("hr_talent.training.enrol_desc", "Seats are limited by the session capacity.")}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="enrol-session">{t("hr_talent.training.session", "Session")}</Label>
              <select
                id="enrol-session"
                value={enrolForm.session_id}
                onChange={(event) => setEnrolForm({ ...enrolForm, session_id: event.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("hr_talent.common.select", "Select...")}</option>
                {sessionOptions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.course?.title ?? `#${session.course_id}`}
                    {session.starts_at ? ` — ${String(session.starts_at).slice(0, 10)}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="enrol-employee">{t("hr_talent.common.employee", "Employee")}</Label>
              <select
                id="enrol-employee"
                value={enrolForm.employee_id}
                onChange={(event) => setEnrolForm({ ...enrolForm, employee_id: event.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("hr_talent.common.select", "Select...")}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {employeeLabel(emp)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="enrol-cost">{t("hr_talent.training.cost", "Cost (optional)")}</Label>
              <Input
                id="enrol-cost"
                type="number"
                min={0}
                value={enrolForm.cost}
                onChange={(event) => setEnrolForm({ ...enrolForm, cost: event.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border/40 px-6 py-4">
            <Button variant="ghost" onClick={() => setEnrolOpen(false)}>
              {t("hr_talent.common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={() => enrol.mutate()}
              disabled={enrol.isPending || !enrolForm.session_id || !enrolForm.employee_id}
            >
              {t("hr_talent.training.enrol", "Enrol")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">
                {planForm.id
                  ? t("hr_talent.training.edit_plan", "Edit Development Plan")
                  : t("hr_talent.training.new_plan", "New Development Plan")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "hr_talent.training.plan_desc",
                  "Track progress against a competency or role objective.",
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="plan-employee">{t("hr_talent.common.employee", "Employee")}</Label>
              <select
                id="plan-employee"
                value={planForm.employee_id}
                disabled={Boolean(planForm.id)}
                onChange={(event) => setPlanForm({ ...planForm, employee_id: event.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
              >
                <option value="">{t("hr_talent.common.select", "Select...")}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {employeeLabel(emp)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-title">{t("hr_talent.common.title", "Title")}</Label>
              <Input
                id="plan-title"
                value={planForm.title}
                onChange={(event) => setPlanForm({ ...planForm, title: event.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="plan-objective">{t("hr_talent.training.objective", "Objective")}</Label>
              <Input
                id="plan-objective"
                value={planForm.objective}
                onChange={(event) => setPlanForm({ ...planForm, objective: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-competency">{t("hr_talent.competencies.competency", "Competency")}</Label>
              <select
                id="plan-competency"
                value={planForm.competency_id}
                onChange={(event) => setPlanForm({ ...planForm, competency_id: event.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("hr_talent.common.none", "None")}</option>
                {competencies.map((competency) => (
                  <option key={competency.id} value={competency.id}>
                    {competency.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-target-position">
                {t("hr_talent.training.target_position", "Target position")}
              </Label>
              <select
                id="plan-target-position"
                value={planForm.target_position_id}
                onChange={(event) =>
                  setPlanForm({ ...planForm, target_position_id: event.target.value })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("hr_talent.common.none", "None")}</option>
                {positions.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {positionLabel(pos)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-mentor">{t("hr_talent.training.mentor", "Mentor")}</Label>
              <select
                id="plan-mentor"
                value={planForm.mentor_employee_id}
                onChange={(event) =>
                  setPlanForm({ ...planForm, mentor_employee_id: event.target.value })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("hr_talent.common.none", "None")}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {employeeLabel(emp)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-current">{t("hr_talent.training.current_level", "Current level")}</Label>
              <Input
                id="plan-current"
                type="number"
                min={0}
                max={10}
                value={planForm.current_level}
                onChange={(event) => setPlanForm({ ...planForm, current_level: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-target">{t("hr_talent.training.target_level", "Target level")}</Label>
              <Input
                id="plan-target"
                type="number"
                min={0}
                max={10}
                value={planForm.target_level}
                onChange={(event) => setPlanForm({ ...planForm, target_level: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-progress">{t("hr_talent.training.progress", "Progress %")}</Label>
              <Input
                id="plan-progress"
                type="number"
                min={0}
                max={100}
                value={planForm.progress_percent}
                onChange={(event) => setPlanForm({ ...planForm, progress_percent: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-status">{t("hr_talent.common.status", "Status")}</Label>
              <select
                id="plan-status"
                value={planForm.status}
                onChange={(event) => setPlanForm({ ...planForm, status: event.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
              >
                {PLAN_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-starts">{t("hr_talent.training.starts_on", "Starts")}</Label>
              <Input
                id="plan-starts"
                type="date"
                value={planForm.starts_on}
                onChange={(event) => setPlanForm({ ...planForm, starts_on: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-due">{t("hr_talent.common.due", "Due")}</Label>
              <Input
                id="plan-due"
                type="date"
                value={planForm.due_on}
                min={planForm.starts_on || undefined}
                onChange={(event) => setPlanForm({ ...planForm, due_on: event.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="plan-notes">{t("hr_talent.common.notes", "Notes")}</Label>
              <Textarea
                id="plan-notes"
                rows={2}
                value={planForm.notes}
                onChange={(event) => setPlanForm({ ...planForm, notes: event.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border/40 px-6 py-4">
            <Button variant="ghost" onClick={() => setPlanOpen(false)}>
              {t("hr_talent.common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={() => savePlan.mutate()}
              disabled={
                savePlan.isPending ||
                !planForm.title.trim() ||
                (!planForm.id && !planForm.employee_id)
              }
            >
              {t("hr_talent.common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Outcome */}
      <Dialog open={outcomeFor !== null} onOpenChange={(open) => !open && setOutcomeFor(null)}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">
                {t("hr_talent.training.record_outcome", "Record Outcome")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "hr_talent.training.outcome_desc",
                  "Marking a seat completed raises the linked competency to the level the course certifies — once, never twice.",
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="outcome-status">{t("hr_talent.common.status", "Status")}</Label>
              <select
                id="outcome-status"
                value={outcomeForm.status}
                onChange={(event) => setOutcomeForm({ ...outcomeForm, status: event.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
              >
                {OUTCOMES.map((outcome) => (
                  <option key={outcome} value={outcome}>
                    {outcome.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="outcome-score">{t("hr_talent.training.score", "Score")}</Label>
              <Input
                id="outcome-score"
                type="number"
                min={0}
                max={100}
                value={outcomeForm.score}
                onChange={(event) => setOutcomeForm({ ...outcomeForm, score: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="outcome-rating">{t("hr_talent.training.rating", "Rating (1–5)")}</Label>
              <Input
                id="outcome-rating"
                type="number"
                min={1}
                max={5}
                value={outcomeForm.feedback_rating}
                onChange={(event) => setOutcomeForm({ ...outcomeForm, feedback_rating: event.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="outcome-notes">{t("hr_talent.training.feedback_notes", "Feedback notes")}</Label>
              <Textarea
                id="outcome-notes"
                rows={3}
                value={outcomeForm.feedback_notes}
                onChange={(event) =>
                  setOutcomeForm({ ...outcomeForm, feedback_notes: event.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border/40 px-6 py-4">
            <Button variant="ghost" onClick={() => setOutcomeFor(null)}>
              {t("hr_talent.common.cancel", "Cancel")}
            </Button>
            <Button onClick={() => recordOutcome.mutate()} disabled={recordOutcome.isPending}>
              {t("hr_talent.common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete course confirmation */}
      <AlertDialog open={deleteCourseOpen} onOpenChange={setDeleteCourseOpen}>
        <AlertDialogContent className="rounded-[2rem] border-border/60 bg-background/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("hr_talent.training.delete_course_title", "Delete course?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {courseToDelete
                ? t(
                    "hr_talent.training.confirm_delete_course",
                    "Delete “{title}”? Courses with delivery history are deactivated instead.",
                  ).replace("{title}", courseToDelete.title)
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">
              {t("hr_talent.common.cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCourse}
              disabled={removeCourse.isPending}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("hr_talent.common.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete session confirmation */}
      <AlertDialog open={deleteSessionOpen} onOpenChange={setDeleteSessionOpen}>
        <AlertDialogContent className="rounded-[2rem] border-border/60 bg-background/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("hr_talent.training.delete_session_title", "Delete session?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "hr_talent.training.confirm_delete_session",
                "Delete this session? Sessions with enrollments are cancelled instead.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">
              {t("hr_talent.common.cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSession}
              disabled={removeSession.isPending}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("hr_talent.common.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete plan confirmation */}
      <AlertDialog open={deletePlanOpen} onOpenChange={setDeletePlanOpen}>
        <AlertDialogContent className="rounded-[2rem] border-border/60 bg-background/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("hr_talent.training.delete_plan_title", "Delete development plan?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("hr_talent.training.confirm_delete_plan", "Delete this development plan? This cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">
              {t("hr_talent.common.cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlan}
              disabled={removePlan.isPending}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("hr_talent.common.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
