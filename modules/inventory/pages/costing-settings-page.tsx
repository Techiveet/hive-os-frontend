"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Lock, Settings2, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/store/use-translation";

import { DataTable, type DataTableQuery } from "@/components/datatable/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { usePermissions } from "@/hooks/use-permissions";
import { fetchCostingMethod, fetchValuationSummary, updateCostingMethod } from "@/modules/inventory/api";
import type { ValuationSummaryRow } from "@/modules/inventory/operations-types";

function CostingDialog({ good, canManage, onClose }: { good: ValuationSummaryRow | null; canManage: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [method, setMethod] = React.useState<string>("");
  const [standardCost, setStandardCost] = React.useState<string>("");

  const stateQuery = useQuery({
    queryKey: ["inventory", "costing", good?.good_id],
    enabled: !!good,
    queryFn: () => fetchCostingMethod(good!.good_id),
  });

  React.useEffect(() => {
    if (stateQuery.data) {
      setMethod(stateQuery.data.costing_method);
      setStandardCost(stateQuery.data.standard_unit_cost ?? "");
    }
  }, [stateQuery.data]);

  const state = stateQuery.data;

  const saveMutation = useMutation({
    mutationFn: () =>
      updateCostingMethod(good!.good_id, {
        costing_method: method as "fifo" | "standard",
        standard_unit_cost: standardCost === "" ? undefined : Number(standardCost),
      }),
    onSuccess: () => {
      toast.success(t("inventory.costing.saved", "Costing updated."));
      queryClient.invalidateQueries({ queryKey: ["inventory", "valuation-summary"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", "costing", good?.good_id] });
      onClose();
    },
    onError: (error: any) => {
      // Surfaces the backend's 422 (e.g. "Cannot change costing method while inventory cost layers remain").
      toast.error(error?.response?.data?.errors?.costing_method?.[0] ?? error?.response?.data?.message ?? t("inventory.common.failed", "Failed to update costing."));
    },
  });

  return (
    <Dialog open={!!good} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>{t("inventory.costing.dialog_title", "Costing Configuration")}</DialogTitle>
          <DialogDescription>{good ? `${good.name} · ${good.sku}` : ""}</DialogDescription>
        </DialogHeader>
        {stateQuery.isLoading || !state ? (
          <div className="py-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("inventory.costing.method", "Costing method")}</Label>
              <Select value={method} onValueChange={setMethod} disabled={!canManage || !state.can_change_method}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fifo">FIFO</SelectItem>
                  <SelectItem value="standard">{t("inventory.costing.standard", "Standard")}</SelectItem>
                </SelectContent>
              </Select>
              {!state.can_change_method ? (
                <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {t("inventory.costing.locked", "Method is locked: this good has valued inventory (remaining cost layers). Deplete existing layers before switching methods.")}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="std-cost">{t("inventory.costing.standard_cost", "Standard unit cost")}</Label>
              <Input
                id="std-cost"
                type="number"
                inputMode="decimal"
                value={standardCost}
                disabled={!canManage}
                onChange={(e) => setStandardCost(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {t("inventory.costing.std_note", "Changing standard cost affects future receipts only — the persisted subledger and historical valuation never move.")}
              </p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={onClose}>{t("inventory.common.close", "Close")}</Button>
          {canManage ? (
            <Button className="rounded-full" disabled={saveMutation.isPending || !state} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("inventory.common.save", "Save")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CostingSettingsPage() {
  const { t } = useTranslation();
  const { hasPermission, hasAnyPermission, isLoaded } = usePermissions();
  const canView = hasAnyPermission(["view_finance", "view_inventory", "manage_inventory"]);
  const canManage = hasPermission("manage_finance");

  const [q, setQ] = React.useState({ page: 1, pageSize: 15 });
  const [configuring, setConfiguring] = React.useState<ValuationSummaryRow | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["inventory", "valuation-summary", "costing", q],
    enabled: canView,
    queryFn: () => fetchValuationSummary({ page: q.page, per_page: q.pageSize }),
  });

  const columns = React.useMemo<ColumnDef<ValuationSummaryRow>[]>(
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
        id: "method",
        header: t("inventory.costing.method", "Method"),
        enableSorting: false,
        cell: ({ row }) => <Badge variant="outline" className="rounded-full uppercase">{row.original.costing_method}</Badge>,
        meta: { align: "center" as const },
      },
      {
        id: "std",
        header: t("inventory.costing.standard_cost", "Standard cost"),
        enableSorting: false,
        cell: ({ row }) => <span className="font-mono">{row.original.standard_unit_cost ?? "—"}</span>,
        meta: { align: "right" as const },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => setConfiguring(row.original)}>
            <Settings2 className="mr-1 h-3.5 w-3.5" />
            {t("inventory.costing.configure", "Configure")}
          </Button>
        ),
      },
    ],
    [t]
  );

  if (isLoaded && !canView) {
    return (
      <Card className="mx-auto mt-10 max-w-lg rounded-3xl border-border/60 p-8 text-center">
        <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h2 className="text-lg font-bold">{t("inventory.common.no_access_title", "No access")}</h2>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight">
          <SlidersHorizontal className="h-7 w-7 text-primary" />
          {t("inventory.costing.title", "Costing Settings")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("inventory.costing.subtitle", "Per-good costing method (FIFO / Standard) and standard unit cost. Dangerous changes are blocked by the backend.")}
        </p>
      </div>

      <DataTable
        columns={columns}
        data={summaryQuery.data?.data ?? []}
        totalEntries={summaryQuery.data?.total ?? 0}
        loading={summaryQuery.isLoading || summaryQuery.isFetching}
        pageIndex={q.page}
        pageSize={q.pageSize}
        onQueryChange={(query: DataTableQuery) => setQ({ page: Number(query.page || 1), pageSize: Number(query.pageSize || 15) })}
        onRefresh={() => summaryQuery.refetch()}
        searchPlaceholder={t("inventory.costing.search", "Search goods...")}
        resourceName="costing"
        canExport={false}
        syncWithUrl={false}
        emptyMessage={t("inventory.costing.empty", "No goods to configure.")}
      />

      <CostingDialog good={configuring} canManage={canManage} onClose={() => setConfiguring(null)} />
    </div>
  );
}
