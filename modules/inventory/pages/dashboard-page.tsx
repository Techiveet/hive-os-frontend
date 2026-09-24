"use client";

import Link from "next/link";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Barcode,
  Boxes,
  CalendarClock,
  ClipboardCheck,
  Coins,
  FileText,
  Flame,
  Gauge,
  Layers3,
  Loader2,
  PackageSearch,
  Radio,
  Scale,
  ShoppingCart,
  Snail,
  Truck,
  Warehouse,
  ArrowRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchInventoryAnalytics,
  fetchInventoryProductSummary,
  fetchInventoryProductCategories,
  fetchValuationSummary,
  fetchInventorySerials,
  fetchStocktakes,
  fetchReconciliationInventoryGl,
  fetchReconciliationCogs,
  fetchReconciliationPpv,
  type ExpiryBucketKey,
} from "@/modules/inventory/api";
import { useTranslation } from "@/store/use-translation";
import { useTenantModuleAccess } from "@/hooks/use-tenant-module-access";
import { usePermissions } from "@/hooks/use-permissions";
import { EChart, type ChartTheme } from "@/modules/shared/charts/echarts";
import { compactNumber, withAlpha } from "@/modules/shared/charts/chart-style";
import { useInventoryRealtime } from "@/modules/inventory/use-inventory-realtime";
import type { ReconciliationResult } from "@/modules/inventory/operations-types";
import { getAccessToken } from "@/lib/runtime-context";
import { initEcho, subscribeToRealtimeStatus, type RealtimeConnectionStatus } from "@/lib/echo";
import { StockAlertCenter, severityLabel } from "@/modules/inventory/pages/components/stock-alert-center";
import {
  categoricalBarChart,
  coverageChart,
  daysOfCoverChart,
  donutChart,
  movementTrendChart,
  pairedBarChart,
  paletteAt,
  reconciliationChart,
  singleBarChart,
  treemapChart,
  valueTrendChart,
  warehouseChart,
  type CoverageRow,
  type ThemedBucket,
  type ThemedSlice,
} from "@/modules/inventory/pages/components/dashboard-chart-builders";

const num = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const fmt = (value: unknown, digits = 0) => num(value).toLocaleString(undefined, { maximumFractionDigits: digits });
const money = (value: unknown) => `ETB ${compactNumber(value)}`;

const WINDOWS = [7, 30, 90] as const;

/** Small connection pip so a viewer can tell live sync is actually working, not just configured. */
function RealtimeIndicator({ status, lastUpdate }: { status: RealtimeConnectionStatus; lastUpdate: Date | null }) {
  const tone =
    status === "connected" ? "text-emerald-600 dark:text-emerald-400" : status === "connecting" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground";
  const dot = status === "connected" ? "bg-emerald-500" : status === "connecting" ? "bg-amber-500 animate-pulse" : "bg-muted-foreground/40";
  const label = status === "connected" ? "Live" : status === "connecting" ? "Connecting…" : "Offline";

  return (
    <div className={cn("flex items-center gap-1.5 text-[11px] font-semibold", tone)} title="Realtime dashboard sync via Reverb">
      <span className={cn("h-1.5 w-1.5 rounded-full", dot, status === "connected" && "shadow-[0_0_0_3px] shadow-emerald-500/20")} />
      <Radio className="h-3 w-3" />
      {label}
      {lastUpdate ? <span className="font-normal text-muted-foreground">· updated {lastUpdate.toLocaleTimeString()}</span> : null}
    </div>
  );
}

