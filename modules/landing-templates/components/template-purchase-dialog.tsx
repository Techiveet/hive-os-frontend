"use client";

/**
 * Buy one paid landing template from inside the workspace.
 *
 * Mirrors the payment choices of the module checkout (gateway or direct bank
 * transfer) but for a single one-time line item. Gateway payments redirect to
 * the provider and come back to Settings → Landing Page with
 * ?template_checkout=<token>, where TenantTemplateMarketplace confirms them.
 */

import * as React from "react";
import { CreditCard, Landmark, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAppOrigin } from "@/lib/runtime-context";
import { cn } from "@/lib/utils";
import {
  purchaseTemplate,
  type TemplatePaymentOptions,
  type TenantTemplateCard,
} from "@/modules/landing-templates/lib/api";

type Props = {
  template: TenantTemplateCard | null;
  payment?: TemplatePaymentOptions;
  onOpenChange: (open: boolean) => void;
  /** Called after a transfer is submitted or the purchase completes in place. */
  onSubmitted: () => void;
};

export function formatEtb(amount: number | undefined | null) {
  return `ETB ${Number(amount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function TemplatePurchaseDialog({ template, payment, onOpenChange, onSubmitted }: Props) {
  const provider = payment?.payment_provider ?? null;
  const methods = React.useMemo(
    () => (provider?.payment_methods?.length ? provider.payment_methods : payment?.payment_methods ?? []),
    [payment?.payment_methods, provider?.payment_methods],
  );
  const gatewayReady = Boolean(provider?.configured && provider?.implemented !== false);
  const bankAccounts = payment?.direct_transfer?.configured ? payment.direct_transfer.bank_accounts ?? [] : [];
  const transferReady = bankAccounts.length > 0;
  const requiresPhone = provider?.requires_billing_phone ?? false;
  const supportsMethods = (provider?.supports_payment_methods ?? false) && methods.length > 0;

  const [channel, setChannel] = React.useState<"gateway" | "direct_transfer">(gatewayReady ? "gateway" : "direct_transfer");
  const [method, setMethod] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [bankId, setBankId] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Reset whenever a different template is opened.
  React.useEffect(() => {
    if (!template) return;
    setChannel(gatewayReady ? "gateway" : "direct_transfer");
    setMethod(methods[0]?.code ?? "");
    setPhone("");
    setBankId(bankAccounts[0]?.id ?? "");
    setReference("");
  }, [template?.id]);

  const selectedBank = bankAccounts.find((account) => account.id === bankId) ?? null;
  const noChannel = !gatewayReady && !transferReady;
  const canSubmit =
    !!template &&
    !submitting &&
    (channel === "gateway"
      ? gatewayReady && (!requiresPhone || phone.trim().length >= 9) && (!supportsMethods || !!method)
      : transferReady && !!bankId && reference.trim().length > 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!template || !canSubmit) return;

    setSubmitting(true);
    try {
      const origin = getAppOrigin();
      const { message, data } = await purchaseTemplate({
        template_id: template.id,
        checkout_channel: channel,
        payment_method: channel === "gateway" && supportsMethods ? method : null,
        billing_phone: channel === "gateway" ? phone.trim() || null : null,
        manual_bank_account_id: channel === "direct_transfer" ? bankId : null,
        manual_transaction_reference: channel === "direct_transfer" ? reference.trim() : null,
        success_url_base: origin,
        cancel_url_base: origin,
      });

      if (data.order.provider_checkout_url) {
        window.location.assign(data.order.provider_checkout_url);
        return;
      }

      toast.success(message);
      onOpenChange(false);
      onSubmitted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The purchase could not be started.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!template} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Buy “{template?.name}”</DialogTitle>
            <DialogDescription>
              A one-time purchase. The template is yours to use and customize for as long as your workspace is active.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 px-4 py-3">
            <span className="text-sm font-semibold text-foreground">{template?.name}</span>
            <span className="text-base font-black tabular-nums text-foreground">{formatEtb(template?.price_etb)}</span>
          </div>

          {noChannel ? (
            <p role="alert" className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
              Online payment is not set up for this platform yet. Ask the platform administrator to configure a payment
              gateway or a bank account for direct transfers.
            </p>
          ) : (
            <>
              <fieldset className="grid grid-cols-2 gap-2">
                <legend className="mb-2 text-sm font-semibold text-foreground">Payment method</legend>
                {[
                  { id: "gateway" as const, label: provider?.label ?? "Online payment", icon: CreditCard, ready: gatewayReady },
                  { id: "direct_transfer" as const, label: "Bank transfer", icon: Landmark, ready: transferReady },
                ].map(({ id, label, icon: Icon, ready }) => (
                  <button
                    key={id}
                    type="button"
                    disabled={!ready}
                    aria-pressed={channel === id}
                    onClick={() => setChannel(id)}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      channel === id ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground",
                      !ready && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </fieldset>

              {channel === "gateway" ? (
                <div className="space-y-4">
                  {supportsMethods && (
                    <div className="space-y-1.5">
                      <Label htmlFor="template-pay-method">Pay with</Label>
                      <Select value={method} onValueChange={setMethod}>
                        <SelectTrigger id="template-pay-method">
                          <SelectValue placeholder="Choose a payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          {methods.map((option) => (
                            <SelectItem key={option.code} value={option.code}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {requiresPhone && (
                    <div className="space-y-1.5">
                      <Label htmlFor="template-pay-phone">Billing phone</Label>
                      <Input
                        id="template-pay-phone"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="09xxxxxxxx"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                      />
                    </div>
                  )}
                  <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    You will be redirected to {provider?.label ?? "the payment provider"} and brought back here afterwards.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="template-pay-bank">Bank account you paid into</Label>
                    <Select value={bankId} onValueChange={setBankId}>
                      <SelectTrigger id="template-pay-bank">
                        <SelectValue placeholder="Choose a bank account" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.bank_name} · {account.account_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedBank && (
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl border border-border bg-muted/20 p-3 text-xs">
                      <dt className="text-muted-foreground">Account name</dt>
                      <dd className="font-semibold text-foreground">{selectedBank.account_name}</dd>
                      <dt className="text-muted-foreground">Account number</dt>
                      <dd className="font-mono font-semibold text-foreground">{selectedBank.account_number}</dd>
                      {selectedBank.branch ? (
                        <>
                          <dt className="text-muted-foreground">Branch</dt>
                          <dd className="text-foreground">{selectedBank.branch}</dd>
                        </>
                      ) : null}
                    </dl>
                  )}
                  {payment?.direct_transfer?.instructions ? (
                    <p className="text-xs leading-5 text-muted-foreground">{payment.direct_transfer.instructions}</p>
                  ) : null}
                  <div className="space-y-1.5">
                    <Label htmlFor="template-pay-reference">Transaction reference</Label>
                    <Input
                      id="template-pay-reference"
                      placeholder="e.g. FT24123ABCD"
                      value={reference}
                      onChange={(event) => setReference(event.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      The template unlocks as soon as an administrator verifies this transfer.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {channel === "gateway" ? `Pay ${formatEtb(template?.price_etb)}` : "Submit transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
