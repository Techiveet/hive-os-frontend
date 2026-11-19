"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Copy, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { B2BDash, type B2BGatewayProvider, type B2BPaymentGateway, type B2BPaymentGatewayInput } from "@/modules/b2b-marketplace/api";
import { getWorkspaceScopeKey } from "@/lib/runtime-context";

type ApiError = { response?: { status?: number; data?: { message?: string; code?: string } }; message?: string };

const errorText = (e: unknown): string => {
  const err = e as ApiError;
  return err?.response?.data?.message || err?.message || "Something went wrong";
};

/** The server asks for an explicit yes when a payout or refund is still travelling through the current account. */
const needsConfirmation = (e: unknown): boolean => (e as ApiError)?.response?.data?.code === "pending_gateway_operations";

const SECRET_HELP: Record<B2BGatewayProvider, { secret: string; webhook: string; webhookHint: string }> = {
  chapa: {
    secret: "CHASECK_...",
    webhook: "A secret you choose (16+ characters)",
    webhookHint: "Enter the same secret here and as the Secret Hash in your Chapa dashboard. Automatic supplier payouts need it.",
  },
  stripe: {
    secret: "sk_live_... or sk_test_...",
    webhook: "whsec_...",
    webhookHint: "The signing secret Stripe shows for the webhook endpoint below.",
  },
  arifpay: {
    secret: "your ArifPay API key",
    webhook: "",
    webhookHint:
      "Buyers pay with Telebirr or their bank on ArifPay's page, and ArifPay pays every payment straight into the bank account below, so it must be YOUR account. ArifPay cannot refund payments: refunds to buyers are sent by you.",
  },
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the URL is still selectable in the box.
    }
  };

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <Input readOnly value={value} className="h-9 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <Button type="button" size="sm" variant="outline" onClick={copy} aria-label={`Copy ${label}`}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function statusBadge(g: B2BPaymentGateway) {
  if (!g.platform_enabled) return <Badge variant="secondary">Not allowed by the platform</Badge>;
  if (g.source === "central") return <Badge variant="destructive">Using the platform account</Badge>;
  if (g.active) return <Badge>Active{g.key_mode === "test" ? " (test keys)" : ""}</Badge>;
  if (g.configured) return <Badge variant="secondary">Paused</Badge>;
  return <Badge variant="secondary">Not set up</Badge>;
}

