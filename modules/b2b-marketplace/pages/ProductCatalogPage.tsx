"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, Loader2, MapPin, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { B2BApi } from "@/modules/b2b-marketplace/api";
import { ProductPhoto } from "@/modules/b2b-marketplace/components/product-photo";

export default function ProductCatalogPage() {
  const router = useRouter();
  const params = useSearchParams();
  const search = params.get("search") ?? "";
  const category = params.get("category") ?? "";
  const supplierId = params.get("supplier_id") ?? "";
  const [draft, setDraft] = useState(search);

  useEffect(() => {
    setDraft(search);
  }, [search]);

  const replaceFilters = (next: { search?: string; category?: string; supplier_id?: string }) => {
    const query = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) query.set(key, value);
      else query.delete(key);
    }
    const qs = query.toString();
    router.replace(qs ? `/marketplace/products?${qs}` : "/marketplace/products");
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft !== search) replaceFilters({ search: draft.trim() });
    }, 300);
    return () => clearTimeout(timer);
    // replaceFilters closes over the latest params; draft/search are the triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const productsQ = useQuery({
    queryKey: ["b2bCatalog", search, category, supplierId],
    queryFn: () =>
      B2BApi.products({
        search: search || undefined,
        category: category || undefined,
        supplier_id: supplierId || undefined,
      }),
  });
  const categoriesQ = useQuery({ queryKey: ["b2bCategories"], queryFn: () => B2BApi.categories() });
  const suppliersQ = useQuery({ queryKey: ["b2bSuppliers"], queryFn: () => B2BApi.suppliers() });

  const products = productsQ.data ?? [];

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl sm:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <h1 className="text-4xl font-black tracking-tight">All products</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Listings from verified suppliers. Filter by name, category, or supplier.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Search products"
              className="h-11 rounded-xl pl-9"
            />
          </div>
          <Select value={category || "all"} onValueChange={(value) => replaceFilters({ category: value === "all" ? "" : value })}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(categoriesQ.data ?? []).map((item) => (
                <SelectItem key={item.slug} value={item.slug}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={supplierId || "all"} onValueChange={(value) => replaceFilters({ supplier_id: value === "all" ? "" : value })}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All suppliers</SelectItem>
              {(suppliersQ.data ?? []).map((supplier) => (
                <SelectItem key={supplier.id} value={String(supplier.id)}>{supplier.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {productsQ.isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : productsQ.isError ? (
          <p className="mt-16 text-center text-sm text-muted-foreground">Could not load products. Refresh and try again.</p>
        ) : products.length === 0 ? (
          <p className="mt-16 text-center text-sm text-muted-foreground">No products match these filters.</p>
        ) : (
          <>
            <p className="mt-6 text-sm text-muted-foreground">{products.length} product{products.length === 1 ? "" : "s"}</p>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/marketplace/product/${product.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/70 hover:border-primary/40"
                >
                  <ProductPhoto src={product.image} alt={product.name} className="aspect-[4/3]" imgClassName="transition-transform duration-500 group-hover:scale-105" />
                  <div className="p-4">
                    <p className="line-clamp-2 min-h-[2.5rem] text-sm font-bold">{product.name}</p>
                    <p className="mt-2 text-lg font-black text-primary">{product.price || "Price on request"}</p>
                    <p className="text-[11px] text-muted-foreground">MOQ: {product.moq || "—"}</p>
                    <p className="mt-2 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                      {product.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-blue-500" />}
                      {product.supplier}
                      {product.location ? <><MapPin className="ml-1 h-3 w-3 shrink-0" />{product.location}</> : null}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
