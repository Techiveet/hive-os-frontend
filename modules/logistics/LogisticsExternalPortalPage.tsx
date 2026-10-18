"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Box, Clock3, Download, MapPin, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logisticsApi } from "@/modules/logistics/api";
import { useTranslation } from "@/store/use-translation";

type Portal = "customer" | "partner";
type Job = { id: number; job_number: string; customer_reference?: string | null; status: string; origin?: string | null; destination?: string | null; mode?: string | null; latest_eta_at?: string | null; actual_arrival_at?: string | null };

export default function LogisticsExternalPortalPage({ portal }: { portal: Portal }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [eventCode, setEventCode] = useState("provider_update");
  const [description, setDescription] = useState("");
  const list = useQuery({ queryKey: ["logistics", "portal", portal], queryFn: async () => {
    const response = portal === "customer" ? await logisticsApi.customerPortalJobs() : await logisticsApi.partnerPortalJobs();
    return response.data.data?.data as Job[];
  }});
  const detail = useQuery({ queryKey: ["logistics", "portal", portal, selectedId], enabled: selectedId !== null, queryFn: async () => {
    const response = portal === "customer" ? await logisticsApi.customerPortalJob(selectedId!) : await logisticsApi.partnerPortalJob(selectedId!);
    return response.data.data;
  }});
  const submit = useMutation({ mutationFn: () => logisticsApi.submitPartnerEvent(selectedId!, { event_code: eventCode, event_at: new Date().toISOString(), description: description || undefined }), onSuccess: () => {
    setDescription("");
    client.invalidateQueries({ queryKey: ["logistics", "portal", portal, selectedId] });
  }});
  const download = useMutation({ mutationFn: async (document: any) => {
    const response = await logisticsApi.customerPortalDocument(selectedId!, document.id, document.latest_version_id);
    const url = URL.createObjectURL(response.data);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = document.number || "freight-document";
    anchor.click();
    URL.revokeObjectURL(url);
  }});
  const title = portal === "customer" ? t("logistics.portal.customer_title", "Shipment visibility") : t("logistics.portal.partner_title", "Assigned operations");
  const subtitle = portal === "customer" ? t("logistics.portal.customer_subtitle", "Track only the shipments and customer-safe records assigned to your account.") : t("logistics.portal.partner_subtitle", "Update only the jobs and legs assigned to your provider account.");
  return <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
    <header className="border-b border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/90"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300">Hive Logistics</p><h1 className="text-2xl font-black">{title}</h1></div><span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"><ShieldCheck aria-hidden className="h-4 w-4 text-teal-700 dark:text-teal-300"/>{t("logistics.portal.scoped_access", "Scoped access")}</span></div></header>
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,.8fr)]"><section aria-labelledby="shipments-heading"><div className="mb-4"><h2 id="shipments-heading" className="text-xl font-bold">{title}</h2><p className="text-sm text-slate-600 dark:text-slate-300">{subtitle}</p></div>
      {list.isLoading ? <p role="status" className="rounded-xl border p-5">{t("logistics.loading", "Loading logistics operations…")}</p> : list.isError ? <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-5">{t("logistics.portal.denied", "Portal access is unavailable or not assigned.")}</p> : !list.data?.length ? <p className="rounded-xl border border-dashed p-6 text-sm text-slate-600 dark:text-slate-300">{t("logistics.portal.empty", "No assigned shipments are available.")}</p> : <ul className="grid gap-3">{list.data.map((job) => <li key={job.id}><button type="button" onClick={() => setSelectedId(job.id)} className="w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:bg-slate-900"><span className="flex items-start justify-between gap-4"><span><span className="block font-bold">{job.job_number}</span><span className="mt-1 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><MapPin aria-hidden className="h-4 w-4"/>{job.origin || "—"} <ArrowRight aria-hidden className="h-4 w-4"/> {job.destination || "—"}</span></span><span className="rounded-full bg-teal-700 px-3 py-1 text-xs font-bold text-white">{job.status}</span></span><span className="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400"><span>{job.mode || "MULTIMODAL"}</span><span className="flex items-center gap-1"><Clock3 aria-hidden className="h-3.5 w-3.5"/>{job.latest_eta_at ? new Date(job.latest_eta_at).toLocaleString() : t("logistics.portal.eta_pending", "ETA pending")}</span></span></button></li>)}</ul>}
    </section>
    <aside aria-labelledby="shipment-detail-heading" className="self-start rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900"><h2 id="shipment-detail-heading" className="text-xl font-bold">{t("logistics.portal.detail", "Shipment detail")}</h2>{selectedId === null ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{t("logistics.portal.select", "Select a shipment to view its safe operational detail.")}</p> : detail.isLoading ? <p role="status" className="mt-3">{t("logistics.loading", "Loading logistics operations…")}</p> : detail.isError ? <p role="alert" className="mt-3 text-red-700 dark:text-red-300">{t("logistics.portal.detail_denied", "This shipment is not available to your account.")}</p> : detail.data ? <div className="mt-4 space-y-5"><dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-slate-500 dark:text-slate-400">{t("logistics.fields.job_number", "Job number")}</dt><dd className="font-bold">{detail.data.job_number}</dd></div><div><dt className="text-slate-500 dark:text-slate-400">{t("logistics.fields.status", "Status")}</dt><dd className="font-bold">{detail.data.status}</dd></div><div><dt className="text-slate-500 dark:text-slate-400">{t("logistics.portal.origin", "Origin")}</dt><dd>{detail.data.origin || "—"}</dd></div><div><dt className="text-slate-500 dark:text-slate-400">{t("logistics.portal.destination", "Destination")}</dt><dd>{detail.data.destination || "—"}</dd></div></dl>
        <section aria-labelledby="milestones-heading"><h3 id="milestones-heading" className="font-bold">{t("logistics.portal.milestones", "Milestones")}</h3><ol className="mt-2 space-y-2 border-l border-slate-300 pl-4 dark:border-slate-700">{(detail.data.milestones ?? []).map((milestone: any) => <li key={milestone.id}><p className="text-sm font-semibold">{milestone.name_snapshot}</p><p className="text-xs text-slate-500 dark:text-slate-400">{milestone.status} · {milestone.actual_at || milestone.estimated_at || milestone.planned_at || "—"}</p></li>)}</ol></section>
        {portal === "customer" ? <section aria-labelledby="documents-heading"><h3 id="documents-heading" className="font-bold">{t("logistics.portal.documents", "Available documents")}</h3>{detail.data.documents?.length ? <ul className="mt-2 space-y-2">{detail.data.documents.map((document: any) => <li key={document.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"><span className="flex items-center gap-2"><Box aria-hidden className="h-4 w-4"/>{document.type || document.number || t("logistics.portal.document", "Document")}</span>{document.latest_version_id ? <Button type="button" variant="ghost" size="sm" onClick={() => download.mutate(document)} disabled={download.isPending}><Download aria-hidden/>{t("logistics.portal.download", "Download")}</Button> : null}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("logistics.portal.no_documents", "No customer-visible documents are available.")}</p>}{download.isError ? <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{t("logistics.portal.download_failed", "The document could not be downloaded.")}</p> : null}</section> : <form onSubmit={(event: FormEvent) => {event.preventDefault(); submit.mutate();}} className="space-y-3 rounded-xl border p-4"><h3 className="font-bold">{t("logistics.portal.submit_update", "Submit operational update")}</h3><label htmlFor="partner-event-code" className="block text-sm font-medium">{t("logistics.portal.event_code", "Event code")}<Input id="partner-event-code" value={eventCode} onChange={(event) => setEventCode(event.target.value)} className="mt-1 min-h-11"/></label><label htmlFor="partner-description" className="block text-sm font-medium">{t("logistics.portal.description", "Description")}<Input id="partner-description" value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 min-h-11"/></label>{submit.isError ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">{t("logistics.portal.submit_failed", "The update could not be submitted.")}</p> : null}{submit.isSuccess ? <p role="status" className="text-sm text-teal-700 dark:text-teal-300">{t("logistics.portal.submit_success", "Update recorded with partner attribution.")}</p> : null}<Button type="submit" disabled={submit.isPending} className="min-h-11 bg-teal-700 text-white hover:bg-teal-800"><Send aria-hidden/>{t("logistics.portal.submit", "Submit update")}</Button></form>}
      </div> : null}</aside></div>
  </main>;
}
