"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ClipboardList, Eye, HelpCircle, Loader2, Plus, ShieldAlert } from "lucide-react";
import type { Step } from "react-joyride";
import { toast } from "sonner";
import { useTranslation } from "@/store/use-translation";
import { useTour } from "@/components/providers/tour-provider";

import { DataTable, type DataTableQuery } from "@/components/datatable/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { createStocktake, fetchStocktakes, fetchWarehouseLocations } from "@/modules/inventory/api";
import type { InventoryCount, InventoryCountStatus } from "@/modules/inventory/operations-types";

const STATUS_META: Record<InventoryCountStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  counting: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
  submitted: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  approved: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
  finalized: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

export function StocktakeStatusBadge({ status }: { status: InventoryCountStatus }) {
  const { t } = useTranslation();
  return (
    <Badge variant="outline" className={cn("rounded-full capitalize", STATUS_META[status] ?? "")}>
      {t(`inventory.stocktake.status_${status}`, status)}
    </Badge>
  );
}

export default function StocktakesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasAnyPermission, isLoaded } = usePermissions();
  const canView = hasAnyPermission(["view_inventory_counts", "view_inventory", "manage_inventory"]);
  const canCreate = hasAnyPermission(["manage_inventory_counts", "manage_inventory"]);

  const [tableQuery, setTableQuery] = React.useState({ page: 1, pageSize: 15, search: "" });
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [form, setForm] = React.useState<{ count_type: "physical" | "cycle" | "spot" | "blind"; warehouse_location_id: string }>({
    count_type: "physical",
    warehouse_location_id: "all",
  });

  const stocktakesQuery = useQuery({
    queryKey: ["inventory", "stocktakes", tableQuery, statusFilter],
    enabled: canView,
    queryFn: () =>
      fetchStocktakes({
        status: statusFilter === "all" ? undefined : statusFilter,
        page: tableQuery.page,
        per_page: tableQuery.pageSize,
      }),
  });

  const locationsQuery = useQuery({
    queryKey: ["warehouse", "locations", "stocktake-create"],
    enabled: createOpen && canCreate,
    queryFn: () => fetchWarehouseLocations(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createStocktake({
        count_type: form.count_type,
        warehouse_location_id:
          form.warehouse_location_id === "all" ? undefined : Number(form.warehouse_location_id),
      }),
    onSuccess: (count) => {
      toast.success(t("inventory.stocktake.created", "Stocktake created."));
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["inventory", "stocktakes"] });
      router.push(`/dashboard/inventory/stocktakes/${count.id}`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? t("inventory.common.failed", "Failed to create stocktake."));
    },
  });

  const columns = React.useMemo<ColumnDef<InventoryCount>[]>(
    () => [
      {
        accessorKey: "reference",
        header: t("inventory.stocktake.col_reference", "Reference"),
        cell: ({ row }) => (
          <Link href={`/dashboard/inventory/stocktakes/${row.original.id}`} className="flex items-center gap-2 hover:underline">
            <ClipboardList className="h-4 w-4 text-primary" />
            <span className="font-mono font-semibold">{row.original.reference}</span>
          </Link>
        ),
      },
      {
        id: "count_type",
        header: t("inventory.stocktake.col_type", "Type"),
        enableSorting: false,
        cell: ({ row }) => <span className="text-sm capitalize">{row.original.count_type}</span>,
      },
      {
        accessorKey: "status",
        header: t("inventory.common.status", "Status"),
        cell: ({ row }) => <StocktakeStatusBadge status={row.original.status} />,
        meta: { align: "center" as const },
      },
      {
        id: "lines_count",
        header: t("inventory.stocktake.col_lines", "Lines"),
        enableSorting: false,
        cell: ({ row }) => row.original.lines_count ?? "—",
        meta: { align: "right" as const },
      },
      {
        id: "snapshot_at",
        header: t("inventory.stocktake.col_snapshot", "Snapshot"),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.snapshot_at ? (
            <span className="text-sm text-muted-foreground">{format(new Date(row.original.snapshot_at), "PP")}</span>
          ) : "—",
      },
      {
        id: "actions",
        header: t("inventory.common.actions", "Actions"),
        enableSorting: false,
        cell: ({ row }) => (
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link href={`/dashboard/inventory/stocktakes/${row.original.id}`}>
              <Eye className="mr-1 h-3.5 w-3.5" />
              {t("inventory.common.open", "Open")}
            </Link>
          </Button>
        ),
      },
    ],
    [t]
  );

  const { startTour } = useTour();
  const tourSteps: Step[] = [
    ...(canCreate ? [{ target: "#inv-tour-stocktake-new", title: t("inventory.tour.stocktake.create_title", "1 · Create a count"), content: t("inventory.tour.stocktake.create", "Start a count, pick a warehouse/location and type, then generate the snapshot — expected quantities are captured by the backend, never typed."), placement: "left" as const, skipBeacon: true }] : []),
    { target: "#inv-tour-stocktake-filter", title: t("inventory.tour.stocktake.status_title", "2 · Track lifecycle"), content: t("inventory.tour.stocktake.status", "Counts move draft → counting → submitted → approved → finalized. Filter by status to find work in progress."), placement: "bottom" as const, skipBeacon: true },
    { target: "#inv-tour-stocktake-table", title: t("inventory.tour.stocktake.work_title", "3 · Count & finalize"), content: t("inventory.tour.stocktake.work", "Open a count to enter physical quantities, scan serials, and review missing/unexpected. Finalizing posts variances to stock — a manager-only action."), placement: "top" as const, skipBeacon: true },
  ];

  if (isLoaded && !canView) {
    return (
      <Card className="mx-auto mt-10 max-w-lg rounded-3xl border-border/60 p-8 text-center">
        <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h2 className="text-lg font-bold">{t("inventory.common.no_access_title", "No access")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("inventory.stocktake.no_access", "You do not have permission to view stocktakes.")}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">{t("inventory.stocktake.title", "Stocktakes")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("inventory.stocktake.subtitle", "Physical and cycle counts. Snapshots and variances are computed by the backend.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => startTour(tourSteps)}>
            <HelpCircle className="mr-2 h-4 w-4" />
            {t("inventory.tour.take_tour", "Take a tour")}
          </Button>
          {canCreate ? (
            <Button id="inv-tour-stocktake-new" className="rounded-full px-5" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("inventory.stocktake.new_btn", "New Count")}
            </Button>
          ) : null}
        </div>
      </div>

      <div id="inv-tour-stocktake-filter" className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setTableQuery((p) => ({ ...p, page: 1 })); }}>
          <SelectTrigger className="w-[180px] rounded-full">
            <SelectValue placeholder={t("inventory.common.status", "Status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("inventory.stocktake.all_statuses", "All statuses")}</SelectItem>
            {(Object.keys(STATUS_META) as InventoryCountStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{t(`inventory.stocktake.status_${s}`, s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div id="inv-tour-stocktake-table">
        <DataTable
          columns={columns}
          data={stocktakesQuery.data?.data ?? []}
          totalEntries={stocktakesQuery.data?.meta?.total ?? 0}
          loading={stocktakesQuery.isLoading || stocktakesQuery.isFetching}
          pageIndex={tableQuery.page}
          pageSize={tableQuery.pageSize}
          onQueryChange={(q: DataTableQuery) =>
            setTableQuery({ page: Number(q.page || 1), pageSize: Number(q.pageSize || 15), search: String(q.search ?? "") })
          }
          onRefresh={() => stocktakesQuery.refetch()}
          onResetFilters={() => { setTableQuery({ page: 1, pageSize: 15, search: "" }); setStatusFilter("all"); }}
          searchPlaceholder={t("inventory.stocktake.search_placeholder", "Search reference...")}
          resourceName="stocktakes"
          canExport={false}
          syncWithUrl={false}
          emptyMessage={t("inventory.stocktake.empty", "No stocktakes yet. Create one to begin counting.")}
        />
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>{t("inventory.stocktake.create_title", "New Stocktake")}</DialogTitle>
            <DialogDescription>
              {t("inventory.stocktake.create_desc", "Create a count, then generate the snapshot. Expected quantities are captured by the backend.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="count-type">{t("inventory.stocktake.count_type", "Count type")}</Label>
              <Select value={form.count_type} onValueChange={(v) => setForm((p) => ({ ...p, count_type: v as typeof form.count_type }))}>
                <SelectTrigger id="count-type" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">{t("inventory.stocktake.type_physical", "Physical (full)")}</SelectItem>
                  <SelectItem value="cycle">{t("inventory.stocktake.type_cycle", "Cycle count")}</SelectItem>
                  <SelectItem value="spot">{t("inventory.stocktake.type_spot", "Spot check")}</SelectItem>
                  <SelectItem value="blind">{t("inventory.stocktake.type_blind", "Blind count")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="count-location">{t("inventory.stocktake.location_scope", "Location (optional)")}</Label>
              <Select value={form.warehouse_location_id} onValueChange={(v) => setForm((p) => ({ ...p, warehouse_location_id: v }))}>
                <SelectTrigger id="count-location" className="rounded-xl">
                  <SelectValue placeholder={locationsQuery.isLoading ? t("inventory.common.loading", "Loading…") : t("inventory.stocktake.all_locations", "All locations")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("inventory.stocktake.all_locations", "All locations")}</SelectItem>
                  {(locationsQuery.data ?? []).map((loc) => (
                    <SelectItem key={loc.id} value={String(loc.id)}>
                      {loc.code}{loc.name ? ` — ${loc.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setCreateOpen(false)}>
              {t("inventory.common.cancel", "Cancel")}
            </Button>
            <Button className="rounded-full" disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("inventory.stocktake.create_btn", "Create & Continue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
