"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  Loader2,
  CheckCircle2,
  SplitSquareHorizontal,
  Banknote,
  MapPin,
  CalendarDays,
  Plus,
  Trash2,
  FileText,
  LockOpen,
  Lock,
  History,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import {
  splitHospitalityBill,
  closeHospitalityOrder,
  fetchHospitalityCashierSessions,
  openHospitalityCashierSession,
  closeHospitalityCashierSession,
  fetchHospitalityBillSplits,
  approveHospitalityCashierSession,
} from "@/modules/hospitality/api";
import type { HospitalityCashierSession } from "@/modules/hospitality/api";
import type { HospitalityServiceOrder } from "@/modules/hospitality/types";
import { cn } from "@/lib/utils";
import { notifyMutationOutcome } from "@/modules/workflow/utils/mutation-outcome";
import InvoiceDialog from "@/modules/hospitality/components/invoice-dialog";
import { DataTable } from "@/components/datatable/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import api from "@/modules/shared/api/http";
import { usePermissions } from "@/hooks/use-permissions";

type PaymentSplit = {
  split_name: string;
  amount: string;
  tip_amount: string;
  payment_method: string;
  payment_reference: string;
};

const NON_CASH_METHODS = new Set(["card", "telebirr", "chapa", "arifpay", "cbe", "other"]);

const emptySplit = (name = "Guest 1", amount = "", method = "cash"): PaymentSplit => ({
  split_name: name,
  amount,
  tip_amount: "0",
  payment_method: method,
  payment_reference: "",
});

function firstValidationMessage(error: any): string {
  const errors = error?.response?.data?.errors;
  if (errors && typeof errors === "object") {
    const first = Object.values(errors).flat()[0];
    if (typeof first === "string" && first.trim()) return first;
  }
  return error?.response?.data?.message || "Failed to record bill split";
}

