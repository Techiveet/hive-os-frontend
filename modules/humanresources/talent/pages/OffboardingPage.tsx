"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/store/use-translation";
import { usePermissions } from "@/hooks/use-permissions";
import { getWorkspaceScopeKey } from "@/lib/runtime-context";

import { DataTable, type DataTableQuery } from "@/components/datatable/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { hrFetch } from "@/modules/humanresources/api";
import { talentApi } from "@/modules/humanresources/talent/api";
import type {
  OffboardingCase,
  OffboardingSummary,
  OffboardingTask,
} from "@/modules/humanresources/talent/types";
import { EmptyPanel, Panel, StatTile } from "@/modules/shared/charts/primitives";
import { ColumnChart, RankedBarChart } from "@/modules/shared/charts/charts";

type LiteEmployee = { id: number; primary_name?: string; employee_number?: string };

const n = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const employeeLabel = (emp: LiteEmployee) =>
  `${emp.primary_name ?? `#${emp.id}`}${emp.employee_number ? ` (${emp.employee_number})` : ""}`;

const EXIT_TYPES = [
  "resignation",
  "termination",
  "retirement",
  "end_of_contract",
  "redundancy",
] as const;

const CASE_STATUSES = ["open", "in_progress", "cleared", "completed", "cancelled"] as const;

const TASK_DEPARTMENTS = ["hr", "it", "finance", "manager", "facilities", "other"] as const;

const TASK_CATEGORIES = [
  "general",
  "asset_return",
  "access_revocation",
  "knowledge_transfer",
  "final_pay",
] as const;

const CASE_TONE: Record<string, string> = {
  open: "secondary",
  in_progress: "secondary",
  cleared: "default",
  completed: "default",
  cancelled: "outline",
};

type EditForm = {
  last_working_day: string;
  notified_on: string;
  reason: string;
  exit_interview_notes: string;
  exit_interview_at: string;
  rehire_eligible: boolean | null;
  exit_type: string;
};

type TaskForm = {
  title: string;
  department: string;
  category: string;
  is_blocking: boolean;
  due_on: string;
  assignee_id: string;
};

const DEFAULT_TASK: TaskForm = {
  title: "",
  department: "hr",
  category: "general",
  is_blocking: false,
  due_on: "",
  assignee_id: "",
};

