"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Link2, Loader2, Lock, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/store/use-translation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import {
  fetchAccountMappingStatus, fetchAccountOptions, updateAccountMapping,
} from "@/modules/inventory/api";
import type { AccountMappingStatus, InventoryAccountEvent } from "@/modules/inventory/operations-types";

function StatusPill({ status }: { status: AccountMappingStatus["status"] }) {
  const { t } = useTranslation();
  const map = {
    configured: { label: t("inventory.mapping.status_configured", "Configured"), cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
    system_default: { label: t("inventory.mapping.status_default", "System default"), cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30" },
    invalid: { label: t("inventory.mapping.status_invalid", "Invalid"), cls: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
  } as const;
  const m = map[status];
  return <Badge variant="outline" className={cn("rounded-full", m.cls)}>{m.label}</Badge>;
}

function MappingRow({ row, canManage }: { row: AccountMappingStatus; canManage: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [value, setValue] = React.useState<string>(row.effective_account_id ? String(row.effective_account_id) : "");

  const optionsQuery = useQuery({
    queryKey: ["inventory", "account-options"],
    enabled: canManage,
    queryFn: () => fetchAccountOptions(),
  });

  const saveMutation = useMutation({
    mutationFn: () => updateAccountMapping(row.event as InventoryAccountEvent, { account_id: Number(value) }),
    onSuccess: () => {
      toast.success(t("inventory.mapping.saved", "Account mapping updated."));
      queryClient.invalidateQueries({ queryKey: ["inventory", "account-mapping-status"] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? t("inventory.common.failed", "Failed to update mapping.")),
  });

  const dirty = value && value !== String(row.effective_account_id ?? "");

  return (
    <Card className="rounded-3xl border-border/60 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{row.label}</p>
            <StatusPill status={row.status} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("inventory.mapping.side", "Posting side")}: <span className="capitalize">{row.side}</span>
            {" · "}
            {t("inventory.mapping.default_code", "Default")}: <span className="font-mono">{row.default_code}</span>
            {row.effective_account_code ? <> {" · "}{t("inventory.mapping.effective", "Effective")}: <span className="font-mono">{row.effective_account_code}</span></> : null}
          </p>
        </div>
        {canManage ? (
          <div className="flex items-center gap-2">
            <Select value={value} onValueChange={setValue}>
              <SelectTrigger className="w-[240px] rounded-full">
                <SelectValue placeholder={optionsQuery.isLoading ? t("inventory.common.loading", "Loading…") : t("inventory.mapping.select_account", "Select account")} />
              </SelectTrigger>
              <SelectContent>
                {(optionsQuery.data ?? []).map((acc) => (
                  <SelectItem key={acc.id} value={String(acc.id)}>
                    <span className="font-mono">{acc.code}</span> — {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="rounded-full" disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("inventory.common.save", "Save")}
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export default function AccountMappingPage() {
  const { t } = useTranslation();
  const { hasPermission, hasAnyPermission, isLoaded } = usePermissions();
  const canView = hasPermission("view_finance");
  const canManage = hasAnyPermission(["manage_finance_integrations", "manage_finance"]);

  const statusQuery = useQuery({
    queryKey: ["inventory", "account-mapping-status"],
    enabled: canView,
    queryFn: () => fetchAccountMappingStatus(),
  });

  if (isLoaded && !canView) {
    return (
      <Card className="mx-auto mt-10 max-w-lg rounded-3xl border-border/60 p-8 text-center">
        <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h2 className="text-lg font-bold">{t("inventory.mapping.no_access_title", "Finance access required")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("inventory.mapping.no_access", "Inventory account mapping is restricted to finance users.")}
        </p>
      </Card>
    );
  }

  const rows = statusQuery.data ?? [];
  const hasInvalid = rows.some((r) => r.status === "invalid");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight">
          <Link2 className="h-7 w-7 text-primary" />
          {t("inventory.mapping.title", "Inventory Account Mapping")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("inventory.mapping.subtitle", "Map each inventory posting event to a ledger account. Unmapped events use the canonical system default.")}
        </p>
      </div>

      {hasInvalid ? (
        <Card className="flex items-start gap-3 rounded-3xl border-red-500/30 bg-red-500/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
          <div>
            <p className="font-semibold text-red-600 dark:text-red-400">{t("inventory.mapping.invalid_title", "One or more mappings are invalid")}</p>
            <p className="text-sm text-muted-foreground">
              {t("inventory.mapping.invalid_desc", "A configured account could not be resolved for this tenant — inventory posting will fail closed until corrected.")}
            </p>
          </div>
        </Card>
      ) : (
        <Card className="flex items-center gap-2 rounded-3xl border-emerald-500/30 bg-emerald-500/5 p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm text-muted-foreground">{t("inventory.mapping.all_ok", "All required inventory posting events resolve to a valid account.")}</p>
        </Card>
      )}

      {statusQuery.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 w-full rounded-3xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <MappingRow key={row.event} row={row} canManage={canManage} />
          ))}
        </div>
      )}

      {!canManage ? (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Settings2 className="h-3.5 w-3.5" />
          {t("inventory.mapping.readonly", "You can view mappings. Editing requires finance integration management permission.")}
        </p>
      ) : null}
    </div>
  );
}