export default function CheckoutPage() {
  const queryClient = useQueryClient();
  const { hasAnyPermission } = usePermissions();
  const canViewBilling = hasAnyPermission([
    "view_hospitality_billing",
    "manage_hospitality_billing",
  ]);
  const canRecordPayment = hasAnyPermission([
    "create_hospitality_billing",
    "manage_hospitality_billing",
  ]);
  const canCloseOrder = hasAnyPermission([
    "close_hospitality_service_orders",
    "manage_hospitality_service_orders",
  ]);
  const canExportOrders = hasAnyPermission([
    "export_hospitality_reports",
    "manage_hospitality_service_orders",
  ]);
  const canOpenCashier = hasAnyPermission([
    "open_hospitality_cashier_sessions",
    "manage_hospitality_cashier_sessions",
  ]);
  const canCloseCashier = hasAnyPermission([
    "close_hospitality_cashier_sessions",
    "manage_hospitality_cashier_sessions",
  ]);
  const canViewCashier = hasAnyPermission([
    "view_hospitality_cashier_sessions",
    "manage_hospitality_cashier_sessions",
    "open_hospitality_cashier_sessions",
  ]);
  const canManageCashier = hasAnyPermission(["manage_hospitality_cashier_sessions"]);

  const [selectedOrder, setSelectedOrder] = useState<HospitalityServiceOrder | null>(null);
  const [isSplitDialogOpen, setIsSplitDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<HospitalityServiceOrder | null>(null);
  const [paidAmount, setPaidAmount] = useState(0);
  const [splitRequestKey, setSplitRequestKey] = useState<string | null>(null);
  const [openingFloat, setOpeningFloat] = useState("500");
  const [closingCash, setClosingCash] = useState("");
  const [discrepancyReason, setDiscrepancyReason] = useState("");
  const [isCloseSessionOpen, setIsCloseSessionOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tableKey] = useState(0);

  const openInvoiceDialog = (order: HospitalityServiceOrder) => {
    setInvoiceOrder(order);
    setIsInvoiceDialogOpen(true);
  };

  const handleQueryChange = React.useCallback((q: any) => {
    if (q.page !== undefined) setPage(q.page);
    if (q.pageSize !== undefined) setPageSize(q.pageSize);
    if (q.search !== undefined) {
      setSearch((prev) => {
        if (prev !== q.search) {
          setPage(1);
        }
        return q.search;
      });
    }
    if (q.sortCol) setSortCol(q.sortCol);
    if (q.sortDir) setSortDir(q.sortDir);
  }, []);

  const { data, isLoading: isLoadingOrders } = useQuery({
    queryKey: [
      "hospitality",
      "service-orders",
      page,
      pageSize,
      search,
      sortCol,
      sortDir,
      statusFilter,
    ],
    queryFn: async () => {
      const params: Record<string, any> = {
        page,
        per_page: pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;
      if (sortCol) {
        params.sortCol = sortCol;
        params.sortDir = sortDir;
      }

      const res = await api.get("/hospitality/service-orders", { params });
      return {
        rows: res.data?.data || [],
        total: res.data?.meta?.total || res.data?.total || 0,
      };
    },
  });

  const { data: cashierSessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ["hospitality", "cashier-sessions", "open"],
    enabled: canViewCashier,
    queryFn: () => fetchHospitalityCashierSessions({ status: "open" }),
    refetchInterval: 30_000,
  });

  const { data: billSplitSummary } = useQuery({
    queryKey: ["hospitality", "bill-splits", selectedOrder?.id],
    enabled: isSplitDialogOpen && selectedOrder !== null,
    queryFn: () => fetchHospitalityBillSplits(selectedOrder!.id),
  });

  const { data: sessionHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["hospitality", "cashier-sessions", "history"],
    enabled: canViewCashier,
    queryFn: () => fetchHospitalityCashierSessions({ status: "history", limit: 25 }),
    refetchInterval: 60_000,
  });

  const myOpenSession = useMemo(
    () => cashierSessions.find((session) => session.status === "open") ?? null,
    [cashierSessions],
  );

  const formatEtb = (value: number | string | null | undefined) =>
    `ETB ${Number(value ?? 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const sessionStatusBadge = (session: HospitalityCashierSession) => {
    if (session.status === "pending_approval") {
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
          Pending approval
        </Badge>
      );
    }
    if (session.status === "closed") {
      const diff = Math.abs(Number(session.difference ?? 0));
      return diff > 0.009 ? (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Closed · variance</Badge>
      ) : (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Closed · balanced</Badge>
      );
    }
    return <Badge variant="outline">{session.status}</Badge>;
  };

  const [splits, setSplits] = useState<PaymentSplit[]>([emptySplit()]);

  const closeOrderMutation = useMutation({
    mutationFn: closeHospitalityOrder,
    onSuccess: (data) => {
      notifyMutationOutcome(data, {
        savedMessage: "Order closed successfully",
        submittedMessage: "Order close submitted for approval",
        queryClient,
      });
      queryClient.invalidateQueries({ queryKey: ["hospitality", "service-orders"] });
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to close order");
    },
  });

  const openSessionMutation = useMutation({
    mutationFn: () =>
      openHospitalityCashierSession({
        opening_float: Number(openingFloat) || 0,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["hospitality", "cashier-sessions"] });
      toast.success(result.message || "Cashier session opened");
    },
    onError: (error: any) => {
      if (error?.response?.status === 409) {
        queryClient.invalidateQueries({ queryKey: ["hospitality", "cashier-sessions"] });
        toast.message(error?.response?.data?.message || "You already have an open cashier session");
        return;
      }
      toast.error(error?.response?.data?.message || "Failed to open cashier session");
    },
  });

  const closeSessionMutation = useMutation({
    mutationFn: () => {
      if (!myOpenSession) throw new Error("No open session");
      return closeHospitalityCashierSession(myOpenSession.id, {
        actual_cash: Number(closingCash) || 0,
        ...(Math.abs(Number(closingCash) - expectedCash) > 0.009
          ? { discrepancy_reason: discrepancyReason.trim() }
          : {}),
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["hospitality", "cashier-sessions"] });
      toast.success(result.message || "Cashier session closed");
      setIsCloseSessionOpen(false);
      setClosingCash("");
      setDiscrepancyReason("");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to close cashier session");
    },
  });

  const approveSessionMutation = useMutation({
    mutationFn: (id: number) => approveHospitalityCashierSession(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["hospitality", "cashier-sessions"] });
      toast.success(result.message || "Cashier reconciliation approved");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to approve cashier session");
    },
  });

  const splitBillMutation = useMutation({
    mutationFn: ({ orderId, payload }: { orderId: number; payload: Record<string, unknown> }) =>
      splitHospitalityBill(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitality", "service-orders"] });
      queryClient.invalidateQueries({ queryKey: ["hospitality", "cashier-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["hospitality", "bill-splits", selectedOrder?.id] });
      toast.success("Payments recorded");
      setIsSplitDialogOpen(false);
      setSplits([emptySplit()]);
      setPaidAmount(0);
      setSplitRequestKey(null);
    },
    onError: (error: any) => {
      toast.error(firstValidationMessage(error));
    },
  });

  const handleAddSplit = () => {
    setSplits([...splits, emptySplit(`Guest ${splits.length + 1}`, "", "card")]);
  };

  const handleRemoveSplit = (index: number) => {
    setSplits(splits.filter((_, i) => i !== index));
  };

  const handleUpdateSplit = (index: number, field: keyof PaymentSplit, value: string) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setSplits(newSplits);
  };

  const handleAutoSplit = () => {
    if (!selectedOrder) return;
    const outstanding = Number(selectedOrder.total_amount) - paidAmount;
    const amountPerPerson = (outstanding / splits.length).toFixed(2);
    const newSplits = splits.map((s) => ({ ...s, amount: amountPerPerson }));
    setSplits(newSplits);
  };

  const needsCashSession = splits.some((split) => split.payment_method === "cash");
  const missingNonCashRefs = splits.some(
    (split) => NON_CASH_METHODS.has(split.payment_method) && !split.payment_reference.trim(),
  );

  const handleSubmitSplit = () => {
    if (!selectedOrder) return;

    if (needsCashSession && !myOpenSession) {
      toast.error("Open a cashier session before recording cash payments.");
      return;
    }

    if (missingNonCashRefs) {
      toast.error("Enter the Telebirr / card / bank reference for each non-cash payment.");
      return;
    }

    splitBillMutation.mutate({
      orderId: selectedOrder.id,
      payload: {
        idempotency_key: splitRequestKey,
        splits: splits.map((split) => ({
          split_name: split.split_name,
          amount: Number(split.amount),
          tip_amount: Number(split.tip_amount || 0),
          payment_method: split.payment_method,
          payment_reference: split.payment_reference.trim() || undefined,
          cashier_session_id:
            split.payment_method === "cash" && myOpenSession
              ? myOpenSession.id
              : undefined,
        })),
      },
    });
  };

  const openSplitDialog = (order: HospitalityServiceOrder) => {
    setSelectedOrder(order);
    setSplitRequestKey(crypto.randomUUID());
    setSplits([emptySplit("Guest 1", String(order.total_amount), "cash")]);
    setIsSplitDialogOpen(true);
  };

  React.useEffect(() => {
    if (!selectedOrder || !billSplitSummary) return;
    setPaidAmount(Number(billSplitSummary.total_paid) || 0);
    setSplits((current) => {
      if (
        current.length !== 1 ||
        Number(current[0]?.amount || 0) !== Number(selectedOrder.total_amount)
      ) {
        return current;
      }
      return [{ ...current[0], amount: String(billSplitSummary.remaining) }];
    });
  }, [billSplitSummary, selectedOrder]);

  const columns: ColumnDef<HospitalityServiceOrder>[] = [
    {
      id: "order_number",
      accessorKey: "order_number",
      header: "Order Details",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-foreground">{row.original.order_number}</div>
          <div className="text-xs text-muted-foreground mt-1 flex gap-2 items-center">
            <Banknote className="h-3 w-3" />
            {row.original.items?.length || 0} items
          </div>
        </div>
      ),
    },
    {
      id: "location",
      header: "Location & Reservation",
      cell: ({ row }) => (
        <div>
          <div className="text-sm flex items-center gap-1 font-medium">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            {row.original.location?.name || `Table ${row.original.location_id}`}
          </div>
          {row.original.reservation_id && (
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              Reservation #{row.original.reservation_id}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(
            "capitalize",
            row.original.status === "pending"
              ? "bg-amber-100 text-amber-700"
              : row.original.status === "served"
                ? "bg-blue-100 text-blue-700"
                : row.original.status === "closed"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-700",
          )}
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "total_amount",
      accessorKey: "total_amount",
      header: "Total Amount",
      cell: ({ row }) => (
        <div className="text-right font-black">
          ETB {Number(row.original.total_amount).toLocaleString()}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            {canViewBilling && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openInvoiceDialog(order)}
                className="h-8 text-xs font-bold uppercase tracking-widest text-slate-300 border-slate-800 bg-slate-950 hover:bg-slate-900 hover:text-white"
              >
                <FileText className="mr-1 h-3.5 w-3.5" />
                Invoice
              </Button>
            )}
            {order.status !== "closed" && order.status !== "cancelled" && (
              <>
                {canRecordPayment && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openSplitDialog(order)}
                    className="h-8 text-xs font-bold uppercase tracking-widest text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
                  >
                    <SplitSquareHorizontal className="mr-1 h-3 w-3" />
                    Split / Pay
                  </Button>
                )}
                {canCloseOrder && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => closeOrderMutation.mutate(order.id)}
                    disabled={closeOrderMutation.isPending}
                    className="h-8 text-xs font-bold uppercase tracking-widest text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                  >
                    {closeOrderMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                    )}
                    Close Order
                  </Button>
                )}
              </>
            )}
          </div>
        );
      },
    },
  ];

  const totalSplitAmount = splits.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const remainingAmount = selectedOrder
    ? Number(selectedOrder.total_amount) - paidAmount
    : 0;
  const splitBalance = remainingAmount - totalSplitAmount;
  const expectedCash = myOpenSession ? Number(myOpenSession.expected_cash ?? myOpenSession.opening_float) : 0;
  const closingDifference = closingCash === "" ? null : Number(closingCash) - expectedCash;
  const hasClosingDifference = closingDifference !== null && Math.abs(closingDifference) > 0.009;

  const exportUrl = React.useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("sortCol", sortCol);
    params.set("sortDir", sortDir);
    return `/hospitality/service-orders/export?${params.toString()}`;
  }, [search, statusFilter, sortCol, sortDir]);

  return (
    <div className="space-y-8 p-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-indigo-500" />
            POS & Checkout
          </h1>
          <p className="text-muted-foreground">
            Open a cashier session for cash, then split bills and record payments.
          </p>
        </div>
      </div>

      {canViewCashier && (
        <div className="rounded-[1.5rem] border bg-card p-4 sm:p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">
              Cashier session
            </p>
            {isLoadingSessions ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking drawer status…
              </p>
            ) : myOpenSession ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  Open #{myOpenSession.id}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Float ETB {Number(myOpenSession.opening_float).toLocaleString()}
                  {myOpenSession.opened_at
                    ? ` · opened ${new Date(myOpenSession.opened_at).toLocaleString()}`
                    : ""}
                </span>
              </div>
            ) : (
              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                No open session — cash payments will be blocked until you open one.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            {!myOpenSession && canOpenCashier && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="opening-float" className="text-xs">
                    Opening float (ETB)
                  </Label>
                  <Input
                    id="opening-float"
                    type="number"
                    min="0"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                    className="w-40"
                  />
                </div>
                <Button
                  onClick={() => openSessionMutation.mutate()}
                  disabled={openSessionMutation.isPending}
                >
                  {openSessionMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LockOpen className="mr-2 h-4 w-4" />
                  )}
                  Open session
                </Button>
              </>
            )}
            {myOpenSession && canCloseCashier && (
              <Button variant="outline" onClick={() => setIsCloseSessionOpen(true)}>
                <Lock className="mr-2 h-4 w-4" />
                Close session
              </Button>
            )}
          </div>
        </div>
      )}

      {canViewCashier && (
        <div className="rounded-[1.5rem] border bg-card overflow-hidden">
          <div className="flex flex-col gap-1 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <History className="h-4 w-4" />
                Cashier reconciliation history
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Actual cash counted on close, variance, and shortage/overage reasons.
              </p>
            </div>
          </div>

          {isLoadingHistory ? (
            <div className="flex items-center gap-2 px-5 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading session history…
            </div>
          ) : sessionHistory.length === 0 ? (
            <p className="px-5 py-10 text-sm text-muted-foreground text-center">
              No closed sessions yet. After you close a drawer, the counted amount and reason appear here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold sm:px-5">Session</th>
                    <th className="px-4 py-3 font-semibold">Cashier</th>
                    <th className="px-4 py-3 font-semibold text-right">Expected</th>
                    <th className="px-4 py-3 font-semibold text-right">Actual</th>
                    <th className="px-4 py-3 font-semibold text-right">Difference</th>
                    <th className="px-4 py-3 font-semibold">Reason</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold sm:px-5">Closed</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionHistory.map((session) => {
                    const difference = Number(session.difference ?? 0);
                    const hasVariance = Math.abs(difference) > 0.009;
                    return (
                      <tr key={session.id} className="border-t align-top">
                        <td className="px-4 py-3 sm:px-5">
                          <div className="font-semibold">#{session.id}</div>
                          <div className="text-xs text-muted-foreground">
                            {session.outlet?.name || "Default outlet"}
                            {session.business_date
                              ? ` · ${new Date(session.business_date).toLocaleDateString()}`
                              : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {session.user?.name || "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          {formatEtb(session.expected_cash)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                          {session.actual_cash == null ? "—" : formatEtb(session.actual_cash)}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right font-mono tabular-nums font-semibold",
                            hasVariance ? "text-amber-600" : "text-emerald-600",
                          )}
                        >
                          {session.actual_cash == null
                            ? "—"
                            : `${difference > 0 ? "+" : difference < 0 ? "-" : ""}${formatEtb(Math.abs(difference))}`}
                        </td>
                        <td className="px-4 py-3 max-w-[220px]">
                          {session.discrepancy_reason?.trim() ? (
                            <span className="inline-flex items-start gap-1.5 text-amber-800 dark:text-amber-300">
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span>{session.discrepancy_reason}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {hasVariance ? "No reason recorded" : "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-2">
                            {sessionStatusBadge(session)}
                            {session.status === "pending_approval" && canManageCashier && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                disabled={approveSessionMutation.isPending}
                                onClick={() => approveSessionMutation.mutate(session.id)}
                              >
                                {approveSessionMutation.isPending ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                )}
                                Approve
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground sm:px-5">
                          {session.closed_at
                            ? new Date(session.closed_at).toLocaleString()
                            : session.status === "pending_approval"
                              ? "Awaiting manager"
                              : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="rounded-[2rem] border bg-card overflow-hidden">
        <DataTable
          key={tableKey}
          data={data?.rows || []}
          columns={columns}
          totalEntries={data?.total || 0}
          loading={isLoadingOrders}
          pageIndex={page}
          pageSize={pageSize}
          onQueryChange={handleQueryChange}
          searchPlaceholder="Search Order # or Table..."
          exportEndpoint={exportUrl}
          canCopy={canExportOrders}
          canExport={canExportOrders}
          canPrint={canExportOrders}
          resourceName="service orders"
          syncWithUrl={true}
        />
      </div>

      <Dialog open={isSplitDialogOpen} onOpenChange={setIsSplitDialogOpen}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Split & Process Payment</DialogTitle>
            <DialogDescription>
              Order {selectedOrder?.order_number}. Total: ETB{" "}
              {Number(selectedOrder?.total_amount).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {needsCashSession && !myOpenSession && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">
                Cash is selected, but you have no open cashier session. Open one on this page first.
              </div>
            )}

            <div className="flex justify-between items-center bg-muted/50 p-3 rounded-xl border border-border/50">
              <div className="space-y-1">
                <p className="text-sm font-medium">Remaining to Pay</p>
                <p
                  className={cn(
                    "text-xl font-black",
                    remainingAmount < 0
                      ? "text-red-500"
                      : remainingAmount === 0
                        ? "text-emerald-500"
                        : "",
                  )}
                >
                  ETB {remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleAutoSplit}>
                <SplitSquareHorizontal className="mr-2 h-4 w-4" />
                Split Equally
              </Button>
            </div>

            <div className="space-y-3">
              {splits.map((split, idx) => {
                const needsReference = NON_CASH_METHODS.has(split.payment_method);
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 bg-card p-3 rounded-xl border border-border"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 flex-1">
                      <div>
                        <Label className="text-xs mb-1 block">Name</Label>
                        <Input
                          value={split.split_name}
                          onChange={(e) => handleUpdateSplit(idx, "split_name", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Amount</Label>
                        <Input
                          type="number"
                          min="0"
                          value={split.amount}
                          onChange={(e) => handleUpdateSplit(idx, "amount", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Tip</Label>
                        <Input
                          type="number"
                          min="0"
                          value={split.tip_amount}
                          onChange={(e) => handleUpdateSplit(idx, "tip_amount", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Method</Label>
                        <Select
                          value={split.payment_method}
                          onValueChange={(val) => handleUpdateSplit(idx, "payment_method", val)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="telebirr">Telebirr</SelectItem>
                            <SelectItem value="chapa">Chapa</SelectItem>
                            <SelectItem value="arifpay">Arifpay</SelectItem>
                            <SelectItem value="cbe">CBE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">
                          {needsReference ? "Provider ref *" : "Reference"}
                        </Label>
                        <Input
                          value={split.payment_reference}
                          placeholder={
                            needsReference
                              ? split.payment_method === "telebirr"
                                ? "Telebirr txn ID"
                                : "Acquirer / bank ref"
                              : "Optional"
                          }
                          disabled={!needsReference}
                          onChange={(e) =>
                            handleUpdateSplit(idx, "payment_reference", e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSplit(idx)}
                      className="mt-5 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <Button variant="outline" className="w-full border-dashed" onClick={handleAddSplit}>
              <Plus className="mr-2 h-4 w-4" />
              Add Split
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSplitDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitSplit}
              disabled={
                splitBillMutation.isPending ||
                Math.abs(splitBalance) > 0.009 ||
                (needsCashSession && !myOpenSession) ||
                missingNonCashRefs
              }
            >
              {splitBillMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Payments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCloseSessionOpen} onOpenChange={setIsCloseSessionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close cashier session</DialogTitle>
            <DialogDescription>
              Count the drawer and enter the actual cash on hand to reconcile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Expected cash</span>
                  <span className="font-semibold">
                    ETB {expectedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {closingDifference !== null && (
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-muted-foreground">Difference</span>
                    <span className={cn("font-semibold", hasClosingDifference ? "text-amber-600" : "text-emerald-600")}>
                      {closingDifference >= 0 ? "+" : ""}ETB {closingDifference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="actual-cash">Actual cash (ETB)</Label>
                <Input
                  id="actual-cash"
                  type="number"
                  min="0"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                />
              </div>
              {hasClosingDifference && (
                <div className="space-y-1">
                  <Label htmlFor="discrepancy-reason">Reason for shortage or overage</Label>
                  <Input
                    id="discrepancy-reason"
                    placeholder="Explain the difference"
                    value={discrepancyReason}
                    onChange={(e) => setDiscrepancyReason(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseSessionOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => closeSessionMutation.mutate()}
              disabled={
                closeSessionMutation.isPending ||
                closingCash === "" ||
                (hasClosingDifference && !discrepancyReason.trim())
              }
            >
              {closeSessionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Close & reconcile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvoiceDialog
        order={invoiceOrder}
        isOpen={isInvoiceDialogOpen}
        onOpenChange={setIsInvoiceDialogOpen}
      />
    </div>
  );
}
