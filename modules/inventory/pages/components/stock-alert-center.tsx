"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertOctagon, AlertTriangle, ArrowRight, CheckCircle2, PackageX, TrendingUp, Truck } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AlertSeverity, InventoryAnalytics, StockAlert } from "@/modules/inventory/api";

type Translate = (key: string, fallback: string) => string;

const SEVERITY_ORDER: AlertSeverity[] = ["out_of_stock", "critical", "reorder", "overstock"];

const SEVERITY_STYLE: Record<AlertSeverity, { chip: string; badge: string; icon: React.ComponentType<{ className?: string }> }> = {
  out_of_stock: {
    chip: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300",
    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    icon: PackageX,
  },
  critical: {
    chip: "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-300",
    badge: "bg-orange-500/15 text-orange-600 dark:text-orange-300",
    icon: AlertOctagon,
  },
  reorder: {
    chip: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    icon: AlertTriangle,
  },
  overstock: {
    chip: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    icon: TrendingUp,
  },
};

export function severityLabel(t: Translate, severity: AlertSeverity): string {
  switch (severity) {
    case "out_of_stock":
      return t("inventory.dashboard.sev_out_of_stock", "Out of stock");
    case "critical":
      return t("inventory.dashboard.sev_critical", "Below safety stock");
    case "reorder":
      return t("inventory.dashboard.sev_reorder", "Reorder now");
    default:
      return t("inventory.dashboard.sev_overstock", "Overstock");
  }
}

const qty = (value: number | null | undefined) =>
  value == null ? "—" : Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 });

/**
 * Raises a toast the moment realtime data shows MORE outages or critical lines
 * than before — not on first load, and not when things improve.
 */
function useShortageToasts(counts: Record<AlertSeverity, number> | undefined, t: Translate) {
  const previous = React.useRef<Record<AlertSeverity, number> | null>(null);

  React.useEffect(() => {
    if (!counts) return;
    const before = previous.current;
    previous.current = counts;
    if (!before) return;

    const newOutages = counts.out_of_stock - before.out_of_stock;
    const newCritical = counts.critical - before.critical;
    if (newOutages > 0) {
      toast.error(t("inventory.dashboard.toast_out_of_stock", "Stock-out alert"), {
        description: t("inventory.dashboard.toast_out_of_stock_desc", "{n} more item(s) just ran out of stock.").replace("{n}", String(newOutages)),
      });
    } else if (newCritical > 0) {
      toast.warning(t("inventory.dashboard.toast_critical", "Low stock alert"), {
        description: t("inventory.dashboard.toast_critical_desc", "{n} more item(s) dropped below safety stock.").replace("{n}", String(newCritical)),
      });
    }
  }, [counts, t]);
}