function ChartCard({
  icon: Icon,
  iconClassName,
  title,
  description,
  children,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  title: string;
  description: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[340px] flex-col rounded-[2rem] border border-border/40 bg-card/30 p-6 shadow-sm backdrop-blur-md transition hover:border-border/70",
        className
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-black tracking-tight">
            <span className="rounded-xl bg-primary/10 p-1.5">
              <Icon className={cn("h-4 w-4 text-primary", iconClassName)} />
            </span>
            {title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-end justify-between gap-3 pt-2">
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">{children}</h2>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "default" | "good" | "warn" | "bad";
  loading?: boolean;
}) {
  const tones = {
    default: { wash: "from-primary/10 to-transparent", icon: "text-primary" },
    good: { wash: "from-emerald-500/15 to-transparent", icon: "text-emerald-500" },
    warn: { wash: "from-amber-500/15 to-transparent", icon: "text-amber-500" },
    bad: { wash: "from-rose-500/15 to-transparent", icon: "text-rose-500" },
  } as const;

  return (
    <div className="group relative overflow-hidden rounded-[1.5rem] border border-border/40 bg-card/30 p-5 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-border/70 hover:shadow-md">
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70", tones[tone].wash)} />
      <div className="relative flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", tones[tone].icon)} />
      </div>
      <div className="relative mt-3 text-2xl font-black tabular-nums tracking-tight">
        {loading ? <span className="inline-block h-7 w-20 animate-pulse rounded-md bg-muted" /> : value}
      </div>
      {sub ? <div className="relative mt-1 text-[11px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

export default function InventoryDashboardPage() {
  const { t } = useTranslation();
  const { hasModule } = useTenantModuleAccess();
  const { hasPermission, hasAnyPermission } = usePermissions();
  const hasWarehouse = hasModule("warehouse_management");
  const canFinance = hasPermission("view_finance");
  const canProcurement = hasModule("procurement_management") && hasAnyPermission(["view_procurement", "manage_procurement"]);
  const canSales = hasModule("sales_management") && hasAnyPermission(["view_sales", "manage_sales"]);
  const queryClient = useQueryClient();

  const [days, setDays] = React.useState<(typeof WINDOWS)[number]>(30);
  const [mixMetric, setMixMetric] = React.useState<"units" | "value">("units");
  const [hiddenCostingMethods, setHiddenCostingMethods] = React.useState<Set<string>>(new Set());

  const [realtimeStatus, setRealtimeStatus] = React.useState<RealtimeConnectionStatus>("connecting");
  const [lastLiveUpdate, setLastLiveUpdate] = React.useState<Date | null>(null);

  React.useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const echo = initEcho(token);
    if (!echo) {
      setRealtimeStatus("unavailable");
      return;
    }
    return subscribeToRealtimeStatus(echo, setRealtimeStatus);
  }, []);

  // Every Good/GoodBatch/Product/ProductCategory/cost-layer/valuation write on
  // this tenant re-fetches every "inventory"-prefixed query on screen.
  useInventoryRealtime(() => {
    setLastLiveUpdate(new Date());
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
  });

  const analyticsQuery = useQuery({
    queryKey: ["inventory", "analytics", "dashboard", days],
    queryFn: () => fetchInventoryAnalytics(days),
    placeholderData: (previous) => previous,
  });
  const summaryQuery = useQuery({ queryKey: ["inventory", "products", "summary"], queryFn: fetchInventoryProductSummary });
  const categoriesQuery = useQuery({
    queryKey: ["inventory", "categories", "list"],
    queryFn: () => fetchInventoryProductCategories({ per_page: 100 }),
  });
  const serialsQuery = useQuery({ queryKey: ["inventory", "serials", "dashboard"], queryFn: () => fetchInventorySerials({ per_page: 100 }) });
  const stocktakesQuery = useQuery({ queryKey: ["inventory", "stocktakes", "dashboard"], queryFn: () => fetchStocktakes({ per_page: 100 }) });
  const valuationQuery = useQuery({
    queryKey: ["inventory", "valuation", "summary", "dashboard"],
    queryFn: () => fetchValuationSummary({ per_page: 100 }),
    enabled: canFinance,
  });
  const invGlQuery = useQuery({ queryKey: ["inventory", "reconciliation", "inventory-gl", "dashboard"], queryFn: fetchReconciliationInventoryGl, enabled: canFinance });
  const cogsQuery = useQuery({ queryKey: ["inventory", "reconciliation", "cogs", "dashboard"], queryFn: fetchReconciliationCogs, enabled: canFinance });
  const ppvQuery = useQuery({ queryKey: ["inventory", "reconciliation", "ppv", "dashboard"], queryFn: fetchReconciliationPpv, enabled: canFinance });

  const a = analyticsQuery.data;
  const analyticsLoading = analyticsQuery.isLoading;
  const refreshing = analyticsQuery.isFetching && !analyticsQuery.isLoading;

  // ---- Stock flow -------------------------------------------------------------
  const trendHasData = (a?.movement_trend ?? []).some((d) => d.inbound + d.outbound + d.transfers > 0);
  const trendOption = React.useMemo(
    () =>
      movementTrendChart(a?.movement_trend ?? [], {
        inbound: t("inventory.dashboard.inbound", "Received"),
        outbound: t("inventory.dashboard.outbound", "Issued"),
        transfers: t("inventory.dashboard.transfers", "Transferred"),
      }),
    [a?.movement_trend, t]
  );

  const sourceBuckets = React.useMemo<ThemedBucket[]>(() => {
    const byDirection: Record<string, number> = { in: 0, out: 0, transfer: 0 };
    const arrows = { in: "↓", out: "↑", transfer: "⇄" } as const;
    return (a?.movement_by_source ?? []).map((row) => {
      const shade = byDirection[row.direction]++;
      const base = row.direction === "in" ? 0 : row.direction === "out" ? 1 : 2;
      return {
        name: `${arrows[row.direction]} ${row.source}`,
        value: row.quantity,
        color: (theme: ChartTheme) => withAlpha(theme.categorical[base], Math.max(0.45, 1 - shade * 0.2)),
      };
    });
  }, [a?.movement_by_source]);
  const sourceOption = React.useMemo(() => categoricalBarChart(sourceBuckets, true, { left: 160 }), [sourceBuckets]);

  // ---- Value -------------------------------------------------------------------
  const valueOption = React.useMemo(
    () => valueTrendChart(a?.value_trend ?? [], t("inventory.dashboard.stock_value", "Stock value")),
    [a?.value_trend, t]
  );
  const mixSlices = React.useMemo<ThemedSlice[]>(() => {
    const metric = canFinance ? mixMetric : "units";
    return (a?.category_mix ?? [])
      .map((row, index) => ({
        name: row.name,
        value: metric === "value" ? num(row.value) : row.on_hand,
        color: (theme: ChartTheme) => paletteAt(theme, index),
      }))
      .filter((s) => s.value > 0);
  }, [a?.category_mix, mixMetric, canFinance]);
  const mixOption = React.useMemo(
    () => donutChart(mixSlices, mixMetric === "value" && canFinance ? t("inventory.dashboard.etb_value", "ETB value") : t("inventory.dashboard.units", "units")),
    [mixSlices, mixMetric, canFinance, t]
  );

  // ---- Stock health ------------------------------------------------------------
  const healthSlices = React.useMemo<ThemedSlice[]>(() => {
    if (!a) return [];
    const c = a.alerts.counts;
    const healthy = Math.max(a.kpis.active_goods - (c.out_of_stock + c.critical + c.reorder + c.overstock), 0);
    const slices: ThemedSlice[] = [
      { name: severityLabel(t, "out_of_stock"), value: c.out_of_stock, color: (th) => th.severity.critical },
      { name: severityLabel(t, "critical"), value: c.critical, color: (th) => th.severity.warning },
      { name: severityLabel(t, "reorder"), value: c.reorder, color: (th) => th.severity.caution },
      { name: severityLabel(t, "overstock"), value: c.overstock, color: (th) => th.categorical[1] },
      { name: t("inventory.recon.healthy", "Healthy"), value: healthy, color: (th) => th.severity.good },
    ];
    return slices.filter((s) => s.value > 0);
  }, [a, t]);
  const healthOption = React.useMemo(() => donutChart(healthSlices, t("inventory.dashboard.goods_tracked", "goods tracked")), [healthSlices, t]);

  const expiryLabels: Record<ExpiryBucketKey, string> = React.useMemo(
    () => ({
      expired: t("inventory.batches.expired", "Expired"),
      d7: t("inventory.dashboard.expiry_7d", "≤ 7 days"),
      d30: t("inventory.dashboard.expiry_30d", "8-30 days"),
      d90: t("inventory.dashboard.expiry_90d", "31-90 days"),
      later: t("inventory.dashboard.expiry_later", "> 90 days"),
    }),
    [t]
  );
  // Only the at-risk horizons are charted: the healthy "> 90 days" bucket is
  // usually orders of magnitude larger and would flatten every risk bar to zero.
  const expiryBuckets = React.useMemo<ThemedBucket[]>(() => {
    const colorOf: Record<Exclude<ExpiryBucketKey, "later">, (th: ChartTheme) => string> = {
      expired: (th) => th.severity.critical,
      d7: (th) => th.severity.warning,
      d30: (th) => th.severity.caution,
      d90: (th) => th.categorical[1],
    };
    return (a?.expiry_exposure.buckets ?? [])
      .filter((b): b is typeof b & { bucket: Exclude<ExpiryBucketKey, "later"> } => b.bucket !== "later")
      .map((b) => ({ name: expiryLabels[b.bucket], value: b.quantity, color: colorOf[b.bucket] }));
  }, [a?.expiry_exposure.buckets, expiryLabels]);
  const expiryHasData = expiryBuckets.some((b) => b.value > 0);
  const laterBucket = a?.expiry_exposure.buckets.find((b) => b.bucket === "later");
  const expiryOption = React.useMemo(() => categoricalBarChart(expiryBuckets), [expiryBuckets]);

  const coverageRows = React.useMemo<CoverageRow[]>(
    () =>
      (a?.alerts.items ?? [])
        .filter((item): item is typeof item & { severity: CoverageRow["severity"] } => item.severity !== "overstock" && item.reorder_level > 0)
        .slice(0, 8)
        .map((item) => ({ name: item.name, severity: item.severity, available: item.available, reorder: item.reorder_level, uom: item.uom })),
    [a?.alerts.items]
  );
  const coverageOption = React.useMemo(
    () =>
      coverageChart(
        coverageRows,
        { out_of_stock: severityLabel(t, "out_of_stock"), critical: severityLabel(t, "critical"), reorder: severityLabel(t, "reorder") },
        t("inventory.dashboard.reorder_point", "reorder point")
      ),
    [coverageRows, t]
  );

  // ---- Where stock sits ----------------------------------------------------------
  const warehouseOption = React.useMemo(
    () =>
      warehouseChart(a?.stock_by_warehouse ?? [], {
        sellable: t("inventory.dashboard.sellable", "Sellable"),
        held: t("inventory.dashboard.held", "On hold"),
        reserved: t("inventory.dashboard.reserved", "Reserved"),
      }),
    [a?.stock_by_warehouse, t]
  );
  const coverRows = React.useMemo(
    () =>
      (a?.top_movers ?? [])
        .filter((m) => m.outbound > 0)
        .map((m) => ({ name: m.name, days: m.on_hand / (m.outbound / days) }))
        .sort((x, y) => x.days - y.days),
    [a?.top_movers, days]
  );
  const coverOption = React.useMemo(() => daysOfCoverChart(coverRows, t("inventory.dashboard.col_cover", "Days of cover")), [coverRows, t]);

  // ---- Operations ---------------------------------------------------------------
  const serialSlices = React.useMemo<ThemedSlice[]>(() => {
    const rows = serialsQuery.data?.data ?? [];
    const meta: Record<string, { label: string; color: (th: ChartTheme) => string }> = {
      available: { label: t("inventory.serials.status_available", "Available"), color: (th) => th.severity.good },
      issued: { label: t("inventory.serials.status_issued", "Issued"), color: (th) => th.categorical[0] },
      quarantine: { label: t("inventory.serials.status_quarantine", "Quarantine"), color: (th) => th.severity.warning },
      damaged: { label: t("inventory.serials.status_damaged", "Damaged"), color: (th) => th.severity.critical },
      returned: { label: t("inventory.serials.status_returned", "Returned"), color: (th) => th.categorical[2] },
      disposed: { label: t("inventory.serials.status_disposed", "Disposed"), color: (th) => withAlpha(th.categorical[3], 0.6) },
      missing: { label: t("inventory.serials.status_missing", "Missing"), color: (th) => th.severity.critical },
    };
    const counts: Record<string, number> = {};
    rows.forEach((s) => {
      counts[s.status] = (counts[s.status] ?? 0) + 1;
    });
    return Object.entries(counts).map(([key, value]) => ({
      name: meta[key]?.label ?? key,
      value,
      color: meta[key]?.color ?? ((th: ChartTheme) => th.categorical[3]),
    }));
  }, [serialsQuery.data, t]);
  const serialOption = React.useMemo(() => donutChart(serialSlices, t("inventory.dashboard.serials_tracked", "serials")), [serialSlices, t]);

  const stocktakeBuckets = React.useMemo<ThemedBucket[]>(() => {
    const rows = stocktakesQuery.data?.data ?? [];
    const meta: Array<[string, string, (th: ChartTheme) => string]> = [
      ["draft", t("inventory.stocktake.status_draft", "Draft"), (th) => withAlpha(th.categorical[3], 0.7)],
      ["counting", t("inventory.stocktake.status_counting", "Counting"), (th) => th.categorical[1]],
      ["submitted", t("inventory.stocktake.status_submitted", "Submitted"), (th) => th.categorical[2]],
      ["approved", t("inventory.stocktake.status_approved", "Approved"), (th) => th.severity.caution],
      ["finalized", t("inventory.stocktake.status_finalized", "Finalized"), (th) => th.severity.good],
      ["cancelled", t("inventory.stocktake.status_cancelled", "Cancelled"), (th) => th.severity.critical],
    ];
    const counts: Record<string, number> = {};
    rows.forEach((s) => {
      counts[s.status] = (counts[s.status] ?? 0) + 1;
    });
    return meta.map(([key, name, color]) => ({ name, value: counts[key] ?? 0, color })).filter((b) => b.value > 0);
  }, [stocktakesQuery.data, t]);
  const stocktakeOption = React.useMemo(() => categoricalBarChart(stocktakeBuckets, true, {}, { wholeNumbers: true }), [stocktakeBuckets]);

  // ---- Connected modules ----------------------------------------------------------
  const supplierOption = React.useMemo(
    () =>
      pairedBarChart(
        (a?.supplier_exposure ?? []).map((s) => ({ name: s.supplier, a: s.items, b: s.out_of_stock })),
        { a: t("inventory.dashboard.items_to_reorder", "Items to reorder"), b: severityLabel(t, "out_of_stock") },
        (th) => ({ a: th.severity.caution, b: th.severity.critical })
      ),
    [a?.supplier_exposure, t]
  );
  const poStatusOption = React.useMemo(
    () =>
      categoricalBarChart(
        (a?.procurement?.by_status ?? []).map((s, i) => ({
          name: s.status.replace(/_/g, " "),
          value: s.orders,
          color: (th: ChartTheme) => paletteAt(th, i),
        }))
      ),
    [a?.procurement?.by_status]
  );
  const salesStatusOption = React.useMemo(
    () =>
      categoricalBarChart(
        (a?.sales?.by_status ?? []).map((s, i) => ({ name: s.status.replace(/_/g, " "), value: s.orders, color: (th: ChartTheme) => paletteAt(th, i) }))
      ),
    [a?.sales?.by_status]
  );
  const demandOption = React.useMemo(
    () =>
      pairedBarChart(
        (a?.sales?.top_demand ?? []).map((d) => ({ name: d.product, a: d.ordered, b: d.backlog })),
        { a: t("inventory.dashboard.ordered", "Ordered"), b: t("inventory.dashboard.backlog", "Not yet delivered") },
        (th) => ({ a: th.categorical[1], b: th.severity.caution })
      ),
    [a?.sales?.top_demand, t]
  );

  // ---- Catalog -------------------------------------------------------------------
  const totals = summaryQuery.data?.totals;
  const statusSlices = React.useMemo<ThemedSlice[]>(() => {
    if (!totals) return [];
    const slices: ThemedSlice[] = [
      { name: t("inventory.dashboard.published", "Published"), value: totals.published || 0, color: (th) => th.categorical[0] },
      { name: t("inventory.dashboard.draft", "Draft"), value: totals.draft || 0, color: (th) => th.severity.caution },
      { name: t("inventory.dashboard.archived", "Archived"), value: totals.archived || 0, color: (th) => withAlpha(th.categorical[3], 0.7) },
    ];
    return slices.filter((s) => s.value > 0);
  }, [totals, t]);
  const statusOption = React.useMemo(() => donutChart(statusSlices, t("inventory.dashboard.products", "products")), [statusSlices, t]);

  const categoryRows = React.useMemo(
    () =>
      (categoriesQuery.data?.data ?? [])
        .filter((cat) => (cat.products_count ?? 0) > 0)
        .map((cat) => ({ name: cat.name, value: cat.products_count ?? 0 })),
    [categoriesQuery.data]
  );
  const categoryOption = React.useMemo(
    () => singleBarChart(categoryRows, t("inventory.dashboard.products", "products"), (th) => th.categorical[1]),
    [categoryRows, t]
  );

  // ---- Finance ---------------------------------------------------------------------
  const treemapRows = React.useMemo(
    () =>
      (valuationQuery.data?.data ?? [])
        .map((row) => ({ name: row.name, value: num(row.inventory_value), method: row.costing_method }))
        .filter((row) => row.value > 0)
        .sort((x, y) => y.value - x.value)
        .slice(0, 20),
    [valuationQuery.data]
  );
  const visibleTreemapRows = React.useMemo(
    () => treemapRows.filter((d) => !hiddenCostingMethods.has(d.method)),
    [treemapRows, hiddenCostingMethods]
  );
  const treemapOption = React.useMemo(() => treemapChart(visibleTreemapRows), [visibleTreemapRows]);

  const reconciliationRows = React.useMemo(() => {
    const rows: Array<{ key: string; label: string; subledger: number; gl: number; difference: number; reconciled: boolean; withinRounding: boolean }> = [];
    const push = (key: string, label: string, r?: ReconciliationResult) => {
      if (!r) return;
      rows.push({
        key,
        label,
        subledger: num(r.subledger_balance),
        gl: num(r.gl_balance),
        // Rounding drift is explained; a mismatch is judged on what remains.
        difference: num(r.unexplained_difference ?? r.difference),
        reconciled: r.reconciled,
        withinRounding: Boolean(r.within_tolerance),
      });
    };
    push("inventory_gl", t("inventory.dashboard.metric_inventory_asset", "Inventory Asset"), invGlQuery.data);
    push("cogs", t("inventory.dashboard.metric_cogs", "COGS"), cogsQuery.data);
    push("ppv", t("inventory.valuation.ppv", "PPV"), ppvQuery.data);
    return rows;
  }, [invGlQuery.data, cogsQuery.data, ppvQuery.data, t]);
  const reconciliationLoading = canFinance && (invGlQuery.isLoading || cogsQuery.isLoading || ppvQuery.isLoading);
  const reconciliationOption = React.useMemo(
    () => reconciliationChart(reconciliationRows, { subledger: t("inventory.recon.subledger", "Subledger"), gl: t("inventory.recon.gl", "GL") }),
    [reconciliationRows, t]
  );

  if (summaryQuery.isLoading && analyticsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("inventory.dashboard.loading", "Loading inventory dashboard...")}
      </div>
    );
  }

  const k = a?.kpis;
  const catalog = summaryQuery.data?.catalog;
  const windowLabel = t("inventory.dashboard.last_n_days", "last {n} days").replace("{n}", String(days));

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/40 p-7 shadow-sm backdrop-blur-md">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-3xl font-black tracking-tight text-transparent">
                {t("inventory.dashboard.title", "Inventory Control Center")}
              </h1>
              <RealtimeIndicator status={realtimeStatus} lastUpdate={lastLiveUpdate} />
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {t("inventory.dashboard.subtitle", "Track inventory, product catalogs, categories, suppliers, and stock levels in real-time.")}
            </p>
            {catalog ? (
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-muted-foreground">
                <span className="rounded-full border border-border/50 px-2.5 py-0.5">{fmt(summaryQuery.data?.totals.products)} {t("inventory.dashboard.products", "products")}</span>
                <span className="rounded-full border border-border/50 px-2.5 py-0.5">{fmt(catalog.categories)} {t("inventory.common.categories", "categories")}</span>
                <span className="rounded-full border border-border/50 px-2.5 py-0.5">{fmt(catalog.suppliers)} {t("inventory.common.suppliers", "suppliers")}</span>
                <span className="rounded-full border border-border/50 px-2.5 py-0.5">{fmt(catalog.tags)} {t("inventory.common.tags", "tags")}</span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex rounded-full border border-border/60 bg-background/50 p-0.5" role="group" aria-label={t("inventory.dashboard.window", "Time window")}>
              {WINDOWS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setDays(w)}
                  aria-pressed={days === w}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold transition",
                    days === w ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {w}d
                </button>
              ))}
            </div>
            {refreshing ? (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> {t("inventory.dashboard.refreshing", "Refreshing…")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap gap-2">
          <Button asChild size="sm" className="rounded-full shadow-sm">
            <Link href="/dashboard/inventory/catalog/goods">{t("nav.inventory_goods", "Goods (Raw Materials)")}</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-full bg-background/50">
            <Link href="/dashboard/inventory/catalog/products">{t("inventory.products.title", "Manage Products")}</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-full bg-background/50">
            <Link href="/dashboard/inventory/batches">{t("inventory.batches.title", "Batches & Expiry")}</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-full bg-background/50">
            <Link href="/dashboard/inventory/stocktakes">{t("inventory.stocktake.title", "Stocktakes")}</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-full bg-background/50">
            <Link href="/dashboard/inventory/reorder-basis">{t("inventory.reorder.title", "Reorder Basis")}</Link>
          </Button>
          {hasWarehouse ? (
            <Button asChild size="sm" variant="outline" className="rounded-full bg-background/50">
              <Link href="/dashboard/inventory/locations/warehouses">{t("inventory.warehouses.title", "Manage Warehouses")}</Link>
            </Button>
          ) : null}
        </div>
      </section>

      {/* Alerts */}
      <StockAlertCenter alerts={a?.alerts} canFinance={canFinance} loading={analyticsLoading} t={t} />

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {canFinance ? (
          <KpiTile icon={Coins} label={t("inventory.dashboard.stock_value", "Stock value")} value={money(k?.stock_value)} sub={`${fmt(k?.on_hand)} ${t("inventory.dashboard.units_on_hand", "units on hand")}`} loading={analyticsLoading} />
        ) : (
          <KpiTile icon={Boxes} label={t("inventory.dashboard.on_hand", "On hand")} value={fmt(k?.on_hand)} sub={`${fmt(k?.active_goods)} ${t("inventory.dashboard.active_goods", "active goods")}`} loading={analyticsLoading} />
        )}
        <KpiTile
          icon={AlertTriangle}
          label={t("inventory.dashboard.needs_action", "Needs action")}
          value={fmt((k?.alerts.out_of_stock ?? 0) + (k?.alerts.critical ?? 0) + (k?.alerts.reorder ?? 0))}
          sub={`${fmt(k?.alerts.out_of_stock)} ${severityLabel(t, "out_of_stock").toLowerCase()}`}
          tone={(k?.alerts.out_of_stock ?? 0) > 0 ? "bad" : (k?.alerts.critical ?? 0) + (k?.alerts.reorder ?? 0) > 0 ? "warn" : "good"}
          loading={analyticsLoading}
        />
        <KpiTile icon={ArrowDownToLine} label={t("inventory.dashboard.inbound", "Received")} value={compactNumber(k?.inbound)} sub={windowLabel} tone="good" loading={analyticsLoading} />
        <KpiTile icon={ArrowUpFromLine} label={t("inventory.dashboard.outbound", "Issued")} value={compactNumber(k?.outbound)} sub={`${fmt(k?.movements)} ${t("inventory.dashboard.movements", "movements")}`} loading={analyticsLoading} />
        <KpiTile
          icon={CalendarClock}
          label={t("inventory.dashboard.expiring_soon", "Expiring ≤ 30d")}
          value={compactNumber(k?.expiring_30d_qty)}
          sub={`${fmt(k?.expiring_30d_lots)} ${t("inventory.dashboard.lots", "lots")} · ${fmt(k?.expired_qty_on_hand)} ${t("inventory.dashboard.already_expired", "already expired")}`}
          tone={(k?.expired_qty_on_hand ?? 0) > 0 ? "bad" : (k?.expiring_30d_qty ?? 0) > 0 ? "warn" : "good"}
          loading={analyticsLoading}
        />
        <KpiTile
          icon={Snail}
          label={t("inventory.dashboard.dead_stock", "Dead stock")}
          value={canFinance && a?.dead_stock.value != null ? money(a.dead_stock.value) : fmt(a?.dead_stock.quantity)}
          sub={`${fmt(a?.dead_stock.count)} ${t("inventory.dashboard.items_no_movement", "items with no issue in")} ${days}d`}
          tone={(a?.dead_stock.count ?? 0) > 0 ? "warn" : "good"}
          loading={analyticsLoading}
        />
      </section>

      {/* Stock flow */}
      <SectionTitle hint={windowLabel}>{t("inventory.dashboard.section_flow", "Stock flow")}</SectionTitle>
      <section className="grid gap-6 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          icon={Activity}
          title={t("inventory.dashboard.chart_trend_title", "Stock Movement Trend")}
          description={t("inventory.dashboard.chart_trend_desc", "Daily quantities received, issued and transferred. Drag the slider to zoom.")}
        >
          <EChart
            option={trendOption}
            height={300}
            ariaLabel={t("inventory.dashboard.chart_trend_title", "Stock Movement Trend")}
            subtitle={windowLabel}
            empty={!analyticsLoading && !trendHasData}
            emptyLabel={t("inventory.dashboard.no_movements", "No stock movements in this window.")}
            dimmed={refreshing}
          />
        </ChartCard>
        <ChartCard
          icon={Truck}
          title={t("inventory.dashboard.chart_source_title", "Where Stock Came From & Went")}
          description={t("inventory.dashboard.chart_source_desc", "Movement quantity by business source (↓ in, ↑ out, ⇄ transfer).")}
        >
          <EChart
            option={sourceOption}
            height={300}
            ariaLabel={t("inventory.dashboard.chart_source_title", "Where Stock Came From & Went")}
            subtitle={windowLabel}
            empty={!analyticsLoading && sourceBuckets.length === 0}
            emptyLabel={t("inventory.dashboard.no_movements", "No stock movements in this window.")}
            dimmed={refreshing}
          />
        </ChartCard>
      </section>

      {/* Value & mix */}
      <SectionTitle>{canFinance ? t("inventory.dashboard.section_value", "Value & mix") : t("inventory.dashboard.section_mix", "Stock mix")}</SectionTitle>
      <section className="grid gap-6 lg:grid-cols-3">
        {canFinance ? (
          <ChartCard
            className="lg:col-span-2"
            icon={Coins}
            title={t("inventory.dashboard.chart_value_trend_title", "Inventory Value Over Time")}
            description={t("inventory.dashboard.chart_value_trend_desc", "Closing value each day, rebuilt from the valuation subledger.")}
          >
            <EChart
              option={valueOption}
              height={280}
              ariaLabel={t("inventory.dashboard.chart_value_trend_title", "Inventory Value Over Time")}
              subtitle={windowLabel}
              empty={!analyticsLoading && !(a?.value_trend ?? []).some((d) => d.value !== 0)}
              emptyLabel={t("inventory.dashboard.sample_data_valuation", "No valued inventory recorded yet.")}
              dimmed={refreshing}
            />
          </ChartCard>
        ) : null}
        <ChartCard
          className={canFinance ? "" : "lg:col-span-3"}
          icon={Layers3}
          title={t("inventory.dashboard.chart_mix_title", "Stock by Category")}
          description={t("inventory.dashboard.chart_mix_desc", "Click a coloured dot to focus on one category.")}
          action={
            canFinance ? (
              <div className="flex rounded-full border border-border/60 p-0.5 text-[11px] font-bold">
                {(["units", "value"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMixMetric(m)}
                    aria-pressed={mixMetric === m}
                    className={cn("rounded-full px-2 py-0.5", mixMetric === m ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                  >
                    {m === "units" ? t("inventory.dashboard.units", "units") : t("inventory.dashboard.value", "value")}
                  </button>
                ))}
              </div>
            ) : undefined
          }
        >
          <EChart
            option={mixOption}
            height={280}
            ariaLabel={t("inventory.dashboard.chart_mix_title", "Stock by Category")}
            empty={!analyticsLoading && mixSlices.length === 0}
            emptyLabel={t("inventory.dashboard.chart_status_empty", "No catalog activity recorded yet.")}
          />
        </ChartCard>
      </section>

      {/* Stock health */}
      <SectionTitle>{t("inventory.dashboard.section_health", "Stock health")}</SectionTitle>
      <section className="grid gap-6 lg:grid-cols-3">
        <ChartCard
          icon={Gauge}
          title={t("inventory.dashboard.chart_reorder_health_title", "Reorder Health")}
          description={t("inventory.dashboard.chart_health_desc", "Every active good by stock status. Click a dot to show only that group.")}
        >
          <EChart
            option={healthOption}
            height={280}
            ariaLabel={t("inventory.dashboard.chart_reorder_health_title", "Reorder Health")}
            empty={!analyticsLoading && healthSlices.length === 0}
            emptyLabel={t("inventory.dashboard.chart_reorder_empty", "No reorder measurements recorded yet.")}
          />
        </ChartCard>
        <ChartCard
          className="lg:col-span-2"
          icon={AlertTriangle}
          iconClassName="text-amber-500"
          title={t("inventory.dashboard.chart_lowstock_title", "Low Stock Warnings")}
          description={t("inventory.dashboard.chart_coverage_desc", "Stock as a share of each item's own reorder point — comparable across units. Click a dot to isolate a severity.")}
        >
          <EChart
            option={coverageOption}
            height={280}
            ariaLabel={t("inventory.dashboard.chart_lowstock_title", "Low Stock Warnings")}
            subtitle={t("inventory.dashboard.chart_coverage_desc", "Stock as a share of each item's own reorder point — comparable across units. Click a dot to isolate a severity.")}
            empty={!analyticsLoading && coverageRows.length === 0}
            emptyLabel={t("inventory.dashboard.no_low_stock", "No goods are currently below their reorder threshold.")}
          />
        </ChartCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <ChartCard
          className="lg:col-span-2"
          icon={CalendarClock}
          title={t("inventory.dashboard.chart_expiry_title", "Batch Expiry Horizon")}
          description={t("inventory.dashboard.chart_expiry_risk_desc", "At-risk units still on the shelf, by how soon their lot expires.")}
        >
          <EChart
            option={expiryOption}
            height={260}
            ariaLabel={t("inventory.dashboard.chart_expiry_title", "Batch Expiry Horizon")}
            subtitle={t("inventory.dashboard.chart_expiry_risk_desc", "At-risk units still on the shelf, by how soon their lot expires.")}
            empty={!analyticsLoading && !expiryHasData}
            emptyLabel={t("inventory.dashboard.no_expiry_risk", "No lot on the shelf expires within 90 days.")}
          />
          {laterBucket && laterBucket.quantity > 0 ? (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{compactNumber(laterBucket.quantity)}</span>{" "}
              {t("inventory.dashboard.units_safe", "more units in {n} lot(s) are good for over 90 days.").replace("{n}", String(laterBucket.lots))}
            </p>
          ) : null}
        </ChartCard>
        <ChartCard
          className="lg:col-span-3"
          icon={Flame}
          iconClassName="text-rose-500"
          title={t("inventory.dashboard.expiring_lots_title", "Lots to act on")}
          description={t("inventory.dashboard.expiring_lots_desc", "Expired or expiring within 90 days — sell, move or write off first.")}
        >
          {(a?.expiry_exposure.lots ?? []).length === 0 ? (
            <p className="py-16 text-center text-sm italic text-muted-foreground">{t("inventory.dashboard.no_expiring_lots", "No lots expiring within 90 days.")}</p>
          ) : (
            <div className="max-h-[290px] overflow-auto pr-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card/95 backdrop-blur">
                  <tr className="border-b border-border/50 text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                    <th className="py-2 pr-3 font-semibold">{t("inventory.dashboard.col_item", "Item")}</th>
                    <th className="py-2 pr-3 font-semibold">{t("inventory.dashboard.col_where", "Where")}</th>
                    <th className="py-2 pr-3 text-right font-semibold">{t("inventory.dashboard.col_expires", "Expires")}</th>
                    <th className="py-2 pr-3 text-right font-semibold">{t("inventory.dashboard.col_qty", "Qty")}</th>
                    {canFinance ? <th className="py-2 text-right font-semibold">{t("inventory.dashboard.value", "value")}</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {a!.expiry_exposure.lots.map((lot) => (
                    <tr key={`${lot.batch_number}-${lot.location}`} className="border-b border-border/30 last:border-0">
                      <td className="py-2 pr-3">
                        <p className="font-bold">{lot.name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{lot.batch_number}</p>
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {lot.warehouse ?? "—"}
                        <span className="text-muted-foreground"> · {lot.location ?? "—"}</span>
                        {!lot.sellable ? (
                          <Badge variant="outline" className="ml-1.5 rounded-full border-amber-500/40 px-1.5 py-0 text-[10px] text-amber-600 dark:text-amber-400">
                            {t("inventory.dashboard.held", "On hold")}
                          </Badge>
                        ) : null}
                      </td>
                      <td
                        className={cn(
                          "py-2 pr-3 text-right font-mono text-xs font-bold tabular-nums",
                          lot.days_left < 0 ? "text-rose-500" : lot.days_left <= 7 ? "text-orange-500" : lot.days_left <= 30 ? "text-amber-500" : "text-muted-foreground"
                        )}
                      >
                        {lot.days_left < 0
                          ? t("inventory.dashboard.expired_ago", "{n}d ago").replace("{n}", String(Math.abs(lot.days_left)))
                          : t("inventory.dashboard.in_days", "in {n}d").replace("{n}", String(lot.days_left))}
                        <p className="font-normal text-muted-foreground">{lot.expiry_date}</p>
                      </td>
                      <td className="py-2 pr-3 text-right font-mono tabular-nums">
                        {fmt(lot.quantity, 1)} <span className="text-[11px] text-muted-foreground">{lot.uom ?? ""}</span>
                      </td>
                      {canFinance ? <td className="py-2 text-right font-mono text-xs tabular-nums">{money(lot.value)}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </section>

      {/* Where stock sits */}
      <SectionTitle>{t("inventory.dashboard.section_where", "Where stock sits & what moves")}</SectionTitle>
      <section className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          icon={Warehouse}
          title={t("inventory.dashboard.chart_warehouse_title", "Stock by Warehouse")}
          description={t("inventory.dashboard.chart_warehouse_desc", "Sellable vs on-hold units per site, with reserved quantity.")}
        >
          <EChart
            option={warehouseOption}
            height={280}
            ariaLabel={t("inventory.dashboard.chart_warehouse_title", "Stock by Warehouse")}
            empty={!analyticsLoading && (a?.stock_by_warehouse ?? []).length === 0}
            emptyLabel={t("inventory.dashboard.no_warehouse_stock", "No stock is held in any warehouse yet.")}
          />
        </ChartCard>
        <ChartCard
          icon={Flame}
          title={t("inventory.dashboard.chart_cover_title", "Days of Cover — Fastest Movers")}
          description={t("inventory.dashboard.chart_cover_desc", "How long stock lasts at recent usage. Under 7 days needs ordering now.")}
        >
          <EChart
            option={coverOption}
            height={280}
            ariaLabel={t("inventory.dashboard.chart_cover_title", "Days of Cover — Fastest Movers")}
            subtitle={`${t("inventory.dashboard.chart_cover_desc", "How long stock lasts at recent usage. Under 7 days needs ordering now.")} · ${windowLabel}`}
            empty={!analyticsLoading && coverRows.length === 0}
            emptyLabel={t("inventory.dashboard.no_movements", "No stock movements in this window.")}
            dimmed={refreshing}
          />
        </ChartCard>
      </section>

      {(a?.dead_stock.items ?? []).length > 0 ? (
        <section className="rounded-[2rem] border border-border/40 bg-card/30 p-6 backdrop-blur-md">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-black tracking-tight">
                <span className="rounded-xl bg-amber-500/10 p-1.5">
                  <Snail className="h-4 w-4 text-amber-500" />
                </span>
                {t("inventory.dashboard.dead_stock_title", "Dead stock — no issue in {n} days").replace("{n}", String(days))}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("inventory.dashboard.dead_stock_desc", "Capital sitting on the shelf. Stop reordering, promote, or return to the supplier.")}
              </p>
            </div>
            {canFinance && a?.dead_stock.value != null ? (
              <p className="text-right">
                <span className="block text-2xl font-black tabular-nums">{money(a.dead_stock.value)}</span>
                <span className="text-[11px] text-muted-foreground">{t("inventory.dashboard.tied_up", "tied up")}</span>
              </p>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {a!.dead_stock.items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border/40 bg-background/40 p-3.5">
                <p className="truncate text-sm font-bold">{item.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{item.sku}</p>
                <p className="mt-2 font-mono text-sm tabular-nums">
                  {fmt(item.on_hand, 1)} <span className="text-[11px] text-muted-foreground">{item.uom}</span>
                  {canFinance && item.value != null ? <span className="float-right text-xs text-muted-foreground">{money(item.value)}</span> : null}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Operations */}
      <SectionTitle>{t("inventory.dashboard.section_operations", "Operations")}</SectionTitle>
      <section className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          icon={Barcode}
          title={t("inventory.dashboard.chart_serials_title", "Serial Inventory Health")}
          description={t("inventory.dashboard.chart_serials_desc", "Lifecycle status across every tracked serial unit.")}
        >
          <EChart
            option={serialOption}
            height={280}
            ariaLabel={t("inventory.dashboard.chart_serials_title", "Serial Inventory Health")}
            empty={!serialsQuery.isLoading && serialSlices.length === 0}
            emptyLabel={t("inventory.dashboard.chart_serials_empty", "No serials recorded yet.")}
          />
        </ChartCard>
        <ChartCard
          icon={ClipboardCheck}
          title={t("inventory.dashboard.chart_stocktake_title", "Stocktake Pipeline")}
          description={t("inventory.dashboard.chart_stocktake_desc", "Counts by lifecycle stage, from draft to finalized.")}
        >
          <EChart
            option={stocktakeOption}
            height={280}
            ariaLabel={t("inventory.dashboard.chart_stocktake_title", "Stocktake Pipeline")}
            empty={!stocktakesQuery.isLoading && stocktakeBuckets.length === 0}
            emptyLabel={t("inventory.dashboard.chart_stocktake_empty", "No stocktakes recorded yet.")}
          />
        </ChartCard>
      </section>

      {/* Connected modules */}
      <SectionTitle>{t("inventory.dashboard.section_connected", "Suppliers, purchasing & sales")}</SectionTitle>
      <section className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          icon={Truck}
          title={t("inventory.dashboard.chart_suppliers_title", "Suppliers to Call")}
          description={t("inventory.dashboard.chart_suppliers_desc", "Open stock alerts grouped by each item's preferred supplier.")}
        >
          <EChart
            option={supplierOption}
            height={240}
            ariaLabel={t("inventory.dashboard.chart_suppliers_title", "Suppliers to Call")}
            empty={!analyticsLoading && (a?.supplier_exposure ?? []).length === 0}
            emptyLabel={t("inventory.dashboard.no_supplier_actions", "No supplier needs to be contacted right now.")}
          />
          {(a?.supplier_exposure ?? []).length > 0 ? (
            <ul className="mt-3 space-y-1.5 text-xs">
              {a!.supplier_exposure.map((s) => (
                <li key={s.supplier} className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-background/40 px-3 py-1.5">
                  <span className="truncate font-semibold">{s.supplier}</span>
                  <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                    {t("inventory.dashboard.order", "order")} {compactNumber(s.suggested_order_qty)}
                    {canFinance && s.suggested_order_value != null ? ` · ${money(s.suggested_order_value)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </ChartCard>

        {canProcurement ? (
          <ChartCard
            icon={ShoppingCart}
            title={t("inventory.dashboard.chart_procurement_title", "Purchase Orders")}
            description={t("inventory.dashboard.chart_procurement_desc", "Inbound pipeline from Procurement feeding this inventory.")}
          >
            {a?.procurement && a.procurement.by_status.length > 0 ? (
              <>
                <div className="mb-2 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border border-border/30 bg-background/40 p-2">
                    <p className="text-lg font-black tabular-nums">{fmt(a.procurement.open_orders)}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("inventory.dashboard.open_pos", "open")}</p>
                  </div>
                  <div className="rounded-xl border border-border/30 bg-background/40 p-2">
                    <p className={cn("text-lg font-black tabular-nums", a.procurement.overdue_orders > 0 && "text-rose-500")}>{fmt(a.procurement.overdue_orders)}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("inventory.dashboard.overdue", "overdue")}</p>
                  </div>
                  <div className="rounded-xl border border-border/30 bg-background/40 p-2">
                    <p className="text-lg font-black tabular-nums">{fmt(a.procurement.receipts_in_window)}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("inventory.dashboard.receipts", "receipts")}</p>
                  </div>
                </div>
                <EChart option={poStatusOption} height={200} ariaLabel={t("inventory.dashboard.chart_procurement_title", "Purchase Orders")} />
              </>
            ) : (
              <p className="py-16 text-center text-sm italic text-muted-foreground">{t("inventory.dashboard.no_pos", "No purchase orders yet.")}</p>
            )}
          </ChartCard>
        ) : null}

        {canSales ? (
          <ChartCard
            className={canProcurement ? "lg:col-span-2" : ""}
            icon={PackageSearch}
            title={t("inventory.dashboard.chart_sales_title", "Customer Demand")}
            description={t("inventory.dashboard.chart_sales_desc", "Orders from Sales drawing on this inventory, and what is still to deliver.")}
          >
            {a?.sales && a.sales.by_status.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <EChart option={salesStatusOption} height={240} ariaLabel={t("inventory.dashboard.sales_status", "Sales orders by status")} />
                <EChart option={demandOption} height={240} ariaLabel={t("inventory.dashboard.top_demand", "Top demanded products")} />
              </div>
            ) : (
              <p className="py-16 text-center text-sm italic text-muted-foreground">{t("inventory.dashboard.no_sales", "No sales orders yet.")}</p>
            )}
          </ChartCard>
        ) : null}
      </section>

      {/* Catalog */}
      <SectionTitle>{t("inventory.dashboard.section_catalog", "Catalog")}</SectionTitle>
      <section className="grid gap-6 lg:grid-cols-3">
        <ChartCard
          icon={Activity}
          title={t("inventory.dashboard.chart_status_title", "Stock Status Breakdown")}
          description={t("inventory.dashboard.chart_status_desc", "Ratio of published, draft, and archived items.")}
        >
          <EChart
            option={statusOption}
            height={260}
            ariaLabel={t("inventory.dashboard.chart_status_title", "Stock Status Breakdown")}
            empty={!summaryQuery.isLoading && statusSlices.length === 0}
            emptyLabel={t("inventory.dashboard.chart_status_empty", "No catalog activity recorded yet.")}
          />
        </ChartCard>
        <ChartCard
          icon={Layers3}
          title={t("inventory.dashboard.chart_category_title", "Category Product Distribution")}
          description={t("inventory.dashboard.chart_category_desc", "Number of unique products in each inventory category.")}
        >
          <EChart
            option={categoryOption}
            height={260}
            ariaLabel={t("inventory.dashboard.chart_category_title", "Category Product Distribution")}
            empty={!categoriesQuery.isLoading && categoryRows.length === 0}
            emptyLabel={t("inventory.dashboard.chart_status_empty", "No catalog activity recorded yet.")}
          />
        </ChartCard>
        <ChartCard
          icon={FileText}
          title={t("inventory.products.recent_title", "Recent Products")}
          description={t("inventory.dashboard.recent_desc", "Latest additions to your catalog list.")}
        >
          <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
            {(summaryQuery.data?.recent_products ?? []).length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">{t("inventory.products.no_recent", "No products yet.")}</p>
            ) : (
              summaryQuery.data!.recent_products.map((product) => (
                <Link
                  key={product.id}
                  href={`/dashboard/inventory/catalog/products/${product.id}`}
                  className="group flex items-center justify-between rounded-2xl border border-border/30 bg-background/50 p-3 text-sm transition hover:border-border/70 hover:bg-background/90"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold transition-colors group-hover:text-primary">{product.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{product.sku}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-bold uppercase">
                      {product.status}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </ChartCard>
      </section>

      {/* Finance */}
      {canFinance ? (
        <>
          <SectionTitle>{t("inventory.dashboard.section_finance", "Finance")}</SectionTitle>
          <section className="grid gap-6 lg:grid-cols-5">
            <ChartCard
              className="lg:col-span-3"
              icon={Coins}
              title={t("inventory.dashboard.chart_valuation_title", "Inventory Value by Good")}
              description={t("inventory.dashboard.chart_valuation_desc", "Subledger value of the top goods, coloured by costing method.")}
              action={
                <div className="flex gap-1.5 text-[11px]">
                  {(["fifo", "standard"] as const).map((method) => {
                    const hidden = hiddenCostingMethods.has(method);
                    return (
                      <button
                        key={method}
                        type="button"
                        aria-pressed={!hidden}
                        onClick={() =>
                          setHiddenCostingMethods((prev) => {
                            const next = new Set(prev);
                            if (next.has(method)) next.delete(method);
                            else next.add(method);
                            return next;
                          })
                        }
                        className={cn("flex items-center gap-1 rounded-full border border-border/50 px-2 py-0.5 font-bold transition", hidden && "opacity-40")}
                      >
                        <span className={cn("h-2 w-2 rounded-full", method === "standard" ? "bg-sky-600" : "bg-emerald-600")} />
                        {method === "standard" ? "Standard" : "FIFO"}
                      </button>
                    );
                  })}
                </div>
              }
            >
              <EChart
                option={treemapOption}
                height={320}
                ariaLabel={t("inventory.dashboard.chart_valuation_title", "Inventory Value by Good")}
                empty={visibleTreemapRows.length === 0}
                emptyLabel={
                  treemapRows.length === 0
                    ? t("inventory.dashboard.sample_data_valuation", "No valued inventory recorded yet.")
                    : t("inventory.dashboard.chart_valuation_hidden", "Both costing methods are hidden — click a chip to show data.")
                }
              />
            </ChartCard>
            <ChartCard
              className="lg:col-span-2"
              icon={Scale}
              title={t("inventory.dashboard.chart_reconciliation_title", "Financial Reconciliation Health")}
              description={t("inventory.dashboard.chart_reconciliation_desc", "Subledger vs general ledger for the accounts inventory posts to.")}
            >
              <EChart
                option={reconciliationOption}
                height={250}
                ariaLabel={t("inventory.dashboard.chart_reconciliation_title", "Financial Reconciliation Health")}
                dimmed={reconciliationLoading}
                empty={!reconciliationLoading && reconciliationRows.length === 0}
                emptyLabel={t("inventory.common.failed_to_load", "Could not load reconciliation right now.")}
              />
              {reconciliationRows.length > 0 ? (
                <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
                  {reconciliationRows.map((row) => (
                    <Badge
                      key={row.key}
                      variant="outline"
                      className={cn(
                        "rounded-full",
                        row.reconciled
                          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {row.label}:{" "}
                      {row.reconciled
                        ? row.withinRounding
                          ? t("inventory.recon.reconciled_rounding", "Reconciled within rounding")
                          : t("inventory.recon.reconciled", "Reconciled")
                        : t("inventory.recon.mismatch", "Mismatch")}
                      {!row.reconciled ? (
                        <span className="ml-1 font-mono font-normal">
                          ({t("inventory.recon.difference", "Difference")} ETB {row.difference.toLocaleString(undefined, { maximumFractionDigits: 2 })})
                        </span>
                      ) : null}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </ChartCard>
          </section>
        </>
      ) : null}
    </div>
  );
}
