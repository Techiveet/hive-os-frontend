"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type DataTableQuery } from "@/components/datatable/data-table";
import { Button } from "@/components/ui/button";
import { propertyApi } from "@/modules/property/api";
import {
  FormDialog,
  type FormField,
  type FormValues,
  PageHeader,
  StatusBadge,
  errorText,
  humanize,
  optionsFrom,
  rowsOf,
  totalOf,
} from "@/modules/property/components/property-ui";
import { useTranslation } from "@/store/use-translation";

export const PROPERTY_TYPES = [
  "residential", "commercial", "retail", "mall", "office", "warehouse", "industrial", "mixed_use",
  "land", "apartment_complex", "condominium", "villa_compound", "hotel_residence", "other",
] as const;
export const PROPERTY_STATUSES = ["active", "under_construction", "inactive", "disposed"] as const;

export const propertyFields: FormField[] = [
  { name: "name", label: "Name", required: true },
  { name: "code", label: "Code", placeholder: "Generated when left empty" },
  { name: "type", label: "Type", type: "select", options: optionsFrom(PROPERTY_TYPES), required: true },
  { name: "status", label: "Status", type: "select", options: optionsFrom(PROPERTY_STATUSES) },
  { name: "address_line", label: "Address", wide: true },
  { name: "city", label: "City" },
  { name: "sub_city", label: "Sub-city" },
  { name: "region", label: "Region" },
  { name: "country", label: "Country" },
  { name: "gross_area", label: "Gross area (m²)", type: "number", min: 0 },
  { name: "leasable_area", label: "Leasable area (m²)", type: "number", min: 0 },
  { name: "parking_capacity", label: "Parking capacity", type: "number", min: 0 },
  { name: "opening_date", label: "Opening date", type: "date" },
  { name: "title_deed_reference", label: "Title deed reference" },
  { name: "plot_reference", label: "Plot reference" },
  { name: "description", label: "Description", type: "textarea" },
];

type Property = {
  id: number;
  code: string | null;
  name: string;
  type: string;
  status: string;
  city: string | null;
  buildings_count?: number;
  units_count?: number;
  [key: string]: unknown;
};

export default function PropertiesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tableQuery, setTableQuery] = React.useState({ page: 1, pageSize: 10, search: "" });
  const [editing, setEditing] = React.useState<Property | null>(null);
  const [open, setOpen] = React.useState(false);

  const listQuery = useQuery({
    queryKey: ["property", "properties", tableQuery],
    queryFn: () =>
      propertyApi
        .listProperties({ page: tableQuery.page, per_page: tableQuery.pageSize, search: tableQuery.search || undefined })
        .then((res) => res.data),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["property"] });

  const save = useMutation({
    mutationFn: (values: FormValues) =>
      editing ? propertyApi.updateProperty(editing.id, values) : propertyApi.createProperty(values),
    onSuccess: () => {
      toast.success(editing ? t("property.properties.updated", "Property updated.") : t("property.properties.created", "Property created."));
      setOpen(false);
      invalidate();
    },
    onError: (error) => toast.error(errorText(error, t("property.common.save_failed", "Could not save it."))),
  });

  const remove = useMutation({
    mutationFn: (id: number) => propertyApi.deleteProperty(id),
    onSuccess: () => {
      toast.success(t("property.properties.deleted", "Property deleted."));
      invalidate();
    },
    onError: (error) => toast.error(errorText(error, t("property.common.delete_failed", "Could not delete it."))),
  });

  const handleQuery = React.useCallback((query: DataTableQuery) => {
    setTableQuery({ page: Number(query.page || 1), pageSize: Number(query.pageSize || 10), search: String(query.search ?? "") });
  }, []);

  const columns = React.useMemo<ColumnDef<Property>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("property.common.name", "Name"),
        cell: ({ row }) => (
          <Link href={`/dashboard/property/properties/${row.original.id}`} className="font-semibold text-primary hover:underline">
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "code",
        header: t("property.common.code", "Code"),
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.code ?? "—"}</span>,
      },
      {
        accessorKey: "type",
        header: t("property.common.type", "Type"),
        cell: ({ row }) => <span className="capitalize">{humanize(row.original.type)}</span>,
      },
      { accessorKey: "city", header: t("property.common.city", "City"), cell: ({ row }) => row.original.city ?? "—" },
      {
        accessorKey: "status",
        header: t("property.common.status", "Status"),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label={t("property.common.edit", "Edit")}
              onClick={() => {
                setEditing(row.original);
                setOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              aria-label={t("property.common.delete", "Delete")}
              onClick={() => {
                if (window.confirm(t("property.properties.confirm_delete", "Delete this property?"))) remove.mutate(row.original.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [t, remove],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("property.properties.title", "Properties")}
        subtitle={t("property.properties.subtitle", "Every property in the portfolio. Open one to manage its buildings, floors, zones, units, parking and visitors.")}
        actions={
          <Button
            className="rounded-full px-5"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("property.properties.add", "Add property")}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={rowsOf<Property>(listQuery.data)}
        totalEntries={totalOf(listQuery.data)}
        loading={listQuery.isLoading}
        pageIndex={tableQuery.page}
        pageSize={tableQuery.pageSize}
        onQueryChange={handleQuery}
        searchPlaceholder={t("property.properties.search", "Search by name or code…")}
        resourceName="property-properties"
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? t("property.properties.edit", "Edit property") : t("property.properties.add", "Add property")}
        fields={propertyFields}
        initial={editing ?? { status: "active" }}
        submitting={save.isPending}
        onSubmit={(values) => save.mutate(values)}
      />
    </div>
  );
}
