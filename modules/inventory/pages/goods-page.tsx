"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Copy,
  DollarSign,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  Layers,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  Warehouse,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { DataTable, type DataTableQuery } from "@/components/datatable/data-table";
import { Badge } from "@/components/ui/badge";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SecureAssetImage } from "@/components/ui/secure-asset-image";

import {
  bulkDeleteInventoryGoods,
  bulkUpdateInventoryGoodsStatus,
  deleteInventoryGood,
  fetchInventoryGoods,
  fetchInventoryGoodSummary,
  fetchInventoryGoodOptions,
  suggestGoodPurchaseOrder,
} from "@/modules/inventory/api/goods";
import type {
  GoodRecord,
  GoodStatus,
  GoodType,
} from "@/modules/inventory/types";
import { GoodFormModal } from "./components/good-form-modal";
import { GoodStockAdjustDialog } from "./components/good-stock-adjust-dialog";

type SortDirection = "asc" | "desc";

type TableQueryState = {
  page: number;
  pageSize: number;
  search: string;
  sortCol: string;
  sortDir: SortDirection;
};

const DEFAULT_QUERY: TableQueryState = {
  page: 1,
  pageSize: 15,
  search: "",
  sortCol: "created_at",
  sortDir: "desc",
};

const GOOD_TYPE_PILLS: Array<{ value: string; label: string; countKey?: string }> = [
  { value: "all", label: "All Goods" },
  { value: "raw_material", label: "Raw Materials" },
  { value: "component", label: "Components" },
  { value: "packaging", label: "Packaging" },
  { value: "consumable", label: "Consumables" },
  { value: "semi_finished", label: "Semi-Finished" },
];

