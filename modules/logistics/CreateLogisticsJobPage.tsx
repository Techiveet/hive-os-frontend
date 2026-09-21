"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/hooks/use-permissions";
import { logisticsApi } from "@/modules/logistics/api";
import type { LogisticsReferences } from "@/modules/logistics/types";
import { useTranslation } from "@/store/use-translation";

const readErrors = (error: unknown): Record<string, string> => {
  const candidate = error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
  const errors = candidate.response?.data?.errors ?? {};
  return Object.fromEntries(Object.entries(errors).map(([key, values]) => [key, values[0]]));
};

export default function CreateLogisticsJobPage() {
  const { t } = useTranslation();
  const { hasAnyPermission, isLoaded } = usePermissions();
  const canCreate = hasAnyPermission(["create_logistics_jobs", "manage_logistics"]);
  const router = useRouter();
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [notice, setNotice] = React.useState("");
  const references = useQuery({ queryKey: ["logistics", "references"], queryFn: () => logisticsApi.references().then((response) => response.data.data as LogisticsReferences) });
  const create = useMutation({
    mutationFn: (payload: Record<string, unknown>) => logisticsApi.createJob(payload),
    onSuccess: (response) => {
      const id = response.data?.data?.id;
      if (id) router.push(`/dashboard/logistics/jobs/${id}`);
      else setNotice(t("logistics.messages.awaiting_approval", "The job is waiting for workflow approval."));
    },
    onError: (error) => setErrors(readErrors(error)),
  });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setErrors({}); setNotice("");
    const form = new FormData(event.currentTarget);
    const optionalNumber = (name: string) => form.get(name) ? Number(form.get(name)) : null;
    create.mutate({
      sales_customer_id: Number(form.get("sales_customer_id")), responsible_employee_id: optionalNumber("responsible_employee_id"),
      origin_node_id: Number(form.get("origin_node_id")), destination_node_id: Number(form.get("destination_node_id")), primary_transport_mode_id: optionalNumber("primary_transport_mode_id"),
      service_category: form.get("service_category") || null, planned_departure_at: form.get("planned_departure_at") || null, planned_arrival_at: form.get("planned_arrival_at") || null, internal_notes: form.get("internal_notes") || null,
    });
  };
  const errorFor = (name: string) => errors[name] ? <p id={`${name}-error`} className="mt-1 text-sm text-destructive">{errors[name]}</p> : null;
  const invalid = (name: string) => errors[name] ? true : undefined;
  const describedBy = (name: string) => errors[name] ? `${name}-error` : undefined;

  if (!isLoaded) return <p role="status">{t("logistics.loading", "Loading logistics operations…")}</p>;
  if (!canCreate) return <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">{t("logistics.errors.create_forbidden", "You do not have permission to create forwarding jobs.")}</p>;

  return <main className="mx-auto max-w-5xl space-y-6">
    <header><Link href="/dashboard/logistics/jobs" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-teal-700 hover:underline dark:text-teal-300"><ArrowLeft aria-hidden="true" className="h-4 w-4" />{t("logistics.actions.back_jobs", "Back to forwarding jobs")}</Link><h1 className="mt-3 text-3xl font-black tracking-tight">{t("logistics.create.title", "Create forwarding job")}</h1><p className="mt-1 text-sm text-muted-foreground">{t("logistics.create.subtitle", "Start with the customer, responsibility, endpoints, and planned timing. Cargo and route legs are added after creation.")}</p></header>
    {references.isError ? <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">{t("logistics.errors.references", "Customer and route reference data could not be loaded.")}</p> : null}
    {notice ? <p role="status" className="rounded-xl border border-teal-700/30 bg-teal-50 p-4 text-teal-950 dark:bg-teal-950 dark:text-teal-50">{notice}</p> : null}
    <form onSubmit={submit} className="space-y-6" noValidate>
      <section aria-labelledby="job-parties-heading" className="rounded-2xl border bg-card p-5"><h2 id="job-parties-heading" className="text-lg font-bold">{t("logistics.create.ownership", "Customer and owner")}</h2><div className="mt-4 grid gap-4 md:grid-cols-2">
        <div><Label htmlFor="sales_customer_id">{t("logistics.fields.customer", "Customer")} *</Label><NativeSelect id="sales_customer_id" name="sales_customer_id" required aria-invalid={invalid("sales_customer_id")} aria-describedby={describedBy("sales_customer_id")} className="mt-1 min-h-11 w-full"><option value="">{t("logistics.select.customer", "Select a customer")}</option>{references.data?.customers.map((option) => <option key={option.id} value={option.id}>{option.code} — {option.name}</option>)}</NativeSelect>{errorFor("sales_customer_id")}</div>
        <div><Label htmlFor="responsible_employee_id">{t("logistics.fields.responsible", "Responsible employee")}</Label><NativeSelect id="responsible_employee_id" name="responsible_employee_id" className="mt-1 min-h-11 w-full"><option value="">{t("logistics.select.employee", "Unassigned")}</option>{references.data?.employees.map((option) => <option key={option.id} value={option.id}>{option.employee_number} — {option.primary_name}</option>)}</NativeSelect></div>
      </div></section>
      <section aria-labelledby="job-route-heading" className="rounded-2xl border bg-card p-5"><h2 id="job-route-heading" className="text-lg font-bold">{t("logistics.create.route", "Primary movement")}</h2><div className="mt-4 grid gap-4 md:grid-cols-2">
        <div><Label htmlFor="origin_node_id">{t("logistics.fields.origin", "Origin") } *</Label><NativeSelect id="origin_node_id" name="origin_node_id" required aria-invalid={invalid("origin_node_id")} aria-describedby={describedBy("origin_node_id")} className="mt-1 min-h-11 w-full"><option value="">{t("logistics.select.origin", "Select an origin")}</option>{references.data?.nodes.map((option) => <option key={option.id} value={option.id}>{option.code} — {option.name}</option>)}</NativeSelect>{errorFor("origin_node_id")}</div>
        <div><Label htmlFor="destination_node_id">{t("logistics.fields.destination", "Destination")} *</Label><NativeSelect id="destination_node_id" name="destination_node_id" required aria-invalid={invalid("destination_node_id")} aria-describedby={describedBy("destination_node_id")} className="mt-1 min-h-11 w-full"><option value="">{t("logistics.select.destination", "Select a destination")}</option>{references.data?.nodes.map((option) => <option key={option.id} value={option.id}>{option.code} — {option.name}</option>)}</NativeSelect>{errorFor("destination_node_id")}</div>
        <div><Label htmlFor="primary_transport_mode_id">{t("logistics.fields.mode", "Primary mode")}</Label><NativeSelect id="primary_transport_mode_id" name="primary_transport_mode_id" className="mt-1 min-h-11 w-full"><option value="">{t("logistics.select.mode", "Select a mode")}</option>{references.data?.modes.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</NativeSelect></div>
        <div><Label htmlFor="service_category">{t("logistics.fields.service", "Service category")}</Label><Input id="service_category" name="service_category" className="mt-1 min-h-11" placeholder={t("logistics.placeholders.service", "Door to door, port to port…")} /></div>
      </div></section>
      <section aria-labelledby="job-timing-heading" className="rounded-2xl border bg-card p-5"><h2 id="job-timing-heading" className="text-lg font-bold">{t("logistics.create.timing", "Timing and instructions")}</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><div><Label htmlFor="planned_departure_at">{t("logistics.fields.departure", "Planned departure")}</Label><Input id="planned_departure_at" name="planned_departure_at" type="datetime-local" className="mt-1 min-h-11" /></div><div><Label htmlFor="planned_arrival_at">{t("logistics.fields.arrival", "Planned arrival")}</Label><Input id="planned_arrival_at" name="planned_arrival_at" type="datetime-local" className="mt-1 min-h-11" aria-invalid={invalid("planned_arrival_at")} aria-describedby={describedBy("planned_arrival_at")} />{errorFor("planned_arrival_at")}</div><div className="md:col-span-2"><Label htmlFor="internal_notes">{t("logistics.fields.notes", "Internal notes")}</Label><Textarea id="internal_notes" name="internal_notes" className="mt-1 min-h-28" /></div></div></section>
      {Object.keys(errors).length ? <p role="alert" className="text-sm font-semibold text-destructive">{t("logistics.errors.form", "Review the highlighted fields and submit again.")}</p> : null}
      <div className="flex flex-wrap justify-end gap-3"><Button asChild variant="outline" className="min-h-11"><Link href="/dashboard/logistics/jobs">{t("common.cancel", "Cancel")}</Link></Button><Button type="submit" disabled={create.isPending || references.isLoading} className="min-h-11 bg-teal-700 text-white hover:bg-teal-800"><Save aria-hidden="true" />{create.isPending ? t("logistics.actions.saving", "Saving…") : t("logistics.actions.create", "Create job")}</Button></div>
    </form>
  </main>;
}
