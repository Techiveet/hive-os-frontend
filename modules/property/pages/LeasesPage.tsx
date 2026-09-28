"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type DataTableQuery } from "@/components/datatable/data-table";
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
import { Textarea } from "@/components/ui/textarea";
import { propertyApi } from "@/modules/property/api";
import {
  PageHeader,
  StatusBadge,
  dateOnly,
  errorText,
  humanize,
  money,
  rowsOf,
  totalOf,
  useOccupierOptions,
  usePropertyOptions,
} from "@/modules/property/components/property-ui";
import { useTranslation } from "@/store/use-translation";

export const LEASE_STATUSES = [
  "draft", "submitted", "under_review", "approved", "awaiting_signature", "signed", "scheduled", "active",
  "renewal_due", "expiring", "expired", "terminated", "cancelled", "rejected",
] as const;

export const BILLING_FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semiannual", label: "Every six months" },
  { value: "annual", label: "Annually" },
];

type Lease = {
  id: number;
  lease_number: string;
  status: string;
  rent_amount: string;
  currency: string | null;
  billing_frequency: string | null;
  commencement_date: string;
  expiry_date: string;
  property?: { id: number; name: string } | null;
  occupant?: { id: number; name: string } | null;
  units?: { id: number; unit_code: string }[];
};

const emptyForm = {
  property_id: "",
  property_tenant_id: "",
  owner_id: "",
  unit_ids: [] as number[],
  commencement_date: "",
  expiry_date: "",
  billing_start_date: "",
  rent_amount: "",
  billing_frequency: "monthly",
  security_deposit_amount: "",
  notice_period_days: "60",
  grace_period_days: "5",
  terms: "",
};

