"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BanknoteArrowDown, BanknoteArrowUp, Calculator, CheckCircle2, CircleDollarSign, CircleHelp, FileClock, Landmark, LockKeyhole } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTour } from "@/components/providers/tour-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/use-permissions";
import { logisticsApi } from "@/modules/logistics/api";
import {
  AccrualPanel,
  ClosePanel,
  CostPanel,
  RevenuePanel,
} from "@/modules/logistics/LogisticsJobFinancePanels";
import type { JobFinancePayload, JobFinanceReferences, LogisticsReferences } from "@/modules/logistics/types";
import { useTranslation } from "@/store/use-translation";

type Readiness = { ready: boolean; blockers: string[] };
type MutationAction = (payload: Record<string, unknown>) => Promise<unknown>;

export function LogisticsJobFinance({ jobId, refs }: { jobId: number; refs?: LogisticsReferences }) {
  const { t } = useTranslation();
  const { startTour } = useTour();
  const cache = useQueryClient();
  const { hasAnyPermission } = usePermissions();
  const canViewRevenue = hasAnyPermission(["view_logistics_revenue", "manage_logistics"]);
  const canViewCosts = hasAnyPermission(["view_logistics_costs", "view_logistics_buy_costs", "manage_logistics"]);
  const canViewProfit = hasAnyPermission(["view_logistics_profitability", "manage_logistics"]);
  const canCreateCharges = hasAnyPermission(["create_logistics_charges", "manage_logistics"]);
  const canCreateCosts = hasAnyPermission(["create_logistics_costs", "manage_logistics"]);
  const canApproveCharges = hasAnyPermission(["approve_logistics_charges", "manage_logistics"]);
  const canApproveCosts = hasAnyPermission(["approve_logistics_costs", "manage_logistics"]);
  const canBillCustomer = hasAnyPermission(["create_logistics_customer_invoices", "manage_logistics"]);
  const canBillVendor = hasAnyPermission(["create_logistics_vendor_bills", "manage_logistics"]);
  const canManageAccruals = hasAnyPermission(["manage_logistics_accruals", "manage_logistics"]);
  const canClose = hasAnyPermission(["close_logistics_financials", "manage_logistics"]);
  const canReopen = hasAnyPermission(["reopen_logistics_financials", "manage_logistics"]);
  const canView = canViewRevenue || canViewCosts || canViewProfit;
  const [notice, setNotice] = React.useState("");
  const [error, setError] = React.useState("");
  const actionErrorRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (error) actionErrorRef.current?.focus();
  }, [error]);

  const financeQuery = useQuery({
    queryKey: ["logistics", "job-finance", jobId],
    queryFn: () => logisticsApi.jobFinance(jobId).then((response) => response.data as JobFinancePayload),
    enabled: canView,
  });
  const referencesQuery = useQuery({
    queryKey: ["logistics", "job-finance", "references"],
    queryFn: () => logisticsApi.jobFinanceReferences().then((response) => response.data as JobFinanceReferences),
    enabled: canCreateCharges || canCreateCosts || canBillCustomer || canBillVendor || canManageAccruals || canClose,
  });
  const readinessQuery = useQuery({
    queryKey: ["logistics", "job-finance", jobId, "readiness"],
    queryFn: () => logisticsApi.financialCloseReadiness(jobId).then((response) => response.data as Readiness),
    enabled: canClose,
  });

  const messageFor = React.useCallback((value: unknown) => {
    const response = (value as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
    return response?.message ?? Object.values(response?.errors ?? {}).flat()[0] ?? t("logistics.finance.error", "The financial action could not be completed.");
  }, [t]);
  const useFinanceMutation = (action: MutationAction, success: string) => useMutation({
    mutationFn: action,
    onSuccess: async (value) => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["logistics", "job-finance", jobId] }),
        cache.invalidateQueries({ queryKey: ["logistics", "job-finance", jobId, "readiness"] }),
        cache.invalidateQueries({ queryKey: ["logistics", "job", jobId] }),
      ]);
      const response = (value as { data?: { status?: string; data?: { status?: string } } })?.data;
      const status = response?.status ?? response?.data?.status;
      setError("");
      setNotice(status === "pending_approval"
        ? t("logistics.finance.pending_approval_notice", "Submitted to Workflow. The financial action will apply only after approval.")
        : success);
    },
    onError: (value) => { setNotice(""); setError(messageFor(value)); },
  });

  const actions = {
    createCharge: useFinanceMutation((payload) => logisticsApi.createJobCharge(jobId, payload), t("logistics.finance.charge_created", "Revenue charge created.")),
    transitionCharge: useFinanceMutation((payload) => logisticsApi.transitionJobCharge(jobId, Number(payload.id), String(payload.status)), t("logistics.finance.charge_updated", "Revenue charge updated.")),
    createCost: useFinanceMutation((payload) => logisticsApi.createJobCost(jobId, payload), t("logistics.finance.cost_created", "Supplier cost created.")),
    approveCost: useFinanceMutation((payload) => logisticsApi.approveJobCost(jobId, Number(payload.id)), t("logistics.finance.cost_approved", "Supplier cost approved.")),
    recordActual: useFinanceMutation((payload) => logisticsApi.recordActualJobCost(jobId, Number(payload.id), payload), t("logistics.finance.actual_recorded", "Actual supplier cost recorded.")),
    createBilling: useFinanceMutation((payload) => logisticsApi.createBillingRequest(jobId, payload), t("logistics.finance.billing_created", "Customer billing request created.")),
    approveBilling: useFinanceMutation((payload) => logisticsApi.approveBillingRequest(jobId, Number(payload.id)), t("logistics.finance.billing_approved", "Customer billing request approved.")),
    postBilling: useFinanceMutation((payload) => logisticsApi.postBillingRequest(jobId, Number(payload.id)), t("logistics.finance.invoice_posted", "Finance customer invoice created.")),
    createVendor: useFinanceMutation((payload) => logisticsApi.createVendorBillRequest(jobId, payload), t("logistics.finance.vendor_created", "Vendor bill request created.")),
    approveVendor: useFinanceMutation((payload) => logisticsApi.approveVendorBillRequest(jobId, Number(payload.id)), t("logistics.finance.vendor_approved", "Vendor bill request approved.")),
    postVendor: useFinanceMutation((payload) => logisticsApi.postVendorBillRequest(jobId, Number(payload.id)), t("logistics.finance.vendor_posted", "Finance vendor bill created.")),
    createAccrual: useFinanceMutation((payload) => logisticsApi.createAccrual(jobId, payload), t("logistics.finance.accrual_created", "Accrual request created.")),
    postAccrual: useFinanceMutation((payload) => logisticsApi.postAccrual(jobId, Number(payload.id)), t("logistics.finance.accrual_posted", "Accrual posted to Finance.")),
    reverseAccrual: useFinanceMutation((payload) => logisticsApi.reverseAccrual(jobId, Number(payload.id), payload.vendor_bill_request_id ? Number(payload.vendor_bill_request_id) : undefined), t("logistics.finance.accrual_reversed", "Accrual reversed or settled.")),
    close: useFinanceMutation((payload) => logisticsApi.closeJobFinancials(jobId, payload), t("logistics.finance.closed", "Job financials closed.")),
    reopen: useFinanceMutation((payload) => logisticsApi.reopenJobFinancials(jobId, String(payload.reason)), t("logistics.finance.reopened", "Job financials reopened.")),
  };

  if (!canView) return null;
  if (financeQuery.isLoading) return <section aria-busy="true" aria-label={t("logistics.finance.loading", "Loading job financials…")} className="rounded-2xl border p-6"><Skeleton className="h-7 w-64" /><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-28" />)}</div></section>;
  if (financeQuery.isError || !financeQuery.data) return <Alert variant="destructive"><AlertTriangle aria-hidden="true" /><AlertTitle>{t("logistics.finance.unavailable", "Financial workspace unavailable")}</AlertTitle><AlertDescription>{messageFor(financeQuery.error)}</AlertDescription></Alert>;

  const finance = financeQuery.data;
  const summary = finance.summary;
  const currency = summary.base_currency ?? finance.charges[0]?.currency ?? finance.costs[0]?.currency ?? "ETB";
  const money = (value?: string, code = currency) => value == null ? "—" : `${code} ${value}`;
  const percent = (value?: string | null) => value == null ? "—" : `${value}%`;
  const startFinanceTour = () => {
    const steps = [
      {
        target: "#job-finance-heading",
        title: t("logistics.finance.tour.overview_title", "Job finance workspace"),
        content: t("logistics.finance.tour.overview_description", "This workspace reconciles operational revenue and cost with Finance-owned invoices, bills, accruals, payments, and accounting periods."),
        placement: "bottom" as const,
        skipBeacon: true,
        visible: true,
      },
      {
        target: "#tour-logistics-finance-summary",
        title: t("logistics.finance.tour.summary_title", "Profitability summary"),
        content: t("logistics.finance.tour.summary_description", "Compare expected and actual values, projected and actual profit, margin, markup, variances, and Finance payment state."),
        placement: "bottom" as const,
        skipBeacon: true,
        visible: canViewProfit && canViewRevenue && canViewCosts,
      },
      {
        target: "#tour-logistics-finance-revenue",
        title: t("logistics.finance.tour.revenue_title", "Revenue and customer invoicing"),
        content: t("logistics.finance.tour.revenue_description", "Review accepted quotation revenue and approved additional charges, then create partial or final customer billing requests without double billing."),
        placement: "bottom" as const,
        skipBeacon: true,
        visible: canViewRevenue,
      },
      {
        target: "#tour-logistics-finance-costs",
        title: t("logistics.finance.tour.costs_title", "Costs and vendor bills"),
        content: t("logistics.finance.tour.costs_description", "Keep estimated, expected, accrued, and actual supplier costs separate, detect duplicate invoices, and post approved vendor bills through Finance."),
        placement: "bottom" as const,
        skipBeacon: true,
        visible: canViewCosts,
      },
      {
        target: "#tour-logistics-finance-accruals",
        title: t("logistics.finance.tour.accruals_title", "Accruals"),
        content: t("logistics.finance.tour.accruals_description", "Recognize incurred costs before supplier invoices arrive, then settle or reverse each accrual while retaining its audit history."),
        placement: "bottom" as const,
        skipBeacon: true,
        visible: canViewCosts,
      },
      {
        target: "#tour-logistics-finance-close",
        title: t("logistics.finance.tour.close_title", "Financial close"),
        content: t("logistics.finance.tour.close_description", "Resolve every billing, costing, approval, posting, and allocation blocker before creating an immutable close snapshot. Authorized reopen actions preserve the original history."),
        placement: "bottom" as const,
        skipBeacon: true,
        visible: canViewProfit && canViewRevenue && canViewCosts,
      },
    ];

    startTour(steps.filter(({ visible }) => visible).map((step) => ({
      target: step.target,
      title: step.title,
      content: step.content,
      placement: step.placement,
      skipBeacon: step.skipBeacon,
    })));
  };

  return <section aria-labelledby="job-finance-heading" className="overflow-hidden rounded-2xl border bg-card shadow-sm [--ring:160_84%_29%] [&_button]:border-foreground/45 [&_input]:border-foreground/45 [&_select]:border-foreground/45 [&_textarea]:border-foreground/45 [&_[role=checkbox]]:border-foreground/45 dark:[--ring:160_84%_39%]">
    <div className="border-b bg-muted/30 px-5 py-5 sm:px-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("logistics.finance.control_room", "Commercial control room")}</p><h2 id="job-finance-heading" className="mt-1 flex items-center gap-2 text-xl font-bold"><Calculator aria-hidden="true" />{t("logistics.finance.title", "Finance / Job Costing")}</h2><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("logistics.finance.description", "Reconcile quoted, expected, accrued, actual, invoiced, and paid values without duplicating Finance.")}</p></div><div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" size="sm" className="min-h-11" onClick={startFinanceTour}><CircleHelp aria-hidden="true" />{t("logistics.finance.tour.start", "Job finance tour")}</Button><Badge variant={summary.financial_status === "financially_closed" ? "secondary" : "outline"}><Landmark aria-hidden="true" />{t(`logistics.finance.status.${summary.financial_status}`, summary.financial_status.replaceAll("_", " "))}</Badge></div></div></div>
    <div aria-live="polite" className="px-5 pt-5 sm:px-6">{notice ? <Alert><CheckCircle2 aria-hidden="true" /><AlertTitle>{t("logistics.finance.updated", "Financial workspace updated")}</AlertTitle><AlertDescription>{notice}</AlertDescription></Alert> : null}{error ? <Alert ref={actionErrorRef} tabIndex={-1} variant="destructive"><AlertTriangle aria-hidden="true" /><AlertTitle>{t("logistics.finance.action_failed", "Action failed")}</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}{summary.failed_postings ? <Alert variant="destructive" className="mt-3"><AlertTriangle aria-hidden="true" /><AlertTitle>{t("logistics.finance.failed_postings", "Finance posting needs attention")}</AlertTitle><AlertDescription>{t("logistics.finance.failed_postings_count", "Failed or incomplete source postings")}: {summary.failed_postings}</AlertDescription></Alert> : null}</div>
    <Tabs defaultValue="summary" className="p-5 sm:p-6"><TabsList variant="line" className="h-auto max-w-full flex-wrap justify-start" aria-label={t("logistics.finance.sections", "Job finance sections")}><TabsTrigger id="tour-logistics-finance-summary" value="summary" className="min-h-11"><CircleDollarSign aria-hidden="true" />{t("logistics.finance.summary", "Summary")}</TabsTrigger>{canViewRevenue ? <TabsTrigger id="tour-logistics-finance-revenue" value="revenue" className="min-h-11"><BanknoteArrowUp aria-hidden="true" />{t("logistics.finance.revenue", "Revenue")}</TabsTrigger> : null}{canViewCosts ? <TabsTrigger id="tour-logistics-finance-costs" value="costs" className="min-h-11"><BanknoteArrowDown aria-hidden="true" />{t("logistics.finance.costs", "Costs")}</TabsTrigger> : null}{canViewCosts ? <TabsTrigger id="tour-logistics-finance-accruals" value="accruals" className="min-h-11"><FileClock aria-hidden="true" />{t("logistics.finance.accruals", "Accruals")}</TabsTrigger> : null}{canViewProfit && canViewRevenue && canViewCosts ? <TabsTrigger id="tour-logistics-finance-close" value="close" className="min-h-11"><LockKeyhole aria-hidden="true" />{t("logistics.finance.close", "Close")}</TabsTrigger> : null}</TabsList>
      <TabsContent value="summary" className="mt-5 space-y-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{canViewRevenue ? <><Metric label={t("logistics.finance.expected_revenue", "Expected revenue")} value={money(summary.expected_revenue)} detail={`${t("logistics.finance.billed", "Billed")} ${money(summary.billed_revenue)}`} /><Metric label={t("logistics.finance.unbilled_revenue", "Unbilled revenue")} value={money(summary.unbilled_revenue)} detail={`${t("logistics.finance.invoice_state", "Invoice state")}: ${summary.customer_invoice_state ?? "—"}`} /></> : null}{canViewCosts ? <><Metric label={t("logistics.finance.expected_cost", "Current expected cost")} value={money(summary.current_expected_cost)} detail={`${t("logistics.finance.estimated", "Estimated")} ${money(summary.estimated_cost)}`} /><Metric label={t("logistics.finance.actual_cost", "Actual cost")} value={money(summary.actual_cost)} detail={`${t("logistics.finance.accrued", "Accrued")} ${money(summary.accrued_cost)}`} /></> : null}</div>{canViewProfit && canViewRevenue && canViewCosts ? <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label={t("logistics.finance.projected_profit", "Projected profit")} value={money(summary.projected_profit)} detail={`${t("logistics.finance.margin", "Margin")} ${percent(summary.projected_margin_percentage)}`} /><Metric label={t("logistics.finance.actual_profit", "Actual profit")} value={money(summary.actual_profit)} detail={`${t("logistics.finance.margin", "Margin")} ${percent(summary.actual_margin_percentage)}`} /><Metric label={t("logistics.finance.cost_variance", "Cost variance")} value={money(summary.cost_variance)} detail={`${t("logistics.finance.markup", "Markup")} ${percent(summary.actual_markup_percentage)}`} /><Metric label={t("logistics.finance.revenue_variance", "Revenue variance")} value={money(summary.revenue_variance)} detail={`${t("logistics.finance.payment_state", "Receipt state")}: ${summary.customer_invoice_state ?? "—"}`} /></div> : null}</TabsContent>
      {canViewRevenue ? <TabsContent value="revenue" className="mt-5"><RevenuePanel finance={finance} refs={refs} financeReferences={referencesQuery.data} currency={currency} permissions={{ create: canCreateCharges, approve: canApproveCharges, bill: canBillCustomer }} actions={actions} t={t} /></TabsContent> : null}
      {canViewCosts ? <TabsContent value="costs" className="mt-5"><CostPanel finance={finance} refs={refs} financeReferences={referencesQuery.data} currency={currency} permissions={{ create: canCreateCosts, approve: canApproveCosts, bill: canBillVendor }} actions={actions} t={t} /></TabsContent> : null}
      {canViewCosts ? <TabsContent value="accruals" className="mt-5"><AccrualPanel finance={finance} references={referencesQuery.data} canManage={canManageAccruals} actions={actions} money={money} t={t} /></TabsContent> : null}
      {canViewProfit && canViewRevenue && canViewCosts ? <TabsContent value="close" className="mt-5"><ClosePanel finance={finance} references={referencesQuery.data} readiness={readinessQuery.data} loading={readinessQuery.isLoading} canClose={canClose} canReopen={canReopen} actions={actions} t={t} /></TabsContent> : null}
    </Tabs>
  </section>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <Card className="gap-3 py-4 shadow-none"><CardHeader className="px-4"><CardDescription>{label}</CardDescription><CardTitle className="font-mono text-xl tabular-nums">{value}</CardTitle></CardHeader><CardContent className="px-4 text-xs text-muted-foreground">{detail}</CardContent></Card>;
}

export type JobFinanceActions = Record<string, {
  mutate: (payload: Record<string, unknown>) => void;
  isPending: boolean;
}>;
