"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/store/use-translation";

import { DataTable, type DataTableQuery } from "@/components/datatable/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLease, createPropertyTenant, fetchLeases, fetchProperties, fetchUnits } from "@/modules/property/api";
import { LEASE_STATUSES, type PropertyLease } from "@/modules/property/types";

type TableQueryState = {
  page: number;
  pageSize: number;
  sortCol: string;
  sortDir: "asc" | "desc";
  status: string;
};

const DEFAULT_QUERY: TableQueryState = { page: 1, pageSize: 15, sortCol: "created_at", sortDir: "desc", status: "" };

const STATUS_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  draft: "outline",
  terminated: "destructive",
  expired: "destructive",
  rejected: "destructive",
  cancelled: "destructive",
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
};

export default function LeasesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [tableQuery, setTableQuery] = React.useState<TableQueryState>(DEFAULT_QUERY);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    property_id: "",
    unit_id: "",
    occupant_name: "",
    commencement_date: "",
    expiry_date: "",
    rent_amount: "",
    security_deposit_amount: "",
  });

  const leasesQuery = useQuery({
    queryKey: ["property", "leases", tableQuery],
    queryFn: () =>
      fetchLeases({
        status: tableQuery.status || undefined,
        page: tableQuery.page,
        per_page: tableQuery.pageSize,
        sort_col: tableQuery.sortCol,
        sort_dir: tableQuery.sortDir,
      }),
  });

  const propertiesQuery = useQuery({
    queryKey: ["property", "properties", "picker"],
    queryFn: () => fetchProperties({ per_page: 200 }),
    enabled: open,
  });

  const unitsQuery = useQuery({
    queryKey: ["property", "units", "picker", form.property_id],
    queryFn: () => fetchUnits({ property_id: Number(form.property_id), status: "available", per_page: 200 }),
    enabled: open && !!form.property_id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const occupant = await createPropertyTenant({ name: form.occupant_name.trim(), party_type: "individual" });

      return createLease({
        property_id: Number(form.property_id),
        property_tenant_id: occupant.id,
        unit_ids: [Number(form.unit_id)],
        commencement_date: form.commencement_date,
        expiry_date: form.expiry_date,
        rent_amount: Number(form.rent_amount),
        security_deposit_amount: form.security_deposit_amount ? Number(form.security_deposit_amount) : undefined,
      });
    },
    onSuccess: () => {
      toast.success(t("property.leases.created", "Lease drafted."));
      queryClient.invalidateQueries({ queryKey: ["property", "leases"] });
      queryClient.invalidateQueries({ queryKey: ["property", "units"] });
      closeModal();
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const closeModal = React.useCallback(() => {
    setOpen(false);
    setForm({ property_id: "", unit_id: "", occupant_name: "", commencement_date: "", expiry_date: "", rent_amount: "", security_deposit_amount: "" });
  }, []);

  const handleTableQueryChange = React.useCallback((query: DataTableQuery) => {
    setTableQuery((prev) => ({
      ...prev,
      page: Number(query.page || 1),
      pageSize: Number(query.pageSize || 15),
      sortCol: String(query.sortCol || "created_at"),
      sortDir: query.sortDir === "asc" ? "asc" : "desc",
    }));
  }, []);

  const canSubmit =
    form.property_id && form.unit_id && form.occupant_name.trim() && form.commencement_date && form.expiry_date && form.rent_amount;

  const columns = React.useMemo<ColumnDef<PropertyLease>[]>(
    () => [
      {
        accessorKey: "lease_number",
        header: t("property.leases.col_lease", "Lease"),
        cell: ({ row }) => (
          <Link href={`/dashboard/property/leases/${row.original.id}`} className="font-semibold hover:underline">
            {row.original.lease_number}
            <p className="text-xs font-normal text-muted-foreground">{row.original.property?.name}</p>
          </Link>
        ),
      },
      {
        id: "occupant",
        header: t("property.leases.col_occupant", "Occupant"),
        enableSorting: false,
        cell: ({ row }) => row.original.occupant?.name ?? "—",
      },
      {
        id: "units",
        header: t("property.leases.col_units", "Units"),
        enableSorting: false,
        cell: ({ row }) => row.original.units?.map((u) => u.unit_code).join(", ") ?? "—",
      },
      {
        accessorKey: "rent_amount",
        header: t("property.leases.col_rent", "Rent"),
        cell: ({ row }) => `${row.original.currency} ${row.original.rent_amount}`,
        meta: { align: "right" as const },
      },
      {
        accessorKey: "expiry_date",
        header: t("property.leases.col_expiry", "Expiry"),
      },
      {
        accessorKey: "status",
        header: t("property.common.status", "Status"),
        enableSorting: false,
        cell: ({ row }) => <Badge variant={STATUS_TONE[row.original.status] ?? "secondary"}>{row.original.status.replace(/_/g, " ")}</Badge>,
        meta: { align: "center" as const },
      },
    ],
    [t]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">{t("property.leases.title", "Leases")}</h1>
          <p className="text-sm text-muted-foreground">{t("property.leases.subtitle", "Draft, approve, activate and terminate leases across the portfolio.")}</p>
        </div>
        <Button className="rounded-full px-5" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("property.leases.add_btn", "Draft Lease")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {["", ...LEASE_STATUSES].map((status) => (
          <Button
            key={status || "all"}
            size="sm"
            variant={tableQuery.status === status ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setTableQuery((prev) => ({ ...prev, status, page: 1 }))}
          >
            {status ? status.replace(/_/g, " ") : t("property.units.filter_all", "All")}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={leasesQuery.data?.data ?? []}
        totalEntries={leasesQuery.data?.total ?? 0}
        loading={leasesQuery.isLoading || leasesQuery.isFetching}
        pageIndex={tableQuery.page}
        pageSize={tableQuery.pageSize}
        onQueryChange={handleTableQueryChange}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ["property", "leases"] })}
        searchPlaceholder={t("property.leases.search_placeholder", "Search leases...")}
        resourceName="leases"
        syncWithUrl={false}
      />

      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeModal())}>
        <DialogContent className="sm:max-w-lg rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle>{t("property.leases.create_title", "Draft Lease")}</DialogTitle>
              <DialogDescription>{t("property.leases.create_desc", "Starts as Draft. Submit it for approval once ready.")}</DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="lease-property">{t("property.common.name", "Property")}</Label>
              <select
                id="lease-property"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.property_id}
                onChange={(event) => setForm((prev) => ({ ...prev, property_id: event.target.value, unit_id: "" }))}
              >
                <option value="">{t("property.common.none", "None")}</option>
                {(propertiesQuery.data?.data ?? []).map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lease-unit">{t("property.detail.units", "Unit")}</Label>
              <select
                id="lease-unit"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.unit_id}
                onChange={(event) => setForm((prev) => ({ ...prev, unit_id: event.target.value }))}
                disabled={!form.property_id}
              >
                <option value="">{t("property.common.none", "None")}</option>
                {(unitsQuery.data?.data ?? []).map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unit_code}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lease-occupant">{t("property.leases.occupant_name", "Occupant name")}</Label>
              <Input
                id="lease-occupant"
                value={form.occupant_name}
                onChange={(event) => setForm((prev) => ({ ...prev, occupant_name: event.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lease-start">{t("property.leases.commencement", "Commencement")}</Label>
                <Input
                  id="lease-start"
                  type="date"
                  value={form.commencement_date}
                  onChange={(event) => setForm((prev) => ({ ...prev, commencement_date: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lease-end">{t("property.leases.expiry", "Expiry")}</Label>
                <Input
                  id="lease-end"
                  type="date"
                  value={form.expiry_date}
                  onChange={(event) => setForm((prev) => ({ ...prev, expiry_date: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lease-rent">{t("property.leases.rent", "Monthly Rent (ETB)")}</Label>
                <Input
                  id="lease-rent"
                  type="number"
                  value={form.rent_amount}
                  onChange={(event) => setForm((prev) => ({ ...prev, rent_amount: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lease-deposit">{t("property.leases.deposit", "Security Deposit")}</Label>
                <Input
                  id="lease-deposit"
                  type="number"
                  value={form.security_deposit_amount}
                  onChange={(event) => setForm((prev) => ({ ...prev, security_deposit_amount: event.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border/40 bg-muted/20 px-6 py-4 sm:justify-end">
            <Button variant="outline" className="rounded-full" onClick={closeModal}>
              {t("property.common.cancel", "Cancel")}
            </Button>
            <Button className="rounded-full" disabled={!canSubmit || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("property.common.create", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
