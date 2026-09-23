"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/store/use-translation";

import { DataTable, type DataTableQuery } from "@/components/datatable/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  approveMallSalesReport,
  approvePromotion,
  bookAdvertisingSpace,
  createAdvertisingSpace,
  createPromotion,
  fetchAdvertisingSpaces,
  fetchFootfall,
  fetchMallSalesReports,
  fetchProperties,
  fetchPromotions,
  importFootfall,
  importMallSalesReports,
  recordFootfall,
  rejectMallSalesReport,
} from "@/modules/property/api";
import {
  ADVERTISING_SPACE_TYPES,
  MALL_PROMOTION_TYPES,
  type PropertyAdvertisingSpace,
  type PropertyImportSummary,
  type PropertyMallFootfall,
  type PropertyMallPromotion,
  type PropertyMallSalesReport,
} from "@/modules/property/types";

function announceImportSummary(summary: PropertyImportSummary) {
  const message = `${summary.accepted}/${summary.total} rows imported`;
  if (summary.rejected > 0) {
    toast.warning(`${message}. ${summary.rejected} row(s) failed: ${summary.errors.slice(0, 3).map((e) => `row ${e.row} — ${e.message}`).join("; ")}`);
  } else {
    toast.success(message);
  }
}

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
};

function PropertyPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t } = useTranslation();
  const propertiesQuery = useQuery({ queryKey: ["property", "properties", "picker"], queryFn: () => fetchProperties({ per_page: 200 }) });

  return (
    <select className="h-10 w-64 rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t("property.mall.select_property", "Select a property...")}</option>
      {(propertiesQuery.data?.data ?? []).map((property) => (
        <option key={property.id} value={property.id}>
          {property.name}
        </option>
      ))}
    </select>
  );
}

function SalesReportsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tableQuery, setTableQuery] = React.useState({ page: 1, pageSize: 15 });
  const [importLeaseId, setImportLeaseId] = React.useState("");
  const importInputRef = React.useRef<HTMLInputElement>(null);

  const reportsQuery = useQuery({
    queryKey: ["property", "mall-sales-reports", tableQuery],
    queryFn: () => fetchMallSalesReports({ page: tableQuery.page, per_page: tableQuery.pageSize }),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => importMallSalesReports(Number(importLeaseId), file),
    onSuccess: (summary) => {
      announceImportSummary(summary);
      queryClient.invalidateQueries({ queryKey: ["property", "mall-sales-reports"] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveMallSalesReport(id),
    onSuccess: () => {
      toast.success(t("property.mall.report_approved", "Report approved."));
      queryClient.invalidateQueries({ queryKey: ["property", "mall-sales-reports"] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => rejectMallSalesReport(id),
    onSuccess: () => {
      toast.success(t("property.mall.report_rejected", "Report rejected."));
      queryClient.invalidateQueries({ queryKey: ["property", "mall-sales-reports"] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const columns = React.useMemo<ColumnDef<PropertyMallSalesReport>[]>(
    () => [
      {
        id: "lease",
        header: t("property.mall.col_lease", "Lease"),
        cell: ({ row }) => row.original.lease?.lease_number ?? row.original.lease_id,
      },
      {
        id: "period",
        header: t("property.mall.col_period", "Period"),
        cell: ({ row }) => `${row.original.period_start} → ${row.original.period_end}`,
      },
      { accessorKey: "net_sales", header: t("property.mall.col_net_sales", "Net Sales") },
      {
        accessorKey: "calculated_turnover_rent",
        header: t("property.mall.col_turnover_rent", "Turnover Rent"),
        cell: ({ row }) => row.original.calculated_turnover_rent ?? "—",
      },
      {
        accessorKey: "approval_status",
        header: t("property.common.status", "Status"),
        cell: ({ row }) => {
          const tone = row.original.approval_status === "approved" ? "default" : row.original.approval_status === "rejected" ? "destructive" : "secondary";
          return <Badge variant={tone}>{row.original.approval_status}</Badge>;
        },
      },
      {
        id: "actions",
        header: t("property.common.actions", "Actions"),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.approval_status === "pending" ? (
            <div className="flex gap-2">
              <Button size="sm" className="rounded-full" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate(row.original.id)}>
                {t("property.mall.approve", "Approve")}
              </Button>
              <Button size="sm" variant="outline" className="rounded-full" disabled={rejectMutation.isPending} onClick={() => rejectMutation.mutate(row.original.id)}>
                {t("property.mall.reject", "Reject")}
              </Button>
            </div>
          ) : (
            "—"
          ),
      },
    ],
    [t, approveMutation, rejectMutation]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/50 p-4">
        <Input
          type="number"
          placeholder={t("property.mall.lease_id", "Lease ID")}
          className="w-32"
          value={importLeaseId}
          onChange={(e) => setImportLeaseId(e.target.value)}
        />
        <input
          ref={importInputRef}
          type="file"
          accept=".csv,.txt,.xlsx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importMutation.mutate(file);
            e.target.value = "";
          }}
        />
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={!importLeaseId || importMutation.isPending}
          onClick={() => importInputRef.current?.click()}
        >
          {importMutation.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1 h-3.5 w-3.5" />}
          {t("property.mall.import_csv", "Import CSV")}
        </Button>
        <span className="text-xs text-muted-foreground">
          {t("property.mall.import_csv_hint", "Columns: period_type, period_start, period_end, gross_sales, refunds")}
        </span>
      </div>

      <DataTable
        columns={columns}
        data={reportsQuery.data?.data ?? []}
        totalEntries={reportsQuery.data?.total ?? 0}
        loading={reportsQuery.isLoading || reportsQuery.isFetching}
        pageIndex={tableQuery.page}
        pageSize={tableQuery.pageSize}
        onQueryChange={(q: DataTableQuery) => setTableQuery({ page: Number(q.page || 1), pageSize: Number(q.pageSize || 15) })}
        resourceName="sales reports"
        syncWithUrl={false}
      />
    </div>
  );
}

function FootfallTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [propertyId, setPropertyId] = React.useState("");
  const [form, setForm] = React.useState({ recorded_date: "", entrance: "", visitor_count: "" });
  const importInputRef = React.useRef<HTMLInputElement>(null);

  const footfallQuery = useQuery({
    queryKey: ["property", "footfall", propertyId],
    queryFn: () => fetchFootfall(Number(propertyId), { per_page: 30 }),
    enabled: !!propertyId,
  });

  const recordMutation = useMutation({
    mutationFn: () => recordFootfall(Number(propertyId), { ...form, visitor_count: Number(form.visitor_count) }),
    onSuccess: () => {
      toast.success(t("property.mall.footfall_recorded", "Footfall recorded."));
      setForm({ recorded_date: "", entrance: "", visitor_count: "" });
      queryClient.invalidateQueries({ queryKey: ["property", "footfall", propertyId] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => importFootfall(Number(propertyId), file),
    onSuccess: (summary) => {
      announceImportSummary(summary);
      queryClient.invalidateQueries({ queryKey: ["property", "footfall", propertyId] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  return (
    <div className="space-y-4">
      <PropertyPicker value={propertyId} onChange={setPropertyId} />
      {propertyId && (
        <>
          <div className="grid grid-cols-4 gap-2 items-end rounded-2xl border border-border/50 p-4">
            <div className="space-y-1">
              <Label>{t("property.mall.date", "Date")}</Label>
              <Input type="date" value={form.recorded_date} onChange={(e) => setForm((p) => ({ ...p, recorded_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t("property.mall.entrance", "Entrance")}</Label>
              <Input value={form.entrance} onChange={(e) => setForm((p) => ({ ...p, entrance: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t("property.mall.visitor_count", "Visitors")}</Label>
              <Input type="number" value={form.visitor_count} onChange={(e) => setForm((p) => ({ ...p, visitor_count: e.target.value }))} />
            </div>
            <Button
              size="sm"
              className="rounded-full"
              disabled={!form.recorded_date || !form.visitor_count || recordMutation.isPending}
              onClick={() => recordMutation.mutate()}
            >
              {recordMutation.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
              {t("property.common.create", "Record")}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.txt,.xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importMutation.mutate(file);
                e.target.value = "";
              }}
            />
            <Button size="sm" variant="outline" className="rounded-full" disabled={importMutation.isPending} onClick={() => importInputRef.current?.click()}>
              {importMutation.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1 h-3.5 w-3.5" />}
              {t("property.mall.import_csv", "Import CSV")}
            </Button>
            <span className="text-xs text-muted-foreground">{t("property.mall.import_footfall_hint", "Columns: recorded_date, entrance, visitor_count")}</span>
          </div>

          <div className="space-y-2">
            {(footfallQuery.data?.data ?? []).map((entry: PropertyMallFootfall) => (
              <div key={entry.id} className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3 text-sm">
                <span>{entry.recorded_date} — {entry.entrance ?? t("property.common.none", "None")}</span>
                <span className="font-semibold">{entry.visitor_count}</span>
              </div>
            ))}
            {footfallQuery.data?.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("property.mall.no_footfall", "No footfall recorded yet.")}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PromotionsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [propertyId, setPropertyId] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", promotion_type: "promotion", start_date: "", end_date: "", cost: "" });

  const promotionsQuery = useQuery({
    queryKey: ["property", "promotions", propertyId],
    queryFn: () => fetchPromotions(Number(propertyId), { per_page: 30 }),
    enabled: !!propertyId,
  });

  const createMutation = useMutation({
    mutationFn: () => createPromotion(Number(propertyId), { ...form, cost: form.cost ? Number(form.cost) : undefined }),
    onSuccess: () => {
      toast.success(t("property.mall.promotion_created", "Promotion created."));
      setOpen(false);
      setForm({ name: "", promotion_type: "promotion", start_date: "", end_date: "", cost: "" });
      queryClient.invalidateQueries({ queryKey: ["property", "promotions", propertyId] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => approvePromotion(id),
    onSuccess: () => {
      toast.success(t("property.mall.promotion_approved", "Promotion approved."));
      queryClient.invalidateQueries({ queryKey: ["property", "promotions", propertyId] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PropertyPicker value={propertyId} onChange={setPropertyId} />
        {propertyId && (
          <Button size="sm" className="rounded-full" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t("property.mall.new_promotion", "New Promotion")}
          </Button>
        )}
      </div>

      {propertyId && (
        <div className="space-y-2">
          {(promotionsQuery.data?.data ?? []).map((promotion: PropertyMallPromotion) => (
            <div key={promotion.id} className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold">{promotion.name}</p>
                <p className="text-xs text-muted-foreground">{promotion.start_date} → {promotion.end_date} · {promotion.promotion_type}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={promotion.status === "approved" || promotion.status === "active" ? "default" : "secondary"}>{promotion.status}</Badge>
                {(promotion.status === "draft" || promotion.status === "submitted") && (
                  <Button size="sm" variant="outline" className="rounded-full" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate(promotion.id)}>
                    {t("property.mall.approve", "Approve")}
                  </Button>
                )}
              </div>
            </div>
          ))}
          {promotionsQuery.data?.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("property.mall.no_promotions", "No promotions yet.")}</p>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle>{t("property.mall.new_promotion", "New Promotion")}</DialogTitle>
            </DialogHeader>
          </div>
          <div className="grid gap-4 px-6 py-5">
            <div className="space-y-1">
              <Label>{t("property.common.name", "Name")}</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t("property.mall.promotion_type", "Type")}</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.promotion_type}
                onChange={(e) => setForm((p) => ({ ...p, promotion_type: e.target.value }))}
              >
                {MALL_PROMOTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>{t("property.mall.start_date", "Start")}</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t("property.mall.end_date", "End")}</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("property.mall.cost", "Cost")}</Label>
              <Input type="number" value={form.cost} onChange={(e) => setForm((p) => ({ ...p, cost: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="border-t border-border/40 bg-muted/20 px-6 py-4 sm:justify-end">
            <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
              {t("property.common.cancel", "Cancel")}
            </Button>
            <Button
              className="rounded-full"
              disabled={!form.name || !form.start_date || !form.end_date || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("property.common.create", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdvertisingTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [propertyId, setPropertyId] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [bookOpen, setBookOpen] = React.useState<PropertyAdvertisingSpace | null>(null);
  const [form, setForm] = React.useState({ code: "", name: "", space_type: "billboard", rate_amount: "" });
  const [bookForm, setBookForm] = React.useState({ advertiser_name: "", start_date: "", end_date: "", amount: "" });

  const spacesQuery = useQuery({ queryKey: ["property", "advertising-spaces"], queryFn: () => fetchAdvertisingSpaces({ per_page: 30 }) });

  const createMutation = useMutation({
    mutationFn: () => createAdvertisingSpace(Number(propertyId), { ...form, rate_amount: Number(form.rate_amount) }),
    onSuccess: () => {
      toast.success(t("property.mall.space_created", "Advertising space created."));
      setOpen(false);
      setForm({ code: "", name: "", space_type: "billboard", rate_amount: "" });
      queryClient.invalidateQueries({ queryKey: ["property", "advertising-spaces"] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const bookMutation = useMutation({
    mutationFn: () => bookAdvertisingSpace(bookOpen!.id, { ...bookForm, amount: Number(bookForm.amount) }),
    onSuccess: () => {
      toast.success(t("property.mall.booking_created", "Booking created."));
      setBookOpen(null);
      setBookForm({ advertiser_name: "", start_date: "", end_date: "", amount: "" });
      queryClient.invalidateQueries({ queryKey: ["property", "advertising-spaces"] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.mall.overlap_error", "This space already has a booking for an overlapping period."))),
  });

  const columns = React.useMemo<ColumnDef<PropertyAdvertisingSpace>[]>(
    () => [
      { accessorKey: "code", header: t("property.mall.col_code", "Code") },
      { accessorKey: "name", header: t("property.common.name", "Name") },
      { accessorKey: "space_type", header: t("property.mall.space_type", "Type") },
      { accessorKey: "rate_amount", header: t("property.mall.rate", "Rate") },
      {
        accessorKey: "status",
        header: t("property.common.status", "Status"),
        cell: ({ row }) => <Badge variant={row.original.status === "available" ? "default" : "secondary"}>{row.original.status}</Badge>,
      },
      {
        id: "actions",
        header: t("property.common.actions", "Actions"),
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={row.original.status !== "available"}
            onClick={() => setBookOpen(row.original)}
          >
            {t("property.mall.book", "Book")}
          </Button>
        ),
      },
    ],
    [t]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PropertyPicker value={propertyId} onChange={setPropertyId} />
        {propertyId && (
          <Button size="sm" className="rounded-full" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t("property.mall.new_space", "New Space")}
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={spacesQuery.data?.data ?? []}
        totalEntries={spacesQuery.data?.total ?? 0}
        loading={spacesQuery.isLoading || spacesQuery.isFetching}
        pageIndex={1}
        pageSize={30}
        onQueryChange={() => {}}
        resourceName="advertising spaces"
        syncWithUrl={false}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle>{t("property.mall.new_space", "New Space")}</DialogTitle>
            </DialogHeader>
          </div>
          <div className="grid gap-4 px-6 py-5">
            <div className="space-y-1">
              <Label>{t("property.mall.col_code", "Code")}</Label>
              <Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t("property.common.name", "Name")}</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t("property.mall.space_type", "Type")}</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.space_type}
                onChange={(e) => setForm((p) => ({ ...p, space_type: e.target.value }))}
              >
                {ADVERTISING_SPACE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>{t("property.mall.rate", "Rate")}</Label>
              <Input type="number" value={form.rate_amount} onChange={(e) => setForm((p) => ({ ...p, rate_amount: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="border-t border-border/40 bg-muted/20 px-6 py-4 sm:justify-end">
            <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
              {t("property.common.cancel", "Cancel")}
            </Button>
            <Button
              className="rounded-full"
              disabled={!propertyId || !form.code || !form.name || !form.rate_amount || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("property.common.create", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bookOpen !== null} onOpenChange={(next) => !next && setBookOpen(null)}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle>{bookOpen?.name}</DialogTitle>
            </DialogHeader>
          </div>
          <div className="grid gap-4 px-6 py-5">
            <div className="space-y-1">
              <Label>{t("property.mall.advertiser_name", "Advertiser")}</Label>
              <Input value={bookForm.advertiser_name} onChange={(e) => setBookForm((p) => ({ ...p, advertiser_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>{t("property.mall.start_date", "Start")}</Label>
                <Input type="date" value={bookForm.start_date} onChange={(e) => setBookForm((p) => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t("property.mall.end_date", "End")}</Label>
                <Input type="date" value={bookForm.end_date} onChange={(e) => setBookForm((p) => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("property.mall.amount", "Amount")}</Label>
              <Input type="number" value={bookForm.amount} onChange={(e) => setBookForm((p) => ({ ...p, amount: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="border-t border-border/40 bg-muted/20 px-6 py-4 sm:justify-end">
            <Button variant="outline" className="rounded-full" onClick={() => setBookOpen(null)}>
              {t("property.common.cancel", "Cancel")}
            </Button>
            <Button
              className="rounded-full"
              disabled={!bookForm.advertiser_name || !bookForm.start_date || !bookForm.end_date || !bookForm.amount || bookMutation.isPending}
              onClick={() => bookMutation.mutate()}
            >
              {bookMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("property.common.create", "Book")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MallPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{t("property.mall.title", "Mall Management")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("property.mall.subtitle", "Turnover sales, footfall, promotions and advertising spaces for retail properties.")}
        </p>
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">{t("property.mall.tab_sales", "Sales Reports")}</TabsTrigger>
          <TabsTrigger value="footfall">{t("property.mall.tab_footfall", "Footfall")}</TabsTrigger>
          <TabsTrigger value="promotions">{t("property.mall.tab_promotions", "Promotions")}</TabsTrigger>
          <TabsTrigger value="advertising">{t("property.mall.tab_advertising", "Advertising")}</TabsTrigger>
        </TabsList>
        <TabsContent value="sales" className="pt-4">
          <SalesReportsTab />
        </TabsContent>
        <TabsContent value="footfall" className="pt-4">
          <FootfallTab />
        </TabsContent>
        <TabsContent value="promotions" className="pt-4">
          <PromotionsTab />
        </TabsContent>
        <TabsContent value="advertising" className="pt-4">
          <AdvertisingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
