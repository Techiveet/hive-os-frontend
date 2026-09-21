"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertOctagon, BellRing, ClockAlert, PackageCheck, RadioTower, Route } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { logisticsApi } from "@/modules/logistics/api";
import type { CommandCenterMetrics } from "@/modules/logistics/types";
import { useTranslation } from "@/store/use-translation";
import { useLogisticsOperationsRealtime } from "@/modules/logistics/use-logistics-operations-realtime";

export default function LogisticsCommandCenterPage() {
  const { t } = useTranslation();
  const query = useQuery({ queryKey: ["logistics", "command-center"], queryFn: () => logisticsApi.commandCenter().then((response) => response.data.data as CommandCenterMetrics) });
  useLogisticsOperationsRealtime(() => { void query.refetch(); });
  const data = query.data;
  const cards: Array<{ key: string; value: number; Icon: LucideIcon; href?: string; danger?: boolean }> = data ? [
    { key: "active_jobs", value: data.active_jobs, Icon: Route, href: "/dashboard/logistics/control-tower" },
    { key: "in_transit_jobs", value: data.in_transit_jobs, Icon: RadioTower, href: "/dashboard/logistics/control-tower" },
    { key: "arriving_next_48_hours", value: data.arriving_next_48_hours, Icon: PackageCheck },
    { key: "at_risk_milestones", value: data.at_risk_milestones, Icon: ClockAlert, danger: data.at_risk_milestones > 0 },
    { key: "active_alerts", value: data.active_alerts, Icon: BellRing, danger: data.active_alerts > 0 },
    { key: "critical_exceptions", value: data.critical_exceptions, Icon: AlertOctagon, href: "/dashboard/logistics/exceptions", danger: data.critical_exceptions > 0 },
  ] : [];
  return <main className="space-y-6" data-tour="logistics-command-center">
    <header className="border-b border-border/60 pb-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">{t("logistics.command_center.eyebrow", "Network health")}</p><h1 className="mt-1 text-3xl font-black tracking-tight">{t("logistics.command_center.title", "Logistics Command Center")}</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("logistics.command_center.subtitle", "A tenant-scoped operational picture built from real jobs, milestones, alerts, and managed exceptions.")}</p></header>
    {query.isLoading ? <p role="status">{t("logistics.loading", "Loading logistics operations…")}</p> : query.isError ? <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">{t("logistics.errors.command_center", "Command Center could not be loaded.")}</p> : data ? <>
      <section aria-labelledby="command-kpis" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><h2 id="command-kpis" className="sr-only">{t("logistics.command_center.kpis", "Operational health indicators")}</h2>{cards.map(({ key, value, Icon, href, danger }) => { const body = <><Icon aria-hidden="true" className={`h-5 w-5 ${danger ? "text-red-700 dark:text-red-300" : "text-teal-700 dark:text-teal-300"}`} /><p className="mt-5 text-3xl font-black tabular-nums">{value}</p><h3 className="mt-1 text-sm font-medium text-muted-foreground">{t(`logistics.command_center.${key}`, key.replaceAll("_", " "))}</h3></>; return href ? <Link key={key} href={href} className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{body}</Link> : <article key={key} className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">{body}</article>; })}</section>
      <div className="grid gap-4 xl:grid-cols-2"><Breakdown title={t("logistics.command_center.by_severity", "Open exceptions by severity")} values={data.exception_by_severity} t={t} /><Breakdown title={t("logistics.command_center.by_category", "Open exceptions by category")} values={data.exception_by_category} t={t} /></div>
      <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{t("logistics.command_center.predictive_foundation", "Predictive ETA foundation only: confidence and ETA history are stored, but no unvalidated machine-learning prediction is presented as fact.")}</p>
    </> : null}
  </main>;
}

function Breakdown({ title, values, t }: { title: string; values: Record<string, number>; t: (key: string, fallback?: string) => string }) {
  const maximum = Math.max(1, ...Object.values(values));
  return <section aria-labelledby={title.replaceAll(" ", "-")} className="rounded-2xl border border-border/70 bg-card p-5"><h2 id={title.replaceAll(" ", "-")} className="text-lg font-bold">{title}</h2>{Object.keys(values).length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{t("logistics.empty.no_open_exceptions", "No open exceptions.")}</p> : <ul className="mt-4 space-y-3">{Object.entries(values).map(([label, value]) => <li key={label}><div className="flex justify-between gap-3 text-sm"><span>{t(`logistics.exception_labels.${label}`, label.replaceAll("_", " "))}</span><span className="font-bold tabular-nums">{value}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.max(4, (value / maximum) * 100)}%` }} /></div></li>)}</ul>}</section>;
}
