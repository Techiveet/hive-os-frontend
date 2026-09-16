"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Coins, Layers3, Lock, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "@/store/use-translation";

import { DataTable, type DataTableQuery } from "@/components/datatable/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import {
  fetchCostLayers, fetchValuationEntries, fetchValuationSummary,
} from "@/modules/inventory/api";
import type {
  CostLayer, ValuationEntry, ValuationSummaryRow,
} from "@/modules/inventory/operations-types";

function money(value: string | null | undefined, currency?: string | null) {
  if (value == null) return "—";
  return `${currency ? currency + " " : ""}${value}`;
}

function CostLayersDialog({ good, onClose }: { good: ValuationSummaryRow | null; onClose: () => void }) {
  const { t } = useTranslation();
  const layersQuery = useQuery({
    queryKey: ["inventory", "cost-layers", good?.good_id],
    enabled: !!good,
    queryFn: () => fetchCostLayers({ good_id: good!.good_id, remaining_only: false, per_page: 100 }),
  });

  return (
    <Dialog open={!!good} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-3xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers3 className="h-5 w-5 text-primary" />
            {t("inventory.valuation.layers_title", "FIFO Cost Layers")}
          </DialogTitle>
          <DialogDescription>
            {good ? `${good.name} · ${good.sku}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          {layersQuery.isLoading ? (
            <Skeleton className="h-40 w-full rounded-2xl" />
          ) : (layersQuery.data?.data?.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("inventory.valuation.no_layers", "No cost layers for this good.")}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="py-2 pr-3">{t("inventory.valuation.layer_received", "Received")}</th>
                  <th className="py-2 pr-3">{t("inventory.valuation.layer_unit_cost", "Unit Cost")}</th>
                  <th className="py-2 pr-3 text-right">{t("inventory.valuation.layer_qty", "Qty")}</th>
                  <th className="py-2 pr-3 text-right">{t("inventory.valuation.layer_remaining", "Remaining")}</th>
                  <th className="py-2 text-right">{t("inventory.valuation.layer_value", "Remaining Value")}</th>
                </tr>
              </thead>
              <tbody>
                {(layersQuery.data?.data ?? []).map((layer: CostLayer) => (
                  <tr key={layer.id} className="border-b border-border/40">
                    <td className="py-2 pr-3 text-muted-foreground">
                      {layer.received_at ? format(new Date(layer.received_at), "PP") : "—"}
                    </td>
                    <td className="py-2 pr-3 font-mono">{layer.unit_cost ?? "—"}</td>
                    <td className="py-2 pr-3 text-right font-mono">{layer.quantity_received ?? "—"}</td>
                    <td className="py-2 pr-3 text-right font-mono">{layer.quantity_remaining ?? "—"}</td>
                    <td className="py-2 text-right font-mono font-semibold">{layer.remaining_value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ValuationPage() {
  const { t } = useTranslation();
  const { hasPermission, isLoaded } = usePermissions();
  const canView = hasPermission("view_finance");

  const [summaryQ, setSummaryQ] = React.useState({ page: 1, pageSize: 15, search: "" });
  const [entriesQ, setEntriesQ] = React.useState({ page: 1, pageSize: 15 });
  const [layersFor, setLayersFor] = React.useState<ValuationSummaryRow | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["inventory", "valuation-summary", summaryQ],
    enabled: canView,
    queryFn: () => fetchValuationSummary({ page: summaryQ.page, per_page: summaryQ.pageSize }),
  });

  const entriesQuery = useQuery({
    queryKey: ["inventory", "valuation-entries", entriesQ],
    enabled: canView,
    queryFn: () => fetchValuationEntries({ page: entriesQ.page, per_page: entriesQ.pageSize }),
  });

  const summaryColumns = React.useMemo<ColumnDef<ValuationSummaryRow>[]>(
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
        id: "costing_method",
        header: t("inventory.valuation.method", "Method"),
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="outline" className="rounded-full uppercase">
            {row.original.costing_method}
          </Badge>
        ),
        meta: { align: "center" as const },
      },
      {
        id: "physical_quantity",
        header: t("inventory.valuation.physical_qty", "Physical Qty"),
        enableSorting: false,
        cell: ({ row }) => <span className="font-mono">{row.original.physical_quantity}</span>,
        meta: { align: "right" as const },
      },
      {
        id: "valuation_quantity",
        header: t("inventory.valuation.valued_qty", "Valued Qty"),
        enableSorting: false,
        cell: ({ row }) => <span className="font-mono">{row.original.valuation_quantity}</span>,
        meta: { align: "right" as const },
      },
      {
        id: "inventory_value",
        header: t("inventory.valuation.value", "Inventory Value"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono font-semibold">{money(row.original.inventory_value, row.original.currency)}</span>
        ),
        meta: { align: "right" as const },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => setLayersFor(row.original)}>
            <Layers3 className="mr-1 h-3.5 w-3.5" />
            {t("inventory.valuation.layers_btn", "Layers")}
          </Button>
        ),
      },
    ],
    [t]
  );

  const entriesColumns = React.useMemo<ColumnDef<ValuationEntry>[]>(
    () => [
      {
        id: "direction",
        header: t("inventory.valuation.direction", "Dir"),
        enableSorting: false,
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(
              "rounded-full",
              row.original.direction === "in"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30"
            )}
          >
            {row.original.direction === "in"
              ? <TrendingUp className="mr-1 h-3 w-3" />
              : <TrendingDown className="mr-1 h-3 w-3" />}
            {row.original.direction.toUpperCase()}
          </Badge>
        ),
        meta: { align: "center" as const },
      },
      {
        id: "purpose",
        header: t("inventory.valuation.purpose", "Purpose"),
        enableSorting: false,
        cell: ({ row }) => <span className="text-sm capitalize">{row.original.purpose ?? "—"}</span>,
      },
      {
        id: "quantity",
        header: t("inventory.common.quantity", "Qty"),
        enableSorting: false,
        cell: ({ row }) => <span className="font-mono">{row.original.quantity ?? "—"}</span>,
        meta: { align: "right" as const },
      },
      {
        id: "value_amount",
        header: t("inventory.valuation.value_amount", "Value"),
        enableSorting: false,
        cell: ({ row }) => <span className="font-mono">{row.original.value_amount ?? "—"}</span>,
        meta: { align: "right" as const },
      },
      {
        id: "ppv",
        header: t("inventory.valuation.ppv", "PPV"),
        enableSorting: false,
        cell: ({ row }) => {
          const ppv = Number(row.original.purchase_price_variance ?? "0");
          if (!ppv) return <span className="text-muted-foreground">0</span>;
          const unfavorable = ppv > 0;
          return (
            <span className={cn("font-mono font-medium", unfavorable ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
              {row.original.purchase_price_variance}
            </span>
          );
        },
        meta: { align: "right" as const },
      },
      {
        id: "gl_status",
        header: t("inventory.valuation.gl", "GL"),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.gl_journal_id ? (
            <Badge variant="outline" className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              #{row.original.gl_journal_id}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">{row.original.gl_status ?? "—"}</span>
          ),
        meta: { align: "center" as const },
      },
    ],
    [t]
  );

  if (isLoaded && !canView) {
    return (
      <Card className="mx-auto mt-10 max-w-lg rounded-3xl border-border/60 p-8 text-center">
        <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h2 className="text-lg font-bold">{t("inventory.valuation.no_access_title", "Finance access required")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("inventory.valuation.no_access", "Inventory valuation is restricted to users with finance access.")}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight">
          <Coins className="h-7 w-7 text-primary" />
          {t("inventory.valuation.title", "Inventory Valuation")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("inventory.valuation.subtitle", "FIFO and standard-cost valuation from the persisted subledger. Values are never recomputed on the client.")}
        </p>
      </div>

      <Tabs defaultValue="summary">
        <TabsList className="rounded-full">
          <TabsTrigger value="summary" className="rounded-full">{t("inventory.valuation.tab_summary", "Summary")}</TabsTrigger>
          <TabsTrigger value="entries" className="rounded-full">{t("inventory.valuation.tab_entries", "Movements")}</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <DataTable
            columns={summaryColumns}
            data={summaryQuery.data?.data ?? []}
            totalEntries={summaryQuery.data?.total ?? 0}
            loading={summaryQuery.isLoading || summaryQuery.isFetching}
            pageIndex={summaryQ.page}
            pageSize={summaryQ.pageSize}
            onQueryChange={(q: DataTableQuery) =>
              setSummaryQ({ page: Number(q.page || 1), pageSize: Number(q.pageSize || 15), search: String(q.search ?? "") })
            }
            onRefresh={() => summaryQuery.refetch()}
            searchPlaceholder={t("inventory.valuation.search_summary", "Search goods...")}
            resourceName="valuation"
            canExport={false}
            syncWithUrl={false}
            emptyMessage={t("inventory.valuation.empty_summary", "No valued goods yet.")}
          />
        </TabsContent>

        <TabsContent value="entries" className="mt-4">
          <DataTable
            columns={entriesColumns}
            data={entriesQuery.data?.data ?? []}
            totalEntries={entriesQuery.data?.meta?.total ?? 0}
            loading={entriesQuery.isLoading || entriesQuery.isFetching}
            pageIndex={entriesQ.page}
            pageSize={entriesQ.pageSize}
            onQueryChange={(q: DataTableQuery) =>
              setEntriesQ({ page: Number(q.page || 1), pageSize: Number(q.pageSize || 15) })
            }
            onRefresh={() => entriesQuery.refetch()}
            searchPlaceholder={t("inventory.valuation.search_entries", "Search movements...")}
            resourceName="valuation-entries"
            canExport={false}
            syncWithUrl={false}
            emptyMessage={t("inventory.valuation.empty_entries", "No valuation movements yet.")}
          />
        </TabsContent>
      </Tabs>

      <CostLayersDialog good={layersFor} onClose={() => setLayersFor(null)} />
    </div>
  );
}
