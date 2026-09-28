"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CircleHelp, Clock3, RadioTower, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTour } from "@/components/providers/tour-provider";
import { Input } from "@/components/ui/input";
import { logisticsApi } from "@/modules/logistics/api";
import type { ControlTowerJob } from "@/modules/logistics/types";
import { useTranslation } from "@/store/use-translation";
import { useLogisticsOperationsRealtime } from "@/modules/logistics/use-logistics-operations-realtime";

type TowerResponse = { data: ControlTowerJob[]; current_page: number; last_page: number; total: number };
const tone = (job: ControlTowerJob) => job.open_exception_count > 0 || job.overdue_milestone_count > 0
  ? "border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
  : job.active_alert_count > 0
    ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
    : "border-teal-300 bg-teal-50 text-teal-950 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100";
const displayDate = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

export default function LogisticsControlTowerPage() {
  const { t } = useTranslation();
  const { startTour } = useTour();
  const [search, setSearch] = useState("");
  const [attentionOnly, setAttentionOnly] = useState(true);
  const query = useQuery({
    queryKey: ["logistics", "control-tower", search, attentionOnly],
    queryFn: () => logisticsApi.controlTower({ search: search || undefined, attention: attentionOnly ? 1 : undefined }).then((response) => response.data as TowerResponse),
  });
  useLogisticsOperationsRealtime(() => { void query.refetch(); });
  const jobs = query.data?.data ?? [];
  const startControlTowerTour = () => startTour([
    { target: "[data-tour='logistics-control-tower']", title: t("logistics.tours.control_tower_title", "Operations Control Tower"), content: t("logistics.tours.control_tower_description", "See every active movement through current ETA, tracking freshness, milestones, alerts, and open exceptions."), placement: "bottom" as const, skipBeacon: true },
    { target: "[data-tour='logistics-control-tower-filters']", title: t("logistics.tours.control_tower_filters_title", "Focus the desk"), content: t("logistics.tours.control_tower_filters_description", "Search a job or keep attention-only enabled to prioritize movements with operational risk."), placement: "bottom" as const, skipBeacon: true },
    { target: "[data-tour='logistics-command-center-link']", title: t("logistics.tours.command_center_title", "Open the Command Center"), content: t("logistics.tours.command_center_description", "Move from job-level triage to tenant-wide operational KPIs and exception trends."), placement: "bottom" as const, skipBeacon: true },
  ]);

  return <main className="space-y-6" data-tour="logistics-control-tower">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">{t("logistics.control_tower.eyebrow", "Live operations desk")}</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{t("logistics.control_tower.title", "Control Tower")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("logistics.control_tower.subtitle", "Prioritize active movements using milestone risk, exceptions, ETA changes, and tracking freshness.")}</p>
      </div>
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={startControlTowerTour}><CircleHelp aria-hidden="true" />{t("logistics.actions.start_control_tower_tour", "Control Tower tour")}</Button><Button asChild variant="outline"><Link data-tour="logistics-command-center-link" href="/dashboard/logistics/command-center">{t("logistics.actions.open_command_center", "Open Command Center")}<ArrowRight aria-hidden="true" /></Link></Button></div>
    </header>

    <section aria-labelledby="tower-filters" data-tour="logistics-control-tower-filters" className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <h2 id="tower-filters" className="sr-only">{t("logistics.control_tower.filters", "Control Tower filters")}</h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm font-medium" htmlFor="tower-search">{t("logistics.fields.search", "Search jobs")}<span className="relative mt-1 block"><Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="tower-search" className="min-h-11 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("logistics.control_tower.search_placeholder", "Job number or external reference")} /></span></label>
        <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 text-sm font-medium"><input type="checkbox" checked={attentionOnly} onChange={(event) => setAttentionOnly(event.target.checked)} className="h-4 w-4" />{t("logistics.control_tower.attention_only", "Needs attention only")}</label>
      </div>
    </section>

    {query.isLoading ? <p role="status">{t("logistics.loading", "Loading logistics operations…")}</p> : query.isError ? <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">{t("logistics.errors.control_tower", "Control Tower could not be loaded.")}</p> : jobs.length === 0 ? <section className="rounded-2xl border border-dashed border-border p-8 text-center"><RadioTower aria-hidden="true" className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-3 font-bold">{t("logistics.empty.control_tower_title", "No movements need attention")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("logistics.empty.control_tower_description", "Change the filters to review stable movements.")}</p></section> : <>
      <ul className="grid gap-3 lg:hidden" aria-label={t("logistics.control_tower.results", "Control Tower movements")}>{jobs.map((job) => <li key={job.id} className={`rounded-2xl border p-4 ${tone(job)}`}>
        <div className="flex items-start justify-between gap-3"><div><Link href={`/dashboard/logistics/jobs/${job.id}?tab=tracking`} className="font-mono font-bold underline-offset-4 hover:underline">{job.job_number}</Link><p className="mt-1 text-sm">{job.customer?.name ?? "—"}</p></div><span className="rounded-full border border-current/20 px-2 py-1 text-xs font-semibold">{t(`logistics.status.${job.status}`, job.status.replaceAll("_", " "))}</span></div>
        <p className="mt-4 text-sm font-medium">{job.origin_node?.name ?? "—"} <span aria-hidden="true">→</span> <span className="sr-only">{t("logistics.fields.to", "to")}</span> {job.destination_node?.name ?? "—"}</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-current/70">{t("logistics.fields.latest_eta", "Latest ETA")}</dt><dd className="mt-1 font-semibold">{displayDate(job.latest_eta_at ?? job.planned_arrival_at)}</dd></div><div><dt className="text-current/70">{t("logistics.fields.last_signal", "Last signal")}</dt><dd className="mt-1 font-semibold">{displayDate(job.last_tracking_event_at)}</dd></div></dl>
        <p className="mt-4 flex flex-wrap gap-2 text-xs font-semibold"><span><AlertTriangle aria-hidden="true" className="mr-1 inline h-4 w-4" />{job.open_exception_count} {t("logistics.fields.exceptions", "exceptions")}</span><span><Clock3 aria-hidden="true" className="mr-1 inline h-4 w-4" />{job.overdue_milestone_count} {t("logistics.fields.overdue", "overdue")}</span></p>
      </li>)}</ul>
      <div className="hidden overflow-x-auto rounded-2xl border border-border/70 bg-card lg:block"><table className="w-full text-left text-sm"><caption className="sr-only">{t("logistics.control_tower.caption", "Active forwarding jobs with route, ETA, tracking freshness, and attention signals")}</caption><thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th scope="col" className="px-4 py-3">{t("logistics.fields.job", "Job")}</th><th scope="col" className="px-4 py-3">{t("logistics.fields.route", "Route")}</th><th scope="col" className="px-4 py-3">{t("logistics.fields.latest_eta", "Latest ETA")}</th><th scope="col" className="px-4 py-3">{t("logistics.fields.last_signal", "Last signal")}</th><th scope="col" className="px-4 py-3">{t("logistics.fields.attention", "Attention")}</th></tr></thead><tbody className="divide-y divide-border/60">{jobs.map((job) => <tr key={job.id} className="hover:bg-muted/30"><th scope="row" className="px-4 py-4"><Link href={`/dashboard/logistics/jobs/${job.id}?tab=tracking`} className="font-mono font-bold text-teal-700 underline-offset-4 hover:underline dark:text-teal-300">{job.job_number}</Link><span className="mt-1 block font-normal text-muted-foreground">{job.customer?.name ?? "—"}</span></th><td className="px-4 py-4">{job.origin_node?.name ?? "—"} <span aria-hidden="true">→</span> {job.destination_node?.name ?? "—"}<span className="mt-1 block text-xs text-muted-foreground">{job.primary_transport_mode?.name ?? "—"}</span></td><td className="px-4 py-4 tabular-nums">{displayDate(job.latest_eta_at ?? job.planned_arrival_at)}</td><td className="px-4 py-4 tabular-nums">{displayDate(job.last_tracking_event_at)}</td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(job)}`}><AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />{job.open_exception_count} / {job.overdue_milestone_count} / {job.active_alert_count}</span><span className="sr-only">{t("logistics.control_tower.attention_summary", "exceptions, overdue milestones, active alerts")}</span></td></tr>)}</tbody></table></div>
    </>}
  </main>;
}
