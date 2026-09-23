"use client";

import * as React from "react";
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
import {
  billMeterReading,
  createUtilityMeter,
  createUtilityType,
  fetchMeterReadings,
  fetchProperties,
  fetchUnits,
  fetchUtilityMeters,
  fetchUtilityTypes,
  previewMeterReadingCharge,
  recordMeterReading,
} from "@/modules/property/api";
import type { PropertyUtilityChargePreview, PropertyUtilityMeter } from "@/modules/property/types";

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
};

export default function UtilitiesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [tableQuery, setTableQuery] = React.useState({ page: 1, pageSize: 15 });
  const [typeForm, setTypeForm] = React.useState({ code: "", name: "", unit_of_measure: "" });
  const [meterOpen, setMeterOpen] = React.useState(false);
  const [meterForm, setMeterForm] = React.useState({ utility_type_id: "", property_id: "", unit_id: "", meter_number: "" });
  const [readingsMeter, setReadingsMeter] = React.useState<PropertyUtilityMeter | null>(null);
  const [readingForm, setReadingForm] = React.useState({ reading_date: "", current_reading: "" });
  const [preview, setPreview] = React.useState<{ readingId: number; data: PropertyUtilityChargePreview } | null>(null);

  const typesQuery = useQuery({ queryKey: ["property", "utility-types"], queryFn: () => fetchUtilityTypes() });
  const propertiesQuery = useQuery({ queryKey: ["property", "properties", "picker"], queryFn: () => fetchProperties({ per_page: 200 }), enabled: meterOpen });
  const unitsQuery = useQuery({
    queryKey: ["property", "units", "picker", meterForm.property_id],
    queryFn: () => fetchUnits({ property_id: Number(meterForm.property_id), per_page: 200 }),
    enabled: meterOpen && !!meterForm.property_id,
  });

  const metersQuery = useQuery({
    queryKey: ["property", "utility-meters", tableQuery],
    queryFn: () => fetchUtilityMeters({ page: tableQuery.page, per_page: tableQuery.pageSize }),
  });

  const readingsQuery = useQuery({
    queryKey: ["property", "utility-meters", readingsMeter?.id, "readings"],
    queryFn: () => fetchMeterReadings(readingsMeter!.id),
    enabled: readingsMeter !== null,
  });

  const createTypeMutation = useMutation({
    mutationFn: () => createUtilityType(typeForm),
    onSuccess: () => {
      toast.success(t("property.utilities.type_created", "Utility type added."));
      setTypeForm({ code: "", name: "", unit_of_measure: "" });
      queryClient.invalidateQueries({ queryKey: ["property", "utility-types"] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const createMeterMutation = useMutation({
    mutationFn: () =>
      createUtilityMeter({
        utility_type_id: Number(meterForm.utility_type_id),
        property_id: Number(meterForm.property_id),
        unit_id: meterForm.unit_id ? Number(meterForm.unit_id) : undefined,
        meter_number: meterForm.meter_number.trim(),
      }),
    onSuccess: () => {
      toast.success(t("property.utilities.meter_created", "Meter added."));
      setMeterOpen(false);
      setMeterForm({ utility_type_id: "", property_id: "", unit_id: "", meter_number: "" });
      queryClient.invalidateQueries({ queryKey: ["property", "utility-meters"] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const recordReadingMutation = useMutation({
    mutationFn: () => recordMeterReading(readingsMeter!.id, readingForm),
    onSuccess: () => {
      toast.success(t("property.utilities.reading_recorded", "Reading recorded."));
      setReadingForm({ reading_date: "", current_reading: "" });
      queryClient.invalidateQueries({ queryKey: ["property", "utility-meters", readingsMeter?.id, "readings"] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const previewMutation = useMutation({
    mutationFn: (readingId: number) => previewMeterReadingCharge(readingId),
    onSuccess: (data, readingId) => setPreview({ readingId, data }),
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.utilities.no_tariff", "No tariff is effective for this reading's date."))),
  });

  const billMutation = useMutation({
    mutationFn: (readingId: number) => billMeterReading(readingId),
    onSuccess: () => {
      toast.success(t("property.utilities.billed", "Charge posted."));
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ["property", "utility-meters", readingsMeter?.id, "readings"] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, t("property.common.failed", "Failed to save."))),
  });

  const handleTableQueryChange = React.useCallback((query: DataTableQuery) => {
    setTableQuery({ page: Number(query.page || 1), pageSize: Number(query.pageSize || 15) });
  }, []);

  const columns = React.useMemo<ColumnDef<PropertyUtilityMeter>[]>(
    () => [
      {
        accessorKey: "meter_number",
        header: t("property.utilities.col_meter", "Meter"),
        cell: ({ row }) => (
          <div>
            <p className="font-semibold">{row.original.meter_number}</p>
            <p className="text-xs text-muted-foreground">{row.original.utility_type?.name}</p>
          </div>
        ),
      },
      {
        id: "location",
        header: t("property.common.location", "Location"),
        enableSorting: false,
        cell: ({ row }) => [row.original.property?.name, row.original.unit?.unit_code].filter(Boolean).join(" / ") || "—",
      },
      {
        accessorKey: "is_active",
        header: t("property.common.status", "Status"),
        enableSorting: false,
        cell: ({ row }) => <Badge variant={row.original.is_active ? "default" : "secondary"}>{row.original.is_active ? "active" : "inactive"}</Badge>,
      },
      {
        id: "actions",
        header: t("property.common.actions", "Actions"),
        enableSorting: false,
        cell: ({ row }) => (
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => setReadingsMeter(row.original)}>
            {t("property.utilities.readings", "Readings")}
          </Button>
        ),
      },
    ],
    [t]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{t("property.utilities.title", "Utilities")}</h1>
        <p className="text-sm text-muted-foreground">{t("property.utilities.subtitle", "Meters, readings and tariff-based tenant billing.")}</p>
      </div>

      <div className="rounded-2xl border border-border/50 p-4 space-y-3">
        <p className="text-sm font-semibold">{t("property.utilities.types_title", "Utility Types")}</p>
        <div className="flex flex-wrap gap-2">
          {(typesQuery.data ?? []).map((type) => (
            <Badge key={type.id} variant="outline">
              {type.name} ({type.unit_of_measure})
            </Badge>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Input placeholder={t("property.utilities.type_code", "Code")} value={typeForm.code} onChange={(e) => setTypeForm((p) => ({ ...p, code: e.target.value }))} />
          <Input placeholder={t("property.common.name", "Name")} value={typeForm.name} onChange={(e) => setTypeForm((p) => ({ ...p, name: e.target.value }))} />
          <Input
            placeholder={t("property.utilities.unit_of_measure", "Unit (kWh, m3...)")}
            value={typeForm.unit_of_measure}
            onChange={(e) => setTypeForm((p) => ({ ...p, unit_of_measure: e.target.value }))}
          />
          <Button
            size="sm"
            className="rounded-full"
            disabled={!typeForm.code || !typeForm.name || !typeForm.unit_of_measure || createTypeMutation.isPending}
            onClick={() => createTypeMutation.mutate()}
          >
            {createTypeMutation.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
            {t("property.common.create", "Create")}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{t("property.utilities.meters_title", "Meters")}</p>
        <Button size="sm" className="rounded-full" onClick={() => setMeterOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          {t("property.utilities.add_meter", "Add Meter")}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={metersQuery.data?.data ?? []}
        totalEntries={metersQuery.data?.total ?? 0}
        loading={metersQuery.isLoading || metersQuery.isFetching}
        pageIndex={tableQuery.page}
        pageSize={tableQuery.pageSize}
        onQueryChange={handleTableQueryChange}
        resourceName="meters"
        syncWithUrl={false}
      />

      <Dialog open={meterOpen} onOpenChange={setMeterOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle>{t("property.utilities.add_meter", "Add Meter")}</DialogTitle>
            </DialogHeader>
          </div>
          <div className="grid gap-4 px-6 py-5">
            <div className="space-y-2">
              <Label>{t("property.utilities.utility_type", "Utility Type")}</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={meterForm.utility_type_id}
                onChange={(e) => setMeterForm((p) => ({ ...p, utility_type_id: e.target.value }))}
              >
                <option value="">{t("property.common.none", "None")}</option>
                {(typesQuery.data ?? []).map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t("property.common.name", "Property")}</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={meterForm.property_id}
                onChange={(e) => setMeterForm((p) => ({ ...p, property_id: e.target.value, unit_id: "" }))}
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
              <Label>{t("property.detail.units", "Unit")} ({t("property.utilities.optional", "optional — leave blank for a common-area meter")})</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={meterForm.unit_id}
                onChange={(e) => setMeterForm((p) => ({ ...p, unit_id: e.target.value }))}
                disabled={!meterForm.property_id}
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
              <Label>{t("property.utilities.meter_number", "Meter Number")}</Label>
              <Input value={meterForm.meter_number} onChange={(e) => setMeterForm((p) => ({ ...p, meter_number: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="border-t border-border/40 bg-muted/20 px-6 py-4 sm:justify-end">
            <Button variant="outline" className="rounded-full" onClick={() => setMeterOpen(false)}>
              {t("property.common.cancel", "Cancel")}
            </Button>
            <Button
              className="rounded-full"
              disabled={!meterForm.utility_type_id || !meterForm.property_id || !meterForm.meter_number.trim() || createMeterMutation.isPending}
              onClick={() => createMeterMutation.mutate()}
            >
              {createMeterMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("property.common.create", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={readingsMeter !== null} onOpenChange={(next) => !next && setReadingsMeter(null)}>
        <DialogContent className="sm:max-w-lg rounded-[2rem] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <div className="border-b border-border/40 px-6 py-5">
            <DialogHeader>
              <DialogTitle>{readingsMeter?.meter_number}</DialogTitle>
              <DialogDescription>{t("property.utilities.readings", "Readings")}</DialogDescription>
            </DialogHeader>
          </div>
          <div className="grid gap-4 px-6 py-5 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="space-y-1">
                <Label>{t("property.utilities.reading_date", "Date")}</Label>
                <Input type="date" value={readingForm.reading_date} onChange={(e) => setReadingForm((p) => ({ ...p, reading_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t("property.utilities.current_reading", "Current Reading")}</Label>
                <Input type="number" value={readingForm.current_reading} onChange={(e) => setReadingForm((p) => ({ ...p, current_reading: e.target.value }))} />
              </div>
              <Button
                size="sm"
                className="rounded-full"
                disabled={!readingForm.reading_date || !readingForm.current_reading || recordReadingMutation.isPending}
                onClick={() => recordReadingMutation.mutate()}
              >
                {recordReadingMutation.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                {t("property.common.create", "Record")}
              </Button>
            </div>

            <div className="space-y-2">
              {(readingsQuery.data?.data ?? []).map((reading) => (
                <div key={reading.id} className="rounded-xl border border-border/50 px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{reading.reading_date} — {reading.consumption}</p>
                      <p className="text-xs text-muted-foreground">
                        {reading.previous_reading} → {reading.current_reading}
                      </p>
                    </div>
                    {reading.is_billed ? (
                      <Badge>{t("property.utilities.billed_badge", "billed")}</Badge>
                    ) : reading.reversed_at ? (
                      <Badge variant="destructive">{t("property.utilities.reversed_badge", "reversed")}</Badge>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => previewMutation.mutate(reading.id)}>
                          {t("property.leases.preview", "Preview")}
                        </Button>
                        {preview?.readingId === reading.id && (
                          <Button size="sm" className="rounded-full" disabled={billMutation.isPending} onClick={() => billMutation.mutate(reading.id)}>
                            {billMutation.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                            {t("property.utilities.bill", "Bill")} {preview.data.charge_amount}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(readingsQuery.data?.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">{t("property.utilities.no_readings", "No readings yet.")}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
