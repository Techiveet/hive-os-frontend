"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";

import { DataTable, type DataTableQuery } from "@/components/datatable/data-table";
import { Label } from "@/components/ui/label";
import { propertyApi } from "@/modules/property/api";
import {
  PageHeader,
  StatusBadge,
  humanize,
  money,
  rowsOf,
  totalOf,
  usePropertyOptions,
} from "@/modules/property/components/property-ui";
import { useTranslation } from "@/store/use-translation";

export const UNIT_TYPES = [
  "apartment", "office", "shop", "retail_unit", "kiosk", "warehouse", "storage", "restaurant", "food_court",
  "stall", "parking_space", "atm", "advertising", "event_space", "residential_unit", "villa", "other",
] as const;

export const UNIT_TRANSITIONS: Record<string, string[]> = {
  available: ["reserved", "under_negotiation", "lease_pending_approval", "blocked", "under_maintenance", "inactive"],
  reserved: ["available", "under_negotiation", "lease_pending_approval"],
  under_negotiation: ["available", "reserved", "lease_pending_approval"],
  lease_pending_approval: ["available", "occupied"],
  occupied: ["notice_given", "under_maintenance"],
  notice_given: ["occupied", "under_maintenance", "renovation", "available"],
  under_maintenance: ["available", "occupied", "renovation", "blocked", "inactive"],
  renovation: ["available", "blocked", "inactive"],
  blocked: ["available", "under_maintenance", "inactive"],
  owner_occupied: ["available", "under_maintenance", "inactive"],
  inactive: ["available", "blocked"],
};

export const UNIT_STATUSES = Object.keys(UNIT_TRANSITIONS);

type Unit = {
  id: number;
  unit_code: string;
  unit_type: string;
  status: string;
  rentable_area: string | null;
  rent_rate: string | null;
  currency: string | null;
  property?: { id: number; name: string } | null;
  building?: { name: string } | null;
  floor?: { name: string | null; level: number } | null;
};

export default function UnitsPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [tableQuery, setTableQuery] = React.useState({ page: 1, pageSize: 15, search: "" });
  const [filters, setFilters] = React.useState({
    property_id: "",
    status: searchParams?.get("status") ?? "",
    unit_type: "",
  });
  const { options: propertyOptions } = usePropertyOptions();

  const listQuery = useQuery({
    queryKey: ["property", "units", tableQuery, filters],
    queryFn: () =>
      propertyApi
        .listUnits({
          page: tableQuery.page,
          per_page: tableQuery.pageSize,
          search: tableQuery.search || undefined,
          property_id: filters.property_id || undefined,
          status: filters.status || undefined,
          unit_type: filters.unit_type || undefined,
        })
        .then((res) => res.data),
  });

  const handleQuery = React.useCallback((query: DataTableQuery) => {
    setTableQuery({ page: Number(query.page || 1), pageSize: Number(query.pageSize || 15), search: String(query.search ?? "") });
  }, []);

  const columns = React.useMemo<ColumnDef<Unit>[]>(
    () => [
      {
        accessorKey: "unit_code",
        header: t("property.units.unit", "Unit"),
        cell: ({ row }) => (
          <Link href={`/dashboard/property/units/${row.original.id}`} className="font-semibold text-primary hover:underline">
            {row.original.unit_code}
          </Link>
        ),
      },
      {
        id: "property",
        header: t("property.units.property", "Property"),
        cell: ({ row }) =>
          row.original.property ? (
            <Link href={`/dashboard/property/properties/${row.original.property.id}`} className="hover:underline">
              {row.original.property.name}
            </Link>
          ) : (
            "—"
          ),
      },
      {
        id: "location",
        header: t("property.units.location", "Building / floor"),
        cell: ({ row }) => (
          <span className="text-xs">
            {[row.original.building?.name, row.original.floor?.name ?? row.original.floor?.level].filter((v) => v !== undefined && v !== null && v !== "").join(" · ") || "—"}
          </span>
        ),
      },
      {
        accessorKey: "unit_type",
        header: t("property.common.type", "Type"),
        cell: ({ row }) => <span className="capitalize">{humanize(row.original.unit_type)}</span>,
      },
      {
        accessorKey: "rentable_area",
        header: t("property.units.area", "Area (m²)"),
        cell: ({ row }) => <span className="tabular-nums">{row.original.rentable_area ?? "—"}</span>,
      },
      {
        accessorKey: "rent_rate",
        header: t("property.units.rent", "Asking rent"),
        cell: ({ row }) => (row.original.rent_rate ? money(row.original.rent_rate, row.original.currency || "ETB") : "—"),
      },
      {
        accessorKey: "status",
        header: t("property.common.status", "Status"),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [t],
  );

  const select = (id: string, label: string, value: string, options: { value: string | number; label: string }[], key: keyof typeof filters) => (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          setFilters({ ...filters, [key]: event.target.value });
          setTableQuery((q) => ({ ...q, page: 1 }));
        }}
        className="h-9 min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm capitalize"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("property.units.title", "Units")}
        subtitle={t("property.units.subtitle", "Every lettable unit across the portfolio. Add units from a property's page; open a unit to change its status.")}
      />

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-card p-4">
        {select("pm-units-property", "Property", filters.property_id, propertyOptions, "property_id")}
        {select("pm-units-status", "Status", filters.status, UNIT_STATUSES.map((s) => ({ value: s, label: humanize(s) })), "status")}
        {select("pm-units-type", "Type", filters.unit_type, UNIT_TYPES.map((s) => ({ value: s, label: humanize(s) })), "unit_type")}
      </div>

      <DataTable
        columns={columns}
        data={rowsOf<Unit>(listQuery.data)}
        totalEntries={totalOf(listQuery.data)}
        loading={listQuery.isLoading}
        pageIndex={tableQuery.page}
        pageSize={tableQuery.pageSize}
        onQueryChange={handleQuery}
        searchPlaceholder={t("property.units.search", "Search unit code…")}
        resourceName="property-units"
      />
    </div>
  );
}
