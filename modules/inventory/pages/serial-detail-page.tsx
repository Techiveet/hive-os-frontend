"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowRightLeft, Barcode, Boxes, ChevronRight, Loader2, MapPin,
  PackageCheck, ScanLine, Truck,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/store/use-translation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import {
  fetchInventorySerial, fetchWarehouseLocations, transferInventorySerial,
} from "@/modules/inventory/api";
import { SerialStatusBadge } from "@/modules/inventory/pages/serials-page";

const ON_HAND_STATUSES = ["available", "quarantine", "damaged"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}

export default function SerialDetailPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const id = Number(params?.id);
  const { hasPermission, hasAnyPermission } = usePermissions();
  const canView = hasAnyPermission(["view_inventory", "manage_inventory"]);
  const canTransfer = hasPermission("manage_inventory");

  const [transferOpen, setTransferOpen] = React.useState(false);
  const [destination, setDestination] = React.useState<string>("");

  const serialQuery = useQuery({
    queryKey: ["inventory", "serial", id],
    enabled: canView && Number.isFinite(id),
    queryFn: () => fetchInventorySerial(id),
  });

  const serial = serialQuery.data;
  const transferable = !!serial && ON_HAND_STATUSES.includes(serial.status) && serial.warehouse_location_id != null;

  const locationsQuery = useQuery({
    queryKey: ["warehouse", "locations", "for-transfer"],
    enabled: transferOpen && canTransfer,
    queryFn: () => fetchWarehouseLocations(),
  });

  const transferMutation = useMutation({
    mutationFn: () => transferInventorySerial(id, { to_location_id: Number(destination) }),
    onSuccess: () => {
      toast.success(t("inventory.serials.transfer_success", "Serial transferred."));
      setTransferOpen(false);
      setDestination("");
      queryClient.invalidateQueries({ queryKey: ["inventory", "serial", id] });
      queryClient.invalidateQueries({ queryKey: ["inventory", "serials"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? t("inventory.common.failed", "Transfer failed."));
    },
  });

  if (serialQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (serialQuery.isError || !serial) {
    return (
      <Card className="mx-auto mt-10 max-w-lg rounded-3xl border-border/60 p-8 text-center">
        <ScanLine className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h2 className="text-lg font-bold">{t("inventory.serials.detail_not_found", "Serial not found")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("inventory.serials.detail_not_found_desc", "This serial does not exist or is not in your tenant.")}
        </p>
        <Button asChild variant="outline" className="mt-4 rounded-full">
          <Link href="/dashboard/inventory/serials">{t("inventory.serials.back", "Back to serials")}</Link>
        </Button>
      </Card>
    );
  }

  const destinations = (locationsQuery.data ?? []).filter((l) => l.id !== serial.warehouse_location_id);

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/dashboard/inventory" className="hover:underline">{t("inventory.nav.inventory", "Inventory")}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/dashboard/inventory/serials" className="hover:underline">{t("inventory.serials.title", "Serial Numbers")}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-mono font-medium text-foreground">{serial.serial_number}</span>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-3">
            <Barcode className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-mono text-2xl font-black tracking-tight">{serial.serial_number}</h1>
            <div className="mt-1 flex items-center gap-2">
              <SerialStatusBadge status={serial.status} />
              {serial.good?.sku ? (
                <span className="font-mono text-xs text-muted-foreground">{serial.good.sku}</span>
              ) : null}
            </div>
          </div>
        </div>
        {canTransfer ? (
          <Button
            className="rounded-full px-5"
            disabled={!transferable}
            onClick={() => setTransferOpen(true)}
            title={
              transferable
                ? undefined
                : t("inventory.serials.transfer_unavailable", "Only on-hand serials with a location can be transferred.")
            }
          >
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            {t("inventory.serials.transfer_btn", "Transfer")}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl border-border/60 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <Boxes className="h-4 w-4" /> {t("inventory.serials.identity", "Identity")}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("inventory.common.good", "Good")}>
              {serial.good ? (
                <Link href={`/dashboard/inventory/catalog/goods/${serial.good.id}`} className="hover:underline">
                  {serial.good.name}
                </Link>
              ) : "—"}
            </Field>
            <Field label={t("inventory.common.sku", "SKU")}>
              <span className="font-mono">{serial.good?.sku ?? "—"}</span>
            </Field>
            <Field label={t("inventory.common.batch", "Batch")}>
              <span className="font-mono">{serial.batch?.batch_number ?? "—"}</span>
            </Field>
            <Field label={t("inventory.common.expiry", "Expiry")}>
              {serial.batch?.expiry_date ? format(new Date(serial.batch.expiry_date), "PP") : "—"}
            </Field>
            <Field label={t("inventory.common.location", "Location")}>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {serial.location?.code ?? "—"}
              </span>
            </Field>
            <Field label={t("inventory.common.status", "Status")}>
              <SerialStatusBadge status={serial.status} />
            </Field>
          </div>
        </Card>

        <Card className="rounded-3xl border-border/60 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <Truck className="h-4 w-4" /> {t("inventory.serials.traceability", "Traceability")}
          </h2>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <div className="mt-0.5 rounded-full bg-emerald-500/15 p-1.5">
                <PackageCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t("inventory.serials.event_received", "Received")}</p>
                <p className="text-xs text-muted-foreground">
                  {serial.received_at ? format(new Date(serial.received_at), "PPp") : "—"}
                  {serial.source_type ? ` · ${serial.source_type.split("\\").pop()} #${serial.source_id ?? ""}` : ""}
                </p>
              </div>
            </li>
            {serial.status === "issued" && serial.issued_reference_type ? (
              <li className="flex gap-3">
                <div className="mt-0.5 rounded-full bg-sky-500/15 p-1.5">
                  <Truck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{t("inventory.serials.event_issued", "Issued")}</p>
                  <p className="text-xs text-muted-foreground">
                    {serial.issued_reference_type.split("\\").pop()} #{serial.issued_reference_id ?? ""}
                  </p>
                </div>
              </li>
            ) : null}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            {t("inventory.serials.trace_note", "Events reflect the canonical stock ledger. Issue happens through Sales delivery.")}
          </p>
        </Card>
      </div>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>{t("inventory.serials.transfer_title", "Transfer Serial")}</DialogTitle>
            <DialogDescription>
              {t("inventory.serials.transfer_desc", "Move this serialized unit to another location. Stock and identity move together.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-muted/40 p-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">{t("inventory.serials.from_location", "From")}</p>
                <p className="font-medium">{serial.location?.code ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("inventory.common.good", "Good")}</p>
                <p className="truncate font-medium">{serial.good?.name ?? "—"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">{t("inventory.serials.to_location", "Destination location")}</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger id="destination" className="rounded-xl">
                  <SelectValue
                    placeholder={
                      locationsQuery.isLoading
                        ? t("inventory.common.loading", "Loading…")
                        : t("inventory.serials.select_destination", "Select destination")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {destinations.map((loc) => (
                    <SelectItem key={loc.id} value={String(loc.id)}>
                      {loc.code}
                      {loc.name ? ` — ${loc.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!locationsQuery.isLoading && destinations.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t("inventory.serials.no_destinations", "No other locations available.")}
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setTransferOpen(false)}>
              {t("inventory.common.cancel", "Cancel")}
            </Button>
            <Button
              className="rounded-full"
              disabled={!destination || transferMutation.isPending}
              onClick={() => transferMutation.mutate()}
            >
              {transferMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("inventory.serials.confirm_transfer", "Confirm Transfer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
