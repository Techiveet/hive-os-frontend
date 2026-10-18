"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/store/use-translation";

import { DataTable, type DataTableQuery } from "@/components/datatable/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProperty, deleteProperty, fetchProperties, updateProperty } from "@/modules/property/api";
import { PROPERTY_TYPES, type Property } from "@/modules/property/types";

type TableQueryState = {
  page: number;
  pageSize: number;
  search: string;
  sortCol: string;
  sortDir: "asc" | "desc";
};

type PropertyForm = {
  id?: number;
  name: string;
  type: string;
  city: string;
  country: string;
  description: string;
};

const DEFAULT_QUERY: TableQueryState = { page: 1, pageSize: 10, search: "", sortCol: "created_at", sortDir: "desc" };
const DEFAULT_FORM: PropertyForm = { name: "", type: "commercial", city: "", country: "", description: "" };

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
};

export default function PropertiesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [tableQuery, setTableQuery] = React.useState<TableQueryState>(DEFAULT_QUERY);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<PropertyForm>(DEFAULT_FORM);

  const propertiesQuery = useQuery({
    queryKey: ["property", "properties", tableQuery],
    queryFn: () =>
      fetchProperties({
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
        type: form.type,
        city: form.city.trim() || undefined,
        country: form.country.trim() || undefined,
        description: form.description.trim() || undefined,
      };
      return form.id ? updateProperty(form.id, payload) : createProperty(payload);
    },
    onSuccess: () => {
      toast.success(form.id ? t("property.common.saved", "Property updated.") : t("property.common.created", "Property created."));
      queryClient.invalidateQueries({ queryKey: ["property", "properties"] });
      closeModal();
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save property.")));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProperty,
    onSuccess: () => {
      toast.success(t("property.common.deleted", "Property deleted."));
      queryClient.invalidateQueries({ queryKey: ["property", "properties"] });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to delete property.")));
    },
  });

  const handleTableQueryChange = React.useCallback((query: DataTableQuery) => {
    setTableQuery({
      page: Number(query.page || 1),
      pageSize: Number(query.pageSize || 10),
      search: String(query.search ?? ""),
      sortCol: String(query.sortCol || "created_at"),
      sortDir: query.sortDir === "asc" ? "asc" : "desc",
    });
  }, []);

  const openCreate = React.useCallback(() => {
    setForm(DEFAULT_FORM);
    setOpen(true);
  }, []);

  const openEdit = React.useCallback((property: Property) => {
    setForm({
      id: property.id,
      name: property.name,
      type: property.type,
      city: property.city ?? "",
      country: property.country ?? "",
      description: property.description ?? "",
    });
    setOpen(true);
  }, []);

  const closeModal = React.useCallback(() => {
    setOpen(false);
    setForm(DEFAULT_FORM);
  }, []);

  const handleSave = React.useCallback(() => {
    if (!form.name.trim()) {
      toast.error(t("property.properties.name_required", "Property name is required."));
      return;
    }
    saveMutation.mutate();
  }, [form.name, saveMutation, t]);

  const columns = React.useMemo<ColumnDef<Property>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("property.common.name", "Property"),
        cell: ({ row }) => (
          <Link href={`/dashboard/property/${row.original.id}`} className="font-semibold hover:underline">
            {row.original.name}
            <p className="text-xs font-normal text-muted-foreground">{row.original.code}</p>
          </Link>
        ),
      },
      {
        accessorKey: "type",
        header: t("property.common.type", "Type"),
        enableSorting: false,
        cell: ({ row }) => <Badge variant="outline">{row.original.type.replace(/_/g, " ")}</Badge>,
      },
      {
        id: "location",
        header: t("property.common.location", "Location"),
        enableSorting: false,
        cell: ({ row }) => [row.original.city, row.original.country].filter(Boolean).join(", ") || "—",
      },
      {
        accessorKey: "buildings_count",
        header: t("property.properties.col_buildings", "Buildings"),
        enableSorting: false,
        cell: ({ row }) => row.original.buildings_count ?? 0,
        meta: { align: "right" as const },
      },
      {
        accessorKey: "units_count",
        header: t("property.properties.col_units", "Units"),
        enableSorting: false,
        cell: ({ row }) => row.original.units_count ?? 0,
        meta: { align: "right" as const },
      },
      {
        accessorKey: "status",
        header: t("property.common.status", "Status"),
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant={row.original.status === "active" ? "default" : "secondary"}>{row.original.status.replace(/_/g, " ")}</Badge>
        ),
        meta: { align: "center" as const },
      },
      {
        id: "actions",
        header: t("property.common.actions", "Actions"),
        enableSorting: false,
        cell: ({ row }) => {
          const property = row.original;
          return (
            <div className="flex justify-start gap-2">
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => openEdit(property)}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                {t("property.common.edit", "Edit")}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="rounded-full" disabled={deleteMutation.isPending}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    {t("property.common.delete", "Delete")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2rem] border-border/60 bg-background/95 backdrop-blur-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("property.properties.delete_confirm_title", "Delete Property?")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("property.properties.delete_confirm_desc", "This cannot be undone.")} <strong>{property.name}</strong>.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">{t("property.common.cancel", "Cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-xl bg-destructive hover:bg-destructive/90"
                      onClick={() => deleteMutation.mutate(property.id)}
                    >
                      {t("property.common.confirm", "Confirm Delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        },
      },
    ],
    [deleteMutation, openEdit, t]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">{t("property.properties.title", "Properties")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("property.properties.subtitle", "The portfolio: buildings, malls, apartment complexes and land under management.")}
          </p>
        </div>
        <Button className="rounded-full px-5" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("property.properties.add_btn", "Add Property")}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={propertiesQuery.data?.data ?? []}
        totalEntries={propertiesQuery.data?.total ?? 0}
        loading={propertiesQuery.isLoading || propertiesQuery.isFetching}
        pageIndex={tableQuery.page}
        pageSize={tableQuery.pageSize}
        onQueryChange={handleTableQueryChange}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ["property", "properties"] })}
        onResetFilters={() => setTableQuery(DEFAULT_QUERY)}
        searchPlaceholder={t("property.properties.search_placeholder", "Search properties...")}
        resourceName="properties"
        syncWithUrl={false}
      />

      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeModal())}>
        <DialogContent className="sm:max-w-2xl rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">
                {form.id ? t("property.properties.edit_title", "Edit Property") : t("property.properties.create_title", "Create Property")}
              </DialogTitle>
              <DialogDescription>
                {t("property.properties.modal_desc", "A code is generated automatically if you leave it blank.")}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="property-name">{t("property.common.name", "Name")}</Label>
              <Input
                id="property-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Merkato Business Tower"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="property-type">{t("property.common.type", "Type")}</Label>
              <select
                id="property-type"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
              >
                {PROPERTY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="property-city">{t("property.common.city", "City")}</Label>
                <Input id="property-city" value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="property-country">{t("property.common.country", "Country")}</Label>
                <Input id="property-country" value={form.country} onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="property-description">{t("property.common.description", "Description")}</Label>
              <Input
                id="property-description"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border/40 bg-muted/20 px-6 py-4 sm:justify-end">
            <Button variant="outline" className="rounded-full" onClick={closeModal}>
              {t("property.common.cancel", "Cancel")}
            </Button>
            <Button className="rounded-full" disabled={saveMutation.isPending} onClick={handleSave}>
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {form.id ? t("property.common.save_changes", "Save Changes") : t("property.common.create", "Create Property")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
