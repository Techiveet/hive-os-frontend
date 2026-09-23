"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/store/use-translation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  applyLeaseEscalation,
  chargeLeasePenalty,
  createLeaseEscalation,
  fetchLease,
  fetchLeaseBillingSchedule,
  fetchLeaseInvoices,
  generateLeaseInvoicesNow,
  previewLeaseEscalation,
  recordLeaseDepositPayment,
  terminateLease,
  transitionLease,
} from "@/modules/property/api";

// Mirrors PropertyLease::TRANSITIONS on the backend — the button row only
// ever offers a transition the state machine will actually accept.
const NEXT_STATUSES: Record<string, string[]> = {
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
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
};

export default function LeaseDetailPage() {
  const params = useParams<{ id: string }>();
  const leaseId = Number(params.id);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [terminateOpen, setTerminateOpen] = React.useState(false);
  const [terminationReason, setTerminationReason] = React.useState("");
  const [depositAmount, setDepositAmount] = React.useState("");
  const [escalationForm, setEscalationForm] = React.useState({ rule_type: "fixed_percentage", value: "", effective_date: "" });
  const [preview, setPreview] = React.useState<string | null>(null);
  const [penaltyOpen, setPenaltyOpen] = React.useState(false);
  const [penaltyForm, setPenaltyForm] = React.useState({ amount: "", reason: "" });

  const leaseQuery = useQuery({
    queryKey: ["property", "leases", leaseId],
    queryFn: () => fetchLease(leaseId),
    enabled: Number.isFinite(leaseId),
  });

  const scheduleQuery = useQuery({
    queryKey: ["property", "leases", leaseId, "billing-schedule"],
    queryFn: () => fetchLeaseBillingSchedule(leaseId),
    enabled: Number.isFinite(leaseId),
  });

  const invoicesQuery = useQuery({
    queryKey: ["property", "leases", leaseId, "invoices"],
    queryFn: () => fetchLeaseInvoices(leaseId),
    enabled: Number.isFinite(leaseId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["property", "leases", leaseId] });
    queryClient.invalidateQueries({ queryKey: ["property", "leases", leaseId, "billing-schedule"] });
    queryClient.invalidateQueries({ queryKey: ["property", "leases", leaseId, "invoices"] });
  };

  const transitionMutation = useMutation({
    mutationFn: (status: string) => transitionLease(leaseId, status),
    onSuccess: () => {
      toast.success(t("property.leases.status_updated", "Lease status updated."));
      invalidate();
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.units.status_failed", "That transition is not allowed."))),
  });

  const terminateMutation = useMutation({
    mutationFn: () => terminateLease(leaseId, terminationReason.trim()),
    onSuccess: () => {
      toast.success(t("property.leases.terminated", "Lease terminated."));
      setTerminateOpen(false);
      setTerminationReason("");
      invalidate();
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const depositMutation = useMutation({
    mutationFn: () => recordLeaseDepositPayment(leaseId, Number(depositAmount)),
    onSuccess: () => {
      toast.success(t("property.leases.deposit_recorded", "Payment recorded."));
      setDepositAmount("");
      invalidate();
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const previewMutation = useMutation({
    mutationFn: () => previewLeaseEscalation(leaseId, escalationForm.rule_type, Number(escalationForm.value)),
    onSuccess: (data) => setPreview(data.new_rent_amount),
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to preview."))),
  });

  const createEscalationMutation = useMutation({
    mutationFn: () =>
      createLeaseEscalation(leaseId, {
        rule_type: escalationForm.rule_type,
        value: Number(escalationForm.value),
        effective_date: escalationForm.effective_date,
      }),
    onSuccess: () => {
      toast.success(t("property.leases.escalation_created", "Escalation scheduled."));
      setEscalationForm({ rule_type: "fixed_percentage", value: "", effective_date: "" });
      setPreview(null);
      invalidate();
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const applyEscalationMutation = useMutation({
    mutationFn: (escalationId: number) => applyLeaseEscalation(escalationId),
    onSuccess: () => {
      toast.success(t("property.leases.escalation_applied", "Escalation applied."));
      invalidate();
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const generateInvoicesMutation = useMutation({
    mutationFn: () => generateLeaseInvoicesNow(leaseId),
    onSuccess: (data) => {
      toast.success(
        data.generated.length > 0
          ? t("property.leases.invoices_generated", "Invoice generated.")
          : t("property.leases.no_invoices_due", "Nothing due yet.")
      );
      invalidate();
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const chargePenaltyMutation = useMutation({
    mutationFn: () => chargeLeasePenalty(leaseId, { amount: Number(penaltyForm.amount), reason: penaltyForm.reason.trim() }),
    onSuccess: () => {
      toast.success(t("property.leases.penalty_charged", "Penalty charged."));
      setPenaltyOpen(false);
      setPenaltyForm({ amount: "", reason: "" });
      invalidate();
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  if (leaseQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const lease = leaseQuery.data;
  if (!lease) {
    return <p className="text-sm text-muted-foreground">{t("property.leases.not_found", "Lease not found.")}</p>;
  }

  const nextStatuses = NEXT_STATUSES[lease.status] ?? [];
  const canTerminate = lease.status === "active" || lease.status === "renewal_due" || lease.status === "expiring";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{lease.lease_number}</h1>
        <p className="text-sm text-muted-foreground">
          {lease.property?.name} · {lease.occupant?.name} · {lease.currency} {lease.rent_amount}/mo
        </p>
        <div className="mt-2">
          <Badge>{lease.status.replace(/_/g, " ")}</Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {nextStatuses.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={status === "cancelled" || status === "rejected" ? "destructive" : "default"}
            className="rounded-full"
            disabled={transitionMutation.isPending}
            onClick={() => transitionMutation.mutate(status)}
          >
            {status.replace(/_/g, " ")}
          </Button>
        ))}
        {canTerminate && (
          <Button size="sm" variant="destructive" className="rounded-full" onClick={() => setTerminateOpen(true)}>
            {t("property.leases.terminate", "Terminate")}
          </Button>
        )}
      </div>

      <Card className="rounded-[2rem] border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("property.leases.billing_title", "Billing")}</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={generateInvoicesMutation.isPending}
              onClick={() => generateInvoicesMutation.mutate()}
            >
              {generateInvoicesMutation.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              {t("property.leases.generate_now", "Generate Now")}
            </Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setPenaltyOpen(true)}>
              {t("property.leases.charge_penalty", "Charge Penalty")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(scheduleQuery.data ?? []).map((schedule) => (
            <p key={schedule.id} className="text-sm text-muted-foreground">
              {schedule.charge_type} · {schedule.frequency} · {schedule.currency} {schedule.amount} ·{" "}
              {t("property.leases.next_due", "Next due")}: {schedule.next_due_date}
              {!schedule.is_active && <Badge variant="secondary" className="ml-2">{t("property.leases.inactive", "inactive")}</Badge>}
            </p>
          ))}

          <p className="text-sm font-medium">
            {t("property.leases.outstanding_balance", "Outstanding balance")}: {lease.currency}{" "}
            {(invoicesQuery.data?.outstanding_balance ?? 0).toFixed(2)}
          </p>

          <div className="space-y-2">
            {(invoicesQuery.data?.documents ?? []).map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{doc.number}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.type.replace(/_/g, " ")} · {doc.document_date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm">{doc.currency} {doc.total}</p>
                  <Badge variant="outline">{doc.status.replace(/_/g, " ")}</Badge>
                </div>
              </div>
            ))}
            {(invoicesQuery.data?.documents ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">{t("property.leases.no_invoices", "No invoices yet.")}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-border/60">
        <CardHeader>
          <CardTitle>{t("property.leases.deposit_title", "Security Deposit")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lease.deposit ? (
            <>
              <p className="text-sm">
                {t("property.leases.deposit_status", "Status")}: <Badge variant="outline">{lease.deposit.status.replace(/_/g, " ")}</Badge>
              </p>
              <p className="text-sm text-muted-foreground">
                {lease.currency} {lease.deposit.paid_amount} / {lease.deposit.required_amount}
              </p>
              {lease.deposit.status !== "refunded" && lease.deposit.status !== "forfeited" && (
                <div className="flex items-end gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="deposit-amount">{t("property.leases.record_payment", "Record payment")}</Label>
                    <Input id="deposit-amount" type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="w-40" />
                  </div>
                  <Button size="sm" className="rounded-full" disabled={!depositAmount || depositMutation.isPending} onClick={() => depositMutation.mutate()}>
                    {depositMutation.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                    {t("property.common.confirm", "Confirm")}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("property.leases.no_deposit", "No deposit required on this lease.")}</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-border/60">
        <CardHeader>
          <CardTitle>{t("property.leases.escalations_title", "Rent Escalations")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(lease.escalations ?? []).map((escalation) => (
            <div key={escalation.id} className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium">
                  {escalation.rule_type.replace(/_/g, " ")} · {escalation.value} · {escalation.effective_date}
                </p>
                <p className="text-xs text-muted-foreground">
                  {escalation.applied_at
                    ? `${t("property.leases.applied", "Applied")}: ${escalation.previous_rent_amount} → ${escalation.new_rent_amount}`
                    : t("property.leases.pending", "Pending")}
                </p>
              </div>
              {!escalation.applied_at && (
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => applyEscalationMutation.mutate(escalation.id)}>
                  {t("property.leases.apply", "Apply")}
                </Button>
              )}
            </div>
          ))}

          <div className="grid grid-cols-3 gap-3">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={escalationForm.rule_type}
              onChange={(e) => setEscalationForm((prev) => ({ ...prev, rule_type: e.target.value }))}
            >
              <option value="fixed_percentage">{t("property.leases.rule_percentage", "Fixed %")}</option>
              <option value="fixed_amount">{t("property.leases.rule_amount", "Fixed amount")}</option>
              <option value="stepped">{t("property.leases.rule_stepped", "Stepped")}</option>
            </select>
            <Input
              type="number"
              placeholder={t("property.leases.value", "Value")}
              value={escalationForm.value}
              onChange={(e) => setEscalationForm((prev) => ({ ...prev, value: e.target.value }))}
            />
            <Input
              type="date"
              value={escalationForm.effective_date}
              onChange={(e) => setEscalationForm((prev) => ({ ...prev, effective_date: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={!escalationForm.value || previewMutation.isPending}
              onClick={() => previewMutation.mutate()}
            >
              {t("property.leases.preview", "Preview")}
            </Button>
            {preview && (
              <span className="text-sm text-muted-foreground">
                {t("property.leases.new_rent", "New rent")}: {lease.currency} {preview}
              </span>
            )}
            <Button
              size="sm"
              className="rounded-full"
              disabled={!escalationForm.value || !escalationForm.effective_date || createEscalationMutation.isPending}
              onClick={() => createEscalationMutation.mutate()}
            >
              {t("property.leases.schedule", "Schedule")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={terminateOpen} onOpenChange={setTerminateOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle>{t("property.leases.terminate", "Terminate")}</DialogTitle>
              <DialogDescription>{t("property.leases.terminate_desc", "The unit moves to Notice Given, not straight back to Available.")}</DialogDescription>
            </DialogHeader>
          </div>
          <div className="grid gap-4 px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="termination-reason">{t("property.leases.reason", "Reason")}</Label>
              <Input id="termination-reason" value={terminationReason} onChange={(e) => setTerminationReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="border-t border-border/40 bg-muted/20 px-6 py-4 sm:justify-end">
            <Button variant="outline" className="rounded-full" onClick={() => setTerminateOpen(false)}>
              {t("property.common.cancel", "Cancel")}
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              disabled={!terminationReason.trim() || terminateMutation.isPending}
              onClick={() => terminateMutation.mutate()}
            >
              {terminateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("property.common.confirm", "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={penaltyOpen} onOpenChange={setPenaltyOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle>{t("property.leases.charge_penalty", "Charge Penalty")}</DialogTitle>
              <DialogDescription>{t("property.leases.penalty_desc", "Posts an invoice against the occupant immediately.")}</DialogDescription>
            </DialogHeader>
          </div>
          <div className="grid gap-4 px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="penalty-amount">{t("property.leases.penalty_amount", "Amount")}</Label>
              <Input
                id="penalty-amount"
                type="number"
                value={penaltyForm.amount}
                onChange={(e) => setPenaltyForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="penalty-reason">{t("property.leases.reason", "Reason")}</Label>
              <Input
                id="penalty-reason"
                value={penaltyForm.reason}
                onChange={(e) => setPenaltyForm((prev) => ({ ...prev, reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="border-t border-border/40 bg-muted/20 px-6 py-4 sm:justify-end">
            <Button variant="outline" className="rounded-full" onClick={() => setPenaltyOpen(false)}>
              {t("property.common.cancel", "Cancel")}
            </Button>
            <Button
              className="rounded-full"
              disabled={!penaltyForm.amount || !penaltyForm.reason.trim() || chargePenaltyMutation.isPending}
              onClick={() => chargePenaltyMutation.mutate()}
            >
              {chargePenaltyMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("property.common.confirm", "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
