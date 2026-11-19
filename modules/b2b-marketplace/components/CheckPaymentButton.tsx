"use client";

import React from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { B2BDash } from "@/modules/b2b-marketplace/api";

const errorText = (e: unknown): string => {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message || err?.message || "Something went wrong";
};

export function CheckPaymentButton({ orderId, onChecked }: { orderId: number; onChecked: () => void }) {
  const check = useMutation({
    mutationFn: () => B2BDash.onlineVerify(orderId),
    onSuccess: (res) => {
      if (res.outcome === "paid") onChecked();
    },
  });

  const result = check.data;

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" disabled={check.isPending} onClick={() => check.mutate()} className="gap-1">
        {check.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Check payment
      </Button>
      {check.isError && <span className="text-xs text-destructive" role="alert">{errorText(check.error)}</span>}
      {result && result.outcome !== "paid" && (
        <span className="text-xs text-muted-foreground" role="status">
          {result.outcome === "pending" || result.outcome === "unknown" ? "Not confirmed yet. Try again in a minute." : result.message}
        </span>
      )}
    </span>
  );
}
