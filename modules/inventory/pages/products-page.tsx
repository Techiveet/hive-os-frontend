"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  Box,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  HelpCircle,
  Home,
  Layers,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import type { Step } from "react-joyride";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { DataTable, type DataTableQuery } from "@/components/datatable/data-table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { useTour } from "@/components/providers/tour-provider";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/store/use-translation";
import { useTenantModuleAccess } from "@/hooks/use-tenant-module-access";
import { useBusinessType } from "@/hooks/use-business-type";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  bulkUpdateInventoryProductsStatus,
  deleteInventoryProduct,
  fetchInventoryProduct,
  fetchInventoryProductOptions,
  fetchInventoryProducts,
  fetchInventoryProductSummary,
} from "@/modules/inventory/api";
import { ProductFormModal, FieldInfoPopover } from "@/modules/inventory/pages/components/product-form-modal";
import type { ProductRecord } from "@/modules/inventory/types";
import { ProductQaBatchDialog } from "@/modules/inventory/pages/components/product-qa-batch-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Model3DViewer } from "@/components/ui/model-3d-viewer";
import { getBackendStorageUrl } from "@/lib/runtime-context";
import { openSecureAssetInNewTab, SecureAssetImage } from "@/components/ui/secure-asset-image";
import { getInventoryAssetPreviewUrl } from "@/modules/inventory/lib/product-assets";
import { WorkflowTrigger } from "@/modules/workflow/components/workflow-trigger";
import { notifyBulkDeleteOutcomes, notifyMutationOutcome } from "@/modules/workflow/utils/mutation-outcome";

type SortDirection = "asc" | "desc";
type ProductStatus = "draft" | "published" | "archived";

type TableQueryState = {
  page: number;
  pageSize: number;
  search: string;
  sortCol: string;
  sortDir: SortDirection;
};

const DEFAULT_QUERY: TableQueryState = {
  page: 1,
  pageSize: 10,
  search: "",
  sortCol: "created_at",
  sortDir: "desc",
};

const STATUS_OPTIONS: ProductStatus[] = ["draft", "published", "archived"];

const getAssetNameFromPath = (value: string | null | undefined) => {
  if (!value) return null;
  const normalized = value.split("?")[0]?.replace(/\/+$/, "") ?? value;
  const segments = normalized.split("/").filter(Boolean);
  const tail = segments.at(-1) ?? normalized;

  if (tail === "serve") {
    const filesIndex = segments.lastIndexOf("files");
    const assetId = filesIndex >= 0 ? segments[filesIndex + 1] : null;
    return assetId ? `Library asset #${assetId}` : "Library asset";
  }

  return tail;
};
const formatProductDate = (value: string | null | undefined) => {
  if (!value) return "-";
  try {
    return format(new Date(value), "MMM d, yyyy");
  } catch {
    return value.substring(0, 10);
  }
};

const formatProductMoney = (value: string | number | null | undefined, currency?: string | null) => {
  if (value === null || value === undefined || value === "") return null;

  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${value} ${currency || "USD"}`;

  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency || "USD"}`;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  return fallback;
};

