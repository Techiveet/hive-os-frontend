"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Receipt } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { propertyApi } from "@/modules/property/api";
import {
  FormDialog,
  type FormField,
  type FormValues,
  SectionTabs,
  SimpleTable,
  StatusBadge,
  dateOnly,
  errorText,
  humanize,
  money,
  rowsOf,
} from "@/modules/property/components/property-ui";
import { BILLING_FREQUENCIES } from "@/modules/property/pages/LeasesPage";
import { EmptyPanel, LoadingPanel, Panel, StatTile } from "@/modules/shared/charts/primitives";

const LEASE_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["under_review", "cancelled"],
  under_review: ["approved", "rejected", "cancelled"],
  approved: ["awaiting_signature", "cancelled"],
  awaiting_signature: ["signed", "cancelled"],
  signed: ["scheduled", "active", "cancelled"],
  scheduled: ["active", "cancelled"],
  active: ["renewal_due", "expiring"],
  renewal_due: ["active", "expiring"],
  expiring: ["active", "expired"],
  rejected: ["draft"],
};

const TRANSITION_LABELS: Record<string, string> = {
  submitted: "Submit",
  under_review: "Start review",
  approved: "Approve",
  rejected: "Reject",
  awaiting_signature: "Send for signature",
  signed: "Mark signed",
  scheduled: "Schedule",
  active: "Activate",
  renewal_due: "Mark renewal due",
  expiring: "Mark expiring",
  expired: "Mark expired",
  cancelled: "Cancel lease",
  draft: "Back to draft",
};

const ACTIVE = ["active", "renewal_due", "expiring"];

type Tab = "terms" | "billing" | "deposit" | "escalations" | "turnover";
type DialogKind =
  | { kind: "transition"; status: string }
  | { kind: "terminate" }
  | { kind: "edit" }
  | { kind: "penalty" }
  | { kind: "deposit-payment" }
  | { kind: "deposit-refund" }
  | { kind: "deposit-forfeit" }
  | { kind: "escalation" }
  | { kind: "turnover" }
  | { kind: "sales-report" };

