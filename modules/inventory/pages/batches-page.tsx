"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, format } from "date-fns";
import { CalendarClock, Eye, Layers, ShieldAlert } from "lucide-react";
import { useTranslation } from "@/store/use-translation";

import { DataTable, type DataTableQuery } from "@/components/datatable/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { fetchInventoryBatches } from "@/modules/inventory/api";
import type { GoodBatch } from "@/modules/inventory/operations-types";

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
  sortCol: "expiry_date",
  sortDir: "asc",
};

const EXPIRY_SOON_DAYS = 30;

/** Cosmetic expiry state (backend is_expired stays authoritative for eligibility). */
export function expiryState(batch: Pick<GoodBatch, "expiry_date" | "is_expired">) {
  if (!batch.expiry_date) return "none" as const;
  if (batch.is_expired) return "expired" as const;
  const days = differenceInCalendarDays(new Date(batch.expiry_date), new Date());
  if (days <= EXPIRY_SOON_DAYS) return "soon" as const;
  return "healthy" as const;
}

export function ExpiryBadge({ batch }: { batch: Pick<GoodBatch, "expiry_date" | "is_expired"> }) {
  const { t } = useTranslation();
  const state = expiryState(batch);
  if (state === "none") {
    return <span className="text-xs text-muted-foreground">{t("inventory.batches.non_expiring", "Non-expiring")}</span>;
  }
  const label = format(new Date(batch.expiry_date as string), "PP");
  const cls: Record<"expired" | "soon" | "healthy", string> = {
    expired: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    soon: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    healthy: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  };
  const suffix =
    state === "expired"
      ? ` · ${t("inventory.batches.expired", "Expired")}`
      : state === "soon"
        ? ` · ${t("inventory.batches.expires_soon", "Expires soon")}`
        : "";
  return (
    <Badge variant="outline" className={cn("rounded-full font-medium", cls[state])}>
      <CalendarClock className="mr-1 h-3 w-3" />
      {label}{suffix}
    </Badge>
  );
}

export function BatchStatusBadge({ status }: { status: string | null }) {
  const { t } = useTranslation();
  const s = (status ?? "").toLowerCase();
  const bad = ["quarantine", "quarantined", "expired", "depleted", "rejected"].includes(s);
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full capitalize",
        bad
          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
      )}
    >
      {status ? t(`inventory.batches.status_${s}`, status) : "—"}
    </Badge>
  );
}

