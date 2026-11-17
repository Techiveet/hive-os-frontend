"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import type { B2BRefundDetailsInput } from "@/modules/b2b-marketplace/api";

export type RefundDetailsForm = { bank: string; name: string; number: string };

export const EMPTY_REFUND_DETAILS: RefundDetailsForm = { bank: "", name: "", number: "" };

/** Same rule as the server: 4 to 63 letters, digits, spaces or dashes. */
export const ACCOUNT_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\- ]{3,62}$/;

export const refundFormValid = (f: RefundDetailsForm): boolean =>
  f.bank.trim() !== "" && f.name.trim() !== "" && ACCOUNT_NUMBER_PATTERN.test(f.number.trim());

export const toRefundPayload = (f: RefundDetailsForm): B2BRefundDetailsInput => ({
  refund_bank_name: f.bank.trim(),
  refund_account_name: f.name.trim(),
  refund_account_number: f.number.trim(),
});

/** Where a refund should be sent if the order is ever refunded outside a card payment. */
export function RefundDetailsFields({
  value,
  onChange,
  disabled,
}: {
  value: RefundDetailsForm;
  onChange: (next: RefundDetailsForm) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Input
        placeholder="Bank or wallet (e.g. Commercial Bank of Ethiopia, Telebirr)"
        value={value.bank}
        maxLength={120}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, bank: e.target.value })}
      />
      <Input
        placeholder="Account holder name"
        value={value.name}
        maxLength={160}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
      />
      <Input
        placeholder="Account or wallet number"
        value={value.number}
        maxLength={63}
        inputMode="numeric"
        disabled={disabled}
        onChange={(e) => onChange({ ...value, number: e.target.value })}
      />
      {value.number.trim() !== "" && !ACCOUNT_NUMBER_PATTERN.test(value.number.trim()) && (
        <p className="text-[11px] text-destructive">Use 4 to 63 letters, digits, spaces or dashes.</p>
      )}
    </div>
  );
}
