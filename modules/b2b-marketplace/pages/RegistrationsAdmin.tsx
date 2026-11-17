"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Loader2, Mail, ShoppingBag, Store, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { B2BDash, type B2BRegistration } from "@/modules/b2b-marketplace/api";

export default function RegistrationsAdmin() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["b2b", "registrations"], queryFn: () => B2BDash.registrations() });
  const requests = q.data ?? [];
  const pending = requests.filter((r) => r.status === "pending");

  const [error, setError] = React.useState<string | null>(null);
  const done = () => { setError(null); qc.invalidateQueries({ queryKey: ["b2b", "registrations"] }); };
  const onError = (e: unknown) => {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    setError(err?.response?.data?.message || err?.message || "Something went wrong");
  };

  const act = useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: "approve" | "reject"; reason?: string }) =>
      action === "approve" ? B2BDash.approveRegistration(id) : B2BDash.rejectRegistration(id, reason),
    onSuccess: done,
    onError,
  });
  const resend = useMutation({
    mutationFn: (id: number) => B2BDash.resendRegistrationVerification(id),
    onSuccess: done,
    onError,
  });

  const onReject = (r: B2BRegistration) => {
    const reason = window.prompt(`Reject ${r.name}? Optionally tell them why (included in the email).`, "");
    if (reason !== null) act.mutate({ id: r.id, action: "reject", reason: reason.trim() || undefined });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserCheck className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-black">Account approvals</h3>
        {pending.length > 0 && (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0">{pending.length} pending</Badge>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {q.isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : requests.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No registration requests yet. New buyers and suppliers who sign up on the storefront will appear here for approval.</CardContent></Card>
      ) : (
        requests.map((r: B2BRegistration) => (
          <Card key={r.id}>
            <CardContent className="flex flex-wrap items-center gap-3 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {r.requested_role === "seller" ? <Store className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-[180px]">
                <p className="text-sm font-bold">{r.name} <span className="font-normal text-muted-foreground">· {r.email}</span></p>
                <p className="text-xs text-muted-foreground">
                  {r.company ? `${r.company} · ` : ""}wants a <b className="capitalize">{r.requested_role}</b> account · {new Date(r.created_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[r.country, r.phone, r.website, r.tax_id ? `Tax ID ${r.tax_id}` : null].filter(Boolean).join(" · ")}
                </p>
                {r.status === "rejected" && r.rejection_reason && (
                  <p className="text-xs text-destructive">Reason: {r.rejection_reason}</p>
                )}
              </div>
              <Badge
                variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}
                className="capitalize"
              >
                {r.status}
              </Badge>
              {r.status !== "approved" && (
                <Badge variant={r.email_verified ? "outline" : "secondary"} className="gap-1">
                  <Mail className="h-3 w-3" /> {r.email_verified ? "email verified" : "email not verified"}
                </Badge>
              )}
              {r.status === "pending" && (
                <div className="flex gap-1.5">
                  {!r.email_verified && (
                    <Button size="sm" variant="ghost" disabled={resend.isPending} onClick={() => resend.mutate(r.id)}>
                      Resend email
                    </Button>
                  )}
                  <Button
                    size="sm" disabled={act.isPending || !r.email_verified}
                    title={r.email_verified ? undefined : "The applicant must confirm their email first"}
                    onClick={() => act.mutate({ id: r.id, action: "approve" })} className="gap-1"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => onReject(r)} className="gap-1">
                    <X className="h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
