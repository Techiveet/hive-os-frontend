"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Landmark, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { B2BDash, type B2BAdminPayoutAccount } from "@/modules/b2b-marketplace/api";
import { getWorkspaceScopeKey } from "@/lib/runtime-context";

type Filter = "pending" | "verified" | "rejected";

const errorText = (e: unknown): string => {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message || err?.message || "Something went wrong";
};

/** Admin review of supplier payout accounts. A payout can only be released to a verified one. */
export default function PayoutAccountsAdmin() {
  const qc = useQueryClient();
  const workspaceScope = getWorkspaceScopeKey();
  const [filter, setFilter] = React.useState<Filter>("pending");
  const q = useQuery({
    queryKey: ["b2b", "payoutAccounts", workspaceScope, filter],
    queryFn: () => B2BDash.payoutAccounts(filter),
  });
  const accounts = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Landmark className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-black">Supplier payout accounts</h3>
        <div className="ml-auto inline-flex rounded-lg border p-0.5">
          {(["pending", "verified", "rejected"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "ghost"} className="h-7 capitalize" onClick={() => setFilter(f)}>
              {f}
            </Button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Before verifying, check that the account name matches the supplier&apos;s registered company. Payouts can only be sent to verified accounts.
      </p>

      {q.isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : accounts.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No {filter} payout accounts.</CardContent></Card>
      ) : (
        accounts.map((a) => (
          <AccountCard
            key={`${a.id}-${a.revision}`}
            account={a}
            onDecided={() => qc.invalidateQueries({ queryKey: ["b2b", "payoutAccounts"] })}
          />
        ))
      )}
    </div>
  );
}

function AccountCard({ account: a, onDecided }: { account: B2BAdminPayoutAccount; onDecided: () => void }) {
  const [rejecting, setRejecting] = React.useState(false);
  const [reason, setReason] = React.useState("");

  const verify = useMutation({ mutationFn: () => B2BDash.verifyPayoutAccount(a.id, a.revision), onSuccess: onDecided });
  const reject = useMutation({
    mutationFn: () => B2BDash.rejectPayoutAccount(a.id, a.revision, reason.trim()),
    onSuccess: onDecided,
  });
  const error = verify.isError ? verify.error : reject.isError ? reject.error : null;

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[160px] flex-1">
            <p className="text-sm font-black">{a.seller ?? "Supplier"}</p>
            <p className="text-xs text-muted-foreground">
              {a.seller_tax_id ? `Tax ID ${a.seller_tax_id} · ` : ""}updated {new Date(a.updated_at).toLocaleString()}
            </p>
          </div>
          <Badge variant={a.status === "verified" ? "default" : a.status === "rejected" ? "destructive" : "secondary"} className="capitalize">{a.status}</Badge>
        </div>

        <div className="grid gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm sm:grid-cols-3">
          <div><p className="text-[11px] text-muted-foreground">{a.method === "wallet" ? "Wallet" : "Bank"}</p><p className="font-bold">{a.bank_name}</p></div>
          <div><p className="text-[11px] text-muted-foreground">Account name</p><p className="font-bold">{a.account_name}</p></div>
          <div><p className="text-[11px] text-muted-foreground">Account number</p><p className="font-mono font-bold">{a.account_number}</p></div>
        </div>

        {a.status === "rejected" && a.rejection_reason && (
          <p className="text-xs text-muted-foreground">Rejected: {a.rejection_reason}</p>
        )}

        {a.status === "pending" && (
          <div className="space-y-2">
            {rejecting ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input className="h-9 min-w-[220px] flex-1" placeholder="Why is it not accepted? (shown to the supplier)" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
                <Button size="sm" variant="destructive" disabled={reject.isPending || reason.trim().length < 3} onClick={() => reject.mutate()} className="gap-1">
                  {reject.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Reject
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setRejecting(false); setReason(""); }}>Cancel</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" disabled={verify.isPending} onClick={() => verify.mutate()} className="gap-1">
                  {verify.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Verify
                </Button>
                <Button size="sm" variant="outline" onClick={() => setRejecting(true)} className="gap-1"><X className="h-3.5 w-3.5" /> Reject</Button>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="flex items-start gap-1 text-xs text-destructive" role="alert">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {errorText(error)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