export function StockAlertCenter({
  alerts,
  canFinance,
  loading,
  t,
}: {
  alerts: InventoryAnalytics["alerts"] | undefined;
  canFinance: boolean;
  loading: boolean;
  t: Translate;
}) {
  const [filter, setFilter] = React.useState<AlertSeverity | "all">("all");
  useShortageToasts(alerts?.counts, t);

  const counts = alerts?.counts ?? { out_of_stock: 0, critical: 0, reorder: 0, overstock: 0 };
  const urgent = counts.out_of_stock + counts.critical + counts.reorder;
  const items: StockAlert[] = (alerts?.items ?? []).filter((a) => filter === "all" || a.severity === filter);
  const worst = SEVERITY_ORDER.find((s) => counts[s] > 0 && s !== "overstock");

  if (loading && !alerts) {
    return <div className="h-40 animate-pulse rounded-[2rem] border border-border/40 bg-card/30" />;
  }

  return (
    <section
      className={cn(
        "rounded-[2rem] border p-6 backdrop-blur-md shadow-sm",
        worst === "out_of_stock"
          ? "border-rose-500/40 bg-rose-500/[0.06]"
          : worst
            ? "border-amber-500/40 bg-amber-500/[0.06]"
            : "border-emerald-500/30 bg-emerald-500/[0.05]"
      )}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "rounded-2xl p-2.5",
              worst === "out_of_stock" ? "bg-rose-500/15" : worst ? "bg-amber-500/15" : "bg-emerald-500/15"
            )}
          >
            {worst ? (
              <AlertTriangle className={cn("h-5 w-5", worst === "out_of_stock" ? "text-rose-500" : "text-amber-500")} />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight">
              {urgent > 0
                ? t("inventory.dashboard.alerts_title", "{n} item(s) need action").replace("{n}", String(urgent))
                : t("inventory.dashboard.alerts_clear", "All stock levels are healthy")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("inventory.dashboard.alerts_desc", "Measured against each item's reorder level, safety stock and recent usage.")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label={t("inventory.dashboard.alerts_filter", "Filter alerts")}>
          <button
            type="button"
            onClick={() => setFilter("all")}
            aria-pressed={filter === "all"}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-bold transition",
              filter === "all" ? "border-foreground/40 bg-foreground/10" : "border-border/60 text-muted-foreground hover:text-foreground"
            )}
          >
            {t("inventory.dashboard.alerts_all", "All")} · {counts.out_of_stock + counts.critical + counts.reorder + counts.overstock}
          </button>
          {SEVERITY_ORDER.map((severity) => {
            const Icon = SEVERITY_STYLE[severity].icon;
            return (
              <button
                key={severity}
                type="button"
                onClick={() => setFilter(filter === severity ? "all" : severity)}
                aria-pressed={filter === severity}
                disabled={counts[severity] === 0}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition disabled:opacity-40",
                  SEVERITY_STYLE[severity].chip,
                  filter === severity && "ring-2 ring-offset-1 ring-offset-background ring-current"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {severityLabel(t, severity)} · {counts[severity]}
              </button>
            );
          })}
        </div>
      </div>

      {items.length > 0 ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                <th className="py-2 pr-3 font-semibold">{t("inventory.dashboard.col_item", "Item")}</th>
                <th className="py-2 pr-3 font-semibold">{t("inventory.dashboard.col_status", "Status")}</th>
                <th className="py-2 pr-3 text-right font-semibold">{t("inventory.dashboard.col_available", "Available")}</th>
                <th className="py-2 pr-3 text-right font-semibold">{t("inventory.dashboard.col_reorder_at", "Reorder at")}</th>
                <th className="py-2 pr-3 text-right font-semibold">{t("inventory.dashboard.col_cover", "Days of cover")}</th>
                <th className="py-2 pr-3 text-right font-semibold">{t("inventory.dashboard.col_suggested", "Suggested order")}</th>
                <th className="py-2 pr-3 font-semibold">{t("inventory.dashboard.col_supplier", "Supplier")}</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 10).map((alert) => (
                <tr key={`${alert.source}-${alert.id}`} className="border-b border-border/30 last:border-0">
                  <td className="py-2.5 pr-3">
                    <p className="font-bold">{alert.name}</p>
                    {alert.sku ? <p className="font-mono text-[11px] text-muted-foreground">{alert.sku}</p> : null}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wide", SEVERITY_STYLE[alert.severity].badge)}>
                      {severityLabel(t, alert.severity)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                    {qty(alert.available)} <span className="text-[11px] text-muted-foreground">{alert.uom ?? ""}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-muted-foreground">{qty(alert.reorder_level)}</td>
                  <td
                    className={cn(
                      "py-2.5 pr-3 text-right font-mono font-bold tabular-nums",
                      alert.days_of_cover != null && alert.days_of_cover < 3 ? "text-rose-500" : alert.days_of_cover != null && alert.days_of_cover < 7 ? "text-amber-500" : ""
                    )}
                  >
                    {alert.days_of_cover == null ? "—" : `${qty(alert.days_of_cover)}d`}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                    {alert.severity === "overstock" ? "—" : qty(alert.suggested_order_qty)}
                    {canFinance && alert.suggested_order_value ? (
                      <p className="text-[11px] text-muted-foreground">ETB {qty(alert.suggested_order_value)}</p>
                    ) : null}
                  </td>
                  <td className="py-2.5 pr-3">
                    {alert.supplier_name ? (
                      <span className="flex items-center gap-1.5 text-xs">
                        <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                        {alert.supplier_name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex justify-end">
            <Link href="/dashboard/inventory/reorder-basis" className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              {t("inventory.dashboard.alerts_open_reorder", "Open reorder planning")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
