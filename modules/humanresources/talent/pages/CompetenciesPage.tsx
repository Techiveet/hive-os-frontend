"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { hrFetch } from "@/modules/humanresources/api";
import { talentApi } from "@/modules/humanresources/talent/api";
import type {
  Competency,
  EmployeeCompetency,
  PositionCompetency,
} from "@/modules/humanresources/talent/types";

type CompetencyForm = {
  id?: number;
  code: string;
  name: string;
  category: string;
  description: string;
  max_level: string;
  is_active: boolean;
};

const DEFAULT_COMPETENCY: CompetencyForm = {
  code: "",
  name: "",
  category: "",
  description: "",
  max_level: "5",
  is_active: true,
};

type AssessForm = {
  employee_id: string;
  competency_id: string;
  proficiency_level: string;
  assessed_on: string;
  evidence: string;
  notes: string;
};

type RequirementForm = {
  position_id: string;
  competency_id: string;
  required_level: string;
  is_critical: boolean;
};

type ViewTab = "framework" | "assessments" | "requirements";

export default function CompetenciesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const scope = getWorkspaceScopeKey();
  const { hasAnyPermission } = usePermissions();
  const canManage = hasAnyPermission(["manage_competencies", "manage_talent"]);
  const canAssess = hasAnyPermission(["assess_competencies", "manage_competencies", "manage_talent"]);

  const [view, setView] = React.useState<ViewTab>("framework");
  const [tableQuery, setTableQuery] = React.useState({
    page: 1,
    pageSize: 10,
    search: "",
    category: "",
    is_active: "" as "" | "1" | "0",
  });
  const [assessQuery, setAssessQuery] = React.useState({
    page: 1,
    pageSize: 10,
    search: "",
    employee_id: "",
    competency_id: "",
  });
  const [requireQuery, setRequireQuery] = React.useState({
    page: 1,
    pageSize: 10,
    search: "",
    position_id: "",
    competency_id: "",
    is_critical: "" as "" | "1" | "0",
  });

  const [formOpen, setFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<CompetencyForm>(DEFAULT_COMPETENCY);
  const [assessOpen, setAssessOpen] = React.useState(false);
  const [assess, setAssess] = React.useState<AssessForm>({
    employee_id: "",
    competency_id: "",
    proficiency_level: "1",
    assessed_on: new Date().toISOString().slice(0, 10),
    evidence: "",
    notes: "",
  });
  const [requirementOpen, setRequirementOpen] = React.useState(false);
  const [requirement, setRequirement] = React.useState<RequirementForm>({
    position_id: "",
    competency_id: "",
    required_level: "3",
    is_critical: false,
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [competencyToDelete, setCompetencyToDelete] = React.useState<Competency | null>(null);

  const employeesQuery = useQuery({
    queryKey: ["hr-employees-lite", scope],
    queryFn: () =>
      hrFetch<{ data: Array<{ id: number; primary_name?: string; employee_number?: string }> }>(
        "/employees?per_page=500",
      ),
    staleTime: 5 * 60 * 1000,
  });
  const employees = employeesQuery.data?.data ?? [];

  const positionsQuery = useQuery({
    queryKey: ["hr-positions-lite", scope],
    queryFn: () =>
      hrFetch<{ data: Array<{ id: number; title?: string; code?: string }> }>("/positions?per_page=200"),
    staleTime: 5 * 60 * 1000,
  });
  const positions = positionsQuery.data?.data ?? [];

  const allCompetenciesQuery = useQuery({
    queryKey: ["hr-talent", "competencies", "options"],
    queryFn: () =>
      talentApi.listCompetencies({ limit: 200, is_active: true }).then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });
  const competencyOptions = (allCompetenciesQuery.data?.data ?? []) as Competency[];

  const listQuery = useQuery({
    queryKey: ["hr-talent", "competencies", tableQuery],
    queryFn: () =>
      talentApi
        .listCompetencies({
          page: tableQuery.page,
          limit: tableQuery.pageSize,
          search: tableQuery.search || undefined,
          category: tableQuery.category || undefined,
          is_active:
            tableQuery.is_active === ""
              ? undefined
              : tableQuery.is_active === "1",
        })
        .then((res) => res.data),
    enabled: view === "framework",
  });

  const assessmentsQuery = useQuery({
    queryKey: ["hr-talent", "competencies", "assessments", assessQuery],
    queryFn: () =>
      talentApi
        .listEmployeeCompetencies({
          page: assessQuery.page,
          limit: assessQuery.pageSize,
          search: assessQuery.search || undefined,
          employee_id: assessQuery.employee_id ? Number(assessQuery.employee_id) : undefined,
          competency_id: assessQuery.competency_id
            ? Number(assessQuery.competency_id)
            : undefined,
        })
        .then((res) => res.data),
    enabled: view === "assessments",
  });

  const requirementsQuery = useQuery({
    queryKey: ["hr-talent", "competencies", "requirements", requireQuery],
    queryFn: () =>
      talentApi
        .listPositionCompetencies({
          page: requireQuery.page,
          limit: requireQuery.pageSize,
          search: requireQuery.search || undefined,
          position_id: requireQuery.position_id ? Number(requireQuery.position_id) : undefined,
          competency_id: requireQuery.competency_id
            ? Number(requireQuery.competency_id)
            : undefined,
          is_critical:
            requireQuery.is_critical === ""
              ? undefined
              : requireQuery.is_critical === "1",
        })
        .then((res) => res.data),
    enabled: view === "requirements",
  });

  const invalidate = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["hr-talent"] });
  }, [queryClient]);

  const errorText = (error: any, fallback: string) =>
    error?.response?.data?.message || fallback;

  const selectedAssessCompetency = competencyOptions.find(
    (c) => String(c.id) === assess.competency_id,
  );
  const selectedRequireCompetency = competencyOptions.find(
    (c) => String(c.id) === requirement.competency_id,
  );
  const assessMax = selectedAssessCompetency?.max_level ?? 10;
  const requireMax = selectedRequireCompetency?.max_level ?? 10;

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        code: form.code,
        name: form.name,
        category: form.category || null,
        description: form.description || null,
        max_level: Number(form.max_level || 5),
        is_active: form.is_active,
      };

      return form.id ? talentApi.updateCompetency(form.id, payload) : talentApi.createCompetency(payload);
    },
    onSuccess: () => {
      toast.success(t("hr_talent.competencies.saved", "Competency saved."));
      invalidate();
      setFormOpen(false);
      setForm(DEFAULT_COMPETENCY);
    },
    onError: (error: any) =>
      toast.error(errorText(error, t("hr_talent.competencies.save_failed", "Could not save the competency."))),
  });

  const remove = useMutation({
    mutationFn: (id: number) => talentApi.deleteCompetency(id),
    onSuccess: (response: any) => {
      toast.success(response?.data?.message || t("hr_talent.competencies.deleted", "Competency deleted."));
      invalidate();
    },
    onError: (error: any) =>
      toast.error(errorText(error, t("hr_talent.competencies.delete_failed", "Could not remove it."))),
  });

  const saveAssessment = useMutation({
    mutationFn: () => {
      const level = Math.min(Number(assess.proficiency_level || 0), assessMax);
      return talentApi.setEmployeeCompetency({
        employee_id: Number(assess.employee_id),
        competency_id: Number(assess.competency_id),
        proficiency_level: level,
        assessed_on: assess.assessed_on || null,
        evidence: assess.evidence || null,
        notes: assess.notes || null,
      });
    },
    onSuccess: () => {
      toast.success(t("hr_talent.competencies.assessed", "Assessment recorded."));
      invalidate();
      setAssessOpen(false);
      setView("assessments");
    },
    onError: (error: any) =>
      toast.error(errorText(error, t("hr_talent.competencies.assess_failed", "Could not record the assessment."))),
  });

  const saveRequirement = useMutation({
    mutationFn: () => {
      const level = Math.min(Math.max(1, Number(requirement.required_level || 1)), requireMax);
      return talentApi.setPositionCompetency({
        position_id: Number(requirement.position_id),
        competency_id: Number(requirement.competency_id),
        required_level: level,
        is_critical: requirement.is_critical,
      });
    },
    onSuccess: () => {
      toast.success(t("hr_talent.competencies.required", "Position requirement saved."));
      invalidate();
      setRequirementOpen(false);
      setView("requirements");
    },
    onError: (error: any) =>
      toast.error(errorText(error, t("hr_talent.competencies.require_failed", "Could not save the requirement."))),
  });

  const confirmDelete = (competency: Competency) => {
    setCompetencyToDelete(competency);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (competencyToDelete) {
      remove.mutate(competencyToDelete.id);
      setDeleteConfirmOpen(false);
      setCompetencyToDelete(null);
    }
  };

  const handleTableQueryChange = React.useCallback((query: DataTableQuery) => {
    setTableQuery((prev) => ({
      ...prev,
      page: Number(query.page || 1),
      pageSize: Number(query.pageSize || 10),
      search: String(query.search ?? ""),
    }));
  }, []);

  const handleAssessQueryChange = React.useCallback((query: DataTableQuery) => {
    setAssessQuery((prev) => ({
      ...prev,
      page: Number(query.page || 1),
      pageSize: Number(query.pageSize || 10),
      search: String(query.search ?? ""),
    }));
  }, []);

  const handleRequireQueryChange = React.useCallback((query: DataTableQuery) => {
    setRequireQuery((prev) => ({
      ...prev,
      page: Number(query.page || 1),
      pageSize: Number(query.pageSize || 10),
      search: String(query.search ?? ""),
    }));
  }, []);

  const competencies = (listQuery.data?.data ?? []) as Competency[];
  const assessments = (assessmentsQuery.data?.data ?? []) as EmployeeCompetency[];
  const requirements = (requirementsQuery.data?.data ?? []) as PositionCompetency[];

  const frameworkColumns = React.useMemo<ColumnDef<Competency>[]>(
    () => [
      {
        id: "competency",
        header: t("hr_talent.competencies.competency", "Competency"),
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-bold">{row.original.name}</p>
            <p className="font-mono text-[11px] text-muted-foreground">{row.original.code}</p>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: t("hr_talent.common.category", "Category"),
        cell: ({ row }) =>
          row.original.category ? (
            <Badge variant="outline" className="text-[11px] font-semibold capitalize">
              {row.original.category.replace(/_/g, " ")}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "max_level",
        header: t("hr_talent.competencies.scale", "Scale"),
        cell: ({ row }) => (
          <span className="text-xs tabular-nums">1 – {row.original.max_level}</span>
        ),
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
                  setForm({
                    id: row.original.id,
                    code: row.original.code,
                    name: row.original.name,
                    category: row.original.category ?? "",
                    description: row.original.description ?? "",
                    max_level: String(row.original.max_level ?? 5),
                    is_active: row.original.is_active,
                  });
                  setFormOpen(true);
                }}
              >
                {t("hr_talent.common.edit", "Edit")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => confirmDelete(row.original)}
                aria-label={t("hr_talent.common.remove", "Remove")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : null,
      },
    ],
    [t, canManage],
  );

  const assessmentColumns = React.useMemo<ColumnDef<EmployeeCompetency>[]>(
    () => [
      {
        id: "employee",
        header: t("hr_talent.common.employee", "Employee"),
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-medium">
              {row.original.employee?.primary_name ?? `#${row.original.employee_id}`}
            </p>
            {row.original.employee?.employee_number ? (
              <p className="font-mono text-[11px] text-muted-foreground">
                {row.original.employee.employee_number}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "competency",
        header: t("hr_talent.competencies.competency", "Competency"),
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-medium">{row.original.competency?.name ?? `#${row.original.competency_id}`}</p>
            {row.original.competency?.code ? (
              <p className="font-mono text-[11px] text-muted-foreground">{row.original.competency.code}</p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "proficiency_level",
        header: t("hr_talent.competencies.level", "Level"),
        cell: ({ row }) => (
          <span className="tabular-nums font-semibold">
            {row.original.proficiency_level}
            {row.original.competency?.max_level != null
              ? ` / ${row.original.competency.max_level}`
              : ""}
          </span>
        ),
      },
      {
        accessorKey: "assessed_on",
        header: t("hr_talent.competencies.assessed_on", "Assessed on"),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.assessed_on ? String(row.original.assessed_on).slice(0, 10) : "—"}
          </span>
        ),
      },
      {
        accessorKey: "evidence",
        header: t("hr_talent.competencies.evidence", "Evidence"),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground line-clamp-2">
            {row.original.evidence || row.original.notes || "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          canAssess ? (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAssess({
                    employee_id: String(row.original.employee_id),
                    competency_id: String(row.original.competency_id),
                    proficiency_level: String(row.original.proficiency_level),
                    assessed_on: row.original.assessed_on
                      ? String(row.original.assessed_on).slice(0, 10)
                      : new Date().toISOString().slice(0, 10),
                    evidence: row.original.evidence ?? "",
                    notes: row.original.notes ?? "",
                  });
                  setAssessOpen(true);
                }}
              >
                {t("hr_talent.common.edit", "Edit")}
              </Button>
            </div>
          ) : null,
      },
    ],
    [t, canAssess],
  );

  const requirementColumns = React.useMemo<ColumnDef<PositionCompetency>[]>(
    () => [
      {
        id: "position",
        header: t("hr_talent.common.position", "Position"),
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-medium">
              {row.original.position?.title ?? `#${row.original.position_id}`}
            </p>
            {row.original.position?.code ? (
              <p className="font-mono text-[11px] text-muted-foreground">{row.original.position.code}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "competency",
        header: t("hr_talent.competencies.competency", "Competency"),
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-medium">{row.original.competency?.name ?? `#${row.original.competency_id}`}</p>
            {row.original.competency?.code ? (
              <p className="font-mono text-[11px] text-muted-foreground">{row.original.competency.code}</p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "required_level",
        header: t("hr_talent.competencies.required_level", "Required level"),
        cell: ({ row }) => (
          <span className="tabular-nums font-semibold">
            {row.original.required_level}
            {row.original.competency?.max_level != null
              ? ` / ${row.original.competency.max_level}`
              : ""}
          </span>
        ),
      },
      {
        accessorKey: "is_critical",
        header: t("hr_talent.competencies.critical", "Critical"),
        cell: ({ row }) =>
          row.original.is_critical ? (
            <Badge variant="destructive" className="text-[11px]">
              {t("hr_talent.competencies.critical", "Critical")}
            </Badge>
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
                  setRequirement({
                    position_id: String(row.original.position_id),
                    competency_id: String(row.original.competency_id),
                    required_level: String(row.original.required_level),
                    is_critical: row.original.is_critical,
                  });
                  setRequirementOpen(true);
                }}
              >
                {t("hr_talent.common.edit", "Edit")}
              </Button>
            </div>
          ) : null,
      },
    ],
    [t, canManage],
  );

  const viewTabs: { id: ViewTab; label: string }[] = [
    { id: "framework", label: t("hr_talent.competencies.tab_framework", "Framework") },
    { id: "assessments", label: t("hr_talent.competencies.tab_assessments", "Assessments") },
    { id: "requirements", label: t("hr_talent.competencies.tab_requirements", "Role requirements") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            {t("hr_talent.competencies.title", "Competency Framework")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "hr_talent.competencies.subtitle",
              "The skills the business names, the level each role needs, and where each person currently stands.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full px-5" asChild>
            <Link href="/dashboard/human-resources/talent/succession">
              {t("hr_talent.competencies.open_succession", "Succession gaps")}
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
          {canManage ? (
            <Button
              variant="outline"
              className="rounded-full px-5"
              onClick={() => {
                setRequirement({
                  position_id: "",
                  competency_id: "",
                  required_level: "3",
                  is_critical: false,
                });
                setRequirementOpen(true);
              }}
            >
              {t("hr_talent.competencies.set_requirement", "Role Requirement")}
            </Button>
          ) : null}
          {canAssess ? (
            <Button
              variant="outline"
              className="rounded-full px-5"
              onClick={() => {
                setAssess({
                  employee_id: "",
                  competency_id: "",
                  proficiency_level: "1",
                  assessed_on: new Date().toISOString().slice(0, 10),
                  evidence: "",
                  notes: "",
                });
                setAssessOpen(true);
              }}
            >
              {t("hr_talent.competencies.assess", "Assess Employee")}
            </Button>
          ) : null}
          {canManage ? (
            <Button
              className="rounded-full px-5"
              onClick={() => {
                setForm(DEFAULT_COMPETENCY);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("hr_talent.competencies.add", "Add Competency")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {viewTabs.map((tab) => (
          <Button
            key={tab.id}
            variant={view === tab.id ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setView(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {view === "framework" ? (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="comp-filter-category">{t("hr_talent.common.category", "Category")}</Label>
              <Input
                id="comp-filter-category"
                className="h-9 w-48"
                value={tableQuery.category}
                placeholder={t("hr_talent.competencies.category_hint", "Leadership, Technical...")}
                onChange={(event) =>
                  setTableQuery({ ...tableQuery, page: 1, category: event.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comp-filter-active">{t("hr_talent.common.status", "Status")}</Label>
              <select
                id="comp-filter-active"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={tableQuery.is_active}
                onChange={(event) =>
                  setTableQuery({
                    ...tableQuery,
                    page: 1,
                    is_active: event.target.value as "" | "1" | "0",
                  })
                }
              >
                <option value="">{t("hr_talent.common.all", "All")}</option>
                <option value="1">{t("hr_talent.common.active", "Active")}</option>
                <option value="0">{t("hr_talent.common.inactive", "Inactive")}</option>
              </select>
            </div>
          </div>

          <DataTable
            columns={frameworkColumns}
            data={competencies}
            totalEntries={listQuery.data?.meta?.total ?? 0}
            loading={listQuery.isLoading}
            pageIndex={tableQuery.page}
            pageSize={tableQuery.pageSize}
            onQueryChange={handleTableQueryChange}
            searchPlaceholder={t("hr_talent.competencies.search", "Search competencies...")}
            resourceName="hr-competencies"
          />
        </>
      ) : null}

      {view === "assessments" ? (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="assess-filter-employee">{t("hr_talent.common.employee", "Employee")}</Label>
              <select
                id="assess-filter-employee"
                className="h-9 max-w-xs rounded-md border border-input bg-background px-3 text-sm"
                value={assessQuery.employee_id}
                onChange={(event) =>
                  setAssessQuery({ ...assessQuery, page: 1, employee_id: event.target.value })
                }
              >
                <option value="">{t("hr_talent.common.all", "All")}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.primary_name ?? `#${emp.id}`}
                    {emp.employee_number ? ` (${emp.employee_number})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assess-filter-comp">{t("hr_talent.competencies.competency", "Competency")}</Label>
              <select
                id="assess-filter-comp"
                className="h-9 max-w-xs rounded-md border border-input bg-background px-3 text-sm"
                value={assessQuery.competency_id}
                onChange={(event) =>
                  setAssessQuery({ ...assessQuery, page: 1, competency_id: event.target.value })
                }
              >
                <option value="">{t("hr_talent.common.all", "All")}</option>
                {competencyOptions.map((competency) => (
                  <option key={competency.id} value={competency.id}>
                    {competency.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DataTable
            columns={assessmentColumns}
            data={assessments}
            totalEntries={assessmentsQuery.data?.meta?.total ?? 0}
            loading={assessmentsQuery.isLoading}
            pageIndex={assessQuery.page}
            pageSize={assessQuery.pageSize}
            onQueryChange={handleAssessQueryChange}
            searchPlaceholder={t(
              "hr_talent.competencies.search_assessments",
              "Search by person or competency...",
            )}
            resourceName="hr-employee-competencies"
          />
        </>
      ) : null}

      {view === "requirements" ? (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="req-filter-position">{t("hr_talent.common.position", "Position")}</Label>
              <select
                id="req-filter-position"
                className="h-9 max-w-xs rounded-md border border-input bg-background px-3 text-sm"
                value={requireQuery.position_id}
                onChange={(event) =>
                  setRequireQuery({ ...requireQuery, page: 1, position_id: event.target.value })
                }
              >
                <option value="">{t("hr_talent.common.all", "All")}</option>
                {positions.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.title ?? `#${pos.id}`}
                    {pos.code ? ` (${pos.code})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-filter-comp">{t("hr_talent.competencies.competency", "Competency")}</Label>
              <select
                id="req-filter-comp"
                className="h-9 max-w-xs rounded-md border border-input bg-background px-3 text-sm"
                value={requireQuery.competency_id}
                onChange={(event) =>
                  setRequireQuery({ ...requireQuery, page: 1, competency_id: event.target.value })
                }
              >
                <option value="">{t("hr_talent.common.all", "All")}</option>
                {competencyOptions.map((competency) => (
                  <option key={competency.id} value={competency.id}>
                    {competency.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-filter-critical">{t("hr_talent.competencies.critical", "Critical")}</Label>
              <select
                id="req-filter-critical"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={requireQuery.is_critical}
                onChange={(event) =>
                  setRequireQuery({
                    ...requireQuery,
                    page: 1,
                    is_critical: event.target.value as "" | "1" | "0",
                  })
                }
              >
                <option value="">{t("hr_talent.common.all", "All")}</option>
                <option value="1">{t("hr_talent.competencies.critical_only", "Critical only")}</option>
                <option value="0">{t("hr_talent.competencies.non_critical", "Non-critical")}</option>
              </select>
            </div>
          </div>

          <DataTable
            columns={requirementColumns}
            data={requirements}
            totalEntries={requirementsQuery.data?.meta?.total ?? 0}
            loading={requirementsQuery.isLoading}
            pageIndex={requireQuery.page}
            pageSize={requireQuery.pageSize}
            onQueryChange={handleRequireQueryChange}
            searchPlaceholder={t(
              "hr_talent.competencies.search_requirements",
              "Search by role or competency...",
            )}
            resourceName="hr-position-competencies"
          />
        </>
      ) : null}

      {/* Competency */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">
                {form.id
                  ? t("hr_talent.competencies.edit", "Edit Competency")
                  : t("hr_talent.competencies.new", "New Competency")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "hr_talent.competencies.form_desc",
                  "A competency is measured on one scale everywhere it is used, so keep the scale stable once people have been assessed against it.",
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="comp-code">{t("hr_talent.common.code", "Code")}</Label>
              <Input
                id="comp-code"
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
                placeholder="LEAD-01"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comp-name">{t("hr_talent.common.name", "Name")}</Label>
              <Input
                id="comp-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comp-category">{t("hr_talent.common.category", "Category")}</Label>
              <Input
                id="comp-category"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
                placeholder={t("hr_talent.competencies.category_hint", "Leadership, Technical, Safety...")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comp-max">{t("hr_talent.competencies.max_level", "Highest level")}</Label>
              <Input
                id="comp-max"
                type="number"
                min={1}
                max={10}
                value={form.max_level}
                onChange={(event) => setForm({ ...form, max_level: event.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="comp-desc">{t("hr_talent.common.description", "Description")}</Label>
              <Textarea
                id="comp-desc"
                rows={3}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch
                id="comp-active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label htmlFor="comp-active">{t("hr_talent.common.active", "Active")}</Label>
            </div>
          </div>

          <DialogFooter className="border-t border-border/40 px-6 py-4">
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              {t("hr_talent.common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={() => save.mutate()}
              disabled={save.isPending || !form.code.trim() || !form.name.trim()}
            >
              {t("hr_talent.common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assessment */}
      <Dialog open={assessOpen} onOpenChange={setAssessOpen}>
        <DialogContent className="sm:max-w-lg rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">
                {t("hr_talent.competencies.assess", "Assess Employee")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "hr_talent.competencies.assess_desc",
                  "Recording a level here closes succession gaps and moves development plans forward automatically.",
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="assess-employee">{t("hr_talent.common.employee", "Employee")}</Label>
              <select
                id="assess-employee"
                value={assess.employee_id}
                onChange={(event) => setAssess({ ...assess, employee_id: event.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("hr_talent.common.select", "Select...")}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.primary_name ?? `#${emp.id}`}
                    {emp.employee_number ? ` (${emp.employee_number})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="assess-competency">{t("hr_talent.competencies.competency", "Competency")}</Label>
              <select
                id="assess-competency"
                value={assess.competency_id}
                onChange={(event) => {
                  const nextId = event.target.value;
                  const next = competencyOptions.find((c) => String(c.id) === nextId);
                  const max = next?.max_level ?? 10;
                  setAssess({
                    ...assess,
                    competency_id: nextId,
                    proficiency_level: String(
                      Math.min(Number(assess.proficiency_level || 0), max),
                    ),
                  });
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("hr_talent.common.select", "Select...")}</option>
                {competencyOptions.map((competency) => (
                  <option key={competency.id} value={competency.id}>
                    {competency.name} (1–{competency.max_level})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assess-level">
                {t("hr_talent.competencies.level", "Level")}
                {selectedAssessCompetency ? ` (max ${assessMax})` : ""}
              </Label>
              <Input
                id="assess-level"
                type="number"
                min={0}
                max={assessMax}
                value={assess.proficiency_level}
                onChange={(event) => setAssess({ ...assess, proficiency_level: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assess-date">{t("hr_talent.competencies.assessed_on", "Assessed on")}</Label>
              <Input
                id="assess-date"
                type="date"
                value={assess.assessed_on}
                onChange={(event) => setAssess({ ...assess, assessed_on: event.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="assess-evidence">{t("hr_talent.competencies.evidence", "Evidence")}</Label>
              <Input
                id="assess-evidence"
                value={assess.evidence}
                onChange={(event) => setAssess({ ...assess, evidence: event.target.value })}
                placeholder={t("hr_talent.competencies.evidence_hint", "Certificate, appraisal, observation")}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="assess-notes">{t("hr_talent.common.notes", "Notes")}</Label>
              <Textarea
                id="assess-notes"
                rows={2}
                value={assess.notes}
                onChange={(event) => setAssess({ ...assess, notes: event.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border/40 px-6 py-4">
            <Button variant="ghost" onClick={() => setAssessOpen(false)}>
              {t("hr_talent.common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={() => saveAssessment.mutate()}
              disabled={saveAssessment.isPending || !assess.employee_id || !assess.competency_id}
            >
              {t("hr_talent.common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Position requirement */}
      <Dialog open={requirementOpen} onOpenChange={setRequirementOpen}>
        <DialogContent className="sm:max-w-lg rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">
                {t("hr_talent.competencies.set_requirement", "Role Requirement")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "hr_talent.competencies.require_desc",
                  "Marking a requirement critical caps anyone who does not meet it below ready-now, however well they score elsewhere.",
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="require-position">{t("hr_talent.common.position", "Position")}</Label>
              <select
                id="require-position"
                value={requirement.position_id}
                onChange={(event) => setRequirement({ ...requirement, position_id: event.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("hr_talent.common.select", "Select...")}</option>
                {positions.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.title ?? `#${pos.id}`}
                    {pos.code ? ` (${pos.code})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="require-competency">{t("hr_talent.competencies.competency", "Competency")}</Label>
              <select
                id="require-competency"
                value={requirement.competency_id}
                onChange={(event) => {
                  const nextId = event.target.value;
                  const next = competencyOptions.find((c) => String(c.id) === nextId);
                  const max = next?.max_level ?? 10;
                  setRequirement({
                    ...requirement,
                    competency_id: nextId,
                    required_level: String(
                      Math.min(Math.max(1, Number(requirement.required_level || 1)), max),
                    ),
                  });
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("hr_talent.common.select", "Select...")}</option>
                {competencyOptions.map((competency) => (
                  <option key={competency.id} value={competency.id}>
                    {competency.name} (1–{competency.max_level})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="require-level">
                {t("hr_talent.competencies.required_level", "Required level")}
                {selectedRequireCompetency ? ` (max ${requireMax})` : ""}
              </Label>
              <Input
                id="require-level"
                type="number"
                min={1}
                max={requireMax}
                value={requirement.required_level}
                onChange={(event) =>
                  setRequirement({ ...requirement, required_level: event.target.value })
                }
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="require-critical"
                checked={requirement.is_critical}
                onCheckedChange={(checked) => setRequirement({ ...requirement, is_critical: checked })}
              />
              <Label htmlFor="require-critical">{t("hr_talent.competencies.critical", "Critical")}</Label>
            </div>
          </div>

          <DialogFooter className="border-t border-border/40 px-6 py-4">
            <Button variant="ghost" onClick={() => setRequirementOpen(false)}>
              {t("hr_talent.common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={() => saveRequirement.mutate()}
              disabled={
                saveRequirement.isPending || !requirement.position_id || !requirement.competency_id
              }
            >
              {t("hr_talent.common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-[2rem] border-border/60 bg-background/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("hr_talent.competencies.delete_title", "Remove competency?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {competencyToDelete
                ? t(
                    "hr_talent.competencies.confirm_delete",
                    "Remove “{name}”? If it is already in use it will be deactivated instead.",
                  ).replace("{name}", competencyToDelete.name)
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">
              {t("hr_talent.common.cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={remove.isPending}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("hr_talent.common.remove", "Remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
