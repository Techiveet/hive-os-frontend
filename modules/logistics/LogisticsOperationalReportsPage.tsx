"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Download, Filter, LineChart, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/hooks/use-permissions";
import { logisticsApi } from "@/modules/logistics/api";
import { useLogisticsOperationsRealtime } from "@/modules/logistics/use-logistics-operations-realtime";
import { useTranslation } from "@/store/use-translation";

const reports = ["exception_summary", "milestone_performance", "delayed_jobs", "stale_tracking", "carrier_performance", "customs_warehouse_risk"];
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);
type OperationalReport = { report: string; rows: Array<Record<string, unknown>>; meta: { total: number; current_page: number; last_page: number } };

export default function LogisticsOperationalReportsPage() {
  const { t } = useTranslation();
  const { hasAnyPermission, isLoaded } = usePermissions();
  const canView = hasAnyPermission(["view_logistics_operational_reports", "manage_logistics"]);
  const canExport = hasAnyPermission(["export_logistics_operational_reports", "manage_logistics"]);
  const [report, setReport] = useState("exception_summary");
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(today());
  const [exportError, setExportError] = useState("");
  const params = { from, to, per_page: 100 };
  const result = useQuery({
    queryKey: ["logistics", "operational-report", report, from, to],
    queryFn: () => logisticsApi.operationalReport(report, params).then((response) => response.data.data as OperationalReport),
    enabled: canView,
  });
  useLogisticsOperationsRealtime(() => { if (canView) void result.refetch(); });
  const exportReport = useMutation({
    mutationFn: () => logisticsApi.operationalReportExport(report, { from, to }),
    onSuccess: (response) => {
      const href = URL.createObjectURL(response.data as Blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `logistics-operational-${report}-${today()}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
      setExportError("");
    },
    onError: () => setExportError(t("logistics.operational_reports.export_failed", "The operational report export could not be created.")),
  });

  if (isLoaded && !canView) return <main><Alert variant="destructive"><ShieldAlert aria-hidden="true" /><AlertTitle>{t("logistics.operational_reports.permission_title", "Operational report access required")}</AlertTitle><AlertDescription>{t("logistics.operational_reports.permission_description", "Ask an administrator for operational report access.")}</AlertDescription></Alert></main>;
  const rows = result.data?.rows ?? [];
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const formatCell = (header: string, value: unknown) => {
    if (value === null || value === undefined || value === "") return "—";
    const raw = String(value);
    const fallback = raw.replaceAll("_", " ");
    if (header === "category") return t(`logistics.exception_labels.${raw}`, fallback);
    if (header === "severity") return t(`logistics.severity.${raw}`, fallback);
    if (header === "status") return t(`logistics.status.${raw}`, fallback);
    if (header === "mode" || header === "mode_code") return t(`logistics.modes.${raw.toLowerCase()}`, raw);
    return raw;
  };

  return <main className="space-y-6 [--ring:160_84%_29%] dark:[--ring:160_84%_39%]" data-tour="logistics-operational-reports">
    <header><Button variant="link" asChild className="h-auto min-h-11 justify-start p-0"><Link href="/dashboard/logistics"><ArrowLeft aria-hidden="true" />{t("logistics.actions.back", "Back to Logistics")}</Link></Button><div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">{t("logistics.operational_reports.eyebrow", "Operational intelligence")}</p><h1 className="mt-1 flex items-center gap-2 text-3xl font-black tracking-tight"><LineChart aria-hidden="true" />{t("logistics.operational_reports.title", "Logistics operational reports")}</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("logistics.operational_reports.subtitle", "Tenant-scoped milestone, delay, exception, and carrier performance built from operational evidence.")}</p></div>{canExport ? <Button type="button" variant="outline" className="min-h-11" onClick={() => exportReport.mutate()} disabled={exportReport.isPending}><Download aria-hidden="true" />{exportReport.isPending ? t("logistics.actions.exporting", "Exporting…") : t("logistics.actions.export_csv", "Export CSV")}</Button> : null}</div></header>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Filter aria-hidden="true" />{t("logistics.operational_reports.filters", "Report filters")}</CardTitle><CardDescription>{t("logistics.operational_reports.filter_help", "Dates apply to operational evidence or job creation, depending on the report.")}</CardDescription></CardHeader><CardContent><FieldGroup className="grid gap-4 sm:grid-cols-3"><Field><FieldLabel htmlFor="operational-report">{t("logistics.fields.report", "Report")}</FieldLabel><NativeSelect id="operational-report" value={report} onChange={(event) => setReport(event.target.value)} className="min-h-11">{reports.map((item) => <option key={item} value={item}>{t(`logistics.operational_reports.${item}`, item.replaceAll("_", " "))}</option>)}</NativeSelect></Field><Field><FieldLabel htmlFor="operational-report-from">{t("logistics.fields.from", "From")}</FieldLabel><Input id="operational-report-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></Field><Field><FieldLabel htmlFor="operational-report-to">{t("logistics.fields.to_date", "To")}</FieldLabel><Input id="operational-report-to" type="date" min={from} value={to} onChange={(event) => setTo(event.target.value)} /></Field></FieldGroup></CardContent></Card>
    {result.isError ? <Alert variant="destructive"><AlertTriangle aria-hidden="true" /><AlertTitle>{t("logistics.operational_reports.error_title", "Operational report could not be loaded")}</AlertTitle><AlertDescription>{t("logistics.operational_reports.error_description", "Check the filters and access, then retry.")}</AlertDescription></Alert> : null}
    {exportError ? <Alert variant="destructive" aria-live="polite"><AlertTriangle aria-hidden="true" /><AlertTitle>{t("logistics.operational_reports.export_failed_title", "Export failed")}</AlertTitle><AlertDescription>{exportError}</AlertDescription></Alert> : null}
    <Card><CardHeader><CardTitle>{t(`logistics.operational_reports.${report}`, report.replaceAll("_", " "))}</CardTitle><CardDescription>{result.data ? `${result.data.meta.total} ${t("logistics.operational_reports.rows", "rows")}` : t("logistics.loading", "Loading logistics operations…")}</CardDescription></CardHeader><CardContent>{result.isLoading ? <Skeleton className="h-72 w-full" /> : rows.length ? <div className="overflow-x-auto"><Table><TableCaption className="sr-only">{t(`logistics.operational_reports.${report}`, report.replaceAll("_", " "))}</TableCaption><TableHeader><TableRow>{headers.map((header) => <TableHead scope="col" key={header}>{t(`logistics.operational_reports.columns.${header}`, header.replaceAll("_", " "))}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((row, index) => <TableRow key={String(row.exception_number ?? row.job_number ?? row.milestone_code ?? row.carrier ?? index)}>{headers.map((header) => <TableCell key={header} className={typeof row[header] === "number" ? "font-mono tabular-nums" : ""}>{formatCell(header, row[header])}</TableCell>)}</TableRow>)}</TableBody></Table></div> : <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("logistics.operational_reports.empty", "No operational records match this date range.")}</p>}</CardContent></Card>
  </main>;
}