export default function LeasesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tableQuery, setTableQuery] = React.useState({ page: 1, pageSize: 15, search: "" });
  const [status, setStatus] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const { options: propertyOptions } = usePropertyOptions();
  const occupierOptions = useOccupierOptions();

  const listQuery = useQuery({
    queryKey: ["property", "leases", tableQuery, status],
    queryFn: () =>
      propertyApi
        .listLeases({
          page: tableQuery.page,
          per_page: tableQuery.pageSize,
          search: tableQuery.search || undefined,
          status: status || undefined,
        })
        .then((res) => res.data),
  });

  const ownersQuery = useQuery({
    queryKey: ["property", "owner-options"],
    queryFn: () => propertyApi.listOwners({ per_page: 200 }).then((res) => res.data),
    enabled: open,
  });

  // Only units that can still be leased are offered.
  const unitsQuery = useQuery({
    queryKey: ["property", "lease-units", form.property_id],
    queryFn: () => propertyApi.listUnits({ property_id: form.property_id, per_page: 200 }).then((res) => res.data),
    enabled: open && Boolean(form.property_id),
  });
  const leasableUnits = rowsOf<any>(unitsQuery.data).filter((unit) =>
    ["available", "reserved", "under_negotiation"].includes(unit.status),
  );

  const create = useMutation({
    mutationFn: () =>
      propertyApi.createLease({
        property_id: Number(form.property_id),
        property_tenant_id: Number(form.property_tenant_id),
        owner_id: form.owner_id ? Number(form.owner_id) : null,
        unit_ids: form.unit_ids,
        commencement_date: form.commencement_date,
        expiry_date: form.expiry_date,
        billing_start_date: form.billing_start_date || null,
        rent_amount: Number(form.rent_amount),
        billing_frequency: form.billing_frequency,
        security_deposit_amount: form.security_deposit_amount ? Number(form.security_deposit_amount) : null,
        notice_period_days: form.notice_period_days ? Number(form.notice_period_days) : null,
        grace_period_days: form.grace_period_days ? Number(form.grace_period_days) : null,
        terms: form.terms || null,
      }),
    onSuccess: (response) => {
      toast.success(t("property.leases.created", "Lease drafted."));
      setOpen(false);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["property"] });
      const id = response.data?.id;
      if (id) router.push(`/dashboard/property/leases/${id}`);
    },
    onError: (error) => toast.error(errorText(error, t("property.common.save_failed", "Could not save it."))),
  });

  const handleQuery = React.useCallback((query: DataTableQuery) => {
    setTableQuery({ page: Number(query.page || 1), pageSize: Number(query.pageSize || 15), search: String(query.search ?? "") });
  }, []);

  const columns = React.useMemo<ColumnDef<Lease>[]>(
    () => [
      {
        accessorKey: "lease_number",
        header: "Lease",
        cell: ({ row }) => (
          <Link href={`/dashboard/property/leases/${row.original.id}`} className="font-semibold text-primary hover:underline">
            {row.original.lease_number}
          </Link>
        ),
      },
      { id: "occupant", header: "Occupier", cell: ({ row }) => row.original.occupant?.name ?? "—" },
      {
        id: "where",
        header: "Property / units",
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.property?.name ?? "—"}
            {row.original.units?.length ? ` · ${row.original.units.map((u) => u.unit_code).join(", ")}` : ""}
          </span>
        ),
      },
      {
        accessorKey: "rent_amount",
        header: "Rent",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {money(row.original.rent_amount, row.original.currency || "ETB")}
            <span className="text-[11px] text-muted-foreground"> / {humanize(row.original.billing_frequency ?? "period")}</span>
          </span>
        ),
      },
      {
        id: "term",
        header: "Term",
        cell: ({ row }) => (
          <span className="text-xs tabular-nums">
            {dateOnly(row.original.commencement_date)} → {dateOnly(row.original.expiry_date)}
          </span>
        ),
      },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    ],
    [],
  );

  const field = (id: string, label: string, input: React.ReactNode, wide = false) => (
    <div className={`space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {input}
    </div>
  );
  const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";
  const canSubmit =
    form.property_id && form.property_tenant_id && form.unit_ids.length > 0 && form.commencement_date && form.expiry_date && form.rent_amount;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("property.leases.title", "Leases")}
        subtitle={t(
          "property.leases.subtitle",
          "Draft a lease, send it through approval and signature, then bill rent and manage the deposit from the lease page.",
        )}
        actions={
          <Button className="rounded-full px-5" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> {t("property.leases.new", "New lease")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-card p-4">
        <div className="space-y-1">
          <Label htmlFor="pm-lease-status" className="text-xs">
            Status
          </Label>
          <select
            id="pm-lease-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setTableQuery((q) => ({ ...q, page: 1 }));
            }}
            className="h-9 min-w-[12rem] rounded-md border border-input bg-background px-3 text-sm capitalize"
          >
            <option value="">All</option>
            {LEASE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rowsOf<Lease>(listQuery.data)}
        totalEntries={totalOf(listQuery.data)}
        loading={listQuery.isLoading}
        pageIndex={tableQuery.page}
        pageSize={tableQuery.pageSize}
        onQueryChange={handleQuery}
        searchPlaceholder={t("property.leases.search", "Search lease number…")}
        resourceName="property-leases"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl sm:max-w-2xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">New lease</DialogTitle>
              <DialogDescription>
                The lease starts as a draft. Nothing is billed until it is approved, signed and activated.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            {field(
              "lease-property",
              "Property *",
              <select
                id="lease-property"
                className={selectClass}
                value={form.property_id}
                onChange={(event) => setForm({ ...form, property_id: event.target.value, unit_ids: [] })}
              >
                <option value="">Select…</option>
                {propertyOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>,
            )}
            {field(
              "lease-occupier",
              "Occupier *",
              <select
                id="lease-occupier"
                className={selectClass}
                value={form.property_tenant_id}
                onChange={(event) => setForm({ ...form, property_tenant_id: event.target.value })}
              >
                <option value="">Select…</option>
                {occupierOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>,
            )}

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Units *</Label>
              {!form.property_id ? (
                <p className="text-xs text-muted-foreground">Pick a property to see its available units.</p>
              ) : unitsQuery.isLoading ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading units…
                </p>
              ) : leasableUnits.length === 0 ? (
                <p className="text-xs text-muted-foreground">No available units in this property.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {leasableUnits.map((unit) => {
                    const checked = form.unit_ids.includes(unit.id);
                    return (
                      <label
                        key={unit.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                          checked ? "border-primary bg-primary/10 text-primary" : "border-border/60"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-3 w-3"
                          checked={checked}
                          onChange={() =>
                            setForm({
                              ...form,
                              unit_ids: checked ? form.unit_ids.filter((id) => id !== unit.id) : [...form.unit_ids, unit.id],
                            })
                          }
                        />
                        {unit.unit_code}
                        {unit.rent_rate ? <span className="text-muted-foreground">· {money(unit.rent_rate, unit.currency || "ETB")}</span> : null}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {field(
              "lease-start",
              "Commencement *",
              <Input id="lease-start" type="date" value={form.commencement_date} onChange={(e) => setForm({ ...form, commencement_date: e.target.value })} />,
            )}
            {field(
              "lease-end",
              "Expiry *",
              <Input
                id="lease-end"
                type="date"
                min={form.commencement_date || undefined}
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
              />,
            )}
            {field(
              "lease-rent",
              "Rent per period *",
              <Input id="lease-rent" type="number" min={0} step="any" value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: e.target.value })} />,
            )}
            {field(
              "lease-frequency",
              "Billing frequency",
              <select
                id="lease-frequency"
                className={selectClass}
                value={form.billing_frequency}
                onChange={(e) => setForm({ ...form, billing_frequency: e.target.value })}
              >
                {BILLING_FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>,
            )}
            {field(
              "lease-billing-start",
              "Billing starts",
              <Input id="lease-billing-start" type="date" value={form.billing_start_date} onChange={(e) => setForm({ ...form, billing_start_date: e.target.value })} />,
            )}
            {field(
              "lease-deposit",
              "Security deposit",
              <Input
                id="lease-deposit"
                type="number"
                min={0}
                step="any"
                value={form.security_deposit_amount}
                onChange={(e) => setForm({ ...form, security_deposit_amount: e.target.value })}
              />,
            )}
            {field(
              "lease-notice",
              "Notice period (days)",
              <Input id="lease-notice" type="number" min={0} value={form.notice_period_days} onChange={(e) => setForm({ ...form, notice_period_days: e.target.value })} />,
            )}
            {field(
              "lease-grace",
              "Payment grace (days)",
              <Input id="lease-grace" type="number" min={0} value={form.grace_period_days} onChange={(e) => setForm({ ...form, grace_period_days: e.target.value })} />,
            )}
            {field(
              "lease-owner",
              "Owner",
              <select id="lease-owner" className={selectClass} value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })}>
                <option value="">None</option>
                {rowsOf<any>(ownersQuery.data).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>,
            )}
            {field(
              "lease-terms",
              "Special terms",
              <Textarea id="lease-terms" rows={3} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} />,
              true,
            )}
          </div>

          <DialogFooter className="border-t border-border/40 px-6 py-4">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!canSubmit || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Draft lease
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
