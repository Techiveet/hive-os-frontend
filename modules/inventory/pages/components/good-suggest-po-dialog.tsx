"use client";

import * as React from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SuggestedPurchaseOrderResponse } from "@/modules/inventory/types";

type Props = {
  open: boolean;
  suggestion: SuggestedPurchaseOrderResponse | null;
  onClose: () => void;
};

export function GoodSuggestPoDialog({ open, suggestion, onClose }: Props) {
  const supplierName = suggestion?.preferred_supplier?.name || "No preferred supplier set";
  const qty = suggestion?.suggested_quantity ?? 0;
  const uom = suggestion?.uom || "units";
  const total = suggestion?.estimated_total ?? 0;
  const unitCost = suggestion?.unit_cost ?? 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md rounded-3xl border border-border/60 bg-background/95 p-6 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-emerald-500" />
            Restock Suggestion
          </DialogTitle>
          <DialogDescription>
            Recommendation only — this does not create a purchase order. Use it to plan a draft in
            Procurement.
          </DialogDescription>
        </DialogHeader>

        {suggestion ? (
          <div className="space-y-4 pt-1">
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Material
                </p>
                <p className="text-sm font-bold">{suggestion.good_name}</p>
                <p className="text-xs font-mono text-muted-foreground">{suggestion.sku}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Available
                  </p>
                  <p className="font-semibold tabular-nums">
                    {Number(suggestion.available_stock).toLocaleString()} {uom}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Reorder Level
                  </p>
                  <p className="font-semibold tabular-nums">
                    {Number(suggestion.reorder_level).toLocaleString()} {uom}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Suggested Qty
                  </p>
                  <p className="font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                    {Number(qty).toLocaleString()} {uom}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Est. Total
                  </p>
                  <p className="font-black tabular-nums">
                    ${Number(total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 p-4 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Preferred Supplier
              </p>
              <p className="text-sm font-semibold">{supplierName}</p>
              {suggestion.preferred_supplier?.code ? (
                <p className="text-xs text-muted-foreground font-mono">
                  {suggestion.preferred_supplier.code}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground pt-1">
                Unit cost ${Number(unitCost).toLocaleString(undefined, { minimumFractionDigits: 2 })} · MOQ{" "}
                {Number(suggestion.min_order_quantity).toLocaleString()} {uom}
              </p>
            </div>

            {suggestion.purchase_order_draft?.notes ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {suggestion.purchase_order_draft.notes}
              </p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter className="pt-2">
          <Button onClick={onClose} className="rounded-xl px-5">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
