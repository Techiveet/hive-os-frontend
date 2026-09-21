"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, BarChart3, Download, Filter, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/hooks/use-permissions";
import { logisticsApi } from "@/modules/logistics/api";
import type { LogisticsFinancialDashboard, LogisticsFinancialReport } from "@/modules/logistics/types";
import { useTranslation } from "@/store/use-translation";

const reports = ["job_profitability", "customer_profitability", "route_profitability", "mode_profitability", "vendor_spend", "estimate_vs_actual"];
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);

export default function LogisticsFinancialReportsPage() {
  const { t } = useTranslation();
  const { hasAnyPermission, isLoaded } = usePermissions();
  const canReport = hasAnyPermission(["view_logistics_financial_reports", "manage_logistics"]);
  const canExport = hasAnyPermission(["export_logistics_financial_reports", "manage_logistics"]);
  const hasSensitiveAccess = hasAnyPermission(["manage_logistics"]) || (
    hasAnyPermission(["view_logistics_revenue"])
    && hasAnyPermission(["view_logistics_costs", "view_logistics_buy_costs"])
    && hasAnyPermission(["view_logistics_profitability"])
  );
  const [report, setReport] = React.useState("job_profitability");
  const [from, setFrom] = React.useState(startOfMonth());
  const [to, setTo] = React.useState(today());
  const [exportError, setExportError] = React.useState("");
  const params = { from, to, per_page: 100 };
  const dashboard = useQuery({ queryKey: ["logistics", "financial-dashboard", from, to], queryFn: () => logisticsApi.financialDashboard(params).then((response) => response.data.data as LogisticsFinancialDashboard), enabled: canReport && hasSensitiveAccess });
  const result = useQuery({ queryKey: ["logistics", "financial-report", report, from, to], queryFn: () => logisticsApi.financialReport(report, params).then((response) => response.data.data as LogisticsFinancialReport), enabled: canReport && hasSensitiveAccess });
  const exportReport = useMutation({
    mutationFn: () => logisticsApi.financialReportExport(report, { from, to }),
    onSuccess: (response) => {
      const href = URL.createObjectURL(response.data as Blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `logistics-${report}-${today()}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
      setExportError("");
    },
    onError: () => setExportError(t("logistics.finance.export_failed", "The financial report export could not be created. Narrow the filters and try again.")),
  });

  if (isLoaded && (!canReport || !hasSensitiveAccess)) return <main><Alert variant="destructive"><ShieldAlert aria-hidden="true" /><AlertTitle>{t("logistics.finance.report_permission_title", "Financial report access required")}</AlertTitle><AlertDescription>{t("logistics.finance.report_permission_description", "Revenue, supplier cost, profitability, and financial report permissions are all required.")}</AlertDescription></Alert></main>;
  const data = dashboard.data;
  const rows = result.data?.rows ?? [];
  const headers = rows[0] ? Object.keys(rows[0]).filter((key) => key !== "job_id" && key !== "portfolio_recognized_cost") : [];

  return <main className="space-y-6 [--ring:160_84%_29%] [&_button]:border-foreground/45 [&_input]:border-foreground/45 [&_select]:border-foreground/45 dark:[--ring:160_84%_39%]">
    <header><Button variant="link" asChild className="h-auto min-h-11 justify-start p-0"><Link href="/dashboard/logistics"><ArrowLeft data-icon="inline-start" aria-hidden="true" />{t("logistics.finance.back_to_logistics", "Back to Logistics")}</Link></Button><div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("logistics.finance.financial_intelligence", "Financial intelligence")}</p><h1 className="mt-1 flex items-center gap-2 text-3xl font-black tracking-tight"><BarChart3 aria-hidden="true" />{t("logistics.finance.reports_title", "Logistics financial reports")}</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("logistics.finance.reports_description", "Tenant-scoped profitability, variance, and supplier spend using authoritative job and Finance links.")}</p></div><div className="flex flex-wrap items-center gap-2">{data ? <Badge variant="outline">{data.from} → {data.to}</Badge> : null}{canExport ? <Button type="button" variant="outline" className="min-h-11" onClick={() => exportReport.mutate()} disabled={exportReport.isPending}><Download aria-hidden="true" />{exportReport.isPending ? t("logistics.finance.exporting", "Exporting…") : t("logistics.finance.export_csv", "Export CSV")}</Button> : null}</div></div></header>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Filter aria-hidden="true" />{t("logistics.finance.report_filters", "Report filters")}</CardTitle><CardDescription>{t("logistics.finance.report_date_basis", "Dates currently filter by forwarding-job creation date.")}</CardDescription></CardHeader><CardContent><FieldGroup className="grid gap-4 sm:grid-cols-3"><Field><FieldLabel htmlFor="financial-report">{t("logistics.finance.report", "Report")}</FieldLabel><NativeSelect id="financial-report" value={report} onChange={(event) => setReport(event.target.value)} className="min-h-11">{reports.map((item) => <option key={item} value={item}>{t(`logistics.finance.report_${item}`, item.replaceAll("_", " "))}</option>)}</NativeSelect></Field><Field><FieldLabel htmlFor="financial-report-from">{t("logistics.finance.from", "From")}</FieldLabel><Input id="financial-report-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></Field><Field><FieldLabel htmlFor="financial-report-to">{t("logistics.finance.to", "To")}</FieldLabel><Input id="financial-report-to" type="date" min={from} value={to} onChange={(event) => setTo(event.target.value)} /></Field></FieldGroup></CardContent></Card>
    {dashboard.isError || result.isError ? <Alert variant="destructive"><AlertTriangle aria-hidden="true" /><AlertTitle>{t("logistics.finance.report_error", "Financial report could not be loaded")}</AlertTitle><AlertDescription>{t("logistics.finance.report_error_description", "Check the date range, permissions, and Finance integration status, then retry.")}</AlertDescription></Alert> : null}
    {exportError ? <Alert variant="destructive" aria-live="polite"><AlertTriangle aria-hidden="true" /><AlertTitle>{t("logistics.finance.export_failed_title", "Export failed")}</AlertTitle><AlertDescription>{exportError}</AlertDescription></Alert> : null}
    {dashboard.isLoading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-28" />)}</div> : data ? <section aria-labelledby="financial-kpis" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><h2 id="financial-kpis" className="sr-only">{t("logistics.finance.dashboard_kpis", "Financial KPIs")}</h2><Kpi label={t("logistics.finance.month_revenue", "Revenue in range")} value={`${data.base_currency} ${data.revenue}`} /><Kpi label={t("logistics.finance.gross_profit", "Gross profit")} value={`${data.base_currency} ${data.gross_profit}`} /><Kpi label={t("logistics.finance.average_margin", "Average margin")} value={data.average_margin_percentage == null ? "—" : `${data.average_margin_percentage}%`} /><Kpi label={t("logistics.finance.unbilled_revenue", "Unbilled revenue")} value={`${data.base_currency} ${data.unbilled_revenue}`} /><Kpi label={t("logistics.finance.open_accruals", "Open accruals")} value={String(data.open_accruals)} /><Kpi label={t("logistics.finance.unbilled_costs", "Unbilled costs")} value={`${data.base_currency} ${data.unbilled_costs}`} /><Kpi label={t("logistics.finance.negative_margin_jobs", "Negative-margin jobs")} value={String(data.negative_margin_jobs)} /><Kpi label={t("logistics.finance.failed_postings", "Failed postings")} value={String(data.failed_postings)} /></section> : null}
    <Card><CardHeader><CardTitle>{t(`logistics.finance.report_${report}`, report.replaceAll("_", " "))}</CardTitle><CardDescription>{result.data ? `${result.data.meta.total} ${t("logistics.finance.report_rows", "rows")}` : t("logistics.finance.loading_report", "Loading report…")}</CardDescription></CardHeader><CardContent>{result.isLoading ? <Skeleton className="h-72 w-full" /> : rows.length ? <Table><TableCaption className="sr-only">{t(`logistics.finance.report_${report}`, report.replaceAll("_", " "))}</TableCaption><TableHeader><TableRow>{headers.map((header) => <TableHead scope="col" key={header}>{t(`logistics.finance.column_${header}`, header.replaceAll("_", " "))}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((row, index) => <TableRow key={String(row.job_id ?? row.label ?? row.supplier ?? index)}>{headers.map((header) => <TableCell key={header} className={typeof row[header] === "string" && /amount|cost|profit|revenue|spend|variance|percentage/.test(header) ? "font-mono tabular-nums" : ""}>{String(row[header] ?? "—")}</TableCell>)}</TableRow>)}</TableBody></Table> : <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("logistics.finance.no_report_rows", "No financial records match this date range.")}</p>}</CardContent></Card>
  </main>;
}

function Kpi({ label, value }: { label: string; value: string }) { return <Card className="gap-3 py-4 shadow-none"><CardHeader className="px-4"><CardDescription>{label}</CardDescription><CardTitle className="font-mono text-xl tabular-nums">{value}</CardTitle></CardHeader></Card>; }
