"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { B2BDash, type B2BOrder } from "@/modules/b2b-marketplace/api";
import {
  EMPTY_REFUND_DETAILS,
  RefundDetailsFields,
  refundFormValid,
  toRefundPayload,
  type RefundDetailsForm,
} from "@/modules/b2b-marketplace/components/RefundDetailsFields";

const errorText = (e: unknown): string => {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message || err?.message || "Something went wrong";
};

/** Buyer adds or changes where a refund for this order should be sent. */
export function RefundDetailsDialog({ order, onClose, onDone }: { order: B2BOrder | null; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<RefundDetailsForm>(EMPTY_REFUND_DETAILS);

  React.useEffect(() => {
    setForm(EMPTY_REFUND_DETAILS);
  }, [order?.id]);

  const save = useMutation({
    mutationFn: () => B2BDash.updateRefundDetails(order!.id, toRefundPayload(form)),
    onSuccess: () => {
      setForm(EMPTY_REFUND_DETAILS);
      onDone();
    },
  });

  const current = order?.refund_details ?? null;

  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" /> Refund details</DialogTitle>
          <DialogDescription>
            Order {order?.order_number}. If this order is refunded, the money is sent here. Use an account in your own or your company&apos;s name.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-3">
          {current && (
            <p className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
              On file: <b className="text-foreground">{current.bank_name}</b> · {current.account_name} · {current.account_number}
            </p>
          )}
          <RefundDetailsFields value={form} onChange={setForm} disabled={save.isPending} />
          {save.isError && <p className="text-xs text-destructive" role="alert">{errorText(save.error)}</p>}
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !refundFormValid(form)} className="w-full gap-2 rounded-xl">
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {current ? "Replace details" : "Save details"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
