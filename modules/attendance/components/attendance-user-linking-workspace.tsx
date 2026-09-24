"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Link as LinkIcon,
  RefreshCw,
  Search,
  ShieldCheck,
  Unlink,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePermissions } from "@/hooks/use-permissions";
import { getWorkspaceScopeKey } from "@/lib/runtime-context";
import {
  attendanceFetch,
  enrolAllEmployees,
  executeUserLinking,
  fetchUserLinkingRecords,
  fetchUserLinkingSummary,
  formatEmployeeNumber,
  previewUserLinking,
  resolveUserLinking,
  unlinkUserAccount,
  UserLinkingCandidate,
  UserLinkingPreview,
  UserLinkingRecord,
} from "@/modules/attendance/api";
import { Employee, Paginated } from "@/modules/humanresources/api";

const selectClass =
  "h-11 w-full rounded-md border border-slate-500 bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:border-slate-400 dark:focus-visible:ring-cyan-300";

function statusBadge(status: UserLinkingRecord["link_status"]) {
  switch (status) {
    case "linked":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
          Linked
        </span>
      );
    case "unlinked":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <UserX aria-hidden="true" className="h-3.5 w-3.5" />
          Unlinked
        </span>
      );
    case "ambiguous":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-200">
          <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
          Ambiguous
        </span>
      );
    case "employee_only":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          <Users aria-hidden="true" className="h-3.5 w-3.5" />
          Employee Record Only
        </span>
      );
    default:
      return null;
  }
}

function enrolmentBadge(status: UserLinkingRecord["enrolment_status"]) {
  switch (status) {
    case "enrolled":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
          <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
          Enrolled
        </span>
      );
    case "pending_enrolment":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300">
          Pending
        </span>
      );
    case "unlinked":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
          Not Enrolled
        </span>
      );
  }
}

type ConfirmAction = "bulk-link" | "enrol" | null;

