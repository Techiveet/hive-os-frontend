"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function QtyInput({
  value,
  onCommit,
  min = 1,
  className,
}: {
  value: number;
  onCommit: (qty: number) => void;
  min?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const n = parseInt(draft.replace(/[^0-9]/g, ""), 10);
    onCommit(Number.isFinite(n) ? n : min);
    // If the store clamps to the same value, `value` won't change — resync the text.
    setDraft(String(Math.max(min, Number.isFinite(n) ? n : min)));
  };

  return (
    <input
      inputMode="numeric"
      aria-label="Quantity"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={cn("bg-transparent text-center outline-none", className)}
    />
  );
}
