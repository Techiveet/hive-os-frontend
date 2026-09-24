"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ExternalLink, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/store/use-translation";
import { usePermissions } from "@/hooks/use-permissions";
import { getWorkspaceScopeKey } from "@/lib/runtime-context";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { hrFetch } from "@/modules/humanresources/api";
import { talentApi } from "@/modules/humanresources/talent/api";
import type {
  CareerAspiration,
  CompetencyGap,
  CriticalRole,
  PipelineRole,
  SuccessionCandidate,
  SuccessionPipeline,
} from "@/modules/humanresources/talent/types";
import { EmptyPanel, LoadingPanel, Panel, StatTile } from "@/modules/shared/charts/primitives";
import { SeverityBands } from "@/modules/shared/charts/charts";

type LiteEmployee = { id: number; primary_name?: string; employee_number?: string };
type LitePosition = { id: number; title?: string; code?: string };

const n = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const READINESS_SEVERITY: Record<string, string> = {
  ready_now: "good",
  ready_1_2_years: "caution",
  ready_3_5_years: "warning",
  not_ready: "critical",
};

const READINESS_OPTIONS = [
  "ready_now",
  "ready_1_2_years",
  "ready_3_5_years",
  "not_ready",
] as const;

const CANDIDATE_STATUSES = ["nominated", "in_development", "withdrawn", "promoted"] as const;

const LEVELS = ["low", "medium", "high"] as const;

type RoleForm = {
  id?: number;
  position_id: string;
  incumbent_employee_id: string;
  criticality: string;
  vacancy_risk: string;
  target_successor_count: string;
  impact_notes: string;
  is_active: boolean;
};

const DEFAULT_ROLE: RoleForm = {
  position_id: "",
  incumbent_employee_id: "",
  criticality: "high",
  vacancy_risk: "medium",
  target_successor_count: "2",
  impact_notes: "",
  is_active: true,
};

type CandidateForm = {
  id?: number;
  critical_role_id: string;
  employee_id: string;
  readiness: string;
  status: string;
  assessment_score: string;
  assessment_notes: string;
};

type AspirationForm = {
  employee_id: string;
  desired_position_id: string;
  desired_role: string;
  horizon_years: string;
  open_to_relocation: boolean;
  notes: string;
};

const DEFAULT_ASPIRATION: AspirationForm = {
  employee_id: "",
  desired_position_id: "",
  desired_role: "",
  horizon_years: "",
  open_to_relocation: false,
  notes: "",
};