export default function InventoryProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { hasModule } = useTenantModuleAccess();
  const { hasBusinessType } = useBusinessType();
  const { startTour } = useTour();

  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("");
  const [stockStatusFilter, setStockStatusFilter] = React.useState<string>("");
  const [productTypeFilter, setProductTypeFilter] = React.useState<string>("");
  const [uomFilter, setUomFilter] = React.useState<string>("");

  const [tableQuery, setTableQuery] = React.useState<TableQueryState>(DEFAULT_QUERY);
  const [selectedRowIds, setSelectedRowIds] = React.useState<RowSelectionState>({});

  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<"create" | "edit" | "duplicate">("create");
  const [editingProductId, setEditingProductId] = React.useState<number | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = React.useState(false);
  const [detailProductId, setDetailProductId] = React.useState<number | null>(null);
  const [qaProduct, setQaProduct] = React.useState<ProductRecord | null>(null);
  const [bulkDeleting, setBulkDeleting] = React.useState(false);

  React.useEffect(() => {
    document.title = "Product Catalog | HIVE.OS";
  }, []);

  const summaryQuery = useQuery({
    queryKey: ["inventory", "products", "summary"],
    queryFn: fetchInventoryProductSummary,
  });

  const optionsQuery = useQuery({
    queryKey: ["inventory", "products", "options"],
    queryFn: () => fetchInventoryProductOptions(),
    staleTime: 60_000,
  });

  const activeFilterCount = React.useMemo(() => {
    return [
      Boolean(statusFilter),
      Boolean(categoryFilter),
      Boolean(stockStatusFilter),
      Boolean(productTypeFilter),
      Boolean(uomFilter),
    ].filter(Boolean).length;
  }, [categoryFilter, productTypeFilter, statusFilter, stockStatusFilter, uomFilter]);

  const selectedIds = React.useMemo(
    () =>
      Object.keys(selectedRowIds)
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0),
    [selectedRowIds]
  );

  const productsQuery = useQuery({
    queryKey: [
      "inventory",
      "products",
      tableQuery,
      statusFilter,
      categoryFilter,
      stockStatusFilter,
      productTypeFilter,
      uomFilter,
    ],
    queryFn: () =>
      fetchInventoryProducts({
        search: tableQuery.search || undefined,
        status: statusFilter || undefined,
        product_category_id: categoryFilter ? Number(categoryFilter) : undefined,
        stock_status: stockStatusFilter || undefined,
        product_type: productTypeFilter || undefined,
        uom: uomFilter || undefined,
        page: tableQuery.page,
        per_page: tableQuery.pageSize,
        sort_col: tableQuery.sortCol,
        sort_dir: tableQuery.sortDir,
      }),
  });

  const clearSelection = React.useCallback(() => setSelectedRowIds({}), []);

  const deleteMutation = useMutation({
    mutationFn: deleteInventoryProduct,
    onSuccess: (data) => {
      notifyMutationOutcome(data, {
        savedMessage: t("inventory.products.moved_to_trash", "Product moved to Trash Bin."),
        submittedMessage: t("workflow.submitted_for_approval", "Submitted for approval."),
        queryClient,
      });
      queryClient.invalidateQueries({ queryKey: ["inventory", "products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", "products", "summary"] });
      queryClient.invalidateQueries({ queryKey: ["trash-items"] });
      queryClient.invalidateQueries({ queryKey: ["trash-stats"] });
      clearSelection();
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, t("inventory.common.failed", "Failed to delete product.")));
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: number[]; status: ProductStatus }) =>
      bulkUpdateInventoryProductsStatus(ids, status),
    onSuccess: (data) => {
      notifyMutationOutcome(data, {
        savedMessage: t("inventory.common.saved", "Status updated."),
        submittedMessage: t("workflow.submitted_for_approval", "Submitted for approval."),
        queryClient,
      });
      queryClient.invalidateQueries({ queryKey: ["inventory", "products"] });
      clearSelection();
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, t("inventory.common.failed", "Failed to update status.")));
    },
  });

  const applyTableQuery = React.useCallback((nextPartial: Partial<TableQueryState>) => {
    setTableQuery((prev) => {
      const next = { ...prev, ...nextPartial };

      if (
        prev.page === next.page &&
        prev.pageSize === next.pageSize &&
        prev.search === next.search &&
        prev.sortCol === next.sortCol &&
        prev.sortDir === next.sortDir
      ) {
        return prev;
      }

      return next;
    });
  }, []);

  const handleTableQueryChange = React.useCallback(
    (query: DataTableQuery) => {
      applyTableQuery({
        page: Number(query.page || 1),
        pageSize: Number(query.pageSize || 10),
        search: String(query.search ?? ""),
        sortCol: String(query.sortCol || "created_at"),
        sortDir: query.sortDir === "asc" ? "asc" : "desc",
      });
    },
    [applyTableQuery]
  );

  const openCreate = React.useCallback(() => {
    setEditingProductId(null);
    setModalMode("create");
    setModalOpen(true);
  }, []);

  const openEdit = React.useCallback((id: number) => {
    setEditingProductId(id);
    setModalMode("edit");
    setModalOpen(true);
  }, []);

  const openDuplicate = React.useCallback((id: number) => {
    setEditingProductId(id);
    setModalMode("duplicate");
    setModalOpen(true);
  }, []);

  const closeModal = React.useCallback(() => {
    setModalOpen(false);
    setEditingProductId(null);
  }, []);

  const openDetailSheet = React.useCallback((id: number) => {
    setDetailProductId(id);
    setDetailSheetOpen(true);
  }, []);

  const closeDetailSheet = React.useCallback(() => {
    setDetailSheetOpen(false);
    setDetailProductId(null);
  }, []);

  const openQaDialog = React.useCallback((product: ProductRecord) => {
    if (product.qa_status === "qa_passed") {
      toast.info("Quality assurance has already passed for this product.");
      return;
    }
    setQaProduct(product);
  }, []);

  const closeQaDialog = React.useCallback(() => {
    setQaProduct(null);
  }, []);


  const handleBulkStatus = React.useCallback(
    (status: ProductStatus) => {
      if (selectedIds.length === 0) {
        toast.error(t("inventory.common.select_at_least_one", "Select at least one product first."));
        return;
      }

      bulkStatusMutation.mutate({ ids: selectedIds, status });
    },
    [bulkStatusMutation, selectedIds, t]
  );

  const handleBulkDelete = React.useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) {
        toast.error(t("inventory.common.select_at_least_one", "Select at least one product first."));
        return;
      }

      setBulkDeleting(true);
      try {
        const results = await Promise.all(ids.map((id) => deleteInventoryProduct(id)));
        notifyBulkDeleteOutcomes(results, {
          savedMessage: (count) => `${count} ${t("inventory.products.bulk_moved_to_trash_msg", "product(s) moved to Trash Bin.")}`,
          submittedMessage: t("workflow.submitted_for_approval", "Submitted for approval."),
          queryClient,
        });
        queryClient.invalidateQueries({ queryKey: ["inventory", "products"] });
        queryClient.invalidateQueries({ queryKey: ["inventory", "products", "summary"] });
        queryClient.invalidateQueries({ queryKey: ["trash-items"] });
        queryClient.invalidateQueries({ queryKey: ["trash-stats"] });
        clearSelection();
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, t("inventory.common.failed", "Failed to delete selected products.")));
      } finally {
        setBulkDeleting(false);
      }
    },
    [clearSelection, queryClient, t]
  );

  const columns = React.useMemo<ColumnDef<ProductRecord>[]>(
    () => {
      const cols: ColumnDef<ProductRecord>[] = [
      {
        accessorKey: "name",
        header: () => <span id="tour-products-table-anchor">{t("inventory.products.col_name", "Product")}</span>,
        size: 340,
        meta: {
          sticky: "left" as const,
          stickyOffset: 48,
          className: "w-[340px] min-w-[340px] max-w-[340px] overflow-hidden",
        },
        cell: ({ row }) => {
          const product = row.original;
          const imageUrl = getInventoryAssetPreviewUrl({
            path: product.image,
            previewUrl: product.image_preview_url,
          });

          return (
            <div className="flex items-center gap-3 w-[280px] max-w-[280px] min-w-0 overflow-hidden py-1">
              <button
                type="button"
                onClick={() => openDetailSheet(product.id)}
                className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted/40 shadow-xs transition-transform hover:scale-105"
                title={product.name}
              >
                {imageUrl ? (
                  <SecureAssetImage
                    src={imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    loadingClassName="animate-pulse bg-muted/40"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Box className="h-5 w-5" />
                  </div>
                )}
              </button>
              <div className="min-w-0 flex-1 overflow-hidden text-left">
                <button
                  type="button"
                  onClick={() => openDetailSheet(product.id)}
                  className="block w-full max-w-full text-left font-bold text-foreground hover:text-primary transition-colors text-sm leading-tight truncate"
                  title={product.name}
                >
                  <span className="block truncate">{product.name}</span>
                </button>
                <div className="flex items-center gap-2 mt-1 min-w-0 max-w-full overflow-hidden">
                  <span className="block truncate font-mono text-[11px] text-muted-foreground font-medium tracking-tight">
                    {product.sku || "No SKU"}
                  </span>
                  {product.is_variant ? (
                    <Badge variant="secondary" className="h-4 shrink-0 px-1 text-[9px] font-semibold leading-none">
                      Variant
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "sku",
        header: "SKU",
        size: 150,
        meta: {
          className: "w-[150px] min-w-[150px]",
        },
        cell: ({ row }) => (
          <div className="w-[130px] min-w-[130px]">
            <span className="font-mono text-xs text-muted-foreground block truncate">{row.original.sku || "-"}</span>
          </div>
        ),
      },
      {
        id: "category",
        header: "Product Category",
        size: 180,
        meta: {
          className: "w-[180px] min-w-[180px]",
        },
        cell: ({ row }) => {
          const cat = row.original.category;
          return (
            <div className="w-[160px] min-w-[160px]">
              {cat ? (
                <span className="inline-flex items-center text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium border border-primary/20 truncate max-w-full">
                  {cat.name}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "stock_code",
        header: "Stock Code",
        size: 140,
        meta: {
          className: "w-[140px] min-w-[140px]",
        },
        cell: ({ row }) => (
          <div className="w-[120px] min-w-[120px]">
            <span className="font-mono text-xs text-muted-foreground block truncate">{row.original.stock_code || "-"}</span>
          </div>
        ),
      },
      {
        accessorKey: "quantity",
        header: "Stock Qty",
        size: 120,
        meta: {
          align: "right" as const,
          className: "w-[120px] min-w-[120px] text-right",
        },
        cell: ({ row }) => (
          <div className="w-[100px] min-w-[100px] text-right">
            <span className={cn(
              "font-mono font-bold text-sm",
              (Number(row.original.quantity) || 0) <= (Number(row.original.reorder_point) || 0) ? "text-amber-600 dark:text-amber-400" : "text-foreground"
            )}>
              {row.original.quantity}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "unit_price",
        header: "Unit Price",
        size: 140,
        meta: {
          align: "right" as const,
          className: "w-[140px] min-w-[140px] text-right",
        },
        cell: ({ row }) => (
          <div className="w-[120px] min-w-[120px] text-right">
            <span className="font-mono font-bold text-sm text-foreground">
              {formatProductMoney(row.original.unit_price, row.original.currency) ?? "0.00"}
            </span>
          </div>
        ),
      },
      {
        id: "qa_status",
        header: "QA Status",
        size: 150,
        meta: {
          align: "center" as const,
          className: "w-[150px] min-w-[150px] text-center",
        },
        cell: ({ row }) => {
          const status = row.original.qa_status || "pending";
          
          const configs = {
            pending: { label: "Pending", icon: Clock, className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
            qa_passed: { label: "QA Passed", icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
            qa_failed: { label: "Failed", icon: XCircle, className: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
            no_batches: { label: "No Batch", icon: AlertTriangle, className: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
          };

          const config = configs[status as keyof typeof configs] || configs.pending;
          const Icon = config.icon;

          return (
            <div className="w-[130px] min-w-[130px] mx-auto flex justify-center">
              <Badge variant="outline" className={cn("flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 font-bold shadow-none text-xs", config.className)}>
                <Icon className="h-3.5 w-3.5" />
                {config.label}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: t("inventory.products.col_status", "Status"),
        size: 140,
        meta: {
          align: "center" as const,
          className: "w-[140px] min-w-[140px] text-center",
        },
        cell: ({ row }) => {
          const status = row.original.status as ProductStatus;
          return (
            <div className="w-[120px] min-w-[120px] mx-auto flex justify-center">
              <Badge
                variant={status === "published" ? "default" : "outline"}
                className="capitalize text-xs font-semibold px-2.5 py-0.5"
              >
                {t(`inventory.common.${status}`, status)}
              </Badge>
            </div>
          );
        },
      },

      {
        id: "actions",
        header: t("inventory.common.actions", "Actions"),
        enableSorting: false,
        size: 420,
        meta: {
          align: "left" as const,
          className: "w-[420px] min-w-[420px]",
        },
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div className="flex items-center justify-start gap-2 w-[400px] min-w-[400px] whitespace-nowrap py-1">
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => openDetailSheet(product.id)}>
                <Eye className="mr-1 h-3.5 w-3.5" />
                {t("inventory.common.view", "View")}
              </Button>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => openEdit(product.id)}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                {t("inventory.common.edit", "Edit")}
              </Button>
              {hasBusinessType("water-bottling") && (
                product.qa_status === "qa_passed" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="cursor-not-allowed rounded-full border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 disabled:opacity-90 font-medium"
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    QA Passed
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full border-sky-500/40 bg-sky-500/10 text-sky-600 hover:bg-sky-500/20"
                    onClick={() => openQaDialog(product)}
                  >
                    <ClipboardCheck className="mr-1 h-3.5 w-3.5" />
                    Add To QA
                  </Button>
                )
              )}
              <WorkflowTrigger
                type="Modules\\Inventory\\Models\\Product"
                id={product.id}
                name={product.name}
                status={product.workflow_status}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ["inventory", "products"] })}
                showStatusBadge={false}
              />
              {hasModule("warehouse_management") && (() => {
                const meta = (product.metadata as Record<string, any> | null | undefined) ?? {};
                const pending = (meta.pending_warehouse_assignment ?? meta.pending_shelf_assignment) as
                  | {
                      submission_id?: number;
                      location_id?: number;
                      shelf_id?: number;
                      shelf_box_id?: number;
                      location_code?: string;
                      row?: number;
                      column?: number;
                    }
                  | undefined;
                const assignment = (meta.assigned_warehouse_box ?? meta.assigned_shelf_box) as
                  | {
                      location_id?: number;
                      shelf_id?: number;
                      shelf_box_id?: number;
                      shelf_box_name?: string;
                      location_code?: string;
                      row?: number;
                      column?: number;
                    }
                  | undefined;
                const isPendingApproval = !!pending?.submission_id || !!pending?.location_id;
                const isOnShelf = !isPendingApproval && (!!assignment?.location_id || !!assignment?.shelf_id || !!assignment?.shelf_box_id);
                const shelfHref = assignment?.shelf_id
                  ? `/dashboard/warehouse/locations/boxes?highlight_parent_id=${assignment.shelf_id}`
                  : assignment?.shelf_box_id
                    ? `/dashboard/inventory/locations/shelf-boxes?search=${encodeURIComponent(assignment.shelf_box_name || "")}`
                    : `/dashboard/warehouse/locations/shelves?add_product_id=${product.id}`;
                const addHref = `/dashboard/warehouse/locations/shelves?add_product_id=${product.id}`;
                const qaBlocked =
                  hasBusinessType("water-bottling") && product.qa_status !== "qa_passed";

                return (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex tour-product-shelf-action">
                        {isPendingApproval ? (
                          <span
                            className="inline-flex items-center justify-center rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-700"
                          >
                            <Clock className="mr-1 h-3.5 w-3.5" />
                            {t("inventory.products.waiting_approval", "Waiting for approval")}
                          </span>
                        ) : (
                          <Link
                            href={isOnShelf ? shelfHref : addHref}
                            className={cn(
                              "inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                              qaBlocked
                                ? "pointer-events-none border-slate-300 bg-slate-100 text-slate-400 opacity-60"
                                : isOnShelf
                                  ? "border-blue-500/50 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
                                  : "border-emerald-500/50 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                            )}
                            onClick={(e) => {
                              if (qaBlocked) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <MapPin className="mr-1 h-3.5 w-3.5" />
                            {isOnShelf
                              ? t("inventory.products.on_shelf", "On Shelf")
                              : t("inventory.products.add_to_shelf", "Add to Shelf")}
                          </Link>
                        )}
                      </div>
                    </TooltipTrigger>
                    {qaBlocked ? (
                      <TooltipContent className="rounded-xl border-border bg-background/95 p-3 font-medium text-foreground shadow-xl backdrop-blur-md">
                        <div className="flex items-center gap-2 text-rose-500">
                          <AlertTriangle className="h-4 w-4" />
                          <span>QA approval required before shelf placement.</span>
                        </div>
                      </TooltipContent>
                    ) : isPendingApproval ? (
                      <TooltipContent className="rounded-xl border-border bg-background/95 p-3 font-medium text-foreground shadow-xl backdrop-blur-md">
                        <span>
                          {pending?.location_code
                            ? `Pending approval for ${pending.location_code}`
                            : pending?.row && pending?.column
                              ? `Pending approval for R${pending.row}C${pending.column}`
                              : "Shelf assignment is waiting for approval"}
                        </span>
                      </TooltipContent>
                    ) : isOnShelf ? (
                      <TooltipContent className="rounded-xl border-border bg-background/95 p-3 font-medium text-foreground shadow-xl backdrop-blur-md">
                        <span>
                          {assignment?.location_code
                            ? `Stored at ${assignment.location_code}`
                            : assignment?.row && assignment?.column
                              ? `Stored at R${assignment.row}C${assignment.column}`
                              : "View shelf location"}
                        </span>
                      </TooltipContent>
                    ) : null}
                  </Tooltip>
                </TooltipProvider>
                );
              })()}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="rounded-full" disabled={deleteMutation.isPending}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    {t("inventory.common.delete", "Delete")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2rem] border-border/60 bg-background/95 backdrop-blur-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("inventory.products.trash_confirm_title", "Move Product to Trash?")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("inventory.products.trash_confirm_desc", "This product will be moved to the Global Trash Bin where it can be restored or will be automatically purged after the retention policy expires.")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">{t("inventory.common.cancel", "Cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-xl bg-destructive hover:bg-destructive/90"
                      onClick={() => deleteMutation.mutate(product.id)}
                    >
                      {t("inventory.products.confirm_trash", "Move to Trash")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        },
      },
    ];
    if (!hasBusinessType("water-bottling")) {
      return cols.filter((col) => col.id !== "qa_status");
    }
    return cols;
  },
  [deleteMutation, openDetailSheet, openEdit, openQaDialog, queryClient, t, hasModule, hasBusinessType]
);

  const resetAllFilters = React.useCallback(() => {
    setStatusFilter("");
    setCategoryFilter("");
    setStockStatusFilter("");
    setProductTypeFilter("");
    setUomFilter("");
    applyTableQuery(DEFAULT_QUERY);
    clearSelection();
  }, [applyTableQuery, clearSelection]);

  const triggerPageTour = React.useCallback(() => {
    const steps: Step[] = [
      {
        target: "#tour-products-header",
        title: t("inventory.tour.products.header_title", "Products Catalog"),
        content: t(
          "inventory.tour.products.header_desc",
          "Central repository for all sellable goods, SKUs, inventory tracking rules, pricing, and packaging specifications."
        ),
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: "#tour-products-kpis",
        title: t("inventory.tour.products.kpis_title", "Catalog Telemetry & Health"),
        content: t(
          "inventory.tour.products.kpis_desc",
          "Real-time catalog metrics tracking total active items, published products, low-stock threshold breaches, and product variants. Click any card to apply quick filters."
        ),
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: "#tour-products-filters",
        title: t("inventory.tour.products.filters_title", "Multi-Dimensional Filters"),
        content: t(
          "inventory.tour.products.filters_desc",
          "Filter products simultaneously by Status (Published, Draft, Archived), Category, Stock Health (In Stock, Low Stock, Depleted), Product Type (Standard vs Variant), and Unit of Measure."
        ),
        placement: "bottom",
        skipBeacon: true,
      },
      {
        target: "#tour-products-bulk-actions",
        title: t("inventory.tour.products.bulk_title", "Batch Operations"),
        content: t(
          "inventory.tour.products.bulk_desc",
          "Select multiple products via row checkboxes to bulk publish, set to draft, archive, or delete with unified workflow validation."
        ),
        placement: "top",
        skipBeacon: true,
      },
      {
        target: "#tour-products-table-anchor",
        title: t("inventory.tour.products.table_title", "Products Master Table"),
        content: t(
          "inventory.tour.products.table_desc",
          "Interactive catalog view with product photos, SKUs, stock levels, unit pricing, QA compliance indicators, and direct actions."
        ),
        placement: "top",
        skipBeacon: true,
      },
      {
        target: ".tour-product-shelf-action",
        title: t("inventory.tour.products.shelf_title", "Warehouse & Shelf Allocation"),
        content: t(
          "inventory.tour.products.shelf_desc",
          "Direct integration with Warehouse Management — assign products to specific warehouse shelves, compartments, or bins, or inspect active shelf locations."
        ),
        placement: "left",
        skipBeacon: true,
      },
      {
        target: "#tour-products-create-btn",
        title: t("inventory.tour.products.create_title", "Create New Product"),
        content: t(
          "inventory.tour.products.create_desc",
          "Launch the comprehensive product builder to create standard items or multi-attribute variants with barcode generation and 3D AR models."
        ),
        placement: "left",
        skipBeacon: true,
      },
    ];

    const activeSteps = steps.filter((step) => {
      const target = step.target as unknown;
      if (typeof target === "string") {
        return Boolean(document.querySelector(target));
      }
      return target instanceof HTMLElement && target.isConnected;
    });

    startTour(activeSteps);
  }, [startTour, t]);

  const exportUrl = React.useMemo(() => {
    const params = new URLSearchParams();
    if (tableQuery.search) params.set("search", tableQuery.search);
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("product_category_id", categoryFilter);
    if (stockStatusFilter) params.set("stock_status", stockStatusFilter);
    if (productTypeFilter) params.set("product_type", productTypeFilter);
    if (uomFilter) params.set("uom", uomFilter);
    params.set("sortCol", tableQuery.sortCol);
    params.set("sortDir", tableQuery.sortDir);
    return `/inventory/products/export?${params.toString()}`;
  }, [
    categoryFilter,
    productTypeFilter,
    statusFilter,
    stockStatusFilter,
    tableQuery.search,
    tableQuery.sortCol,
    tableQuery.sortDir,
    uomFilter,
  ]);

  return (
    <div className="space-y-6 pb-8">
      {/* Topbar Action Row: Page Tour & Breadcrumbs */}
      <div className="mb-4 flex w-full items-center justify-end gap-3">
        <Button
          id="tour-products-page-tour-trigger"
          variant="outline"
          size="sm"
          onClick={triggerPageTour}
          className="h-8 rounded-lg border-border/50 bg-background/50 text-muted-foreground shadow-sm backdrop-blur-md hover:text-foreground text-xs"
        >
          <HelpCircle className="mr-2 h-4 w-4" />{" "}
          {t("global.page_tour", "Page Tour")}
        </Button>

        <Breadcrumbs
          items={[
            {
              label: "Hive.OS",
              href: "/dashboard",
              icon: <Home className="h-4 w-4" />,
            },
            {
              label: t("nav.inventory", "Inventory"),
              href: "/dashboard/inventory",
            },
            {
              label: t("inventory.catalog.title", "Catalog"),
              href: "/dashboard/inventory/overview",
            },
            { label: t("inventory.products.title", "Products Catalog") },
          ]}
        />
      </div>

      {/* Header Cockpit Card */}
      <section
        id="tour-products-header"
        className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-card/40 p-7 shadow-sm backdrop-blur-md"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-3xl font-black tracking-tight text-transparent">
                {t("inventory.products.title", "Product Catalog")}
              </h1>
              <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5">
                <Sparkles className="mr-1 h-3 w-3" /> Live Catalog
              </Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {t("inventory.products.subtitle", "Manage your product inventory, pricing, stock levels, variants, and shelf allocations.")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="ghost" className="h-9 rounded-full text-xs font-semibold text-primary hover:bg-primary/10">
              <Link href="/dashboard/inventory/overview">
                {t("inventory.overview.title", "Operations Cockpit")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-9 rounded-full text-xs shadow-sm hover:border-destructive/40 hover:text-destructive">
              <Link href="/dashboard/trash">
                <Trash2 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                {t("nav.trash", "Trash Bin")}
              </Link>
            </Button>
            <Button id="tour-products-create-btn" className="rounded-full px-5 shadow-sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t("inventory.products.add_btn", "Create Product")}
            </Button>
          </div>
        </div>
      </section>

      {/* Catalog Telemetry & Quick Views */}
      <section id="tour-products-kpis" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Products */}
        <button
          type="button"
          aria-pressed={!statusFilter && !stockStatusFilter && !productTypeFilter}
          onClick={() => {
            setStatusFilter("");
            setStockStatusFilter("");
            setProductTypeFilter("");
            applyTableQuery({ page: 1 });
            clearSelection();
          }}
          className={cn(
            "group relative overflow-hidden rounded-[1.5rem] border border-border/40 bg-card/30 p-5 text-left backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md",
            !statusFilter && !stockStatusFilter && !productTypeFilter
              ? "border-primary/50 ring-1 ring-primary/20"
              : "hover:border-primary/30"
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-70" />
          <div className="relative flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("inventory.products.total_catalog", "Total Products")}
            </span>
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div className="relative mt-3 text-2xl font-black tabular-nums tracking-tight text-foreground">
            {summaryQuery.isLoading ? <Skeleton className="h-7 w-16" /> : (summaryQuery.data?.totals.products ?? 0)}
          </div>
          <div className="relative mt-1 text-[11px] text-muted-foreground">
            {summaryQuery.data?.catalog.categories ?? 0} {t("inventory.products.categories_in_use", "categories")} · {summaryQuery.data?.catalog.tags ?? 0} tags
          </div>
        </button>

        {/* Published Live */}
        <button
          type="button"
          aria-pressed={statusFilter === "published"}
          onClick={() => {
            setStatusFilter(statusFilter === "published" ? "" : "published");
            applyTableQuery({ page: 1 });
            clearSelection();
          }}
          className={cn(
            "group relative overflow-hidden rounded-[1.5rem] border border-border/40 bg-card/30 p-5 text-left backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md",
            statusFilter === "published"
              ? "border-emerald-500/60 ring-1 ring-emerald-500/30 bg-emerald-500/5"
              : "hover:border-emerald-500/30"
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/15 to-transparent opacity-70" />
          <div className="relative flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("inventory.products.published_live", "Published Live")}
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="relative mt-3 text-2xl font-black tabular-nums tracking-tight text-foreground">
            {summaryQuery.isLoading ? <Skeleton className="h-7 w-16" /> : (summaryQuery.data?.totals.published ?? 0)}
          </div>
          <div className="relative mt-1 text-[11px] text-muted-foreground">
            {summaryQuery.data?.totals.draft ?? 0} draft · {summaryQuery.data?.totals.archived ?? 0} archived
          </div>
        </button>

        {/* Low Stock Breaches */}
        <button
          type="button"
          aria-pressed={stockStatusFilter === "low_stock"}
          onClick={() => {
            setStockStatusFilter(stockStatusFilter === "low_stock" ? "" : "low_stock");
            applyTableQuery({ page: 1 });
            clearSelection();
          }}
          className={cn(
            "group relative overflow-hidden rounded-[1.5rem] border border-border/40 bg-card/30 p-5 text-left backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md",
            stockStatusFilter === "low_stock"
              ? "border-amber-500/60 ring-1 ring-amber-500/30 bg-amber-500/5"
              : "hover:border-amber-500/30"
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/15 to-transparent opacity-70" />
          <div className="relative flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("inventory.products.low_stock_alerts", "Low Stock Alerts")}
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="relative mt-3 text-2xl font-black tabular-nums tracking-tight text-foreground">
            {summaryQuery.isLoading ? <Skeleton className="h-7 w-16" /> : (summaryQuery.data?.totals.low_stock ?? 0)}
          </div>
          <div className="relative mt-1 text-[11px] text-muted-foreground">
            {t("inventory.products.reorder_breaches_desc", "At or below safety reorder point")}
          </div>
        </button>

        {/* Product Variants */}
        <button
          type="button"
          aria-pressed={productTypeFilter === "variant"}
          onClick={() => {
            setProductTypeFilter(productTypeFilter === "variant" ? "" : "variant");
            applyTableQuery({ page: 1 });
            clearSelection();
          }}
          className={cn(
            "group relative overflow-hidden rounded-[1.5rem] border border-border/40 bg-card/30 p-5 text-left backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md",
            productTypeFilter === "variant"
              ? "border-sky-500/60 ring-1 ring-sky-500/30 bg-sky-500/5"
              : "hover:border-sky-500/30"
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/15 to-transparent opacity-70" />
          <div className="relative flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("inventory.products.product_variants", "Product Variants")}
            </span>
            <Layers className="h-4 w-4 text-sky-500" />
          </div>
          <div className="relative mt-3 text-2xl font-black tabular-nums tracking-tight text-foreground">
            {summaryQuery.isLoading ? <Skeleton className="h-7 w-16" /> : (summaryQuery.data?.totals.variants ?? 0)}
          </div>
          <div className="relative mt-1 text-[11px] text-muted-foreground">
            {t("inventory.products.variants_sub", "Child SKUs & configuration options")}
          </div>
        </button>
      </section>

      {/* Advanced Multi-Dimensional Filter Bar & Bulk Actions */}
      <section
        id="tour-products-filters"
        className="rounded-[2rem] border border-border/40 bg-card/40 p-5 shadow-sm backdrop-blur-md"
      >
        <div className="flex flex-col gap-4">
          {/* Header Row: Label, Active Filter Count, Reset */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-foreground">
                {t("inventory.products.filter_catalog", "Filter Products")}
              </span>
              {activeFilterCount > 0 ? (
                <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px] font-bold">
                  {activeFilterCount} {t("inventory.common.active", "active")}
                </Badge>
              ) : null}
            </div>

            {activeFilterCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAllFilters}
                className="h-7 rounded-full text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="mr-1.5 h-3 w-3" />
                {t("inventory.common.reset_filters", "Reset All")}
              </Button>
            ) : null}
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {/* Status Filter */}
            <div className="space-y-1">
              <label htmlFor="products-status-filter" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("inventory.common.status", "Status")}
              </label>
              <select
                id="products-status-filter"
                className="h-9 w-full rounded-xl border border-muted-foreground/80 bg-background/50 px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  applyTableQuery({ page: 1 });
                  clearSelection();
                }}
              >
                <option value="">{t("inventory.common.all_statuses", "All statuses")}</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {t(`inventory.common.${status}`, status.charAt(0).toUpperCase() + status.slice(1))}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="space-y-1">
              <label htmlFor="products-category-filter" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("inventory.products.category", "Category")}
              </label>
              <select
                id="products-category-filter"
                className="h-9 w-full rounded-xl border border-muted-foreground/80 bg-background/50 px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  applyTableQuery({ page: 1 });
                  clearSelection();
                }}
              >
                <option value="">{t("inventory.products.all_categories", "All Categories")}</option>
                {(optionsQuery.data?.categories ?? []).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock Level Filter */}
            <div className="space-y-1">
              <label htmlFor="products-stock-filter" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("inventory.products.stock_level", "Stock Level")}
              </label>
              <select
                id="products-stock-filter"
                className="h-9 w-full rounded-xl border border-muted-foreground/80 bg-background/50 px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                value={stockStatusFilter}
                onChange={(e) => {
                  setStockStatusFilter(e.target.value);
                  applyTableQuery({ page: 1 });
                  clearSelection();
                }}
              >
                <option value="">{t("inventory.products.all_stock_levels", "All Stock Levels")}</option>
                <option value="in_stock">{t("inventory.products.in_stock", "In Stock (> 0)")}</option>
                <option value="low_stock">{t("inventory.products.low_stock", "Low Stock (≤ Reorder)")}</option>
                <option value="out_of_stock">{t("inventory.products.out_of_stock", "Out of Stock (0)")}</option>
              </select>
            </div>

            {/* Product Type Filter */}
            <div className="space-y-1">
              <label htmlFor="products-type-filter" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("inventory.products.product_type", "Product Type")}
              </label>
              <select
                id="products-type-filter"
                className="h-9 w-full rounded-xl border border-muted-foreground/80 bg-background/50 px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                value={productTypeFilter}
                onChange={(e) => {
                  setProductTypeFilter(e.target.value);
                  applyTableQuery({ page: 1 });
                  clearSelection();
                }}
              >
                <option value="">{t("inventory.products.all_types", "All Product Types")}</option>
                <option value="standard">{t("inventory.products.standard_only", "Standard / Parent Products")}</option>
                <option value="variant">{t("inventory.products.variants_only", "Variants Only")}</option>
              </select>
            </div>

            {/* Unit of Measure (UOM) Filter */}
            <div className="space-y-1">
              <label htmlFor="products-uom-filter" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("inventory.products.uom", "Unit of Measure")}
              </label>
              <select
                id="products-uom-filter"
                className="h-9 w-full rounded-xl border border-muted-foreground/80 bg-background/50 px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                value={uomFilter}
                onChange={(e) => {
                  setUomFilter(e.target.value);
                  applyTableQuery({ page: 1 });
                  clearSelection();
                }}
              >
                <option value="">{t("inventory.products.all_units", "All Units (UOM)")}</option>
                {(optionsQuery.data?.uom_options ?? []).map((uom) => (
                  <option key={uom} value={uom}>
                    {uom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filter Pills */}
          {activeFilterCount > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground mr-1">Active:</span>
              {statusFilter ? (
                <Badge variant="outline" className="rounded-full bg-background/70 gap-1 text-[11px] font-semibold">
                  Status: {statusFilter}
                  <button
                    type="button"
                    aria-label={t("inventory.products.remove_status_filter", "Remove status filter")}
                    onClick={() => { setStatusFilter(""); applyTableQuery({ page: 1 }); }}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                  >
                    <X aria-hidden="true" className="h-3 w-3" />
                  </button>
                </Badge>
              ) : null}
              {categoryFilter ? (
                <Badge variant="outline" className="rounded-full bg-background/70 gap-1 text-[11px] font-semibold">
                  Category: {optionsQuery.data?.categories?.find((c) => String(c.id) === categoryFilter)?.name ?? categoryFilter}
                  <button
                    type="button"
                    aria-label={t("inventory.products.remove_category_filter", "Remove category filter")}
                    onClick={() => { setCategoryFilter(""); applyTableQuery({ page: 1 }); }}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                  >
                    <X aria-hidden="true" className="h-3 w-3" />
                  </button>
                </Badge>
              ) : null}
              {stockStatusFilter ? (
                <Badge variant="outline" className="rounded-full bg-background/70 gap-1 text-[11px] font-semibold">
                  Stock: {stockStatusFilter.replace("_", " ")}
                  <button
                    type="button"
                    aria-label={t("inventory.products.remove_stock_filter", "Remove stock filter")}
                    onClick={() => { setStockStatusFilter(""); applyTableQuery({ page: 1 }); }}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                  >
                    <X aria-hidden="true" className="h-3 w-3" />
                  </button>
                </Badge>
              ) : null}
              {productTypeFilter ? (
                <Badge variant="outline" className="rounded-full bg-background/70 gap-1 text-[11px] font-semibold">
                  Type: {productTypeFilter}
                  <button
                    type="button"
                    aria-label={t("inventory.products.remove_product_type_filter", "Remove product type filter")}
                    onClick={() => { setProductTypeFilter(""); applyTableQuery({ page: 1 }); }}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                  >
                    <X aria-hidden="true" className="h-3 w-3" />
                  </button>
                </Badge>
              ) : null}
              {uomFilter ? (
                <Badge variant="outline" className="rounded-full bg-background/70 gap-1 text-[11px] font-semibold">
                  UOM: {uomFilter}
                  <button
                    type="button"
                    aria-label={t("inventory.products.remove_uom_filter", "Remove unit of measure filter")}
                    onClick={() => { setUomFilter(""); applyTableQuery({ page: 1 }); }}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                  >
                    <X aria-hidden="true" className="h-3 w-3" />
                  </button>
                </Badge>
              ) : null}
            </div>
          ) : null}

          {/* Bulk Action Controls */}
          <div
            id="tour-products-bulk-actions"
            className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {selectedIds.length > 0 ? (
                  <span className="font-semibold text-foreground">
                    {selectedIds.length} {t("inventory.common.selected", "selected")}
                  </span>
                ) : (
                  t("inventory.common.select_rows_for_bulk", "Select rows to perform batch actions:")
                )}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full text-xs"
                disabled={selectedIds.length === 0 || bulkStatusMutation.isPending}
                onClick={() => handleBulkStatus("draft")}
              >
                {t("inventory.products.mark_draft", "Mark Draft")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full text-xs"
                disabled={selectedIds.length === 0 || bulkStatusMutation.isPending}
                onClick={() => handleBulkStatus("published")}
              >
                {t("inventory.products.mark_published", "Mark Published")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full text-xs"
                disabled={selectedIds.length === 0 || bulkStatusMutation.isPending}
                onClick={() => handleBulkStatus("archived")}
              >
                {t("inventory.products.mark_archived", "Mark Archived")}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 rounded-full text-xs shadow-sm"
                    disabled={selectedIds.length === 0 || bulkDeleting || deleteMutation.isPending}
                  >
                    {bulkDeleting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
                    {t("inventory.products.move_to_trash_selected", "Move to Trash")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2rem] border-border/60 bg-background/95 backdrop-blur-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("inventory.products.trash_selected_title", "Move Selected Products to Trash?")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("inventory.products.trash_selected_desc", "The selected products will be moved to the Global Trash Bin where they can be restored or will be automatically purged after the retention policy expires.")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">{t("inventory.common.cancel", "Cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-xl bg-destructive hover:bg-destructive/90"
                      onClick={() => handleBulkDelete(selectedIds)}
                    >
                      {t("inventory.products.confirm_trash", "Move to Trash")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </section>

      {/* Products Master Data Table */}
      <div id="tour-products-table">
        <DataTable
          columns={columns}
          data={productsQuery.data?.data ?? []}
          totalEntries={productsQuery.data?.total ?? 0}
          loading={productsQuery.isLoading || productsQuery.isFetching}
          exportEndpoint={exportUrl}
          pageIndex={tableQuery.page}
          pageSize={tableQuery.pageSize}
          pageSizeOptions={[5, 10, 25, 50, 100]}
          enableRowSelection
          selectedRowIds={selectedRowIds}
          tableClassName="min-w-[1800px]"
          onSelectionChange={(payload) => setSelectedRowIds(payload.selectedRowIds as RowSelectionState)}
          onDeleteRows={async (rows) => {
            if (rows.length === 0) return;
            await handleBulkDelete(rows.map((row) => row.id));
          }}
          onQueryChange={handleTableQueryChange}
          onRefresh={() => {
            clearSelection();
            queryClient.invalidateQueries({ queryKey: ["inventory", "products"] });
          }}
          onResetFilters={resetAllFilters}
          searchPlaceholder={t("inventory.products.search_placeholder", "Search by name, SKU, or stock code...")}
          resourceName="products"
          syncWithUrl={false}
        />
      </div>

      <ProductFormModal
        open={modalOpen}
        mode={modalMode}
        productId={editingProductId}
        onClose={closeModal}
      />
      <ProductQaBatchDialog
        open={Boolean(qaProduct)}
        product={qaProduct}
        onClose={closeQaDialog}
      />

      {detailProductId && (
        <ProductDetailSheet 
          productId={detailProductId} 
          open={detailSheetOpen} 
          onClose={closeDetailSheet} 
          onEdit={(id: number) => { closeDetailSheet(); openEdit(id); }} 
          onDuplicate={(id: number) => { closeDetailSheet(); openDuplicate(id); }} 
          onDelete={(id: number) => { closeDetailSheet(); deleteMutation.mutate(id); }}
          onAddToQa={(product: ProductRecord) => {
            closeDetailSheet();
            openQaDialog(product);
            router.prefetch("/dashboard/inventory/qa");
          }}
        />
      )}

    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/50 bg-card/40 p-4">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function ReadOnlyField({
  label,
  value,
  placeholder = "—",
  required,
  className,
  mono,
  info,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  placeholder?: string;
  required?: boolean;
  className?: string;
  mono?: boolean;
  info?: string;
  children?: React.ReactNode;
}) {
  const hasContent = value !== undefined && value !== null && value !== "";

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center gap-1.5 select-none">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
          {required ? <span className="text-destructive text-red-500 font-bold ml-1">*</span> : null}
        </Label>
        <FieldInfoPopover label={label} required={required} info={info} />
      </div>
      {children ? (
        children
      ) : (
        <div
          className={cn(
            "flex min-h-9 w-full items-center rounded-xl border border-input/60 bg-muted/20 px-3 py-1.5 text-sm font-medium text-foreground",
            mono && "font-mono font-semibold text-xs tracking-wide",
            !hasContent && "text-muted-foreground/60 italic font-normal"
          )}
        >
          {hasContent ? value : placeholder}
        </div>
      )}
    </div>
  );
}

function ProductDetailSheet({
  productId,
  open,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onAddToQa,
}: {
  productId: number;
  open: boolean;
  onClose: () => void;
  onEdit: (id: number) => void;
  onDuplicate: (id: number) => void;
  onDelete?: (id: number) => void;
  onAddToQa: (product: ProductRecord) => void;
}) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { hasBusinessType } = useBusinessType();
  const { hasModule } = useTenantModuleAccess();
  const [activeMediaTab, setActiveMediaTab] = React.useState<"image" | "model">("image");

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "products", "detail", productId],
    queryFn: () => fetchInventoryProduct(productId),
    enabled: open,
    staleTime: 0,
    gcTime: 0,
  });

  const product = data?.product;
  const imageUrl = getInventoryAssetPreviewUrl({
    path: product?.image,
    previewUrl: product?.image_preview_url,
  });
  const modelUrl = getInventoryAssetPreviewUrl({
    path: product?.model_3d_path,
    previewUrl: product?.model_3d_preview_url,
  });
  const barcodeUrl = getBackendStorageUrl(product?.barcode_path);
  const countryLabel = data?.country_name || product?.country_of_origin || "Not specified";
  const currencyCode = product?.currency || "USD";
  const modelLabel = getAssetNameFromPath(product?.model_3d_path) || "3D Model Asset";

  const attributeRows = Array.isArray(product?.attributes)
    ? product.attributes.filter((attr) => attr.key || attr.value)
    : Object.entries((product?.attributes ?? {}) as Record<string, unknown>).map(([key, value]) => ({
        key,
        value: String(value ?? ""),
      }));

  const nutritionRows = Array.isArray(product?.nutritional_info)
    ? product.nutritional_info.filter((info) => info.key || info.value)
    : Object.entries((product?.nutritional_info ?? {}) as Record<string, unknown>).map(([key, value]) => ({
        key,
        value: String(value ?? ""),
      }));

  const handleOpenAsset = async (assetUrl: string | null, failureMessage: string) => {
    if (!assetUrl) return;
    try {
      await openSecureAssetInNewTab(assetUrl);
    } catch {
      toast.error(failureMessage);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[92vh] max-h-[92vh] flex-col overflow-hidden rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl sm:max-w-[1200px]"
      >
        {/* Header matching ProductFormModal */}
        <div className="border-b border-border/40 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl font-black tracking-tight">
                  {product?.name ?? (isLoading ? "Loading product..." : "Product Details")}
                </DialogTitle>
                {product?.status ? (
                  <Badge
                    variant={
                      product.status === "published"
                        ? "default"
                        : product.status === "draft"
                        ? "secondary"
                        : "outline"
                    }
                    className={cn(
                      "capitalize text-xs font-bold px-2 py-0.5",
                      product.status === "published" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                      product.status === "draft" && "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    )}
                  >
                    {product.status}
                  </Badge>
                ) : null}
              </div>
              <DialogDescription>
                Detailed specifications, inventory rules, pricing, compliance, and product media.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2 shrink-0">
              {product ? (
                <>
                  {hasBusinessType("water-bottling") && (
                    product.qa_status === "qa_passed" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="hidden sm:inline-flex cursor-not-allowed rounded-full border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 disabled:opacity-90 text-xs font-semibold"
                      >
                        <CheckCircle2 className="mr-1.5 size-3.5" />
                        QA Passed
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAddToQa(product)}
                        className="hidden sm:inline-flex rounded-full border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 text-xs font-semibold"
                      >
                        <ClipboardCheck className="mr-1.5 size-3.5" />
                        QA Inspection
                      </Button>
                    )
                  )}
                  <WorkflowTrigger
                    type="Modules\\Inventory\\Models\\Product"
                    id={product.id}
                    name={product.name}
                    status={product.workflow_status}
                    onSuccess={() => queryClient.invalidateQueries({ queryKey: ["inventory", "products"] })}
                    showStatusBadge={false}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDuplicate(product.id)}
                    className="hidden sm:inline-flex rounded-full text-xs font-medium"
                  >
                    <Copy className="mr-1.5 size-3.5" />
                    Duplicate
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onEdit(product.id)}
                    className="rounded-full gap-1.5 text-xs font-semibold shadow-xs"
                  >
                    <Pencil className="size-3.5" />
                    Edit Product
                  </Button>
                </>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center p-12 text-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading product data...
          </div>
        ) : product ? (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 lg:grid-cols-12">
              {/* Left Column (8 cols): Mirroring Form */}
              <div className="space-y-4 lg:col-span-8">
                {/* 1. Basic Information */}
                <SectionCard title="Basic Information">
                  <div className="grid gap-3 md:grid-cols-2">
                    <ReadOnlyField label="Product Name" required value={product.name} />
                    <ReadOnlyField label="SKU" required value={product.sku} mono />
                    <ReadOnlyField label="Stock Code" value={product.stock_code} mono />
                    <ReadOnlyField label="Barcode (GTIN / UPC)" value={product.barcode} mono />
                    <div className="md:col-span-2">
                      <ReadOnlyField label="Description">
                        <div className="min-h-[90px] w-full rounded-xl border border-input/60 bg-muted/20 p-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                          {product.description || <span className="text-muted-foreground/60 italic font-normal">No description provided</span>}
                        </div>
                      </ReadOnlyField>
                    </div>
                  </div>
                </SectionCard>

                {/* 2. Compliance & Nutrition */}
                <SectionCard title="Compliance & Nutrition">
                  <div className="grid gap-3 md:grid-cols-2">
                    <ReadOnlyField label="HS Code (Customs)" value={product.hs_code} mono />
                    <ReadOnlyField label="Country of Origin" value={countryLabel} />
                    <div className="md:col-span-2">
                      <ReadOnlyField label="Nutritional Facts">
                        {nutritionRows.length > 0 ? (
                          <div className="space-y-2">
                            {nutritionRows.map((row, index) => (
                              <div key={`nutrition-${index}`} className="grid gap-2 grid-cols-2">
                                <div className="flex h-9 items-center rounded-xl border border-input/60 bg-muted/20 px-3 text-xs font-semibold text-muted-foreground uppercase">
                                  {row.key}
                                </div>
                                <div className="flex h-9 items-center rounded-xl border border-input/60 bg-muted/20 px-3 text-xs font-bold text-foreground">
                                  {row.value}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex h-9 items-center rounded-xl border border-input/60 bg-muted/20 px-3 text-xs text-muted-foreground/60 italic">
                            No nutritional facts recorded
                          </div>
                        )}
                      </ReadOnlyField>
                    </div>
                  </div>
                </SectionCard>

                {/* 3. Pricing */}
                <SectionCard title="Pricing">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <ReadOnlyField label="Currency" required value={currencyCode} />
                    <ReadOnlyField label="Cost of Good" value={formatProductMoney(product.cost_of_good, currencyCode) || `0.00 ${currencyCode}`} />
                    <ReadOnlyField label="Unit Price" required value={formatProductMoney(product.unit_price, currencyCode)} />
                    <ReadOnlyField label="Sale Price" value={product.sale_price ? formatProductMoney(product.sale_price, currencyCode) : "None"} />
                    <ReadOnlyField label="Tax Rate (%)" value={`${product.tax_rate ?? 15}%`} />
                  </div>
                </SectionCard>

                {/* 4. Inventory */}
                <SectionCard title="Inventory">
                  <div className="grid gap-3 md:grid-cols-3">
                    <ReadOnlyField label="Reorder Point" value={`${product.reorder_point ?? 0}`} />
                    <ReadOnlyField label="Stock Quantity" value={`${Number(product.quantity || 0).toLocaleString()} ${product.unit || "unit"}`} />
                    <ReadOnlyField label="Units per Package / Case" value={`${product.units_per_package || 1}`} />
                    <div className="md:col-span-3">
                      <div className="flex flex-wrap items-center gap-6 pt-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={Boolean(product.track_inventory)} disabled className="cursor-default" />
                          <span className="text-sm font-medium text-foreground">Track inventory</span>
                          <FieldInfoPopover label="Track inventory" />
                          <Badge variant="outline" className={cn("text-[10px] ml-1 font-semibold", product.track_inventory ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" : "text-muted-foreground")}>
                            {product.track_inventory ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox checked={Boolean(product.allow_backorders)} disabled className="cursor-default" />
                          <span className="text-sm font-medium text-foreground">Allow backorders</span>
                          <FieldInfoPopover label="Allow backorders" />
                          <Badge variant="outline" className={cn("text-[10px] ml-1 font-semibold", product.allow_backorders ? "border-blue-500/30 text-blue-600 bg-blue-500/10" : "text-muted-foreground")}>
                            {product.allow_backorders ? "Allowed" : "Not Allowed"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {barcodeUrl ? (
                      <div className="md:col-span-3 space-y-1.5 pt-1">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scannable Barcode</Label>
                        <div className="inline-block rounded-xl border border-input/60 bg-white p-2 shadow-xs">
                          <img src={barcodeUrl} alt={`Barcode ${product.barcode}`} className="h-16 rounded-md border border-border bg-white p-1 object-contain" />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </SectionCard>

                {/* 5. Shipping & Packaging */}
                <SectionCard title="Shipping & Packaging">
                  <div className="grid gap-3 md:grid-cols-2">
                    <ReadOnlyField label="Unit of Measure" required value={product.unit || product.uom || "unit"} />
                    <ReadOnlyField label="Weight" value={product.weight ? `${product.weight} kg` : "—"} />
                    <ReadOnlyField label="Length" value={product.length ? `${product.length} cm` : "—"} />
                    <ReadOnlyField label="Width" value={product.width ? `${product.width} cm` : "—"} />
                    <div className="md:col-span-2">
                      <ReadOnlyField label="Height" value={product.height ? `${product.height} cm` : "—"} />
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* Right Column (4 cols): Mirroring Form */}
              <div className="space-y-4 lg:col-span-4">
                {/* 6. Organization */}
                <SectionCard title="Organization">
                  <div className="space-y-3">
                    <ReadOnlyField label="Status" required>
                      <div className="flex h-9 items-center">
                        <Badge
                          variant={product.status === "published" ? "default" : product.status === "draft" ? "secondary" : "outline"}
                          className="capitalize text-xs font-bold"
                        >
                          {product.status}
                        </Badge>
                      </div>
                    </ReadOnlyField>

                    <ReadOnlyField label="Product Category" value={product.category?.name || "Uncategorized"} />

                    {hasBusinessType("water-bottling") && (
                      <ReadOnlyField label="QA Status">
                        <div className="flex h-9 items-center">
                          {product.qa_status === "qa_passed" ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold gap-1 text-xs">
                              <CheckCircle2 className="h-3 w-3" /> QA Passed
                            </Badge>
                          ) : product.qa_status === "qa_failed" ? (
                            <Badge className="bg-rose-500/10 text-rose-600 border border-rose-500/20 font-bold gap-1 text-xs">
                              <XCircle className="h-3 w-3" /> QA Failed
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 font-bold gap-1 text-xs">
                              <Clock className="h-3 w-3" /> QA Pending
                            </Badge>
                          )}
                        </div>
                      </ReadOnlyField>
                    )}

                    {hasModule("warehouse_management") && (() => {
                      const meta = (product.metadata as Record<string, any> | null | undefined) ?? {};
                      const assignment = (meta.assigned_warehouse_box ?? meta.assigned_shelf_box) as Record<string, any> | undefined;
                      const isAssigned = !!assignment?.location_id || !!assignment?.shelf_id || !!assignment?.shelf_box_id;
                      const locName = assignment?.shelf_box_name || assignment?.location_code || (assignment?.row && assignment?.column ? `R${assignment.row}C${assignment.column}` : null);

                      return (
                        <ReadOnlyField label="Shelf Placement">
                          <div className="flex h-9 items-center">
                            {isAssigned ? (
                              <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/20 font-bold gap-1 text-xs">
                                <MapPin className="h-3 w-3" /> {locName ? `Stored in ${locName}` : "On Shelf"}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground/60 italic">Not placed on shelf</span>
                            )}
                          </div>
                        </ReadOnlyField>
                      );
                    })()}

                    <ReadOnlyField label="Tags">
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {product.tags && product.tags.length > 0 ? (
                          product.tags.map((tag) => (
                            <Badge key={tag.id} variant="secondary" className="text-xs font-medium px-2 py-0.5 rounded-md">
                              #{tag.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic">No tags assigned</span>
                        )}
                      </div>
                    </ReadOnlyField>
                  </div>
                </SectionCard>

                {/* 7. Media & Visuals */}
                <SectionCard title="Media & Visuals">
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 select-none">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Product Asset
                          </Label>
                          <FieldInfoPopover label="Product Image" />
                        </div>
                        {modelUrl && imageUrl ? (
                          <div className="flex items-center rounded-lg bg-muted p-0.5 text-[10px] font-semibold">
                            <button
                              type="button"
                              onClick={() => setActiveMediaTab("image")}
                              className={cn(
                                "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                                activeMediaTab === "image" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              Photo
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveMediaTab("model")}
                              className={cn(
                                "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                                activeMediaTab === "model" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              3D Spatial
                            </button>
                          </div>
                        ) : null}
                      </div>

                      <div className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-dashed border-border/60 bg-muted/10">
                        {activeMediaTab === "model" && modelUrl ? (
                          <Model3DViewer
                            src={modelUrl}
                            alt={modelLabel}
                            className="h-full w-full"
                            viewerClassName="h-full w-full"
                            emptyTitle="3D Model"
                            emptyDescription="Interactive 3D model available."
                            showOpenButton={true}
                          />
                        ) : imageUrl ? (
                          <>
                            <SecureAssetImage
                              src={imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loadingClassName="animate-pulse bg-muted/40"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="rounded-full shadow-md text-xs font-semibold gap-1.5"
                                onClick={() => handleOpenAsset(imageUrl, "Failed to open image")}
                              >
                                <ExternalLink className="size-3.5" />
                                View Full Image
                              </Button>
                            </div>
                          </>
                        ) : modelUrl ? (
                          <Model3DViewer
                            src={modelUrl}
                            alt={modelLabel}
                            className="h-full w-full"
                            viewerClassName="h-full w-full"
                            emptyTitle="3D Model"
                            emptyDescription="Interactive 3D model available."
                            showOpenButton={true}
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center space-y-3 p-6 text-center text-muted-foreground">
                            <Package className="size-10 stroke-[1.2] text-muted-foreground/40" />
                            <div>
                              <p className="text-xs font-semibold">No media uploaded</p>
                              <p className="text-[11px] text-muted-foreground/60">Photo or 3D asset not provided</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {/* 8. Parent & Variants */}
                <SectionCard title="Parent & Variants">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={Boolean(product.parent_product_id || (product.variants && product.variants.length > 0))}
                        disabled
                        className="cursor-default"
                      />
                      <span className="text-sm font-medium text-foreground">This product has variants</span>
                      <FieldInfoPopover label="This product has variants" />
                    </div>

                    {product.parent_product_id ? (
                      <ReadOnlyField label="Parent Product" value={product.parent?.name || `ID #${product.parent_product_id}`} />
                    ) : null}

                    {attributeRows.length > 0 ? (
                      <div className="space-y-2 pt-1">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attributes</Label>
                        <div className="space-y-2">
                          {attributeRows.map((row, idx) => (
                            <div key={`attr-${idx}`} className="grid gap-2 grid-cols-2">
                              <div className="flex h-9 items-center rounded-xl border border-input/60 bg-muted/20 px-3 text-xs font-semibold text-muted-foreground">
                                {row.key}
                              </div>
                              <div className="flex h-9 items-center rounded-xl border border-input/60 bg-muted/20 px-3 text-xs font-bold text-foreground">
                                {row.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </SectionCard>

                {/* 9. System Audit */}
                <SectionCard title="Audit Information">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">Product ID</span>
                      <span className="font-mono font-bold text-foreground">{product.id}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">Workflow Status</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">
                        {product.workflow_status || "Standard"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium text-foreground" suppressHydrationWarning>{formatProductDate(product.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-muted-foreground">Last Updated</span>
                      <span className="font-medium text-foreground" suppressHydrationWarning>{formatProductDate(product.updated_at)}</span>
                    </div>
                  </div>
                </SectionCard>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-12 text-center">
            <Package className="size-10 text-muted-foreground/40 mb-3" />
            <h3 className="text-base font-bold text-foreground mb-1">Product Not Found</h3>
            <p className="text-xs text-muted-foreground">The requested product could not be loaded.</p>
          </div>
        )}

        {/* Footer matching ProductFormModal */}
        <DialogFooter className="sticky bottom-0 mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/40 bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-full" onClick={onClose}>
              Close
            </Button>
            {product && onDelete ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="rounded-full gap-1.5 shadow-sm">
                    <Trash2 className="h-3.5 w-3.5" /> Move to Trash
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2rem] border-border/60 bg-background/95 backdrop-blur-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("inventory.products.trash_confirm_title", "Move Product to Trash?")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("inventory.products.trash_confirm_desc", "This product will be moved to the Global Trash Bin where it can be restored or will be automatically purged after the retention policy expires.")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">{t("inventory.common.cancel", "Cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-xl bg-destructive hover:bg-destructive/90"
                      onClick={() => onDelete(product.id)}
                    >
                      {t("inventory.products.confirm_trash", "Move to Trash")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
          {product ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-full gap-1.5"
                onClick={() => onDuplicate(product.id)}
              >
                <Copy className="h-3.5 w-3.5" /> Duplicate
              </Button>
              <Button
                className="rounded-full gap-1.5"
                onClick={() => onEdit(product.id)}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Product
              </Button>
            </div>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
