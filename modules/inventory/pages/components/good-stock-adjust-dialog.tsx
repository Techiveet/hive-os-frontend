"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, Check, Loader2, PackagePlus, Sliders } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adjustInventoryGoodStock,
  fetchInventoryGood,
  fetchInventoryGoodOptions,
  transferInventoryGoodLocation,
} from "@/modules/inventory/api/goods";
import type { GoodRecord, GoodStockLocationRecord } from "@/modules/inventory/types";

type LocationOption = {
  id: number;
  name: string;
  code?: string | null;
  warehouse_id?: number | null;
};

type FromStockOption = {
  key: string;
  location_id: number;
  batch_number: string | null;
  on_hand: number;
  label: string;
};

type Props = {
  open: boolean;
  good: GoodRecord | null;
  locations?: LocationOption[];
  stockLocations?: GoodStockLocationRecord[];
  onClose: () => void;
  onSuccess?: () => void;
  defaultTab?: "adjust" | "transfer";
  initialTab?: "adjust" | "transfer";
};

function isSelectPortalTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest('[data-slot="select-content"]') ||
      target.closest("[data-radix-select-content]") ||
      target.closest("[data-radix-popper-content-wrapper]")
  );
}

function stockLineKey(locationId: number, batch: string | null | undefined) {
  return `${locationId}::${batch?.trim() || ""}`;
}

