"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertOctagon, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { logisticsApi } from "@/modules/logistics/api";
import type { LogisticsException, LogisticsPageMeta } from "@/modules/logistics/types";
import { useTranslation } from "@/store/use-translation";
import { useLogisticsOperationsRealtime } from "@/modules/logistics/use-logistics-operations-realtime";

type ExceptionResponse = { data: LogisticsException[]; meta: LogisticsPageMeta };
const severityClass: Record<string, string> = {
  critical: "border-red-500 bg-red-100 text-red-950 dark:bg-red-950/60 dark:text-red-100",
  high: "border-orange-500 bg-orange-100 text-orange-950 dark:bg-orange-950/60 dark:text-orange-100",
  medium: "border-amber-500 bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100",
  low: "border-blue-500 bg-blue-100 text-blue-950 dark:bg-blue-950/60 dark:text-blue-100",
  info: "border-slate-400 bg-slate-100 text-slate-950 dark:bg-slate-900 dark:text-slate-100",
};

export default function LogisticsExceptionsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("open");
  const query = useQuery({ queryKey: ["logistics", "exceptions", search, status], queryFn: () => logisticsApi.exceptions({ search: search || undefined, status: status || undefined }).then((response) => response.data as ExceptionResponse) });
  useLogisticsOperationsRealtime(() => { void query.refetch(); });
  const exceptions = query.data?.data ?? [];
  return <main className="space-y-6" data-tour="logistics-exceptions">
    <header className="border-b border-border/60 pb-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">{t("logistics.exceptions.eyebrow", "Managed recovery")}</p><h1 className="mt-1 text-3xl font-black tracking-tight">{t("logistics.exceptions.title", "Operational exceptions")}</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("logistics.exceptions.subtitle", "Assign, investigate, escalate, resolve, and audit disruptions without overwriting their source evidence.")}</p></header>
    <section aria-labelledby="exception-filters" className="grid gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:grid-cols-[1fr_14rem]"><h2 id="exception-filters" className="sr-only">{t("logistics.exceptions.filters", "Exception filters")}</h2><label className="text-sm font-medium" htmlFor="exception-search">{t("logistics.fields.search", "Search")}<span className="relative mt-1 block"><Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="exception-search" className="min-h-11 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("logistics.exceptions.search_placeholder", "Exception or job number")} /></span></label><label className="text-sm font-medium" htmlFor="exception-status">{t("logistics.fields.status", "Status")}<select id="exception-status" className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t("logistics.status.all", "All statuses")}</option>{["open", "acknowledged", "in_progress", "waiting_external", "escalated", "resolved", "closed"].map((value) => <option value={value} key={value}>{t(`logistics.status.${value}`, value.replaceAll("_", " "))}</option>)}</select></label></section>
    {query.isLoading ? <p role="status">{t("logistics.loading", "Loading logistics operations…")}</p> : query.isError ? <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">{t("logistics.errors.exceptions", "Operational exceptions could not be loaded.")}</p> : exceptions.length === 0 ? <section className="rounded-2xl border border-dashed border-border p-8 text-center"><AlertOctagon aria-hidden="true" className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-3 font-bold">{t("logistics.empty.exceptions_title", "No matching exceptions")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("logistics.empty.exceptions_description", "There are no exceptions for these filters.")}</p></section> : <ul className="grid gap-3">{exceptions.map((item) => <li key={item.id}><Link href={`/dashboard/logistics/exceptions/${item.id}`} className="grid gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm hover:border-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid-cols-[12rem_1fr_10rem] md:items-center"><div><span className="font-mono text-sm font-bold">{item.exception_number}</span><span className="mt-1 block text-xs text-muted-foreground">{item.job?.job_number}</span></div><div><p className="font-semibold">{t(`logistics.exception_labels.${item.category}`, item.category.replaceAll("_", " "))}</p><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.action_required}</p></div><div className="flex flex-wrap gap-2 md:justify-end"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${severityClass[item.severity] ?? severityClass.info}`}><AlertOctagon aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />{t(`logistics.severity.${item.severity}`, item.severity)}</span><span className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold">{t(`logistics.status.${item.status}`, item.status.replaceAll("_", " "))}</span></div></Link></li>)}</ul>}
  </main>;
}