export function AttendanceUserLinkingWorkspace() {
  const scope = getWorkspaceScopeKey();
  const queryClient = useQueryClient();
  const { hasAnyPermission, isLoaded } = usePermissions();
  const previewTriggerRef = useRef<HTMLButtonElement>(null);

  const canManage = hasAnyPermission([
    "manage_attendance",
    "manage_employees",
  ]);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEnrolment, setFilterEnrolment] = useState("all");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<UserLinkingPreview | null>(null);

  const [manualOpen, setManualOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string; email: string } | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [rowCandidates, setRowCandidates] = useState<UserLinkingCandidate[]>([]);

  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [unlinkEmployee, setUnlinkEmployee] = useState<{ id: number; name: string; number: string } | null>(null);

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const summary = useQuery({
    queryKey: ["user-linking-summary", scope],
    queryFn: () => fetchUserLinkingSummary(),
    enabled: isLoaded && canManage,
  });

  const records = useQuery({
    queryKey: ["user-linking-records", scope, page, search, filterStatus, filterEnrolment],
    queryFn: () => fetchUserLinkingRecords(page, 25, search, filterStatus, filterEnrolment),
    enabled: isLoaded && canManage,
  });

  const employeesList = useQuery({
    queryKey: ["hr-employees-unlinked-candidates", scope],
    queryFn: () => attendanceFetch<Paginated<Employee>>("/employees?per_page=200"),
    enabled: manualOpen && canManage,
  });

  const unlinkedEmployees = useMemo(() => {
    const rows = employeesList.data?.data ?? [];
    return rows.filter((emp) => !emp.user_id);
  }, [employeesList.data]);

  const candidateIds = useMemo(
    () => new Set(rowCandidates.map((c) => Number(c.employee_id))),
    [rowCandidates],
  );

  const pickerEmployees = useMemo(() => {
    const fromApi = unlinkedEmployees.map((emp) => ({
      id: Number(emp.id),
      name: emp.primary_name,
      number: emp.employee_number,
      email: emp.work_email || "",
      suggested: candidateIds.has(Number(emp.id)),
    }));

    // Ensure suggested candidates appear even if not in the first page of /employees
    for (const candidate of rowCandidates) {
      if (fromApi.some((row) => row.id === Number(candidate.employee_id))) continue;
      fromApi.unshift({
        id: Number(candidate.employee_id),
        name: candidate.employee_name || "Employee",
        number: candidate.employee_number || "",
        email: "",
        suggested: true,
      });
    }

    return fromApi.sort((a, b) => Number(b.suggested) - Number(a.suggested) || a.name.localeCompare(b.name));
  }, [unlinkedEmployees, rowCandidates, candidateIds]);

  const previewMutation = useMutation({
    mutationFn: () => previewUserLinking(),
    onSuccess: (data) => {
      setPreviewData(data);
      setPreviewOpen(true);
    },
    onError: () =>
      toast.error(
        "Unable to generate the linking preview. No changes were made. Check your connection and try again.",
      ),
  });

  const executeMutation = useMutation({
    mutationFn: () => executeUserLinking(),
    onSuccess: (res) => {
      toast.success(res.message);
      setPreviewOpen(false);
      setConfirmAction(null);
      void queryClient.invalidateQueries({ queryKey: ["user-linking-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["user-linking-records"] });
    },
    onError: (err: Error) => toast.error(err.message || "Bulk linking failed."),
  });

  const enrolMutation = useMutation({
    mutationFn: () => enrolAllEmployees(),
    onSuccess: (res) => {
      toast.success(res.message);
      setConfirmAction(null);
      void queryClient.invalidateQueries({ queryKey: ["user-linking-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["user-linking-records"] });
    },
    onError: (err: Error) => toast.error(err.message || "Employee enrolment failed."),
  });

  const resolveMutation = useMutation({
    mutationFn: () => {
      if (!selectedUser || !selectedEmployeeId) {
        throw new Error("Select both user and employee to link.");
      }
      return resolveUserLinking(selectedUser.id, Number(selectedEmployeeId));
    },
    onSuccess: (res) => {
      toast.success(res.message);
      setManualOpen(false);
      setSelectedUser(null);
      setSelectedEmployeeId("");
      setRowCandidates([]);
      void queryClient.invalidateQueries({ queryKey: ["user-linking-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["user-linking-records"] });
    },
    onError: (err: Error) => toast.error(err.message || "Manual link failed."),
  });

  const unlinkMutation = useMutation({
    mutationFn: () => {
      if (!unlinkEmployee) throw new Error("No employee selected.");
      return unlinkUserAccount(unlinkEmployee.id);
    },
    onSuccess: (res) => {
      toast.success(res.message);
      setUnlinkOpen(false);
      setUnlinkEmployee(null);
      void queryClient.invalidateQueries({ queryKey: ["user-linking-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["user-linking-records"] });
    },
    onError: (err: Error) => toast.error(err.message || "Unlink failed."),
  });

  const openManualLink = (row: UserLinkingRecord) => {
    if (!row.user_id) return;
    setSelectedUser({
      id: row.user_id,
      name: row.user_name || "User",
      email: row.user_email || "",
    });
    setRowCandidates(row.candidates ?? []);
    const preferred =
      row.employee_id
        ? String(row.employee_id)
        : row.candidates?.length === 1
          ? String(row.candidates[0].employee_id)
          : "";
    setSelectedEmployeeId(preferred);
    setManualOpen(true);
  };

  const summaryData = summary.data ?? {
    total_users: 0,
    total_employees: 0,
    already_linked: 0,
    will_link: 0,
    ambiguous: 0,
    conflicts: 0,
    unlinked_users: 0,
    unlinked_employees: 0,
    employees_missing_enrolment: 0,
  };

  const metricCards = [
    { label: "Total Active Users", value: summaryData.total_users, icon: Users, color: "text-blue-600" },
    { label: "Total Active Employees", value: summaryData.total_employees, icon: UserCheck, color: "text-teal-600" },
    { label: "Linked Accounts", value: summaryData.already_linked, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Eligible To Link", value: summaryData.will_link, icon: UserPlus, color: "text-sky-600" },
    { label: "Unlinked Users", value: summaryData.unlinked_users, icon: UserX, color: "text-amber-600" },
    { label: "Unlinked Employees", value: summaryData.unlinked_employees, icon: Users, color: "text-indigo-600" },
    { label: "Ambiguous / Conflicts", value: summaryData.ambiguous + summaryData.conflicts, icon: AlertTriangle, color: "text-purple-600" },
    { label: "Missing Enrolment", value: summaryData.employees_missing_enrolment, icon: ShieldCheck, color: "text-rose-600" },
  ];

  const hasLoadError = summary.isError || records.isError;
  const loadErrorMessage =
    summary.error?.message ||
    records.error?.message ||
    "Attendance account data could not be loaded.";
  const refreshLinkingData = () => {
    void summary.refetch();
    void records.refetch();
  };

  if (!isLoaded) {
    return (
      <Card className="border-slate-500 dark:border-slate-400">
        <CardContent className="p-6" role="status">
          <RefreshCw
            aria-hidden="true"
            className="mr-2 inline h-5 w-5 animate-spin motion-reduce:animate-none"
          />
          Loading attendance account access...
        </CardContent>
      </Card>
    );
  }

  if (!canManage) {
    return (
      <section aria-labelledby="user-linking-denied-title">
        <Card className="border-slate-500 dark:border-slate-400">
          <CardContent className="p-6">
            <h1 id="user-linking-denied-title" className="text-2xl font-black">
              User Linking & Enrolment
            </h1>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
              This page requires permission to manage attendance or employees.
              Ask an administrator to update your role.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section aria-labelledby="user-linking-title" className="space-y-6">
      <header className="overflow-hidden rounded-2xl border border-blue-700 bg-blue-50 p-6 text-slate-950 dark:border-cyan-300 dark:bg-slate-950 dark:text-slate-50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-800 dark:text-cyan-200">
              <Link href="/dashboard/attendance" className="inline-flex items-center gap-1 hover:underline">
                <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
                Attendance Management
              </Link>
              <span>/</span>
              <span>Account Administration</span>
            </div>
            <h1 id="user-linking-title" className="mt-2 text-3xl font-black tracking-tight">
              User Account & Employee Linking
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-200">
              Manage user-to-employee profile mapping, run deterministic tenant-wide bulk linking, and enrol employees into Attendance Management.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              ref={previewTriggerRef}
              type="button"
              variant="outline"
              onClick={() => previewMutation.mutate()}
              disabled={previewMutation.isPending}
              className="min-h-11 border-slate-700 bg-white text-slate-950 hover:bg-slate-100 dark:border-slate-300 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
            >
              <Eye aria-hidden="true" className="mr-1.5 h-4 w-4" />
              {previewMutation.isPending ? "Generating Preview…" : "Preview Linking"}
            </Button>
            <Button
              type="button"
              onClick={() => setConfirmAction("bulk-link")}
              disabled={executeMutation.isPending}
              className="min-h-11"
            >
              <LinkIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
              Link All Eligible Users
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmAction("enrol")}
              disabled={enrolMutation.isPending}
              className="min-h-11"
            >
              <ShieldCheck aria-hidden="true" className="mr-1.5 h-4 w-4" />
              Enrol All Eligible Employees
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border-slate-300 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{card.label}</span>
                  <Icon aria-hidden="true" className={`h-4 w-4 ${card.color}`} />
                </div>
                <p className="mt-2 text-2xl font-black">{card.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-slate-300 dark:border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold">Tenant Account Linking Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasLoadError && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-700 bg-red-50 p-4 text-red-950 dark:border-red-300 dark:bg-red-950 dark:text-red-100"
            >
              <div>
                <p className="font-bold">Unable to load account linking data</p>
                <p className="mt-1 text-sm">{loadErrorMessage}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 border-red-700 bg-white text-red-950 hover:bg-red-100 dark:border-red-300 dark:bg-red-950 dark:text-red-100 dark:hover:bg-red-900"
                onClick={refreshLinkingData}
                disabled={summary.isFetching || records.isFetching}
              >
                <RefreshCw
                  aria-hidden="true"
                  className={`mr-2 h-4 w-4 ${summary.isFetching || records.isFetching ? "animate-spin motion-reduce:animate-none" : ""}`}
                />
                Try again
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1 basis-64">
              <Label htmlFor="user-linking-search" className="mb-2 block">
                Search accounts
              </Label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="absolute left-3 top-3 h-4 w-4 text-slate-600 dark:text-slate-300"
                />
                <Input
                  id="user-linking-search"
                  type="search"
                  placeholder="Search user name, email, employee name or code…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="min-h-11 pl-9"
                />
              </div>
            </div>
            <div className="w-full space-y-2 sm:w-52">
              <Label htmlFor="user-linking-status">Link status</Label>
              <select
                id="user-linking-status"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className={selectClass}
              >
                <option value="all">All Link Statuses</option>
                <option value="linked">Linked Only</option>
                <option value="unlinked">Unlinked Only</option>
                <option value="ambiguous">Ambiguous Matches</option>
                <option value="employee_only">Unmatched Employees</option>
              </select>
            </div>
            <div className="w-full space-y-2 sm:w-52">
              <Label htmlFor="user-linking-enrolment">Enrolment</Label>
              <select
                id="user-linking-enrolment"
                value={filterEnrolment}
                onChange={(e) => {
                  setFilterEnrolment(e.target.value);
                  setPage(1);
                }}
                className={selectClass}
              >
                <option value="all">All Enrolment</option>
                <option value="enrolled">Enrolled</option>
                <option value="pending_enrolment">Pending Enrolment</option>
                <option value="unlinked">Not Enrolled</option>
              </select>
            </div>
          </div>

          <div className="rounded-md border border-slate-300 dark:border-slate-700 overflow-x-auto">
            <Table aria-busy={records.isLoading}>
              <TableCaption className="sr-only">
                User accounts, employee records, linking state, attendance
                enrolment, and available management actions.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">User Account</TableHead>
                  <TableHead scope="col">Employee Record</TableHead>
                  <TableHead scope="col">Match / Reason</TableHead>
                  <TableHead scope="col">Link Status</TableHead>
                  <TableHead scope="col">Attendance Enrolment</TableHead>
                  <TableHead scope="col" className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      role="status"
                      className="py-8 text-center text-slate-700 dark:text-slate-200"
                    >
                      <RefreshCw
                        aria-hidden="true"
                        className="mx-auto mb-2 h-5 w-5 animate-spin motion-reduce:animate-none"
                      />
                      Loading account linking records…
                    </TableCell>
                  </TableRow>
                ) : records.isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-red-800 dark:text-red-200"
                    >
                      Account linking records are currently unavailable. Use
                      “Try again” above.
                    </TableCell>
                  </TableRow>
                ) : (records.data?.data.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-slate-700 dark:text-slate-200">
                      No matching records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.data?.data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {row.user_name ? (
                          <div>
                            <p className="font-bold">{row.user_name}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300">{row.user_email}</p>
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-600 dark:text-slate-300">No user account</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.employee_name ? (
                          <div>
                            <p className="font-bold">{row.employee_name}</p>
                            <p className="font-mono text-xs text-slate-600 dark:text-slate-300">
                              {formatEmployeeNumber(row.employee_number)}
                            </p>
                          </div>
                        ) : row.candidates && row.candidates.length > 0 ? (
                          <div className="space-y-0.5">
                            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                              {row.candidates.length} candidate{row.candidates.length === 1 ? "" : "s"}
                            </span>
                            {row.candidates.slice(0, 2).map((c) => (
                              <p key={c.employee_id} className="text-xs text-slate-600 dark:text-slate-300">
                                {c.employee_name} · {formatEmployeeNumber(c.employee_number)}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-600 dark:text-slate-300">No employee record</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className="inline-block rounded bg-slate-100 px-2 py-0.5 font-mono text-xs dark:bg-slate-800">
                            {row.match_method}
                          </span>
                          {row.conflict_reason ? (
                            <p className="max-w-[16rem] text-xs leading-5 text-amber-800 dark:text-amber-200">
                              {row.conflict_reason}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(row.link_status)}</TableCell>
                      <TableCell>{enrolmentBadge(row.enrolment_status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(row.link_status === "unlinked" || row.link_status === "ambiguous") && row.user_id && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="min-h-11"
                              onClick={() => openManualLink(row)}
                            >
                              <LinkIcon aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
                              {row.link_status === "ambiguous" ? "Resolve" : "Link"}
                            </Button>
                          )}
                          {row.link_status === "linked" && row.employee_id && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="min-h-11 text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-300 dark:hover:bg-red-950 dark:hover:text-red-200"
                              onClick={() => {
                                setUnlinkEmployee({
                                  id: row.employee_id!,
                                  name: row.employee_name || "Employee",
                                  number: row.employee_number || "",
                                });
                                setUnlinkOpen(true);
                              }}
                            >
                              <Unlink aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
                              Unlink
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {(records.data?.meta.last_page ?? 1) > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-700 dark:text-slate-200">
                Page {records.data?.meta.current_page} of {records.data?.meta.last_page} ({records.data?.meta.total} total)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-11"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-11"
                  disabled={page >= (records.data?.meta.last_page ?? 1)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent
          className="max-h-[85vh] overflow-y-auto sm:max-w-3xl"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            previewTriggerRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Bulk Linking Dry-Run Preview</DialogTitle>
            <DialogDescription>
              Review deterministic matching outcomes before executing safe tenant-wide linking.
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="my-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950">
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">Will Link</p>
                  <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                    {previewData.summary.will_link}
                  </p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">Already Linked</p>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                    {previewData.summary.already_linked}
                  </p>
                </div>
                <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-950">
                  <p className="text-xs font-semibold text-purple-800 dark:text-purple-200">Ambiguous</p>
                  <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
                    {previewData.summary.ambiguous}
                  </p>
                </div>
                <div className="rounded-lg bg-rose-50 p-3 dark:bg-rose-950">
                  <p className="text-xs font-semibold text-rose-800 dark:text-rose-200">Conflicts</p>
                  <p className="text-xl font-bold text-rose-900 dark:text-rose-100">
                    {previewData.summary.conflicts}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Unlinked Users</p>
                  <p className="text-xl font-bold text-amber-900 dark:text-amber-100">
                    {previewData.summary.unlinked_users}
                  </p>
                </div>
                <div className="rounded-lg bg-indigo-50 p-3 dark:bg-indigo-950">
                  <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-200">Unlinked Employees</p>
                  <p className="text-xl font-bold text-indigo-900 dark:text-indigo-100">
                    {previewData.summary.unlinked_employees}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-900">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Missing Enrolment</p>
                  <p className="text-xl font-bold">
                    {previewData.summary.employees_missing_enrolment}
                  </p>
                </div>
              </div>

              {previewData.will_link.length > 0 && (
                <PreviewSection title="Safe 1-to-1 matches ready to link" tone="emerald">
                  {previewData.will_link.map((item, idx) => (
                    <div key={`will-${item.user_id ?? idx}`} className="flex items-center justify-between gap-2 border-b py-1 last:border-b-0">
                      <span>
                        <strong>{item.user_name}</strong> ({item.user_email})
                      </span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-300">
                        → {item.employee_name} ({formatEmployeeNumber(item.employee_number)})
                      </span>
                    </div>
                  ))}
                </PreviewSection>
              )}

              {previewData.ambiguous.length > 0 && (
                <PreviewSection title="Ambiguous matches (manual resolve required)" tone="purple">
                  {previewData.ambiguous.map((item, idx) => (
                    <div key={`amb-${item.user_id ?? idx}`} className="border-b py-1 last:border-b-0">
                      <p>
                        <strong>{item.user_name}</strong> ({item.user_email}) — {item.reason}
                      </p>
                      {(item.candidates ?? []).length > 0 && (
                        <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                          Candidates:{" "}
                          {(item.candidates ?? [])
                            .map((c) => `${c.employee_name} (${formatEmployeeNumber(c.employee_number)})`)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </PreviewSection>
              )}

              {previewData.conflicts.length > 0 && (
                <PreviewSection title="Conflicts (skipped)" tone="rose">
                  {previewData.conflicts.map((item, idx) => (
                    <div key={`conf-${item.user_id ?? idx}`} className="border-b py-1 last:border-b-0">
                      <strong>{item.user_name}</strong> ({item.user_email}) → {item.employee_name}{" "}
                      ({formatEmployeeNumber(item.employee_number)}) — {item.reason}
                    </div>
                  ))}
                </PreviewSection>
              )}

              {previewData.unlinked_employees.length > 0 && (
                <PreviewSection title="Unlinked employees (no matching user)" tone="indigo">
                  {previewData.unlinked_employees.slice(0, 40).map((item, idx) => (
                    <div key={`ue-${item.employee_id ?? idx}`} className="border-b py-1 last:border-b-0">
                      {item.employee_name} · {formatEmployeeNumber(item.employee_number)}
                      {item.work_email ? ` · ${item.work_email}` : ""}
                    </div>
                  ))}
                  {previewData.unlinked_employees.length > 40 && (
                    <p className="pt-1 text-slate-600 dark:text-slate-300">
                      +{previewData.unlinked_employees.length - 40} more
                    </p>
                  )}
                </PreviewSection>
              )}

              {previewData.missing_enrolment.length > 0 && (
                <PreviewSection title="Employees missing attendance enrolment" tone="slate">
                  {previewData.missing_enrolment.slice(0, 40).map((item, idx) => (
                    <div key={`me-${item.employee_id ?? idx}`} className="border-b py-1 last:border-b-0">
                      {item.employee_name} · {formatEmployeeNumber(item.employee_number)}
                    </div>
                  ))}
                  {previewData.missing_enrolment.length > 40 && (
                    <p className="pt-1 text-slate-600 dark:text-slate-300">
                      +{previewData.missing_enrolment.length - 40} more
                    </p>
                  )}
                </PreviewSection>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setPreviewOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              className="min-h-11"
              onClick={() => setConfirmAction("bulk-link")}
              disabled={executeMutation.isPending || (previewData?.summary.will_link ?? 0) === 0}
            >
              Execute Safe Bulk Linking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={manualOpen}
        onOpenChange={(open) => {
          setManualOpen(open);
          if (!open) {
            setRowCandidates([]);
            setSelectedEmployeeId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {rowCandidates.length > 1 ? "Resolve Ambiguous Match" : "Link User Account Manually"}
            </DialogTitle>
            <DialogDescription>
              Select an unlinked employee record to pair with user {selectedUser?.name}.
              {rowCandidates.length > 0
                ? " Suggested candidates from the email match are listed first."
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Selected User</p>
              <p className="font-bold">{selectedUser?.name}</p>
              <p className="font-mono text-xs text-slate-600 dark:text-slate-300">{selectedUser?.email}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-employee-select">
                Select Target Employee Record
                <span aria-hidden="true"> *</span>
                <span className="sr-only"> (required)</span>
              </Label>
              <select
                id="manual-employee-select"
                required
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className={selectClass}
                disabled={employeesList.isLoading}
              >
                <option value="">
                  {employeesList.isLoading ? "Loading employees…" : "Choose an unlinked employee"}
                </option>
                {pickerEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.suggested ? "★ " : ""}
                    {emp.name} · {formatEmployeeNumber(emp.number)}
                    {emp.email ? ` (${emp.email})` : ""}
                  </option>
                ))}
              </select>
              {!employeesList.isLoading && pickerEmployees.length === 0 && (
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  No unlinked employee records are available to link.
                </p>
              )}
              {employeesList.isError && (
                <div role="alert" className="rounded-md border border-red-700 bg-red-50 p-3 text-sm text-red-950 dark:border-red-300 dark:bg-red-950 dark:text-red-100">
                  <p>Employee records could not be loaded.</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 min-h-11 border-red-700 bg-white text-red-950 hover:bg-red-100 dark:border-red-300 dark:bg-red-950 dark:text-red-100 dark:hover:bg-red-900"
                    onClick={() => void employeesList.refetch()}
                    disabled={employeesList.isFetching}
                  >
                    Try again
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setManualOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-h-11"
              onClick={() => resolveMutation.mutate()}
              disabled={resolveMutation.isPending || !selectedEmployeeId}
            >
              {resolveMutation.isPending ? "Linking…" : "Confirm Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unlinkOpen} onOpenChange={setUnlinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unlink User Account?</DialogTitle>
            <DialogDescription>
              This will remove the user account association from employee {unlinkEmployee?.name} ({formatEmployeeNumber(unlinkEmployee?.number)}).
              Attendance records, device mappings, leave history, and payroll remain fully preserved.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setUnlinkOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-11"
              onClick={() => unlinkMutation.mutate()}
              disabled={unlinkMutation.isPending}
            >
              {unlinkMutation.isPending ? "Unlinking…" : "Unlink Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "enrol" ? "Enrol all eligible employees?" : "Link all eligible users?"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "enrol"
                ? `This will create attendance schedules for up to ${summaryData.employees_missing_enrolment} active employees who are not yet enrolled. Existing schedules are left unchanged.`
                : `This will link ${summaryData.will_link} deterministic email matches and enrol those employees in attendance. Ambiguous matches and conflicts are skipped.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={
                confirmAction === "enrol"
                  ? enrolMutation.isPending
                  : executeMutation.isPending
              }
              onClick={() => {
                if (confirmAction === "enrol") {
                  enrolMutation.mutate();
                } else {
                  executeMutation.mutate();
                }
              }}
            >
              {confirmAction === "enrol"
                ? enrolMutation.isPending
                  ? "Enrolling…"
                  : "Confirm Enrolment"
                : executeMutation.isPending
                  ? "Linking…"
                  : "Confirm Bulk Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function PreviewSection({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "emerald" | "purple" | "rose" | "indigo" | "slate";
  children: ReactNode;
}) {
  const titleClass = {
    emerald: "text-emerald-700 dark:text-emerald-300",
    purple: "text-purple-700 dark:text-purple-300",
    rose: "text-rose-700 dark:text-rose-300",
    indigo: "text-indigo-700 dark:text-indigo-300",
    slate: "text-slate-700 dark:text-slate-200",
  }[tone];

  return (
    <div>
      <h3 className={`mb-2 text-sm font-bold ${titleClass}`}>{title}</h3>
      <div className="max-h-40 space-y-1 overflow-y-auto rounded border border-slate-200 p-2 text-xs dark:border-slate-800">
        {children}
      </div>
    </div>
  );
}
