"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Barcode,
  Boxes,
  CalendarClock,
  ClipboardList,
  Coins,
  Gauge,
  HelpCircle,
  Home,
  Layers,
  PackageMinus,
  Scale,
  ShieldAlert,
  Snail,
  Sparkles,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import type { Step } from "react-joyride";

import { useTranslation } from "@/store/use-translation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { useTour } from "@/components/providers/tour-provider";
import {
  fetchInventoryAnalytics,
  fetchInventoryBatches,
  fetchInventorySerials,
  fetchReconciliationInventoryGl,
  fetchReconciliationCogs,
  fetchReconciliationPpv,
  fetchReorderBasis,
  fetchStocktakes,
} from "@/modules/inventory/api";
import { compactNumber } from "@/modules/shared/charts/chart-style";

const num = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const fmt = (value: unknown, digits = 0) =>
  num(value).toLocaleString(undefined, { maximumFractionDigits: digits });

const money = (value: unknown) => `ETB ${compactNumber(value)}`;

const WINDOW_PRESETS = [7, 30, 90] as const;

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-end justify-between gap-3 pt-2">
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">{children}</h2>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  sub,
  href,
  loading,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  href?: string;
  loading?: boolean;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const tones = {
    default: { wash: "from-primary/10 to-transparent", icon: "text-primary", border: "hover:border-primary/50" },
    good: { wash: "from-emerald-500/15 to-transparent", icon: "text-emerald-500", border: "hover:border-emerald-500/50" },
    warn: { wash: "from-amber-500/15 to-transparent", icon: "text-amber-500", border: "hover:border-amber-500/50" },
    bad: { wash: "from-rose-500/15 to-transparent", icon: "text-rose-500", border: "hover:border-rose-500/50" },
  } as const;

  const content = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[1.5rem] border border-border/40 bg-card/30 p-5 backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md",
        tones[tone].border
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70", tones[tone].wash)} />
      <div className="relative flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-4 w-4", tones[tone].icon)} />
          {href ? <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" /> : null}
        </div>
      </div>
      <div className="relative mt-3 text-2xl font-black tabular-nums tracking-tight text-foreground">
        {loading ? <Skeleton className="h-7 w-20 rounded-md" /> : value}
      </div>
      {sub ? <div className="relative mt-1 text-[11px] text-muted-foreground">{sub}</div> : null}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default function OperationsOverviewPage() {
  const { t } = useTranslation();
  const { hasAnyPermission, hasPermission } = usePermissions();
  const { startTour } = useTour();

  const canOps = hasAnyPermission(["view_inventory", "manage_inventory"]);
  const canFinance = hasPermission("view_finance");

  const [days, setDays] = React.useState<(typeof WINDOW_PRESETS)[number]>(30);

  React.useEffect(() => {
    document.title = "Inventory Operations | HIVE.OS";
  }, []);

  // Operational telemetry queries
  const analyticsQuery = useQuery({
    queryKey: ["ov", "analytics", days],
    enabled: canOps,
    queryFn: () => fetchInventoryAnalytics(days),
    placeholderData: (previous) => previous,
  });

  const batchesAll = useQuery({
    queryKey: ["ov", "batches-all"],
    enabled: canOps,
    queryFn: () => fetchInventoryBatches({ per_page: 1 }),
  });

  const batchesExpired = useQuery({
    queryKey: ["ov", "batches-expired"],
    enabled: canOps,
    queryFn: () => fetchInventoryBatches({ per_page: 1, expired: true }),
  });

  const serials = useQuery({
    queryKey: ["ov", "serials"],
    enabled: canOps,
    queryFn: () => fetchInventorySerials({ per_page: 1 }),
  });

  const stocktakesCounting = useQuery({
    queryKey: ["ov", "stocktakes-counting"],
    enabled: canOps,
    queryFn: () => fetchStocktakes({ per_page: 1, status: "counting" }),
  });

  const lowStockQuery = useQuery({
    queryKey: ["ov", "low-stock"],
    enabled: canOps,
    queryFn: () => fetchReorderBasis({ per_page: 1, low_only: true }),
  });

  // Financial reconciliation queries
  const invGl = useQuery({
    queryKey: ["ov", "inv-gl"],
    enabled: canFinance,
    queryFn: fetchReconciliationInventoryGl,
  });

  const cogsQuery = useQuery({
    queryKey: ["ov", "cogs"],
    enabled: canFinance,
    queryFn: fetchReconciliationCogs,
  });

  const ppvQuery = useQuery({
    queryKey: ["ov", "ppv"],
    enabled: canFinance,
    queryFn: fetchReconciliationPpv,
  });

  const a = analyticsQuery.data;
  const k = a?.kpis;
  const loading = analyticsQuery.isLoading;
  const windowLabel = t("inventory.dashboard.last_n_days", "last {n} days").replace("{n}", String(days));

  // Comprehensive guided page tour
  const triggerPageTour = React.useCallback(() => {
    const steps: Step[] = [
      {
        target: "#tour-inv-overview-header",
        title: t("inventory.tour.overview.welcome_title", "Inventory Operations Cockpit"),
        content: t(
          "inventory.tour.overview.welcome",
          "Central operational intelligence hub providing real-time visibility into physical stock, serialized tracking, batch expirations, cycle counts, and financial valuation."
        ),
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: "#tour-inv-overview-presets",
        title: t("inventory.tour.overview.presets_title", "Time Window Horizons"),
        content: t(
          "inventory.tour.overview.presets_desc",
          "Toggle between 7-day, 30-day, or 90-day analytical horizons to evaluate movement throughput and stock trends."
        ),
        placement: "bottom",
        skipBeacon: true,
      },
      ...(canOps
        ? [
            {
              target: "#tour-inv-overview-telemetry",
              title: t("inventory.tour.overview.telemetry_title", "Core Stock & Traceability"),
              content: t(
                "inventory.tour.overview.telemetry_desc",
                "Real-time operational counts: Total Physical Stock on hand, Available vs Reserved allocations, Active Catalog Goods, Tracked Serialized Units, and Active Batches."
              ),
              placement: "bottom" as const,
              skipBeacon: true,
            },
            {
              target: "#tour-inv-overview-health",
              title: t("inventory.tour.overview.health_title", "Stock Health & Shortage Warnings"),
              content: t(
                "inventory.tour.overview.health_desc",
                "Proactive risk signals: Out-of-stock items requiring replenishment, goods breaching safety thresholds, lots expiring within 30 days, and expired batches on hand."
              ),
              placement: "top" as const,
              skipBeacon: true,
            },
            {
              target: "#tour-inv-overview-velocity",
              title: t("inventory.tour.overview.velocity_title", "Operational Velocity & Audits"),
              content: t(
                "inventory.tour.overview.velocity_desc",
                "Throughput indicators: Inbound receipts, outbound customer dispatches, active cycle counts in progress, and dormant dead stock units."
              ),
              placement: "top" as const,
              skipBeacon: true,
            },
          ]
        : []),
      ...(canFinance
        ? [
            {
              target: "#tour-inv-overview-finance",
              title: t("inventory.tour.overview.finance_title", "Financial Valuation & GL Reconciliation"),
              content: t(
                "inventory.tour.overview.finance_desc",
                "Continuous subledger reconciliation: Verified stock holding valuation against General Ledger asset accounts, tracking unexplained drift, COGS, and PPV variances."
              ),
              placement: "top" as const,
              skipBeacon: true,
            },
          ]
        : []),
      {
        target: "#tour-inv-overview-links",
        title: t("inventory.tour.overview.links_title", "Operations Workspaces Directory"),
        content: t(
          "inventory.tour.overview.links_desc",
          "Instant navigation to specialized sub-modules: Batches & Expiry, Serial Numbers, Stocktakes, Reorder Basis, Valuation, Reconciliation, and Warehouses."
        ),
        placement: "top",
        skipBeacon: true,
      },
    ];

    const activeSteps = steps.filter((step) => {
      const target = step.target as unknown;
      if (typeof target === "string") {
        return Boolean(document.querySelector(target));
      }
      return target instanceof HTMLElement && target.isConnected;
    });

    startTour(activeSteps);
  }, [canFinance, canOps, startTour, t]);

  const availableStock = Math.max(0, (k?.on_hand ?? 0) - (k?.reserved ?? 0));
  const needsActionAlerts = (k?.alerts.out_of_stock ?? 0) + (k?.alerts.critical ?? 0) + (k?.alerts.reorder ?? 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Topbar Action Row: Page Tour & Breadcrumbs */}
      <div className="mb-4 flex w-full items-center justify-end gap-3">
        <Button
          id="tour-inventory-overview-page-tour-trigger"
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
            {
              label: t("nav.inventory", "Inventory"),
              href: "/dashboard/inventory",
            },
            { label: t("inventory.overview.title", "Inventory Operations") },
          ]}
        />
      </div>

      {/* Header Cockpit Card */}
      <section
        id="tour-inv-overview-header"
        className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/40 p-7 shadow-sm backdrop-blur-md"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-3xl font-black tracking-tight text-transparent">
                {t("inventory.overview.title", "Inventory Operations")}
              </h1>
              <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5">
                <Sparkles className="mr-1 h-3 w-3" /> Live Cockpit
              </Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {t(
                "inventory.overview.subtitle",
                "Operational health across physical stock, batches, serials, counts, movement throughput, and financial reconciliation."
              )}
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div
              id="tour-inv-overview-presets"
              className="flex rounded-full border border-border/60 bg-background/50 p-0.5"
              role="group"
              aria-label={t("inventory.dashboard.window", "Time window")}
            >
              {WINDOW_PRESETS.map((w) => (
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

            <Button asChild size="sm" variant="ghost" className="h-8 rounded-full text-xs font-semibold text-primary hover:bg-primary/10">
              <Link href="/dashboard/inventory">
                {t("inventory.overview.control_center", "Open Control Center")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Tier 1: Core Physical Stock & Traceability Telemetry */}
      {canOps ? (
        <>
          <SectionTitle hint={windowLabel}>{t("inventory.overview.section_telemetry", "Physical Stock & Traceability")}</SectionTitle>
          <section id="tour-inv-overview-telemetry" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              icon={Boxes}
              label={t("inventory.dashboard.on_hand", "Stock On Hand")}
              value={k ? fmt(k.on_hand) : "0"}
              sub={k ? `${fmt(availableStock)} available · ${fmt(k.reserved)} reserved` : "0 units"}
              href="/dashboard/inventory"
              loading={loading}
              tone="default"
            />
            <MetricTile
              icon={Layers}
              label={t("inventory.dashboard.active_goods", "Active Tracked Goods")}
              value={k ? fmt(k.active_goods) : "0"}
              sub={t("inventory.overview.catalog_items", "Catalog items in active use")}
              href="/dashboard/inventory/catalog/goods"
              loading={loading}
              tone="default"
            />
            <MetricTile
              icon={Barcode}
              label={t("inventory.overview.serials", "Serialized Units")}
              value={serials.data?.meta?.total ?? 0}
              sub={t("inventory.overview.serials_trace", "Traceable unique serial instances")}
              href="/dashboard/inventory/serials"
              loading={serials.isLoading}
              tone="default"
            />
            <MetricTile
              icon={ClipboardList}
              label={t("inventory.overview.batches_active", "Batches & Lots Under Trace")}
              value={batchesAll.data?.meta?.total ?? 0}
              sub={t("inventory.overview.batches_sub", "Active production & supplier lots")}
              href="/dashboard/inventory/batches"
              loading={batchesAll.isLoading}
              tone="default"
            />
          </section>

          {/* Tier 2: Stock Health, Reorder Signals & Expiry Horizons */}
          <SectionTitle>{t("inventory.overview.section_health", "Stock Health & Critical Warnings")}</SectionTitle>
          <section id="tour-inv-overview-health" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              icon={AlertTriangle}
              label={t("inventory.alerts.out_of_stock", "Critical Out of Stock")}
              value={k?.alerts.out_of_stock ?? 0}
              sub={t("inventory.overview.immediate_order", "Items with 0 units available")}
              href="/dashboard/inventory/reorder-basis"
              loading={loading}
              tone={(k?.alerts.out_of_stock ?? 0) > 0 ? "bad" : "good"}
            />
            <MetricTile
              icon={Gauge}
              label={t("inventory.overview.low_stock", "At / Below Reorder Point")}
              value={needsActionAlerts}
              sub={`${fmt(lowStockQuery.data?.meta?.total ?? 0)} ${t("inventory.overview.breached_thresholds", "threshold breaches")}`}
              href="/dashboard/inventory/reorder-basis"
              loading={loading || lowStockQuery.isLoading}
              tone={needsActionAlerts > 0 ? "warn" : "good"}
            />
            <MetricTile
              icon={CalendarClock}
              label={t("inventory.dashboard.expiring_soon", "Expiring ≤ 30 Days")}
              value={compactNumber(k?.expiring_30d_qty ?? 0)}
              sub={`${fmt(k?.expiring_30d_lots ?? 0)} ${t("inventory.dashboard.lots", "lots")} at risk`}
              href="/dashboard/inventory/batches"
              loading={loading}
              tone={(k?.expiring_30d_qty ?? 0) > 0 ? "warn" : "good"}
            />
            <MetricTile
              icon={CalendarClock}
              label={t("inventory.overview.expired_lots", "Expired Lots On Hand")}
              value={batchesExpired.data?.meta?.total ?? 0}
              sub={`${fmt(k?.expired_qty_on_hand ?? 0)} ${t("inventory.dashboard.units", "units")} ${t("inventory.dashboard.already_expired", "already expired")}`}
              href="/dashboard/inventory/batches"
              loading={batchesExpired.isLoading || loading}
              tone={(batchesExpired.data?.meta?.total ?? 0) > 0 ? "bad" : "good"}
            />
          </section>

          {/* Tier 3: Operational Velocity & Audits in Period */}
          <SectionTitle hint={windowLabel}>{t("inventory.overview.section_velocity", "Operational Velocity & Auditing")}</SectionTitle>
          <section id="tour-inv-overview-velocity" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              icon={ArrowDownToLine}
              label={t("inventory.dashboard.inbound", "Inbound Receipts")}
              value={compactNumber(k?.inbound ?? 0)}
              sub={windowLabel}
              loading={loading}
              tone="good"
            />
            <MetricTile
              icon={ArrowUpFromLine}
              label={t("inventory.dashboard.outbound", "Outbound Dispatches")}
              value={compactNumber(k?.outbound ?? 0)}
              sub={`${fmt(k?.movements ?? 0)} ${t("inventory.dashboard.movements", "movements")}`}
              loading={loading}
              tone="default"
            />
            <MetricTile
              icon={ClipboardList}
              label={t("inventory.overview.open_counts", "Counts in Progress")}
              value={stocktakesCounting.data?.meta?.total ?? 0}
              sub={t("inventory.overview.active_stocktakes", "Active physical stocktakes")}
              href="/dashboard/inventory/stocktakes"
              loading={stocktakesCounting.isLoading}
              tone={(stocktakesCounting.data?.meta?.total ?? 0) > 0 ? "warn" : "good"}
            />
            <MetricTile
              icon={Snail}
              label={t("inventory.dashboard.dead_stock", "Dormant Dead Stock")}
              value={canFinance && a?.dead_stock.value != null ? money(a.dead_stock.value) : fmt(a?.dead_stock.quantity ?? 0)}
              sub={`${fmt(a?.dead_stock.count ?? 0)} ${t("inventory.dashboard.items_no_movement", "items with no issue in")} ${days}d`}
              href="/dashboard/inventory"
              loading={loading}
              tone={(a?.dead_stock.count ?? 0) > 0 ? "warn" : "good"}
            />
          </section>
        </>
      ) : (
        <Card className="rounded-3xl border-border/60 p-6 text-center text-sm text-muted-foreground">
          <ShieldAlert className="mx-auto mb-2 h-6 w-6 text-destructive" />
          {t("inventory.overview.no_ops", "You do not have inventory access clearance.")}
        </Card>
      )}

      {/* Tier 4: Financial Subledger Valuation & GL Reconciliation Health */}
      {canFinance ? (
        <>
          <SectionTitle>{t("inventory.dashboard.section_finance", "Finance & Reconciliation Health")}</SectionTitle>
          <Card
            id="tour-inv-overview-finance"
            className="overflow-hidden rounded-[2rem] border border-border/40 bg-card/30 p-6 shadow-sm backdrop-blur-md"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-base font-black tracking-tight text-foreground">
                  <span className="rounded-xl bg-primary/10 p-1.5">
                    <Coins className="h-4 w-4 text-primary" />
                  </span>
                  {t("inventory.overview.valuation_health", "Inventory Asset Valuation & GL Subledger")}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(
                    "inventory.overview.valuation_health_desc",
                    "Continuous comparison between inventory cost layers, stock asset accounts, COGS, and PPV variance."
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline" className="h-8 rounded-full text-xs">
                  <Link href="/dashboard/inventory/valuation">{t("inventory.valuation.title", "Valuation Ledger")}</Link>
                </Button>
                <Button asChild size="sm" className="h-8 rounded-full text-xs shadow-sm">
                  <Link href="/dashboard/inventory/reconciliation">{t("inventory.overview.view_recon", "Reconciliation View")}</Link>
                </Button>
              </div>
            </div>

            {invGl.isLoading || !invGl.data ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-border/40 bg-background/40 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("inventory.overview.inventory_value", "Subledger Valued Stock")}
                  </p>
                  <p className="mt-1 font-mono text-2xl font-black text-foreground">
                    ETB {fmt(invGl.data.subledger_balance, 2)}
                  </p>
                </div>

                <div className="rounded-2xl border border-border/40 bg-background/40 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("inventory.overview.gl_balance", "Inventory Asset GL")}
                  </p>
                  <p className="mt-1 font-mono text-2xl font-black text-foreground">
                    ETB {fmt(invGl.data.gl_balance, 2)}
                  </p>
                </div>

                <div className="rounded-2xl border border-border/40 bg-background/40 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("inventory.recon.difference", "Unexplained Difference")}
                  </p>
                  <p
                    className={cn(
                      "mt-1 font-mono text-2xl font-black",
                      num(invGl.data.difference) === 0 ? "text-emerald-500" : "text-amber-500"
                    )}
                  >
                    ETB {fmt(invGl.data.difference, 2)}
                  </p>
                </div>

                <div className="rounded-2xl border border-border/40 bg-background/40 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("inventory.recon.status", "Reconciliation Status")}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full text-xs font-bold",
                        invGl.data.reconciled
                          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {invGl.data.reconciled ? t("inventory.recon.reconciled", "Reconciled") : t("inventory.recon.mismatch", "Mismatch")}
                    </Badge>
                    {cogsQuery.data ? (
                      <Badge variant="outline" className="rounded-full text-[10px]">
                        COGS: {cogsQuery.data.reconciled ? "OK" : "Diff"}
                      </Badge>
                    ) : null}
                    {ppvQuery.data ? (
                      <Badge variant="outline" className="rounded-full text-[10px]">
                        PPV: {ppvQuery.data.reconciled ? "OK" : "Diff"}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </>
      ) : null}

      {/* Tier 5: Direct Workspaces Jump Directory */}
      <SectionTitle>{t("inventory.tour.overview.links_title", "Operations Workspaces Directory")}</SectionTitle>
      <div id="tour-inv-overview-links" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            href: "/dashboard/inventory/catalog/goods",
            icon: Boxes,
            label: t("nav.inventory_goods", "Goods (Raw Materials)"),
            desc: t("inventory.overview.desc_goods", "Raw materials, specifications, and suppliers"),
            ops: true,
          },
          {
            href: "/dashboard/inventory/catalog/products",
            icon: TrendingUp,
            label: t("inventory.products.title", "Products Catalog"),
            desc: t("inventory.overview.desc_products", "Finished goods, SKUs, and packaging"),
            ops: true,
          },
          {
            href: "/dashboard/inventory/batches",
            icon: Layers,
            label: t("inventory.batches.title", "Batches & Expiry"),
            desc: t("inventory.overview.desc_batches", "Lot traceability, QA status, and shelf-life"),
            ops: true,
          },
          {
            href: "/dashboard/inventory/serials",
            icon: Barcode,
            label: t("inventory.serials.title", "Serial Numbers"),
            desc: t("inventory.overview.desc_serials", "Individual unit tracking and lifecycle trace"),
            ops: true,
          },
          {
            href: "/dashboard/inventory/stocktakes",
            icon: ClipboardList,
            label: t("inventory.stocktake.title", "Stocktakes & Cycle Counts"),
            desc: t("inventory.overview.desc_stocktakes", "Physical audit counts, variances, and snapshots"),
            ops: true,
          },
          {
            href: "/dashboard/inventory/reorder-basis",
            icon: Gauge,
            label: t("inventory.reorder.title", "Reorder Basis & Safety"),
            desc: t("inventory.overview.desc_reorder", "Lead time, daily consumption, and safety levels"),
            ops: true,
          },
          {
            href: "/dashboard/inventory/locations/warehouses",
            icon: Warehouse,
            label: t("inventory.warehouses.title", "Warehouses & Shelves"),
            desc: t("inventory.overview.desc_warehouses", "Facility locations, shelves, and compartments"),
            ops: true,
          },
          {
            href: "/dashboard/inventory/valuation",
            icon: Coins,
            label: t("inventory.valuation.title", "Valuation Subledger"),
            desc: t("inventory.overview.desc_valuation", "FIFO and standard costing layers"),
            ops: false,
          },
          {
            href: "/dashboard/inventory/reconciliation",
            icon: Scale,
            label: t("inventory.recon.title", "Financial GL Reconciliation"),
            desc: t("inventory.overview.desc_recon", "Subledger vs GL Asset, COGS, and PPV accounts"),
            ops: false,
          },
        ]
          .filter((item) => (item.ops ? canOps : canFinance))
          .map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="group flex items-start gap-3.5 rounded-2xl border-border/50 bg-card/40 p-4 backdrop-blur-sm transition hover:border-primary/50 hover:bg-card/70 hover:shadow-sm">
                <div className="rounded-xl bg-primary/10 p-2 text-primary transition group-hover:scale-105">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-bold text-foreground transition group-hover:text-primary">
                      {item.label}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </Card>
            </Link>
          ))}
      </div>
    </div>
  );
}
