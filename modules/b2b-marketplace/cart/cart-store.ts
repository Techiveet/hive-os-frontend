"use client";

import { useSyncExternalStore } from "react";

export type CartItem = {
  id: string;
  name: string;
  image?: string | null;
  supplier?: string | null;
  priceLabel?: string | null;
  unitPrice: number;
  moq?: string | null;
  /** Smallest quantity the supplier will sell (parsed from the MOQ label). */
  minQty?: number;
  quantity: number;
};

const KEY = "b2b_cart_v1";
let items: CartItem[] = load();
const listeners = new Set<() => void>();

function load(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(items));
  }
  listeners.forEach((l) => l());
}

/** Best-effort numeric price from a formatted label like "$85,000.00 / kg". */
export function parsePrice(s?: string | null): number {
  if (!s) return 0;
  const n = parseFloat(String(s).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Minimum order quantity from a label like "1,000 kg" or "50-100 pcs" → 1000 / 50. Defaults to 1. */
export function parseMoq(s?: string | null): number {
  if (!s) return 1;
  const m = /\d[\d,]*(?:\.\d+)?/.exec(String(s));
  if (!m) return 1;
  const n = Math.floor(parseFloat(m[0].replace(/,/g, "")));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export const cartStore = {
  getSnapshot: () => items,
  getServerSnapshot: () => EMPTY,
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  add(item: Omit<CartItem, "quantity">, qty = 1) {
    // A supplier will not sell below its MOQ, so never put less than that in the cart.
    const minQty = item.minQty ?? parseMoq(item.moq);
    const existing = items.find((i) => i.id === item.id);
    if (existing) {
      items = items.map((i) => (i.id === item.id ? { ...i, minQty, quantity: Math.max(minQty, i.quantity + qty) } : i));
    } else {
      items = [...items, { ...item, minQty, quantity: Math.max(minQty, qty) }];
    }
    persist();
  },
  /** Quantity is clamped to the item's MOQ; the UI shows the minimum so this is never a silent change. */
  setQty(id: string, qty: number) {
    items = items.map((i) => {
      if (i.id !== id) return i;
      const min = i.minQty ?? parseMoq(i.moq);
      return { ...i, minQty: min, quantity: Math.max(min, Math.floor(qty) || min) };
    });
    persist();
  },
  remove(id: string) {
    items = items.filter((i) => i.id !== id);
    persist();
  },
  clear() {
    items = [];
    persist();
  },
};

const EMPTY: CartItem[] = [];

export function useCart() {
  const list = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  const count = list.reduce((n, i) => n + i.quantity, 0);
  const subtotal = list.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  return {
    items: list,
    count,
    subtotal,
    add: cartStore.add,
    setQty: cartStore.setQty,
    remove: cartStore.remove,
    clear: cartStore.clear,
  };
}
