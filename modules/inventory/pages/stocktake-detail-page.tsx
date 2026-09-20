"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2, ChevronRight, ClipboardList, Layers, Loader2, PlayCircle,
  Send, ShieldCheck, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/store/use-translation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import {
  approveStocktake, cancelStocktake, enterStocktakeLine, fetchStocktake,
  finalizeStocktake, generateStocktakeLines, submitStocktake,
} from "@/modules/inventory/api";
import type { InventoryCountLine } from "@/modules/inventory/operations-types";
import { StocktakeStatusBadge } from "@/modules/inventory/pages/stocktakes-page";

function CountLineRow({
  line,
  editable,
  canEnter,
  countId,
  onSaved,
}: {
  line: InventoryCountLine;
  editable: boolean;
  canEnter: boolean;
  countId: number;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [counted, setCounted] = React.useState<string>(line.counted_quantity ?? "");
  const [serials, setSerials] = React.useState<string>((line.observed_serials ?? []).join("\n"));

  const saveMutation = useMutation({
    mutationFn: () => {
      const observed = line.is_serial
        ? serials.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
        : undefined;
      return enterStocktakeLine(countId, line.id, {
        counted_quantity: line.is_serial ? (observed?.length ?? 0) : Number(counted || 0),
        observed_serials: observed,
      });
    },
    onSuccess: () => {
      toast.success(t("inventory.stocktake.line_saved", "Count saved."));
      onSaved();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? t("inventory.common.failed", "Failed to save count."));
    },
  });

  const variance = line.variance != null ? Number(line.variance) : null;

  return (
    <tr className="border-b border-border/40 align-top">
      <td className="py-3 pl-5 pr-3">
        <p className="font-medium">{line.good?.name ?? `#${line.good_id}`}</p>
        <p className="font-mono text-xs text-muted-foreground">{line.good?.sku ?? ""}</p>
        {line.batch_number ? <p className="font-mono text-xs text-muted-foreground">{t("inventory.common.batch", "Batch")}: {line.batch_number}</p> : null}
        {line.is_serial ? <Badge variant="outline" className="mt-1 rounded-full text-[10px]">{t("inventory.stocktake.serialized", "Serialized")}</Badge> : null}
      </td>
      <td className="py-3 pr-3 text-right font-mono">{line.snapshot_quantity ?? "—"}</td>
      <td className="py-3 pr-3">
        {line.is_serial ? (
          <Textarea
            value={serials}
            disabled={!editable || !canEnter || line.finalized}
            onChange={(e) => setSerials(e.target.value)}
            placeholder={t("inventory.stocktake.observed_placeholder", "Scan/paste serials, one per line")}
            className="min-h-[72px] w-56 font-mono text-xs"
          />
        ) : (
          <Input
            type="number"
            inputMode="decimal"
            value={counted}
            disabled={!editable || !canEnter || line.finalized}
            onChange={(e) => setCounted(e.target.value)}
            className="w-28 text-right font-mono"
          />
        )}
      </td>
      <td className="py-3 pr-3 text-right">
        {variance == null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className={cn("font-mono font-semibold", variance === 0 ? "text-muted-foreground" : variance > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
            {variance > 0 ? "+" : ""}{line.variance}
          </span>
        )}
        {line.is_serial && ((line.missing_serials?.length ?? 0) > 0 || (line.unexpected_serials?.length ?? 0) > 0) ? (
          <div className="mt-1 space-y-0.5 text-[10px]">
            {(line.missing_serials?.length ?? 0) > 0 ? (
              <p className="text-red-600 dark:text-red-400">{t("inventory.stocktake.missing", "Missing")}: {line.missing_serials!.join(", ")}</p>
            ) : null}
            {(line.unexpected_serials?.length ?? 0) > 0 ? (
              <p className="text-amber-600 dark:text-amber-400">{t("inventory.stocktake.unexpected", "Unexpected")}: {line.unexpected_serials!.join(", ")}</p>
            ) : null}
          </div>
        ) : null}
      </td>
      <td className="py-3 pr-5 text-right">
        {editable && canEnter && !line.finalized ? (
          <Button size="sm" variant="outline" className="rounded-full" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("inventory.common.save", "Save")}
          </Button>
        ) : line.finalized ? (
          <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        ) : null}
      </td>
    </tr>
  );
}

