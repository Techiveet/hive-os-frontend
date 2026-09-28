"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type DataTableQuery } from "@/components/datatable/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { propertyApi } from "@/modules/property/api";
import {
  FormDialog,
  type FormField,
  type FormValues,
  PageHeader,
  SectionTabs,
  errorText,
  humanize,
  rowsOf,
  totalOf,
} from "@/modules/property/components/property-ui";
import { useTranslation } from "@/store/use-translation";

type Tab = "occupiers" | "owners";

const PARTY_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "company", label: "Company" },
];

const occupierFields: FormField[] = [
  { name: "name", label: "Name", required: true },
  { name: "party_type", label: "Type", type: "select", options: PARTY_TYPES, required: true },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Phone" },
  { name: "tax_identifier", label: "TIN" },
  { name: "business_license_number", label: "Business licence number" },
  { name: "is_active", label: "Active", type: "checkbox" },
];

const ownerFields: FormField[] = [
  { name: "name", label: "Name", required: true },
  { name: "party_type", label: "Type", type: "select", options: PARTY_TYPES, required: true },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Phone" },
  { name: "tax_identifier", label: "TIN" },
  {
    name: "management_fee_basis",
    label: "Management fee basis",
    type: "select",
    options: [
      { value: "percentage", label: "Percentage of income" },
      { value: "fixed", label: "Fixed amount" },
    ],
  },
  { name: "management_fee_value", label: "Management fee", type: "number", min: 0, help: "Percent (e.g. 8) or a fixed amount per statement." },
  { name: "is_active", label: "Active", type: "checkbox" },
];

type Party = {
  id: number;
  name: string;
  party_type: string;
  email: string | null;
  phone: string | null;
  tax_identifier: string | null;
  is_active: boolean;
  [key: string]: unknown;
};

export default function PeoplePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState<Tab>("occupiers");
  const [tableQuery, setTableQuery] = React.useState({ page: 1, pageSize: 15, search: "" });
  const [editing, setEditing] = React.useState<Party | null>(null);
  const [open, setOpen] = React.useState(false);

  const listQuery = useQuery({
    queryKey: ["property", tab, tableQuery],
    queryFn: () => {
      const params = { page: tableQuery.page, per_page: tableQuery.pageSize, search: tableQuery.search || undefined };
      return (tab === "owners" ? propertyApi.listOwners(params) : propertyApi.listOccupiers(params)).then((res) => res.data);
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["property"] });

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      if (tab === "owners") {
        return editing ? propertyApi.updateOwner(editing.id, values) : propertyApi.createOwner(values);
      }
      return editing ? propertyApi.updateOccupier(editing.id, values) : propertyApi.createOccupier(values);
    },
    onSuccess: () => {
      toast.success("Saved.");
      setOpen(false);
      invalidate();
    },
    onError: (error) => toast.error(errorText(error, "Could not save it.")),
  });

  const remove = useMutation({
    mutationFn: (id: number) => (tab === "owners" ? propertyApi.deleteOwner(id) : propertyApi.deleteOccupier(id)),
    onSuccess: () => {
      toast.success("Deleted.");
      invalidate();
    },
    onError: (error) => toast.error(errorText(error, "Could not delete it.")),
  });

  const handleQuery = React.useCallback((query: DataTableQuery) => {
    setTableQuery({ page: Number(query.page || 1), pageSize: Number(query.pageSize || 15), search: String(query.search ?? "") });
  }, []);

  const columns = React.useMemo<ColumnDef<Party>[]>(
    () => [
      { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="font-semibold">{row.original.name}</span> },
      { accessorKey: "party_type", header: "Type", cell: ({ row }) => <span className="capitalize">{humanize(row.original.party_type)}</span> },
      { accessorKey: "email", header: "Email", cell: ({ row }) => row.original.email ?? "—" },
      { accessorKey: "phone", header: "Phone", cell: ({ row }) => row.original.phone ?? "—" },
      { accessorKey: "tax_identifier", header: "TIN", cell: ({ row }) => <span className="font-mono text-xs">{row.original.tax_identifier ?? "—"}</span> },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) =>
          row.original.is_active ? <Badge variant="outline">Active</Badge> : <Badge variant="secondary">Inactive</Badge>,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Edit"
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
              aria-label="Delete"
              onClick={() => {
                if (window.confirm(`Delete ${row.original.name}?`)) remove.mutate(row.original.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [remove],
  );

  const label = tab === "owners" ? "owner" : "occupier";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("property.people.title", "Owners & Occupiers")}
        subtitle={t(
          "property.people.subtitle",
          "Occupiers are the people and companies who lease units. Owners receive the income, less any management fee, on their statements.",
        )}
        actions={
          <Button
            className="rounded-full px-5"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add {label}
          </Button>
        }
      />

      <SectionTabs<Tab>
        tabs={[
          { id: "occupiers", label: "Occupiers" },
          { id: "owners", label: "Owners" },
        ]}
        active={tab}
        onChange={(next) => {
          setTab(next);
          setTableQuery({ page: 1, pageSize: 15, search: "" });
        }}
      />

      <DataTable
        key={tab}
        columns={columns}
        data={rowsOf<Party>(listQuery.data)}
        totalEntries={totalOf(listQuery.data)}
        loading={listQuery.isLoading}
        pageIndex={tableQuery.page}
        pageSize={tableQuery.pageSize}
        onQueryChange={handleQuery}
        searchPlaceholder={`Search ${label}s…`}
        resourceName={`property-${tab}`}
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit ${label}` : `Add ${label}`}
        fields={tab === "owners" ? ownerFields : occupierFields}
        initial={editing ?? { is_active: true, party_type: "individual" }}
        submitting={save.isPending}
        onSubmit={(values) => save.mutate(values)}
      />
    </div>
  );
}
