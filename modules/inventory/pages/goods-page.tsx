"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/store/use-translation";

import { DataTable, type DataTableQuery } from "@/components/datatable/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createInventoryEntityRecord,
  deleteInventoryEntityRecord,
  fetchInventoryEntityRecords,
  updateInventoryEntityRecord,
} from "@/modules/inventory/api";
import type { InventoryEntityRecord } from "@/modules/inventory/types";
import { notifyBulkDeleteOutcomes, notifyMutationOutcome } from "@/modules/workflow/utils/mutation-outcome";

type TableQueryState = {
  page: number;
  pageSize: number;
  search: string;
  sortCol: string;
  sortDir: "asc" | "desc";
};

type GoodForm = {
  id?: number;
  name: string;
  code: string;
  sku: string;
  uom: string;
  description: string;
  is_active: boolean;
};

const DEFAULT_QUERY: TableQueryState = {
  page: 1,
  pageSize: 10,
  search: "",
  sortCol: "name",
  sortDir: "asc",
};

const DEFAULT_FORM: GoodForm = {
  name: "",
  code: "",
  sku: "",
  uom: "",
  description: "",
  is_active: true,
};

const readPayloadString = (record: InventoryEntityRecord, key: string): string => {
  const payload = record.payload;
  if (!payload || typeof payload !== "object") return "";
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
};

