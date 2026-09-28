"use client";

import Link from "next/link";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/store/use-translation";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteInventoryEntityRecord,
  fetchInventoryEntityRecord,
  updateInventoryEntityRecord,
} from "@/modules/inventory/api";
import type { InventoryEntityRecord } from "@/modules/inventory/types";
import { notifyMutationOutcome } from "@/modules/workflow/utils/mutation-outcome";

type GoodForm = {
  name: string;
  code: string;
  sku: string;
  uom: string;
  description: string;
  is_active: boolean;
};

const readPayloadString = (record: InventoryEntityRecord, key: string): string => {
  const payload = record.payload;
  if (!payload || typeof payload !== "object") return "";
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
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

export default function InventoryGoodDetailPage({ goodId }: { goodId: number }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = React.useState(false);
  const [form, setForm] = React.useState<GoodForm>({
    name: "",
    code: "",
    sku: "",
    uom: "",
    description: "",
    is_active: true,
  });

  const detailQuery = useQuery({
    queryKey: ["inventory", "goods", "detail", goodId],
    queryFn: () => fetchInventoryEntityRecord("goods", goodId),
  });

  const saveMutation = useMutation({
    mutationFn: async () =>
      updateInventoryEntityRecord("goods", goodId, {
        name: form.name.trim(),
        code: form.code.trim() || null,
        is_active: form.is_active,
        payload: {
          sku: form.sku.trim() || null,
          uom: form.uom.trim() || null,
          description: form.description.trim() || null,
        },
      }),
    onSuccess: (data) => {
      notifyMutationOutcome(data, {
        savedMessage: t("inventory.common.saved", "Good updated."),
        submittedMessage: t("workflow.submitted_for_approval", "Submitted for approval."),
        queryClient,
      });
      queryClient.invalidateQueries({ queryKey: ["inventory", "goods"] });
      setEditOpen(false);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, t("inventory.common.failed", "Failed to save good.")));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteInventoryEntityRecord("goods", goodId),
    onSuccess: (data) => {
      const outcome = notifyMutationOutcome(data, {
        savedMessage: t("inventory.common.deleted", "Good deleted."),
        submittedMessage: t("workflow.submitted_for_approval", "Submitted for approval."),
        queryClient,
      });
      queryClient.invalidateQueries({ queryKey: ["inventory", "goods"] });
      if (outcome === "saved") {
        window.location.href = "/dashboard/inventory/catalog/goods";
      }
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, t("inventory.common.failed", "Failed to delete good.")));
    },
  });

  const openEdit = React.useCallback(() => {
    const good = detailQuery.data;
    if (!good) return;
    setForm({
      name: good.name,
      code: good.code ?? "",
      sku: readPayloadString(good, "sku"),
      uom: readPayloadString(good, "uom"),
      description: readPayloadString(good, "description"),
      is_active: good.is_active,
    });
    setEditOpen(true);
  }, [detailQuery.data]);

  if (detailQuery.isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("inventory.goods.loading_detail", "Loading good detail...")}
      </div>
    );
  }

  const good = detailQuery.data;
  if (!good) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">{t("inventory.goods.not_found", "Good not found.")}</p>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/dashboard/inventory/catalog/goods">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("inventory.goods.back_to_list", "Back to goods")}
          </Link>
        </Button>
      </div>
    );
  }

  const sku = readPayloadString(good, "sku");
  const uom = readPayloadString(good, "uom");
  const description = readPayloadString(good, "description");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" className="h-auto -ml-2 px-2 py-1 text-muted-foreground">
            <Link href="/dashboard/inventory/catalog/goods">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("inventory.goods.back_to_list", "Back to goods")}
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">{good.name}</h1>
            <Badge variant={good.is_active ? "default" : "secondary"}>
              {good.is_active
                ? t("inventory.common.active", "active")
                : t("inventory.common.inactive", "inactive")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {good.code || t("inventory.common.no_code", "No code")}
            {sku ? ` · SKU ${sku}` : ""}
            {uom ? ` · ${uom}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full" onClick={openEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            {t("inventory.common.edit", "Edit")}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="rounded-full" disabled={deleteMutation.isPending}>
                <Trash2 className="mr-2 h-4 w-4" />
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
                  onClick={() => deleteMutation.mutate()}
                >
                  {t("inventory.common.confirm", "Confirm Delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-border/60 bg-card/40 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("inventory.goods.catalog_card", "Catalog Info")}
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("inventory.common.name", "Name")}</dt>
              <dd className="font-medium text-right">{good.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("inventory.common.code", "Code")}</dt>
              <dd className="font-medium text-right">
                {good.code || t("inventory.common.not_set", "Not set")}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("inventory.goods.sku_label", "SKU")}</dt>
              <dd className="font-medium text-right">
                {sku || t("inventory.common.not_set", "Not set")}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("inventory.goods.uom_label", "Unit of Measure")}</dt>
              <dd className="font-medium text-right">
                {uom || t("inventory.common.not_set", "Not set")}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("inventory.common.database_id", "Database ID")}</dt>
              <dd className="font-medium text-right">{good.id}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-[1.5rem] border border-border/60 bg-card/40 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("inventory.common.description", "Description")}
          </h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {description || t("inventory.common.none", "None")}
          </p>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">
                {t("inventory.goods.edit_title", "Edit Good")}
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
              <Label htmlFor="detail-good-name">{t("inventory.goods.name_label", "Good Name")}</Label>
              <Input
                id="detail-good-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="detail-good-code">{t("inventory.common.code", "Code")}</Label>
                <Input
                  id="detail-good-code"
                  value={form.code}
                  onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-good-sku">{t("inventory.goods.sku_label", "SKU")}</Label>
                <Input
                  id="detail-good-sku"
                  value={form.sku}
                  onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="detail-good-uom">{t("inventory.goods.uom_label", "Unit of Measure")}</Label>
              <Input
                id="detail-good-uom"
                value={form.uom}
                onChange={(event) => setForm((prev) => ({ ...prev, uom: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="detail-good-description">
                {t("inventory.common.description", "Description")}
              </Label>
              <Textarea
                id="detail-good-description"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="detail-good-active"
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, is_active: checked === true }))
                }
              />
              <Label htmlFor="detail-good-active" className="cursor-pointer">
                {t("inventory.goods.active_label", "Good is active")}
              </Label>
            </div>
          </div>

          <DialogFooter className="border-t border-border/40 bg-muted/20 px-6 py-4">
            <Button variant="outline" className="rounded-full" onClick={() => setEditOpen(false)}>
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
              {t("inventory.common.save", "Save Good")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
