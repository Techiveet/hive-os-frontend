"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CreditCard,
  FileText,
  Landmark,
  Heart,
  Loader2,
  MessageSquare,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { B2BDash, formatMoney, type B2BInquiry, type B2BOrder, type B2BQuote } from "@/modules/b2b-marketplace/api";
import { PayOrderPanel } from "@/modules/b2b-marketplace/components/PayOrderPanel";
import { RefundDetailsDialog } from "@/modules/b2b-marketplace/components/RefundDetailsDialog";
import { CheckPaymentButton } from "@/modules/b2b-marketplace/components/CheckPaymentButton";
import { QuoteThreadDialog } from "@/modules/b2b-marketplace/components/QuoteThreadDialog";
import { AttachmentPicker, RfqAttachmentsToggle } from "@/modules/b2b-marketplace/components/RfqAttachments";
import { QuoteAttachmentsToggle } from "@/modules/b2b-marketplace/components/QuoteAttachments";

const errorText = (e: unknown): string => {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message || err?.message || "Something went wrong";
};

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function BuyerDashboard() {
  const qc = useQueryClient();
  const inquiriesQ = useQuery({ queryKey: ["b2b", "myInquiries"], queryFn: () => B2BDash.inquiries("mine") });
  const quotesQ = useQuery({ queryKey: ["b2b", "buyerQuotes"], queryFn: () => B2BDash.quotes() });
  const favsQ = useQuery({ queryKey: ["b2b", "favorites"], queryFn: () => B2BDash.favorites() });
  // Always re-read the orders when the page opens or the tab regains focus: a payment made elsewhere (Chapa, another
  // tab) must never leave a stale Pay button behind.
  const ordersQ = useQuery({
    queryKey: ["b2b", "myOrders"],
    queryFn: () => B2BDash.orders(),
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });

  const inquiries = inquiriesQ.data ?? [];
  const quotes = quotesQ.data ?? [];
  const favorites = favsQ.data ?? [];
  const orders = ordersQ.data ?? [];

  const [rfqOpen, setRfqOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", budget_range: "" });
  const [rfqFiles, setRfqFiles] = useState<File[]>([]);
  const [rfqWarning, setRfqWarning] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<B2BQuote | null>(null);
  const [thread, setThread] = useState<B2BQuote | null>(null);
  const [payingOrder, setPayingOrder] = useState<B2BOrder | null>(null);
  const [refundOrderDetails, setRefundOrderDetails] = useState<B2BOrder | null>(null);

  const [orderingQuote, setOrderingQuote] = useState<B2BQuote | null>(null);
  const [disputeOrder, setDisputeOrder] = useState<B2BOrder | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingRfq, setDeletingRfq] = useState<number | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<number | null>(null);
  const refreshOrders = () => {
    setActionError(null);
    qc.invalidateQueries({ queryKey: ["b2b", "myOrders"] });
    qc.invalidateQueries({ queryKey: ["b2b", "buyerQuotes"] });
    // RFQ cards render the quotes embedded in the RFQ list, so refresh that too.
    qc.invalidateQueries({ queryKey: ["b2b", "myInquiries"] });
  };

  const cancelOrder = useMutation({
    mutationFn: (id: number) => B2BDash.cancelOrder(id),
    onSuccess: () => {
      refreshOrders();
      setCancellingOrder(null);
    },
    onError: (e) => setActionError(errorText(e)),
  });
  const confirmReceipt = useMutation({
    mutationFn: (id: number) => B2BDash.confirmReceipt(id),
    onSuccess: refreshOrders,
    onError: (e) => setActionError(errorText(e)),
  });

  const closeRfq = () => {
    setRfqOpen(false);
    setForm({ title: "", description: "", budget_range: "" });
    setRfqFiles([]);
    setRfqWarning(null);
  };

  // The RFQ must exist before files can be attached, so create it first, then upload.
  const createRfq = useMutation({
    mutationFn: async () => {
      const inquiry = await B2BDash.createInquiry(form);
      const failed: string[] = [];
      for (const file of rfqFiles) {
        try { await B2BDash.uploadInquiryAttachment(inquiry.id, file); }
        catch { failed.push(file.name); }
      }
      return failed;
    },
    onSuccess: (failed) => {
      qc.invalidateQueries({ queryKey: ["b2b", "myInquiries"] });
      if (failed.length === 0) { closeRfq(); return; }
      setRfqWarning(`Your RFQ was posted, but these files could not be uploaded: ${failed.join(", ")}. You can add them from the RFQ's Files button.`);
    },
  });

  const decide = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "accept" | "reject" }) =>
      action === "accept" ? B2BDash.acceptQuote(id) : B2BDash.rejectQuote(id),
    onSuccess: () => {
      setActionError(null);
      qc.invalidateQueries({ queryKey: ["b2b", "buyerQuotes"] });
      qc.invalidateQueries({ queryKey: ["b2b", "myInquiries"] });
    },
    onError: (e) => setActionError(errorText(e)),
  });

  const deleteRfq = useMutation({
    mutationFn: (id: number) => B2BDash.deleteInquiry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["b2b", "myInquiries"] });
      setDeletingRfq(null);
    },
    onError: (e) => setActionError(errorText(e)),
  });

  const quotesFor = (inq: B2BInquiry) => {
    const embedded = inq.quotes ?? [];
    if (embedded.length > 0) return embedded;
    // Loose match: API may return inquiry_id as string depending on driver casting.
    return quotes.filter((q) => Number(q.inquiry_id) === Number(inq.id));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="My RFQs" value={inquiries.length} />
        <Kpi
          label="Quotes Received"
          value={Math.max(
            quotes.length,
            inquiries.reduce((n, inq) => n + (inq.quotes?.length ?? 0), 0),
          )}
        />
        <Kpi label="Awarded" value={inquiries.filter((i) => i.status === "awarded").length} />
        <Kpi label="Saved Products" value={favorites.length} />
      </div>

      {actionError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          <span className="flex-1">{actionError}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setActionError(null)}>×</button>
        </div>
      )}

      <Tabs defaultValue="rfqs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rfqs">My RFQs</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-3">
          {ordersQ.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : orders.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No orders yet. Add products to your cart and check out to place an order.</CardContent></Card>
          ) : (
            orders.map((o) => (
              <Card key={o.id}>
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-sm font-black">{o.order_number}</p>
                      <p className="text-xs text-muted-foreground">{o.items_count} item{o.items_count === 1 ? "" : "s"} · {new Date(o.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={o.payment_status === "paid" ? "default" : o.payment_status === "pending_confirmation" ? "secondary" : "destructive"}>
                      {o.payment_status === "pending_confirmation" ? "awaiting confirmation" : o.payment_status}
                    </Badge>
                    <Badge variant="outline">{o.status}</Badge>
                    {(o.open_disputes_count ?? 0) > 0 && <Badge variant="destructive">dispute open</Badge>}
                    <span className="text-lg font-black text-primary">{formatMoney(o.subtotal, o.currency)}</span>
                    <div className="flex gap-1.5">
                      {o.payment_status === "unpaid" && o.status !== "cancelled" && (
                        <Button size="sm" onClick={() => setPayingOrder(o)} className="gap-1"><CreditCard className="h-3.5 w-3.5" /> Pay</Button>
                      )}
                      {o.payment_status === "unpaid" && o.status === "pending" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" disabled={cancelOrder.isPending}>
                              Cancel
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-[2rem] border-border/60 bg-background/95 backdrop-blur-xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel order {o.order_number}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => cancelOrder.mutate(o.id)}
                                disabled={cancelOrder.isPending}
                                className="rounded-full"
                              >
                                {cancelOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Cancel"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {o.status === "shipped" && (
                        <Button size="sm" disabled={confirmReceipt.isPending} onClick={() => confirmReceipt.mutate(o.id)} className="gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Confirm receipt
                        </Button>
                      )}
                      {o.payment_status === "unpaid" && o.status !== "cancelled" && (
                        <CheckPaymentButton orderId={o.id} onChecked={refreshOrders} />
                      )}
                      {(o.payment_status === "paid" || o.payment_status === "pending_confirmation") && o.status !== "cancelled" && (
                        <Button size="sm" variant="ghost" onClick={() => setRefundOrderDetails(o)} className="gap-1" title="Where a refund would be sent">
                          <Landmark className="h-3.5 w-3.5" /> {o.has_refund_details ? "Refund details" : "Add refund details"}
                        </Button>
                      )}
                      {o.payment_status === "paid" && o.status !== "cancelled" && (o.open_disputes_count ?? 0) === 0 && (
                        <Button size="sm" variant="ghost" onClick={() => setDisputeOrder(o)}>Report a problem</Button>
                      )}
                      <Button asChild size="sm" variant="outline" className="gap-1">
                        <Link href={`/marketplace/orders/${o.id}/invoice`} target="_blank"><FileText className="h-3.5 w-3.5" /> Invoice</Link>
                      </Button>
                    </div>
                  </div>
                  {o.items && o.items.length > 0 && (
                    <div className="mt-3 divide-y divide-border/50 border-t border-border/50 pt-2">
                      {o.items.map((it, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                          <span className="min-w-0 flex-1 truncate text-muted-foreground">{it.name}</span>
                          <span className="text-xs text-muted-foreground">{it.quantity} × {formatMoney(it.unit_price, o.currency)}</span>
                          <span className="w-24 text-right font-bold">{formatMoney(it.line_total, o.currency)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {o.parts && o.parts.some((part) => part.tracking_number || part.fulfillment_status !== "pending") && (
                    <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                      {o.parts.map((part) => (
                        <p key={part.id}>
                          {part.seller ?? "Supplier"}: <span className="capitalize">{part.fulfillment_status}</span>
                          {part.tracking_number ? ` · ${part.carrier ? `${part.carrier} ` : ""}${part.tracking_number}` : ""}
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="rfqs" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setRfqOpen(true)} className="rounded-xl gap-2">
              <Plus className="h-4 w-4" /> Post an RFQ
            </Button>
          </div>

          {inquiriesQ.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : inquiries.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No RFQs yet. Post your first request to start receiving quotes.</CardContent></Card>
          ) : (
            inquiries.map((inq: B2BInquiry) => {
              const qs = quotesFor(inq);
              return (
                <Card key={inq.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                    <div>
                      <CardTitle className="text-base">{inq.title}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{inq.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <Badge variant={inq.status === "awarded" ? "default" : "secondary"}>{inq.status}</Badge>
                        {inq.budget_range && <Badge variant="outline">Budget: {inq.budget_range}</Badge>}
                        {inq.category && <Badge variant="outline">{inq.category}</Badge>}
                        <Badge variant="outline">{qs.length} quotes</Badge>
                      </div>
                      <RfqAttachmentsToggle inquiryId={inq.id} canUpload={inq.status !== "awarded"} />
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" title="Delete RFQ">
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-[2rem] border-border/60 bg-background/95 backdrop-blur-xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete RFQ</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{inq.title}"? This will permanently remove this RFQ and all associated quotes.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteRfq.mutate(inq.id)}
                            disabled={deleteRfq.isPending}
                            className="rounded-full"
                          >
                            {deleteRfq.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardHeader>
                  {qs.length > 0 && (
                    <CardContent className="space-y-2">
                      {qs.map((q) => (
                        <div key={q.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                          <div className="flex-1 min-w-[160px]">
                            <p className="text-sm font-bold">
                              {q.seller_flag} {q.seller}{" "}
                              {q.seller_rating != null && (
                                <span className="ml-1 inline-flex items-center gap-0.5 text-xs text-amber-500">
                                  <Star className="h-3 w-3 fill-current" />{q.seller_rating}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{q.proposal_text}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-primary">{formatMoney(q.amount, q.currency)}</p>
                            <p className="text-[11px] text-muted-foreground">{q.delivery_time_days ? `${q.delivery_time_days}d delivery` : "—"}</p>
                          </div>
                          <Badge variant={q.status === "accepted" ? "default" : q.status === "rejected" ? "destructive" : "secondary"}>{q.status}</Badge>
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => setThread(q)} className="gap-1"><MessageSquare className="h-3.5 w-3.5" /></Button>
                            {q.status === "pending" && (
                              <>
                                <Button size="sm" onClick={() => decide.mutate({ id: q.id, action: "accept" })} disabled={decide.isPending}>Accept</Button>
                                <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: q.id, action: "reject" })} disabled={decide.isPending}>Reject</Button>
                              </>
                            )}
                            {q.status === "accepted" && !q.order_id && (
                              <Button size="sm" onClick={() => setOrderingQuote(q)} className="gap-1"><CreditCard className="h-3.5 w-3.5" /> Place order</Button>
                            )}
                            {q.status === "accepted" && q.order_id && (
                              <Badge variant="outline">Order {q.order_number}{q.order_status ? ` · ${q.order_status}` : ""}</Badge>
                            )}
                            {q.status === "accepted" && q.order_status === "completed" && !q.has_review && (
                              <Button size="sm" variant="outline" onClick={() => setReviewing(q)} className="gap-1"><Star className="h-3.5 w-3.5" /> Review</Button>
                            )}
                          </div>
                          <div className="w-full">
                            <QuoteAttachmentsToggle quoteId={q.id} />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="favorites">
          {favsQ.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : favorites.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No saved products yet. Tap the heart on a product to shortlist it.</CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((p: any) => (
                <Link key={p.id} href={`/marketplace/product/${p.id}`} className="rounded-2xl border border-border/60 bg-card/60 p-4 hover:border-primary/40 transition-all">
                  <div className="flex items-center gap-2 text-rose-500"><Heart className="h-4 w-4 fill-current" /></div>
                  <p className="mt-2 line-clamp-2 text-sm font-bold">{p.name}</p>
                  <p className="mt-1 text-lg font-black text-primary">{p.price}</p>
                  <p className="text-xs text-muted-foreground">{p.supplier} · {p.location}</p>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Post RFQ */}
      <Dialog open={rfqOpen} onOpenChange={(o) => { if (o) setRfqOpen(true); else if (rfqWarning) closeRfq(); else setRfqOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={(e) => { e.preventDefault(); if (!rfqWarning) createRfq.mutate(); }}>
            <DialogHeader>
              <DialogTitle className="inline-flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Post a Request for Quote</DialogTitle>
              <DialogDescription>Verified suppliers will respond with competitive quotes.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <Input required placeholder="What are you sourcing? (title)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea required rows={4} placeholder="Quantity, specs, target price, delivery terms…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input placeholder="Budget range (optional)" value={form.budget_range} onChange={(e) => setForm({ ...form, budget_range: e.target.value })} />
              <AttachmentPicker files={rfqFiles} onChange={setRfqFiles} disabled={createRfq.isPending || !!rfqWarning} />
              <p className="text-[11px] text-muted-foreground">Files are visible to suppliers who can see this RFQ. Don&apos;t attach anything confidential.</p>
              {createRfq.isError && <p className="text-xs text-destructive" role="alert">{errorText(createRfq.error)}</p>}
              {rfqWarning && <p className="text-xs text-amber-600" role="alert">{rfqWarning}</p>}
            </div>
            <DialogFooter>
              {rfqWarning ? (
                <Button type="button" onClick={closeRfq} className="w-full rounded-xl">Close</Button>
              ) : (
                <Button type="submit" disabled={createRfq.isPending} className="w-full rounded-xl gap-2">
                  {createRfq.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Post RFQ
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review dialog */}
      <ReviewDialog quote={reviewing} onClose={() => setReviewing(null)} onDone={() => { setReviewing(null); qc.invalidateQueries({ queryKey: ["b2b", "buyerQuotes"] }); qc.invalidateQueries({ queryKey: ["b2b", "myInquiries"] }); }} />

      {/* Message thread */}
      <QuoteThreadDialog quote={thread} onClose={() => setThread(null)} />

      {/* Place an order from an accepted quote */}
      <QuoteOrderDialog quote={orderingQuote} onClose={() => setOrderingQuote(null)} onDone={() => { setOrderingQuote(null); refreshOrders(); }} />

      {/* Report a problem with a paid order */}
      <DisputeDialog order={disputeOrder} onClose={() => setDisputeOrder(null)} onDone={() => { setDisputeOrder(null); refreshOrders(); }} />

      {/* Pay an order: bank transfer, Chapa (ETB) or card, whichever the marketplace has enabled */}
      <Dialog open={!!payingOrder} onOpenChange={(o) => { if (!o) setPayingOrder(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Pay order</DialogTitle>
            <DialogDescription>
              {payingOrder?.order_number} · {payingOrder ? formatMoney(payingOrder.subtotal, payingOrder.currency) : ""} to the marketplace.
            </DialogDescription>
          </DialogHeader>
          {payingOrder && (
            <div className="py-3">
              <PayOrderPanel
                order={{ id: payingOrder.id, order_number: payingOrder.order_number, subtotal: payingOrder.subtotal, currency: payingOrder.currency }}
                onSubmitted={() => { setPayingOrder(null); refreshOrders(); }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Where a refund for an order should be sent */}
      <RefundDetailsDialog
        order={refundOrderDetails}
        onClose={() => setRefundOrderDetails(null)}
        onDone={() => { setRefundOrderDetails(null); refreshOrders(); }}
      />
    </div>
  );
}

function ReviewDialog({ quote, onClose, onDone }: { quote: B2BQuote | null; onClose: () => void; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const submit = useMutation({
    mutationFn: () => B2BDash.createReview({ quote_id: quote!.id, rating, comment }),
    onSuccess: onDone,
  });
  return (
    <Dialog open={!!quote} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review {quote?.seller}</DialogTitle>
          <DialogDescription>Rate your experience for "{quote?.inquiry_title}".</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} type="button" onClick={() => setRating(i)}>
                <Star className={"h-7 w-7 " + (i <= rating ? "text-amber-500 fill-current" : "text-muted-foreground/30")} />
              </button>
            ))}
          </div>
          <Textarea rows={3} placeholder="Share details of your experience (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending} className="w-full rounded-xl gap-2">
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Submit Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Shipping details for an order placed from an accepted quote (price is the negotiated amount). */
function QuoteOrderDialog({ quote, onClose, onDone }: { quote: B2BQuote | null; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ shipping_name: "", shipping_company: "", shipping_email: "", shipping_phone: "", shipping_address: "", notes: "" });

  const place = useMutation({
    mutationFn: () =>
      B2BDash.orderFromQuote(quote!.id, {
        shipping_name: f.shipping_name.trim(),
        shipping_company: f.shipping_company.trim() || undefined,
        shipping_email: f.shipping_email.trim(),
        shipping_phone: f.shipping_phone.trim() || undefined,
        shipping_address: f.shipping_address.trim(),
        notes: f.notes.trim() || undefined,
      }),
    onSuccess: onDone,
  });

  return (
    <Dialog open={!!quote} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={(e) => { e.preventDefault(); place.mutate(); }}>
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Place order</DialogTitle>
            <DialogDescription>
              {quote?.seller} · {quote?.currency} {quote?.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} for “{quote?.inquiry_title}”.
              You pay after placing the order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Input required placeholder="Receiver name" value={f.shipping_name} onChange={(e) => setF({ ...f, shipping_name: e.target.value })} />
            <Input placeholder="Company (optional)" value={f.shipping_company} onChange={(e) => setF({ ...f, shipping_company: e.target.value })} />
            <Input required type="email" placeholder="Email" value={f.shipping_email} onChange={(e) => setF({ ...f, shipping_email: e.target.value })} />
            <Input placeholder="Phone (optional)" value={f.shipping_phone} onChange={(e) => setF({ ...f, shipping_phone: e.target.value })} />
            <Textarea required rows={3} placeholder="Delivery address" value={f.shipping_address} onChange={(e) => setF({ ...f, shipping_address: e.target.value })} />
            <Textarea rows={2} placeholder="Notes for the supplier (optional)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
            {place.isError && <p className="text-xs text-destructive" role="alert">{errorText(place.error)}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={place.isPending} className="w-full rounded-xl gap-2">
              {place.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Place order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Opens a dispute on a paid order. Supplier payouts are held until the marketplace resolves it. */
function DisputeDialog({ order, onClose, onDone }: { order: B2BOrder | null; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");

  const raise = useMutation({
    mutationFn: () => B2BDash.raiseDispute(order!.id, reason.trim()),
    onSuccess: () => { setReason(""); onDone(); },
  });

  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={(e) => { e.preventDefault(); raise.mutate(); }}>
          <DialogHeader>
            <DialogTitle>Report a problem</DialogTitle>
            <DialogDescription>
              Order {order?.order_number}. The supplier payout is put on hold and the marketplace will review your report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Textarea required minLength={10} maxLength={4000} rows={5} placeholder="What went wrong? (at least 10 characters)" value={reason} onChange={(e) => setReason(e.target.value)} />
            {raise.isError && <p className="text-xs text-destructive" role="alert">{errorText(raise.error)}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={raise.isPending || reason.trim().length < 10} className="w-full rounded-xl gap-2">
              {raise.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Submit report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}