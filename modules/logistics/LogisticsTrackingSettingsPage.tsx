"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logisticsApi } from "@/modules/logistics/api";
import { useTranslation } from "@/store/use-translation";

type Rules = { upcoming_window_minutes: number; at_risk_window_minutes: number; stale_after_minutes: number; eta_delay_threshold_minutes: number; alert_cooldown_minutes: number; max_future_event_minutes: number };
const fields: Array<keyof Rules> = ["upcoming_window_minutes", "at_risk_window_minutes", "stale_after_minutes", "eta_delay_threshold_minutes", "alert_cooldown_minutes", "max_future_event_minutes"];

export default function LogisticsTrackingSettingsPage() {
  const { t } = useTranslation();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["logistics", "tracking-settings"], queryFn: () => logisticsApi.trackingSettings().then((response) => response.data.data as Rules) });
  const [values, setValues] = useState<Rules | null>(null);
  useEffect(() => { if (query.data) setValues(query.data); }, [query.data]);
  const mutation = useMutation({ mutationFn: (payload: Rules) => logisticsApi.updateTrackingSettings(payload), onSuccess: () => client.invalidateQueries({ queryKey: ["logistics", "tracking-settings"] }) });
  const submit = (event: FormEvent) => { event.preventDefault(); if (values) mutation.mutate(values); };
  return <main className="space-y-6">
    <header className="border-b border-border/60 pb-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">{t("logistics.tracking_settings.eyebrow", "Tenant rules")}</p><h1 className="mt-1 text-3xl font-black tracking-tight">{t("logistics.tracking_settings.title", "Tracking and alert rules")}</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("logistics.tracking_settings.subtitle", "Configure deterministic milestone windows, stale-tracking detection, ETA delay thresholds, and alert cooldowns.")}</p></header>
    {query.isLoading ? <p role="status">{t("logistics.loading", "Loading logistics operations…")}</p> : query.isError ? <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">{t("logistics.errors.tracking_settings", "Tracking settings could not be loaded.")}</p> : values ? <form onSubmit={submit} className="max-w-3xl rounded-2xl border border-border/70 bg-card p-5 shadow-sm"><div className="flex items-center gap-3"><Settings2 aria-hidden="true" className="h-5 w-5 text-teal-700 dark:text-teal-300" /><h2 className="text-lg font-bold">{t("logistics.tracking_settings.rules", "Operational thresholds")}</h2></div><div className="mt-5 grid gap-4 sm:grid-cols-2">{fields.map((field) => <label key={field} htmlFor={field} className="text-sm font-medium">{t(`logistics.tracking_settings.${field}`, field.replaceAll("_", " "))}<span className="mt-1 flex items-center gap-2"><Input id={field} type="number" min={field === "max_future_event_minutes" ? 0 : 1} value={values[field]} onChange={(event) => setValues({ ...values, [field]: Number(event.target.value) })} className="min-h-11" /><span className="text-xs text-muted-foreground">{t("logistics.fields.minutes", "minutes")}</span></span></label>)}</div>{mutation.isError ? <p role="alert" className="mt-4 text-sm text-destructive">{t("logistics.errors.settings_save", "The settings could not be saved.")}</p> : null}{mutation.isSuccess ? <p role="status" className="mt-4 text-sm text-teal-700 dark:text-teal-300">{t("logistics.messages.settings_saved", "Tracking settings saved.")}</p> : null}<Button type="submit" disabled={mutation.isPending} className="mt-6 min-h-11 bg-teal-700 text-white hover:bg-teal-800"><Save aria-hidden="true" />{mutation.isPending ? t("common.saving", "Saving…") : t("common.save", "Save")}</Button></form> : null}
  </main>;
}
