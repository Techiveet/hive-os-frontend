"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/store/use-translation";

import { DataTable, type DataTableQuery } from "@/components/datatable/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { changeUnitStatus, fetchUnits } from "@/modules/property/api";
import { UNIT_STATUSES, type PropertyUnit } from "@/modules/property/types";

type TableQueryState = {
  page: number;
  pageSize: number;
  search: string;
  sortCol: string;
  sortDir: "asc" | "desc";
  status: string;
};

const DEFAULT_QUERY: TableQueryState = { page: 1, pageSize: 15, search: "", sortCol: "created_at", sortDir: "desc", status: "" };

const STATUS_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  available: "default",
  occupied: "secondary",
  blocked: "destructive",
  inactive: "destructive",
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
};

export default function UnitsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [tableQuery, setTableQuery] = React.useState<TableQueryState>(DEFAULT_QUERY);
  const [statusTarget, setStatusTarget] = React.useState<PropertyUnit | null>(null);
  const [nextStatus, setNextStatus] = React.useState("");

  const unitsQuery = useQuery({
    queryKey: ["property", "units", tableQuery],
    queryFn: () =>
      fetchUnits({
        search: tableQuery.search || undefined,
        status: tableQuery.status || undefined,
        page: tableQuery.page,
        per_page: tableQuery.pageSize,
        sort_col: tableQuery.sortCol,
        sort_dir: tableQuery.sortDir,
      }),
  });

  const statusMutation = useMutation({
    mutationFn: () => changeUnitStatus(statusTarget!.id, nextStatus),
    onSuccess: () => {
      toast.success(t("property.units.status_updated", "Unit status updated."));
      queryClient.invalidateQueries({ queryKey: ["property", "units"] });
      setStatusTarget(null);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, t("property.units.status_failed", "That transition is not allowed from the unit's current status.")));
    },
  });

  const handleTableQueryChange = React.useCallback((query: DataTableQuery) => {
    setTableQuery((prev) => ({
      ...prev,
      page: Number(query.page || 1),
      pageSize: Number(query.pageSize || 15),
      search: String(query.search ?? ""),
      sortCol: String(query.sortCol || "created_at"),
      sortDir: query.sortDir === "asc" ? "asc" : "desc",
    }));
  }, []);

  const columns = React.useMemo<ColumnDef<PropertyUnit>[]>(
    () => [
      {
        accessorKey: "unit_code",
        header: t("property.units.col_unit", "Unit"),
        cell: ({ row }) => (
          <Link href={`/dashboard/property/units/${row.original.id}`} className="font-semibold hover:underline">
            {row.original.unit_code}
          </Link>
        ),
      },
      {
        id: "property",
        header: t("property.units.col_property", "Property"),
        enableSorting: false,
        cell: ({ row }) => row.original.property?.name ?? "—",
      },
      {
        id: "building",
        header: t("property.units.col_building", "Building / Floor"),
        enableSorting: false,
        cell: ({ row }) => [row.original.building?.name, row.original.floor?.name].filter(Boolean).join(" / ") || "—",
      },
      {
        accessorKey: "unit_type",
        header: t("property.common.type", "Type"),
        enableSorting: false,
        cell: ({ row }) => <Badge variant="outline">{row.original.unit_type.replace(/_/g, " ")}</Badge>,
      },
      {
        accessorKey: "rent_rate",
        header: t("property.units.col_rent", "Rent"),
        enableSorting: true,
        cell: ({ row }) => (row.original.rent_rate ? `${row.original.currency ?? "ETB"} ${row.original.rent_rate}` : "—"),
        meta: { align: "right" as const },
      },
      {
        accessorKey: "status",
        header: t("property.common.status", "Status"),
        enableSorting: false,
        cell: ({ row }) => <Badge variant={STATUS_TONE[row.original.status] ?? "secondary"}>{row.original.status.replace(/_/g, " ")}</Badge>,
        meta: { align: "center" as const },
      },
      {
        id: "actions",
        header: t("property.common.actions", "Actions"),
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => {
              setStatusTarget(row.original);
              setNextStatus("");
            }}
          >
            {t("property.units.change_status", "Change Status")}
          </Button>
        ),
      },
    ],
    [t]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{t("property.units.title", "Units")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("property.units.subtitle", "Every unit across the portfolio, its occupancy state, and current rent rate.")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {["", ...UNIT_STATUSES].map((status) => (
          <Button
            key={status || "all"}
            size="sm"
            variant={tableQuery.status === status ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setTableQuery((prev) => ({ ...prev, status, page: 1 }))}
          >
            {status ? status.replace(/_/g, " ") : t("property.units.filter_all", "All")}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={unitsQuery.data?.data ?? []}
        totalEntries={unitsQuery.data?.total ?? 0}
        loading={unitsQuery.isLoading || unitsQuery.isFetching}
        pageIndex={tableQuery.page}
        pageSize={tableQuery.pageSize}
        onQueryChange={handleTableQueryChange}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ["property", "units"] })}
        searchPlaceholder={t("property.units.search_placeholder", "Search unit code...")}
        resourceName="units"
        syncWithUrl={false}
      />

      <Dialog open={statusTarget !== null} onOpenChange={(next) => !next && setStatusTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">
                {t("property.units.status_modal_title", "Change Unit Status")}
              </DialogTitle>
              <DialogDescription>
                {statusTarget?.unit_code} — {t("property.units.status_modal_desc", "currently")} <strong>{statusTarget?.status.replace(/_/g, " ")}</strong>
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="next-status">{t("property.units.next_status", "New status")}</Label>
              <select
                id="next-status"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={nextStatus}
                onChange={(event) => setNextStatus(event.target.value)}
              >
                <option value="">{t("property.units.select_status", "Select...")}</option>
                {UNIT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="border-t border-border/40 bg-muted/20 px-6 py-4 sm:justify-end">
            <Button variant="outline" className="rounded-full" onClick={() => setStatusTarget(null)}>
              {t("property.common.cancel", "Cancel")}
            </Button>
            <Button className="rounded-full" disabled={!nextStatus || statusMutation.isPending} onClick={() => statusMutation.mutate()}>
              {statusMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("property.units.apply_status", "Apply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
