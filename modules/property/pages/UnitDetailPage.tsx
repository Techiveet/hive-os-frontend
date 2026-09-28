"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Wrench } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { propertyApi } from "@/modules/property/api";
import { DocumentsPanel } from "@/modules/property/components/documents-panel";
import {
  FormDialog,
  type FormField,
  type FormValues,
  StatusBadge,
  dateOnly,
  errorText,
  humanize,
  money,
  optionsFrom,
} from "@/modules/property/components/property-ui";
import { UNIT_TRANSITIONS, UNIT_TYPES } from "@/modules/property/pages/UnitsPage";
import { EmptyPanel, LoadingPanel, Panel } from "@/modules/shared/charts/primitives";

const RETAILER_TYPES = [
  "anchor_tenant", "standard_retailer", "kiosk", "pop_up_shop", "restaurant", "food_court",
  "entertainment", "service_provider", "atm_bank", "advertising_tenant",
] as const;
const TRADING_STATUSES = ["not_open", "trading", "temporarily_closed", "permanently_closed"] as const;
const FIT_OUT_STATUSES = ["pending", "in_progress", "completed"] as const;

const unitFields: FormField[] = [
  { name: "unit_code", label: "Unit code", required: true },
  { name: "unit_type", label: "Type", type: "select", options: optionsFrom(UNIT_TYPES), required: true },
  { name: "usage_type", label: "Usage" },
  { name: "floor_area", label: "Floor area (m²)", type: "number", min: 0 },
  { name: "rentable_area", label: "Rentable area (m²)", type: "number", min: 0 },
  { name: "carpet_area", label: "Carpet area (m²)", type: "number", min: 0 },
  { name: "bedrooms", label: "Bedrooms", type: "number", min: 0 },
  { name: "bathrooms", label: "Bathrooms", type: "number", min: 0 },
  { name: "rent_rate", label: "Asking rent", type: "number", min: 0 },
  { name: "min_rent_rate", label: "Minimum rent", type: "number", min: 0 },
  { name: "availability_date", label: "Available from", type: "date" },
  { name: "is_furnished", label: "Furnished", type: "checkbox" },
];

const retailFields: FormField[] = [
  { name: "retailer_type", label: "Retailer type", type: "select", options: optionsFrom(RETAILER_TYPES), required: true },
  { name: "retail_category", label: "Category", placeholder: "e.g. fashion, electronics" },
  { name: "shop_size", label: "Shop size (m²)", type: "number", min: 0 },
  { name: "frontage", label: "Frontage (m)", type: "number", min: 0 },
  { name: "trading_status", label: "Trading status", type: "select", options: optionsFrom(TRADING_STATUSES) },
  { name: "fit_out_status", label: "Fit-out", type: "select", options: optionsFrom(FIT_OUT_STATUSES) },
  { name: "store_opening_date", label: "Opening date", type: "date" },
  { name: "operating_rules", label: "Operating rules", type: "textarea" },
];

type DialogKind = "edit" | "status" | "retail" | null;

