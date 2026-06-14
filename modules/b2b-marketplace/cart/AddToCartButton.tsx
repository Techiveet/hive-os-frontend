"use client";

import React, { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cartStore, parsePrice } from "@/modules/b2b-marketplace/cart/cart-store";

type CartProductInput = {
  id: string;
  name: string;
  image?: string | null;
  supplier?: string | null;
  priceLabel?: string | null;
  moq?: string | null;
};

export function AddToCartButton({
  product,
  quantity = 1,
  size = "sm",
  className,
  label = "Add to Cart",
}: {
  product: CartProductInput;
  quantity?: number;
  size?: "sm" | "default" | "lg";
  className?: string;
  label?: string;
}) {
  const [added, setAdded] = useState(false);

  const onAdd = () => {
    cartStore.add(
      {
        id: product.id,
        name: product.name,
        image: product.image ?? null,
        supplier: product.supplier ?? null,
        priceLabel: product.priceLabel ?? null,
        unitPrice: parsePrice(product.priceLabel),
        moq: product.moq ?? null,
      },
      quantity,
    );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1300);
  };

  return (
    <Button
      type="button"
      size={size}
      onClick={onAdd}
      className={cn("rounded-xl font-bold gap-1.5 transition-colors", added && "bg-emerald-600 hover:bg-emerald-600", className)}
    >
      {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
      {added ? "Added" : label}
    </Button>
  );
}