export function GoodStockAdjustDialog({
  open,
  good,
  locations = [],
  stockLocations = [],
  onClose,
  onSuccess,
  defaultTab = "adjust",
  initialTab,
}: Props) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<"adjust" | "transfer">(initialTab || defaultTab);
  const sessionKeyRef = React.useRef<string | null>(null);

  const { data: optionsData, isLoading: loadingLocations } = useQuery({
    queryKey: ["inventory", "goods", "options"],
    queryFn: fetchInventoryGoodOptions,
    enabled: open,
    staleTime: 60_000,
  });

  const { data: detailData, isLoading: loadingStockLines } = useQuery({
    queryKey: ["inventory", "goods", "detail", good?.id, "stock-dialog"],
    queryFn: () => fetchInventoryGood(good!.id),
    enabled: open && Boolean(good?.id),
    staleTime: 15_000,
  });

  const resolvedLocations = React.useMemo<LocationOption[]>(() => {
    if (locations.length > 0) return locations;
    return optionsData?.locations ?? [];
  }, [locations, optionsData?.locations]);

  const resolvedStockLocations = React.useMemo<GoodStockLocationRecord[]>(() => {
    if ((detailData?.stocks_by_location?.length ?? 0) > 0) {
      return detailData!.stocks_by_location;
    }
    return stockLocations;
  }, [detailData?.stocks_by_location, stockLocations]);

  const fromStockOptions = React.useMemo<FromStockOption[]>(() => {
    return resolvedStockLocations
      .filter((s) => Number(s.on_hand) > 0)
      .map((s) => {
        const batch = s.batch_number?.trim() || null;
        const locCode = s.location_code ? `[${s.location_code}] ` : "";
        const lot = batch ? ` · Lot ${batch}` : "";
        return {
          key: stockLineKey(s.location_id, batch),
          location_id: s.location_id,
          batch_number: batch,
          on_hand: Number(s.on_hand),
          label: `${locCode}${s.location_name}${lot} (${Number(s.on_hand).toLocaleString()} on hand)`,
        };
      });
  }, [resolvedStockLocations]);

  // Adjust State
  const [mode, setMode] = React.useState<"add" | "deduct" | "set">("add");
  const [quantity, setQuantity] = React.useState<string>("");
  const [locationId, setLocationId] = React.useState<string>("");
  const [batchNumber, setBatchNumber] = React.useState<string>("");
  const [expiryDate, setExpiryDate] = React.useState<string>("");
  const [reason, setReason] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");

  // Transfer State
  const [fromStockKey, setFromStockKey] = React.useState<string>("");
  const [toLocationId, setToLocationId] = React.useState<string>("");
  const [transferQuantity, setTransferQuantity] = React.useState<string>("");
  const [transferNotes, setTransferNotes] = React.useState<string>("");

  const selectedFromStock = React.useMemo(
    () => fromStockOptions.find((o) => o.key === fromStockKey) ?? null,
    [fromStockOptions, fromStockKey]
  );

  // Reset form only when a new open session starts — never on tab switches.
  React.useEffect(() => {
    if (!open || !good) {
      sessionKeyRef.current = null;
      return;
    }

    const tab = initialTab || defaultTab;
    const sessionKey = `${good.id}:${tab}`;
    if (sessionKeyRef.current === sessionKey) return;
    sessionKeyRef.current = sessionKey;

    setActiveTab(tab);
    setMode("add");
    setQuantity("");
    setLocationId(good.default_location_id ? String(good.default_location_id) : "");
    setBatchNumber("");
    setExpiryDate("");
    setReason("");
    setNotes("");
    setTransferQuantity("");
    setTransferNotes("");
    setToLocationId("");
    setFromStockKey("");
  }, [open, good, initialTab, defaultTab]);

  // Once stock lines load, default From to the first bin that actually has stock.
  React.useEffect(() => {
    if (!open || fromStockKey || fromStockOptions.length === 0) return;
    setFromStockKey(fromStockOptions[0].key);
  }, [open, fromStockKey, fromStockOptions]);

  const adjustMutation = useMutation({
    mutationFn: () => {
      if (!good) throw new Error("No good selected");
      const qty = Number(quantity);
      if (isNaN(qty) || qty <= 0) throw new Error("Please enter a valid quantity");
      if (!locationId) throw new Error("Please select a warehouse location");

      return adjustInventoryGoodStock(good.id, {
        mode,
        quantity: qty,
        warehouse_location_id: Number(locationId),
        batch_number: batchNumber || undefined,
        expiry_date: expiryDate || undefined,
        reason: reason || undefined,
        notes: notes || undefined,
        idempotency_key: crypto.randomUUID(),
      });
    },
    onSuccess: (data) => {
      toast.success(data.message || "Stock adjusted successfully");
      queryClient.invalidateQueries({ queryKey: ["inventory", "goods"] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to adjust stock");
    },
  });

  const transferMutation = useMutation({
    mutationFn: () => {
      if (!good) throw new Error("No good selected");
      if (!selectedFromStock) throw new Error("Please select a source stock location");
      const to = Number(toLocationId);
      const qty = Number(transferQuantity);

      if (!to) throw new Error("Please select a destination location");
      if (selectedFromStock.location_id === to) {
        throw new Error("Source and destination must be different");
      }
      if (isNaN(qty) || qty <= 0) throw new Error("Please enter a valid transfer quantity");
      if (qty > selectedFromStock.on_hand) {
        throw new Error(`Only ${selectedFromStock.on_hand} available at the selected source`);
      }

      return transferInventoryGoodLocation(good.id, {
        from_location_id: selectedFromStock.location_id,
        to_location_id: to,
        quantity: qty,
        batch_number: selectedFromStock.batch_number || undefined,
        notes: transferNotes || undefined,
        idempotency_key: crypto.randomUUID(),
      });
    },
    onSuccess: (data) => {
      toast.success(data.message || "Stock transferred successfully");
      queryClient.invalidateQueries({ queryKey: ["inventory", "goods"] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      const errors = err?.response?.data?.errors;
      const firstFieldError =
        errors && typeof errors === "object"
          ? (Object.values(errors).flat()[0] as string | undefined)
          : undefined;
      toast.error(
        firstFieldError || err?.response?.data?.message || err?.message || "Failed to transfer stock"
      );
    },
  });

  const locationLabel = (loc: LocationOption) =>
    `${loc.code ? `[${loc.code}] ` : ""}${loc.name}`;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="max-w-lg rounded-3xl border border-border/60 bg-background/95 p-6 backdrop-blur-xl"
        onPointerDownOutside={(event) => {
          if (isSelectPortalTarget(event.target)) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (isSelectPortalTarget(event.target)) event.preventDefault();
        }}
        onFocusOutside={(event) => {
          if (isSelectPortalTarget(event.target)) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
            {activeTab === "adjust" ? (
              <>
                <Sliders className="h-5 w-5 text-primary" />
                Adjust Stock: {good?.name ?? "—"}
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                Transfer Stock: {good?.name ?? "—"}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            SKU: <span className="font-mono font-semibold">{good?.sku ?? "—"}</span> | Current Stock:{" "}
            <span className="font-semibold text-foreground">
              {Number(good?.quantity_on_hand ?? 0).toLocaleString()} {good?.uom ?? ""}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "adjust" | "transfer")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted/50 p-1">
            <TabsTrigger value="adjust" className="rounded-xl">
              <PackagePlus className="mr-2 h-4 w-4" />
              Adjust Stock
            </TabsTrigger>
            <TabsTrigger value="transfer" className="rounded-xl">
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Location Transfer
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {!good ? null : activeTab === "adjust" ? (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode("add")}
                className={`rounded-2xl border p-2.5 text-center text-xs font-bold transition-all ${
                  mode === "add"
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                }`}
              >
                + Add (Receive)
              </button>
              <button
                type="button"
                onClick={() => setMode("deduct")}
                className={`rounded-2xl border p-2.5 text-center text-xs font-bold transition-all ${
                  mode === "deduct"
                    ? "border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                }`}
              >
                - Deduct (Issue)
              </button>
              <button
                type="button"
                onClick={() => setMode("set")}
                className={`rounded-2xl border p-2.5 text-center text-xs font-bold transition-all ${
                  mode === "set"
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                }`}
              >
                Set Total (Count)
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Quantity ({good.uom})
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Warehouse Location
                </Label>
                <Select value={locationId || undefined} onValueChange={setLocationId}>
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue
                      placeholder={loadingLocations ? "Loading locations…" : "Select location"}
                    />
                  </SelectTrigger>
                  <SelectContent position="popper" className="rounded-xl z-[60]">
                    {resolvedLocations.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        No warehouse locations available.
                      </div>
                    ) : (
                      resolvedLocations.map((loc) => (
                        <SelectItem key={loc.id} value={String(loc.id)}>
                          {locationLabel(loc)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {good.track_batches && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Batch / Lot Number
                  </Label>
                  <Input
                    placeholder="e.g. LOT-2026-001"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Expiration Date
                  </Label>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Adjustment Reason
              </Label>
              <Input
                placeholder="e.g. Receiving delivery, scrap damage, inventory physical cycle count..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Notes & Audit Details
              </Label>
              <Textarea
                placeholder="Additional audit trail comments..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={onClose} className="rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={() => adjustMutation.mutate()}
                disabled={adjustMutation.isPending || !quantity || !locationId}
                className="rounded-xl px-5"
              >
                {adjustMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Confirm Adjustment
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
              Stock lives in specific bins/lots — not just the primary warehouse label. Pick a source
              that actually has quantity.
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                From Stock (Source Bin / Lot)
              </Label>
              <Select value={fromStockKey || undefined} onValueChange={setFromStockKey}>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue
                    placeholder={
                      loadingStockLines
                        ? "Loading stock locations…"
                        : fromStockOptions.length === 0
                          ? "No stock allocated to a bin yet"
                          : "Select source stock"
                    }
                  />
                </SelectTrigger>
                <SelectContent position="popper" className="rounded-xl z-[60]">
                  {fromStockOptions.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedFromStock ? (
                <p className="text-[11px] text-muted-foreground">
                  Available to move:{" "}
                  <span className="font-semibold text-foreground">
                    {selectedFromStock.on_hand.toLocaleString()} {good.uom}
                  </span>
                  {selectedFromStock.batch_number ? (
                    <>
                      {" "}
                      · Lot <span className="font-mono">{selectedFromStock.batch_number}</span>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                To Location (Destination)
              </Label>
              <Select value={toLocationId || undefined} onValueChange={setToLocationId}>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue
                    placeholder={loadingLocations ? "Loading locations…" : "Target location"}
                  />
                </SelectTrigger>
                <SelectContent position="popper" className="rounded-xl z-[60]">
                  {resolvedLocations
                    .filter((l) => l.id !== selectedFromStock?.location_id)
                    .map((loc) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>
                        {locationLabel(loc)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Transfer Quantity ({good.uom})
              </Label>
              <Input
                type="number"
                min="0"
                step="any"
                max={selectedFromStock?.on_hand}
                placeholder="0.00"
                value={transferQuantity}
                onChange={(e) => setTransferQuantity(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Transfer Notes
              </Label>
              <Textarea
                placeholder="Reason for bin movement or aisle relocation..."
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                rows={2}
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={onClose} className="rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={() => transferMutation.mutate()}
                disabled={
                  transferMutation.isPending ||
                  !transferQuantity ||
                  !fromStockKey ||
                  !toLocationId ||
                  fromStockOptions.length === 0
                }
                className="rounded-xl px-5"
              >
                {transferMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                )}
                Execute Transfer
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
