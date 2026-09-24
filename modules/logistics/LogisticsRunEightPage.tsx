"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Gauge, Play, RefreshCw, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logisticsApi } from "@/modules/logistics/api";
import { useTranslation } from "@/store/use-translation";

type Mode = "integrations" | "sla" | "analytics" | "prediction" | "automation";
type Row = Record<string, any>;

const titles: Record<Mode, [string, string]> = {
  integrations: ["Integration hub", "Monitor tenant connections, safe provider events, and replayable failures. Credentials never appear here."],
  sla: ["Service-level performance", "Review versioned customer and route commitments without rewriting historical measurements."],
  analytics: ["Operational analytics", "Live tenant-scoped shipment, mode, exception, and SLA facts."],
  prediction: ["ETA prediction lab", "Evaluate transparent historical baselines. Experimental results are never customer-authoritative."],
  automation: ["Command-center automation", "Run idempotent low-risk assignment and escalation rules within Workflow boundaries."],
};

function State({ loading, error }: { loading: boolean; error: boolean }) {
  const { t } = useTranslation();
  if (loading) return <p role="status" className="rounded-xl border p-5">{t("logistics.loading", "Loading logistics operations…")}</p>;
  if (error) return <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-5">{t("logistics.run8.load_error", "This workspace could not be loaded.")}</p>;
  return null;
}

function DataTable({ caption, columns, rows }: { caption: string; columns: Array<[string, string]>; rows: Row[] }) {
  const { t } = useTranslation();
  if (!rows.length) return <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">{t("logistics.run8.empty", "No records are available yet.")}</p>;
  return <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[620px] text-sm"><caption className="sr-only">{caption}</caption><thead className="bg-muted/60 text-left">{<tr>{columns.map(([key, label]) => <th key={key} scope="col" className="px-4 py-3 font-semibold">{label}</th>)}</tr>}</thead><tbody>{rows.map((row, index) => <tr key={row.id ?? index} className="border-t">{columns.map(([key]) => <td key={key} className="px-4 py-3">{String(row[key] ?? "—")}</td>)}</tr>)}</tbody></table></div>;
}