export default function BatchesPage() {
  const { t } = useTranslation();
  const { hasAnyPermission, isLoaded } = usePermissions();
  const canView = hasAnyPermission(["view_inventory", "manage_inventory"]);

  const [tableQuery, setTableQuery] = React.useState<TableQueryState>(DEFAULT_QUERY);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [expiryFilter, setExpiryFilter] = React.useState("all");

  const batchesQuery = useQuery({
    queryKey: ["inventory", "batches", tableQuery, statusFilter, expiryFilter],
    enabled: canView,
    queryFn: () =>
      fetchInventoryBatches({
        batch_number: tableQuery.search || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        expired: expiryFilter === "expired" ? true : undefined,
        active: expiryFilter === "active" ? true : undefined,
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
        sortCol: query.sortCol ? String(query.sortCol) : "expiry_date",
        sortDir: query.sortDir === "asc" ? "asc" : query.sortDir === "desc" ? "desc" : "asc",
      });
    },
    [applyTableQuery]
  );

  const columns = React.useMemo<ColumnDef<GoodBatch>[]>(
    () => [
      {
        accessorKey: "batch_number",
        header: t("inventory.batches.col_batch", "Batch / Lot"),
        cell: ({ row }) => (
          <Link href={`/dashboard/inventory/batches/${row.original.id}`} className="flex items-center gap-2 hover:underline">
            <Layers className="h-4 w-4 text-primary" />
            <span className="font-mono font-semibold">{row.original.batch_number}</span>
          </Link>
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
        accessorKey: "status",
        header: t("inventory.common.status", "Status"),
        enableSorting: false,
        cell: ({ row }) => <BatchStatusBadge status={row.original.status} />,
        meta: { align: "center" as const },
      },
      {
        id: "qa_status",
        header: t("inventory.batches.col_qa", "QA"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm capitalize text-muted-foreground">{row.original.qa_status ?? "—"}</span>
        ),
        meta: { align: "center" as const },
      },
      {
        accessorKey: "expiry_date",
        header: t("inventory.common.expiry", "Expiry"),
        cell: ({ row }) => <ExpiryBadge batch={row.original} />,
      },
      {
        id: "quantity_on_hand",
        header: t("inventory.batches.col_physical", "Physical Qty"),
        enableSorting: false,
        cell: ({ row }) => <span className="font-mono">{row.original.quantity_on_hand ?? "0"}</span>,
        meta: { align: "right" as const },
      },
      {
        id: "actions",
        header: t("inventory.common.actions", "Actions"),
        enableSorting: false,
        cell: ({ row }) => (
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link href={`/dashboard/inventory/batches/${row.original.id}`}>
              <Eye className="mr-1 h-3.5 w-3.5" />
              {t("inventory.common.view", "View")}
            </Link>
          </Button>
        ),
      },
    ],
    [t]
  );

  if (isLoaded && !canView) {
    return (
      <Card className="mx-auto mt-10 max-w-lg rounded-3xl border-border/60 p-8 text-center">
        <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h2 className="text-lg font-bold">{t("inventory.common.no_access_title", "No access")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("inventory.batches.no_access", "You do not have permission to view batches.")}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{t("inventory.batches.title", "Batches & Expiry")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("inventory.batches.subtitle", "Canonical lot tracking with expiry and QA status. Sales eligibility is enforced by the backend.")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); applyTableQuery({ page: 1 }); }}>
          <SelectTrigger className="w-[170px] rounded-full">
            <SelectValue placeholder={t("inventory.common.status", "Status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("inventory.batches.all_statuses", "All statuses")}</SelectItem>
            <SelectItem value="active">{t("inventory.batches.status_active", "Active")}</SelectItem>
            <SelectItem value="quarantine">{t("inventory.batches.status_quarantine", "Quarantine")}</SelectItem>
            <SelectItem value="depleted">{t("inventory.batches.status_depleted", "Depleted")}</SelectItem>
            <SelectItem value="rejected">{t("inventory.batches.status_rejected", "Rejected")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={expiryFilter} onValueChange={(v) => { setExpiryFilter(v); applyTableQuery({ page: 1 }); }}>
          <SelectTrigger className="w-[190px] rounded-full">
            <SelectValue placeholder={t("inventory.batches.expiry_filter", "Expiry")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("inventory.batches.expiry_all", "All lots")}</SelectItem>
            <SelectItem value="active">{t("inventory.batches.expiry_eligible", "Sales-eligible")}</SelectItem>
            <SelectItem value="expired">{t("inventory.batches.expiry_expired", "Expired only")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={batchesQuery.data?.data ?? []}
        totalEntries={batchesQuery.data?.meta?.total ?? 0}
        loading={batchesQuery.isLoading || batchesQuery.isFetching}
        pageIndex={tableQuery.page}
        pageSize={tableQuery.pageSize}
        onQueryChange={handleTableQueryChange}
        onRefresh={() => batchesQuery.refetch()}
        onResetFilters={() => { setTableQuery(DEFAULT_QUERY); setStatusFilter("all"); setExpiryFilter("all"); }}
        searchPlaceholder={t("inventory.batches.search_placeholder", "Search batch number...")}
        resourceName="batches"
        canExport={false}
        syncWithUrl={false}
        emptyMessage={t("inventory.batches.empty", "No batches match your filters.")}
      />
    </div>
  );
}
