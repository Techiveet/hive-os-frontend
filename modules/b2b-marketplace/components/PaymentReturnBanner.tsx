"use client";

import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";
import { B2BDash, type B2BOrder } from "@/modules/b2b-marketplace/api";

type Banner = { kind: "checking" | "ok" | "warn"; text: string; orderId?: number };

const errorText = (e: unknown): string => {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message || err?.message || "Something went wrong";
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));


export function PaymentReturnBanner() {
  const qc = useQueryClient();
  const [banner, setBanner] = React.useState<Banner | null>(null);
  const started = React.useRef(false);

  React.useEffect(() => {
    if (started.current || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "chapa") return;
    const id = Number(params.get("order"));
    if (!id) return;
    started.current = true;

    // Tidy the address bar so a refresh does not repeat the check.
    const url = new URL(window.location.href);
    ["payment", "order", "trx_ref", "tx_ref", "ref_id", "status"].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState({}, "", url.toString());

    setBanner({ kind: "checking", text: "Checking your payment with Chapa…" });

    (async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const res = await B2BDash.chapaVerify(id);
          if (res.outcome === "paid") {
            // Put the fresh order straight into the list so the Pay button disappears at once.
            qc.setQueryData<B2BOrder[] | undefined>(["b2b", "myOrders"], (old) => old?.map((o) => (o.id === res.data.id ? res.data : o)));
            qc.invalidateQueries({ queryKey: ["b2b", "myOrders"] });
            setBanner({ kind: "ok", text: "Payment received. Your order is confirmed.", orderId: id });
            break;
          }
          if (res.outcome === "failed" || res.outcome === "mismatch") {
            setBanner({ kind: "warn", text: res.message });
            break;
          }
          if (attempt === 3) {
            setBanner({ kind: "warn", text: "We have not received the payment yet. If you paid, this order will update automatically within a few minutes." });
          }
        } catch (e) {
          if (attempt === 3) setBanner({ kind: "warn", text: errorText(e) });
        }
        await sleep(3000);
      }
      qc.invalidateQueries({ queryKey: ["b2b", "myOrders"] });
    })();
  }, [qc]);

  if (!banner) return null;

  const tone =
    banner.kind === "ok"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : banner.kind === "warn"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "border-border/60 bg-muted/40 text-foreground";

  return (
    <div className={"flex items-start gap-2 rounded-xl border px-4 py-3 text-sm " + tone} role="status">
      {banner.kind === "checking" ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" /> : banner.kind === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
      <span className="flex-1">{banner.text}</span>
      {banner.kind === "ok" && banner.orderId && (
        // Chapa's own receipt page only flashes before sending the buyer back, so the receipt opens in its own tab here.
        <a
          href={`/marketplace/orders/${banner.orderId}/invoice`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md border border-current/30 px-2 py-0.5 text-xs font-bold hover:underline"
        >
          View receipt
        </a>
      )}
      {banner.kind !== "checking" && (
        <button type="button" aria-label="Dismiss" onClick={() => setBanner(null)}><X className="h-4 w-4" /></button>
      )}
    </div>
  );
}
