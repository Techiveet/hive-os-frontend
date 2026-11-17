"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermissions } from "@/hooks/use-permissions";
import { B2BDash, type B2BDispute } from "@/modules/b2b-marketplace/api";
import { getWorkspaceScopeKey } from "@/lib/runtime-context";

type Resolution = "refund_buyer" | "release_seller" | "no_action";

const RESOLUTION_LABEL: Record<Resolution, string> = {
  refund_buyer: "Refund the buyer",
  release_seller: "Clear the supplier for payout",
  no_action: "Close without action",
};

const errorText = (e: unknown): string => {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message || err?.message || "Something went wrong";
};

/** Disputes raised on orders. Everyone sees theirs; the marketplace admin resolves them. */
export default function AdminDisputes() {
  const qc = useQueryClient();
  const { hasPermission } = usePermissions();
  const canResolve = hasPermission("manage_b2b_marketplace");
  const workspaceScope = getWorkspaceScopeKey();

  const [filter, setFilter] = React.useState<"open" | "resolved">("open");
  const q = useQuery({
    queryKey: ["b2b", "disputes", workspaceScope, filter],
    queryFn: () => B2BDash.disputes(filter),
  });
  const disputes = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Scale className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-black">Disputes</h3>
        <div className="ml-auto inline-flex rounded-lg border p-0.5">
          {(["open", "resolved"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "ghost"} className="h-7 capitalize" onClick={() => setFilter(f)}>
              {f}
            </Button>
          ))}
        </div>
      </div>

      {q.isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : disputes.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No {filter} disputes.</CardContent></Card>
      ) : (
        disputes.map((d) => (
          <DisputeCard
            key={d.id}
            dispute={d}
            canResolve={canResolve}
            onResolved={() => {
              qc.invalidateQueries({ queryKey: ["b2b", "disputes"] });
              qc.invalidateQueries({ queryKey: ["b2b", "adminOrders"] });
            }}
          />
        ))
      )}
    </div>
  );
}

function DisputeCard({ dispute: d, canResolve, onResolved }: { dispute: B2BDispute; canResolve: boolean; onResolved: () => void }) {
  const [resolution, setResolution] = React.useState<Resolution>("release_seller");
  const [notes, setNotes] = React.useState("");
  const [refundReference, setRefundReference] = React.useState("");

  const resolve = useMutation({
    mutationFn: () =>
      B2BDash.resolveDispute(d.id, {
        resolution,
        notes: notes.trim(),
        // Card payments are refunded through Stripe automatically; anything else is a manual refund
        // that needs the transfer reference (the buyer's refund details must be on the order).
        refund_mode: "auto",
        refund_reference: resolution === "refund_buyer" && refundReference.trim() ? refundReference.trim() : undefined,
      }),
    onSuccess: onResolved,
  });

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[160px] flex-1">
            <p className="text-sm font-black">Order {d.order_number}</p>
            <p className="text-xs text-muted-foreground">
              {d.buyer ?? "Buyer"} ↔ {d.sellers.join(", ") || "Supplier"} · opened by the {d.raised_by_role} · {new Date(d.created_at).toLocaleDateString()}
            </p>
          </div>
          {d.order_total != null && (
            <span className="text-sm font-bold">{d.currency} {d.order_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          )}
          <Badge variant={d.status === "open" ? "destructive" : "default"} className="capitalize">{d.status}</Badge>
        </div>

        <p className="whitespace-pre-line rounded-lg bg-muted/40 px-3 py-2 text-sm">{d.reason}</p>

        {d.status === "resolved" && (
          <p className="text-xs text-muted-foreground">
            Resolved: <b>{RESOLUTION_LABEL[d.resolution as Resolution] ?? d.resolution}</b>
            {d.resolution_notes ? ` - ${d.resolution_notes}` : ""}
          </p>
        )}

        {d.status === "open" && canResolve && (
          <div className="space-y-2 rounded-lg border px-3 py-3">
            <Select value={resolution} onValueChange={(v) => setResolution(v as Resolution)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(RESOLUTION_LABEL) as Resolution[]).map((r) => (
                  <SelectItem key={r} value={r}>{RESOLUTION_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              rows={2} maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Resolution notes (shared with both parties)"
            />
            {resolution === "refund_buyer" && (
              <>
                <p className="text-xs text-muted-foreground">
                  Card (Stripe) payments are refunded automatically. For bank transfer or Chapa payments, make sure the buyer&apos;s refund details
                  are on the order (Orders &amp; Payments), send the refund yourself, then enter its transfer reference below.
                </p>
                <Input
                  placeholder="Refund transfer reference (not needed for card payments)"
                  value={refundReference} maxLength={255}
                  onChange={(e) => setRefundReference(e.target.value)}
                />
              </>
            )}
            {resolve.isError && (
              <p className="flex items-start gap-1 text-xs text-destructive" role="alert">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {errorText(resolve.error)}
              </p>
            )}
            <Button size="sm" disabled={resolve.isPending || notes.trim().length < 3} onClick={() => resolve.mutate()} className="gap-1">
              {resolve.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Resolve dispute
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
