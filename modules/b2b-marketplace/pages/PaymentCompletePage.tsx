"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { B2BDash, formatMoney, type B2BOrder } from "@/modules/b2b-marketplace/api";

type View =
  | { kind: "checking" }
  | { kind: "paid"; order: B2BOrder | null }
  | { kind: "pending" }
  | { kind: "warn"; text: string }
  | { kind: "cancelled" };

const ATTEMPTS = 10;
const WAIT_MS = 3000;

const errorText = (e: unknown): string => {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message || err?.message || "Something went wrong";
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Where a buyer lands after paying online (Chapa, ArifPay or card). It stays put: the buyer sees that the payment was
 * received, can open the receipt in its own tab and go back to their orders when they choose, instead of being
 * bounced straight back to the orders list. Chapa and Stripe add ?payment=...&order=ID to the address.
 */
export default function PaymentCompletePage() {
  const qc = useQueryClient();
  const params = useSearchParams();
  const method = params.get("payment");
  const orderId = Number(params.get("order"));
  const [view, setView] = React.useState<View>(() => (method === "cancelled" ? { kind: "cancelled" } : { kind: "checking" }));
  // Every run gets a number; a run stops as soon as a newer one starts or the page is left.
  const runId = React.useRef(0);

  const refreshOrders = React.useCallback(
    (order?: B2BOrder | null) => {
      // Put the fresh order straight into the list the buyer is about to see, then re-fetch it anyway.
      if (order) {
        qc.setQueryData<B2BOrder[] | undefined>(["b2b", "myOrders"], (old) => old?.map((o) => (o.id === order.id ? order : o)));
      }
      qc.invalidateQueries({ queryKey: ["b2b", "myOrders"] });
      qc.invalidateQueries({ queryKey: ["b2b", "buyerQuotes"] });
    },
    [qc],
  );

  const check = React.useCallback(async () => {
    const me = ++runId.current;
    const current = () => runId.current === me;

    if (!orderId || (method !== "chapa" && method !== "arifpay" && method !== "success")) {
      setView({ kind: "warn", text: "We could not tell which payment this page is for. Open your orders to see the latest status." });
      return;
    }

    setView({ kind: "checking" });

    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      try {
        if (method === "chapa" || method === "arifpay") {
          // The notification may be late (or, with ArifPay, never come), so ask the server to re-check with the provider right away.
          const res = await B2BDash.onlineVerify(orderId);
          if (!current()) return;
          if (res.outcome === "paid") {
            refreshOrders(res.data);
            setView({ kind: "paid", order: res.data ?? null });
            return;
          }
          if (res.outcome === "failed" || res.outcome === "mismatch") {
            refreshOrders(res.data);
            setView({ kind: "warn", text: res.message });
            return;
          }
        } else {
          // Card payments are confirmed by Stripe's webhook, so wait for the order to show as paid.
          const orders = await B2BDash.orders();
          if (!current()) return;
          const order = orders.find((o) => o.id === orderId);
          if (order && order.payment_status === "paid") {
            refreshOrders(order);
            setView({ kind: "paid", order });
            return;
          }
        }
      } catch (e) {
        if (!current()) return;
        if (attempt === ATTEMPTS - 1) {
          setView({ kind: "warn", text: errorText(e) });
          return;
        }
      }

      await sleep(WAIT_MS);
      if (!current()) return;
    }

    refreshOrders();
    setView({ kind: "pending" });
  }, [method, orderId, refreshOrders]);

  React.useEffect(() => {
    if (method !== "cancelled") void check();
    return () => {
      runId.current += 1;
    };
  }, [check, method]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4">
      <section className="w-full max-w-lg rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm" role="status" aria-live="polite">
        {view.kind === "checking" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <h1 className="mt-5 text-2xl font-black tracking-tight">Checking your payment…</h1>
            <p className="mt-3 text-sm text-muted-foreground">This usually takes a few seconds. Please keep this page open.</p>
          </>
        )}

        {view.kind === "paid" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="mt-5 text-2xl font-black tracking-tight">Payment received</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {view.order
                ? `Order ${view.order.order_number} (${formatMoney(view.order.subtotal, view.order.currency)}) is paid and confirmed.`
                : "Your order is paid and confirmed."}{" "}
              Open the receipt to print it or save it as a PDF.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild className="gap-2 rounded-full">
                <a href={`/marketplace/orders/${orderId}/invoice`} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4" /> View receipt
                </a>
              </Button>
              <Button asChild variant="outline" className="gap-2 rounded-full">
                <Link href="/dashboard/b2b-marketplace"><ArrowLeft className="h-4 w-4" /> Back to my orders</Link>
              </Button>
            </div>
          </>
        )}

        {view.kind === "pending" && (
          <>
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-600" />
            <h1 className="mt-5 text-2xl font-black tracking-tight">Still waiting for confirmation</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              We have not received the payment yet. If you paid, your order will update automatically within a few minutes. You do not need to pay again.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button onClick={() => void check()} className="gap-2 rounded-full">
                <RefreshCw className="h-4 w-4" /> Check again
              </Button>
              <Button asChild variant="outline" className="gap-2 rounded-full">
                <Link href="/dashboard/b2b-marketplace"><ArrowLeft className="h-4 w-4" /> Back to my orders</Link>
              </Button>
            </div>
          </>
        )}

        {view.kind === "warn" && (
          <>
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-600" />
            <h1 className="mt-5 text-2xl font-black tracking-tight">We could not confirm the payment</h1>
            <p className="mt-3 text-sm text-muted-foreground">{view.text}</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              {orderId > 0 && (method === "chapa" || method === "success") && (
                <Button onClick={() => void check()} className="gap-2 rounded-full">
                  <RefreshCw className="h-4 w-4" /> Check again
                </Button>
              )}
              <Button asChild variant="outline" className="gap-2 rounded-full">
                <Link href="/dashboard/b2b-marketplace"><ArrowLeft className="h-4 w-4" /> Back to my orders</Link>
              </Button>
            </div>
          </>
        )}

        {view.kind === "cancelled" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h1 className="mt-5 text-2xl font-black tracking-tight">Payment cancelled</h1>
            <p className="mt-3 text-sm text-muted-foreground">Nothing was charged. You can pay again from your orders whenever you are ready.</p>
            <div className="mt-6 flex justify-center">
              <Button asChild className="gap-2 rounded-full">
                <Link href="/dashboard/b2b-marketplace"><ArrowLeft className="h-4 w-4" /> Back to my orders</Link>
              </Button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
