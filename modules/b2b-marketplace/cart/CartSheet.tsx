"use client";

import React from "react";
import Link from "next/link";
import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart } from "@/modules/b2b-marketplace/cart/cart-store";

export function CartSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { items, subtotal, setQty, remove } = useCart();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="inline-flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" /> Your Cart
            <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              {items.length}
            </span>
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ShoppingCart className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Continue browsing
            </Button>
          </div>
        ) : (
          <>
            <div className="-mx-2 flex-1 space-y-3 overflow-y-auto px-2 py-2">
              {items.map((it) => (
                <div key={it.id} className="flex gap-3 rounded-2xl border border-border/60 bg-card/50 p-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted/30">
                    {it.image && (
                      <img
                        src={it.image}
                        alt={it.name}
                        className="h-full w-full object-cover"
                        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-bold leading-snug">{it.name}</p>
                    <p className="text-xs text-muted-foreground">{it.supplier}</p>
                    <p className="mt-1 text-sm font-black text-primary">
                      ${it.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button onClick={() => remove(it.id)} className="text-muted-foreground hover:text-destructive" title="Remove">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-1 rounded-lg border border-border/60">
                      <button className="p-1.5 hover:text-primary" onClick={() => setQty(it.id, it.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        value={it.quantity}
                        onChange={(e) => setQty(it.id, parseInt(e.target.value || "1", 10))}
                        className="w-10 bg-transparent text-center text-sm font-bold outline-none"
                      />
                      <button className="p-1.5 hover:text-primary" onClick={() => setQty(it.id, it.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-border/60 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated subtotal</span>
                <span className="text-xl font-black text-primary">
                  ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Final pricing, taxes and freight are confirmed at checkout against live supplier rates.
              </p>
              <Button asChild className="w-full rounded-xl font-bold" onClick={() => onOpenChange(false)}>
                <Link href="/marketplace/checkout">Proceed to Checkout</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
