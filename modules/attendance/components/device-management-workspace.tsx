"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, PlusCircle, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { AttendanceDeviceConnectors } from "@/app/dashboard/human-resources/attendance-device-connectors";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getWorkspaceScopeKey } from "@/lib/runtime-context";
import {
  AttendanceDevice,
  AttendanceDeviceWorkspace,
  Employee,
  Paginated,
} from "@/modules/humanresources/api";
import { attendanceFetch } from "@/modules/attendance/api";

const POLLABLE_ADAPTERS = new Set([
  "hikvision_isapi",
  "suprema_biostar2",
  "mock",
]);

const selectClass =
  "h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function formatDateTime(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isPollable(device: AttendanceDevice) {
  return POLLABLE_ADAPTERS.has(device.adapter_type);
}

type ConfirmKind = "sync" | "deactivate" | null;

export function DeviceManagementWorkspace() {
  const scope = getWorkspaceScopeKey();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<
    "devices" | "connectors" | "sync_history"
  >("devices");
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [confirmDevice, setConfirmDevice] = useState<AttendanceDevice | null>(
    null,
  );
  const [editOpen, setEditOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<AttendanceDevice | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    status: "active",
    timezone: "",
    manufacturer: "",
    model: "",
    serial_number: "",
  });

  const workspace = useQuery({
    queryKey: ["hr-attendance-devices-workspace", scope],
    queryFn: () =>
      attendanceFetch<{ data: AttendanceDeviceWorkspace }>(
        "/attendance/devices/workspace",
      ),
    refetchInterval: 15_000,
  });

  const employeesQuery = useQuery({
    queryKey: ["hr-attendance-employees-mgmt", scope],
    queryFn: () =>
      attendanceFetch<Paginated<Employee>>("/employees?per_page=200"),
  });

  const data = workspace.data?.data;
  const permissions = data?.permissions;
  const devices = data?.devices ?? [];
  const employees = employeesQuery.data?.data ?? [];
  const latestSyncJob = data?.sync_jobs?.[0];
  const rejectedEvents = latestSyncJob?.rejected_count ?? 0;

  const invalidateWorkspace = () => {
    void queryClient.invalidateQueries({
      queryKey: ["hr-attendance-devices-workspace", scope],
    });
    void queryClient.invalidateQueries({
      queryKey: ["hr-attendance-devices", scope],
    });
  };

  const filteredDevices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return devices.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (healthFilter !== "all" && d.health_status !== healthFilter)
        return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.device_code.toLowerCase().includes(q) ||
        d.adapter_type.toLowerCase().includes(q) ||
        (d.organization_unit?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [devices, searchQuery, statusFilter, healthFilter]);

  const testDevice = useMutation({
    mutationFn: (deviceCode: string) =>
      attendanceFetch<{ data: { ok: boolean } }>(
        `/attendance/devices/${encodeURIComponent(deviceCode)}/test`,
        { method: "POST" },
      ),
    onSuccess: () => {
      toast.success("Device connection test passed.");
      invalidateWorkspace();
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Device connection test failed.",
      );
    },
  });

  const syncDevice = useMutation({
    mutationFn: (deviceCode: string) =>
      attendanceFetch(
        `/attendance/devices/${encodeURIComponent(deviceCode)}/sync`,
        {
          method: "POST",
          body: JSON.stringify({ limit: 100 }),
        },
      ),
    onSuccess: () => {
      toast.success("Device sync job queued.");
      setConfirmKind(null);
      setConfirmDevice(null);
      invalidateWorkspace();
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Device sync could not be queued.",
      );
    },
  });

  const updateDevice = useMutation({
    mutationFn: () => {
      if (!editDevice) throw new Error("No device selected.");
      return attendanceFetch<{ data: AttendanceDevice }>(
        `/attendance/devices/${encodeURIComponent(editDevice.device_code)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: editForm.name,
            status: editForm.status,
            timezone: editForm.timezone,
            manufacturer: editForm.manufacturer || null,
            model: editForm.model || null,
            serial_number: editForm.serial_number || null,
          }),
        },
      );
    },
    onSuccess: () => {
      toast.success("Device updated.");
      setEditOpen(false);
      setEditDevice(null);
      invalidateWorkspace();
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Device could not be updated.",
      );
    },
  });

  const deactivateDevice = useMutation({
    mutationFn: (deviceCode: string) =>
      attendanceFetch(
        `/attendance/devices/${encodeURIComponent(deviceCode)}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      toast.success("Device deactivated.");
      setConfirmKind(null);
      setConfirmDevice(null);
      invalidateWorkspace();
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error
          ? err.message
          : "Device could not be deactivated.",
      );
    },
  });

  const openEdit = (device: AttendanceDevice) => {
    setEditDevice(device);
    setEditForm({
      name: device.name,
      status: device.status,
      timezone: device.timezone,
      manufacturer: device.manufacturer ?? "",
      model: device.model ?? "",
      serial_number: device.serial_number ?? "",
    });
    setEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur-md">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative">
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="-ml-3 text-muted-foreground hover:text-foreground"
              >
                <Link href="/dashboard/attendance">
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back to Attendance
                </Link>
              </Button>
            </div>
            <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-primary">
              Attendance Management
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">
              Devices & Sync
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Monitor terminal health, map device users, manage secure
              connectors, and review every synchronization result.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {permissions?.can_manage_devices && (
              <Button asChild className="font-bold">
                <Link href="/dashboard/attendance/device-onboarding">
                  <PlusCircle className="mr-1.5 h-4 w-4" /> Onboard New Device
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => invalidateWorkspace()}
              disabled={workspace.isFetching}
              className="bg-background/70"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${workspace.isFetching ? "animate-spin" : ""}`}
              />
              Refresh Status
            </Button>
          </div>
        </div>

        <div
          role="group"
          aria-label="Device management views"
          className="mt-6 grid gap-1 rounded-2xl border border-border/60 bg-muted/60 p-1 sm:grid-cols-3"
        >
          <button
            id="device-tab-devices"
            type="button"
            aria-pressed={activeTab === "devices"}
            aria-controls="device-panel-devices"
            onClick={() => setActiveTab("devices")}
            className={`min-h-11 rounded-xl px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === "devices"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
            }`}
          >
            Registered Devices ({devices.length})
          </button>
          <button
            id="device-tab-connectors"
            type="button"
            aria-pressed={activeTab === "connectors"}
            aria-controls="device-panel-connectors"
            onClick={() => setActiveTab("connectors")}
            className={`min-h-11 rounded-xl px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === "connectors"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
            }`}
          >
            Employee Mapping & Connectors
          </button>
          <button
            id="device-tab-sync"
            type="button"
            aria-pressed={activeTab === "sync_history"}
            aria-controls="device-panel-sync"
            onClick={() => setActiveTab("sync_history")}
            className={`min-h-11 rounded-xl px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === "sync_history"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
            }`}
          >
            Sync & Imports (
            {(data?.sync_jobs?.length ?? 0) +
              (data?.import_batches?.length ?? 0)}
            )
          </button>
        </div>
      </header>

      {activeTab === "devices" && (
        <div
          id="device-panel-devices"
          role="region"
          aria-labelledby="device-tab-devices"
          className="space-y-4"
        >
          {rejectedEvents > 0 && (
            <section
              aria-labelledby="device-mapping-needed-title"
              className="rounded-2xl border border-amber-600/30 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-100"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 id="device-mapping-needed-title" className="font-black">
                    Attendance events are waiting for employee mapping
                  </h2>
                  <p className="mt-1 text-sm leading-6">
                    The latest sync retrieved{" "}
                    {latestSyncJob?.received_count ?? 0} events;{" "}
                    {rejectedEvents} were not imported because their device user
                    IDs are not linked to employee records in the active
                    organization.
                  </p>
                </div>
                {permissions?.can_map_employees && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 shrink-0 border-amber-700/50 bg-background/70"
                    onClick={() => setActiveTab("connectors")}
                  >
                    Open employee mapping
                  </Button>
                )}
              </div>
            </section>
          )}
          <Card className="rounded-3xl border-border/60 bg-card/60">
            <CardContent className="p-0">
              <div className="flex flex-wrap items-end gap-3 border-b border-border/60 p-5">
                <div className="relative min-w-0 flex-1 basis-64">
                  <Label htmlFor="device-search" className="mb-2 block">
                    Search devices
                  </Label>
                  <Search
                    aria-hidden="true"
                    className="absolute left-3 top-10 h-4 w-4 text-muted-foreground"
                  />
                  <Input
                    id="device-search"
                    placeholder="Search by name, code, adapter, or unit…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="w-full space-y-2 sm:w-44">
                  <Label htmlFor="device-status-filter">Status</Label>
                  <select
                    id="device-status-filter"
                    className={selectClass}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="ready">Ready</option>
                    <option value="configuration_required">
                      Configuration required
                    </option>
                    <option value="inactive">Inactive</option>
                    <option value="error">Error</option>
                  </select>
                </div>
                <div className="w-full space-y-2 sm:w-44">
                  <Label htmlFor="device-health-filter">Health</Label>
                  <select
                    id="device-health-filter"
                    className={selectClass}
                    value={healthFilter}
                    onChange={(e) => setHealthFilter(e.target.value)}
                  >
                    <option value="all">All health</option>
                    <option value="healthy">Healthy</option>
                    <option value="degraded">Degraded</option>
                    <option value="unhealthy">Unhealthy</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
                <p
                  className="w-full text-xs font-semibold text-muted-foreground sm:w-auto"
                  aria-live="polite"
                >
                  Showing {filteredDevices.length} of {devices.length}
                </p>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableCaption>
                    Registered tenant attendance devices and biometric
                    terminals.
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Device</TableHead>
                      <TableHead scope="col">Adapter</TableHead>
                      <TableHead scope="col">Status</TableHead>
                      <TableHead scope="col">Health</TableHead>
                      <TableHead scope="col">Org / Kiosk</TableHead>
                      <TableHead scope="col">Last Seen / Health</TableHead>
                      <TableHead className="text-right" scope="col">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDevices.length ? (
                      filteredDevices.map((device) => (
                        <TableRow key={device.id} className="hover:bg-muted/40">
                          <TableCell className="font-semibold">
                            <div className="font-bold text-foreground">
                              {device.name}
                            </div>
                            <div className="font-mono text-xs text-primary">
                              {device.device_code}
                            </div>
                            {(device.model || device.serial_number) && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {[device.model, device.serial_number]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs capitalize text-muted-foreground">
                            {device.adapter_type.replaceAll("_", " ")}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold capitalize ${
                                device.status === "active" ||
                                device.status === "ready"
                                  ? "border border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                                  : "border border-amber-600/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                              }`}
                            >
                              {device.status.replaceAll("_", " ")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold capitalize ${
                                device.health_status === "healthy"
                                  ? "border border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                                  : device.health_status === "unhealthy"
                                    ? "border border-rose-600/30 bg-rose-500/10 text-rose-800 dark:text-rose-200"
                                    : "border border-border bg-muted text-muted-foreground"
                              }`}
                            >
                              {device.health_status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <div>
                              {device.organization_unit?.name ?? "—"}
                            </div>
                            <div>
                              {device.kiosk_station?.name ?? "No kiosk"}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <div>Seen: {formatDateTime(device.last_seen_at)}</div>
                            <div>
                              Health check:{" "}
                              {formatDateTime(device.last_health_at)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              {permissions?.can_manage_devices && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      testDevice.mutate(device.device_code)
                                    }
                                    disabled={testDevice.isPending}
                                    className="min-h-10 text-xs"
                                  >
                                    Test
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openEdit(device)}
                                    className="min-h-10 text-xs"
                                  >
                                    <Pencil
                                      aria-hidden="true"
                                      className="mr-1 h-3.5 w-3.5"
                                    />
                                    Edit
                                  </Button>
                                  {device.status !== "inactive" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="min-h-10 text-xs text-red-700 dark:text-red-300"
                                      onClick={() => {
                                        setConfirmDevice(device);
                                        setConfirmKind("deactivate");
                                      }}
                                    >
                                      Deactivate
                                    </Button>
                                  )}
                                </>
                              )}
                              {permissions?.can_sync_devices &&
                                isPollable(device) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setConfirmDevice(device);
                                      setConfirmKind("sync");
                                    }}
                                    disabled={syncDevice.isPending}
                                    className="min-h-10 text-xs"
                                  >
                                    Sync
                                  </Button>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-8 text-center text-muted-foreground"
                        >
                          {workspace.isLoading
                            ? "Loading device records..."
                            : "No devices found matching filters."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "connectors" && (
        <div
          id="device-panel-connectors"
          role="region"
          aria-labelledby="device-tab-connectors"
        >
          <AttendanceDeviceConnectors
            employees={employees}
            workspaceData={data}
            workspaceLoading={workspace.isLoading}
            workspaceError={workspace.isError}
            onRefresh={invalidateWorkspace}
            isRefreshing={workspace.isFetching}
          />
        </div>
      )}

      {activeTab === "sync_history" && (
        <div
          id="device-panel-sync"
          role="region"
          aria-labelledby="device-tab-sync"
          className="space-y-4"
        >
          <Card className="rounded-3xl border-border/60 bg-card/60">
            <CardContent className="p-0">
              <div className="border-b border-border/60 p-5">
                <h3 className="text-lg font-bold">Synchronization jobs</h3>
                <p className="text-xs text-muted-foreground">
                  Poll and connector jobs with accepted, duplicate, and rejected
                  counts.
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableCaption>
                    Recent attendance synchronization job logs.
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Job UUID</TableHead>
                      <TableHead scope="col">Device</TableHead>
                      <TableHead scope="col">Direction / Adapter</TableHead>
                      <TableHead scope="col">Counts</TableHead>
                      <TableHead scope="col">Status</TableHead>
                      <TableHead scope="col">Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.sync_jobs ?? []).length ? (
                      data?.sync_jobs.map((job) => (
                        <TableRow key={job.id} className="hover:bg-muted/40">
                          <TableCell className="font-mono text-xs text-primary">
                            {job.job_uuid.slice(0, 8)}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {job.device?.name ?? "Unknown Device"}
                          </TableCell>
                          <TableCell className="text-xs capitalize text-muted-foreground">
                            {job.direction} ·{" "}
                            {job.adapter_type.replaceAll("_", " ")}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            Rec: {job.received_count} | Acc:{" "}
                            {job.accepted_count} | Dup: {job.duplicate_count} |
                            Rej: {job.rejected_count}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold capitalize ${
                                job.status === "completed"
                                  ? "border border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                                  : job.status === "failed"
                                    ? "border border-rose-600/30 bg-rose-500/10 text-rose-800 dark:text-rose-200"
                                    : "border border-amber-600/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                              }`}
                            >
                              {job.status}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[14rem] text-xs text-rose-800 dark:text-rose-200">
                            {job.error_message ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No sync jobs recorded.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/60 bg-card/60">
            <CardContent className="p-0">
              <div className="border-b border-border/60 p-5">
                <h3 className="text-lg font-bold">Import batches</h3>
                <p className="text-xs text-muted-foreground">
                  Offline CSV/XLSX imports queued through the connector bay.
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableCaption>
                    Recent attendance file import batches.
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Created</TableHead>
                      <TableHead scope="col">Device</TableHead>
                      <TableHead scope="col">File</TableHead>
                      <TableHead scope="col">Counts</TableHead>
                      <TableHead scope="col">Status</TableHead>
                      <TableHead scope="col">Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.import_batches ?? []).length ? (
                      data?.import_batches.map((batch) => (
                        <TableRow key={batch.id} className="hover:bg-muted/40">
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDateTime(batch.created_at)}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {batch.device?.name ?? "Unknown"}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-mono">
                              {batch.original_filename}
                            </div>
                            <div className="text-muted-foreground uppercase">
                              {batch.file_format}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            Tot: {batch.total_rows} | Acc: {batch.accepted_rows}{" "}
                            | Dup: {batch.duplicate_rows} | Rej:{" "}
                            {batch.rejected_rows}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-bold capitalize">
                              {batch.status}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[14rem] text-xs text-rose-800 dark:text-rose-200">
                            {batch.error_summary?.message ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No import batches recorded.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit device</DialogTitle>
            <DialogDescription>
              Update display details and lifecycle status for{" "}
              {editDevice?.device_code}. Adapter type cannot be changed here.
            </DialogDescription>
          </DialogHeader>
          <div className="my-2 grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-device-name">Name</Label>
              <Input
                id="edit-device-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((c) => ({ ...c, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-device-status">Status</Label>
              <select
                id="edit-device-status"
                className={selectClass}
                value={editForm.status}
                onChange={(e) =>
                  setEditForm((c) => ({ ...c, status: e.target.value }))
                }
              >
                <option value="active">Active</option>
                <option value="ready">Ready</option>
                <option value="configuration_required">
                  Configuration required
                </option>
                <option value="inactive">Inactive</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-device-timezone">Timezone</Label>
              <Input
                id="edit-device-timezone"
                value={editForm.timezone}
                onChange={(e) =>
                  setEditForm((c) => ({ ...c, timezone: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-device-mfr">Manufacturer</Label>
                <Input
                  id="edit-device-mfr"
                  value={editForm.manufacturer}
                  onChange={(e) =>
                    setEditForm((c) => ({
                      ...c,
                      manufacturer: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-device-model">Model</Label>
                <Input
                  id="edit-device-model"
                  value={editForm.model}
                  onChange={(e) =>
                    setEditForm((c) => ({ ...c, model: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-device-serial">Serial number</Label>
              <Input
                id="edit-device-serial"
                value={editForm.serial_number}
                onChange={(e) =>
                  setEditForm((c) => ({
                    ...c,
                    serial_number: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={updateDevice.isPending || !editForm.name}
              onClick={() => updateDevice.mutate()}
            >
              {updateDevice.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmKind !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmKind(null);
            setConfirmDevice(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmKind === "deactivate"
                ? "Deactivate this device?"
                : "Queue device sync?"}
            </DialogTitle>
            <DialogDescription>
              {confirmKind === "deactivate"
                ? `${confirmDevice?.name} will be set inactive. Historical events and mappings stay preserved.`
                : `Poll up to 100 recent events from ${confirmDevice?.name}. Ambiguous or unmapped device users will be rejected.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => {
                setConfirmKind(null);
                setConfirmDevice(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={confirmKind === "deactivate" ? "destructive" : "default"}
              className="min-h-11"
              disabled={
                confirmKind === "deactivate"
                  ? deactivateDevice.isPending
                  : syncDevice.isPending
              }
              onClick={() => {
                if (!confirmDevice) return;
                if (confirmKind === "deactivate") {
                  deactivateDevice.mutate(confirmDevice.device_code);
                } else {
                  syncDevice.mutate(confirmDevice.device_code);
                }
              }}
            >
              {confirmKind === "deactivate"
                ? deactivateDevice.isPending
                  ? "Deactivating…"
                  : "Confirm deactivate"
                : syncDevice.isPending
                  ? "Queuing…"
                  : "Confirm sync"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
