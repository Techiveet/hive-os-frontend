"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, ShoppingBag, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";
import { B2BApi } from "@/modules/b2b-marketplace/api";

export default function RegisterPage() {
  const params = useSearchParams();
  const initialRole = params.get("role") === "seller" ? "seller" : "buyer";
  const [role, setRole] = useState<"buyer" | "seller">(initialRole);
  const [form, setForm] = useState({ name: "", email: "", password: "", company: "" });
  const [done, setDone] = useState(false);

  const submit = useMutation({
    mutationFn: () =>
      B2BApi.register({
        name: form.name,
        email: form.email,
        password: form.password,
        company: form.company || undefined,
        requested_role: role,
      }),
    onSuccess: () => setDone(true),
  });

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/80 px-4 sm:px-8 py-3 backdrop-blur-xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-md px-4 py-12">
        {done ? (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="rounded-3xl border border-border/60 bg-card/60 p-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-black">Registration received</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your <b>{role}</b> account has been created and is <b>pending approval</b>. An administrator
              will verify and activate it — you'll be able to sign in and access the {role} tools once approved.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild variant="outline" className="rounded-xl"><Link href="/">Browse marketplace</Link></Button>
              <Button asChild className="rounded-xl"><Link href="/sign-in">Go to sign in</Link></Button>
            </div>
          </motion.div>
        ) : (
          <>
            <h1 className="text-3xl font-black tracking-tight">Create your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">Join the marketplace as a buyer or a supplier. An admin approves new accounts.</p>

            {/* Role toggle */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              {([
                { key: "buyer", label: "I'm a Buyer", desc: "Source & purchase products", icon: ShoppingBag },
                { key: "seller", label: "I'm a Supplier", desc: "Sell & quote on RFQs", icon: Store },
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setRole(opt.key)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all",
                    role === opt.key ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/60 hover:border-primary/40",
                  )}
                >
                  <opt.icon className={cn("h-5 w-5", role === opt.key ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-sm font-bold">{opt.label}</span>
                  <span className="text-[11px] text-muted-foreground">{opt.desc}</span>
                </button>
              ))}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); submit.mutate(); }} className="mt-5 space-y-3">
              <Input required placeholder="Full name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder={role === "seller" ? "Company name" : "Company (optional)"} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              <Input required type="email" placeholder="Work email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input required type="password" minLength={8} placeholder="Password (min 8 characters) *" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

              {submit.isError && (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {(submit.error as Error)?.message || "Registration failed."}
                </p>
              )}

              <Button type="submit" disabled={submit.isPending} className="h-11 w-full rounded-xl text-base font-bold gap-2">
                {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create {role === "seller" ? "supplier" : "buyer"} account
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account? <Link href="/sign-in" className="font-bold text-primary hover:underline">Sign in</Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
}
