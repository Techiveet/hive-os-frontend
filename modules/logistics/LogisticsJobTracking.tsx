"use client";

import { FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, CircleHelp, Clock3, MapPin, RadioTower, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTour } from "@/components/providers/tour-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/hooks/use-permissions";
import { logisticsApi } from "@/modules/logistics/api";
import type { TrackingWorkspace } from "@/modules/logistics/types";
import { useTranslation } from "@/store/use-translation";
import { useLogisticsOperationsRealtime } from "@/modules/logistics/use-logistics-operations-realtime";

const dateTime = (value: string | null | undefined) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const localNow = () => { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); };
const localDateTimeToIso = (value: FormDataEntryValue | null) => value ? new Date(String(value)).toISOString() : value;

export function LogisticsJobTracking({ jobId }: { jobId: number }) {
  const { t } = useTranslation();
  const { startTour } = useTour();
  const { hasAnyPermission } = usePermissions();
  const canManage = hasAnyPermission(["manage_logistics_tracking", "manage_logistics"]);
  const canManageMilestones = hasAnyPermission(["manage_logistics_milestones", "manage_logistics"]);
  const canManageEta = hasAnyPermission(["manage_logistics_eta", "manage_logistics"]);
  const canView = hasAnyPermission(["view_logistics_tracking", "view_logistics_milestones", "manage_logistics"]);
  const query = useQuery({ queryKey: ["logistics", "tracking", jobId], queryFn: () => logisticsApi.trackingWorkspace(jobId).then((response) => response.data.data as TrackingWorkspace), enabled: canView });
  const refresh = () => query.refetch();
  useLogisticsOperationsRealtime((event) => {
    if (event.forwarding_job_id === jobId) void refresh();
  });
  const eventMutation = useMutation({ mutationFn: (payload: Record<string, unknown>) => logisticsApi.recordTrackingEvent(jobId, payload), onSuccess: refresh });
  const etaMutation = useMutation({ mutationFn: (payload: Record<string, unknown>) => logisticsApi.recordEta(jobId, payload), onSuccess: refresh });
  const milestoneMutation = useMutation({ mutationFn: ({ id, eventAt }: { id: number; eventAt: string }) => logisticsApi.completeMilestone(jobId, id, { event_at: eventAt }), onSuccess: refresh });
  if (!canView) return null;
  const workspace = query.data;
  const startTrackingTour = () => {
    const steps = [
      { target: "#job-tracking-heading", title: t("logistics.tours.tracking_title", "Shipment tracking workspace"), content: t("logistics.tours.tracking_description", "Follow the route using immutable events, latest ETA history, milestones, and operational exceptions."), visible: true },
      { target: "#milestone-plan-heading", title: t("logistics.tours.milestones_title", "Milestone plan"), content: t("logistics.tours.milestones_description", "Required events are generated from each route leg and surface upcoming, at-risk, overdue, and completed work."), visible: Boolean(workspace) },
      { target: "#timeline-heading", title: t("logistics.tours.timeline_title", "Unified timeline"), content: t("logistics.tours.timeline_description", "Tracking, Customs, documents, equipment, Warehouse/CFS, and Finance evidence is projected in one chronological view without duplicating source records."), visible: Boolean(workspace) },
      { target: "#tracking-event-code", title: t("logistics.tours.event_title", "Record a verified event"), content: t("logistics.tours.event_description", "Authorized operators can add manual evidence. Corrections create a new record instead of rewriting history."), visible: Boolean(workspace) && canManage },
      { target: "#tracking-eta", title: t("logistics.tours.eta_title", "Update ETA"), content: t("logistics.tours.eta_description", "Every ETA update preserves its source and prior value; material delays create a deduplicated exception and alert."), visible: Boolean(workspace) && canManageEta },
    ];
    startTour(steps.filter((step) => step.visible).map((step) => ({ target: step.target, title: step.title, content: step.content, placement: "bottom" as const, skipBeacon: true })));
  };
  const submitEvent = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); eventMutation.mutate({ event_code: form.get("event_code"), event_type: "operational", event_at: localDateTimeToIso(form.get("event_at")), source: "manual", description: form.get("description") }); };
  const submitEta = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); etaMutation.mutate({ eta_at: localDateTimeToIso(form.get("eta_at")), source: "manual", reason: form.get("reason") }); };
  return <section aria-labelledby="job-tracking-heading" className="rounded-2xl border border-border/70 bg-card p-5" data-tour="job-tracking">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="job-tracking-heading" className="flex items-center gap-2 text-lg font-bold"><RadioTower aria-hidden="true" className="text-teal-700 dark:text-teal-300" />{t("logistics.tracking.title", "Tracking and milestones")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("logistics.tracking.subtitle", "Actual events stay immutable; corrections and ETA changes create new history.")}</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={startTrackingTour}><CircleHelp aria-hidden="true" />{t("logistics.actions.start_tracking_tour", "Tracking tour")}</Button><Button type="button" variant="outline" onClick={() => refresh()} disabled={query.isFetching}><RefreshCw aria-hidden="true" className={query.isFetching ? "animate-spin" : ""} />{t("logistics.actions.refresh", "Refresh")}</Button></div></div>
    {query.isLoading ? <p role="status" className="mt-5">{t("logistics.loading", "Loading logistics operations…")}</p> : query.isError || !workspace ? <p role="alert" className="mt-5 text-destructive">{t("logistics.errors.tracking", "Tracking data could not be loaded.")}</p> : <>
      <dl className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-muted/50 p-4"><dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("logistics.fields.original_eta", "Original ETA")}</dt><dd className="mt-1 font-semibold">{dateTime(workspace.job.original_eta_at)}</dd></div><div className="rounded-xl bg-muted/50 p-4"><dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("logistics.fields.latest_eta", "Latest ETA")}</dt><dd className="mt-1 font-semibold">{dateTime(workspace.job.latest_eta_at)}</dd></div><div className="rounded-xl bg-muted/50 p-4"><dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("logistics.fields.last_signal", "Last signal")}</dt><dd className="mt-1 font-semibold">{dateTime(workspace.job.last_tracking_event_at)}</dd></div></dl>
      {workspace.exceptions.length ? <aside aria-labelledby="job-exceptions-heading" className="mt-5 rounded-xl border border-amber-400 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"><h3 id="job-exceptions-heading" className="flex items-center gap-2 font-bold"><AlertTriangle aria-hidden="true" />{t("logistics.tracking.open_exceptions", "Open operational exceptions")}</h3><ul className="mt-2 space-y-2">{workspace.exceptions.map((item) => <li key={item.id}><Link className="font-mono font-semibold underline" href={`/dashboard/logistics/exceptions/${item.id}`}>{item.exception_number}</Link><span className="ml-2 text-sm">{t(`logistics.exception_labels.${item.category}`, item.category.replaceAll("_", " "))}</span></li>)}</ul></aside> : null}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <section aria-labelledby="milestone-plan-heading"><h3 id="milestone-plan-heading" className="font-bold">{t("logistics.milestones.title", "Milestone plan")}</h3>{workspace.milestones.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{t("logistics.empty.milestones", "No milestones are planned for the current route.")}</p> : <ol className="relative mt-4 space-y-1 before:absolute before:bottom-5 before:left-[1.05rem] before:top-5 before:w-px before:bg-border">{workspace.milestones.map((item) => <li key={item.id} className="relative grid grid-cols-[2.25rem_1fr] gap-3 rounded-lg p-2"><span className={`relative z-10 grid h-9 w-9 place-items-center rounded-full border-2 bg-card ${item.status === "completed" ? "border-teal-600 text-teal-700 dark:text-teal-300" : item.status === "overdue" ? "border-red-600 text-red-700 dark:text-red-300" : "border-border text-muted-foreground"}`}>{item.status === "completed" ? <CheckCircle2 aria-hidden="true" className="h-5 w-5" /> : <Clock3 aria-hidden="true" className="h-5 w-5" />}</span><div><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{item.name}</p><span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold">{t(`logistics.status.${item.status}`, item.status.replaceAll("_", " "))}</span></div><p className="mt-1 text-xs text-muted-foreground">{dateTime(item.actual_at ?? item.estimated_at ?? item.planned_at)}</p>{canManageMilestones && !["completed", "cancelled", "skipped"].includes(item.status) ? <Button type="button" variant="link" className="mt-1 min-h-11 px-0" onClick={() => milestoneMutation.mutate({ id: item.id, eventAt: new Date().toISOString() })}>{t("logistics.actions.complete_milestone", "Mark complete")}</Button> : null}</div></li>)}</ol>}</section>
        <section aria-labelledby="timeline-heading"><h3 id="timeline-heading" className="font-bold">{t("logistics.tracking.timeline", "Unified operational timeline")}</h3>{workspace.timeline.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{t("logistics.empty.timeline", "No operational evidence has been recorded.")}</p> : <ol className="mt-4 space-y-3">{workspace.timeline.map((item) => <li key={item.identity} className="rounded-xl border border-border/70 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="flex items-center gap-2 font-semibold"><MapPin aria-hidden="true" className="h-4 w-4 text-teal-700 dark:text-teal-300" />{item.title}</p><p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{item.source} · {item.code}{item.mode ? ` · ${item.mode}` : ""}</p></div><time dateTime={item.occurred_at} className="text-xs tabular-nums text-muted-foreground">{dateTime(item.occurred_at)}</time></div>{item.is_out_of_order ? <p className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-300"><AlertTriangle aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />{t("logistics.tracking.out_of_order", "Received out of chronological order")}</p> : null}</li>)}</ol>}</section>
      </div>
      <div className="mt-6 grid gap-4 border-t border-border pt-5 lg:grid-cols-2">
        {canManage ? <form onSubmit={submitEvent} className="rounded-xl border border-border/70 p-4"><h3 className="font-bold">{t("logistics.tracking.record_event", "Record operational event")}</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><Label htmlFor="tracking-event-code">{t("logistics.fields.event_code", "Event code")}</Label><NativeSelect id="tracking-event-code" name="event_code" className="mt-1 min-h-11 w-full">{["pickup", "gate_in", "loaded", "departed", "arrived", "discharged", "available", "delivered"].map((value) => <option key={value} value={value}>{t(`logistics.milestones.${value}`, value.replaceAll("_", " "))}</option>)}</NativeSelect></div><div><Label htmlFor="tracking-event-at">{t("logistics.fields.occurred_at", "Occurred at")}</Label><Input id="tracking-event-at" name="event_at" type="datetime-local" defaultValue={localNow()} required className="mt-1 min-h-11" /></div><div className="sm:col-span-2"><Label htmlFor="tracking-description">{t("logistics.fields.description", "Description")}</Label><Textarea id="tracking-description" name="description" className="mt-1" /></div></div><Button type="submit" disabled={eventMutation.isPending} className="mt-4 min-h-11">{t("logistics.actions.record_event", "Record event")}</Button></form> : null}
        {canManageEta ? <form onSubmit={submitEta} className="rounded-xl border border-border/70 p-4"><h3 className="font-bold">{t("logistics.eta.record", "Record ETA update")}</h3><div className="mt-3 grid gap-3"><div><Label htmlFor="tracking-eta">{t("logistics.fields.latest_eta", "Latest ETA")}</Label><Input id="tracking-eta" name="eta_at" type="datetime-local" required className="mt-1 min-h-11" /></div><div><Label htmlFor="tracking-eta-reason">{t("logistics.fields.reason", "Reason")}</Label><Textarea id="tracking-eta-reason" name="reason" required className="mt-1" /></div></div><Button type="submit" disabled={etaMutation.isPending} className="mt-4 min-h-11">{t("logistics.actions.record_eta", "Record ETA")}</Button></form> : null}
      </div>
    </>}
  </section>;
}
