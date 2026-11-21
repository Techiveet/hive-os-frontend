"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  checkTenantAvailability,
  sanitizeTenantSlug,
  type TenantAvailabilityResult,
} from "@/lib/tenant-availability";
import { getPlatformRootDomain } from "@/lib/runtime-context";

// Identical on server and client (NEXT_PUBLIC_* is inlined at build time), so
// the first client render matches the SSR markup; the runtime-resolved root
// (which can inspect window.location) is applied after mount.
const INITIAL_ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost").trim().toLowerCase();

export function ErpSubdomainChecker() {
  const [subdomain, setSubdomain] = useState("ethio-logistics");
  // No availability request fires for anonymous visitors until they actually
  // interact (edit the name or press Check) — previously every landing-page
  // view hit /check-tenant.
  const [touched, setTouched] = useState(false);
  const [rootDomain, setRootDomain] = useState(INITIAL_ROOT_DOMAIN);
  const cleanSubdomain = sanitizeTenantSlug(subdomain);
  const fullDomain = `${cleanSubdomain || "your-company"}.${rootDomain}`;

  useEffect(() => {
    setRootDomain(getPlatformRootDomain());
  }, []);

  const [checkedState, setCheckedState] = useState<{
    slug: string;
    result: TenantAvailabilityResult;
  }>({
    slug: "",
    result: {
      status: "checking",
      available: false,
      message: "Checking workspace availability...",
    },
  });

  useEffect(() => {
    if (!touched) {
      return;
    }

    if (!cleanSubdomain) {
      setCheckedState({
        slug: "",
        result: {
          status: "invalid",
          available: false,
          message: "Enter at least 3 letters, numbers, or hyphens to check availability.",
        },
      });
      return;
    }

    const controller = new AbortController();
    setCheckedState({
      slug: cleanSubdomain,
      result: {
        status: "checking",
        available: false,
        message: `Checking ${fullDomain} availability...`,
      },
    });

    const timer = setTimeout(async () => {
      try {
        const result = await checkTenantAvailability(cleanSubdomain, controller.signal);
        if (!controller.signal.aborted) {
          setCheckedState({ slug: cleanSubdomain, result });
        }
      } catch (err) {
        if ((err as { name?: string })?.name !== "AbortError" && !controller.signal.aborted) {
          setCheckedState({
            slug: cleanSubdomain,
            result: {
              status: "error",
              available: false,
              message: "Unable to verify workspace availability right now.",
            },
          });
        }
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [cleanSubdomain, fullDomain, touched]);

  const availability: TenantAvailabilityResult = !touched
    ? {
        status: "idle",
        available: false,
        message: "Type your company name or press Check to see if the address is free.",
      }
    : checkedState.slug === cleanSubdomain
      ? checkedState.result
      : {
          status: "checking",
          available: false,
          message: `Checking ${fullDomain} availability...`,
        };

  const isClaimable = Boolean(cleanSubdomain) && availability.status === "available";
  const isBlocked = availability.status === "taken" || availability.status === "reserved" || availability.status === "invalid";

  return (
    <div className="w-full max-w-3xl mx-auto rounded-3xl border border-primary/30 bg-gradient-to-b from-card/90 via-card/70 to-card/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/20 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-emerald-500/15 blur-[80px]" />

      <div className="relative z-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-space text-lg font-bold text-foreground">
                Claim Your Enterprise ERP Portal
              </h4>
              <p className="font-mono text-xs text-muted-foreground">
                Instant DNS provisioning with dedicated SSL and isolated tenant database
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Instant Activation
          </span>
        </div>

        {/* Input & Subdomain Preview */}
        <div className="space-y-3">
          <label
            htmlFor="landing-portal-slug-input"
            className="block font-space text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            Enter Your Company / Organization Name
          </label>
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <div className="relative flex-1 flex items-center rounded-2xl border border-border/80 bg-background px-4 py-3 shadow-inner focus-within:border-primary">
              <span className="font-mono text-xs text-muted-foreground mr-1">https://</span>
              <input
                id="landing-portal-slug-input"
                type="text"
                value={subdomain}
                onChange={(e) => {
                  setTouched(true);
                  setSubdomain(e.target.value);
                }}
                placeholder="acme-industries"
                className="flex-1 bg-transparent font-space text-base font-bold text-foreground focus:outline-none placeholder:text-muted-foreground/50"
              />
              <span className="font-space text-sm font-bold text-primary">.{rootDomain}</span>
            </div>

            {isClaimable ? (
              <Button
                asChild
                className="h-full w-full sm:w-auto px-6 py-3.5 rounded-2xl font-space text-sm font-bold uppercase tracking-wider shadow-lg shadow-primary/25"
              >
                <Link href={`/auth/signup?slug=${encodeURIComponent(cleanSubdomain)}`}>
                  Claim Portal <ArrowRight className="h-4 w-4 ml-1.5" />
                </Link>
              </Button>
            ) : !touched ? (
              <Button
                type="button"
                onClick={() => setTouched(true)}
                className="h-full w-full sm:w-auto px-6 py-3.5 rounded-2xl font-space text-sm font-bold uppercase tracking-wider"
              >
                Check Availability <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled
                className="h-full w-full sm:w-auto px-6 py-3.5 rounded-2xl font-space text-sm font-bold uppercase tracking-wider opacity-60 cursor-not-allowed"
              >
                Claim Portal <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Live Validation & Status Card */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/40 p-4 font-mono text-xs">
          <div role="status" aria-live="polite" className="min-w-0">
            {availability.status === "available" ? (
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  <strong>{fullDomain}</strong> is available for instant deployment
                </span>
              </div>
            ) : isBlocked ? (
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  <strong>{fullDomain}</strong> — {availability.message}
                </span>
              </div>
            ) : availability.status === "idle" ? (
              <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                <Globe className="h-4 w-4 shrink-0" />
                <span>{availability.message}</span>
              </div>
            ) : availability.status === "checking" ? (
              <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                <span>{availability.message}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{availability.message}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-muted-foreground text-[11px]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> PostgreSQL Schema Isolated
            </span>
            <span className="hidden md:flex items-center gap-1">
              <Lock className="h-3.5 w-3.5 text-primary" /> Auto-Let&apos;s Encrypt SSL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