export default function LogisticsRunEightPage({ mode }: { mode: Mode }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["logistics", "run8", mode],
    queryFn: async () => {
      if (mode === "integrations") {
        const [connections, events] = await Promise.all([logisticsApi.integrations(), logisticsApi.integrationEvents()]);
        return { connections: connections.data.data?.data ?? [], events: events.data.data?.data ?? [] };
      }
      if (mode === "sla") return (await logisticsApi.sla()).data.data;
      if (mode === "analytics") return (await logisticsApi.advancedAnalytics()).data.data;
      if (mode === "prediction") return (await logisticsApi.predictionLab()).data.data;
      return (await logisticsApi.automationRules()).data.data;
    },
  });
  const [modeCode, setModeCode] = useState("ocean");
  const [version, setVersion] = useState("median-v1");
  const action = useMutation({
    mutationFn: async (payload: { kind: string; id?: number }) => {
      if (payload.kind === "test") return logisticsApi.testIntegration(payload.id!);
      if (payload.kind === "poll") return logisticsApi.pollIntegration(payload.id!);
      if (payload.kind === "replay") return logisticsApi.replayIntegrationEvent(payload.id!);
      if (payload.kind === "evaluate") return logisticsApi.evaluatePrediction({ mode_code: modeCode, version });
      return logisticsApi.runAutomation();
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["logistics", "run8", mode] }),
  });
  const [title, subtitle] = titles[mode];
  const data = query.data as any;
  return <main className="space-y-6">
    <header className="border-b border-border/60 pb-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">{t("logistics.run8.eyebrow", "External ecosystem")}</p><h1 className="mt-1 text-3xl font-black tracking-tight">{t(`logistics.run8.${mode}.title`, title)}</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t(`logistics.run8.${mode}.subtitle`, subtitle)}</p></header>
    <State loading={query.isLoading} error={query.isError} />
    {action.isError ? <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">{t("logistics.run8.action_error", "The action could not be completed.")}</p> : null}
    {action.isSuccess ? <p role="status" className="rounded-xl border border-teal-600/30 bg-teal-600/10 p-4">{t("logistics.run8.action_success", "The action completed successfully.")}</p> : null}
    {mode === "integrations" && data ? <div className="space-y-6">
      <section aria-labelledby="connections-heading" className="space-y-3"><div className="flex items-center gap-2"><ShieldCheck aria-hidden className="h-5 w-5 text-teal-700 dark:text-teal-300" /><h2 id="connections-heading" className="text-xl font-bold">{t("logistics.run8.connections", "Connections")}</h2></div>
        <DataTable caption="Integration connections" columns={[["name","Connection"],["environment","Environment"],["health","Health"],["last_success_at","Last success"]]} rows={data.connections} />
        <div className="flex flex-wrap gap-2">{data.connections.map((row: Row) => <div key={row.id} className="flex gap-2"><Button variant="outline" onClick={() => action.mutate({kind:"test",id:row.id})}><Activity aria-hidden />{t("logistics.run8.test", "Test")} {row.name}</Button>{row.provider?.supports_polling ? <Button variant="outline" onClick={() => action.mutate({kind:"poll",id:row.id})}><RefreshCw aria-hidden />{t("logistics.run8.poll", "Poll")}</Button> : null}</div>)}</div>
      </section>
      <section aria-labelledby="events-heading" className="space-y-3"><h2 id="events-heading" className="text-xl font-bold">{t("logistics.run8.events", "Recent integration events")}</h2><DataTable caption="Recent integration events" columns={[["external_event_id","External event"],["event_type","Type"],["status","Status"],["error_category","Error category"],["received_at","Received"]]} rows={data.events} /><div className="flex flex-wrap gap-2">{data.events.filter((row: Row) => row.status === "failed").map((row: Row) => <Button key={row.id} variant="outline" onClick={() => action.mutate({kind:"replay",id:row.id})}><RefreshCw aria-hidden />{t("logistics.run8.replay", "Replay")} {row.external_event_id || row.id}</Button>)}</div></section>
    </div> : null}
    {mode === "sla" && data ? <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]"><section aria-labelledby="policies-heading" className="space-y-3"><h2 id="policies-heading" className="text-xl font-bold">{t("logistics.run8.sla_policies", "Published policies")}</h2><DataTable caption="SLA policies" columns={[["name","Policy"],["priority","Priority"],["is_active","Active"]]} rows={data.policies?.data ?? []} /></section><section aria-labelledby="sla-summary-heading" className="rounded-2xl border bg-card p-5"><h2 id="sla-summary-heading" className="text-xl font-bold">{t("logistics.run8.sla_summary", "Measurement summary")}</h2><dl className="mt-4 grid grid-cols-2 gap-4">{Object.entries(data.analytics ?? {}).map(([key,value]) => <div key={key}><dt className="text-xs uppercase text-muted-foreground">{key.replaceAll("_"," ")}</dt><dd className="text-2xl font-black">{String(value ?? "—")}</dd></div>)}</dl></section></div> : null}
    {mode === "analytics" && data ? <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Jobs",data.jobs_total],["SLA met",data.sla?.met],["SLA breached",data.sla?.breached],["Compliance",data.sla?.compliance_percent == null ? "—" : `${data.sla.compliance_percent}%`]].map(([label,value]) => <section key={String(label)} className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-black">{String(value ?? 0)}</p></section>)}</div><div className="grid gap-5 xl:grid-cols-3"><DataTable caption="Jobs by status" columns={[["status","Status"],["total","Jobs"]]} rows={data.jobs_by_status ?? []}/><DataTable caption="Transport legs by mode" columns={[["mode","Mode"],["total","Legs"]]} rows={data.legs_by_mode ?? []}/><DataTable caption="Open exceptions by severity" columns={[["severity","Severity"],["total","Open"]]} rows={data.open_exceptions_by_severity ?? []}/></div><p className="text-xs text-muted-foreground">{t("logistics.run8.live_freshness", "Freshness: live tenant-scoped aggregates.")}</p></div> : null}
    {mode === "prediction" && data ? <div className="space-y-5"><form onSubmit={(event: FormEvent) => { event.preventDefault(); action.mutate({kind:"evaluate"}); }} className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-[1fr_1fr_auto]"><label className="text-sm font-medium" htmlFor="prediction-mode">{t("logistics.run8.mode", "Transport mode")}<Input id="prediction-mode" value={modeCode} onChange={(event) => setModeCode(event.target.value)} className="mt-1 min-h-11"/></label><label className="text-sm font-medium" htmlFor="prediction-version">{t("logistics.run8.version", "Method version")}<Input id="prediction-version" value={version} onChange={(event) => setVersion(event.target.value)} className="mt-1 min-h-11"/></label><Button type="submit" className="min-h-11 self-end bg-teal-700 text-white hover:bg-teal-800"><Sparkles aria-hidden />{t("logistics.run8.evaluate", "Evaluate baseline")}</Button></form><div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm"><strong>{t("logistics.run8.experimental_only", "Experimental only.")}</strong> {t("logistics.run8.experimental_note", "Production ETA display remains disabled until minimum history and holdout thresholds pass.")}</div><DataTable caption="Prediction experiments" columns={[["version","Version"],["mode_code","Mode"],["status","Status"],["sample_count","Samples"],["validation_mae_minutes","MAE minutes"]]} rows={data.data ?? []}/></div> : null}
    {mode === "automation" && data ? <div className="space-y-5"><Button onClick={() => action.mutate({kind:"run"})} className="min-h-11 bg-teal-700 text-white hover:bg-teal-800"><Play aria-hidden />{t("logistics.run8.run_rules", "Run enabled rules")}</Button><DataTable caption="Automation rules" columns={[["name","Rule"],["event_type","Event"],["enabled","Enabled"],["updated_at","Updated"]]} rows={data.data ?? []}/><p className="flex items-center gap-2 text-sm text-muted-foreground"><Workflow aria-hidden className="h-4 w-4"/>{t("logistics.run8.workflow_boundary", "High-impact business changes remain behind Workflow approval.")}</p></div> : null}
  </main>;
}
