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

export const cartStore = {
  getSnapshot: () => items,
  getServerSnapshot: () => EMPTY,
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  add(item: Omit<CartItem, "quantity">, qty = 1) {
    const existing = items.find((i) => i.id === item.id);
    if (existing) {
      items = items.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + qty } : i));
    } else {
      items = [...items, { ...item, quantity: qty }];
    }
    persist();
  },
  setQty(id: string, qty: number) {
    items = items.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, Math.floor(qty) || 1) } : i));
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