export default function OffboardingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const scope = getWorkspaceScopeKey();
  const { hasAnyPermission } = usePermissions();

  const canManage = hasAnyPermission(["manage_offboarding", "manage_talent"]);
  const canSettle = hasAnyPermission([
    "settle_offboarding",
    "manage_offboarding",
    "manage_talent",
  ]);
  const canCompleteTasks = hasAnyPermission([
    "complete_offboarding_tasks",
    "manage_offboarding",
    "manage_talent",
  ]);

  const [tableQuery, setTableQuery] = React.useState({
    page: 1,
    pageSize: 10,
    search: "",
    status: "",
    exit_type: "",
    employee_id: "",
    open_only: false,
  });
  const [formOpen, setFormOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    employee_id: "",
    exit_type: "resignation",
    notified_on: "",
    last_working_day: "",
  });
  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [editForm, setEditForm] = React.useState<EditForm>({
    last_working_day: "",
    notified_on: "",
    reason: "",
    exit_interview_notes: "",
    exit_interview_at: "",
    rehire_eligible: null,
    exit_type: "resignation",
  });
  const [taskForm, setTaskForm] = React.useState<TaskForm>(DEFAULT_TASK);
  const [settleOpen, setSettleOpen] = React.useState(false);
  const [settleAmount, setSettleAmount] = React.useState("");
  const [settleNotes, setSettleNotes] = React.useState("");

  const employeesQuery = useQuery({
    queryKey: ["hr-employees-lite", scope],
    queryFn: () => hrFetch<{ data: LiteEmployee[] }>("/employees?per_page=500"),
    staleTime: 5 * 60 * 1000,
  });
  const employees = employeesQuery.data?.data ?? [];

  const listQuery = useQuery({
    queryKey: ["hr-talent", "offboarding", tableQuery],
    queryFn: () =>
      talentApi
        .listOffboarding({
          page: tableQuery.page,
          limit: tableQuery.pageSize,
          search: tableQuery.search || undefined,
          status: tableQuery.status || undefined,
          exit_type: tableQuery.exit_type || undefined,
          employee_id: tableQuery.employee_id ? Number(tableQuery.employee_id) : undefined,
          open_only: tableQuery.open_only || undefined,
        })
        .then((res) => res.data),
  });

  const summaryQuery = useQuery({
    queryKey: ["hr-talent", "offboarding", "summary"],
    queryFn: () => talentApi.offboardingSummary().then((res) => res.data),
  });

  const detailQuery = useQuery({
    queryKey: ["hr-talent", "offboarding", "detail", detailId],
    queryFn: () => talentApi.getOffboarding(detailId!).then((res) => res.data),
    enabled: detailId !== null,
  });

  const invalidate = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["hr-talent"] });
  }, [queryClient]);

  const errorText = (error: any, fallback: string) => error?.response?.data?.message || fallback;

  const resolveEmployeeLabel = React.useCallback(
    (id: number | null | undefined) => {
      if (!id) return null;
      const emp = employees.find((e) => e.id === id);
      return emp ? employeeLabel(emp) : `#${id}`;
    },
    [employees],
  );

  React.useEffect(() => {
    const detail: OffboardingCase | undefined = detailQuery.data?.data;
    if (!detail) return;
    setEditForm({
      last_working_day: detail.last_working_day
        ? String(detail.last_working_day).slice(0, 10)
        : "",
      notified_on: detail.notified_on ? String(detail.notified_on).slice(0, 10) : "",
      reason: detail.reason ?? "",
      exit_interview_notes: detail.exit_interview_notes ?? "",
      exit_interview_at: detail.exit_interview_at
        ? String(detail.exit_interview_at).slice(0, 10)
        : "",
      rehire_eligible: detail.rehire_eligible,
      exit_type: detail.exit_type || "resignation",
    });
    setTaskForm(DEFAULT_TASK);
  }, [detailQuery.data?.data]);

  const open = useMutation({
    mutationFn: () =>
      talentApi.createOffboarding({
        employee_id: Number(form.employee_id),
        exit_type: form.exit_type,
        notified_on: form.notified_on || null,
        last_working_day: form.last_working_day || null,
      }),
    onSuccess: (res) => {
      toast.success(
        t("hr_talent.offboarding.opened", "Exit opened with the standard clearance checklist."),
      );
      invalidate();
      setFormOpen(false);
      const createdId = (res as any)?.data?.data?.id ?? (res as any)?.data?.id;
      if (createdId) setDetailId(Number(createdId));
    },
    onError: (error: any) =>
      toast.error(errorText(error, t("hr_talent.offboarding.open_failed", "Could not open the exit."))),
  });

  const updateCase = useMutation({
    mutationFn: () =>
      talentApi.updateOffboarding(detailId!, {
        last_working_day: editForm.last_working_day || null,
        notified_on: editForm.notified_on || null,
        reason: editForm.reason || null,
        exit_interview_notes: editForm.exit_interview_notes || null,
        exit_interview_at: editForm.exit_interview_at || null,
        rehire_eligible: editForm.rehire_eligible,
        exit_type: editForm.exit_type,
      }),
    onSuccess: () => {
      toast.success(t("hr_talent.offboarding.updated", "Exit case updated."));
      invalidate();
    },
    onError: (error: any) =>
      toast.error(
        errorText(error, t("hr_talent.offboarding.update_failed", "Could not update the exit.")),
      ),
  });

  const addTask = useMutation({
    mutationFn: () =>
      talentApi.addOffboardingTask(detailId!, {
        title: taskForm.title,
        department: taskForm.department,
        category: taskForm.category,
        is_blocking: taskForm.is_blocking,
        due_on: taskForm.due_on || null,
        assignee_id: taskForm.assignee_id ? Number(taskForm.assignee_id) : null,
      }),
    onSuccess: () => {
      toast.success(t("hr_talent.offboarding.task_added", "Checklist task added."));
      invalidate();
      setTaskForm(DEFAULT_TASK);
    },
    onError: (error: any) =>
      toast.error(
        errorText(error, t("hr_talent.offboarding.task_add_failed", "Could not add the task.")),
      ),
  });

  const updateTask = useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status: string; notes?: string | null }) =>
      talentApi.updateOffboardingTask(id, {
        status,
        ...(notes !== undefined ? { notes } : {}),
      }),
    onSuccess: () => {
      invalidate();
    },
    onError: (error: any) =>
      toast.error(errorText(error, t("hr_talent.offboarding.task_failed", "Could not update the task."))),
  });

  // The service refuses to clear while a blocking task is outstanding. Its
  // refusal message names how many, so relay it rather than replacing it.
  const clear = useMutation({
    mutationFn: (id: number) => talentApi.clearOffboarding(id),
    onSuccess: () => {
      toast.success(t("hr_talent.offboarding.cleared", "Exit cleared."));
      invalidate();
    },
    onError: (error: any) =>
      toast.error(errorText(error, t("hr_talent.offboarding.clear_failed", "Could not clear the exit."))),
  });

  const settle = useMutation({
    mutationFn: () =>
      talentApi.settleOffboarding(detailId!, {
        final_settlement_amount: Number(settleAmount || 0),
        notes: settleNotes || null,
      }),
    onSuccess: () => {
      toast.success(t("hr_talent.offboarding.settled", "Final settlement recorded."));
      invalidate();
      setSettleOpen(false);
      setSettleAmount("");
      setSettleNotes("");
    },
    onError: (error: any) =>
      toast.error(errorText(error, t("hr_talent.offboarding.settle_failed", "Could not settle the exit."))),
  });

  const cancelCase = useMutation({
    mutationFn: (id: number) => talentApi.cancelOffboarding(id),
    onSuccess: () => {
      toast.success(t("hr_talent.offboarding.cancelled", "Exit cancelled."));
      invalidate();
      setDetailId(null);
    },
    onError: (error: any) =>
      toast.error(
        errorText(error, t("hr_talent.offboarding.cancel_failed", "Could not cancel the exit.")),
      ),
  });

  const handleTableQueryChange = React.useCallback((query: DataTableQuery) => {
    setTableQuery((prev) => ({
      ...prev,
      page: Number(query.page || 1),
      pageSize: Number(query.pageSize || 10),
      search: String(query.search ?? ""),
    }));
  }, []);

  const summary: OffboardingSummary | undefined = summaryQuery.data?.data;
  const detail: OffboardingCase | undefined = detailQuery.data?.data;
  const assetsOutstanding = n(detail?.issued_assets_outstanding);

  const columns = React.useMemo<ColumnDef<OffboardingCase>[]>(
    () => [
      {
        id: "case",
        header: t("hr_talent.offboarding.case", "Case"),
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-mono text-xs font-bold">{row.original.case_number}</p>
            <p className="text-[11px] text-muted-foreground">
              {row.original.employee?.primary_name ?? `#${row.original.employee_id}`}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "exit_type",
        header: t("hr_talent.offboarding.exit_type", "Exit type"),
        cell: ({ row }) => (
          <Badge variant="outline" className="text-[11px] capitalize">
            {String(row.original.exit_type).replace(/_/g, " ")}
          </Badge>
        ),
      },
      {
        accessorKey: "last_working_day",
        header: t("hr_talent.offboarding.last_day", "Last day"),
        cell: ({ row }) => (
          <span className="text-xs tabular-nums">
            {row.original.last_working_day ? String(row.original.last_working_day).slice(0, 10) : "—"}
          </span>
        ),
      },
      {
        id: "progress",
        header: t("hr_talent.offboarding.clearance", "Clearance"),
        cell: ({ row }) => {
          const percent = n(row.original.completion_percent);
          const blocking = n(row.original.blocking_tasks_outstanding);
          const assets = n(row.original.issued_assets_outstanding);
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums">{percent.toFixed(0)}%</span>
              </div>
              {blocking > 0 ? (
                <p className="text-[11px] font-semibold text-destructive">
                  {t("hr_talent.offboarding.blocking", "{n} blocking").replace("{n}", String(blocking))}
                </p>
              ) : null}
              {assets > 0 ? (
                <p className="text-[11px] font-semibold text-destructive">
                  {t("hr_talent.offboarding.assets_out", "{n} assets still issued").replace(
                    "{n}",
                    String(assets),
                  )}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "access",
        header: t("hr_talent.offboarding.access", "Access"),
        cell: ({ row }) =>
          row.original.access_revoked_at ? (
            <Badge className="text-[11px]">{t("hr_talent.offboarding.revoked", "Revoked")}</Badge>
          ) : (
            <Badge variant="destructive" className="text-[11px]">
              {t("hr_talent.offboarding.active_access", "Still active")}
            </Badge>
          ),
      },
      {
        accessorKey: "status",
        header: t("hr_talent.common.status", "Status"),
        cell: ({ row }) => (
          <Badge variant={(CASE_TONE[row.original.status] ?? "outline") as any} className="text-[11px] capitalize">
            {row.original.status.replace(/_/g, " ")}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setDetailId(row.original.id)}>
              {t("hr_talent.common.open", "Open")}
            </Button>
          </div>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            {t("hr_talent.offboarding.title", "Offboarding and Clearance")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "hr_talent.offboarding.subtitle",
              "Every exit gets the same checklist across HR, IT, facilities and finance — and cannot be settled until the blocking items are done.",
            )}
          </p>
        </div>
        {canManage ? (
          <Button className="rounded-full px-5" onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("hr_talent.offboarding.open_case", "Open Exit")}
          </Button>
        ) : null}
      </div>

      {summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label={t("hr_talent.offboarding.open_cases", "Open exits")}
              value={n(summary.open_cases).toLocaleString()}
              meta={t("hr_talent.offboarding.total_meta", "{n} in total").replace(
                "{n}",
                String(n(summary.total_cases)),
              )}
            />
            <StatTile
              label={t("hr_talent.offboarding.blocked", "Blocked from clearance")}
              value={n(summary.blocked_cases).toLocaleString()}
              alert={n(summary.blocked_cases) > 0}
            />
            <StatTile
              label={t("hr_talent.offboarding.overdue", "Overdue tasks")}
              value={n(summary.overdue_tasks).toLocaleString()}
              alert={n(summary.overdue_tasks) > 0}
            />
            <StatTile
              label={t("hr_talent.offboarding.avg_progress", "Average clearance")}
              value={`${n(summary.average_completion_percent).toFixed(0)}%`}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {summary.payroll_available
              ? t(
                  "hr_talent.offboarding.payroll_hint",
                  "Payroll is available — final pay can be recorded or handed off to payroll when you settle.",
                )
              : t(
                  "hr_talent.offboarding.payroll_manual_hint",
                  "Payroll is not installed — settlement amount is recorded here as a manual-only hand-off.",
                )}
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            <RankedBarChart
              title={t("hr_talent.offboarding.by_department", "Outstanding by department")}
              description={t(
                "hr_talent.offboarding.by_department_desc",
                "Who is holding up clearance, and how much of it is blocking.",
              )}
              rows={(summary.outstanding_by_department ?? []).map((row) => ({
                key: row.department,
                label: row.department,
                value: n(row.outstanding),
                meta: t("hr_talent.offboarding.blocking", "{n} blocking").replace(
                  "{n}",
                  String(n(row.blocking)),
                ),
              }))}
              valueLabel={t("hr_talent.offboarding.open_tasks", "Open tasks")}
              emptyLabel={t("hr_talent.offboarding.nothing_outstanding", "Nothing outstanding.")}
            />
            <ColumnChart
              title={t("hr_talent.offboarding.by_exit_type", "Exits by reason")}
              description={t(
                "hr_talent.offboarding.by_exit_type_desc",
                "Why people are leaving, across every case on record.",
              )}
              rows={(summary.by_exit_type ?? []).map((row) => ({
                key: row.exit_type,
                label: String(row.exit_type).replace(/_/g, " "),
                value: n(row.count),
              }))}
              valueLabel={t("hr_talent.offboarding.cases", "Cases")}
              emptyLabel={t("hr_talent.offboarding.no_cases", "No exits recorded.")}
            />
          </div>
        </>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/50 px-4 py-3">
        <div className="space-y-1.5">
          <Label htmlFor="filter-status" className="text-[11px]">
            {t("hr_talent.common.status", "Status")}
          </Label>
          <select
            id="filter-status"
            value={tableQuery.status}
            onChange={(event) =>
              setTableQuery((prev) => ({ ...prev, status: event.target.value, page: 1 }))
            }
            className="h-9 min-w-[9rem] rounded-md border border-input bg-background px-3 text-sm capitalize"
          >
            <option value="">{t("hr_talent.common.all", "All")}</option>
            {CASE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-exit-type" className="text-[11px]">
            {t("hr_talent.offboarding.exit_type", "Exit type")}
          </Label>
          <select
            id="filter-exit-type"
            value={tableQuery.exit_type}
            onChange={(event) =>
              setTableQuery((prev) => ({ ...prev, exit_type: event.target.value, page: 1 }))
            }
            className="h-9 min-w-[9rem] rounded-md border border-input bg-background px-3 text-sm capitalize"
          >
            <option value="">{t("hr_talent.common.all", "All")}</option>
            {EXIT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-employee" className="text-[11px]">
            {t("hr_talent.common.employee", "Employee")}
          </Label>
          <select
            id="filter-employee"
            value={tableQuery.employee_id}
            onChange={(event) =>
              setTableQuery((prev) => ({ ...prev, employee_id: event.target.value, page: 1 }))
            }
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
        <label className="flex h-9 items-center gap-2 text-sm">
          <Checkbox
            checked={tableQuery.open_only}
            onCheckedChange={(checked) =>
              setTableQuery((prev) => ({ ...prev, open_only: checked === true, page: 1 }))
            }
          />
          {t("hr_talent.offboarding.open_only", "Open only")}
        </label>
      </div>

      <DataTable
        columns={columns}
        data={(listQuery.data?.data ?? []) as OffboardingCase[]}
        totalEntries={listQuery.data?.meta?.total ?? 0}
        loading={listQuery.isLoading}
        pageIndex={tableQuery.page}
        pageSize={tableQuery.pageSize}
        onQueryChange={handleTableQueryChange}
        searchPlaceholder={t("hr_talent.offboarding.search", "Search exits...")}
        resourceName="hr-offboarding"
      />

      {/* Open a case */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">
                {t("hr_talent.offboarding.open_case", "Open Exit")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "hr_talent.offboarding.open_desc",
                  "The standard clearance checklist is created automatically across every department that has to sign off.",
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="exit-employee">{t("hr_talent.common.employee", "Employee")}</Label>
              <select
                id="exit-employee"
                value={form.employee_id}
                onChange={(event) => setForm({ ...form, employee_id: event.target.value })}
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
              <Label htmlFor="exit-type">{t("hr_talent.offboarding.exit_type", "Exit type")}</Label>
              <select
                id="exit-type"
                value={form.exit_type}
                onChange={(event) => setForm({ ...form, exit_type: event.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
              >
                {EXIT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exit-notice">{t("hr_talent.offboarding.notice", "Notice given")}</Label>
              <Input
                id="exit-notice"
                type="date"
                value={form.notified_on}
                onChange={(event) => setForm({ ...form, notified_on: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exit-last">{t("hr_talent.offboarding.last_day", "Last working day")}</Label>
              <Input
                id="exit-last"
                type="date"
                min={form.notified_on || undefined}
                value={form.last_working_day}
                onChange={(event) => setForm({ ...form, last_working_day: event.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border/40 px-6 py-4">
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              {t("hr_talent.common.cancel", "Cancel")}
            </Button>
            <Button onClick={() => open.mutate()} disabled={open.isPending || !form.employee_id}>
              {t("hr_talent.offboarding.open_case", "Open Exit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Case detail */}
      <Dialog open={detailId !== null} onOpenChange={(isOpen) => !isOpen && setDetailId(null)}>
        <DialogContent className="sm:max-w-2xl rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">
                {detail ? detail.case_number : t("hr_talent.offboarding.case", "Case")}
              </DialogTitle>
              <DialogDescription>
                {detail
                  ? `${detail.employee?.primary_name ?? `#${detail.employee_id}`} — ${String(
                      detail.exit_type,
                    ).replace(/_/g, " ")}`
                  : t("hr_talent.common.loading", "Loading...")}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="max-h-[60vh] space-y-5 overflow-y-auto px-6 py-5">
            {detail ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatTile
                    label={t("hr_talent.offboarding.clearance", "Clearance")}
                    value={`${n(detail.completion_percent).toFixed(0)}%`}
                  />
                  <StatTile
                    label={t("hr_talent.offboarding.blocking_outstanding", "Blocking left")}
                    value={n(detail.blocking_tasks_outstanding).toLocaleString()}
                    alert={n(detail.blocking_tasks_outstanding) > 0}
                  />
                  <StatTile
                    label={t("hr_talent.offboarding.issued_assets", "Issued assets")}
                    value={assetsOutstanding.toLocaleString()}
                    alert={assetsOutstanding > 0}
                    meta={t(
                      "hr_talent.offboarding.issued_assets_meta",
                      "Must be resolved in Asset Custody before clear/settle",
                    )}
                  />
                </div>

                {assetsOutstanding > 0 || (detail.issued_assets ?? []).length > 0 ? (
                  <Panel title={t("hr_talent.offboarding.open_assets", "Open asset custody")}>
                    <p className="mb-3 text-xs text-muted-foreground">
                      {t(
                        "hr_talent.offboarding.open_assets_hint",
                        "These records still show status Issued. Checklist “asset return” tasks alone do not clear them — resolve each row under Human Resources → Assets.",
                      )}
                    </p>
                    {(detail.issued_assets ?? []).length > 0 ? (
                      <ul className="mb-3 space-y-2">
                        {detail.issued_assets!.map((asset) => (
                          <li
                            key={asset.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 px-3 py-2 text-sm"
                          >
                            <span className="font-medium">{asset.asset_name}</span>
                            <span className="text-xs capitalize text-muted-foreground">
                              {(asset.asset_category || "").replace(/_/g, " ")}
                              {asset.serial_number ? ` · ${asset.serial_number}` : ""}
                              {asset.issued_date
                                ? ` · issued ${String(asset.issued_date).slice(0, 10)}`
                                : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <Button asChild size="sm" className="rounded-full">
                      <Link href="/dashboard/human-resources/assets">
                        {t(
                          "hr_talent.offboarding.open_asset_custody",
                          "Open Asset Custody",
                        )}
                      </Link>
                    </Button>
                  </Panel>
                ) : null}

                {(detail.settled_at ||
                  detail.final_settlement_amount != null ||
                  detail.access_revoked_at ||
                  detail.completed_at) && (
                  <Panel title={t("hr_talent.offboarding.settlement_status", "Settlement & stamps")}>
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <p>
                        <span className="text-muted-foreground">
                          {t("hr_talent.offboarding.amount", "Settlement amount")}:{" "}
                        </span>
                        {detail.final_settlement_amount != null
                          ? Number(detail.final_settlement_amount).toLocaleString()
                          : "—"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          {t("hr_talent.offboarding.settled_at", "Settled")}:{" "}
                        </span>
                        {detail.settled_at
                          ? String(detail.settled_at).slice(0, 16).replace("T", " ")
                          : "—"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          {t("hr_talent.offboarding.access", "Access")}:{" "}
                        </span>
                        {detail.access_revoked_at
                          ? `${t("hr_talent.offboarding.revoked", "Revoked")} ${String(detail.access_revoked_at).slice(0, 16).replace("T", " ")}`
                          : t("hr_talent.offboarding.active_access", "Still active")}
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          {t("hr_talent.offboarding.completed_at", "Completed")}:{" "}
                        </span>
                        {detail.completed_at
                          ? String(detail.completed_at).slice(0, 16).replace("T", " ")
                          : "—"}
                      </p>
                    </div>
                  </Panel>
                )}

                {canManage && detail.status !== "completed" && detail.status !== "cancelled" ? (
                  <Panel title={t("hr_talent.offboarding.edit_case", "Case details")}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-exit-type">
                          {t("hr_talent.offboarding.exit_type", "Exit type")}
                        </Label>
                        <select
                          id="edit-exit-type"
                          value={editForm.exit_type}
                          onChange={(event) =>
                            setEditForm({ ...editForm, exit_type: event.target.value })
                          }
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
                        >
                          {EXIT_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-last">
                          {t("hr_talent.offboarding.last_day", "Last working day")}
                        </Label>
                        <Input
                          id="edit-last"
                          type="date"
                          value={editForm.last_working_day}
                          onChange={(event) =>
                            setEditForm({ ...editForm, last_working_day: event.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-notice">
                          {t("hr_talent.offboarding.notice", "Notice given")}
                        </Label>
                        <Input
                          id="edit-notice"
                          type="date"
                          value={editForm.notified_on}
                          onChange={(event) =>
                            setEditForm({ ...editForm, notified_on: event.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-interview-at">
                          {t("hr_talent.offboarding.interview_at", "Exit interview date")}
                        </Label>
                        <Input
                          id="edit-interview-at"
                          type="date"
                          value={editForm.exit_interview_at}
                          onChange={(event) =>
                            setEditForm({ ...editForm, exit_interview_at: event.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="edit-reason">
                          {t("hr_talent.offboarding.reason", "Reason")}
                        </Label>
                        <Textarea
                          id="edit-reason"
                          rows={2}
                          value={editForm.reason}
                          onChange={(event) =>
                            setEditForm({ ...editForm, reason: event.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="edit-notes">
                          {t("hr_talent.offboarding.interview_notes", "Exit interview notes")}
                        </Label>
                        <Textarea
                          id="edit-notes"
                          rows={3}
                          value={editForm.exit_interview_notes}
                          onChange={(event) =>
                            setEditForm({
                              ...editForm,
                              exit_interview_notes: event.target.value,
                            })
                          }
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm sm:col-span-2">
                        <Checkbox
                          checked={editForm.rehire_eligible === true}
                          onCheckedChange={(checked) =>
                            setEditForm({
                              ...editForm,
                              rehire_eligible: checked === true ? true : false,
                            })
                          }
                        />
                        {t("hr_talent.offboarding.rehire_eligible", "Eligible for rehire")}
                      </label>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        disabled={updateCase.isPending}
                        onClick={() => updateCase.mutate()}
                      >
                        {t("hr_talent.common.save", "Save")}
                      </Button>
                    </div>
                  </Panel>
                ) : null}

                <Panel title={t("hr_talent.offboarding.checklist", "Clearance checklist")}>
                  {(detail.tasks ?? []).length === 0 ? (
                    <EmptyPanel label={t("hr_talent.offboarding.no_tasks", "No tasks on this case.")} />
                  ) : (
                    <div className="space-y-2">
                      {detail.tasks!.map((task: OffboardingTask) => {
                        const done = task.status === "done" || task.status === "waived";
                        const pending = task.status === "pending";
                        return (
                          <div
                            key={task.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p
                                className={`text-sm font-medium ${done ? "text-muted-foreground line-through" : ""}`}
                              >
                                {task.title}
                              </p>
                              <p className="text-[11px] capitalize text-muted-foreground">
                                {task.department.replace(/_/g, " ")}
                                {task.category
                                  ? ` · ${String(task.category).replace(/_/g, " ")}`
                                  : ""}
                                {task.is_blocking
                                  ? ` · ${t("hr_talent.offboarding.blocks_clearance", "blocks clearance")}`
                                  : ""}
                                {task.assignee_id
                                  ? ` · ${resolveEmployeeLabel(task.assignee_id)}`
                                  : ""}
                                {task.due_on
                                  ? ` · ${t("hr_talent.common.due", "due")} ${String(task.due_on).slice(0, 10)}`
                                  : ""}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              {done ? (
                                <Badge variant="outline" className="text-[11px] capitalize">
                                  {task.status}
                                </Badge>
                              ) : canCompleteTasks ? (
                                <>
                                  {pending ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-[11px]"
                                      disabled={updateTask.isPending}
                                      onClick={() =>
                                        updateTask.mutate({ id: task.id, status: "in_progress" })
                                      }
                                    >
                                      {t("hr_talent.offboarding.mark_progress", "In progress")}
                                    </Button>
                                  ) : (
                                    <Badge variant="secondary" className="text-[11px] capitalize">
                                      {task.status.replace(/_/g, " ")}
                                    </Badge>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-[11px]"
                                    disabled={updateTask.isPending}
                                    onClick={() => updateTask.mutate({ id: task.id, status: "done" })}
                                  >
                                    {t("hr_talent.offboarding.mark_done", "Done")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-[11px]"
                                    disabled={updateTask.isPending}
                                    onClick={() =>
                                      updateTask.mutate({ id: task.id, status: "waived" })
                                    }
                                  >
                                    {t("hr_talent.offboarding.waive", "Waive")}
                                  </Button>
                                </>
                              ) : (
                                <Badge variant="secondary" className="text-[11px] capitalize">
                                  {task.status.replace(/_/g, " ")}
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {canManage && detail.status !== "completed" && detail.status !== "cancelled" ? (
                    <div className="mt-4 space-y-3 border-t border-border/40 pt-4">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {t("hr_talent.offboarding.add_task", "Add custom task")}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor="task-title">
                            {t("hr_talent.offboarding.task_title", "Title")}
                          </Label>
                          <Input
                            id="task-title"
                            value={taskForm.title}
                            onChange={(event) =>
                              setTaskForm({ ...taskForm, title: event.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="task-dept">
                            {t("hr_talent.offboarding.department", "Department")}
                          </Label>
                          <select
                            id="task-dept"
                            value={taskForm.department}
                            onChange={(event) =>
                              setTaskForm({ ...taskForm, department: event.target.value })
                            }
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
                          >
                            {TASK_DEPARTMENTS.map((dept) => (
                              <option key={dept} value={dept}>
                                {dept.replace(/_/g, " ")}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="task-cat">
                            {t("hr_talent.offboarding.category", "Category")}
                          </Label>
                          <select
                            id="task-cat"
                            value={taskForm.category}
                            onChange={(event) =>
                              setTaskForm({ ...taskForm, category: event.target.value })
                            }
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
                          >
                            {TASK_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat.replace(/_/g, " ")}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="task-due">{t("hr_talent.common.due", "Due")}</Label>
                          <Input
                            id="task-due"
                            type="date"
                            value={taskForm.due_on}
                            onChange={(event) =>
                              setTaskForm({ ...taskForm, due_on: event.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="task-assignee">
                            {t("hr_talent.offboarding.assignee", "Assignee")}
                          </Label>
                          <select
                            id="task-assignee"
                            value={taskForm.assignee_id}
                            onChange={(event) =>
                              setTaskForm({ ...taskForm, assignee_id: event.target.value })
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
                        <label className="flex h-9 items-center gap-2 text-sm">
                          <Checkbox
                            checked={taskForm.is_blocking}
                            onCheckedChange={(checked) =>
                              setTaskForm({ ...taskForm, is_blocking: checked === true })
                            }
                          />
                          {t("hr_talent.offboarding.is_blocking", "Blocks clearance")}
                        </label>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={addTask.isPending || !taskForm.title.trim()}
                          onClick={() => addTask.mutate()}
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          {t("hr_talent.offboarding.add_task", "Add custom task")}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </Panel>
              </>
            ) : null}
          </div>

          <DialogFooter className="flex-wrap gap-2 border-t border-border/40 px-6 py-4">
            <Button variant="ghost" onClick={() => setDetailId(null)}>
              {t("hr_talent.common.close", "Close")}
            </Button>
            {detail && detail.status !== "completed" && detail.status !== "cancelled" ? (
              <>
                {canManage ? (
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    disabled={cancelCase.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          t(
                            "hr_talent.offboarding.confirm_cancel",
                            "Cancel this exit? It will not be settled or completed.",
                          ),
                        )
                      ) {
                        cancelCase.mutate(detail.id);
                      }
                    }}
                  >
                    {t("hr_talent.offboarding.cancel_case", "Cancel exit")}
                  </Button>
                ) : null}
                {canManage &&
                (detail.status === "open" || detail.status === "in_progress") ? (
                  <Button
                    variant="outline"
                    disabled={
                      clear.isPending ||
                      n(detail.blocking_tasks_outstanding) > 0 ||
                      assetsOutstanding > 0
                    }
                    onClick={() => clear.mutate(detail.id)}
                    title={
                      assetsOutstanding > 0
                        ? t(
                            "hr_talent.offboarding.assets_block_hint",
                            "Resolve issued assets in Asset Custody before clearing.",
                          )
                        : n(detail.blocking_tasks_outstanding) > 0
                          ? t(
                              "hr_talent.offboarding.blocked_hint",
                              "Blocking tasks must be done before this exit can be cleared.",
                            )
                          : undefined
                    }
                  >
                    {t("hr_talent.offboarding.clear", "Clear")}
                  </Button>
                ) : null}
                {canSettle &&
                (detail.status === "cleared" || detail.status === "in_progress") ? (
                  <Button
                    disabled={
                      n(detail.blocking_tasks_outstanding) > 0 || assetsOutstanding > 0
                    }
                    onClick={() => {
                      setSettleAmount("");
                      setSettleNotes("");
                      setSettleOpen(true);
                    }}
                  >
                    {t("hr_talent.offboarding.settle", "Settle")}
                  </Button>
                ) : null}
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settlement */}
      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">
                {t("hr_talent.offboarding.settle", "Final Settlement")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "hr_talent.offboarding.settle_desc",
                  "Settling closes the case. It is refused while blocking clearance tasks remain or company assets are still issued.",
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-5">
            {summary?.payroll_available ? (
              <p className="text-xs text-muted-foreground">
                {t(
                  "hr_talent.offboarding.settle_payroll_hint",
                  "Payroll is available — you can record final pay here or hand off to payroll afterward.",
                )}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t(
                  "hr_talent.offboarding.settle_manual_hint",
                  "Payroll is not installed — this settlement is a manual record only.",
                )}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="settle-amount">{t("hr_talent.offboarding.amount", "Settlement amount")}</Label>
              <Input
                id="settle-amount"
                type="number"
                min={0}
                value={settleAmount}
                onChange={(event) => setSettleAmount(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settle-notes">
                {t("hr_talent.offboarding.settlement_notes", "Settlement notes")}
              </Label>
              <Textarea
                id="settle-notes"
                rows={4}
                value={settleNotes}
                onChange={(event) => setSettleNotes(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border/40 px-6 py-4">
            <Button variant="ghost" onClick={() => setSettleOpen(false)}>
              {t("hr_talent.common.cancel", "Cancel")}
            </Button>
            <Button onClick={() => settle.mutate()} disabled={settle.isPending || settleAmount === ""}>
              {t("hr_talent.offboarding.settle", "Settle")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
