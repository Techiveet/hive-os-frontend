"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Lock, Scale } from "lucide-react";
import { useTranslation } from "@/store/use-translation";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import {
  fetchReconciliationCogs, fetchReconciliationGrni, fetchReconciliationInventoryGl,
  fetchReconciliationOrphans, fetchReconciliationPpv,
} from "@/modules/inventory/api";
import type { ReconciliationResult } from "@/modules/inventory/operations-types";

function ReconcileCard({
  title,
  description,
  result,
  loading,
}: {
  title: string;
  description: string;
  result?: ReconciliationResult;
  loading: boolean;
}) {
  const { t } = useTranslation();
  if (loading || !result) {
    return <Skeleton className="h-44 w-full rounded-3xl" />;
  }
  const reconciled = result.reconciled;
  const outstandingOk = result.outstanding_is_expected;
  return (
    <Card className="rounded-3xl border-border/60 p-6">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "rounded-full",
            reconciled || outstandingOk
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              : "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
          )}
        >
          {reconciled
            ? t("inventory.recon.reconciled", "Reconciled")
            : outstandingOk
              ? t("inventory.recon.expected", "Outstanding (expected)")
              : t("inventory.recon.mismatch", "Mismatch")}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{t("inventory.recon.subledger", "Subledger")}</p>
          <p className="font-mono text-lg font-semibold">{result.subledger_balance}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("inventory.recon.gl", "GL")}</p>
          <p className="font-mono text-lg font-semibold">{result.gl_balance}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("inventory.recon.difference", "Difference")}</p>
          <p className={cn("font-mono text-lg font-semibold", Number(result.difference) === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
            {result.difference}
          </p>
        </div>
      </div>
      {result.account_code ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("inventory.recon.account", "Account")}: <span className="font-mono">{result.account_code}</span>
        </p>
      ) : null}
      {result.note ? (
        <p className="mt-2 rounded-2xl bg-muted/40 p-3 text-xs text-muted-foreground">{result.note}</p>
      ) : null}
    </Card>
  );
}

export default function ReconciliationPage() {
  const { t } = useTranslation();
  const { hasPermission, isLoaded } = usePermissions();
  const canView = hasPermission("view_finance");

  const invGl = useQuery({ queryKey: ["inventory", "recon", "inventory-gl"], enabled: canView, queryFn: fetchReconciliationInventoryGl });
  const cogs = useQuery({ queryKey: ["inventory", "recon", "cogs"], enabled: canView, queryFn: fetchReconciliationCogs });
  const grni = useQuery({ queryKey: ["inventory", "recon", "grni"], enabled: canView, queryFn: fetchReconciliationGrni });
  const ppv = useQuery({ queryKey: ["inventory", "recon", "ppv"], enabled: canView, queryFn: fetchReconciliationPpv });
  const orphans = useQuery({ queryKey: ["inventory", "recon", "orphans"], enabled: canView, queryFn: fetchReconciliationOrphans });

  if (isLoaded && !canView) {
    return (
      <Card className="mx-auto mt-10 max-w-lg rounded-3xl border-border/60 p-8 text-center">
        <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h2 className="text-lg font-bold">{t("inventory.recon.no_access_title", "Finance access required")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("inventory.recon.no_access", "Inventory ↔ GL reconciliation is restricted to finance users.")}
        </p>
      </Card>
    );
  }

  const orphanData = orphans.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight">
          <Scale className="h-7 w-7 text-primary" />
          {t("inventory.recon.title", "Inventory ↔ GL Reconciliation")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("inventory.recon.subtitle", "Every figure is computed server-side from the subledger and general ledger.")}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReconcileCard
          title={t("inventory.recon.inventory_asset", "Inventory Asset")}
          description={t("inventory.recon.inventory_asset_desc", "Valuation subledger vs Inventory Asset GL account.")}
          result={invGl.data}
          loading={invGl.isLoading}
        />
        <ReconcileCard
          title={t("inventory.recon.cogs", "COGS")}
          description={t("inventory.recon.cogs_desc", "Cumulative issue valuation vs COGS GL account.")}
          result={cogs.data}
          loading={cogs.isLoading}
        />
        <ReconcileCard
          title={t("inventory.recon.grni", "GRNI")}
          description={t("inventory.recon.grni_desc", "Goods received not invoiced. Vendor-bill clearing is not yet built, so a balance is expected.")}
          result={grni.data}
          loading={grni.isLoading}
        />
        <ReconcileCard
          title={t("inventory.recon.ppv", "Purchase Price Variance")}
          description={t("inventory.recon.ppv_desc", "Standard-cost variance subledger vs PPV GL account.")}
          result={ppv.data}
          loading={ppv.isLoading}
        />
      </div>

      <Card className="rounded-3xl border-border/60 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {orphanData?.healthy ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            )}
            {t("inventory.recon.orphans", "Orphan & Anomaly Checks")}
          </h3>
          {orphanData ? (
            <Badge
              variant="outline"
              className={cn(
                "rounded-full",
                orphanData.healthy
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
              )}
            >
              {orphanData.healthy ? t("inventory.recon.healthy", "Healthy") : t("inventory.recon.anomalies", "{n} anomalies", { n: orphanData.total_anomalies })}
            </Badge>
          ) : null}
        </div>
        {orphans.isLoading || !orphanData ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { key: "valuation_without_journal", label: t("inventory.recon.val_no_journal", "Valuation w/o journal"), value: orphanData.valuation_without_journal },
              { key: "journal_without_valuation", label: t("inventory.recon.journal_no_val", "Journal w/o valuation"), value: orphanData.journal_without_valuation },
              { key: "duplicate_valuation_per_movement", label: t("inventory.recon.duplicates", "Duplicate postings"), value: orphanData.duplicate_valuation_per_movement },
              { key: "unbalanced_journals", label: t("inventory.recon.unbalanced", "Unbalanced journals"), value: orphanData.unbalanced_journals },
            ].map((item) => (
              <div key={item.key} className="rounded-2xl bg-muted/30 p-4 text-center">
                <p className={cn("text-2xl font-black", item.value === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
