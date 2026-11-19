"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { B2BDash, type B2BPayoutAccountInput } from "@/modules/b2b-marketplace/api";
import { ACCOUNT_NUMBER_PATTERN } from "@/modules/b2b-marketplace/components/RefundDetailsFields";

const errorText = (e: unknown): string => {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message || err?.message || "Something went wrong";
};

const STATUS_COPY = {
  pending: { label: "Waiting for verification", variant: "secondary" as const },
  verified: { label: "Verified", variant: "default" as const },
  rejected: { label: "Rejected", variant: "destructive" as const },
};

/** Where the supplier is paid. Needs an admin's verification before any payout can be released. */
export function PayoutAccountCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["b2b", "myPayoutAccount"], queryFn: () => B2BDash.myPayoutAccount() });
  const account = q.data ?? null;

  // When Chapa is on, the supplier picks their bank or wallet from Chapa's list: that is what lets the marketplace pay them automatically.
  const banksQ = useQuery({ queryKey: ["b2b", "payoutBanks"], queryFn: () => B2BDash.payoutBanks(), staleTime: 5 * 60_000 });
  const banks = banksQ.data?.enabled ? banksQ.data.banks : [];
  // A supplier whose bank is not in Chapa's list can still register: they type it in, and the marketplace pays them by hand.
  const [manualEntry, setManualEntry] = useState(false);
  const useList = banks.length > 0 && !manualEntry;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<B2BPayoutAccountInput>({ method: "bank", bank_name: "", account_name: "", account_number: "", bank_code: null });

  const startEditing = () => {
    setForm({
      method: account?.method ?? "bank",
      bank_name: account?.bank_name ?? "",
      account_name: account?.account_name ?? "",
      account_number: "", // the full number is never sent back; it has to be typed again
      bank_code: account?.bank_code ?? null,
    });
    // An account saved without a Chapa bank is edited as typed, not forced into the list.
    setManualEntry(account ? account.bank_code == null : false);
    setEditing(true);
  };

  const save = useMutation({
    mutationFn: () =>
      B2BDash.savePayoutAccount({
        method: form.method,
        bank_name: form.bank_name.trim(),
        account_name: form.account_name.trim(),
        account_number: form.account_number.trim(),
        ...(useList && form.bank_code ? { bank_code: form.bank_code } : {}),
      }),
    onSuccess: () => {
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["b2b", "myPayoutAccount"] });
    },
  });

  const valid =
    (useList ? !!form.bank_code : form.bank_name.trim() !== "") &&
    form.account_name.trim() !== "" &&
    ACCOUNT_NUMBER_PATTERN.test(form.account_number.trim());
  const showForm = editing || (!q.isLoading && !account);

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-black">Payout account</h3>
          {account && <Badge variant={STATUS_COPY[account.status].variant} className="ml-auto">{STATUS_COPY[account.status].label}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          This is where the marketplace sends your money after an order is delivered and completed. The account name must match your
          verified company. An admin checks it before your first payout, and changing any detail sends it back for checking.
          {useList && " Choosing your bank from the list lets the marketplace pay you automatically."}
        </p>

        {q.isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : showForm ? (
          <div className="space-y-3">
            {useList ? (
              <>
              <Select
                value={form.bank_code ? String(form.bank_code) : ""}
                onValueChange={(v) => {
                  const bank = banks.find((b) => String(b.id) === v);
                  if (bank) setForm({ ...form, bank_code: bank.id, bank_name: bank.name, method: bank.is_mobile_money ? "wallet" : "bank" });
                }}
              >
                <SelectTrigger className="h-10"><SelectValue placeholder="Choose your bank or wallet *" /></SelectTrigger>
                <SelectContent>
                  {banks.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}{b.is_mobile_money ? " (wallet)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                className="text-xs font-semibold text-primary underline"
                onClick={() => {
                  setForm({ ...form, bank_code: null, bank_name: "", method: "bank" });
                  setManualEntry(true);
                }}
              >
                My bank or wallet isn&apos;t listed
              </button>
              </>
            ) : (
              <>
                {banks.length > 0 && (
                  <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    Type your bank details below. The marketplace will pay you by hand instead of automatically.{" "}
                    <button
                      type="button"
                      className="font-semibold text-primary underline"
                      onClick={() => {
                        setForm({ ...form, bank_code: null, bank_name: "" });
                        setManualEntry(false);
                      }}
                    >
                      Choose from the list instead
                    </button>
                  </p>
                )}
                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v as "bank" | "wallet" })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank account</SelectItem>
                    <SelectItem value="wallet">Mobile wallet</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder={form.method === "bank" ? "Bank name *" : "Wallet provider (e.g. Telebirr) *"}
                  value={form.bank_name} maxLength={120}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                />
              </>
            )}
            <Input placeholder="Account holder name *" value={form.account_name} maxLength={160} onChange={(e) => setForm({ ...form, account_name: e.target.value })} />
            <Input
              placeholder={form.method === "bank" ? "Account number *" : "Wallet number *"}
              value={form.account_number} maxLength={63} inputMode="numeric"
              onChange={(e) => setForm({ ...form, account_number: e.target.value })}
            />
            {form.account_number.trim() !== "" && !ACCOUNT_NUMBER_PATTERN.test(form.account_number.trim()) && (
              <p className="text-xs text-destructive">Use 4 to 63 letters, digits, spaces or dashes.</p>
            )}
            {save.isError && <p className="text-xs text-destructive" role="alert">{errorText(save.error)}</p>}
            <div className="flex gap-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending || !valid} className="gap-2">
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save for verification
              </Button>
              {account && <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
            </div>
          </div>
        ) : account ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-muted/40 px-4 py-3 text-sm">
              <p className="font-bold">{account.bank_name} <span className="font-normal text-muted-foreground">({account.method})</span></p>
              <p>{account.account_name}</p>
              <p className="text-muted-foreground">{account.account_number_masked}</p>
            </div>
            {account.status === "rejected" && account.rejection_reason && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Not accepted: {account.rejection_reason}
              </p>
            )}
            {account.status === "pending" && (
              <p className="text-xs text-muted-foreground">Payouts stay on hold until an admin verifies this account.</p>
            )}
            <Button variant="outline" onClick={startEditing}>Change details</Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
