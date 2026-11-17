"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, ChevronLeft, ChevronRight, Loader2, PackageOpen, Search, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { B2BApi, type B2BSupplier } from "@/modules/b2b-marketplace/api";

const PER_PAGE = 12;
const ALL = "__all__";

function SupplierTile({ s }: { s: B2BSupplier }) {
  return (
    <Link
      href={`/marketplace/supplier/${s.id}`}
      className="group flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur-xl transition-all hover:border-primary/40 hover:shadow-xl"
    >
      <div className="flex items-center gap-3">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-gradient-to-br from-primary/20 to-primary/5 text-lg font-black text-primary">
          {s.logo && /^https?:|^\//.test(s.logo) ? (
            <img src={s.logo} alt="" className="h-full w-full rounded-xl object-cover" />
          ) : (
            (s.logo || s.name.slice(0, 2)).toUpperCase()
          )}
          {s.premium && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 shadow">
              <Sparkles className="h-3 w-3 text-white" />
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-black leading-tight">
            <span className="truncate">{s.name}</span>
            {s.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-blue-500" />}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {s.flag} {s.country || "—"}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-center">
        <div>
          <p className="inline-flex items-center gap-1 text-sm font-black">
            {s.rating != null ? (<><Star className="h-3.5 w-3.5 fill-current text-amber-500" />{s.rating}</>) : "New"}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rating</p>
        </div>
        <div>
          <p className="text-sm font-black">{s.years}y</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">In business</p>
        </div>
        <div>
          <p className="text-sm font-black">{s.products}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Products</p>
        </div>
      </div>
    </Link>
  );
}

export default function SuppliersPage() {
  const router = useRouter();
  const params = useSearchParams();
  const search = params.get("search") ?? "";
  const country = params.get("country") ?? "";
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const [draft, setDraft] = useState(search);

  useEffect(() => setDraft(search), [search]);

  const setFilters = (next: { search?: string; country?: string; page?: number }) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v && !(k === "page" && v === 1)) q.set(k, String(v));
      else q.delete(k);
    }
    // Any filter change returns to page 1.
    if (!("page" in next)) q.delete("page");
    const qs = q.toString();
    router.replace(qs ? `/marketplace/suppliers?${qs}` : "/marketplace/suppliers");
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (draft.trim() !== search) setFilters({ search: draft.trim(), country });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const countriesQ = useQuery({ queryKey: ["b2bSupplierCountries"], queryFn: B2BApi.supplierCountries, staleTime: 300000 });
  const q = useQuery({
    queryKey: ["b2bSuppliersPage", search, country, page],
    queryFn: () => B2BApi.suppliersPage({ page, per_page: PER_PAGE, search: search || undefined, country: country || undefined }),
    placeholderData: (prev) => prev,
    retry: 1,
  });

  const suppliers = q.data?.data ?? [];
  const meta = q.data?.meta;

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl sm:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold transition-colors hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-8">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">All suppliers</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Every supplier here is KYC-verified. Open a profile to see their products and contact them.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Search suppliers by name…"
              className="h-11 rounded-xl pl-9"
            />
          </div>
          <Select value={country || ALL} onValueChange={(v) => setFilters({ search, country: v === ALL ? "" : v })}>
            <SelectTrigger className="h-11 rounded-xl sm:w-56"><SelectValue placeholder="All countries" /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value={ALL}>All countries</SelectItem>
              {(countriesQ.data ?? []).map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {meta && (
          <p className="mt-4 text-xs text-muted-foreground">
            {meta.total.toLocaleString()} supplier{meta.total === 1 ? "" : "s"}
            {(search || country) && " match your filters"}
          </p>
        )}

        {q.isLoading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : q.isError ? (
          <div className="py-24 text-center">
            <PackageOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 font-bold">We couldn't load suppliers.</p>
            <Button className="mt-4 rounded-xl" onClick={() => q.refetch()}>Try again</Button>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="py-24 text-center">
            <PackageOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 font-bold">No suppliers found</p>
            {(search || country) && (
              <Button variant="outline" className="mt-4 rounded-xl" onClick={() => { setDraft(""); setFilters({}); }}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className={`mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${q.isFetching ? "opacity-60 transition-opacity" : ""}`}>
            {suppliers.map((s) => (<SupplierTile key={s.id} s={s} />))}
          </div>
        )}

        {meta && meta.last_page > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" className="rounded-full gap-1" disabled={page <= 1} onClick={() => setFilters({ search, country, page: page - 1 })}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {meta.current_page} of {meta.last_page}</span>
            <Button variant="outline" size="sm" className="rounded-full gap-1" disabled={page >= meta.last_page} onClick={() => setFilters({ search, country, page: page + 1 })}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
