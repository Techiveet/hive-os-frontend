"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays, parseISO } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Barcode,
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  ExternalLink,
  FileBox,
  FileText,
  History,
  Info,
  Layers,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Truck,
  Warehouse,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SecureAssetImage, openSecureAssetInNewTab } from "@/components/ui/secure-asset-image";
import { Model3DViewer } from "@/components/ui/model-3d-viewer";
import { getBackendStorageUrl } from "@/lib/runtime-context";

import {
  deleteInventoryGood,
  fetchInventoryGood,
  suggestGoodPurchaseOrder,
} from "@/modules/inventory/api/goods";
import type {
  GoodBatchRecord,
  GoodBomUsageRecord,
  GoodMovementRecord,
  GoodRecord,
  GoodStockLocationRecord,
  GoodType,
} from "@/modules/inventory/types";
import { GoodFormModal } from "./components/good-form-modal";
import { GoodStockAdjustDialog } from "./components/good-stock-adjust-dialog";

const GOOD_TYPE_COLORS: Record<GoodType, { bg: string; text: string; border: string }> = {
  raw_material: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  component: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20" },
  packaging: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  consumable: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  semi_finished: { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/20" },
};

export default function GoodDetailPage({ goodId }: { goodId: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("overview");

  // Modals state
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = React.useState(false);
  const [adjustDialogTab, setAdjustDialogTab] = React.useState<"adjust" | "transfer">("adjust");
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  // Fetch Good Details
  const { data: detailData, isLoading, error } = useQuery({
    queryKey: ["inventory", "goods", "detail", goodId],
    queryFn: () => fetchInventoryGood(goodId),
    enabled: Boolean(goodId),
  });

  const good = detailData?.good;
  const locationStocks: GoodStockLocationRecord[] = detailData?.stocks_by_location || [];
  const bomUsages: GoodBomUsageRecord[] = detailData?.bom_usages || [];
  const batches: GoodBatchRecord[] = good?.batches || [];
  const movements: GoodMovementRecord[] = good?.stock_movements || [];

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteInventoryGood(goodId),
    onSuccess: () => {
      toast.success("Good deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["inventory", "goods"] });
      router.push("/dashboard/inventory/catalog/goods");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to delete good");
    },
  });

  // Suggest PO Mutation
  const suggestPoMutation = useMutation({
    mutationFn: () => suggestGoodPurchaseOrder(goodId),
    onSuccess: (po) => {
      toast.success(
        `Recommended Restock: ${po.suggested_quantity} ${po.uom} from ${po.preferred_supplier?.name || "preferred vendor"} ($${po.estimated_total})`,
        { duration: 6000 }
      );
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Could not generate PO suggestion");
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <span className="text-sm font-semibold">Loading material specifications & warehouse ledger...</span>
      </div>
    );
  }

  if (error || !good) {
    return (
      <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-destructive">Good Not Found</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          The requested raw material or good could not be retrieved. It may have been deleted or moved.
        </p>
        <Button asChild variant="outline" className="rounded-full text-xs">
          <Link href="/dashboard/inventory/catalog/goods">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Goods Catalog
          </Link>
        </Button>
      </div>
    );
  }

  const typeStyle = GOOD_TYPE_COLORS[good.good_type] || GOOD_TYPE_COLORS.raw_material;
  const uom = (good as any).unit_of_measure || good.uom || "units";
  const totalStock = Number(good.total_quantity ?? good.quantity_on_hand ?? 0);
  const reservedStock = Number(good.reserved_quantity || 0);
  const availableStock = Number(good.available_quantity ?? good.available_stock ?? (totalStock - reservedStock));
  const reorderLevel = Number(good.reorder_level || 0);
  const unitCost = Number(good.unit_cost || 0);
  const totalValue = totalStock * unitCost;
  const isLowStock = totalStock <= reorderLevel;
  const msdsDoc = (good as any).msds_sheet_path || good.msds_file_path || good.spec_sheet_path;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <Link
            href="/dashboard/inventory/catalog/goods"
            className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Goods Catalog
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">{good.name}</h1>
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border",
                typeStyle.bg,
                typeStyle.text,
                typeStyle.border
              )}
            >
              {good.good_type.replace("_", " ")}
            </span>
            <Badge
              variant={
                good.status === "active"
                  ? "default"
                  : good.status === "inactive"
                  ? "secondary"
                  : "destructive"
              }
              className="capitalize text-xs font-bold px-2.5 py-0.5 rounded-full"
            >
              {good.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
            <span>SKU: <strong className="text-foreground">{good.sku}</strong></span>
            {good.stock_code && (
              <>
                <span>•</span>
                <span>Part: {good.stock_code}</span>
              </>
            )}
            {good.barcode && (
              <>
                <span>•</span>
                <span>Barcode: {good.barcode}</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs h-9"
            onClick={() => {
              setAdjustDialogTab("adjust");
              setAdjustDialogOpen(true);
            }}
          >
            <Scale className="mr-1.5 h-3.5 w-3.5 text-primary" />
            Adjust Stock
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs h-9"
            onClick={() => {
              setAdjustDialogTab("transfer");
              setAdjustDialogOpen(true);
            }}
          >
            <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5 text-blue-500" />
            Transfer Location
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs h-9"
            onClick={() => suggestPoMutation.mutate()}
            disabled={suggestPoMutation.isPending}
          >
            {suggestPoMutation.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShoppingCart className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
            )}
            Suggest PO
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs h-9"
            onClick={() => setEditModalOpen(true)}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="rounded-full text-xs h-9 shadow-sm"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2rem] border-border/60 bg-background/95 backdrop-blur-xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Raw Material?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete <strong>{good.name}</strong> ({good.sku})? This will remove all associated stock allocations and transaction history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-xl text-xs bg-destructive hover:bg-destructive/90"
                  onClick={() => deleteMutation.mutate()}
                >
                  Confirm Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* KPI Metric Summary Header */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Available Stock */}
        <div className="rounded-3xl border border-border/50 bg-card/60 p-5 backdrop-blur-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Available Stock</span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight font-mono">
              {availableStock.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground font-semibold">
              {uom}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
            <span>On Hand: {totalStock.toLocaleString()}</span>
            {reservedStock > 0 && (
              <span className="text-amber-500 font-bold">
                (Reserved: {reservedStock.toLocaleString()})
              </span>
            )}
          </div>
        </div>

        {/* Stock Valuation */}
        <div className="rounded-3xl border border-border/50 bg-card/60 p-5 backdrop-blur-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Inventory Valuation</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight font-mono">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-muted-foreground font-semibold">{good.currency || "USD"}</span>
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">
            @ ${unitCost.toFixed(2)} standard cost per {uom}
          </div>
        </div>

        {/* Safety & Reorder Threshold */}
        <div className="rounded-3xl border border-border/50 bg-card/60 p-5 backdrop-blur-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Restock Status</span>
            <div
              className={cn(
                "h-8 w-8 rounded-xl flex items-center justify-center",
                isLowStock ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
              )}
            >
              {isLowStock ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "text-2xl font-black tracking-tight",
                isLowStock ? "text-rose-600 dark:text-rose-400" : "text-foreground"
              )}
            >
              {isLowStock ? "Low Stock Alert" : "Healthy Stock"}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">
            Reorder point: {reorderLevel} {uom} • Buffer: {good.safety_stock || 0}
          </div>
        </div>

        {/* Primary Facility / Bin */}
        <div className="rounded-3xl border border-border/50 bg-card/60 p-5 backdrop-blur-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Primary Placement</span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Warehouse className="h-4 w-4" />
            </div>
          </div>
          <div className="text-base font-bold truncate">
            {good.primary_warehouse?.name || "Unassigned Facility"}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
            <MapPin className="h-3 w-3 text-primary" />
            {good.default_location ? (
              <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-bold text-foreground">
                Bin: {good.default_location.code}
              </span>
            ) : (
              <span>No default bin specified</span>
            )}
          </div>
        </div>
      </div>

      {/* 5 Tabs Navigation & Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 w-full bg-card/60 border border-border/50 p-1 rounded-2xl h-12 mb-6 backdrop-blur-xl">
          <TabsTrigger value="overview" className="rounded-xl text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Overview & Specs
          </TabsTrigger>
          <TabsTrigger value="locations" className="rounded-xl text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Stock by Facility ({locationStocks.length})
          </TabsTrigger>
          <TabsTrigger value="ledger" className="rounded-xl text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Movement Ledger ({movements.length})
          </TabsTrigger>
          <TabsTrigger value="batches" className="rounded-xl text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Batches & Expiry ({batches.length})
          </TabsTrigger>
          <TabsTrigger value="bom" className="rounded-xl text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Usage in BOM / Products ({bomUsages.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW & SPECS */}
        <TabsContent value="overview" className="space-y-6 focus-visible:outline-none">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Specifications Card */}
            <div className="rounded-3xl border border-border/50 bg-card/50 p-6 space-y-4 backdrop-blur-xl">
              <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" /> Material & Packaging Specs
              </h3>

              <div className="divide-y divide-border/40 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-semibold">{good.category?.name || "Uncategorized"}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-muted-foreground">Base Unit of Measure</span>
                  <span className="font-mono font-bold">{uom}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-muted-foreground">Purchase UOM</span>
                  <span className="font-mono">{good.purchase_uom || `Same as base (${uom})`}</span>
                </div>
                {good.purchase_uom && (
                  <div className="py-2.5 flex justify-between">
                    <span className="text-muted-foreground">UOM Conversion</span>
                    <span className="font-mono font-semibold">
                      1 {good.purchase_uom} = {String(good.uom_conversion_factor ?? good.conversion_factor ?? 1)} {uom}
                    </span>
                  </div>
                )}
                <div className="py-2.5 flex justify-between">
                  <span className="text-muted-foreground">Packaging Qty</span>
                  <span className="font-mono">{good.packaging_quantity ? `${good.packaging_quantity} units / carton` : "Not specified"}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-muted-foreground">Net Weight</span>
                  <span className="font-mono">{good.weight ? `${good.weight} kg` : "-"}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-muted-foreground">Dimensions (L × W × H)</span>
                  <span className="font-mono">
                    {good.length || good.width || good.height
                      ? `${good.length || 0} × ${good.width || 0} × ${good.height || 0} cm`
                      : "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Costing & Supplier Card */}
            <div className="rounded-3xl border border-border/50 bg-card/50 p-6 space-y-4 backdrop-blur-xl">
              <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Truck className="h-4 w-4 text-emerald-500" /> Supplier & Purchasing Terms
              </h3>

              <div className="divide-y divide-border/40 text-xs">
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Primary Supplier</span>
                  <span className="font-semibold text-right">
                    {good.preferred_supplier ? (
                      <span className="text-primary hover:underline cursor-pointer">
                        {good.preferred_supplier.name}
                      </span>
                    ) : (
                      "None Assigned"
                    )}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-muted-foreground">Standard Cost</span>
                  <span className="font-mono font-bold text-foreground">
                    ${Number(good.unit_cost || 0).toFixed(2)} {good.currency}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-muted-foreground">Tax Rate & Scheme</span>
                  <span className="font-mono">
                    {good.tax_rate || 0}% ({good.tax_type || "exclusive"})
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-muted-foreground">Supplier Lead Time</span>
                  <span className="font-mono font-semibold">
                    {good.lead_time_days ? `${good.lead_time_days} days` : "-"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-muted-foreground">Minimum Order Qty (MOQ)</span>
                  <span className="font-mono font-semibold">
                    {String(good.minimum_order_quantity ?? good.min_order_quantity ?? 1)} {uom}
                  </span>
                </div>
              </div>

              {/* Secondary Suppliers if any */}
              {good.suppliers && good.suppliers.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Secondary Approved Vendors ({good.suppliers.length})
                  </h4>
                  <div className="space-y-1.5">
                    {good.suppliers.map((s) => (
                      <div
                        key={s.id}
                        className="flex justify-between items-center bg-background/50 p-2 rounded-xl text-xs border border-border/30"
                      >
                        <div>
                          <p className="font-semibold">{s.name}</p>
                          {s.supplier_sku && (
                            <p className="text-[10px] text-muted-foreground font-mono">
                              SKU: {s.supplier_sku}
                            </p>
                          )}
                        </div>
                        <div className="text-right font-mono text-[11px]">
                          <p>${Number(s.unit_cost || good.unit_cost || 0).toFixed(2)}</p>
                          {s.lead_time_days && (
                            <p className="text-muted-foreground">{s.lead_time_days}d lead</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Compliance & Tracking Card */}
            <div className="rounded-3xl border border-border/50 bg-card/50 p-6 space-y-4 backdrop-blur-xl">
              <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-500" /> Traceability & Compliance
              </h3>

              <div className="divide-y divide-border/40 text-xs">
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Batch / Lot Tracking</span>
                  <Badge variant={good.track_batches ? "default" : "outline"} className="text-[10px]">
                    {good.track_batches ? "Enforced" : "Disabled"}
                  </Badge>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Expiry / Perishability</span>
                  <Badge variant={good.track_expiry ? "default" : "outline"} className="text-[10px]">
                    {good.track_expiry ? "Active (FIFO/FEFO)" : "Non-perishable"}
                  </Badge>
                </div>
                {good.track_expiry && (
                  <>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-muted-foreground">Shelf Life</span>
                      <span className="font-mono">{good.shelf_life_days} days</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-muted-foreground">Expiry Warning Threshold</span>
                      <span className="font-mono">{good.expiry_alert_days || 30} days</span>
                    </div>
                  </>
                )}
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Safety Data Sheet (MSDS)</span>
                  {msdsDoc ? (
                    <a
                      href={msdsDoc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      View Document
                      <ExternalLink className="h-3 w-3 ml-0.5" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground italic">No document attached</span>
                  )}
                </div>
              </div>
            </div>

            {/* Imagery & Barcode Card */}
            <div className="rounded-3xl border border-border/50 bg-card/50 p-6 space-y-4 backdrop-blur-xl">
              <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileBox className="h-4 w-4 text-primary" /> Visuals & Identifiers
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Image */}
                <div className="aspect-square rounded-2xl border border-border/60 overflow-hidden bg-muted/20 flex items-center justify-center p-2 relative group">
                  {good.image ? (
                    <SecureAssetImage
                      src={good.image}
                      alt={good.name}
                      className="h-full w-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-1 opacity-50" />
                      <span className="text-[10px]">No image asset</span>
                    </div>
                  )}
                </div>

                {/* Barcode & 3D */}
                <div className="flex flex-col justify-between space-y-3">
                  <div className="rounded-2xl border border-border/60 p-3 bg-muted/10 text-center space-y-1">
                    <Barcode className="h-8 w-16 mx-auto text-foreground" />
                    <p className="font-mono text-xs font-black">{good.barcode || good.sku}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Receiving & Bin Label</p>
                  </div>

                  {good.model_3d_path && (
                    <div className="rounded-2xl border border-border/60 p-3 bg-blue-500/5 text-center">
                      <FileBox className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                      <p className="text-xs font-bold">3D Model Asset</p>
                      <p className="text-[10px] font-mono text-muted-foreground truncate">
                        {good.model_3d_path}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          {good.description && (
            <div className="rounded-3xl border border-border/50 bg-card/50 p-6 space-y-2 backdrop-blur-xl">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Material Description & Processing Notes
              </h3>
              <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                {good.description}
              </p>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: STOCK BY LOCATION */}
        <TabsContent value="locations" className="space-y-4 focus-visible:outline-none">
          <div className="rounded-3xl border border-border/50 bg-card/50 overflow-hidden backdrop-blur-xl">
            <div className="p-5 border-b border-border/40 flex justify-between items-center">
              <div>
                <h3 className="text-base font-black tracking-tight">Warehouse & Shelf-Bin Allocation</h3>
                <p className="text-xs text-muted-foreground">
                  Stock balances broken down by facility, zone, aisle, and individual bin.
                </p>
              </div>
              <Button
                size="sm"
                className="rounded-full text-xs"
                onClick={() => {
                  setAdjustDialogTab("adjust");
                  setAdjustDialogOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Allocate Stock
              </Button>
            </div>

            {locationStocks.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground space-y-3">
                <Warehouse className="h-10 w-10 mx-auto opacity-40" />
                <p className="text-sm font-semibold">No warehouse bin allocations recorded yet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => {
                    setAdjustDialogTab("adjust");
                    setAdjustDialogOpen(true);
                  }}
                >
                  Receive / Intake Stock
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Facility</TableHead>
                    <TableHead>Location / Bin</TableHead>
                    <TableHead>Batch Number</TableHead>
                    <TableHead className="text-right">On Hand</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Stock Valuation</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locationStocks.map((loc) => (
                    <TableRow key={loc.id}>
                      <TableCell className="font-semibold text-xs">
                        {loc.warehouse_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs font-mono">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          <span className="bg-muted px-1.5 py-0.5 rounded font-bold">
                            {loc.location_code}
                          </span>
                          {loc.location_name && (
                            <span className="text-muted-foreground">({loc.location_name})</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {loc.batch_number ? (
                          <Badge variant="outline" className="text-[10px]">
                            {loc.batch_number}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs">
                        {Number(loc.on_hand).toLocaleString()} {uom}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-amber-500">
                        {Number(loc.reserved || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        {Number(loc.available || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        ${(Number(loc.on_hand || 0) * (loc.unit_cost || unitCost)).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs rounded-lg"
                          onClick={() => {
                            setAdjustDialogTab("transfer");
                            setAdjustDialogOpen(true);
                          }}
                        >
                          <ArrowRightLeft className="mr-1 h-3 w-3 text-primary" />
                          Transfer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* TAB 3: MOVEMENT LEDGER */}
        <TabsContent value="ledger" className="space-y-4 focus-visible:outline-none">
          <div className="rounded-3xl border border-border/50 bg-card/50 overflow-hidden backdrop-blur-xl">
            <div className="p-5 border-b border-border/40">
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Audit Trail & Stock Movements
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete transactional ledger of supplier receipts, BOM consumption, transfers, and adjustments.
              </p>
            </div>

            {movements.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <p className="text-sm">No transaction ledger entries found for this good.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Movement Type</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-right">Quantity Delta</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead>Reason / Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((mov) => {
                    const qty = Number(mov.quantity || 0);
                    const isPositive = qty > 0;
                    return (
                      <TableRow key={mov.id}>
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {format(new Date(mov.created_at), "yyyy-MM-dd HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isPositive ? "default" : "outline"}
                            className="text-[10px] font-bold uppercase tracking-wider capitalize"
                          >
                            {mov.type.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {mov.from_location?.code || "-"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {mov.to_location?.code || "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs">
                          <span className={isPositive ? "text-emerald-500" : "text-rose-500"}>
                            {isPositive ? `+${qty.toLocaleString()}` : qty.toLocaleString()}{" "}
                            {uom}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {mov.unit_cost ? `$${Number(mov.unit_cost).toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {mov.notes || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* TAB 4: BATCHES & EXPIRY */}
        <TabsContent value="batches" className="space-y-4 focus-visible:outline-none">
          <div className="rounded-3xl border border-border/50 bg-card/50 overflow-hidden backdrop-blur-xl">
            <div className="p-5 border-b border-border/40">
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Active Batches & Lot Management
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                FIFO/FEFO tracking with expiry countdowns and quality release statuses.
              </p>
            </div>

            {batches.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground space-y-2">
                <p className="text-sm">No batches or lots recorded for this material.</p>
                <p className="text-xs text-muted-foreground">
                  Batches are automatically created during purchase order receipt or manual stock intake.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch / Lot #</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead className="text-right">Quantity On Hand</TableHead>
                    <TableHead>Received Date</TableHead>
                    <TableHead>Expiration Date</TableHead>
                    <TableHead>Shelf Status</TableHead>
                    <TableHead>QA Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => {
                    const daysLeft = b.expiry_date
                      ? differenceInDays(new Date(b.expiry_date), new Date())
                      : null;
                    const isExpired = daysLeft !== null && daysLeft <= 0;
                    const isSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= (Number(good.expiry_alert_days) || 30);

                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono font-bold text-xs text-primary">
                          {b.batch_number}
                        </TableCell>
                        <TableCell className="text-xs">
                          {b.warehouse?.name || "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs">
                          {Number(b.quantity_on_hand).toLocaleString()} {uom}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {b.received_date}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {b.expiry_date || "No Expiry"}
                        </TableCell>
                        <TableCell>
                          {daysLeft === null ? (
                            <Badge variant="outline" className="text-[10px]">Indefinite</Badge>
                          ) : isExpired ? (
                            <Badge variant="destructive" className="text-[10px] font-bold">
                              EXPIRED ({Math.abs(daysLeft)}d ago)
                            </Badge>
                          ) : isSoon ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                              {daysLeft} days remaining
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                              {daysLeft} days remaining
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {b.qa_status || "Approved"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* TAB 5: BOM & USAGE IN PRODUCTS */}
        <TabsContent value="bom" className="space-y-4 focus-visible:outline-none">
          <div className="rounded-3xl border border-border/50 bg-card/50 overflow-hidden backdrop-blur-xl">
            <div className="p-5 border-b border-border/40">
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Consumption in Finished Products (BOM)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bills of Materials that consume this raw material during manufacturing or assembly.
              </p>
            </div>

            {bomUsages.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground space-y-2">
                <Layers className="h-10 w-10 mx-auto opacity-40" />
                <p className="text-sm font-semibold">Not currently linked to any Bill of Materials.</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Add this material to a recipe in Production & Manufacturing to track automatic consumption and scrap factors.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Target Product</TableHead>
                    <TableHead>BOM Code</TableHead>
                    <TableHead className="text-right">Qty / Unit</TableHead>
                    <TableHead className="text-right">Scrap Factor</TableHead>
                    <TableHead className="text-right">Gross Qty / Unit</TableHead>
                    <TableHead className="text-right">Cost Contribution</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bomUsages.map((bom) => {
                    const gross = Number(bom.gross_quantity || bom.quantity_per_unit || 0);
                    const costContr = gross * unitCost;

                    return (
                      <TableRow key={bom.bom_id}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-bold text-xs">{bom.product_name}</p>
                            <p className="font-mono text-[10px] text-muted-foreground">
                              {bom.product_sku}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold">
                          {bom.bom_code}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {Number(bom.quantity_per_unit).toFixed(4)} {bom.uom || uom}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {Number(bom.scrap_percent || 0).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs">
                          {gross.toFixed(4)} {bom.uom || uom}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          ${costContr.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right">
                          {bom.product_id && (
                            <Button asChild variant="ghost" size="sm" className="h-7 text-xs rounded-lg">
                              <Link href={`/dashboard/inventory/catalog/products/${bom.product_id}`}>
                                View Product
                              </Link>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Good Modal */}
      <GoodFormModal
        open={editModalOpen}
        mode="edit"
        goodId={goodId}
        onClose={() => setEditModalOpen(false)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["inventory", "goods", "detail", goodId] });
        }}
      />

      {/* Adjust / Transfer Stock Dialog */}
      <GoodStockAdjustDialog
        open={adjustDialogOpen}
        good={good}
        initialTab={adjustDialogTab}
        onClose={() => setAdjustDialogOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["inventory", "goods", "detail", goodId] });
        }}
      />
    </div>
  );
}
