"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAccessToken } from "@/lib/runtime-context";

/** True when a user is signed in. Resolved after mount so SSR and hydration agree. */
export function useIsSignedIn(recheckOn?: unknown): boolean {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    setSignedIn(!!getAccessToken());
  }, [recheckOn]);
  return signedIn;
}

/** Sign-in URL that returns the person to the page they were on (same-origin path only). */
export function signInHref(): string {
  if (typeof window === "undefined") return "/sign-in";
  const back = window.location.pathname + window.location.search;
  return `/sign-in?redirect=${encodeURIComponent(back)}`;
}

/**
 * Shown instead of a form when the action needs an account. Explains *why* before
 * sending the person anywhere, instead of bouncing them to a bare sign-in page.
 */
export function SignInGate({
  title,
  description,
  onNavigate,
}: {
  title: string;
  description: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="py-8 text-center space-y-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-lg font-black">{title}</h3>
      <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
      <div className="flex flex-wrap justify-center gap-2 pt-1">
        <Button asChild className="rounded-full px-6 font-bold shadow-lg shadow-primary/20">
          <Link href={signInHref()} onClick={onNavigate}>Sign in</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full font-bold">
          <Link href="/marketplace/register" onClick={onNavigate}>Create an account</Link>
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">New buyer accounts are reviewed and approved before they can contact suppliers or post RFQs.</p>
    </div>
  );
}

/** Turn an axios/fetch failure into a sentence a buyer can act on. */
export function describeApiError(err: unknown, fallback: string): string {
  const e = err as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } };
  const errors = e?.response?.data?.errors;
  const first = errors ? Object.values(errors).flat()[0] : undefined;
  if (first) return first;
  if (e?.response?.status === 403 && !e.response.data?.message) {
    return "Your account isn't approved as a buyer yet. You'll be able to do this once an admin approves it.";
  }
  return e?.response?.data?.message || fallback;
}