const GOOD_TYPE_COLORS: Record<GoodType, { bg: string; text: string; border: string }> = {
  raw_material: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  component: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20" },
  packaging: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  consumable: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  semi_finished: { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/20" },
};

export default function GoodsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters State
  const [tableQuery, setTableQuery] = React.useState<TableQueryState>(DEFAULT_QUERY);
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [warehouseFilter, setWarehouseFilter] = React.useState<string>("all");
  const [lowStockOnly, setLowStockOnly] = React.useState<boolean>(false);
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Modals State
  const [formModalOpen, setFormModalOpen] = React.useState(false);
  const [formModalMode, setFormModalMode] = React.useState<"create" | "edit" | "duplicate">("create");
  const [selectedGoodId, setSelectedGoodId] = React.useState<number | null>(null);

  const [adjustDialogOpen, setAdjustDialogOpen] = React.useState(false);
  const [adjustDialogInitialTab, setAdjustDialogInitialTab] = React.useState<"adjust" | "transfer">("adjust");
  const [adjustSelectedGood, setAdjustSelectedGood] = React.useState<GoodRecord | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [goodToDelete, setGoodToDelete] = React.useState<GoodRecord | null>(null);

  // Fetch KPI Summary
  const { data: summaryData, isLoading: loadingSummary } = useQuery({
    queryKey: ["inventory", "goods", "summary"],
    queryFn: fetchInventoryGoodSummary,
  });
  const summary = summaryData?.totals;

  // Fetch Options (Warehouses, Suppliers)
  const { data: optionsData } = useQuery({
    queryKey: ["inventory", "goods", "options"],
    queryFn: fetchInventoryGoodOptions,
  });
  const options = optionsData;

  // Fetch Goods List
  const listQueryParams = React.useMemo(() => {
    return {
      page: tableQuery.page,
      per_page: tableQuery.pageSize,
      search: tableQuery.search || undefined,
      good_type: typeFilter !== "all" ? typeFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      warehouse_id: warehouseFilter !== "all" ? Number(warehouseFilter) : undefined,
      low_stock_only: lowStockOnly ? true : undefined,
      sort_by: tableQuery.sortCol || "created_at",
      sort_direction: tableQuery.sortDir || "desc",
    };
  }, [tableQuery, typeFilter, statusFilter, warehouseFilter, lowStockOnly]);

  const {
    data: goodsData,
    isLoading: loadingGoods,
    isFetching: fetchingGoods,
    refetch: refetchGoods,
  } = useQuery({
    queryKey: ["inventory", "goods", "list", listQueryParams],
    queryFn: () => fetchInventoryGoods(listQueryParams),
  });

  const goodsList = goodsData?.data || [];
  const totalEntries = goodsData?.total ?? goodsList.length;

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteInventoryGood(id),
    onSuccess: () => {
      toast.success("Good deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["inventory", "goods"] });
      setDeleteDialogOpen(false);
      setGoodToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to delete good");
    },
  });

  // Bulk Status Mutation
  const bulkStatusMutation = useMutation({
    mutationFn: (status: GoodStatus) => bulkUpdateInventoryGoodsStatus(selectedIds, status),
    onSuccess: (_, status) => {
      toast.success(`Updated ${selectedIds.length} goods to ${status}`);
      queryClient.invalidateQueries({ queryKey: ["inventory", "goods"] });
      setSelectedIds([]);
      setRowSelection({});
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Bulk update failed");
    },
  });

  // Bulk Delete Mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: () => bulkDeleteInventoryGoods(selectedIds),
    onSuccess: () => {
      toast.success(`Deleted ${selectedIds.length} goods`);
      queryClient.invalidateQueries({ queryKey: ["inventory", "goods"] });
      setSelectedIds([]);
      setRowSelection({});
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Bulk delete failed");
    },
  });

  // Suggest PO Mutation
  const suggestPoMutation = useMutation({
    mutationFn: (goodId: number) => suggestGoodPurchaseOrder(goodId),
    onSuccess: (po: any) => {
      toast.success(
        `Draft PO suggested for ${po.suggested_quantity} ${po.uom} from ${po.preferred_supplier?.name || "preferred vendor"} ($${po.estimated_total})`,
        { duration: 6000 }
      );
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Could not generate PO suggestion");
    },
  });

  // Action Helpers
  const handleOpenCreate = () => {
    setSelectedGoodId(null);
    setFormModalMode("create");
    setFormModalOpen(true);
  };

  const handleOpenEdit = (good: GoodRecord) => {
    setSelectedGoodId(good.id);
    setFormModalMode("edit");
    setFormModalOpen(true);
  };

  const handleOpenAdjust = (good: GoodRecord, tab: "adjust" | "transfer") => {
    setAdjustSelectedGood(good);
    setAdjustDialogInitialTab(tab);
    setAdjustDialogOpen(true);
  };

  const handleOpenDelete = (good: GoodRecord) => {
    setGoodToDelete(good);
    setDeleteDialogOpen(true);
  };

  // TanStack Table Columns
  const columns = React.useMemo<ColumnDef<GoodRecord>[]>(() => {
    return [
      {
        accessorKey: "name",
        header: "Material / Good",
        cell: ({ row }) => {
          const good = row.original;
          const typeStyle = GOOD_TYPE_COLORS[good.good_type] || GOOD_TYPE_COLORS.raw_material;
          return (
            <div className="flex items-center gap-3 py-1">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted/20 flex items-center justify-center">
                {good.image ? (
                  <SecureAssetImage
                    src={good.image}
                    alt={good.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Boxes className="h-5 w-5 text-muted-foreground/70" />
                )}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/inventory/catalog/goods/${good.id}`}
                    className="font-bold text-sm tracking-tight hover:text-primary transition-colors truncate max-w-[220px]"
                  >
                    {good.name}
                  </Link>
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      typeStyle.bg,
                      typeStyle.text,
                      typeStyle.border
                    )}
                  >
                    {good.good_type.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <span className="font-semibold text-foreground/80">{good.sku}</span>
                  {good.stock_code && (
                    <>
                      <span>•</span>
                      <span>{good.stock_code}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "total_quantity",
        header: "Stock Level",
        cell: ({ row }) => {
          const good = row.original;
          const uom = (good as any).unit_of_measure || good.uom || "units";
          const total = Number((good as any).total_quantity ?? good.quantity_on_hand ?? 0);
          const reserved = Number(good.reserved_quantity || 0);
          const available = Number((good as any).available_quantity ?? good.available_stock ?? (total - reserved));
          const reorder = Number(good.reorder_level || 0);
          const isLow = total <= reorder;

          return (
            <div className="space-y-1 py-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black tracking-tight">
                  {available.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {uom}
                </span>

                {isLow ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-black text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <AlertTriangle className="h-3 w-3" />
                          LOW
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        Stock ({total}) is at or below reorder threshold ({reorder} {uom})
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    OK
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                <span>On Hand: {total.toLocaleString()}</span>
                {reserved > 0 && (
                  <span className="text-amber-600 dark:text-amber-400">
                    Res: {reserved.toLocaleString()}
                  </span>
                )}
                <span>Min: {reorder.toLocaleString()}</span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "primary_warehouse",
        header: "Facility & Bin",
        cell: ({ row }) => {
          const good = row.original;
          const wh = good.primary_warehouse;
          const loc = good.default_location;

          return (
            <div className="space-y-1 py-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{wh ? wh.name : "Unassigned Facility"}</span>
              </div>
              {loc ? (
                <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                  <MapPin className="h-3 w-3 text-primary" />
                  <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-bold">
                    {loc.code}
                  </span>
                  {loc.name && <span>({loc.name})</span>}
                </div>
              ) : (
                <span className="text-[10px] text-muted-foreground italic">No default bin</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "preferred_supplier",
        header: "Primary Supplier",
        cell: ({ row }) => {
          const good = row.original;
          const sup = good.preferred_supplier;

          return (
            <div className="space-y-1 py-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate max-w-[150px]">
                  {sup ? sup.name : "No Primary Vendor"}
                </span>
              </div>
              {good.lead_time_days ? (
                <span className="text-[11px] text-muted-foreground font-mono">
                  Lead: {good.lead_time_days} days
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "unit_cost",
        header: "Cost & Valuation",
        cell: ({ row }) => {
          const good = row.original;
          const unitCost = Number(good.unit_cost || 0);
          const totalQty = Number((good as any).total_quantity ?? good.quantity_on_hand ?? 0);
          const totalVal = totalQty * unitCost;
          const itemUom = (good as any).unit_of_measure || good.uom || "units";

          return (
            <div className="space-y-0.5 py-1">
              <div className="font-mono text-xs font-bold text-foreground">
                ${unitCost.toFixed(2)}{" "}
                <span className="text-[10px] text-muted-foreground font-normal">
                  / {itemUom}
                </span>
              </div>
              <div className="text-[11px] font-mono text-muted-foreground">
                Val: ${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge
              variant={
                status === "active"
                  ? "default"
                  : status === "inactive"
                  ? "secondary"
                  : "destructive"
              }
              className="capitalize text-[10px] font-bold px-2 py-0.5 rounded-full"
            >
              {status}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const good = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-muted"
                      onClick={() => router.push(`/dashboard/inventory/catalog/goods/${good.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">View Specifications & Ledger</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-muted"
                      onClick={() => handleOpenEdit(good)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">Edit Material</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5">
                  <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Inventory Actions
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    className="rounded-xl text-xs cursor-pointer"
                    onClick={() => handleOpenAdjust(good, "adjust")}
                  >
                    <Scale className="mr-2 h-3.5 w-3.5 text-primary" />
                    Adjust Stock Count
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-xl text-xs cursor-pointer"
                    onClick={() => handleOpenAdjust(good, "transfer")}
                  >
                    <ArrowRightLeft className="mr-2 h-3.5 w-3.5 text-blue-500" />
                    Transfer Location
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-xl text-xs cursor-pointer"
                    onClick={() => suggestPoMutation.mutate(good.id)}
                  >
                    <ShoppingCart className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                    Suggest Restock PO
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="rounded-xl text-xs text-destructive cursor-pointer"
                    onClick={() => handleOpenDelete(good)}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete Material
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ];
  }, [router, suggestPoMutation]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
              <Boxes className="h-8 w-8 text-primary" />
              Goods & Raw Materials
            </h1>
            <Badge variant="outline" className="rounded-full px-3 py-0.5 text-xs font-semibold">
              Catalog & Inbounds
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage ingredients, packaging, components, and consumables used in production and assembly.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            className="rounded-full px-4 text-xs h-10 border-border/60"
            onClick={() => {
              const exportUrl = `/api/v1/inventory/goods/export?good_type=${typeFilter !== "all" ? typeFilter : ""}`;
              window.open(exportUrl, "_blank");
            }}
          >
            <Download className="mr-2 h-3.5 w-3.5" />
            Export CSV
          </Button>

          <Button
            className="rounded-full px-5 text-xs font-bold h-10 shadow-lg shadow-primary/20"
            onClick={handleOpenCreate}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Raw Material
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Goods */}
        <div className="rounded-3xl border border-border/50 bg-card/60 p-5 backdrop-blur-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Total Goods Catalog</span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight">
              {loadingSummary ? "-" : summary?.goods ?? 0}
            </span>
            <span className="text-xs text-muted-foreground font-medium">registered items</span>
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="text-emerald-500 font-bold">{summary?.active ?? 0} active</span>
            <span>•</span>
            <span>{summary?.raw_materials ?? 0} raw materials</span>
          </div>
        </div>

        {/* Total Inventory Value */}
        <div className="rounded-3xl border border-border/50 bg-card/60 p-5 backdrop-blur-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Total Stock Value</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight">
              ${loadingSummary ? "-" : (summary?.total_stock_value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-muted-foreground font-medium">USD</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Current on-hand valuation across all warehouses
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="rounded-3xl border border-border/50 bg-card/60 p-5 backdrop-blur-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Low Stock Threshold</span>
            <div className="h-8 w-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400">
              {loadingSummary ? "-" : summary?.low_stock ?? 0}
            </span>
            <span className="text-xs text-muted-foreground font-medium">items need restock</span>
          </div>
          <div className="text-[11px] text-rose-600/80 dark:text-rose-400/80 font-medium">
            Available stock at or below safety reorder level
          </div>
        </div>

        {/* Expiring Batches */}
        <div className="rounded-3xl border border-border/50 bg-card/60 p-5 backdrop-blur-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Expiring Batches (30d)</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
              {loadingSummary ? "-" : summary?.expiring_soon ?? 0}
            </span>
            <span className="text-xs text-muted-foreground font-medium">lots requiring FIFO</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Active lots within 30-day window
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <section className="rounded-3xl border border-border/50 bg-card/40 p-4 backdrop-blur-xl space-y-3">
        {/* Row 1: Good Type Pills */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/30 pb-3">
          {GOOD_TYPE_PILLS.map((pill) => (
            <button
              key={pill.value}
              type="button"
              onClick={() => {
                setTypeFilter(pill.value);
                setTableQuery((prev) => ({ ...prev, page: 1 }));
              }}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-bold transition-all",
                typeFilter === pill.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Row 2: Search, Warehouse, Status, Low Stock Toggle */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, SKU, code..."
                value={tableQuery.search}
                onChange={(e) => {
                  setTableQuery((prev) => ({ ...prev, search: e.target.value, page: 1 }));
                }}
                className="h-9 pl-9 rounded-full text-xs bg-background/60"
              />
            </div>

            {/* Warehouse Filter */}
            <Select
              value={warehouseFilter}
              onValueChange={(val) => {
                setWarehouseFilter(val);
                setTableQuery((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <SelectTrigger className="h-9 rounded-full text-xs w-full sm:w-[170px] bg-background/60">
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {(options?.warehouses || []).map((w: { id: number; name: string }) => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setTableQuery((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <SelectTrigger className="h-9 rounded-full text-xs w-full sm:w-[130px] bg-background/60">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
              </SelectContent>
            </Select>

            {/* Low Stock Toggle */}
            <div className="flex items-center gap-2 pl-2 border-l border-border/40">
              <Switch
                id="low_stock_only"
                checked={lowStockOnly}
                onCheckedChange={(checked) => {
                  setLowStockOnly(checked);
                  setTableQuery((prev) => ({ ...prev, page: 1 }));
                }}
              />
              <label
                htmlFor="low_stock_only"
                className="text-xs font-semibold cursor-pointer text-muted-foreground select-none"
              >
                Low Stock Only
              </label>
            </div>
          </div>

          {/* Bulk Operations */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in">
              <span className="text-xs font-bold text-muted-foreground">
                {selectedIds.length} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs h-8"
                onClick={() => bulkStatusMutation.mutate("active")}
                disabled={bulkStatusMutation.isPending}
              >
                Mark Active
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs h-8"
                onClick={() => bulkStatusMutation.mutate("inactive")}
                disabled={bulkStatusMutation.isPending}
              >
                Mark Inactive
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="rounded-full text-xs h-8 shadow-sm"
                    disabled={bulkDeleteMutation.isPending}
                  >
                    Delete Selected
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2rem] border-border/60 bg-background/95 backdrop-blur-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {selectedIds.length} Selected Goods?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove the selected goods from the catalog and delete their associated stock records. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-xl text-xs bg-destructive hover:bg-destructive/90"
                      onClick={() => bulkDeleteMutation.mutate()}
                    >
                      Confirm Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </section>

      {/* Goods Table */}
      <DataTable
        columns={columns}
        data={goodsList}
        totalEntries={totalEntries}
        loading={loadingGoods || fetchingGoods}
        pageIndex={tableQuery.page}
        pageSize={tableQuery.pageSize}
        onQueryChange={(nextQ: DataTableQuery) => {
          setTableQuery((prev) => ({
            ...prev,
            page: nextQ.page,
            pageSize: nextQ.pageSize || prev.pageSize,
            search: nextQ.search,
            sortCol: nextQ.sortCol || prev.sortCol,
            sortDir: nextQ.sortDir || prev.sortDir,
          }));
        }}
        enableRowSelection
        selectedRowIds={rowSelection}
        onSelectionChange={(payload) => {
          setRowSelection(payload.selectedRowIds);
          const ids = Object.keys(payload.selectedRowIds)
            .filter((k) => payload.selectedRowIds[k])
            .map((k) => goodsList[Number(k)]?.id)
            .filter(Boolean) as number[];
          setSelectedIds(ids);
        }}
        searchPlaceholder="Filter goods..."
        emptyMessage={
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-2xl bg-muted/30 p-4 mb-3 text-muted-foreground">
              <Boxes className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold">No Goods or Raw Materials Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              There are no goods matching the selected filters. Create a new material or clear filters to view inventory.
            </p>
            <Button
              size="sm"
              className="rounded-full px-4 text-xs font-bold"
              onClick={handleOpenCreate}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add First Raw Material
            </Button>
          </div>
        }
      />

      {/* Good Form Modal (Create / Edit) */}
      <GoodFormModal
        open={formModalOpen}
        mode={formModalMode}
        goodId={selectedGoodId}
        onClose={() => {
          setFormModalOpen(false);
          setSelectedGoodId(null);
        }}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["inventory", "goods"] });
        }}
      />

      {/* Good Stock Adjust & Transfer Dialog */}
      {adjustSelectedGood && (
        <GoodStockAdjustDialog
          open={adjustDialogOpen}
          good={adjustSelectedGood}
          initialTab={adjustDialogInitialTab}
          onClose={() => {
            setAdjustDialogOpen(false);
            setAdjustSelectedGood(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["inventory", "goods"] });
          }}
        />
      )}

      {/* Delete Single Good Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-border/60 bg-background/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Raw Material?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{goodToDelete?.name}</strong> ({goodToDelete?.sku})?
              This action will remove all associated stock allocations and transaction logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl text-xs bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (goodToDelete) {
                  deleteMutation.mutate(goodToDelete.id);
                }
              }}
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
