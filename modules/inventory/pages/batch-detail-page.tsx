"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarClock, ChevronRight, Layers, MapPin, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/store/use-translation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import { fetchInventoryBatch } from "@/modules/inventory/api";
import { BatchStatusBadge, ExpiryBadge } from "@/modules/inventory/pages/batches-page";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}

export default function BatchDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const id = Number(params?.id);
  const { hasAnyPermission } = usePermissions();
  const canView = hasAnyPermission(["view_inventory", "manage_inventory"]);

  const batchQuery = useQuery({
    queryKey: ["inventory", "batch", id],
    enabled: canView && Number.isFinite(id),
    queryFn: () => fetchInventoryBatch(id),
  });

  const batch = batchQuery.data;

  if (batchQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (batchQuery.isError || !batch) {
    return (
      <Card className="mx-auto mt-10 max-w-lg rounded-3xl border-border/60 p-8 text-center">
        <Layers className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h2 className="text-lg font-bold">{t("inventory.batches.detail_not_found", "Batch not found")}</h2>
        <Button asChild variant="outline" className="mt-4 rounded-full">
          <Link href="/dashboard/inventory/batches">{t("inventory.batches.back", "Back to batches")}</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/dashboard/inventory" className="hover:underline">{t("inventory.nav.inventory", "Inventory")}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/dashboard/inventory/batches" className="hover:underline">{t("inventory.batches.title", "Batches & Expiry")}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-mono font-medium text-foreground">{batch.batch_number}</span>
      </nav>

      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-primary/10 p-3">
          <Layers className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="font-mono text-2xl font-black tracking-tight">{batch.batch_number}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <BatchStatusBadge status={batch.status} />
            <ExpiryBadge batch={batch} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl border-border/60 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <Layers className="h-4 w-4" /> {t("inventory.batches.identity", "Lot Identity")}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("inventory.common.good", "Good")}>
              {batch.good ? (
                <Link href={`/dashboard/inventory/catalog/goods/${batch.good.id}`} className="hover:underline">
                  {batch.good.name}
                </Link>
              ) : "—"}
            </Field>
            <Field label={t("inventory.common.sku", "SKU")}><span className="font-mono">{batch.good?.sku ?? "—"}</span></Field>
            <Field label={t("inventory.batches.supplier_batch", "Supplier Lot")}>{batch.supplier_batch_number ?? "—"}</Field>
            <Field label={t("inventory.batches.col_qa", "QA Status")}><span className="capitalize">{batch.qa_status ?? "—"}</span></Field>
            <Field label={t("inventory.batches.received_date", "Received")}>
              {batch.received_date ? format(new Date(batch.received_date), "PP") : "—"}
            </Field>
            <Field label={t("inventory.batches.manufacture_date", "Manufactured")}>
              {batch.manufacture_date ? format(new Date(batch.manufacture_date), "PP") : "—"}
            </Field>
            <Field label={t("inventory.common.location", "Location")}>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {batch.warehouse_location_id ?? "—"}
              </span>
            </Field>
            <Field label={t("inventory.common.expiry", "Expiry")}>
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                {batch.expiry_date ? format(new Date(batch.expiry_date), "PP") : t("inventory.batches.non_expiring", "Non-expiring")}
              </span>
            </Field>
          </div>
        </Card>

        <Card className="rounded-3xl border-border/60 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> {t("inventory.batches.quantities", "Quantities")}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("inventory.batches.physical", "Physical on hand")}>
              <span className="font-mono text-lg">{batch.quantity_on_hand ?? "0"}</span>
            </Field>
            <Field label={t("inventory.common.reserved", "Reserved")}>
              <span className="font-mono text-lg">{batch.quantity_reserved ?? "0"}</span>
            </Field>
            <Field label={t("inventory.batches.received_qty", "Received")}>
              <span className="font-mono">{batch.quantity_received ?? "0"}</span>
            </Field>
            <Field label={t("inventory.batches.sellable", "Sellable")}>
              {batch.sellable_eligible === false ? (
                <span className="text-amber-600 dark:text-amber-400">
                  {t("inventory.batches.not_eligible", "Not sales-eligible")}
                </span>
              ) : (
                <span className="font-mono text-lg">{batch.sellable_quantity ?? "—"}</span>
              )}
            </Field>
          </div>
          <p className="mt-4 rounded-2xl bg-muted/40 p-3 text-xs text-muted-foreground">
            {t("inventory.batches.readonly_note", "Lot metadata is maintained through goods receipt. Sales eligibility (expiry / QA / quarantine) is enforced by the backend.")}
          </p>
        </Card>
      </div>
    </div>
  );
}
