"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { adjustInventoryGoodStock, transferInventoryGoodLocation } from "@/modules/inventory/api/goods";
import type { GoodRecord, GoodStockLocationRecord } from "@/modules/inventory/types";

type Props = {
  open: boolean;
  good: GoodRecord | null;
  locations?: Array<{ id: number; name: string; code?: string | null; warehouse_id?: number | null }>;
  stockLocations?: GoodStockLocationRecord[];
  onClose: () => void;
  onSuccess?: () => void;
  defaultTab?: "adjust" | "transfer";
  initialTab?: "adjust" | "transfer";
};

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

  React.useEffect(() => {
    if (open) {
      setActiveTab(initialTab || defaultTab);
    }
  }, [open, initialTab, defaultTab]);

  // Adjust State
  const [mode, setMode] = React.useState<"add" | "deduct" | "set">("add");
  const [quantity, setQuantity] = React.useState<string>("");
  const [locationId, setLocationId] = React.useState<string>("");
  const [batchNumber, setBatchNumber] = React.useState<string>("");
  const [expiryDate, setExpiryDate] = React.useState<string>("");
  const [reason, setReason] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");

  // Transfer State
  const [fromLocationId, setFromLocationId] = React.useState<string>("");
  const [toLocationId, setToLocationId] = React.useState<string>("");
  const [transferQuantity, setTransferQuantity] = React.useState<string>("");
  const [transferBatch, setTransferBatch] = React.useState<string>("");
  const [transferNotes, setTransferNotes] = React.useState<string>("");

  React.useEffect(() => {
    if (open && good) {
      setActiveTab(defaultTab);
      setQuantity("");
      setLocationId(good.default_location_id ? String(good.default_location_id) : "");
      setBatchNumber("");
      setExpiryDate("");
      setReason("");
      setNotes("");

      setTransferQuantity("");
      setTransferBatch("");
      setTransferNotes("");
      if (stockLocations.length > 0) {
        setFromLocationId(String(stockLocations[0].location_id));
      } else if (good.default_location_id) {
        setFromLocationId(String(good.default_location_id));
      }
      setToLocationId("");
    }
  }, [open, good, defaultTab, stockLocations]);

  const adjustMutation = useMutation({
    mutationFn: () => {
      if (!good) throw new Error("No good selected");
      const qty = Number(quantity);
      if (isNaN(qty) || qty <= 0) throw new Error("Please enter a valid quantity");

      return adjustInventoryGoodStock(good.id, {
        mode,
        quantity: qty,
        warehouse_location_id: locationId ? Number(locationId) : undefined,
        batch_number: batchNumber || undefined,
        expiry_date: expiryDate || undefined,
        reason: reason || undefined,
        notes: notes || undefined,
        // One business event → one stock effect: a stable key per submission so
        // a network/HTTP retry cannot double the adjustment (backend enforced).
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
      const from = Number(fromLocationId);
      const to = Number(toLocationId);
      const qty = Number(transferQuantity);

      if (!from || !to) throw new Error("Please select both source and destination locations");
      if (from === to) throw new Error("Source and destination must be different");
      if (isNaN(qty) || qty <= 0) throw new Error("Please enter a valid transfer quantity");

      return transferInventoryGoodLocation(good.id, {
        from_location_id: from,
        to_location_id: to,
        quantity: qty,
        batch_number: transferBatch || undefined,
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
      toast.error(err?.response?.data?.message || err?.message || "Failed to transfer stock");
    },
  });

  if (!good) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg rounded-3xl border border-border/60 bg-background/95 p-6 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
            {activeTab === "adjust" ? (
              <>
                <Sliders className="h-5 w-5 text-primary" />
                Adjust Stock: {good.name}
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                Transfer Stock: {good.name}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            SKU: <span className="font-mono font-semibold">{good.sku}</span> | Current Stock:{" "}
            <span className="font-semibold text-foreground">
              {Number(good.quantity_on_hand).toLocaleString()} {good.uom}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
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

        {activeTab === "adjust" ? (
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
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>
                        {loc.code ? `[${loc.code}] ` : ""}
                        {loc.name}
                      </SelectItem>
                    ))}
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
                disabled={adjustMutation.isPending || !quantity}
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  From Location (Source)
                </Label>
                <Select value={fromLocationId} onValueChange={setFromLocationId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Source location" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>
                        {loc.code ? `[${loc.code}] ` : ""}
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  To Location (Destination)
                </Label>
                <Select value={toLocationId} onValueChange={setToLocationId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Target location" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {locations
                      .filter((l) => String(l.id) !== fromLocationId)
                      .map((loc) => (
                        <SelectItem key={loc.id} value={String(loc.id)}>
                          {loc.code ? `[${loc.code}] ` : ""}
                          {loc.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Transfer Quantity ({good.uom})
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Batch Filter (Optional)
                </Label>
                <Input
                  placeholder="Specific batch or lot"
                  value={transferBatch}
                  onChange={(e) => setTransferBatch(e.target.value)}
                  className="rounded-xl"
                />
              </div>
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
                disabled={transferMutation.isPending || !transferQuantity || !toLocationId}
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