export default function InventoryGoodsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tableQuery, setTableQuery] = React.useState<TableQueryState>(DEFAULT_QUERY);
  const [selectedRowIds, setSelectedRowIds] = React.useState<RowSelectionState>({});
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<GoodForm>(DEFAULT_FORM);

  const goodsQuery = useQuery({
    queryKey: ["inventory", "goods", tableQuery],
    queryFn: () =>
      fetchInventoryEntityRecords("goods", {
        search: tableQuery.search || undefined,
        page: tableQuery.page,
        per_page: tableQuery.pageSize,
        sort_col: tableQuery.sortCol,
        sort_dir: tableQuery.sortDir,
      }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        is_active: form.is_active,
        payload: {
          sku: form.sku.trim() || null,
          uom: form.uom.trim() || null,
          description: form.description.trim() || null,
        },
      };

      if (form.id) {
        return updateInventoryEntityRecord("goods", form.id, payload);
      }

      return createInventoryEntityRecord("goods", payload);
    },
    onSuccess: (data) => {
      notifyMutationOutcome(data, {
        savedMessage: form.id
          ? t("inventory.common.saved", "Good updated.")
          : t("inventory.common.saved", "Good created."),
        submittedMessage: t("workflow.submitted_for_approval", "Submitted for approval."),
        queryClient,
      });
      queryClient.invalidateQueries({ queryKey: ["inventory", "goods"] });
      setSelectedRowIds({});
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? t("inventory.common.failed", "Failed to save good."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteInventoryEntityRecord("goods", id),
    onSuccess: (data) => {
      notifyMutationOutcome(data, {
        savedMessage: t("inventory.common.deleted", "Good deleted."),
        submittedMessage: t("workflow.submitted_for_approval", "Submitted for approval."),
        queryClient,
      });
      queryClient.invalidateQueries({ queryKey: ["inventory", "goods"] });
      setSelectedRowIds({});
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? t("inventory.common.failed", "Failed to delete good."));
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
        sortCol: String(query.sortCol || "name"),
        sortDir: query.sortDir === "desc" ? "desc" : "asc",
      });
    },
    [applyTableQuery]
  );

  const clearSelection = React.useCallback(() => setSelectedRowIds({}), []);

  const openCreate = React.useCallback(() => {
    setForm(DEFAULT_FORM);
    setOpen(true);
  }, []);

  const openEdit = React.useCallback((good: InventoryEntityRecord) => {
    setForm({
      id: good.id,
      name: good.name,
      code: good.code ?? "",
      sku: readPayloadString(good, "sku"),
      uom: readPayloadString(good, "uom"),
      description: readPayloadString(good, "description"),
      is_active: good.is_active,
    });
    setOpen(true);
  }, []);

  const closeModal = React.useCallback(() => {
    setOpen(false);
    setForm(DEFAULT_FORM);
  }, []);

  const exportUrl = React.useMemo(() => {
    const params = new URLSearchParams();
    if (tableQuery.search) params.set("search", tableQuery.search);
    params.set("sortCol", tableQuery.sortCol);
    params.set("sortDir", tableQuery.sortDir);
    return `/api/v1/inventory/goods/export?${params.toString()}`;
  }, [tableQuery.search, tableQuery.sortCol, tableQuery.sortDir]);

  const columns = React.useMemo<ColumnDef<InventoryEntityRecord>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("inventory.goods.col_name", "Good"),
        cell: ({ row }) => {
          const good = row.original;
          return (
            <div>
              <Link
                href={`/dashboard/inventory/catalog/goods/${good.id}`}
                className="font-semibold hover:underline"
              >
                {good.name}
              </Link>
              <p className="text-xs text-muted-foreground">
                {good.code || t("inventory.common.no_code", "No code")}
              </p>
            </div>
          );
        },
      },
      {
        id: "sku",
        header: t("inventory.goods.col_sku", "SKU"),
        enableSorting: false,
        cell: ({ row }) => readPayloadString(row.original, "sku") || "—",
      },
      {
        id: "uom",
        header: t("inventory.goods.col_uom", "UOM"),
        enableSorting: false,
        cell: ({ row }) => readPayloadString(row.original, "uom") || "—",
      },
      {
        accessorKey: "is_active",
        header: t("inventory.common.status", "Status"),
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "secondary"}>
            {row.original.is_active
              ? t("inventory.common.active", "active")
              : t("inventory.common.inactive", "inactive")}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: t("inventory.common.actions", "Actions"),
        enableSorting: false,
        cell: ({ row }) => {
          const good = row.original;
          return (
            <div className="flex justify-start gap-2">
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => openEdit(good)}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                {t("inventory.common.edit", "Edit")}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="rounded-full"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    {t("inventory.common.delete", "Delete")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2rem] border-border/60 bg-background/95 backdrop-blur-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("inventory.goods.delete_confirm_title", "Delete Good?")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t(
                        "inventory.goods.delete_confirm_desc",
                        "This will permanently delete the raw material record."
                      )}{" "}
                      <strong>{good.name}</strong>.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">
                      {t("inventory.common.cancel", "Cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-xl bg-destructive hover:bg-destructive/90"
                      onClick={() => deleteMutation.mutate(good.id)}
                    >
                      {t("inventory.common.confirm", "Confirm Delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        },
        meta: { align: "left" as const },
      },
    ],
    [deleteMutation, openEdit, t]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            {t("inventory.goods.title", "Goods (Raw Materials)")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "inventory.goods.subtitle",
              "Master data for raw materials used in procurement, batches, and stock operations."
            )}
          </p>
        </div>
        <Button className="rounded-full px-5" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("inventory.goods.add_btn", "Add Good")}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={goodsQuery.data?.data ?? []}
        totalEntries={goodsQuery.data?.total ?? 0}
        loading={goodsQuery.isLoading || goodsQuery.isFetching}
        exportEndpoint={exportUrl}
        pageIndex={tableQuery.page}
        pageSize={tableQuery.pageSize}
        enableRowSelection
        selectedRowIds={selectedRowIds}
        onSelectionChange={(payload) => setSelectedRowIds(payload.selectedRowIds as RowSelectionState)}
        onDeleteRows={async (rows) => {
          if (rows.length === 0) return;
          const results = await Promise.all(rows.map((row) => deleteMutation.mutateAsync(row.id)));
          notifyBulkDeleteOutcomes(results, {
            savedMessage: (count) =>
              `${count} ${t("inventory.goods.bulk_deleted_msg", "good(s) deleted.")}`,
            submittedMessage: t("workflow.submitted_for_approval", "Submitted for approval."),
            queryClient,
          });
          clearSelection();
        }}
        onQueryChange={handleTableQueryChange}
        onRefresh={() => {
          clearSelection();
          queryClient.invalidateQueries({ queryKey: ["inventory", "goods"] });
        }}
        onResetFilters={() => {
          applyTableQuery(DEFAULT_QUERY);
          clearSelection();
        }}
        searchPlaceholder={t(
          "inventory.goods.search_placeholder",
          "Search goods by name or code..."
        )}
        resourceName="goods"
        syncWithUrl={false}
      />

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeModal();
            return;
          }
          setOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-xl rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">
                {form.id
                  ? t("inventory.goods.edit_title", "Edit Good")
                  : t("inventory.goods.create_title", "Create Good")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "inventory.goods.modal_desc",
                  "Define a raw material with optional SKU and unit of measure."
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="good-name">{t("inventory.goods.name_label", "Good Name")}</Label>
              <Input
                id="good-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Wheat Flour"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="good-code">{t("inventory.common.code", "Code")}</Label>
                <Input
                  id="good-code"
                  value={form.code}
                  onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                  placeholder="RM-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="good-sku">{t("inventory.goods.sku_label", "SKU")}</Label>
                <Input
                  id="good-sku"
                  value={form.sku}
                  onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
                  placeholder="SKU-FLOUR-25KG"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="good-uom">{t("inventory.goods.uom_label", "Unit of Measure")}</Label>
              <Input
                id="good-uom"
                value={form.uom}
                onChange={(event) => setForm((prev) => ({ ...prev, uom: event.target.value }))}
                placeholder="kg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="good-description">
                {t("inventory.common.description", "Description")}
              </Label>
              <Textarea
                id="good-description"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder={t(
                  "inventory.goods.description_placeholder",
                  "Optional notes about this raw material..."
                )}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="good-active"
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, is_active: checked === true }))
                }
              />
              <Label htmlFor="good-active" className="cursor-pointer">
                {t("inventory.goods.active_label", "Good is active")}
              </Label>
            </div>
          </div>

          <DialogFooter className="border-t border-border/40 bg-muted/20 px-6 py-4">
            <Button variant="outline" className="rounded-full" onClick={closeModal}>
              {t("inventory.common.cancel", "Cancel")}
            </Button>
            <Button
              className="rounded-full"
              disabled={saveMutation.isPending}
              onClick={() => {
                if (!form.name.trim()) {
                  toast.error(t("inventory.goods.name_required", "Good name is required."));
                  return;
                }
                saveMutation.mutate();
              }}
            >
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {form.id
                ? t("inventory.common.save", "Save Good")
                : t("inventory.common.create", "Create Good")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
