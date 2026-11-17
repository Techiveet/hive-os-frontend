"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Lock, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { B2BDash } from "@/modules/b2b-marketplace/api";
import { SignInGate, describeApiError, useIsSignedIn } from "@/modules/b2b-marketplace/components/SignInGate";

export type ContactTarget = {
  supplierId: number | null;
  supplierName: string;
  productId?: string | number | null;
  productName?: string | null;
  moq?: string | null;
  image?: string | null;
};

/**
 * Contact a supplier. Needs a signed-in buyer: the message is saved as an inquiry
 * addressed to that one supplier. The supplier is notified (dashboard + email) and
 * replies with a quote, which lands in the buyer's dashboard.
 */
export function ContactSupplierDialog({
  target,
  open,
  onOpenChange,
}: {
  target: ContactTarget | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const signedIn = useIsSignedIn(open);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && target) {
      setState("idle");
      setError(null);
      setMessage(
        target.productName
          ? `Hi ${target.supplierName}, we're interested in "${target.productName}"${target.moq ? ` (MOQ ${target.moq})` : ""}. Please send your best price, lead time and shipping terms.`
          : `Hi ${target.supplierName}, we'd like to discuss sourcing from you. Please share your catalogue, pricing and lead times.`,
      );
    }
  }, [open, target?.supplierId, target?.productId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!target) return null;

  const productIdNum = target.productId != null && /^\d+$/.test(String(target.productId)) ? Number(target.productId) : null;
  const canSend = target.supplierId != null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setState("sending");
    setError(null);
    try {
      await B2BDash.createInquiry({
        title: target.productName ? `Inquiry: ${target.productName}` : `Inquiry for ${target.supplierName}`,
        description: message.trim(),
        seller_id: target.supplierId,
        product_id: productIdNum,
      });
      setState("sent");
    } catch (err) {
      setError(describeApiError(err, "We couldn't send your message. Please try again."));
      setState("idle");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl border-border/60 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Trade-Assured Inquiry
          </div>
          <DialogTitle className="text-xl font-black tracking-tight">Contact {target.supplierName}</DialogTitle>
          <DialogDescription>
            {signedIn ? "Your message is sent to this supplier only." : "Sign in to message this supplier."}
          </DialogDescription>
        </DialogHeader>

        {!signedIn ? (
          <SignInGate
            title="Sign in to contact this supplier"
            description="Suppliers reply to verified buyer accounts, so we need to know who is asking. Your message would be saved to your dashboard where the reply arrives."
            onNavigate={() => onOpenChange(false)}
          />
        ) : state === "sent" ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-black">Inquiry sent</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              <span className="font-bold text-foreground">{target.supplierName}</span> has been notified by email and in their seller portal.
              Their reply will show up as a quote in your buyer dashboard, and you'll get an email when it does.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" className="rounded-full font-bold" onClick={() => onOpenChange(false)}>Close</Button>
              <Button asChild className="rounded-full px-6 font-bold">
                <Link href="/dashboard/b2b-marketplace" onClick={() => onOpenChange(false)}>Open my dashboard</Link>
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {target.productName && (
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-3 flex items-center gap-3">
                {target.image && (
                  <img
                    src={target.image}
                    alt={target.productName}
                    className="h-12 w-12 rounded-xl object-cover"
                    onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold line-clamp-1">{target.productName}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {target.supplierName}{target.moq ? ` · MOQ ${target.moq}` : ""}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Message *</label>
              <Textarea
                required
                rows={5}
                maxLength={5000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="rounded-xl bg-muted/30 resize-none"
              />
            </div>

            {!canSend && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                This is a sample listing, so it has no supplier to message.
              </p>
            )}
            {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
              <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Your details come from your account. The marketplace handles the conversation, payment and escrow.</span>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full font-bold">Cancel</Button>
              <Button type="submit" disabled={state === "sending" || !canSend || !message.trim()} className="rounded-full px-6 font-bold gap-2 shadow-lg shadow-primary/20">
                {state === "sending" ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <><Send className="h-4 w-4" /> Send Inquiry</>}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
