"use client";

import { useState } from "react";
import { Package } from "lucide-react";

import { cn } from "@/lib/utils";

/** Neutral stand-in when a listing has no photo, or the photo URL fails. */
export function ProductPhoto({
  src,
  alt,
  className,
  imgClassName,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const show = Boolean(src?.trim()) && !failed;

  return (
    <div className={cn("relative overflow-hidden bg-muted/40", className)}>
      {show ? (
        <img
          src={src!}
          alt={alt}
          className={cn("h-full w-full object-cover", imgClassName)}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Package className="h-10 w-10" strokeWidth={1.25} />
          <span className="text-[11px] font-semibold uppercase tracking-widest">No photo</span>
        </div>
      )}
    </div>
  );
}