export default function StocktakeDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const queryClient = useQueryClient();
  const id = Number(params?.id);
  const { hasAnyPermission } = usePermissions();
  const canView = hasAnyPermission(["view_inventory_counts", "view_inventory", "manage_inventory"]);
  const canManage = hasAnyPermission(["manage_inventory_counts", "manage_inventory"]);
  const canEnter = hasAnyPermission(["enter_inventory_counts", "manage_inventory_counts", "manage_inventory"]);
  const canFinalize = hasAnyPermission(["finalize_inventory_counts", "manage_inventory"]);

  const [finalizeOpen, setFinalizeOpen] = React.useState(false);

  const countQuery = useQuery({
    queryKey: ["inventory", "stocktake", id],
    enabled: canView && Number.isFinite(id),
    queryFn: () => fetchStocktake(id),
  });
  const count = countQuery.data;

  const invalidate = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["inventory", "stocktake", id] });
    queryClient.invalidateQueries({ queryKey: ["inventory", "stocktakes"] });
  }, [queryClient, id]);

  const onError = (error: any) =>
    toast.error(error?.response?.data?.message ?? t("inventory.common.failed", "Action failed."));

  const generateM = useMutation({
    mutationFn: () => generateStocktakeLines(id),
    onSuccess: () => { toast.success(t("inventory.stocktake.generated", "Snapshot generated.")); invalidate(); },
    onError,
  });
  const submitM = useMutation({
    mutationFn: () => submitStocktake(id),
    onSuccess: () => { toast.success(t("inventory.stocktake.submitted", "Count submitted.")); invalidate(); },
    onError,
  });
  const approveM = useMutation({
    mutationFn: () => approveStocktake(id),
    onSuccess: () => { toast.success(t("inventory.stocktake.approved", "Count approved.")); invalidate(); },
    onError,
  });
  const finalizeM = useMutation({
    mutationFn: () => finalizeStocktake(id),
    onSuccess: () => { toast.success(t("inventory.stocktake.finalized", "Count finalized — stock adjusted.")); invalidate(); },
    onError,
  });
  const cancelM = useMutation({
    mutationFn: () => cancelStocktake(id),
    onSuccess: () => { toast.success(t("inventory.stocktake.cancelled", "Count cancelled.")); invalidate(); },
    onError,
  });

  if (countQuery.isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-72 w-full rounded-3xl" /></div>;
  }
  if (countQuery.isError || !count) {
    return (
      <Card className="mx-auto mt-10 max-w-lg rounded-3xl border-border/60 p-8 text-center">
        <ClipboardList className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h2 className="text-lg font-bold">{t("inventory.stocktake.not_found", "Stocktake not found")}</h2>
        <Button asChild variant="outline" className="mt-4 rounded-full">
          <Link href="/dashboard/inventory/stocktakes">{t("inventory.stocktake.back", "Back to stocktakes")}</Link>
        </Button>
      </Card>
    );
  }

  const status = count.status;
  const editable = status === "counting";
  const lines = count.lines ?? [];
  const varianceLines = lines.filter((l) => l.counted_quantity != null && Number(l.variance ?? 0) !== 0);
  const anyBusy = generateM.isPending || submitM.isPending || approveM.isPending || finalizeM.isPending || cancelM.isPending;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/dashboard/inventory" className="hover:underline">{t("inventory.nav.inventory", "Inventory")}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/dashboard/inventory/stocktakes" className="hover:underline">{t("inventory.stocktake.title", "Stocktakes")}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-mono font-medium text-foreground">{count.reference}</span>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-3"><ClipboardList className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="font-mono text-2xl font-black tracking-tight">{count.reference}</h1>
            <div className="mt-1 flex items-center gap-2">
              <StocktakeStatusBadge status={status} />
              <span className="text-xs capitalize text-muted-foreground">{count.count_type}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {status === "draft" && canManage ? (
            <Button className="rounded-full" disabled={anyBusy} onClick={() => generateM.mutate()}>
              {generateM.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
              {t("inventory.stocktake.generate_btn", "Generate Snapshot")}
            </Button>
          ) : null}
          {status === "counting" && canEnter ? (
            <Button className="rounded-full" disabled={anyBusy} onClick={() => submitM.mutate()}>
              {submitM.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {t("inventory.stocktake.submit_btn", "Submit")}
            </Button>
          ) : null}
          {status === "submitted" && canFinalize ? (
            <>
              <Button variant="outline" className="rounded-full" disabled={anyBusy} onClick={() => approveM.mutate()}>
                {approveM.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                {t("inventory.stocktake.approve_btn", "Approve")}
              </Button>
              <Button className="rounded-full" disabled={anyBusy} onClick={() => setFinalizeOpen(true)}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t("inventory.stocktake.finalize_btn", "Finalize")}
              </Button>
            </>
          ) : null}
          {status === "approved" && canFinalize ? (
            <Button className="rounded-full" disabled={anyBusy} onClick={() => setFinalizeOpen(true)}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t("inventory.stocktake.finalize_btn", "Finalize")}
            </Button>
          ) : null}
          {status !== "finalized" && status !== "cancelled" && canManage ? (
            <Button variant="outline" className="rounded-full text-destructive" disabled={anyBusy} onClick={() => cancelM.mutate()}>
              <XCircle className="mr-2 h-4 w-4" />
              {t("inventory.common.cancel", "Cancel")}
            </Button>
          ) : null}
        </div>
      </div>

      {status === "draft" ? (
        <Card className="rounded-3xl border-border/60 p-8 text-center">
          <PlayCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t("inventory.stocktake.draft_hint", "Generate the snapshot to capture expected quantities and create count lines.")}
          </p>
        </Card>
      ) : lines.length === 0 ? (
        <Card className="rounded-3xl border-border/60 p-8 text-center">
          <p className="text-sm text-muted-foreground">{t("inventory.stocktake.no_lines", "No count lines.")}</p>
        </Card>
      ) : (
        <Card className="rounded-3xl border-border/60 p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="px-5 py-3">{t("inventory.common.good", "Good")}</th>
                  <th className="px-3 py-3 text-right">{t("inventory.stocktake.snapshot_qty", "Snapshot")}</th>
                  <th className="px-3 py-3">{t("inventory.stocktake.counted", "Counted")}</th>
                  <th className="px-3 py-3 text-right">{t("inventory.stocktake.variance", "Variance")}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <CountLineRow
                    key={line.id}
                    line={line}
                    editable={editable}
                    canEnter={canEnter}
                    countId={id}
                    onSaved={invalidate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <AlertDialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("inventory.stocktake.finalize_confirm_title", "Finalize this count?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("inventory.stocktake.finalize_confirm_desc", "Finalizing applies every variance to canonical stock through the ledger. This cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-56 overflow-auto rounded-2xl bg-muted/40 p-3 text-sm">
            {varianceLines.length === 0 ? (
              <p className="text-muted-foreground">{t("inventory.stocktake.no_variances", "No variances — stock will be unchanged.")}</p>
            ) : (
              <ul className="space-y-1">
                {varianceLines.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{l.good?.name ?? `#${l.good_id}`}</span>
                    <span className={cn("font-mono font-semibold", Number(l.variance) > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                      {Number(l.variance) > 0 ? "+" : ""}{l.variance}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">{t("inventory.common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full"
              onClick={() => { setFinalizeOpen(false); finalizeM.mutate(); }}
            >
              {t("inventory.stocktake.confirm_finalize", "Finalize & Adjust Stock")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
