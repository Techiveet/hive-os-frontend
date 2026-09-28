"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { logisticsApi } from "@/modules/logistics/api";
import type { ForwardingJob } from "@/modules/logistics/types";
import { useTranslation } from "@/store/use-translation";

export default function LogisticsJobsPage() {
  const { t } = useTranslation();
  const { hasAnyPermission, isLoaded } = usePermissions();
  const canCreate = isLoaded && hasAnyPermission(["create_logistics_jobs", "manage_logistics"]);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [page, setPage] = React.useState(1);
  const query = useQuery({ queryKey: ["logistics", "jobs", search, status, page], queryFn: () => logisticsApi.jobs({ search: search || undefined, status: status || undefined, page }).then((response) => response.data) });
  const jobs = (query.data?.data ?? []) as ForwardingJob[];
  const meta = query.data?.meta as { current_page?: number; last_page?: number; total?: number } | undefined;
  const currentPage = meta?.current_page ?? page;
  const lastPage = meta?.last_page ?? 1;

  return <main className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">{t("logistics.eyebrow", "Forwarding control desk")}</p><h1 className="mt-1 text-3xl font-black tracking-tight">{t("logistics.jobs.title", "Forwarding jobs")}</h1><p className="mt-1 text-sm text-muted-foreground">{t("logistics.jobs.subtitle", "Search, filter, and open tenant-owned movements.")}</p></div>{canCreate ? <Button asChild className="min-h-11"><Link href="/dashboard/logistics/jobs/create"><Plus aria-hidden="true" />{t("logistics.actions.new_job", "New forwarding job")}</Link></Button> : null}</header>
    <section aria-labelledby="job-filters" className="grid gap-4 rounded-2xl border bg-card p-4 md:grid-cols-[minmax(15rem,1fr)_14rem]">
      <h2 id="job-filters" className="sr-only">{t("logistics.jobs.filters", "Job filters")}</h2>
      <div><Label htmlFor="logistics-search">{t("logistics.fields.search", "Search jobs")}</Label><div className="relative mt-1"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground" /><Input id="logistics-search" className="min-h-11 pl-10" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t("logistics.jobs.search_placeholder", "Job number or customer")} /></div></div>
      <div><Label htmlFor="logistics-status">{t("logistics.fields.status", "Status")}</Label><NativeSelect id="logistics-status" className="mt-1 min-h-11" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">{t("logistics.status.all", "All statuses")}</option>{["draft", "planned", "active", "in_transit", "arrived", "completed", "cancelled"].map((value) => <option key={value} value={value}>{t(`logistics.status.${value}`, value.replaceAll("_", " "))}</option>)}</NativeSelect></div>
    </section>
    <section aria-labelledby="job-results" className="overflow-hidden rounded-2xl border bg-card"><h2 id="job-results" className="sr-only">{t("logistics.jobs.results", "Forwarding job results")}</h2>{query.isLoading ? <p className="p-5" role="status">{t("logistics.loading", "Loading logistics operations…")}</p> : query.isError ? <p className="p-5 text-destructive" role="alert">{t("logistics.errors.jobs", "Forwarding jobs could not be loaded.")}</p> : jobs.length === 0 ? <p className="p-5 text-muted-foreground">{t("logistics.empty.filtered", "No jobs match these filters.")}</p> : <><div className="overflow-x-auto"><Table><caption className="sr-only">{t("logistics.jobs.caption", "Forwarding jobs with customer, route, status, planned departure, planned arrival, and responsible employee")}</caption><TableHeader><TableRow><TableHead scope="col">{t("logistics.fields.job", "Job")}</TableHead><TableHead scope="col">{t("logistics.fields.customer", "Customer")}</TableHead><TableHead scope="col">{t("logistics.fields.route", "Route")}</TableHead><TableHead scope="col">{t("logistics.fields.status", "Status")}</TableHead><TableHead scope="col">{t("logistics.fields.departure", "Planned departure")}</TableHead><TableHead scope="col">{t("logistics.fields.arrival", "Planned arrival")}</TableHead><TableHead scope="col">{t("logistics.fields.responsible", "Responsible employee")}</TableHead></TableRow></TableHeader><TableBody>{jobs.map((job) => <TableRow key={job.id}><TableCell><Link className="inline-flex min-h-11 items-center font-mono font-bold text-teal-700 underline-offset-4 hover:underline dark:text-teal-300" href={`/dashboard/logistics/jobs/${job.id}`}>{job.job_number}</Link></TableCell><TableCell>{job.customer?.name ?? "—"}</TableCell><TableCell>{job.origin_node?.code ?? "—"} → {job.destination_node?.code ?? "—"}</TableCell><TableCell><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{t(`logistics.status.${job.status}`, job.status.replaceAll("_", " "))}</span></TableCell><TableCell>{job.planned_departure_at ? new Date(job.planned_departure_at).toLocaleString() : "—"}</TableCell><TableCell>{job.planned_arrival_at ? new Date(job.planned_arrival_at).toLocaleString() : "—"}</TableCell><TableCell>{job.responsible_employee?.primary_name ?? "—"}</TableCell></TableRow>)}</TableBody></Table></div><nav aria-label={t("logistics.jobs.pagination", "Forwarding jobs pagination")} className="flex flex-wrap items-center justify-between gap-3 border-t p-4"><p className="text-sm text-muted-foreground">{t("logistics.jobs.page", "Page")} {currentPage} {t("logistics.jobs.of", "of")} {lastPage} · {meta?.total ?? jobs.length} {t("logistics.jobs.records", "records")}</p><div className="flex gap-2"><Button type="button" variant="outline" className="min-h-11" disabled={currentPage <= 1 || query.isFetching} onClick={() => setPage((value) => Math.max(1, value - 1))}>{t("common.previous", "Previous")}</Button><Button type="button" variant="outline" className="min-h-11" disabled={currentPage >= lastPage || query.isFetching} onClick={() => setPage((value) => Math.min(lastPage, value + 1))}>{t("common.next", "Next")}</Button></div></nav></>}</section>
  </main>;
}