export default function SuccessionPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const scope = getWorkspaceScopeKey();
  const { hasAnyPermission } = usePermissions();
  const canManage = hasAnyPermission(["manage_succession", "manage_talent"]);
  const canAddAspiration = hasAnyPermission([
    "manage_succession",
    "manage_talent",
    "edit_own_profile",
  ]);

  const [roleOpen, setRoleOpen] = React.useState(false);
  const [roleForm, setRoleForm] = React.useState<RoleForm>(DEFAULT_ROLE);
  const [candidateOpen, setCandidateOpen] = React.useState(false);
  const [candidateForm, setCandidateForm] = React.useState<CandidateForm>({
    critical_role_id: "",
    employee_id: "",
    readiness: "ready_3_5_years",
    status: "nominated",
    assessment_score: "",
    assessment_notes: "",
  });
  const [aspirationOpen, setAspirationOpen] = React.useState(false);
  const [aspirationForm, setAspirationForm] = React.useState<AspirationForm>(DEFAULT_ASPIRATION);

  const [gapEmployee, setGapEmployee] = React.useState("");
  const [gapPosition, setGapPosition] = React.useState("");
  const [gapPair, setGapPair] = React.useState<{ employee: number; position: number } | null>(null);

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

  const pipelineQuery = useQuery({
    queryKey: ["hr-talent", "succession", "pipeline"],
    queryFn: () => talentApi.pipeline().then((res) => res.data),
  });

  const rolesQuery = useQuery({
    queryKey: ["hr-talent", "succession", "critical-roles"],
    queryFn: () => talentApi.listCriticalRoles({ limit: 100 }).then((res) => res.data),
  });

  const aspirationsQuery = useQuery({
    queryKey: ["hr-talent", "succession", "aspirations"],
    queryFn: () => talentApi.listAspirations({ limit: 50 }).then((res) => res.data),
  });

  const gapQuery = useQuery({
    queryKey: ["hr-talent", "succession", "gap", gapPair],
    queryFn: () => talentApi.gap(gapPair!.employee, gapPair!.position).then((res) => res.data),
    enabled: gapPair !== null,
  });

  const employeeLabel = (emp: LiteEmployee) =>
    `${emp.primary_name ?? `#${emp.id}`}${emp.employee_number ? ` (${emp.employee_number})` : ""}`;

  const positionLabel = (pos: LitePosition) =>
    `${pos.title ?? `#${pos.id}`}${pos.code ? ` (${pos.code})` : ""}`;

  const invalidate = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["hr-talent"] });
  }, [queryClient]);

  const errorText = (error: any, fallback: string) => error?.response?.data?.message || fallback;

  const saveRole = useMutation({
    mutationFn: () => {
      const payload = {
        incumbent_employee_id: roleForm.incumbent_employee_id
          ? Number(roleForm.incumbent_employee_id)
          : null,
        criticality: roleForm.criticality,
        vacancy_risk: roleForm.vacancy_risk,
        target_successor_count: Number(roleForm.target_successor_count || 1),
        impact_notes: roleForm.impact_notes || null,
        is_active: roleForm.is_active,
      };
      if (roleForm.id) {
        return talentApi.updateCriticalRole(roleForm.id, payload);
      }
      return talentApi.createCriticalRole({
        ...payload,
        position_id: Number(roleForm.position_id),
      });
    },
    onSuccess: () => {
      toast.success(t("hr_talent.succession.role_saved", "Critical role saved."));
      invalidate();
      setRoleOpen(false);
      setRoleForm(DEFAULT_ROLE);
    },
    onError: (error: any) =>
      toast.error(errorText(error, t("hr_talent.succession.role_failed", "Could not save the role."))),
  });

  const deleteRole = useMutation({
    mutationFn: (id: number) => talentApi.deleteCriticalRole(id),
    onSuccess: () => {
      toast.success(t("hr_talent.succession.role_deleted", "Critical role removed."));
      invalidate();
    },
    onError: (error: any) =>
      toast.error(errorText(error, t("hr_talent.succession.role_delete_failed", "Could not remove the role."))),
  });

  const saveCandidate = useMutation({
    mutationFn: () => {
      const payload = {
        readiness: candidateForm.readiness,
        status: candidateForm.status,
        assessment_score: candidateForm.assessment_score
          ? Number(candidateForm.assessment_score)
          : null,
        assessment_notes: candidateForm.assessment_notes || null,
        reviewed_on: new Date().toISOString().slice(0, 10),
      };
      if (candidateForm.id) {
        return talentApi.updateCandidate(candidateForm.id, payload);
      }
      return talentApi.createCandidate({
        ...payload,
        critical_role_id: Number(candidateForm.critical_role_id),
        employee_id: Number(candidateForm.employee_id),
      });
    },
    onSuccess: () => {
      toast.success(
        candidateForm.id
          ? t("hr_talent.succession.candidate_updated", "Successor updated.")
          : t("hr_talent.succession.candidate_saved", "Successor nominated."),
      );
      invalidate();
      setCandidateOpen(false);
    },
    onError: (error: any) =>
      toast.error(
        errorText(error, t("hr_talent.succession.candidate_failed", "Could not nominate that successor.")),
      ),
  });

  const deleteCandidate = useMutation({
    mutationFn: (id: number) => talentApi.deleteCandidate(id),
    onSuccess: () => {
      toast.success(t("hr_talent.succession.candidate_withdrawn", "Successor withdrawn."));
      invalidate();
    },
    onError: (error: any) =>
      toast.error(
        errorText(error, t("hr_talent.succession.candidate_delete_failed", "Could not withdraw the successor.")),
      ),
  });

  const saveAspiration = useMutation({
    mutationFn: () =>
      talentApi.createAspiration({
        employee_id: Number(aspirationForm.employee_id),
        desired_position_id: aspirationForm.desired_position_id
          ? Number(aspirationForm.desired_position_id)
          : null,
        desired_role: aspirationForm.desired_role || null,
        horizon_years: aspirationForm.horizon_years ? Number(aspirationForm.horizon_years) : null,
        open_to_relocation: aspirationForm.open_to_relocation,
        notes: aspirationForm.notes || null,
      }),
    onSuccess: () => {
      toast.success(t("hr_talent.succession.aspiration_saved", "Career aspiration recorded."));
      invalidate();
      setAspirationOpen(false);
      setAspirationForm(DEFAULT_ASPIRATION);
    },
    onError: (error: any) =>
      toast.error(
        errorText(error, t("hr_talent.succession.aspiration_failed", "Could not save the aspiration.")),
      ),
  });

  const pipeline: SuccessionPipeline | undefined = pipelineQuery.data?.data;
  const gap: CompetencyGap | undefined = gapQuery.data?.data;
  const roles: PipelineRole[] = pipeline?.roles ?? [];
  const managedRoles: CriticalRole[] = (rolesQuery.data?.data ?? []) as CriticalRole[];
  const aspirations: CareerAspiration[] = (aspirationsQuery.data?.data ?? []) as CareerAspiration[];

  const openEditRole = (role: CriticalRole) => {
    setRoleForm({
      id: role.id,
      position_id: String(role.position_id),
      incumbent_employee_id: role.incumbent_employee_id ? String(role.incumbent_employee_id) : "",
      criticality: role.criticality,
      vacancy_risk: role.vacancy_risk,
      target_successor_count: String(role.target_successor_count),
      impact_notes: role.impact_notes ?? "",
      is_active: role.is_active,
    });
    setRoleOpen(true);
  };

  const openEditCandidate = (candidate: SuccessionCandidate) => {
    setCandidateForm({
      id: candidate.id,
      critical_role_id: String(candidate.critical_role_id),
      employee_id: String(candidate.employee_id),
      readiness: candidate.readiness,
      status: candidate.status || "nominated",
      assessment_score: candidate.assessment_score != null ? String(candidate.assessment_score) : "",
      assessment_notes: candidate.assessment_notes ?? "",
    });
    setCandidateOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            {t("hr_talent.succession.title", "Succession Planning")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "hr_talent.succession.subtitle",
              "The roles the business cannot afford to leave empty, and who is actually ready to fill them.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full px-5" asChild>
            <Link href="/dashboard/human-resources/talent/competencies">
              {t("hr_talent.succession.open_competencies", "Competency profiles")}
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
          {canAddAspiration ? (
            <Button
              variant="outline"
              className="rounded-full px-5"
              onClick={() => {
                setAspirationForm(DEFAULT_ASPIRATION);
                setAspirationOpen(true);
              }}
            >
              {t("hr_talent.succession.add_aspiration", "Add Aspiration")}
            </Button>
          ) : null}
          {canManage ? (
            <>
              <Button
                variant="outline"
                className="rounded-full px-5"
                onClick={() => {
                  setCandidateForm({
                    critical_role_id: "",
                    employee_id: "",
                    readiness: "ready_3_5_years",
                    status: "nominated",
                    assessment_score: "",
                    assessment_notes: "",
                  });
                  setCandidateOpen(true);
                }}
              >
                {t("hr_talent.succession.nominate", "Nominate Successor")}
              </Button>
              <Button
                className="rounded-full px-5"
                onClick={() => {
                  setRoleForm(DEFAULT_ROLE);
                  setRoleOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("hr_talent.succession.flag_role", "Flag Critical Role")}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {pipelineQuery.isLoading ? (
        <LoadingPanel label={t("hr_talent.succession.loading", "Loading the succession pipeline...")} />
      ) : !pipeline ? (
        <EmptyPanel label={t("hr_talent.succession.unavailable", "The pipeline is not available right now.")} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label={t("hr_talent.succession.critical_roles", "Critical roles")}
              value={n(pipeline.critical_roles).toLocaleString()}
            />
            <StatTile
              label={t("hr_talent.succession.no_successor", "No successor named")}
              value={n(pipeline.roles_without_successor).toLocaleString()}
              alert={n(pipeline.roles_without_successor) > 0}
            />
            <StatTile
              label={t("hr_talent.succession.at_risk", "High risk, uncovered")}
              value={n(pipeline.roles_at_risk).toLocaleString()}
              meta={t("hr_talent.succession.at_risk_meta", "High criticality and high vacancy risk")}
              alert={n(pipeline.roles_at_risk) > 0}
            />
            <StatTile
              label={t("hr_talent.succession.bench", "Average bench strength")}
              value={`${n(pipeline.average_bench_strength).toFixed(0)}%`}
              meta={t(
                "hr_talent.succession.bench_meta",
                "Share of each target bench filled by candidates ready within two years",
              )}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <Panel
              title={t("hr_talent.succession.roles", "Critical roles")}
              description={t(
                "hr_talent.succession.roles_desc",
                "Ordered by exposure: the roles at risk with the thinnest bench come first.",
              )}
            >
              {roles.length === 0 ? (
                <EmptyPanel label={t("hr_talent.succession.no_roles", "No critical roles flagged yet.")} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[44rem] text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="pb-2 font-semibold">{t("hr_talent.common.position", "Position")}</th>
                        <th className="pb-2 font-semibold">{t("hr_talent.succession.incumbent", "Incumbent")}</th>
                        <th className="pb-2 font-semibold">{t("hr_talent.succession.risk", "Risk")}</th>
                        <th className="pb-2 text-right font-semibold">
                          {t("hr_talent.succession.candidates", "Named")}
                        </th>
                        <th className="pb-2 text-right font-semibold">
                          {t("hr_talent.succession.ready_now", "Ready now")}
                        </th>
                        <th className="pb-2 text-right font-semibold">
                          {t("hr_talent.succession.bench_short", "Bench")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {roles.map((role) => (
                        <tr key={role.critical_role_id} className="border-b border-border/40 last:border-0">
                          <td className="py-2">
                            <span className="font-medium">{role.position ?? `#${role.position_id}`}</span>
                            {role.at_risk ? (
                              <Badge variant="destructive" className="ml-2 text-[10px]">
                                {t("hr_talent.succession.at_risk_badge", "At risk")}
                              </Badge>
                            ) : null}
                          </td>
                          <td className="py-2 text-muted-foreground">{role.incumbent ?? "—"}</td>
                          <td className="py-2">
                            <span className="text-xs capitalize">
                              {role.criticality} / {role.vacancy_risk}
                            </span>
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {n(role.candidates)} / {n(role.target_successor_count)}
                          </td>
                          <td className="py-2 text-right tabular-nums">{n(role.ready_now)}</td>
                          <td className="py-2 text-right tabular-nums">
                            {n(role.bench_strength).toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <SeverityBands
              title={t("hr_talent.succession.readiness_mix", "Successor readiness")}
              description={t(
                "hr_talent.succession.readiness_desc",
                "Every nominated candidate, by how soon they could take over.",
              )}
              bands={(pipeline.readiness_mix ?? []).map((band) => ({
                key: band.readiness,
                label: band.label,
                severity: READINESS_SEVERITY[band.readiness] ?? "caution",
                count: n(band.count),
              }))}
              emptyLabel={t("hr_talent.succession.no_candidates", "No successors nominated yet.")}
            />
          </div>
        </>
      )}

      {canManage ? (
        <Panel
          title={t("hr_talent.succession.manage_roles", "Manage roles and successors")}
          description={t(
            "hr_talent.succession.manage_roles_desc",
            "Edit criticality, withdraw nominees, or remove a role from the succession map.",
          )}
        >
          {rolesQuery.isLoading ? (
            <LoadingPanel label={t("hr_talent.common.loading", "Loading...")} />
          ) : managedRoles.length === 0 ? (
            <EmptyPanel
              label={t(
                "hr_talent.succession.no_managed_roles",
                "No critical roles yet. Flag a position to start the bench.",
              )}
            />
          ) : (
          <div className="space-y-5">
            {managedRoles.map((role) => (
              <div key={role.id} className="rounded-xl border border-border/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {role.position?.title ?? `Position #${role.position_id}`}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {role.criticality} criticality · {role.vacancy_risk} vacancy risk ·{" "}
                      {role.is_active ? "active" : "inactive"}
                    </p>
                    {role.incumbent?.primary_name || role.incumbent_employee_id ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("hr_talent.succession.incumbent", "Incumbent")}:{" "}
                        {role.incumbent?.primary_name ?? `#${role.incumbent_employee_id}`}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setGapEmployee("");
                        setGapPosition(String(role.position_id));
                        setCandidateForm({
                          critical_role_id: String(role.id),
                          employee_id: "",
                          readiness: "ready_3_5_years",
                          status: "nominated",
                          assessment_score: "",
                          assessment_notes: "",
                        });
                        setCandidateOpen(true);
                      }}
                    >
                      {t("hr_talent.succession.nominate", "Nominate")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEditRole(role)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      {t("hr_talent.common.edit", "Edit")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={deleteRole.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            t(
                              "hr_talent.succession.confirm_delete_role",
                              "Remove this critical role and its nominees?",
                            ),
                          )
                        ) {
                          deleteRole.mutate(role.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {(role.candidates ?? []).length === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t("hr_talent.succession.no_nominees", "No successors nominated for this role.")}
                  </p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[28rem] text-sm">
                      <thead>
                        <tr className="border-b border-border/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="pb-2 font-semibold">{t("hr_talent.common.employee", "Employee")}</th>
                          <th className="pb-2 font-semibold">{t("hr_talent.succession.readiness", "Readiness")}</th>
                          <th className="pb-2 font-semibold">{t("hr_talent.common.status", "Status")}</th>
                          <th className="pb-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {(role.candidates ?? []).map((candidate) => (
                          <tr key={candidate.id} className="border-b border-border/30 last:border-0">
                            <td className="py-2">
                              {candidate.employee?.primary_name ?? `#${candidate.employee_id}`}
                            </td>
                            <td className="py-2 capitalize">{candidate.readiness.replace(/_/g, " ")}</td>
                            <td className="py-2 capitalize">{candidate.status.replace(/_/g, " ")}</td>
                            <td className="py-2 text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditCandidate(candidate)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  disabled={deleteCandidate.isPending}
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        t(
                                          "hr_talent.succession.confirm_withdraw",
                                          "Withdraw this successor?",
                                        ),
                                      )
                                    ) {
                                      deleteCandidate.mutate(candidate.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
        </Panel>
      ) : null}

      <Panel
        title={t("hr_talent.succession.aspirations_title", "Career aspirations")}
        description={t(
          "hr_talent.succession.aspirations_desc",
          "Where people say they want to go — useful when building the successor bench.",
        )}
      >
        {aspirationsQuery.isLoading ? (
          <LoadingPanel label={t("hr_talent.common.loading", "Loading...")} />
        ) : aspirations.length === 0 ? (
          <EmptyPanel
            label={t("hr_talent.succession.no_aspirations", "No career aspirations recorded yet.")}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 font-semibold">{t("hr_talent.common.employee", "Employee")}</th>
                  <th className="pb-2 font-semibold">{t("hr_talent.succession.desired_role", "Desired role")}</th>
                  <th className="pb-2 font-semibold">{t("hr_talent.succession.horizon", "Horizon")}</th>
                  <th className="pb-2 font-semibold">{t("hr_talent.succession.relocation", "Relocation")}</th>
                  <th className="pb-2 font-semibold">{t("hr_talent.common.notes", "Notes")}</th>
                </tr>
              </thead>
              <tbody>
                {aspirations.map((row) => (
                  <tr key={row.id} className="border-b border-border/40 last:border-0">
                    <td className="py-2">
                      {row.employee?.primary_name ?? `#${row.employee_id}`}
                    </td>
                    <td className="py-2">
                      {row.desired_position?.title ||
                        row.desired_role ||
                        (row.desired_position_id ? `#${row.desired_position_id}` : "—")}
                    </td>
                    <td className="py-2 tabular-nums">
                      {row.horizon_years != null
                        ? t("hr_talent.succession.years", "{n} years").replace(
                            "{n}",
                            String(row.horizon_years),
                          )
                        : "—"}
                    </td>
                    <td className="py-2">
                      {row.open_to_relocation
                        ? t("hr_talent.common.yes", "Yes")
                        : t("hr_talent.common.no", "No")}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground line-clamp-2 max-w-[14rem]">
                      {row.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title={t("hr_talent.succession.gap_title", "Readiness check")}
        description={t(
          "hr_talent.succession.gap_desc",
          "Measure a person against a role's competency profile. Readiness is computed from the gap, not typed in.",
        )}
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="gap-employee">{t("hr_talent.common.employee", "Employee")}</Label>
            <select
              id="gap-employee"
              value={gapEmployee}
              onChange={(event) => setGapEmployee(event.target.value)}
              className="h-9 min-w-[14rem] rounded-md border border-input bg-background px-3 text-sm"
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
            <Label htmlFor="gap-position">{t("hr_talent.common.position", "Position")}</Label>
            <select
              id="gap-position"
              value={gapPosition}
              onChange={(event) => setGapPosition(event.target.value)}
              className="h-9 min-w-[14rem] rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("hr_talent.common.select", "Select...")}</option>
              {positions.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {positionLabel(pos)}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            className="h-9"
            disabled={!gapEmployee || !gapPosition}
            onClick={() =>
              setGapPair({ employee: Number(gapEmployee), position: Number(gapPosition) })
            }
          >
            <Search className="mr-2 h-4 w-4" />
            {t("hr_talent.succession.measure", "Measure")}
          </Button>
        </div>

        {gapQuery.isLoading ? (
          <div className="mt-4">
            <LoadingPanel label={t("hr_talent.succession.measuring", "Measuring the gap...")} />
          </div>
        ) : gap ? (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t("hr_talent.succession.suggested", "Measured readiness")}
                </p>
                <p className="text-3xl font-black capitalize tracking-tight">
                  {gap.suggested_readiness.replace(/_/g, " ")}
                </p>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {n(gap.readiness_percent).toFixed(0)}%{" "}
                  {t("hr_talent.succession.requirements_met", "requirements met")}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                {t(
                  "hr_talent.succession.gap_meta",
                  "{met} of {total} requirements met · {critical} critical gap(s)",
                )
                  .replace("{met}", String(n(gap.met)))
                  .replace("{total}", String(n(gap.requirements)))
                  .replace("{critical}", String(n(gap.critical_gaps)))}
              </div>
              {canManage && gapPair ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  onClick={() => {
                    const matchingRole = managedRoles.find(
                      (role) => role.position_id === gapPair.position,
                    );
                    setCandidateForm({
                      critical_role_id: matchingRole ? String(matchingRole.id) : "",
                      employee_id: String(gapPair.employee),
                      readiness: gap.suggested_readiness,
                      status: "nominated",
                      assessment_score: String(Math.round(n(gap.readiness_percent))),
                      assessment_notes: "",
                    });
                    setCandidateOpen(true);
                  }}
                >
                  {t("hr_talent.succession.apply_readiness", "Nominate with this readiness")}
                </Button>
              ) : null}
            </div>

            {gap.note ? (
              <div className="rounded-xl border border-dashed border-border/60 p-3 text-sm text-muted-foreground">
                <p className="italic">{gap.note}</p>
                <Button variant="link" className="h-auto px-0 pt-2" asChild>
                  <Link href="/dashboard/human-resources/talent/competencies">
                    {t(
                      "hr_talent.succession.profile_role",
                      "Set role requirements on Competencies",
                    )}
                    <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            ) : gap.gaps.length === 0 ? (
              <EmptyPanel
                label={t("hr_talent.succession.no_gaps", "Every requirement for this role is met.")}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2 font-semibold">
                        {t("hr_talent.competencies.competency", "Competency")}
                      </th>
                      <th className="pb-2 text-right font-semibold">
                        {t("hr_talent.succession.current", "Current")}
                      </th>
                      <th className="pb-2 text-right font-semibold">
                        {t("hr_talent.competencies.required_level", "Required")}
                      </th>
                      <th className="pb-2 text-right font-semibold">
                        {t("hr_talent.succession.shortfall", "Shortfall")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {gap.gaps.map((row) => (
                      <tr key={row.competency_id} className="border-b border-border/40 last:border-0">
                        <td className="py-2">
                          {row.competency ?? `#${row.competency_id}`}
                          {row.is_critical ? (
                            <Badge variant="destructive" className="ml-2 text-[10px]">
                              {t("hr_talent.common.critical", "Critical")}
                            </Badge>
                          ) : null}
                        </td>
                        <td className="py-2 text-right tabular-nums">{row.current_level}</td>
                        <td className="py-2 text-right tabular-nums">{row.required_level}</td>
                        <td className="py-2 text-right tabular-nums font-semibold text-amber-600">
                          {row.shortfall}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </Panel>

      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">
                {roleForm.id
                  ? t("hr_talent.succession.edit_role", "Edit Critical Role")
                  : t("hr_talent.succession.flag_role", "Flag Critical Role")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "hr_talent.succession.role_desc",
                  "Flagging a position that already exists updates it rather than creating a duplicate.",
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="role-position">{t("hr_talent.common.position", "Position")}</Label>
              <select
                id="role-position"
                disabled={Boolean(roleForm.id)}
                value={roleForm.position_id}
                onChange={(event) => setRoleForm({ ...roleForm, position_id: event.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("hr_talent.common.select", "Select...")}</option>
                {positions.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {positionLabel(pos)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="role-incumbent">
                {t("hr_talent.succession.incumbent", "Incumbent")}
              </Label>
              <select
                id="role-incumbent"
                value={roleForm.incumbent_employee_id}
                onChange={(event) =>
                  setRoleForm({ ...roleForm, incumbent_employee_id: event.target.value })
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
              <Label htmlFor="role-criticality">{t("hr_talent.succession.criticality", "Criticality")}</Label>
              <select
                id="role-criticality"
                value={roleForm.criticality}
                onChange={(event) => setRoleForm({ ...roleForm, criticality: event.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
              >
                {LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-risk">{t("hr_talent.succession.vacancy_risk", "Vacancy risk")}</Label>
              <select
                id="role-risk"
                value={roleForm.vacancy_risk}
                onChange={(event) => setRoleForm({ ...roleForm, vacancy_risk: event.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
              >
                {LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-target">
                {t("hr_talent.succession.target_successors", "Target successors")}
              </Label>
              <Input
                id="role-target"
                type="number"
                min={1}
                max={20}
                value={roleForm.target_successor_count}
                onChange={(event) =>
                  setRoleForm({ ...roleForm, target_successor_count: event.target.value })
                }
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="role-active"
                checked={roleForm.is_active}
                onCheckedChange={(checked) => setRoleForm({ ...roleForm, is_active: checked })}
              />
              <Label htmlFor="role-active">{t("hr_talent.common.active", "Active")}</Label>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="role-notes">{t("hr_talent.succession.impact", "Impact if vacant")}</Label>
              <Textarea
                id="role-notes"
                rows={3}
                value={roleForm.impact_notes}
                onChange={(event) => setRoleForm({ ...roleForm, impact_notes: event.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border/40 px-6 py-4">
            <Button variant="ghost" onClick={() => setRoleOpen(false)}>
              {t("hr_talent.common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={() => saveRole.mutate()}
              disabled={saveRole.isPending || (!roleForm.id && !roleForm.position_id)}
            >
              {t("hr_talent.common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={candidateOpen} onOpenChange={setCandidateOpen}>
        <DialogContent className="sm:max-w-lg rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">
                {candidateForm.id
                  ? t("hr_talent.succession.edit_candidate", "Update Successor")
                  : t("hr_talent.succession.nominate", "Nominate Successor")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "hr_talent.succession.candidate_desc",
                  "Use the readiness check above first — the measured gap is a better answer than a guess.",
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cand-role">{t("hr_talent.succession.role", "Critical role")}</Label>
              <select
                id="cand-role"
                value={candidateForm.critical_role_id}
                disabled={Boolean(candidateForm.id)}
                onChange={(event) =>
                  setCandidateForm({ ...candidateForm, critical_role_id: event.target.value })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("hr_talent.common.select", "Select...")}</option>
                {(managedRoles.length
                  ? managedRoles
                  : roles.map((r) => ({
                      id: r.critical_role_id,
                      position: { title: r.position },
                      position_id: r.position_id,
                    }))
                ).map((role: any) => (
                  <option key={role.id} value={role.id}>
                    {role.position?.title ?? `#${role.position_id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cand-employee">{t("hr_talent.common.employee", "Employee")}</Label>
              <select
                id="cand-employee"
                disabled={Boolean(candidateForm.id)}
                value={candidateForm.employee_id}
                onChange={(event) =>
                  setCandidateForm({ ...candidateForm, employee_id: event.target.value })
                }
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
              <Label htmlFor="cand-readiness">{t("hr_talent.succession.readiness", "Readiness")}</Label>
              <select
                id="cand-readiness"
                value={candidateForm.readiness}
                onChange={(event) =>
                  setCandidateForm({ ...candidateForm, readiness: event.target.value })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
              >
                {READINESS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cand-status">{t("hr_talent.common.status", "Status")}</Label>
              <select
                id="cand-status"
                value={candidateForm.status}
                onChange={(event) =>
                  setCandidateForm({ ...candidateForm, status: event.target.value })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
              >
                {CANDIDATE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cand-score">{t("hr_talent.succession.score", "Assessment score")}</Label>
              <Input
                id="cand-score"
                type="number"
                min={0}
                max={100}
                value={candidateForm.assessment_score}
                onChange={(event) =>
                  setCandidateForm({ ...candidateForm, assessment_score: event.target.value })
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cand-notes">{t("hr_talent.common.notes", "Notes")}</Label>
              <Textarea
                id="cand-notes"
                rows={3}
                value={candidateForm.assessment_notes}
                onChange={(event) =>
                  setCandidateForm({ ...candidateForm, assessment_notes: event.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border/40 px-6 py-4">
            <Button variant="ghost" onClick={() => setCandidateOpen(false)}>
              {t("hr_talent.common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={() => saveCandidate.mutate()}
              disabled={
                saveCandidate.isPending ||
                (!candidateForm.id &&
                  (!candidateForm.critical_role_id || !candidateForm.employee_id))
              }
            >
              {t("hr_talent.common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aspirationOpen} onOpenChange={setAspirationOpen}>
        <DialogContent className="sm:max-w-lg rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">
                {t("hr_talent.succession.add_aspiration", "Add Aspiration")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "hr_talent.succession.aspiration_form_desc",
                  "Capture where an employee wants to grow — optionally targeting a specific position.",
                )}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="asp-employee">{t("hr_talent.common.employee", "Employee")}</Label>
              <select
                id="asp-employee"
                value={aspirationForm.employee_id}
                onChange={(event) =>
                  setAspirationForm({ ...aspirationForm, employee_id: event.target.value })
                }
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="asp-position">
                {t("hr_talent.succession.desired_position", "Desired position")}
              </Label>
              <select
                id="asp-position"
                value={aspirationForm.desired_position_id}
                onChange={(event) =>
                  setAspirationForm({ ...aspirationForm, desired_position_id: event.target.value })
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="asp-role">{t("hr_talent.succession.desired_role", "Desired role")}</Label>
              <Input
                id="asp-role"
                value={aspirationForm.desired_role}
                onChange={(event) =>
                  setAspirationForm({ ...aspirationForm, desired_role: event.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="asp-horizon">{t("hr_talent.succession.horizon_years", "Horizon (years)")}</Label>
              <Input
                id="asp-horizon"
                type="number"
                min={0}
                max={40}
                value={aspirationForm.horizon_years}
                onChange={(event) =>
                  setAspirationForm({ ...aspirationForm, horizon_years: event.target.value })
                }
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="asp-relocation"
                checked={aspirationForm.open_to_relocation}
                onCheckedChange={(checked) =>
                  setAspirationForm({ ...aspirationForm, open_to_relocation: checked })
                }
              />
              <Label htmlFor="asp-relocation">
                {t("hr_talent.succession.open_to_relocation", "Open to relocation")}
              </Label>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="asp-notes">{t("hr_talent.common.notes", "Notes")}</Label>
              <Textarea
                id="asp-notes"
                rows={3}
                value={aspirationForm.notes}
                onChange={(event) =>
                  setAspirationForm({ ...aspirationForm, notes: event.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter className="border-t border-border/40 px-6 py-4">
            <Button variant="ghost" onClick={() => setAspirationOpen(false)}>
              {t("hr_talent.common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={() => saveAspiration.mutate()}
              disabled={saveAspiration.isPending || !aspirationForm.employee_id}
            >
              {t("hr_talent.common.save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