export default function UnitDetailPage() {
  const params = useParams();
  const unitId = String(params?.id ?? "");
  const queryClient = useQueryClient();
  const [dialog, setDialog] = React.useState<DialogKind>(null);

  const unitQuery = useQuery({
    queryKey: ["property", "unit", unitId],
    queryFn: () => propertyApi.getUnit(unitId).then((res) => res.data),
    enabled: Boolean(unitId),
  });
  const maintenanceQuery = useQuery({
    queryKey: ["property", "unit-maintenance", unitId],
    queryFn: () => propertyApi.unitMaintenance(unitId).then((res) => res.data),
    enabled: Boolean(unitId),
    retry: false,
  });
  const retailQuery = useQuery({
    queryKey: ["property", "unit-retail", unitId],
    queryFn: () => propertyApi.getRetailProfile(unitId).then((res) => res.data),
    enabled: Boolean(unitId),
    retry: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["property"] });

  const save = useMutation({
    mutationFn: ({ kind, values }: { kind: Exclude<DialogKind, null>; values: FormValues }) => {
      if (kind === "edit") return propertyApi.updateUnit(unitId, values);
      if (kind === "status") return propertyApi.changeUnitStatus(unitId, values.status, values.reason);
      return propertyApi.saveRetailProfile(unitId, values);
    },
    onSuccess: () => {
      toast.success("Saved.");
      setDialog(null);
      invalidate();
    },
    onError: (error) => toast.error(errorText(error, "Could not save it.")),
  });

  const enableMaintenance = useMutation({
    mutationFn: () => propertyApi.enableUnitMaintenance(unitId),
    onSuccess: () => {
      toast.success("Unit linked to Service Management.");
      invalidate();
    },
    onError: (error) => toast.error(errorText(error, "Could not enable maintenance.")),
  });

  const unit = unitQuery.data;
  if (unitQuery.isLoading) return <LoadingPanel label="Loading unit…" />;
  if (!unit) return <EmptyPanel label="This unit could not be found." />;

  const nextStatuses = UNIT_TRANSITIONS[unit.status] ?? [];
  const maintenance = maintenanceQuery.data;
  const retail = retailQuery.data && typeof retailQuery.data === "object" && retailQuery.data.retailer_type ? retailQuery.data : null;

  const fact = (label: string, value: React.ReactNode) => (
    <div>
      <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value ?? "—"}</dd>
    </div>
  );

  const dialogs: Record<Exclude<DialogKind, null>, { title: string; fields: FormField[]; initial?: FormValues }> = {
    edit: { title: "Edit unit", fields: unitFields, initial: unit },
    status: {
      title: "Change status",
      fields: [
        { name: "status", label: "New status", type: "select", options: optionsFrom(nextStatuses), required: true },
        { name: "reason", label: "Reason", type: "textarea" },
      ],
    },
    retail: { title: "Retail profile", fields: retailFields, initial: retail ?? undefined },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Link href="/dashboard/property/units" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Units
          </Link>
          <h1 className="text-3xl font-black tracking-tight">{unit.unit_code}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="capitalize">{humanize(unit.unit_type)}</span>
            <StatusBadge status={unit.status} />
            {unit.property ? (
              <Link href={`/dashboard/property/properties/${unit.property.id}`} className="hover:underline">
                {unit.property.name}
              </Link>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full" disabled={nextStatuses.length === 0} onClick={() => setDialog("status")}>
            Change status
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => setDialog("edit")}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Details">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {fact("Building", unit.building?.name)}
            {fact("Floor", unit.floor?.name ?? unit.floor?.level)}
            {fact("Zone", unit.zone?.name)}
            {fact("Rentable area", unit.rentable_area ? `${unit.rentable_area} m²` : null)}
            {fact("Floor area", unit.floor_area ? `${unit.floor_area} m²` : null)}
            {fact("Bedrooms / baths", unit.bedrooms !== null || unit.bathrooms !== null ? `${unit.bedrooms ?? 0} / ${unit.bathrooms ?? 0}` : null)}
            {fact("Asking rent", unit.rent_rate ? money(unit.rent_rate, unit.currency || "ETB") : null)}
            {fact("Minimum rent", unit.min_rent_rate ? money(unit.min_rent_rate, unit.currency || "ETB") : null)}
            {fact("Available from", dateOnly(unit.availability_date))}
            {fact("Furnished", unit.is_furnished ? "Yes" : "No")}
            {fact(
              "Current lease",
              unit.current_lease_id ? (
                <Link href={`/dashboard/property/leases/${unit.current_lease_id}`} className="text-primary hover:underline">
                  View lease
                </Link>
              ) : null,
            )}
          </dl>
        </Panel>

        <Panel
          title="Maintenance"
          description="Maintenance requests for this unit run through Service Management."
          action={
            !maintenance?.service_asset_id ? (
              <Button size="sm" variant="outline" disabled={enableMaintenance.isPending} onClick={() => enableMaintenance.mutate()}>
                <Wrench className="mr-2 h-4 w-4" /> Enable
              </Button>
            ) : null
          }
        >
          {maintenance?.service_asset_id ? (
            <p className="text-sm">
              Linked to service asset <span className="font-mono">{maintenance.service_asset?.code ?? `#${maintenance.service_asset_id}`}</span>.{" "}
              <Link href="/dashboard/service/requests" className="text-primary hover:underline">
                Raise a service request
              </Link>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Not linked yet. Enable it to raise and track repairs for this unit.</p>
          )}
        </Panel>

        <Panel
          title="Retail profile"
          description="For mall and retail units: retailer type, trading and fit-out status."
          action={
            <Button size="sm" variant="outline" onClick={() => setDialog("retail")}>
              {retail ? "Edit" : "Set up"}
            </Button>
          }
        >
          {retail ? (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {fact("Retailer type", humanize(retail.retailer_type))}
              {fact("Category", retail.retail_category)}
              {fact("Trading", humanize(retail.trading_status))}
              {fact("Fit-out", humanize(retail.fit_out_status))}
              {fact("Opened", dateOnly(retail.store_opening_date))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No retail profile.</p>
          )}
        </Panel>
      </div>

      <DocumentsPanel type="property_unit" id={unitId} />

      {dialog ? (
        <FormDialog
          open
          onOpenChange={(open) => !open && setDialog(null)}
          title={dialogs[dialog].title}
          fields={dialogs[dialog].fields}
          initial={dialogs[dialog].initial}
          submitting={save.isPending}
          onSubmit={(values) => save.mutate({ kind: dialog, values })}
        />
      ) : null}
    </div>
  );
}
