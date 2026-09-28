"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Boxes, CheckCircle2, Clock3, Route } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import { logisticsApi } from "@/modules/logistics/api";
import type { LogisticsOverview } from "@/modules/logistics/types";
import { useTranslation } from "@/store/use-translation";

export default function LogisticsOverviewPage() {
  const { t } = useTranslation();
  const { hasAnyPermission, isLoaded } = usePermissions();
  const canCreate = isLoaded && hasAnyPermission(["create_logistics_jobs", "manage_logistics"]);
  const query = useQuery({ queryKey: ["logistics", "overview"], queryFn: () => logisticsApi.overview().then((response) => response.data.data as LogisticsOverview) });
  const data = query.data;
  const metrics: Array<{ label: string; value: number; Icon: LucideIcon }> = data ? [
    { label: t("logistics.metrics.total", "Total jobs"), value: data.total_jobs, Icon: Boxes },
    { label: t("logistics.metrics.draft", "Draft"), value: data.draft_jobs, Icon: Clock3 },
    { label: t("logistics.metrics.active", "Active movements"), value: data.active_jobs, Icon: Route },
    { label: t("logistics.metrics.completed", "Completed"), value: data.completed_jobs, Icon: CheckCircle2 },
  ] : [];
  return <main className="space-y-6" data-tour="logistics-overview">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-5">
      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">{t("logistics.eyebrow", "Forwarding control desk")}</p><h1 className="mt-1 text-3xl font-black tracking-tight">{t("logistics.overview.title", "Logistics overview")}</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("logistics.overview.subtitle", "One operational record for every customer movement, from origin to destination.")}</p></div>
      {canCreate ? <Button asChild className="min-h-11 bg-teal-700 text-white hover:bg-teal-800"><Link href="/dashboard/logistics/jobs/create">{t("logistics.actions.new_job", "New forwarding job")}<ArrowRight aria-hidden="true" /></Link></Button> : null}
    </header>
    {query.isLoading ? <p role="status">{t("logistics.loading", "Loading logistics operations…")}</p> : query.isError ? <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">{t("logistics.errors.overview", "Logistics metrics could not be loaded.")}</p> : data ? <>
      <section aria-labelledby="logistics-kpis" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><h2 id="logistics-kpis" className="sr-only">{t("logistics.overview.kpis", "Job counts")}</h2>{metrics.map(({ label, value, Icon }) => <article key={label} className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"><Icon aria-hidden="true" className="h-5 w-5 text-teal-700 dark:text-teal-300" /><p className="mt-5 text-3xl font-black tabular-nums">{value}</p><h3 className="mt-1 text-sm font-medium text-muted-foreground">{label}</h3></article>)}</section>
      <section aria-labelledby="recent-logistics-jobs" className="rounded-2xl border border-border/70 bg-card p-5"><div className="flex items-center justify-between gap-3"><h2 id="recent-logistics-jobs" className="text-lg font-bold">{t("logistics.overview.recent", "Recent forwarding jobs")}</h2><Link className="min-h-11 content-center text-sm font-semibold text-teal-700 underline-offset-4 hover:underline dark:text-teal-300" href="/dashboard/logistics/jobs">{t("logistics.actions.view_all", "View all jobs")}</Link></div>{data.recent_jobs.length === 0 ? <p className="mt-5 rounded-xl bg-muted/50 p-5 text-sm text-muted-foreground">{t("logistics.empty.no_jobs", "No forwarding jobs yet. Create the first job to begin planning its route.")}</p> : <ul className="mt-4 divide-y divide-border/60">{data.recent_jobs.map((job) => <li key={job.id}><Link href={`/dashboard/logistics/jobs/${job.id}`} className="flex min-h-14 items-center justify-between gap-4 rounded-lg px-2 py-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span><span className="font-mono text-sm font-bold">{job.job_number}</span><span className="ml-3 text-sm text-muted-foreground">{job.customer?.name}</span></span><span className="rounded-full bg-teal-950 px-3 py-1 text-xs font-semibold text-teal-50">{t(`logistics.status.${job.status}`, job.status.replaceAll("_", " "))}</span></Link></li>)}</ul>}</section>
    </> : null}
  </main>;
}
