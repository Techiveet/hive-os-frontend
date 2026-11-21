"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const BrandCursor = dynamic(() => import("@/components/brand-cursor"), {
  ssr: false,
  loading: () => null,
});

const Toaster = dynamic(
  () => import("@/components/ui/toaster").then((m) => m.Toaster),
  { ssr: false, loading: () => null },
);

export function DeferredChrome() {
  const pathname = usePathname() ?? "";
  const isPublicLanding = pathname === "/";
  const [ready, setReady] = useState(!isPublicLanding);

  useEffect(() => {
    if (!isPublicLanding) {
      setReady(true);
      return;
    }
    const timer = window.setTimeout(() => setReady(true), 1800);
    return () => window.clearTimeout(timer);
  }, [isPublicLanding]);

  if (!ready) return null;

  return (
    <>
      <BrandCursor />
      <Toaster />
    </>
  );
}