export default function LeaseDetailPage() {
  const params = useParams();
  const leaseId = String(params?.id ?? "");
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState<Tab>("terms");
  const [dialog, setDialog] = React.useState<DialogKind | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  const leaseQuery = useQuery({
    queryKey: ["property", "lease", leaseId],
    queryFn: () => propertyApi.getLease(leaseId).then((res) => res.data),
    enabled: Boolean(leaseId),
  });
  const scheduleQuery = useQuery({
    queryKey: ["property", "lease-schedule", leaseId],
    queryFn: () => propertyApi.billingSchedule(leaseId).then((res) => res.data),
    enabled: tab === "billing",
  });
  const invoicesQuery = useQuery({
    queryKey: ["property", "lease-invoices", leaseId],
    queryFn: () => propertyApi.leaseInvoices(leaseId).then((res) => res.data),
    enabled: tab === "billing",
  });
  const depositQuery = useQuery({
    queryKey: ["property", "lease-deposit", leaseId],
    queryFn: () => propertyApi.leaseDeposit(leaseId).then((res) => res.data),
    enabled: tab === "deposit",
  });
  const escalationsQuery = useQuery({
    queryKey: ["property", "lease-escalations", leaseId],
    queryFn: () => propertyApi.listEscalations(leaseId).then((res) => res.data),
    enabled: tab === "escalations",
  });
  const turnoverQuery = useQuery({
    queryKey: ["property", "lease-turnover", leaseId],
    queryFn: () => propertyApi.turnoverTerms(leaseId).then((res) => res.data),
    enabled: tab === "turnover",
    retry: false,
  });
  const salesQuery = useQuery({
    queryKey: ["property", "lease-sales", leaseId],
    queryFn: () => propertyApi.listSalesReports({ lease_id: leaseId, per_page: 50 }).then((res) => res.data),
    enabled: tab === "turnover",
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["property"] });

  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      toast.success("Done.");
      setDialog(null);
      setPreview(null);
      invalidate();
    },
    onError: (error) => toast.error(errorText(error, "That did not work.")),
  });

  const lease = leaseQuery.data;
  if (leaseQuery.isLoading) return <LoadingPanel label="Loading lease…" />;
  if (!lease) return <EmptyPanel label="This lease could not be found." />;

  const currency = lease.currency || "ETB";
  const next = LEASE_TRANSITIONS[lease.status] ?? [];
  const canTerminate = ACTIVE.includes(lease.status);
  const deposit = depositQuery.data && typeof depositQuery.data === "object" && "id" in depositQuery.data ? depositQuery.data : null;
  const turnover = turnoverQuery.data && typeof turnoverQuery.data === "object" && "percentage_rate" in turnoverQuery.data ? turnoverQuery.data : null;

  const fact = (label: string, value: React.ReactNode) => (
    <div>
      <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value ?? "—"}</dd>
    </div>
  );

  const dialogConfig = (d: DialogKind): { title: string; description?: string; fields: FormField[]; initial?: FormValues; submit: (v: FormValues) => Promise<unknown>; label?: string } => {
    switch (d.kind) {
      case "transition":
        return {
          title: TRANSITION_LABELS[d.status] ?? humanize(d.status),
          description: `Move ${lease.lease_number} to "${humanize(d.status)}".`,
          fields: [{ name: "reason", label: "Note (optional)", type: "textarea" }],
          submit: (v) => propertyApi.transitionLease(leaseId, d.status, v.reason),
          label: TRANSITION_LABELS[d.status] ?? "Confirm",
        };
      case "terminate":
        return {
          title: "Terminate lease",
          description: "Ends the lease early. Billing stops and the units are released.",
          fields: [
            { name: "reason", label: "Reason", type: "textarea", required: true },
            { name: "effective_date", label: "Effective date", type: "date" },
          ],
          submit: (v) => propertyApi.terminateLease(leaseId, v.reason, v.effective_date),
          label: "Terminate",
        };
      case "edit":
        return {
          title: "Edit draft lease",
          fields: [
            { name: "commencement_date", label: "Commencement", type: "date", required: true },
            { name: "expiry_date", label: "Expiry", type: "date", required: true },
            { name: "billing_start_date", label: "Billing starts", type: "date" },
            { name: "rent_amount", label: "Rent per period", type: "number", min: 0, required: true },
            { name: "billing_frequency", label: "Billing frequency", type: "select", options: BILLING_FREQUENCIES },
            { name: "security_deposit_amount", label: "Security deposit", type: "number", min: 0 },
            { name: "notice_period_days", label: "Notice period (days)", type: "number", min: 0 },
            { name: "grace_period_days", label: "Payment grace (days)", type: "number", min: 0 },
            { name: "terms", label: "Special terms", type: "textarea" },
          ],
          initial: lease,
          submit: (v) => propertyApi.updateLease(leaseId, v),
        };
      case "penalty":
        return {
          title: "Charge a penalty",
          description: "Raises an invoice for the penalty against this lease.",
          fields: [
            { name: "amount", label: "Amount", type: "number", min: 0, required: true },
            { name: "reason", label: "Reason", required: true, wide: true },
          ],
          submit: (v) => propertyApi.chargePenalty(leaseId, v.amount, v.reason),
          label: "Charge",
        };
      case "deposit-payment":
        return {
          title: "Record deposit payment",
          fields: [{ name: "amount", label: "Amount received", type: "number", min: 0, required: true }],
          submit: (v) => propertyApi.recordDepositPayment(leaseId, v.amount),
          label: "Record",
        };
      case "deposit-refund":
        return {
          title: "Refund deposit",
          description: "Refund what is owed, less any deductions for damage or unpaid rent.",
          fields: [
            { name: "refunded_amount", label: "Amount refunded", type: "number", min: 0, required: true },
            { name: "deduction_amount", label: "Deduction", type: "number", min: 0 },
            { name: "deduction_reason", label: "Deduction reason", wide: true },
          ],
          submit: (v) => propertyApi.refundDeposit(leaseId, v),
          label: "Refund",
        };
      case "deposit-forfeit":
        return {
          title: "Forfeit deposit",
          fields: [{ name: "deduction_reason", label: "Reason", type: "textarea", required: true }],
          submit: (v) => propertyApi.forfeitDeposit(leaseId, v.deduction_reason),
          label: "Forfeit",
        };
      case "escalation":
        return {
          title: "Schedule rent escalation",
          description: preview ? `New rent would be ${money(preview, currency)} (currently ${money(lease.rent_amount, currency)}).` : "Preview the new rent before scheduling it.",
          fields: [
            {
              name: "rule_type",
              label: "Rule",
              type: "select",
              required: true,
              options: [
                { value: "fixed_percentage", label: "Percentage increase" },
                { value: "fixed_amount", label: "Fixed amount increase" },
                { value: "stepped", label: "Stepped (new rent)" },
              ],
            },
            { name: "value", label: "Value", type: "number", required: true, help: "Percent, amount, or the new rent for stepped." },
            { name: "effective_date", label: "Effective from", type: "date", required: true },
          ],
          submit: (v) => propertyApi.createEscalation(leaseId, v),
          label: "Schedule",
        };
      case "turnover":
        return {
          title: "Turnover rent terms",
          description: "Percentage rent on the occupier's sales above a breakpoint.",
          fields: [
            { name: "percentage_rate", label: "Rate (0–1, e.g. 0.08 for 8%)", type: "number", min: 0, step: "0.0001", required: true },
            { name: "base_rent_amount", label: "Base rent", type: "number", min: 0 },
            { name: "breakpoint_amount", label: "Breakpoint (sales)", type: "number", min: 0 },
            {
              name: "period",
              label: "Period",
              type: "select",
              options: [
                { value: "monthly", label: "Monthly" },
                { value: "quarterly", label: "Quarterly" },
              ],
            },
            { name: "is_active", label: "Active", type: "checkbox" },
          ],
          initial: turnover ?? { is_active: true, period: "monthly" },
          submit: (v) => propertyApi.saveTurnoverTerms(leaseId, v),
        };
      case "sales-report":
        return {
          title: "Submit sales report",
          fields: [
            {
              name: "period_type",
              label: "Period",
              type: "select",
              required: true,
              options: [
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
              ],
            },
            { name: "period_start", label: "From", type: "date", required: true },
            { name: "period_end", label: "To", type: "date", required: true },
            { name: "gross_sales", label: "Gross sales", type: "number", min: 0, required: true },
            { name: "refunds", label: "Refunds", type: "number", min: 0 },
            { name: "tax_amount", label: "Tax", type: "number", min: 0 },
            { name: "transaction_count", label: "Transactions", type: "number", min: 0 },
          ],
          initial: { period_type: "monthly" },
          submit: (v) => propertyApi.submitSalesReport(leaseId, v),
          label: "Submit",
        };
    }
  };

  const active = dialog ? dialogConfig(dialog) : null;
  const invoices = invoicesQuery.data?.documents ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <Link href="/dashboard/property/leases" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Leases
          </Link>
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-black tracking-tight">
            {lease.lease_number} <StatusBadge status={lease.status} />
          </h1>
          <p className="text-sm text-muted-foreground">
            {lease.occupant?.name ?? "—"} ·{" "}
            {lease.property ? (
              <Link href={`/dashboard/property/properties/${lease.property.id}`} className="hover:underline">
                {lease.property.name}
              </Link>
            ) : null}{" "}
            {lease.units?.length ? `· ${lease.units.map((u: any) => u.unit_code).join(", ")}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {lease.status === "draft" ? (
            <Button variant="outline" className="rounded-full" onClick={() => setDialog({ kind: "edit" })}>
              Edit
            </Button>
          ) : null}
          {next.map((status) => (
            <Button
              key={status}
              variant={["cancelled", "rejected"].includes(status) ? "outline" : "default"}
              className="rounded-full"
              onClick={() => setDialog({ kind: "transition", status })}
            >
              {TRANSITION_LABELS[status] ?? humanize(status)}
            </Button>
          ))}
          {canTerminate ? (
            <Button variant="destructive" className="rounded-full" onClick={() => setDialog({ kind: "terminate" })}>
              Terminate
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Rent" value={money(lease.rent_amount, currency)} meta={`per ${humanize(lease.billing_frequency ?? "period")}`} />
        <StatTile label="Term" value={`${dateOnly(lease.commencement_date)} → ${dateOnly(lease.expiry_date)}`} />
        <StatTile label="Security deposit" value={lease.security_deposit_amount ? money(lease.security_deposit_amount, currency) : "—"} />
        <StatTile label="Notice / grace" value={`${lease.notice_period_days ?? 0} / ${lease.grace_period_days ?? 0} days`} />
      </div>

      <SectionTabs<Tab>
        tabs={[
          { id: "terms", label: "Terms" },
          { id: "billing", label: "Billing & invoices" },
          { id: "deposit", label: "Deposit" },
          { id: "escalations", label: "Escalations" },
          { id: "turnover", label: "Turnover rent" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "terms" ? (
        <Panel title="Terms">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {fact("Occupier", lease.occupant?.name)}
            {fact("Owner", lease.owner?.name)}
            {fact("Possession", dateOnly(lease.possession_date))}
            {fact("Billing starts", dateOnly(lease.billing_start_date))}
            {fact("Signed", dateOnly(lease.signed_at))}
            {fact("Activated", dateOnly(lease.activated_at))}
            {lease.terminated_at ? fact("Terminated", `${dateOnly(lease.terminated_at)} — ${lease.termination_reason ?? ""}`) : null}
          </dl>
          {lease.terms ? <p className="mt-4 whitespace-pre-wrap text-sm">{lease.terms}</p> : null}
        </Panel>
      ) : null}

      {tab === "billing" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel
            title="Billing schedule"
            description="Rent is invoiced automatically on each due date; you can also bill anything already due now."
            action={
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={run.isPending} onClick={() => run.mutate(() => propertyApi.generateInvoices(leaseId))}>
                  <Receipt className="mr-1 h-4 w-4" /> Bill due now
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "penalty" })}>
                  Penalty
                </Button>
              </div>
            }
          >
            <SimpleTable
              loading={scheduleQuery.isLoading}
              rows={rowsOf<any>(scheduleQuery.data)}
              empty="No billing schedule yet — it is created when the lease is activated."
              columns={[
                { key: "charge_type", label: "Charge" },
                { key: "frequency", label: "Frequency" },
                { key: "amount", label: "Amount", render: (row) => money(row.amount, row.currency || currency) },
                { key: "next_due_date", label: "Next due", render: (row) => dateOnly(row.next_due_date) },
                { key: "is_active", label: "Active", render: (row) => (row.is_active ? "Yes" : "No") },
              ]}
            />
          </Panel>
          <Panel
            title="Invoices"
            description={invoicesQuery.data ? `Outstanding balance: ${money(invoicesQuery.data.outstanding_balance, currency)}` : undefined}
          >
            <SimpleTable
              loading={invoicesQuery.isLoading}
              rows={invoices}
              empty="No invoices yet."
              columns={[
                { key: "number", label: "Invoice", render: (row) => <span className="font-mono text-xs">{row.number}</span> },
                { key: "document_date", label: "Date", render: (row) => dateOnly(row.document_date) },
                { key: "due_date", label: "Due", render: (row) => dateOnly(row.due_date) },
                { key: "total", label: "Total", render: (row) => money(row.total, row.currency || currency) },
                { key: "paid_amount", label: "Paid", render: (row) => money(row.paid_amount, row.currency || currency) },
                { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
              ]}
            />
          </Panel>
        </div>
      ) : null}

      {tab === "deposit" ? (
        <Panel
          title="Security deposit"
          action={
            deposit ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "deposit-payment" })}>
                  Record payment
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "deposit-refund" })}>
                  Refund
                </Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDialog({ kind: "deposit-forfeit" })}>
                  Forfeit
                </Button>
              </div>
            ) : null
          }
        >
          {depositQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !deposit ? (
            <p className="text-sm text-muted-foreground">This lease has no deposit on record.</p>
          ) : (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {fact("Required", money(deposit.required_amount, currency))}
              {fact("Paid", money(deposit.paid_amount, currency))}
              {fact("Status", <StatusBadge status={deposit.status} />)}
              {fact("Paid on", dateOnly(deposit.paid_at))}
              {fact("Refunded", deposit.refunded_amount ? money(deposit.refunded_amount, currency) : null)}
              {fact("Deductions", deposit.deduction_amount ? `${money(deposit.deduction_amount, currency)} — ${deposit.deduction_reason ?? ""}` : null)}
            </dl>
          )}
        </Panel>
      ) : null}

      {tab === "escalations" ? (
        <Panel
          title="Rent escalations"
          action={
            <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "escalation" })}>
              Schedule escalation
            </Button>
          }
        >
          <SimpleTable
            loading={escalationsQuery.isLoading}
            rows={rowsOf<any>(escalationsQuery.data)}
            empty="No escalations scheduled."
            columns={[
              { key: "rule_type", label: "Rule" },
              { key: "value", label: "Value" },
              { key: "effective_date", label: "Effective", render: (row) => dateOnly(row.effective_date) },
              { key: "previous_rent_amount", label: "From", render: (row) => (row.previous_rent_amount ? money(row.previous_rent_amount, currency) : "—") },
              { key: "new_rent_amount", label: "To", render: (row) => (row.new_rent_amount ? money(row.new_rent_amount, currency) : "—") },
              {
                key: "applied_at",
                label: "",
                className: "text-right",
                render: (row) =>
                  row.applied_at ? (
                    <span className="text-xs text-muted-foreground">Applied {dateOnly(row.applied_at)}</span>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => run.mutate(() => propertyApi.applyEscalation(row.id))}>
                      Apply now
                    </Button>
                  ),
              },
            ]}
          />
        </Panel>
      ) : null}

      {tab === "turnover" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel
            title="Turnover rent terms"
            action={
              <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "turnover" })}>
                {turnover ? "Edit" : "Set up"}
              </Button>
            }
          >
            {turnover ? (
              <dl className="grid grid-cols-2 gap-4">
                {fact("Rate", `${(Number(turnover.percentage_rate) * 100).toFixed(2)}%`)}
                {fact("Base rent", turnover.base_rent_amount ? money(turnover.base_rent_amount, currency) : null)}
                {fact("Breakpoint", turnover.breakpoint_amount ? money(turnover.breakpoint_amount, currency) : null)}
                {fact("Period", humanize(turnover.period))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">No turnover rent on this lease.</p>
            )}
          </Panel>
          <Panel
            title="Sales reports"
            action={
              <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "sales-report" })}>
                Submit report
              </Button>
            }
          >
            <SimpleTable
              loading={salesQuery.isLoading}
              rows={rowsOf<any>(salesQuery.data)}
              empty="No sales reported."
              columns={[
                { key: "period", label: "Period", render: (row) => `${dateOnly(row.period_start)} → ${dateOnly(row.period_end)}` },
                { key: "net_sales", label: "Net sales", render: (row) => money(row.net_sales, currency) },
                { key: "calculated_turnover_rent", label: "Turnover rent", render: (row) => (row.calculated_turnover_rent ? money(row.calculated_turnover_rent, currency) : "—") },
                { key: "approval_status", label: "Status", render: (row) => <StatusBadge status={row.approval_status} /> },
              ]}
            />
          </Panel>
        </div>
      ) : null}

      {active && dialog ? (
        <FormDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setDialog(null);
              setPreview(null);
            }
          }}
          title={active.title}
          description={active.description}
          fields={active.fields}
          initial={active.initial}
          submitLabel={active.label ?? "Save"}
          submitting={run.isPending}
          onSubmit={async (values) => {
            if (dialog.kind === "escalation" && preview === null) {
              try {
                const res = await propertyApi.previewEscalation(leaseId, { rule_type: values.rule_type, value: values.value });
                setPreview(String(res.data?.new_rent_amount ?? ""));
                toast.info("Check the new rent above, then schedule it.");
              } catch (error) {
                toast.error(errorText(error, "Could not preview it."));
              }
              return;
            }
            run.mutate(() => active.submit(values));
          }}
        />
      ) : null}
    </div>
  );
}
