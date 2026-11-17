"use client";

import React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, FileText, Loader2, Percent, RotateCcw, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { B2BDash, formatMoney, type B2BAcceptedDeal, type B2BAdminOrder, type B2BOrderPart } from "@/modules/b2b-marketplace/api";
import {
  EMPTY_REFUND_DETAILS,
  RefundDetailsFields,
  refundFormValid,
  toRefundPayload,
  type RefundDetailsForm,
} from "@/modules/b2b-marketplace/components/RefundDetailsFields";
import { getWorkspaceScopeKey } from "@/lib/runtime-context";

const money = (n: number, currency?: string | null) => formatMoney(n, currency);

// Mirrors the server-side state machine. Suppliers drive processing/shipped themselves;
// the buyer confirms receipt; "cancelled" is only for unpaid orders (paid orders are refunded).
const NEXT_STATUS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "shipped", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
};

const errorText = (e: unknown): string => {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message || err?.message || "Something went wrong";
};

const allowedStatuses = (o: B2BAdminOrder): string[] =>
  (NEXT_STATUS[o.status] ?? []).filter((s) => !(s === "cancelled" && o.payment_status === "paid"));

const payoutLabel = (s?: string) => (s === "released" ? "payout released" : s === "partial" ? "partly paid out" : s === "void" ? "payout voided" : "payout pending");

