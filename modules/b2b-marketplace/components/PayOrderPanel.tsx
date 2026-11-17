"use client";

import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { B2BDash, formatMoney } from "@/modules/b2b-marketplace/api";
import {
  EMPTY_REFUND_DETAILS,
  RefundDetailsFields,
  refundFormValid,
  toRefundPayload,
  type RefundDetailsForm,
} from "@/modules/b2b-marketplace/components/RefundDetailsFields";

type PayableOrder = { id: number; order_number: string; subtotal: number; currency: string };
type Method = "direct" | "chapa" | "card";

const errorText = (e: unknown): string => {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message || err?.message || "Something went wrong";
};

const RETURN_PATH = "/dashboard/b2b-marketplace";

/**
 * Everything a buyer needs to pay one order: bank transfer, Chapa (ETB orders) and
 * card (Stripe), showing only what the marketplace has actually switched on.
 */
export function PayOrderPanel({ order, onSubmitted }: { order: PayableOrder; onSubmitted: () => void }) {
  const methodsQ = useQuery({ queryKey: ["b2b", "paymentMethods"], queryFn: () => B2BDash.paymentMethods(), staleTime: 60_000 });
  const methods = methodsQ.data;
  const isEtb = (order.currency || "").toUpperCase() === "ETB";

  const options: { k: Method; label: string }[] = [{ k: "direct", label: "Bank transfer" }];
  if (methods?.chapa.enabled && isEtb) options.push({ k: "chapa", label: "Pay online (Chapa)" });
  if (methods?.stripe.enabled) options.push({ k: "card", label: "Card (Stripe)" });

  const [method, setMethod] = useState<Method>("direct");
  const [reference, setReference] = useState("");
  const [refund, setRefund] = useState<RefundDetailsForm>(EMPTY_REFUND_DETAILS);

  const active: Method = options.some((o) => o.k === method) ? method : "direct";
  const returnUrl = () => (typeof window !== "undefined" ? window.location.origin + RETURN_PATH : "");

  const payDirect = useMutation({
    mutationFn: () => B2BDash.payOrder(order.id, reference.trim(), toRefundPayload(refund)),
    onSuccess: onSubmitted,
  });

  const payChapa = useMutation({
    mutationFn: async () => {
      // Save refund details first when the buyer filled them in (they are optional here).
      if (refundFormValid(refund)) await B2BDash.updateRefundDetails(order.id, toRefundPayload(refund));
      return B2BDash.chapaCheckout(order.id, returnUrl());
    },
    onSuccess: (res) => {
      if (res?.checkout_url) window.location.href = res.checkout_url;
    },
  });

  const payCard = useMutation({
    mutationFn: () => B2BDash.stripeCheckout(order.id, returnUrl()),
    onSuccess: (res) => {
      if (res?.checkout_url) window.location.href = res.checkout_url;
    },
  });

  return (
    <div className="space-y-4">
      {options.length > 1 && (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
          {options.map((m) => (
            <button
              key={m.k}
              type="button"
              onClick={() => setMethod(m.k)}
              className={"rounded-xl border p-3 text-left text-sm font-bold transition-all " + (active === m.k ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/60 hover:border-primary/40")}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {active === "direct" && (
        <div className="space-y-3">
          <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
            Transfer <b className="text-foreground">{formatMoney(order.subtotal, order.currency)}</b> to the marketplace settlement account,
            using reference <b className="text-foreground">{order.order_number}</b>, then enter your transfer reference below.
            The marketplace confirms receipt before the order goes ahead.
          </div>
          <Input placeholder="Your payment / transfer reference *" value={reference} maxLength={255} onChange={(e) => setReference(e.target.value)} />
          <div className="space-y-2">
            <p className="text-xs font-semibold">Where should a refund be sent if needed? *</p>
            <RefundDetailsFields value={refund} onChange={setRefund} disabled={payDirect.isPending} />
          </div>
          {payDirect.isError && <p className="text-xs text-destructive" role="alert">{errorText(payDirect.error)}</p>}
          <Button
            onClick={() => payDirect.mutate()}
            disabled={payDirect.isPending || reference.trim() === "" || !refundFormValid(refund)}
            className="h-11 w-full gap-2 rounded-xl font-bold"
          >
            {payDirect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} I&apos;ve paid — submit
          </Button>
        </div>
      )}

      {active === "chapa" && (
        <div className="space-y-3">
          <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
            You will be sent to Chapa&apos;s secure page to pay <b className="text-foreground">{formatMoney(order.subtotal, order.currency)}</b>.
            The payment options shown there depend on what the marketplace has enabled with Chapa. Your order is confirmed automatically once Chapa reports the payment.
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold">Where should a refund be sent if needed? (optional now, needed if you are ever refunded)</p>
            <RefundDetailsFields value={refund} onChange={setRefund} disabled={payChapa.isPending} />
          </div>
          {payChapa.isError && <p className="text-xs text-destructive" role="alert">{errorText(payChapa.error)}</p>}
          <Button
            onClick={() => payChapa.mutate()}
            disabled={payChapa.isPending || (refundFormValid(refund) === false && (refund.bank || refund.name || refund.number) !== "")}
            className="h-11 w-full gap-2 rounded-xl font-bold"
          >
            {payChapa.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Continue to Chapa
          </Button>
        </div>
      )}

      {active === "card" && (
        <div className="space-y-2">
          {payCard.isError && <p className="text-xs text-destructive" role="alert">{errorText(payCard.error)}</p>}
          <Button onClick={() => payCard.mutate()} disabled={payCard.isPending} className="h-11 w-full gap-2 rounded-xl font-bold">
            {payCard.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Pay by card
          </Button>
        </div>
      )}
    </div>
  );
}