function GatewayPanel({ gateway }: { gateway: B2BPaymentGateway }) {
  const qc = useQueryClient();
  const help = SECRET_HELP[gateway.provider];
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [settlementAccount, setSettlementAccount] = useState("");
  const [settlementBank, setSettlementBank] = useState("");
  const isArifPay = gateway.provider === "arifpay";
  const [message, setMessage] = useState<string | null>(null);

  const done = (data: B2BPaymentGateway[], text: string) => {
    qc.setQueryData(["b2b", "paymentGateways", getWorkspaceScopeKey()], data);
    // The checkout and the payout screens read what is available from these.
    qc.invalidateQueries({ queryKey: ["b2b", "paymentMethods"] });
    qc.invalidateQueries({ queryKey: ["b2b", "payoutBanks"] });
    setSecretKey("");
    setWebhookSecret("");
    setSettlementAccount("");
    setSettlementBank("");
    setMessage(text);
  };

  // Ask before swapping the account while money is still on its way, then repeat the request with a yes.
  const confirmPending = (action: string) =>
    window.confirm(
      `Some payouts or refunds are still being processed through your current ${gateway.label} account. ` +
        `${action} now means they can no longer be confirmed automatically. Continue anyway?`,
    );

  const save = useMutation({
    mutationFn: async (payload: { enabled?: boolean; keys?: boolean }) => {
      // Blank secrets are left out of the request on purpose: the server then keeps the saved ones.
      const body: B2BPaymentGatewayInput = {};
      if (payload.enabled !== undefined) body.enabled = payload.enabled;
      if (payload.keys) {
        if (secretKey.trim() !== "") body.secret_key = secretKey.trim();
        if (webhookSecret.trim() !== "") body.webhook_secret = webhookSecret.trim();
        if (settlementAccount.trim() !== "") body.settlement_account = settlementAccount.trim();
        if (settlementBank.trim() !== "") body.settlement_bank = settlementBank.trim();
      }
      try {
        return await B2BDash.savePaymentGateway(gateway.provider, body);
      } catch (e) {
        if (needsConfirmation(e) && confirmPending("Replacing the account")) {
          return B2BDash.savePaymentGateway(gateway.provider, { ...body, confirm_pending_operations: true });
        }
        throw e;
      }
    },
    onSuccess: (data) => done(data, `${gateway.label} settings saved.`),
  });

  const remove = useMutation({
    mutationFn: async () => {
      try {
        return await B2BDash.removePaymentGateway(gateway.provider);
      } catch (e) {
        if (needsConfirmation(e) && confirmPending("Removing the account")) {
          return B2BDash.removePaymentGateway(gateway.provider, true);
        }
        throw e;
      }
    },
    onSuccess: (data) => done(data, `${gateway.label} account removed.`),
  });

  const busy = save.isPending || remove.isPending;
  const error = save.isError ? save.error : remove.isError ? remove.error : null;
  const canSave = secretKey.trim() !== "" || webhookSecret.trim() !== "" || settlementAccount.trim() !== "" || settlementBank.trim() !== "";
  // A first save needs the secret key (and, for ArifPay, the settlement account and bank);
  // later saves may change just one thing.
  const keysValid = gateway.configured
    ? canSave
    : secretKey.trim() !== "" && (!isArifPay || (settlementAccount.trim() !== "" && settlementBank.trim() !== ""));

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-bold">{gateway.label}</p>
        {statusBadge(gateway)}
        {gateway.configured && gateway.platform_enabled && (
          <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            Accept payments
            <Switch
              checked={gateway.enabled}
              disabled={busy}
              onCheckedChange={(v) => save.mutate({ enabled: v })}
              aria-label={`Accept ${gateway.label} payments`}
            />
          </label>
        )}
      </div>

      {!gateway.platform_enabled ? (
        <p className="text-xs text-muted-foreground">
          The platform has not made {gateway.label} available yet. Ask the platform administrator to enable it.
        </p>
      ) : (
        <>
          {gateway.source === "central" && (
            <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Payments are currently going to the platform's account, not yours. Save your own keys below to receive the money yourself.
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              type="password"
              autoComplete="off"
              placeholder={
                gateway.configured
                  ? `${isArifPay ? "API key" : "Secret key"} saved - type to replace`
                  : `${isArifPay ? "API key" : "Secret key"} * (${help.secret})`
              }
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
            />
            {!isArifPay && (
              <Input
                type="password"
                autoComplete="off"
                placeholder={gateway.has_webhook_secret ? "Webhook secret saved - type to replace" : `Webhook secret (${help.webhook})`}
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
              />
            )}
          </div>
          {isArifPay && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                autoComplete="off"
                inputMode="numeric"
                placeholder={gateway.has_settlement ? `Account ${gateway.settlement_account_masked} saved - type to replace` : "Your bank account number *"}
                value={settlementAccount}
                maxLength={40}
                onChange={(e) => setSettlementAccount(e.target.value)}
              />
              <Input
                autoComplete="off"
                placeholder={gateway.settlement_bank ? `Bank code ${gateway.settlement_bank} saved - type to replace` : "Bank code, e.g. AWINETAA *"}
                value={settlementBank}
                maxLength={16}
                onChange={(e) => setSettlementBank(e.target.value)}
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">{help.webhookHint}</p>

          <div className="grid gap-2 sm:grid-cols-2">
            {gateway.webhook_url && <CopyField label="Webhook URL (add this in your dashboard)" value={gateway.webhook_url} />}
            {gateway.transfer_approval_url && (
              <CopyField label="Transfer approval URL (add this in your dashboard)" value={gateway.transfer_approval_url} />
            )}
          </div>

          {error && <p className="text-xs text-destructive" role="alert">{errorText(error)}</p>}
          {message && !error && <p className="text-xs text-muted-foreground" role="status">{message}</p>}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy || !keysValid} onClick={() => save.mutate({ keys: true })} className="gap-1">
              {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
            </Button>
            {gateway.configured && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => remove.mutate()} className="gap-1 text-destructive">
                {remove.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Remove account
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * The marketplace's OWN payment accounts. Buyers pay into them, and refunds and supplier payouts are paid
 * from them, so the money belongs to the workspace that runs the marketplace, not the platform.
 */
export function GatewaySettingsCard() {
  const q = useQuery({
    queryKey: ["b2b", "paymentGateways", getWorkspaceScopeKey()],
    queryFn: () => B2BDash.paymentGateways(),
  });

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><CreditCard className="h-5 w-5" /></div>
          <div>
            <p className="text-sm font-bold">Your payment accounts</p>
            <p className="text-xs text-muted-foreground">
              Buyers pay into your own Chapa, Stripe or ArifPay account. Suppliers are paid from your Chapa account, or by you. Without one, buyers can still pay by bank transfer.
            </p>
          </div>
        </div>

        {q.isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : q.isError ? (
          <p className="text-sm text-destructive" role="alert">{errorText(q.error)}</p>
        ) : (
          (q.data ?? []).map((g) => <GatewayPanel key={g.provider} gateway={g} />)
        )}
      </CardContent>
    </Card>
  );
}
