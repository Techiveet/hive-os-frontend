"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Boxes,
  CalendarClock,
  Coins,
  Layers3,
  Loader2,
  PackageMinus,
  TrendingUp,
  Truck,
  Warehouse as WarehouseIcon,
  HelpCircle,
  Home,
} from "lucide-react";
import { useTranslation } from "@/store/use-translation";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { useTour } from "@/components/providers/tour-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { warehouseApi } from "@/modules/warehouse/api";
import type { Warehouse, WarehouseOverview } from "@/modules/warehouse/types";
import { EChart, type ChartTheme } from "@/modules/shared/charts/echarts";
import {
  areaGradient,
  compactNumber,
  dotLegend,
  gradient,
  withAlpha,
} from "@/modules/shared/charts/chart-style";
import {
  categoricalBarChart,
  donutChart,
  paletteAt,
  type ThemedBucket,
  type ThemedSlice,
} from "@/modules/inventory/pages/components/dashboard-chart-builders";

const isoDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

const PRESETS = [7, 30, 90] as const;

function ChartCard({
  icon: Icon,
  iconClassName,
  title,
  description,
  children,
  action,
  className,
  id,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  title: string;
  description: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "flex min-h-[350px] flex-col rounded-[2rem] border border-border/40 bg-card/30 p-6 shadow-sm backdrop-blur-md transition hover:border-border/70",
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
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <span className="rounded-xl bg-background/50 p-2 shadow-inner transition group-hover:scale-110">
            <Icon className={cn("h-4 w-4", tones[tone].icon)} />
          </span>
        </div>
        {loading ? (
          <div className="mt-3 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Loading…</span>
          </div>
        ) : (
          <>
            <p className="mt-2 text-2xl font-black tracking-tight text-foreground">{value}</p>
            {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}

export default function WarehouseOverviewPage() {
  const { t } = useTranslation();
  const { startTour } = useTour();
  const [from, setFrom] = React.useState(isoDaysAgo(29));
  const [to, setTo] = React.useState(isoDaysAgo(0));
  const [preset, setPreset] = React.useState<number | null>(30);
  const [warehouseId, setWarehouseId] = React.useState("all");

  const warehousesQuery = useQuery({
    queryKey: ["warehouse", "warehouses", "select"],
    queryFn: () => warehouseApi.listWarehouses({ limit: 100 }).then((res) => res.data),
  });

  const overviewQuery = useQuery({
    queryKey: ["warehouse", "overview", from, to, warehouseId],
    queryFn: () =>
      warehouseApi
        .overview({ from, to, warehouse_id: warehouseId === "all" ? undefined : warehouseId })
        .then((res) => res.data),
    placeholderData: (previous) => previous,
  });

  const warehouses: Warehouse[] = warehousesQuery.data?.data ?? [];
  const raw: WarehouseOverview | undefined = overviewQuery.data?.data;
  const refetching = overviewQuery.isFetching && !overviewQuery.isLoading;

  const overview = React.useMemo(() => {
    if (!raw) return undefined;

    const n = (value: unknown) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    return {
      stock: {
        on_hand: n(raw.stock?.on_hand),
        reserved: n(raw.stock?.reserved),
        available: n(raw.stock?.available),
        in_transit: n(raw.stock?.in_transit),
        stock_value: n(raw.stock?.stock_value),
        uncosted_lines: n(raw.stock?.uncosted_lines),
        distinct_products: n(raw.stock?.distinct_products),
        stock_lines: n(raw.stock?.stock_lines),
        negative_lines: n(raw.stock?.negative_lines),
      },
      movements: {
        total: n(raw.movements?.total),
        received_quantity: n(raw.movements?.received_quantity),
        issued_quantity: n(raw.movements?.issued_quantity),
        net_quantity: n(raw.movements?.net_quantity),
      },
      daily_movements: (raw.daily_movements ?? []).map((row) => ({
        date: row.date,
        received: n(row.received),
        issued: n(row.issued),
        transfers: n(row.transfers),
        movements: n(row.movements),
      })),
      movement_mix: (raw.movement_mix ?? []).map((row) => ({ ...row, count: n(row.count), quantity: n(row.quantity) })),
      capacity: (raw.capacity ?? []).map((row) => ({
        ...row,
        locations: n(row.locations),
        occupied_locations: n(row.occupied_locations),
        utilisation_percent: n(row.utilisation_percent),
        on_hand: n(row.on_hand),
      })),
      expiry_bands: (raw.expiry_bands ?? []).map((row) => ({ ...row, count: n(row.count), quantity: n(row.quantity) })),
      top_products: (raw.top_products ?? []).map((row) => ({
        ...row,
        on_hand: n(row.on_hand),
        lines: n(row.lines),
        value: n(row.value),
      })),
      dead_stock: {
        lines: n(raw.dead_stock?.lines),
        quantity: n(raw.dead_stock?.quantity),
        value: n(raw.dead_stock?.value),
        products: n(raw.dead_stock?.products),
      },
    };
  }, [raw]);

  const applyPreset = (days: number) => {
    setPreset(days);
    setFrom(isoDaysAgo(days - 1));
    setTo(isoDaysAgo(0));
  };

  // 1. Movement Trend Line Chart Option
  const trendOption = React.useMemo(() => {
    const list = overview?.daily_movements ?? [];
    return (theme: ChartTheme) => {
      const line = (name: string, key: "received" | "issued" | "transfers", color: string, area: boolean) => ({
        name,
        type: "line" as const,
        smooth: true,
        showSymbol: false,
        symbolSize: 6,
        data: list.map((d) => d[key]),
        lineStyle: { width: area ? 2.5 : 2, color, type: area ? ("solid" as const) : ("dashed" as const) },
        itemStyle: { color },
        areaStyle: area ? { color: areaGradient(color) } : undefined,
        emphasis: { focus: "series" as const },
      });

      return {
        grid: { left: 48, right: 16, top: 24, bottom: 64 },
        tooltip: { trigger: "axis" as const, valueFormatter: (v: unknown) => compactNumber(v) },
        legend: dotLegend(),
        dataZoom: [
          { type: "inside" as const, start: 0, end: 100 },
          {
            type: "slider" as const,
            height: 14,
            bottom: 20,
            borderColor: "transparent",
            fillerColor: withAlpha(theme.categorical[1], 0.18),
            handleStyle: { color: theme.categorical[1] },
            textStyle: { color: theme.mutedForeground, fontSize: 9 },
            showDetail: false,
          },
        ],
        xAxis: { type: "category" as const, boundaryGap: false, data: list.map((d) => d.date.slice(5)) },
        yAxis: { type: "value" as const, axisLabel: { formatter: (v: number) => compactNumber(v) } },
        series: [
          line(t("warehouse.overview.received", "Inbound (Received)"), "received", theme.categorical[0], true),
          line(t("warehouse.overview.issued", "Outbound (Issued)"), "issued", theme.categorical[1], true),
          line(t("warehouse.overview.transfers", "Internal Transfers"), "transfers", theme.categorical[2], false),
        ],
      };
    };
  }, [overview?.daily_movements, t]);

  // 2. Storage Capacity & Site Utilisation Horizontal Stacked Bar
  const capacityOption = React.useMemo(() => {
    const rows = overview?.capacity ?? [];
    return (theme: ChartTheme) => {
      return {
        grid: { left: 160, right: 48, top: 24, bottom: 28 },
        tooltip: {
          trigger: "axis" as const,
          axisPointer: { type: "shadow" as const },
          formatter: (params: unknown) => {
            const arr = params as Array<{ dataIndex: number; seriesName: string; value: unknown }>;
            const idx = arr[0]?.dataIndex ?? 0;
            const row = rows[idx];
            if (!row) return "";
            return `<b>${row.name}</b><br/>` +
              `Locations: ${row.occupied_locations} occupied / ${row.locations} total (${row.utilisation_percent}%)<br/>` +
              `Stock On Hand: ${compactNumber(row.on_hand)} units`;
          },
        },
        legend: dotLegend(),
        xAxis: { type: "value" as const, axisLabel: { formatter: (v: number) => compactNumber(v) } },
        yAxis: {
          type: "category" as const,
          inverse: true,
          data: rows.map((r) => r.name),
          axisLabel: { width: 145, overflow: "truncate" as const, fontSize: 11 },
        },
        series: [
          {
            name: t("warehouse.overview.occupied_locs", "Occupied Locations"),
            type: "bar" as const,
            stack: "locations",
            barMaxWidth: 18,
            data: rows.map((r) => r.occupied_locations),
            itemStyle: { color: gradient(theme.categorical[0], true) },
          },
          {
            name: t("warehouse.overview.available_locs", "Available Locations"),
            type: "bar" as const,
            stack: "locations",
            barMaxWidth: 18,
            data: rows.map((r) => Math.max(0, r.locations - r.occupied_locations)),
            itemStyle: { color: withAlpha(theme.mutedForeground, 0.22), borderRadius: [0, 4, 4, 0] },
          },
        ],
      };
    };
  }, [overview?.capacity, t]);

  // 3. Movement Mix Donut Chart
  const movementMixOption = React.useMemo(() => {
    const list = overview?.movement_mix ?? [];
    const colorMap: Record<string, (th: ChartTheme) => string> = {
      receipt: (th) => th.categorical[0],
      receive: (th) => th.categorical[0],
      transfer: (th) => th.categorical[2],
      adjustment: (th) => th.severity.caution,
      adjust: (th) => th.severity.caution,
      issue: (th) => th.severity.critical,
    };

    const slices: ThemedSlice[] = list.map((item, idx) => ({
      name: item.type.replace(/_/g, " ").toUpperCase(),
      value: item.quantity,
      color: colorMap[item.type.toLowerCase()] ?? ((th) => paletteAt(th, idx)),
    }));

    return donutChart(slices, t("warehouse.overview.units", "units"));
  }, [overview?.movement_mix, t]);

  // 4. Shelf-Life Expiry Horizons Categorical Bar
  const expiryOption = React.useMemo(() => {
    const bands = overview?.expiry_bands ?? [];
    const colorMap: Record<string, (th: ChartTheme) => string> = {
      expired: (th) => th.severity.critical,
      within_7: (th) => th.severity.critical,
      within_30: (th) => th.severity.warning,
      within_90: (th) => th.severity.caution,
      beyond_90: (th) => th.severity.good,
    };

    const buckets: ThemedBucket[] = bands.map((b) => ({
      name: b.label,
      value: b.quantity,
      color: colorMap[b.key] ?? ((th) => th.categorical[0]),
    }));

    return categoricalBarChart(buckets, true, { left: 110, right: 36, top: 16, bottom: 28 });
  }, [overview?.expiry_bands]);

  // 5. Holdings Valuation Ranked Bar Chart
  const valuationOption = React.useMemo(() => {
    const prods = overview?.top_products ?? [];
    return (theme: ChartTheme) => {
      return {
        grid: { left: 160, right: 90, top: 16, bottom: 24 },
        tooltip: {
          trigger: "item" as const,
          formatter: (p: unknown) => {
            const row = prods[(p as { dataIndex: number }).dataIndex];
            if (!row) return "";
            return `<b>${row.product_name || `Product #${row.product_id}`}</b><br/>` +
              (row.sku ? `SKU: ${row.sku}<br/>` : "") +
              `On Hand: ${compactNumber(row.on_hand)} units<br/>` +
              `Valuation: ETB ${Number(row.value ?? 0).toLocaleString()}`;
          },
        },
        xAxis: { type: "value" as const, axisLabel: { formatter: (v: number) => `ETB ${compactNumber(v)}` } },
        yAxis: {
          type: "category" as const,
          inverse: true,
          data: prods.map((p) => p.product_name || `Product #${p.product_id}`),
          axisLabel: { width: 145, overflow: "truncate" as const, fontSize: 11 },
        },
        series: [
          {
            name: t("warehouse.overview.valuation", "Valuation (ETB)"),
            type: "bar" as const,
            barMaxWidth: 16,
            data: prods.map((p, idx) => ({
              value: p.value ?? 0,
              itemStyle: { color: gradient(paletteAt(theme, idx), true), borderRadius: [0, 6, 6, 0] },
            })),
            label: {
              show: true,
              position: "right" as const,
              fontSize: 10,
              fontWeight: 700,
              color: theme.foreground,
              formatter: (p: { value?: unknown }) => `ETB ${compactNumber(p.value)}`,
            },
          },
        ],
      };
    };
  }, [overview?.top_products, t]);

  const windowLabel = t("warehouse.overview.last_days", "Last {n} days").replace("{n}", String(preset ?? 30));

  const expiring30dQty = (overview?.expiry_bands ?? [])
    .filter((b) => ["expired", "within_7", "within_30"].includes(b.key))
    .reduce((sum, b) => sum + b.quantity, 0);

  const expiring30dCount = (overview?.expiry_bands ?? [])
    .filter((b) => ["expired", "within_7", "within_30"].includes(b.key))
    .reduce((sum, b) => sum + b.count, 0);

  const triggerPageTour = React.useCallback(() => {
    const steps = [
      {
        target: "#tour-warehouse-header",
        title: t("warehouse.tour.header_title", "Warehouse Control Center"),
        content: t(
          "warehouse.tour.header_desc",
          "Comprehensive operational visibility across warehouses: stock holdings, facility capacity, goods flow, and expiration horizons."
        ),
        placement: "bottom" as const,
      },
      {
        target: "#tour-warehouse-filters",
        title: t("warehouse.tour.filters_title", "Horizon & Facility Filtering"),
        content: t(
          "warehouse.tour.filters_desc",
          "Filter telemetry across 7-day, 30-day, or 90-day timeframes, custom date ranges, and isolate individual warehouse sites."
        ),
        placement: "bottom" as const,
      },
      {
        target: "#tour-warehouse-kpis",
        title: t("warehouse.tour.kpis_title", "Warehouse Operational KPIs"),
        content: t(
          "warehouse.tour.kpis_desc",
          "High-level telemetry on Available Stock, Distinct Products, Valued Holdings in ETB, Inbound/Outbound Movements, Expiry Risk, and Dead Stock."
        ),
        placement: "bottom" as const,
      },
      {
        target: "#tour-warehouse-flow",
        title: t("warehouse.tour.flow_title", "Goods Movement Trends"),
        content: t(
          "warehouse.tour.flow_desc",
          "Daily movement trend tracking inbound receipts, outbound dispatches, and internal transfers with an interactive dataZoom slider."
        ),
        placement: "top" as const,
      },
      {
        target: "#tour-warehouse-mix",
        title: t("warehouse.tour.mix_title", "Operation Type Mix"),
        content: t(
          "warehouse.tour.mix_desc",
          "Donut visualization categorizing inventory movements into receipts, internal transfers, adjustments, and customer dispatches."
        ),
        placement: "top" as const,
      },
      {
        target: "#tour-warehouse-capacity",
        title: t("warehouse.tour.capacity_title", "Facility Storage Utilisation"),
        content: t(
          "warehouse.tour.capacity_desc",
          "Occupied vs available compartments, occupancy percentage, and total stock on hand for each warehouse facility."
        ),
        placement: "top" as const,
      },
      {
        target: "#tour-warehouse-expiry",
        title: t("warehouse.tour.expiry_title", "Perishable Shelf-Life Risk"),
        content: t(
          "warehouse.tour.expiry_desc",
          "Perishable inventory categorized by remaining shelf-life horizons from already expired to beyond 90 days."
        ),
        placement: "top" as const,
      },
      {
        target: "#tour-warehouse-valuation",
        title: t("warehouse.tour.valuation_title", "Holdings Valuation by Product"),
        content: t(
          "warehouse.tour.valuation_desc",
          "Top products ranked by financial holding valuation in ETB with on-hand quantity callouts."
        ),
        placement: "top" as const,
      },
      {
        target: "#tour-warehouse-table",
        title: t("warehouse.tour.table_title", "Largest Holdings Table"),
        content: t(
          "warehouse.tour.table_desc",
          "Detailed product catalog rows showing SKU codes, total on-hand units, financial valuation, and active stock lines."
        ),
        placement: "top" as const,
      },
    ];

    const activeSteps = steps.filter((step) => {
      const target = step.target as unknown;
      if (typeof target === "string") {
        return Boolean(document.querySelector(target));
      }
      return target instanceof HTMLElement && target.isConnected;
    });

    startTour(activeSteps.map((step) => ({ ...step, skipBeacon: true })));
  }, [startTour, t]);

  return (
    <div className="space-y-6 pb-8">
      {/* Topbar Action Row: Page Tour & Breadcrumbs */}
      <div className="mb-4 flex w-full items-center justify-end gap-3">
        <Button
          id="tour-warehouse-page-tour-trigger"
          variant="outline"
          size="sm"
          onClick={triggerPageTour}
          className="h-8 rounded-lg border-border/50 bg-background/50 text-muted-foreground shadow-sm backdrop-blur-md hover:text-foreground text-xs"
        >
          <HelpCircle className="mr-2 h-4 w-4" />{" "}
          {t("global.page_tour", "Page Tour")}
        </Button>

        <Breadcrumbs
          items={[
            {
              label: "Hive.OS",
              href: "/dashboard",
              icon: <Home className="h-4 w-4" />,
            },
            { label: t("warehouse.overview.title", "Warehouse Control Center") },
          ]}
        />
      </div>

      {/* Header with glassmorphism styling */}
      <section
        id="tour-warehouse-header"
        className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/40 p-7 shadow-sm backdrop-blur-md"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />
        
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-3xl font-black tracking-tight text-transparent">
              {t("warehouse.overview.title", "Warehouse Control Center")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {t(
                "warehouse.overview.subtitle",
                "Real-time operational visibility: current stock holdings, facility capacity, goods flow, and expiration horizons."
              )}
            </p>
          </div>

          {/* Filters scoping dashboard */}
          <div id="tour-warehouse-filters" className="flex flex-wrap items-center gap-2.5">
            <div className="flex rounded-full border border-border/60 bg-background/50 p-0.5">
              {PRESETS.map((days) => (
                <button
                  key={days}
                  type="button"
                  aria-pressed={preset === days}
                  onClick={() => applyPreset(days)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold transition",
                    preset === days
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {days}d
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <Input
                id="wh-from"
                type="date"
                value={from}
                max={to}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPreset(null);
                }}
                className="h-8 w-[8.8rem] rounded-full text-xs"
              />
              <span className="text-xs text-muted-foreground">→</span>
              <Input
                id="wh-to"
                type="date"
                value={to}
                min={from}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPreset(null);
                }}
                className="h-8 w-[8.8rem] rounded-full text-xs"
              />
            </div>

            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger className="h-8 w-[12rem] rounded-full text-xs font-semibold">
                <SelectValue placeholder={t("warehouse.overview.all_sites", "All Facilities")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("warehouse.overview.all_sites", "All Facilities")}</SelectItem>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {refetching ? (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> {t("inventory.dashboard.refreshing", "Refreshing…")}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {/* KPI Tiles Row */}
      <section id="tour-warehouse-kpis" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiTile
          icon={Boxes}
          label={t("warehouse.overview.available_stock", "Available Stock")}
          value={overview ? compactNumber(overview.stock.available) : "0"}
          sub={
            overview
              ? `${overview.stock.on_hand.toLocaleString()} on hand less ${overview.stock.reserved} reserved`
              : "0 units"
          }
          tone="default"
          loading={overviewQuery.isLoading}
        />
        <KpiTile
          icon={Layers3}
          label={t("warehouse.overview.products", "Distinct Products")}
          value={overview ? overview.stock.distinct_products.toLocaleString() : "0"}
          sub={overview ? `${overview.stock.stock_lines} stock lines` : "No lines"}
          tone="default"
          loading={overviewQuery.isLoading}
        />
        <KpiTile
          icon={Coins}
          label={t("warehouse.overview.stock_value", "Valued Stock")}
          value={overview ? `ETB ${compactNumber(overview.stock.stock_value)}` : "ETB 0"}
          sub={
            overview && overview.stock.uncosted_lines > 0
              ? `${overview.stock.uncosted_lines} line(s) carry no cost`
              : t("warehouse.overview.all_costed", "Every line is costed")
          }
          tone="good"
          loading={overviewQuery.isLoading}
        />
        <KpiTile
          icon={Activity}
          label={t("warehouse.overview.movements", "Movements in Period")}
          value={overview ? overview.movements.total.toLocaleString() : "0"}
          sub={
            overview
              ? `net ${overview.movements.net_quantity >= 0 ? "+" : ""}${compactNumber(overview.movements.net_quantity)} units`
              : "0 movements"
          }
          tone="default"
          loading={overviewQuery.isLoading}
        />
        <KpiTile
          icon={CalendarClock}
          label={t("inventory.dashboard.expiring_soon", "Expiring ≤ 30d")}
          value={compactNumber(expiring30dQty)}
          sub={`${expiring30dCount} batch(es) at risk`}
          tone={expiring30dQty > 0 ? "warn" : "good"}
          loading={overviewQuery.isLoading}
        />
        <KpiTile
          icon={PackageMinus}
          label={t("warehouse.overview.dead_stock", "Dead Stock")}
          value={overview ? compactNumber(overview.dead_stock.quantity) : "0"}
          sub={
            overview
              ? `${overview.dead_stock.lines} line(s) unmoved 90d`
              : "0 lines"
          }
          tone={overview && overview.dead_stock.lines > 0 ? "warn" : "good"}
          loading={overviewQuery.isLoading}
        />
      </section>

      {overview?.stock.negative_lines && overview.stock.negative_lines > 0 ? (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <span>
            {t(
              "warehouse.overview.negative_warning",
              "{n} stock line(s) are negative — goods were issued that the books never received."
            ).replace("{n}", String(overview.stock.negative_lines))}
          </span>
        </div>
      ) : null}

      {/* Row 1: Goods Flow & Movements Mix */}
      <SectionTitle hint={windowLabel}>{t("warehouse.overview.section_operations", "Warehouse Operations & Flow")}</SectionTitle>
      <section className="grid gap-6 lg:grid-cols-3">
        <ChartCard
          id="tour-warehouse-flow"
          className="lg:col-span-2"
          icon={Activity}
          title={t("warehouse.overview.flow", "Goods Movement Trend")}
          description={t(
            "warehouse.overview.flow_desc",
            "Daily quantities received, issued, and transferred across sites. Drag slider to zoom."
          )}
        >
          <EChart
            option={trendOption}
            height={300}
            ariaLabel={t("warehouse.overview.flow", "Goods Movement Trend")}
            subtitle={windowLabel}
            empty={!overviewQuery.isLoading && (overview?.daily_movements?.length ?? 0) === 0}
            emptyLabel={t("warehouse.overview.no_movements", "No stock movements in this period.")}
            dimmed={refetching}
          />
        </ChartCard>

        <ChartCard
          id="tour-warehouse-mix"
          icon={Truck}
          title={t("warehouse.overview.movement_mix", "Movements by Operation")}
          description={t("warehouse.overview.movement_mix_desc", "Breakdown of inbound receipts, internal transfers, and dispatches.")}
        >
          <EChart
            option={movementMixOption}
            height={300}
            ariaLabel={t("warehouse.overview.movement_mix", "Movements by Operation")}
            subtitle={windowLabel}
            empty={!overviewQuery.isLoading && (overview?.movement_mix?.length ?? 0) === 0}
            emptyLabel={t("warehouse.overview.no_movements", "No stock movements in this period.")}
            dimmed={refetching}
          />
        </ChartCard>
      </section>

      {/* Row 2: Capacity, Shelf-Life Risk & Valuation */}
      <SectionTitle>{t("warehouse.overview.section_storage", "Storage Utilisation, Risk & Valuation")}</SectionTitle>
      <section className="grid gap-6 lg:grid-cols-3">
        <ChartCard
          id="tour-warehouse-capacity"
          icon={WarehouseIcon}
          title={t("warehouse.overview.site_utilisation", "Facility Storage Utilisation")}
          description={t("warehouse.overview.site_utilisation_desc", "Occupied vs available compartments and capacity by warehouse facility.")}
        >
          <EChart
            option={capacityOption}
            height={300}
            ariaLabel={t("warehouse.overview.site_utilisation", "Facility Storage Utilisation")}
            empty={!overviewQuery.isLoading && (overview?.capacity?.length ?? 0) === 0}
            emptyLabel={t("warehouse.overview.no_sites", "No warehouses defined yet.")}
            dimmed={refetching}
          />
        </ChartCard>

        <ChartCard
          id="tour-warehouse-expiry"
          icon={CalendarClock}
          title={t("warehouse.overview.shelf_life", "Perishable Shelf-Life Risk")}
          description={t("warehouse.overview.shelf_life_desc", "Batched inventory categorized by remaining shelf-life horizons.")}
        >
          <EChart
            option={expiryOption}
            height={300}
            ariaLabel={t("warehouse.overview.shelf_life", "Perishable Shelf-Life Risk")}
            empty={!overviewQuery.isLoading && (overview?.expiry_bands?.length ?? 0) === 0}
            emptyLabel={t("warehouse.overview.no_expiry", "No stock carries an expiry date.")}
            dimmed={refetching}
          />
        </ChartCard>

        <ChartCard
          id="tour-warehouse-valuation"
          icon={TrendingUp}
          title={t("warehouse.overview.valuation_ranking", "Holdings Valuation by Product")}
          description={t("warehouse.overview.valuation_desc", "Top products ranked by total inventory value on hand in ETB.")}
        >
          <EChart
            option={valuationOption}
            height={300}
            ariaLabel={t("warehouse.overview.valuation_ranking", "Holdings Valuation by Product")}
            empty={!overviewQuery.isLoading && (overview?.top_products?.length ?? 0) === 0}
            emptyLabel={t("warehouse.overview.no_stock", "No stock on hand.")}
            dimmed={refetching}
          />
        </ChartCard>
      </section>

      {/* Row 3: Largest Holdings Detail Table */}
      <section id="tour-warehouse-table" className="rounded-[2rem] border border-border/40 bg-card/30 p-6 shadow-sm backdrop-blur-md">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-base font-black tracking-tight">
              <span className="rounded-xl bg-primary/10 p-1.5">
                <Boxes className="h-4 w-4 text-primary" />
              </span>
              {t("warehouse.overview.largest_holdings", "Largest Warehouse Holdings")}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("warehouse.overview.largest_holdings_desc", "Products taking up the most stock and financial valuation across facilities.")}
            </p>
          </div>
        </div>

        {overview?.top_products && overview.top_products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="py-2.5 pr-4 font-semibold">{t("warehouse.overview.product", "Product")}</th>
                  <th className="py-2.5 pr-4 text-right font-semibold">
                    {t("warehouse.overview.on_hand_short", "On Hand")}
                  </th>
                  <th className="py-2.5 pr-4 text-right font-semibold">
                    {t("warehouse.overview.valuation", "Valuation (ETB)")}
                  </th>
                  <th className="py-2.5 text-right font-semibold">{t("warehouse.overview.lines", "Stock Lines")}</th>
                </tr>
              </thead>
              <tbody>
                {overview.top_products.map((row) => (
                  <tr key={row.product_id} className="border-b border-border/30 hover:bg-muted/40 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-foreground">
                        {row.product_name || `Product #${row.product_id}`}
                      </div>
                      {row.sku && row.sku !== "-" ? (
                        <div className="text-xs font-mono text-muted-foreground">
                          {row.sku}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 text-right font-bold tabular-nums">
                      {row.on_hand.toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold tabular-nums text-foreground/90">
                      ETB {row.value.toLocaleString()}
                    </td>
                    <td className="py-3 text-right tabular-nums text-muted-foreground">
                      {row.lines.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm italic text-muted-foreground">
            {t("warehouse.overview.no_stock", "No stock on hand.")}
          </p>
        )}
      </section>
    </div>
  );
}
