"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Barcode, Eye, Loader2, ScanLine, Search, Tags } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/store/use-translation";

import { DataTable, type DataTableQuery } from "@/components/datatable/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { fetchInventorySerials, lookupInventorySerial } from "@/modules/inventory/api";
import type { InventorySerial, SerialStatus } from "@/modules/inventory/operations-types";

type TableQueryState = {
  page: number;
  pageSize: number;
  search: string;
  sortCol: string;
  sortDir: "asc" | "desc";
};

const DEFAULT_QUERY: TableQueryState = {
  page: 1,
  pageSize: 15,
  search: "",
  sortCol: "created_at",
  sortDir: "desc",
};

const STATUS_META: Record<SerialStatus, { labelKey: string; fallback: string; className: string }> = {
  available: { labelKey: "inventory.serials.status_available", fallback: "Available", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  issued: { labelKey: "inventory.serials.status_issued", fallback: "Issued", className: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30" },
  quarantine: { labelKey: "inventory.serials.status_quarantine", fallback: "Quarantine", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  damaged: { labelKey: "inventory.serials.status_damaged", fallback: "Damaged", className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
  returned: { labelKey: "inventory.serials.status_returned", fallback: "Returned", className: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30" },
  disposed: { labelKey: "inventory.serials.status_disposed", fallback: "Disposed", className: "bg-muted text-muted-foreground border-border" },
  missing: { labelKey: "inventory.serials.status_missing", fallback: "Missing", className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
};

export function SerialStatusBadge({ status }: { status: SerialStatus }) {
  const { t } = useTranslation();
  const meta = STATUS_META[status] ?? STATUS_META.available;
  return (
    <Badge variant="outline" className={cn("rounded-full font-medium", meta.className)}>
      {t(meta.labelKey, meta.fallback)}
    </Badge>
  );
}

export default function SerialsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { hasAnyPermission, isLoaded } = usePermissions();
  const canView = hasAnyPermission(["view_inventory", "manage_inventory"]);

  const [tableQuery, setTableQuery] = React.useState<TableQueryState>(DEFAULT_QUERY);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [scan, setScan] = React.useState("");
  const [scanning, setScanning] = React.useState(false);
  const scanRef = React.useRef<HTMLInputElement>(null);

  const serialsQuery = useQuery({
    queryKey: ["inventory", "serials", tableQuery, statusFilter],
    enabled: canView,
    queryFn: () =>
      fetchInventorySerials({
        serial_number: tableQuery.search || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        page: tableQuery.page,
        per_page: tableQuery.pageSize,
        sort: tableQuery.sortCol,
        direction: tableQuery.sortDir,
      }),
  });

  const applyTableQuery = React.useCallback((next: Partial<TableQueryState>) => {
    setTableQuery((prev) => ({ ...prev, ...next }));
  }, []);

  const handleTableQueryChange = React.useCallback(
    (query: DataTableQuery) => {
      applyTableQuery({
        page: Number(query.page || 1),
        pageSize: Number(query.pageSize || DEFAULT_QUERY.pageSize),
        search: String(query.search ?? ""),
        sortCol: query.sortCol ? String(query.sortCol) : "created_at",
        sortDir: query.sortDir === "asc" ? "asc" : "desc",
      });
    },
    [applyTableQuery]
  );

  const handleScan = React.useCallback(async () => {
    const value = scan.trim();
    if (!value) return;
    setScanning(true);
    try {
      const serial = await lookupInventorySerial(value);
      router.push(`/dashboard/inventory/serials/${serial.id}`);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        toast.error(t("inventory.serials.not_found", "No serial found for {value}.", { value }));
      } else {
        toast.error(error?.response?.data?.message ?? t("inventory.common.failed", "Lookup failed."));
      }
      scanRef.current?.select();
    } finally {
      setScanning(false);
    }
  }, [scan, router, t]);

  const columns = React.useMemo<ColumnDef<InventorySerial>[]>(
    () => [
      {
        accessorKey: "serial_number",
        header: t("inventory.serials.col_serial", "Serial Number"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Barcode className="h-4 w-4 text-primary" />
            <Link
              href={`/dashboard/inventory/serials/${row.original.id}`}
              className="font-mono font-semibold hover:underline"
            >
              {row.original.serial_number}
            </Link>
          </div>
        ),
      },
      {
        id: "good",
        header: t("inventory.common.good", "Good"),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.good?.name ?? "—"}</p>
            <p className="font-mono text-xs text-muted-foreground">{row.original.good?.sku ?? "—"}</p>
          </div>
        ),
      },
      {
        id: "batch",
        header: t("inventory.common.batch", "Batch"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.batch?.batch_number ?? "—"}</span>
        ),
      },
      {
        accessorKey: "status",
        header: t("inventory.common.status", "Status"),
        cell: ({ row }) => <SerialStatusBadge status={row.original.status} />,
        meta: { align: "center" as const },
      },
      {
        id: "location",
        header: t("inventory.common.location", "Location"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm">{row.original.location?.code ?? "—"}</span>
        ),
      },
      {
        accessorKey: "received_at",
        header: t("inventory.serials.col_received", "Received"),
        cell: ({ row }) =>
          row.original.received_at ? (
            <span className="text-sm text-muted-foreground">
              {format(new Date(row.original.received_at), "PP")}
            </span>
          ) : (
            "—"
          ),
      },
      {
        id: "actions",
        header: t("inventory.common.actions", "Actions"),
        enableSorting: false,
        cell: ({ row }) => (
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link href={`/dashboard/inventory/serials/${row.original.id}`}>
              <Eye className="mr-1 h-3.5 w-3.5" />
              {t("inventory.common.view", "View")}
            </Link>
          </Button>
        ),
        meta: { align: "left" as const },
      },
    ],
    [t]
  );

  if (isLoaded && !canView) {
    return (
      <Card className="mx-auto mt-10 max-w-lg rounded-3xl border-border/60 p-8 text-center">
        <ScanLine className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h2 className="text-lg font-bold">{t("inventory.common.no_access_title", "No access")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("inventory.serials.no_access", "You do not have permission to view serial numbers.")}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">{t("inventory.serials.title", "Serial Numbers")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("inventory.serials.subtitle", "Track every serialized unit — identity, location, and full lifecycle.")}
          </p>
        </div>
      </div>

      {/* Scanner-first exact lookup */}
      <Card className="rounded-3xl border-border/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="serial-scan" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("inventory.serials.scan_label", "Scan or type a serial")}
            </label>
            <div className="relative">
              <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="serial-scan"
                ref={scanRef}
                autoFocus
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleScan();
                  }
                }}
                placeholder={t("inventory.serials.scan_placeholder", "e.g. SN-000123 then Enter")}
                className="pl-9 font-mono"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
          <Button className="rounded-full px-5" onClick={() => void handleScan()} disabled={scanning || !scan.trim()}>
            {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            {t("inventory.serials.lookup_btn", "Look up")}
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Tags className="h-4 w-4 text-muted-foreground" />
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              applyTableQuery({ page: 1 });
            }}
          >
            <SelectTrigger className="w-[180px] rounded-full">
              <SelectValue placeholder={t("inventory.common.status", "Status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("inventory.serials.all_statuses", "All statuses")}</SelectItem>
              {(Object.keys(STATUS_META) as SerialStatus[]).map((status) => (
                <SelectItem key={status} value={status}>
                  {t(STATUS_META[status].labelKey, STATUS_META[status].fallback)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={serialsQuery.data?.data ?? []}
        totalEntries={serialsQuery.data?.meta?.total ?? 0}
        loading={serialsQuery.isLoading || serialsQuery.isFetching}
        pageIndex={tableQuery.page}
        pageSize={tableQuery.pageSize}
        onQueryChange={handleTableQueryChange}
        onRefresh={() => serialsQuery.refetch()}
        onResetFilters={() => {
          setTableQuery(DEFAULT_QUERY);
          setStatusFilter("all");
        }}
        searchPlaceholder={t("inventory.serials.search_placeholder", "Search serials...")}
        resourceName="serials"
        canExport={false}
        syncWithUrl={false}
        emptyMessage={t("inventory.serials.empty", "No serial numbers match your filters.")}
      />
    </div>
  );
}
