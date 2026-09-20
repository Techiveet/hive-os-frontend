"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { Gauge, Info, ShieldAlert } from "lucide-react";
import { useTranslation } from "@/store/use-translation";

import { DataTable, type DataTableQuery } from "@/components/datatable/data-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { fetchReorderBasis } from "@/modules/inventory/api";
import type { ReorderBasis, ReorderBasisRow } from "@/modules/inventory/operations-types";

const BASES: ReorderBasis[] = ["PHYSICAL_ON_HAND", "NET_AVAILABLE", "SELLABLE_AVAILABLE"];

export default function ReorderBasisPage() {
  const { t } = useTranslation();
  const { hasAnyPermission, isLoaded } = usePermissions();
  const canView = hasAnyPermission(["view_inventory", "manage_inventory"]);

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);
  const [basis, setBasis] = React.useState<ReorderBasis>("PHYSICAL_ON_HAND");
  const [lowOnly, setLowOnly] = React.useState(false);

  const query = useQuery({
    queryKey: ["inventory", "reorder-basis", page, pageSize, basis, lowOnly],
    enabled: canView,
    queryFn: () => fetchReorderBasis({ page, per_page: pageSize, basis, low_only: lowOnly || undefined }),
  });

  const columns = React.useMemo<ColumnDef<ReorderBasisRow>[]>(
    () => [
      {
        id: "good",
        header: t("inventory.common.good", "Good"),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{row.original.sku}</p>
          </div>
        ),
      },
      {
        id: "measured",
        header: t("inventory.reorder.measured", "Measured"),
        enableSorting: false,
        cell: ({ row }) => <span className="font-mono font-semibold">{row.original.measured_quantity}</span>,
        meta: { align: "right" as const },
      },
      {
        id: "reorder_level",
        header: t("inventory.reorder.threshold", "Reorder level"),
        enableSorting: false,
        cell: ({ row }) => <span className="font-mono">{row.original.reorder_level}</span>,
        meta: { align: "right" as const },
      },
      {
        id: "physical",
        header: t("inventory.reorder.physical", "Physical"),
        enableSorting: false,
        cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.original.measurements.physical_on_hand}</span>,
        meta: { align: "right" as const },
      },
      {
        id: "net",
        header: t("inventory.reorder.net_available", "Net avail."),
        enableSorting: false,
        cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.original.measurements.net_available}</span>,
        meta: { align: "right" as const },
      },
      {
        id: "sellable",
        header: t("inventory.reorder.sellable_available", "Sellable avail."),
        enableSorting: false,
        cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.original.measurements.sellable_available}</span>,
        meta: { align: "right" as const },
      },
      {
        id: "triggered",
        header: t("inventory.reorder.state", "State"),
        enableSorting: false,
        cell: ({ row }) => {
          if (row.original.below_safety_stock) {
            return <Badge variant="outline" className="rounded-full bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30">{t("inventory.reorder.below_safety", "Below safety")}</Badge>;
          }
          if (row.original.triggered) {
            return <Badge variant="outline" className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">{t("inventory.reorder.reorder", "Reorder")}</Badge>;
          }
          return <Badge variant="outline" className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">{t("inventory.reorder.ok", "OK")}</Badge>;
        },
        meta: { align: "center" as const },
      },
    ],
    [t]
  );

  if (isLoaded && !canView) {
    return (
      <Card className="mx-auto mt-10 max-w-lg rounded-3xl border-border/60 p-8 text-center">
        <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h2 className="text-lg font-bold">{t("inventory.common.no_access_title", "No access")}</h2>
      </Card>
    );
  }

  const meta = query.data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight">
          <Gauge className="h-7 w-7 text-primary" />
          {t("inventory.reorder.title", "Reorder Basis")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("inventory.reorder.subtitle", "Compare stock against reorder thresholds under each candidate basis.")}
        </p>
      </div>

      <Card className="flex items-start gap-3 rounded-3xl border-border/60 bg-muted/20 p-4">
        <Info className="mt-0.5 h-5 w-5 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">
          <p>
            {t("inventory.reorder.default_note", "The current default reorder decision uses")}{" "}
            <span className="font-semibold">{t("inventory.reorder.basis_PHYSICAL_ON_HAND", "Physical on hand")}</span>.
          </p>
          {meta?.planner_note ? <p className="mt-1">{meta.planner_note}</p> : null}
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("inventory.reorder.evaluate_by", "Evaluate by")}</span>
          <Select value={basis} onValueChange={(v) => { setBasis(v as ReorderBasis); setPage(1); }}>
            <SelectTrigger className="w-[210px] rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BASES.map((b) => (
                <SelectItem key={b} value={b}>{t(`inventory.reorder.basis_${b}`, b.replaceAll("_", " ").toLowerCase())}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ButtonLikeToggle lowOnly={lowOnly} setLowOnly={setLowOnly} />
      </div>

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        totalEntries={meta?.total ?? 0}
        loading={query.isLoading || query.isFetching}
        pageIndex={page}
        pageSize={pageSize}
        onQueryChange={(q: DataTableQuery) => { setPage(Number(q.page || 1)); setPageSize(Number(q.pageSize || 15)); }}
        onRefresh={() => query.refetch()}
        searchPlaceholder={t("inventory.reorder.search", "Search goods...")}
        resourceName="reorder-basis"
        canExport={false}
        syncWithUrl={false}
        emptyMessage={t("inventory.reorder.empty", "No goods to evaluate.")}
      />
    </div>
  );
}

function ButtonLikeToggle({ lowOnly, setLowOnly }: { lowOnly: boolean; setLowOnly: (v: boolean) => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={() => setLowOnly(!lowOnly)}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm transition",
        lowOnly ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50"
      )}
    >
      {t("inventory.reorder.low_only", "Low stock only")}
    </button>
  );
}
