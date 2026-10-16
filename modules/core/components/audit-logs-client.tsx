"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Activity,
  Archive,
  Eye,
  Filter,
  RefreshCw,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/datatable/data-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { usePermissions } from "@/hooks/use-permissions";
import { getWorkspaceScopeKey, isTenantSession } from "@/lib/runtime-context";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useTranslation } from "@/store/use-translation";

type Option = { value: string; label: string };
type AuditLogRecord = {
  id: number;
  event: string;
  description: string;
  log_name: string;
  causer: string;
  tenant_id: string;
  created_at: string | null;
  subject_type?: string;
  subject_id?: string;
  causer_id?: string;
  properties: Record<string, unknown>;
};
const defaults = {
  mode: "active",
  event: "all",
  node: "all",
  module: "all",
  operator: "all",
  node_id: "all",
  event_name: "all",
  subject_type: "all",
  subject_id: "",
  ip: "",
  request_id: "",
  start_date: "",
  end_date: "",
};
type Filters = typeof defaults;
type FilterKey = keyof Filters;
const formatTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "—";
const humanize = (value: string) => value.replaceAll("_", " ");

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
  allLabel = "All",
}: {
  id: string;
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  allLabel?: string;
}) {
  const available = options.filter((option) => option.value !== "all");
  if (value !== "all" && !available.some((option) => option.value === value))
    available.push({ value, label: humanize(value) });
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="min-h-11 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="tenant-operations">
          <SelectGroup>
            <SelectItem value="all">{allLabel}</SelectItem>
            {available.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

export function AuditLogsClient() {
  const queryClient = useQueryClient();
  const params = useSearchParams();
  const { t, locale } = useTranslation();
  const { permissions, roles } = usePermissions();
  const hasPermission = (permission: string) =>
    roles.includes("Super Admin") || permissions.includes(permission);
  const [filters, setFilters] = React.useState<Filters>(
    () =>
      Object.fromEntries(
        Object.entries(defaults).map(([key, value]) => [
          key,
          params.get(key) || value,
        ]),
      ) as Filters,
  );
  const [settledFilters, setSettledFilters] = React.useState(filters);
  const [context, setContext] = React.useState<{
    tenant: boolean;
    scope: string;
    timezone: string;
  } | null>(null);
  const [page, setPage] = React.useState(Number(params.get("page")) || 1);
  const [pageSize, setPageSize] = useLocalStorage<number>(
    "audit_logs_page_size",
    25,
  );
  const [search, setSearch] = React.useState(params.get("search") || "");
  const [sort, setSort] = React.useState({
    column: params.get("sortCol") || "created_at",
    direction: params.get("sortDir") === "asc" ? "asc" : "desc",
  });
  const [live, setLive] = React.useState(false);
  const [tableRevision, setTableRevision] = React.useState(0);
  const [selected, setSelected] = React.useState<number[]>([]);
  const [viewLog, setViewLog] = React.useState<AuditLogRecord | null>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [retention, setRetention] = React.useState(90);
  const [busy, setBusy] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState<{
    title: string;
    description: string;
    action: () => Promise<void>;
  } | null>(null);
  const trigger = React.useRef<HTMLElement | null>(null);
  const heading = React.useRef<HTMLHeadingElement>(null);
  const archived = filters.mode === "archived";
  const canExport = hasPermission("export_logs");
  const canSettings = hasPermission("manage_log_settings");
  const canArchive = hasPermission("archive_logs");
  const canDelete = hasPermission("delete_archived_logs");
  const invalidDates = !!(
    filters.start_date &&
    filters.end_date &&
    filters.start_date > filters.end_date
  );

  React.useEffect(() => {
    setContext({
      tenant: isTenantSession(),
      scope: getWorkspaceScopeKey(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }, []);
  React.useEffect(() => {
    const timer = setTimeout(() => setSettledFilters(filters), 300);
    return () => clearTimeout(timer);
  }, [filters]);
  React.useEffect(() => {
    setSelected([]);
  }, [filters, search, page, pageSize]);

  const change = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    setPage(1);
    const url = new URL(window.location.href);
    Object.entries(next).forEach(([key, value]) =>
      value === defaults[key as FilterKey]
        ? url.searchParams.delete(key)
        : url.searchParams.set(key, value),
    );
    url.searchParams.set("page", "1");
    window.history.replaceState(null, "", url);
  };
  const reset = () => {
    change(defaults);
    setSearch("");
    setSort({ column: "created_at", direction: "desc" });
    const url = new URL(window.location.href);
    ["search", "sortCol", "sortDir"].forEach((key) =>
      url.searchParams.delete(key),
    );
    window.history.replaceState(null, "", url);
    setTableRevision((value) => value + 1);
  };
  const queryParams = React.useMemo(() => {
    const values: Record<string, string> = {
      timezone: context?.timezone || "UTC",
      search,
      sort_by: sort.column,
      sort_direction: sort.direction,
    };
    Object.entries(settledFilters).forEach(([key, value]) => {
      if (value && value !== "all") values[key] = value;
    });
    if (context?.tenant) {
      delete values.node;
      delete values.node_id;
    }
    return values;
  }, [settledFilters, context, search, sort]);
  const logs = useQuery({
    queryKey: ["audit-logs", context?.scope, queryParams, page, pageSize],
    enabled:
      !!context &&
      !invalidDates &&
      !(
        settledFilters.start_date &&
        settledFilters.end_date &&
        settledFilters.start_date > settledFilters.end_date
      ),
    queryFn: async () =>
      (
        await api.get(
          settledFilters.mode === "archived" ? "/logs/archived" : "/logs",
          { params: { ...queryParams, page, pageSize } },
        )
      ).data,
    placeholderData: (previous) => previous,
    refetchInterval: live && !archived ? 15000 : false,
    refetchOnWindowFocus: false,
  });
  const options = useQuery({
    queryKey: [
      "audit-log-options",
      context?.scope,
      settledFilters.mode,
      settledFilters.event,
      settledFilters.node,
      settledFilters.start_date,
      settledFilters.end_date,
    ],
    enabled:
      !!context &&
      !invalidDates &&
      !(
        settledFilters.start_date &&
        settledFilters.end_date &&
        settledFilters.start_date > settledFilters.end_date
      ),
    queryFn: async () =>
      (
        await api.get("/logs/filter-options", {
          params: {
            mode: settledFilters.mode,
            event: settledFilters.event,
            node: context?.tenant ? "all" : settledFilters.node,
            start_date: settledFilters.start_date || undefined,
            end_date: settledFilters.end_date || undefined,
            timezone: context?.timezone,
          },
        })
      ).data as {
        modules: Option[];
        operators: Option[];
        nodes: Option[];
        events: Option[];
        subjects: Option[];
      },
    staleTime: 30000,
  });
  const rows: AuditLogRecord[] = logs.data?.data || [];
  const summary = logs.data?.meta?.summary;
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["audit-logs", context?.scope],
      }),
      queryClient.invalidateQueries({
        queryKey: ["audit-log-options", context?.scope],
      }),
    ]);
  };
  const mutate = async (operation: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await operation();
      toast.success(message);
      setSelected([]);
      await refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, "The audit operation failed."));
    } finally {
      setBusy(false);
    }
  };
  const restoreFocus = (event: Event) => {
    event.preventDefault();
    requestAnimationFrame(() => {
      const previous = trigger.current;
      const label = previous?.getAttribute("aria-label");
      const target =
        (previous?.isConnected
          ? previous
          : label
            ? Array.from(
                document.querySelectorAll<HTMLButtonElement>(
                  "button[aria-label]",
                ),
              ).find((button) => button.getAttribute("aria-label") === label)
            : null) ?? document.getElementById("tour-audit-filters-reset");
      target?.focus({ preventScroll: true });
    });
  };
  const showDetails = React.useCallback(
    (record: AuditLogRecord, button: HTMLButtonElement) => {
      trigger.current = button;
      setViewLog(record);
    },
    [],
  );
  const badge = (event: string) => (
    <Badge variant="outline" className="whitespace-normal text-left">
      {humanize(event || "system")}
    </Badge>
  );
  const columns: ColumnDef<AuditLogRecord>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs">#{row.original.id}</span>
      ),
    },
    {
      accessorKey: "event",
      header: t("audit.col_action", "Action"),
      cell: ({ row }) => badge(row.original.event),
    },
    {
      accessorKey: "description",
      header: t("audit.col_desc", "Activity Description"),
      cell: ({ row }) => (
        <span className="block max-w-80 whitespace-normal">
          {row.original.description}
        </span>
      ),
    },
    { accessorKey: "log_name", header: t("audit.col_module", "Module") },
    { accessorKey: "causer", header: t("audit.col_operator", "Operator") },
    ...(!context?.tenant
      ? [{ accessorKey: "tenant_id", header: t("audit.col_node", "Node") }]
      : []),
    {
      accessorKey: "created_at",
      header: t("audit.col_time", "Timestamp"),
      cell: ({ row }) => formatTime(row.original.created_at),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="min-h-11 min-w-11 tour-audit-action-view"
            aria-label={`View log details (ID ${row.original.id})`}
            onClick={(event) => showDetails(row.original, event.currentTarget)}
          >
            <Eye aria-hidden="true" />
          </Button>
          {archived && canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11"
              disabled={busy}
              aria-label={`Delete archived log ${row.original.id}`}
              onClick={(event) => {
                trigger.current = event.currentTarget;
                setConfirmation({
                  title: "Delete archived record?",
                  description: `Record #${row.original.id} will be permanently deleted. This cannot be undone.`,
                  action: () =>
                    mutate(
                      () => api.delete(`/logs/archived/${row.original.id}`),
                      "Archived record deleted.",
                    ),
                });
              }}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </div>
      ),
    },
  ];
  if (archived && canDelete)
    columns.unshift({
      id: "select",
      enableSorting: false,
      header: () => (
        <Checkbox
          aria-label="Select all visible archived logs"
          checked={
            rows.length > 0 && rows.every((row) => selected.includes(row.id))
          }
          onCheckedChange={(checked) =>
            setSelected(checked ? rows.map((row) => row.id) : [])
          }
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Select archived log ${row.original.id}`}
          checked={selected.includes(row.original.id)}
          onCheckedChange={(checked) =>
            setSelected((previous) =>
              checked
                ? [...previous, row.original.id]
                : previous.filter((id) => id !== row.original.id),
            )
          }
        />
      ),
    });

  const preset = (days: number) => {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - Math.max(0, days - 1));
    const localDate = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    change({ start_date: localDate(start), end_date: localDate(today) });
  };
  const activeCount = Object.entries(filters).filter(
    ([key, value]) => key !== "mode" && value !== defaults[key as FilterKey],
  ).length;
  const field = (
    key: FilterKey,
    label: string,
    type = "text",
    placeholder?: string,
  ) => (
    <Field>
      <FieldLabel htmlFor={`audit-${key}`}>{label}</FieldLabel>
      <Input
        id={`audit-${key}`}
        type={type}
        value={filters[key]}
        onChange={(event) => change({ [key]: event.target.value })}
        placeholder={placeholder}
        className="min-h-11"
        aria-invalid={type === "date" && invalidDates}
        aria-describedby={
          type === "date" && invalidDates ? "audit-date-error" : undefined
        }
      />
    </Field>
  );

  return (
    <div className="tenant-operations flex min-w-0 flex-col gap-5">
      <section
        aria-labelledby="audit-pulse-title"
        className="rounded-2xl border bg-card p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              {context?.tenant
                ? "Workspace audit trail"
                : "Central audit operations"}
            </p>
            <h2
              id="audit-pulse-title"
              className="mt-2 font-space text-2xl font-bold"
            >
              Follow every action.
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {context?.tenant
                ? "Only records belonging to this workspace are available."
                : "Inspect central activity or narrow the ledger to a tenant workspace."}
            </p>
          </div>
          <Button
            variant="outline"
            aria-pressed={live}
            onClick={() => setLive((value) => !value)}
            disabled={archived}
          >
            <RefreshCw aria-hidden="true" data-icon="inline-start" />
            Live refresh{live ? " · on" : " · off"}
          </Button>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["Matching records", summary?.total],
            ["Changes", summary?.changes],
            ["Security events", summary?.security],
            ["Operators", summary?.operators],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border bg-background p-4">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="mt-2 text-3xl font-semibold tabular-nums">
                {logs.isError
                  ? "—"
                  : value == null
                    ? "…"
                    : Number(value).toLocaleString()}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          Counts follow the current filters. Latest match:{" "}
          {formatTime(summary?.latest_at)}. Dates use{" "}
          {context?.timezone || "your local timezone"}.
        </p>
      </section>

      <div
        id="tour-audit-view-modes"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!archived ? "default" : "outline"}
            aria-pressed={!archived}
            onClick={() => change({ mode: "active" })}
          >
            <Activity aria-hidden="true" data-icon="inline-start" />
            {t("audit.active_logs", "Active Live Logs")}
          </Button>
          <Button
            variant={archived ? "default" : "outline"}
            aria-pressed={archived}
            onClick={() => change({ mode: "archived" })}
          >
            <Archive aria-hidden="true" data-icon="inline-start" />
            {t("audit.vault", "Cold Storage Vault")}
          </Button>
        </div>
        <div id="tour-audit-actions-vault" className="flex flex-wrap gap-2">
          {canSettings && (
            <Button
              variant="outline"
              aria-label="Policy Settings"
              onClick={async (event) => {
                trigger.current = event.currentTarget;
                try {
                  const response = await api.get("/logs/settings");
                  setRetention(response.data.retention_days);
                  setSettingsOpen(true);
                } catch (error) {
                  toast.error(
                    getErrorMessage(
                      error,
                      "Could not load retention settings.",
                    ),
                  );
                }
              }}
            >
              <Settings2 aria-hidden="true" data-icon="inline-start" />
              Policy Settings
            </Button>
          )}
          {canArchive && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={(event) => {
                trigger.current = event.currentTarget;
                setConfirmation({
                  title: "Archive older audit records?",
                  description: context?.tenant
                    ? "Eligible records from this workspace will move to the archive using its retention policy."
                    : "Eligible records across central and tenant workspaces will move to the archive using the central retention policy.",
                  action: () =>
                    mutate(
                      () => api.post("/logs/archive"),
                      "Archive job queued. Refresh the vault after processing completes.",
                    ),
                });
              }}
            >
              <Archive aria-hidden="true" data-icon="inline-start" />
              Archive older records
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter aria-hidden="true" />
            Find the records you need
          </CardTitle>
          <CardDescription>
            Combine filters to investigate an action, operator, or affected
            record. Exports use these same filters.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div id="tour-audit-filters-event">
              <FilterSelect
                id="audit-event"
                label="Event category"
                value={filters.event}
                onChange={(value) =>
                  change({ event: value, event_name: "all" })
                }
                allLabel="All activity"
                options={[
                  { value: "crud", label: "Modifications" },
                  { value: "security", label: "Security & sign-ins" },
                  { value: "telemetry", label: "Telemetry" },
                  { value: "system", label: "System" },
                ]}
              />
            </div>
            <div id="tour-audit-filters-module">
              <FilterSelect
                id="audit-module"
                label="Module"
                value={filters.module}
                onChange={(value) => change({ module: value })}
                allLabel="All modules"
                options={options.data?.modules || []}
              />
            </div>
            <div id="tour-audit-filters-operator">
              <FilterSelect
                id="audit-operator"
                label="Operator"
                value={filters.operator}
                onChange={(value) => change({ operator: value })}
                allLabel="All operators"
                options={options.data?.operators || []}
              />
            </div>
            <FilterSelect
              id="audit-event-name"
              label="Exact event"
              value={filters.event_name}
              onChange={(value) => change({ event_name: value })}
              allLabel="Any event"
              options={options.data?.events || []}
            />
            {!context?.tenant && (
              <>
                <div id="tour-audit-filters-node">
                  <FilterSelect
                    id="audit-node"
                    label="Node scope"
                    value={filters.node}
                    onChange={(value) =>
                      change({ node: value, node_id: "all" })
                    }
                    allLabel="All nodes"
                    options={[
                      { value: "central", label: "Central only" },
                      { value: "tenant", label: "Tenants only" },
                    ]}
                  />
                </div>
                <div id="tour-audit-filters-specific-node">
                  <FilterSelect
                    id="audit-node-id"
                    label="Specific node"
                    value={filters.node_id}
                    onChange={(value) => change({ node_id: value })}
                    allLabel="Any node"
                    options={options.data?.nodes || []}
                  />
                </div>
              </>
            )}
            {field("start_date", "From", "date")}
            {field("end_date", "To", "date")}
          </FieldGroup>
          <div
            id="tour-audit-filters-date"
            className="flex flex-wrap items-center gap-2"
          >
            <span className="text-sm text-muted-foreground">Quick dates</span>
            {[1, 7, 30, 90].map((days) => (
              <Button
                key={days}
                variant="outline"
                size="sm"
                className="min-h-11"
                onClick={() => preset(days)}
              >
                {days === 1 ? "Today" : `${days} days`}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11"
              disabled={!filters.start_date && !filters.end_date}
              onClick={() => change({ start_date: "", end_date: "" })}
            >
              Clear dates
            </Button>
          </div>
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
              Advanced filters · IP, record and request
            </summary>
            <FieldGroup className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {field("ip", "IP address", "text", "Exact address")}
              <FilterSelect
                id="audit-subject-type"
                label="Record type"
                value={filters.subject_type}
                onChange={(value) => change({ subject_type: value })}
                allLabel="Any record type"
                options={options.data?.subjects || []}
              />
              {field("subject_id", "Record ID", "text", "Exact record ID")}
              {field(
                "request_id",
                "Request ID",
                "text",
                "Exact correlation ID",
              )}
            </FieldGroup>
          </details>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" role="status">
              {activeCount} active filter{activeCount === 1 ? "" : "s"}
              {logs.isFetching ? " · updating results…" : ""}
            </p>
            <Button
              id="tour-audit-filters-reset"
              variant="outline"
              onClick={reset}
            >
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>
      {invalidDates && (
        <Alert variant="destructive">
          <AlertTitle>Check the date window</AlertTitle>
          <AlertDescription id="audit-date-error">
            The To date must be on or after the From date.
          </AlertDescription>
        </Alert>
      )}
      {(logs.isError || options.isError) && (
        <Alert variant="destructive">
          <AlertTitle>Audit records could not be loaded</AlertTitle>
          <AlertDescription>
            {getErrorMessage(
              logs.error || options.error,
              "Refresh to try again.",
            )}{" "}
            <Button variant="outline" onClick={() => void refresh()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {archived && selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span>{selected.length} selected on this page</span>
          <Button variant="outline" onClick={() => setSelected([])}>
            Clear selection
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={(event) => {
              trigger.current = event.currentTarget;
              const ids = [...selected];
              setConfirmation({
                title: "Delete selected archived records?",
                description: `${ids.length} selected records will be permanently deleted. This cannot be undone.`,
                action: () =>
                  mutate(
                    () => api.post("/logs/archived/bulk-delete", { ids }),
                    "Selected archived records deleted.",
                  ),
              });
            }}
          >
            Delete selected
          </Button>
        </div>
      )}
      {!invalidDates && (
        <DataTable
          key={`${tableRevision}-${filters.mode}-${locale}`}
          columns={columns}
          data={logs.isError ? [] : rows}
          totalEntries={logs.isError ? 0 : logs.data?.meta?.total || 0}
          loading={logs.isLoading || logs.isFetching}
          resourceName={archived ? "archived logs" : "logs"}
          pageIndex={page}
          pageSize={pageSize}
          searchPlaceholder="Search descriptions, operators, IPs or IDs…"
          defaultSearch={search}
          defaultSortCol={sort.column}
          defaultSortDir={sort.direction === "asc" ? "asc" : "desc"}
          onQueryChange={(query) => {
            const url = new URL(window.location.href);
            Object.entries({
              page: query.page,
              search: query.search,
              sortCol: query.sortCol,
              sortDir: query.sortDir,
            }).forEach(([key, value]) => {
              if (value == null || value === "") url.searchParams.delete(key);
              else url.searchParams.set(key, String(value));
            });
            window.history.replaceState(null, "", url);
            if (query.page) setPage(query.page);
            if (query.pageSize) setPageSize(query.pageSize);
            if (query.search !== undefined) setSearch(query.search);
            if (query.sortCol !== undefined || query.sortDir !== undefined)
              setSort((previous) => ({
                column: query.sortCol ?? previous.column,
                direction: query.sortDir || previous.direction,
              }));
          }}
          onRefresh={() => void refresh()}
          onResetFilters={reset}
          exportEndpoint={
            canExport
              ? `/logs/export?${new URLSearchParams({ ...queryParams, locale }).toString()}`
              : undefined
          }
          canCopy={canExport}
          canExport={canExport}
          canPrint={canExport}
          syncWithUrl={false}
        />
      )}

      <Dialog
        open={!!viewLog}
        onOpenChange={(open) => !open && setViewLog(null)}
      >
        <DialogContent
          className="tenant-operations flex max-h-[90vh] flex-col sm:max-w-3xl"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            heading.current?.focus();
          }}
          onCloseAutoFocus={restoreFocus}
        >
          <DialogHeader>
            <DialogTitle ref={heading} tabIndex={-1} className="outline-none">
              Audit record #{viewLog?.id}
            </DialogTitle>
            <DialogDescription>
              {viewLog?.log_name} · {formatTime(viewLog?.created_at)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-col gap-5 overflow-y-auto">
            <div>
              {badge(viewLog?.event || "system")}
              <p className="mt-3 whitespace-pre-wrap break-words">
                {viewLog?.description}
              </p>
            </div>
            <dl className="grid grid-cols-1 gap-3 rounded-xl border p-4 text-sm sm:grid-cols-2">
              {[
                ["Operator", viewLog?.causer],
                ["Node", viewLog?.tenant_id],
                ["Record type", viewLog?.subject_type],
                ["Record ID", viewLog?.subject_id],
                [
                  "IP address",
                  viewLog?.properties.ip ?? viewLog?.properties.ip_address,
                ],
                [
                  "Request ID",
                  viewLog?.properties.request_id ??
                    viewLog?.properties.correlation_id,
                ],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-muted-foreground">{String(label)}</dt>
                  <dd className="mt-1 break-all font-medium">
                    {String(value ?? "—")}
                  </dd>
                </div>
              ))}
            </dl>
            <div>
              <h3 className="mb-2 font-semibold">Recorded properties</h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Sensitive credential fields are redacted. A stored signature
                alone does not establish integrity verification.
              </p>
              <pre className="max-h-80 overflow-auto rounded-xl border bg-muted p-4 text-xs">
                {JSON.stringify(viewLog?.properties || {}, null, 2)}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewLog(null)}>
              Close Inspection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent
          className="tenant-operations"
          onCloseAutoFocus={restoreFocus}
        >
          <DialogHeader>
            <DialogTitle>Archive Policy Settings</DialogTitle>
            <DialogDescription>
              {context?.tenant
                ? "This policy applies to this workspace."
                : "The central policy controls the global manual archive sweep."}
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="audit-retention">
              Retention threshold (days)
            </FieldLabel>
            <Input
              id="audit-retention"
              type="number"
              min={0}
              max={3650}
              value={retention}
              onChange={(event) => setRetention(Number(event.target.value))}
            />
            <p className="text-sm text-muted-foreground">
              Records older than this threshold are eligible for archiving. Zero
              includes all records before the archive job starts.
            </p>
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                busy ||
                !Number.isInteger(retention) ||
                retention < 0 ||
                retention > 3650
              }
              onClick={() =>
                void mutate(async () => {
                  await api.post("/logs/settings", {
                    retention_days: retention,
                  });
                  setSettingsOpen(false);
                }, "Archive policy updated.")
              }
            >
              Save Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!confirmation}
        onOpenChange={(open) => !open && setConfirmation(null)}
      >
        <AlertDialogContent
          className="tenant-operations"
          onCloseAutoFocus={restoreFocus}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={() => {
                const action = confirmation?.action;
                setConfirmation(null);
                if (action) void action();
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
