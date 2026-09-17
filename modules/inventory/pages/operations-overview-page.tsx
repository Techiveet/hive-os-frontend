"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, Barcode, CalendarClock, ClipboardList, Coins, Gauge,
  HelpCircle, Layers, Scale, ShieldAlert,
} from "lucide-react";
import type { Step } from "react-joyride";
import { useTranslation } from "@/store/use-translation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { useTour } from "@/components/providers/tour-provider";
import {
  fetchInventoryBatches, fetchInventorySerials, fetchReconciliationInventoryGl,
  fetchReorderBasis, fetchStocktakes,
} from "@/modules/inventory/api";

function MetricCard({
  icon: Icon, label, value, href, loading, accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  href: string;
  loading: boolean;
  accent?: string;
}) {
  return (
    <Link href={href}>
      <Card className="group rounded-3xl border-border/60 p-5 transition hover:border-primary/40 hover:shadow-sm">
        <div className="flex items-center justify-between">
          <div className={cn("rounded-2xl p-2.5", accent ?? "bg-primary/10")}>
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
        </div>
        <p className="mt-3 text-2xl font-black">{loading ? <Skeleton className="h-7 w-16" /> : value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </Card>
    </Link>
  );
}

export default function OperationsOverviewPage() {
  const { t } = useTranslation();
  const { hasAnyPermission, hasPermission } = usePermissions();
  const canOps = hasAnyPermission(["view_inventory", "manage_inventory"]);
  const canFinance = hasPermission("view_finance");

  const serials = useQuery({ queryKey: ["ov", "serials"], enabled: canOps, queryFn: () => fetchInventorySerials({ per_page: 1 }) });
  const batchesExpired = useQuery({ queryKey: ["ov", "batches-expired"], enabled: canOps, queryFn: () => fetchInventoryBatches({ per_page: 1, expired: true }) });
  const stocktakes = useQuery({ queryKey: ["ov", "stocktakes-counting"], enabled: canOps, queryFn: () => fetchStocktakes({ per_page: 1, status: "counting" }) });
  const lowStock = useQuery({ queryKey: ["ov", "low-stock"], enabled: canOps, queryFn: () => fetchReorderBasis({ per_page: 1, low_only: true }) });
  const invGl = useQuery({ queryKey: ["ov", "inv-gl"], enabled: canFinance, queryFn: fetchReconciliationInventoryGl });
  const { startTour } = useTour();

  // Permission-aware tour: finance-only steps are omitted for non-finance users.
  const tourSteps: Step[] = [
    { target: "#inv-tour-overview-title", title: t("inventory.tour.overview.welcome_title", "Inventory Operations"), content: t("inventory.tour.overview.welcome", "Your operational cockpit for batches, serials, counts and — with finance access — valuation."), placement: "bottom" as const, skipBeacon: true },
    ...(canOps ? [{ target: "#inv-tour-overview-metrics", title: t("inventory.tour.overview.metrics_title", "Operational signals"), content: t("inventory.tour.overview.metrics", "Live counts of serialized units, expired lots, counts in progress and low-stock goods. Each card opens its workspace."), placement: "bottom" as const, skipBeacon: true }] : []),
    ...(canFinance ? [{ target: "#inv-tour-overview-finance", title: t("inventory.tour.overview.finance_title", "Valuation & GL"), content: t("inventory.tour.overview.finance", "Finance users see the inventory value (subledger), the Inventory Asset GL balance, and whether they reconcile."), placement: "top" as const, skipBeacon: true }] : []),
    { target: "#inv-tour-overview-links", title: t("inventory.tour.overview.links_title", "Jump to a workspace"), content: t("inventory.tour.overview.links", "Physical stock (batches/serials/counts) is separate from financial value — only finance roles see valuation and reconciliation."), placement: "top" as const, skipBeacon: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div id="inv-tour-overview-title">
          <h1 className="text-3xl font-black tracking-tight">{t("inventory.overview.title", "Inventory Operations")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("inventory.overview.subtitle", "Operational health across batches, serials, counts, and — for finance — valuation.")}
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => startTour(tourSteps)}>
          <HelpCircle className="mr-2 h-4 w-4" />
          {t("inventory.tour.take_tour", "Take a tour")}
        </Button>
      </div>

      {canOps ? (
        <div id="inv-tour-overview-metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={Barcode} label={t("inventory.overview.serials", "Serialized units")} href="/dashboard/inventory/serials" loading={serials.isLoading} value={serials.data?.meta?.total ?? 0} />
          <MetricCard icon={CalendarClock} label={t("inventory.overview.expired_lots", "Expired lots")} href="/dashboard/inventory/batches" loading={batchesExpired.isLoading} value={batchesExpired.data?.meta?.total ?? 0} accent="bg-red-500/10" />
          <MetricCard icon={ClipboardList} label={t("inventory.overview.open_counts", "Counts in progress")} href="/dashboard/inventory/stocktakes" loading={stocktakes.isLoading} value={stocktakes.data?.meta?.total ?? 0} accent="bg-sky-500/10" />
          <MetricCard icon={Gauge} label={t("inventory.overview.low_stock", "Low-stock goods")} href="/dashboard/inventory/reorder-basis" loading={lowStock.isLoading} value={lowStock.data?.meta?.total ?? 0} accent="bg-amber-500/10" />
        </div>
      ) : (
        <Card className="rounded-3xl border-border/60 p-6 text-center text-sm text-muted-foreground">
          <ShieldAlert className="mx-auto mb-2 h-6 w-6" />
          {t("inventory.overview.no_ops", "You do not have inventory access.")}
        </Card>
      )}

      {canFinance ? (
        <Card id="inv-tour-overview-finance" className="rounded-3xl border-border/60 p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              <Coins className="h-4 w-4" /> {t("inventory.overview.valuation_health", "Valuation & GL")}
            </h2>
            <Link href="/dashboard/inventory/reconciliation" className="text-sm text-primary hover:underline">
              {t("inventory.overview.view_recon", "View reconciliation")}
            </Link>
          </div>
          {invGl.isLoading || !invGl.data ? (
            <Skeleton className="h-16 w-full rounded-2xl" />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">{t("inventory.overview.inventory_value", "Inventory value (subledger)")}</p>
                <p className="font-mono text-2xl font-black">{invGl.data.subledger_balance}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("inventory.overview.gl_balance", "Inventory Asset GL")}</p>
                <p className="font-mono text-2xl font-black">{invGl.data.gl_balance}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("inventory.recon.status", "Status")}</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-1 rounded-full",
                    invGl.data.reconciled
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  )}
                >
                  {invGl.data.reconciled ? t("inventory.recon.reconciled", "Reconciled") : t("inventory.recon.mismatch", "Mismatch")}
                </Badge>
              </div>
            </div>
          )}
        </Card>
      ) : null}

      <div id="inv-tour-overview-links" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: "/dashboard/inventory/batches", icon: Layers, label: t("inventory.batches.title", "Batches & Expiry"), ops: true },
          { href: "/dashboard/inventory/serials", icon: Barcode, label: t("inventory.serials.title", "Serial Numbers"), ops: true },
          { href: "/dashboard/inventory/stocktakes", icon: ClipboardList, label: t("inventory.stocktake.title", "Stocktakes"), ops: true },
          { href: "/dashboard/inventory/reorder-basis", icon: Gauge, label: t("inventory.reorder.title", "Reorder Basis"), ops: true },
          { href: "/dashboard/inventory/valuation", icon: Coins, label: t("inventory.valuation.title", "Valuation"), ops: false },
          { href: "/dashboard/inventory/reconciliation", icon: Scale, label: t("inventory.recon.title", "Reconciliation"), ops: false },
        ]
          .filter((item) => (item.ops ? canOps : canFinance))
          .map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="flex items-center gap-3 rounded-2xl border-border/60 p-4 transition hover:border-primary/40">
                <item.icon className="h-5 w-5 text-primary" />
                <span className="font-medium">{item.label}</span>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </Card>
            </Link>
          ))}
      </div>
    </div>
  );
}