export default function AdminOrders() {
  const qc = useQueryClient();
  const workspaceScope = getWorkspaceScopeKey();
  const q = useQuery({ queryKey: ["b2b", "adminOrders", workspaceScope], queryFn: () => B2BDash.adminOrders() });
  const orders = q.data ?? [];

  // Deals the buyer accepted but has not turned into an order yet (they join the list below once placed).
  const dealsQ = useQuery({ queryKey: ["b2b", "adminDeals", workspaceScope], queryFn: () => B2BDash.adminDeals(), refetchInterval: 60000 });
  const deals = dealsQ.data ?? [];
  const [error, setError] = React.useState<string | null>(null);
  const invalidate = () => {
    setError(null);
    qc.invalidateQueries({ queryKey: ["b2b", "adminOrders"] });
    qc.invalidateQueries({ queryKey: ["b2b", "adminDeals"] });
    qc.invalidateQueries({ queryKey: ["b2b", "disputes"] });
  };
  const onError = (e: unknown) => setError(errorText(e));

  const confirm = useMutation({ mutationFn: (id: number) => B2BDash.confirmOrderPayment(id), onSuccess: invalidate, onError });
  const rejectPayment = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => B2BDash.rejectOrderPayment(id, reason),
    onSuccess: invalidate,
    onError,
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => B2BDash.updateOrderStatus(id, { status }),
    onSuccess: invalidate,
    onError,
  });
  // Payouts and refunds are done in a dialog: the admin sends the money first, then records the transfer reference.
  const [transfer, setTransfer] = React.useState<TransferTarget | null>(null);

  const onReject = (o: B2BAdminOrder) => {
    const reason = window.prompt("Why is the payment not accepted? (shown to the buyer)", "") ?? null;
    if (reason !== null) rejectPayment.mutate({ id: o.id, reason: reason.trim() || undefined });
  };
  const onRelease = (o: B2BAdminOrder, part: B2BOrderPart) => setTransfer({ kind: "payout", order: o, part });
  const onRefund = (o: B2BAdminOrder) => setTransfer({ kind: "refund", order: o });

  // Commission rate (editable)
  const settingsQ = useQuery({ queryKey: ["b2b", "marketplaceSettings", workspaceScope], queryFn: () => B2BDash.marketplaceSettings() });
  const [commission, setCommission] = React.useState<string>("");
  React.useEffect(() => {
    if (settingsQ.data) setCommission(String(settingsQ.data.commission_percent));
  }, [settingsQ.data]);
  const saveCommission = useMutation({
    mutationFn: () => B2BDash.updateCommission(Number(commission)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["b2b", "marketplaceSettings"] }),
  });

  // Refunded orders are no longer revenue; only count money the platform actually holds.
  // Orders can be in different currencies, so totals are kept per currency instead of being added together.
  const sumPaid = (pick: (o: B2BAdminOrder) => number): string => {
    const totals = new Map<string, number>();
    orders
      .filter((o) => o.payment_status === "paid")
      .forEach((o) => {
        const c = (o.currency || "ETB").toUpperCase();
        totals.set(c, (totals.get(c) ?? 0) + pick(o));
      });
    return totals.size === 0 ? money(0, "ETB") : Array.from(totals, ([c, n]) => money(n, c)).join(" · ");
  };
  const totalGmv = sumPaid((o) => o.subtotal);
  const totalFees = sumPaid((o) => o.platform_fee_amount);

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Commission rate — set your own */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Percent className="h-5 w-5" /></div>
          <div className="flex-1 min-w-[180px]">
            <p className="text-sm font-bold">Platform commission</p>
            <p className="text-xs text-muted-foreground">Your cut on each order. Applies to new orders; existing orders keep their rate.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number" min={0} max={50} step={0.5}
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              className="h-9 w-24 text-right"
            />
            <span className="text-sm font-bold text-muted-foreground">%</span>
            <Button size="sm" disabled={saveCommission.isPending || commission === ""} onClick={() => saveCommission.mutate()} className="gap-1">
              {saveCommission.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">Orders</p><p className="text-2xl font-black">{orders.length}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">Paid GMV</p><p className="text-2xl font-black text-primary">{totalGmv}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">Platform fees earned</p><p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalFees}</p></CardContent></Card>
      </div>

      {deals.length > 0 && (
        <Card>
          <CardContent className="space-y-2 py-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <p className="text-sm font-bold">Accepted deals awaiting an order</p>
              <Badge variant="secondary">{deals.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              The buyer accepted a quote but has not placed the order yet. It appears in the list below as soon as they do.
            </p>
            <div className="divide-y divide-border/50">
              {deals.map((d: B2BAcceptedDeal) => (
                <div key={d.quote_id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <div className="min-w-[160px] flex-1">
                    <p className="font-semibold">{d.title ?? `Quote #${d.quote_id}`}</p>
                    <p className="text-xs text-muted-foreground">{d.buyer ?? "Buyer"} ← {d.seller ?? "Supplier"} · accepted {new Date(d.accepted_at).toLocaleDateString()}</p>
                  </div>
                  <span className="font-bold">{d.currency} {d.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {q.isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : orders.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No orders yet.</CardContent></Card>
      ) : (
        orders.map((o: B2BAdminOrder) => (
          <Card key={o.id}>
            <CardContent className="space-y-3 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[160px]">
                  <p className="text-sm font-black">{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">{o.buyer || o.shipping_name} · {o.items_count} items · {new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <Badge variant={o.payment_status === "paid" ? "default" : "secondary"}>
                  {o.payment_status.replace("_", " ")}
                </Badge>
                <Badge variant="outline">{payoutLabel(o.payout_status)}</Badge>
                {(o.open_disputes_count ?? 0) > 0 && <Badge variant="destructive">dispute open</Badge>}
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg bg-muted/40 px-3 py-2"><p className="text-[11px] text-muted-foreground">Total</p><p className="font-bold">{money(o.subtotal, o.currency)}</p></div>
                <div className="rounded-lg bg-muted/40 px-3 py-2"><p className="text-[11px] text-muted-foreground">Fee ({o.platform_fee_percent}%)</p><p className="font-bold text-emerald-600 dark:text-emerald-400">{money(o.platform_fee_amount, o.currency)}</p></div>
                <div className="rounded-lg bg-muted/40 px-3 py-2"><p className="text-[11px] text-muted-foreground">Supplier payout</p><p className="font-bold">{money(o.seller_payout_amount, o.currency)}</p></div>
              </div>

              {(o.parts ?? []).length > 0 && (
                <div className="space-y-1.5 rounded-lg border px-3 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Suppliers</p>
                  {(o.parts ?? []).map((part) => (
                    <div key={part.id} className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="min-w-[120px] flex-1 font-semibold">{part.seller ?? "Supplier"}</span>
                      <Badge variant="outline" className="capitalize">{part.fulfillment_status}</Badge>
                      {part.tracking_number && <span className="text-muted-foreground">{part.carrier ? `${part.carrier} · ` : ""}{part.tracking_number}</span>}
                      <span className="font-bold">{money(part.payout_amount ?? 0, o.currency)}</span>
                      <Badge variant={part.payout_status === "released" ? "default" : "secondary"}>{part.payout_status}</Badge>
                      {part.payout_status === "pending" && (
                        part.payout_account ? (
                          <Badge variant={part.payout_account.status === "verified" ? "outline" : "destructive"}>
                            {part.payout_account.status === "verified" ? "account verified" : `account ${part.payout_account.status}`}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">no payout account</Badge>
                        )
                      )}
                      {part.payout_status === "released" && part.payout_destination && (
                        <span className="text-muted-foreground">
                          → {part.payout_destination.bank_name} ····{part.payout_destination.account_number_last4}
                          {part.payout_reference ? ` · ref ${part.payout_reference}` : ""}
                        </span>
                      )}
                      {part.payout_status === "pending" && o.payment_status === "paid" && (
                        <Button
                          size="sm" variant="outline" className="h-7 text-xs"
                          disabled={o.status !== "completed" || (o.open_disputes_count ?? 0) > 0}
                          title={o.status !== "completed" ? "Available once the order is completed" : (o.open_disputes_count ?? 0) > 0 ? "Resolve the dispute first" : undefined}
                          onClick={() => onRelease(o, part)}
                        >
                          Release payout
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {o.payment_status === "pending_confirmation" && (
                  <>
                    <Button size="sm" disabled={confirm.isPending} onClick={() => confirm.mutate(o.id)} className="gap-1">
                      <Check className="h-3.5 w-3.5" /> Confirm payment {o.payment_reference ? `(${o.payment_reference})` : ""}
                    </Button>
                    <Button size="sm" variant="outline" disabled={rejectPayment.isPending} onClick={() => onReject(o)} className="gap-1">
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </>
                )}
                {o.payment_status === "unpaid" && o.status !== "cancelled" && (
                  <Button size="sm" variant="outline" disabled={confirm.isPending} onClick={() => confirm.mutate(o.id)} className="gap-1">
                    <Check className="h-3.5 w-3.5" /> Mark as paid
                  </Button>
                )}
                {allowedStatuses(o).length > 0 && (
                  <div className="inline-flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                    <Select value={o.status} onValueChange={(v) => v !== o.status && setStatus.mutate({ id: o.id, status: v })}>
                      <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[o.status, ...allowedStatuses(o)].map((st) => <SelectItem key={st} value={st} className="capitalize">{st}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {o.payment_status === "paid" && !(o.parts ?? []).some((p) => p.payout_status === "released") && (
                  <Button size="sm" variant="outline" onClick={() => onRefund(o)} className="gap-1 text-destructive">
                    <RotateCcw className="h-3.5 w-3.5" /> Refund
                  </Button>
                )}
                <Button asChild size="sm" variant="ghost" className="gap-1">
                  <Link href={`/marketplace/orders/${o.id}/invoice`} target="_blank"><FileText className="h-3.5 w-3.5" /> Invoice</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <TransferDialog
        target={transfer}
        orders={orders}
        onClose={() => setTransfer(null)}
        onDone={() => { setTransfer(null); invalidate(); }}
      />
    </div>
  );
}

type TransferTarget =
  | { kind: "payout"; order: B2BAdminOrder; part: B2BOrderPart }
  | { kind: "refund"; order: B2BAdminOrder };

/**
 * Payout or refund the admin has just sent by hand. Nothing here moves money: the admin
 * sends it from the company bank or wallet first, then records the transfer reference.
 */
function TransferDialog({ target, orders, onClose, onDone }: {
  target: TransferTarget | null;
  orders: B2BAdminOrder[];
  onClose: () => void;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [reference, setReference] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [details, setDetails] = React.useState<RefundDetailsForm>(EMPTY_REFUND_DETAILS);

  const key = target ? `${target.kind}-${target.order.id}-${target.kind === "payout" ? target.part.id : ""}` : "";
  React.useEffect(() => {
    setReference("");
    setReason("");
    setDetails(EMPTY_REFUND_DETAILS);
  }, [key]);

  // Always show the freshest copy of the order (details may have just been saved).
  const order = target ? orders.find((x) => x.id === target.order.id) ?? target.order : null;
  const part = target?.kind === "payout" ? (order?.parts ?? []).find((p) => p.id === target.part.id) ?? target.part : null;
  const viaStripe = order?.payment_method === "stripe";

  const release = useMutation({
    mutationFn: () => B2BDash.releasePayout(order!.id, part!.id, reference.trim()),
    onSuccess: onDone,
  });
  const refund = useMutation({
    mutationFn: () =>
      B2BDash.refundOrder(order!.id, {
        mode: viaStripe ? "auto" : "manual",
        reason: reason.trim() || undefined,
        reference: viaStripe ? undefined : reference.trim(),
      }),
    onSuccess: onDone,
  });
  const saveDetails = useMutation({
    mutationFn: () => B2BDash.updateRefundDetails(order!.id, toRefundPayload(details)),
    onSuccess: () => {
      setDetails(EMPTY_REFUND_DETAILS);
      qc.invalidateQueries({ queryKey: ["b2b", "adminOrders"] });
    },
  });

  const account = part?.payout_account ?? null;
  const accountOk = account?.status === "verified";
  const refundDetails = order?.refund_details ?? null;
  const error = release.isError ? release.error : refund.isError ? refund.error : saveDetails.isError ? saveDetails.error : null;

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {order && target?.kind === "payout" && part && (
          <>
            <DialogHeader>
              <DialogTitle>Release payout</DialogTitle>
              <DialogDescription>
                {order.order_number} · {part.seller ?? "Supplier"} · <b>{money(part.payout_amount ?? 0, order.currency)}</b>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {accountOk && account ? (
                <div className="rounded-xl bg-muted/40 px-4 py-3 text-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Send the money to (verified account)</p>
                  <p className="font-bold">{account.bank_name} <span className="font-normal text-muted-foreground">({account.method})</span></p>
                  <p>{account.account_name}</p>
                  <p className="font-mono font-bold">{account.account_number}</p>
                </div>
              ) : (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {account
                    ? `This supplier's payout account is ${account.status}. Verify it in the "Payout Accounts" tab first.`
                    : "This supplier has not added a payout account yet. Ask them to add one, then verify it in the \"Payout Accounts\" tab."}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                This does not move money. Send the transfer from your bank or wallet first, then enter its reference here to record it.
              </p>
              <Input placeholder="Transfer reference *" value={reference} maxLength={250} onChange={(e) => setReference(e.target.value)} />
            </div>
            {error && <p className="text-xs text-destructive" role="alert">{errorText(error)}</p>}
            <DialogFooter>
              <Button onClick={() => release.mutate()} disabled={release.isPending || !accountOk || reference.trim() === ""} className="w-full gap-2">
                {release.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Record payout as sent
              </Button>
            </DialogFooter>
          </>
        )}

        {order && target?.kind === "refund" && (
          <>
            <DialogHeader>
              <DialogTitle>Refund order {order.order_number}</DialogTitle>
              <DialogDescription>
                {money(order.subtotal, order.currency)} back to the buyer. The order is cancelled and unreleased payouts are voided.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {viaStripe ? (
                <p className="rounded-xl bg-muted/40 px-3 py-2 text-sm">
                  This was paid by card. The refund goes back to the buyer&apos;s card automatically through Stripe.
                </p>
              ) : (
                <>
                  {refundDetails ? (
                    <div className="rounded-xl bg-muted/40 px-4 py-3 text-sm">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Send the refund to</p>
                      <p className="font-bold">{refundDetails.bank_name}</p>
                      <p>{refundDetails.account_name}</p>
                      <p className="font-mono font-bold">{refundDetails.account_number}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3">
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        The buyer has not given refund details. Ask them (they can add them from their orders), or record what they tell you:
                      </p>
                      <RefundDetailsFields value={details} onChange={setDetails} disabled={saveDetails.isPending} />
                      <Button size="sm" variant="outline" disabled={saveDetails.isPending || !refundFormValid(details)} onClick={() => saveDetails.mutate()} className="gap-1">
                        {saveDetails.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save refund details
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    This does not move money. Send the refund yourself first, then enter the transfer reference here to record it.
                  </p>
                  <Input placeholder="Refund transfer reference *" value={reference} maxLength={250} onChange={(e) => setReference(e.target.value)} />
                </>
              )}
              <Input placeholder="Reason (optional)" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
            </div>
            {error && <p className="text-xs text-destructive" role="alert">{errorText(error)}</p>}
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={() => refund.mutate()}
                disabled={refund.isPending || (!viaStripe && (!refundDetails || reference.trim() === ""))}
                className="w-full gap-2"
              >
                {refund.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {viaStripe ? "Refund to card" : "Record refund as sent"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
