"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { propertyApi } from "@/modules/property/api";
import {
  FormDialog,
  type FormField,
  type FormValues,
  PageHeader,
  SectionTabs,
  SimpleTable,
  dateOnly,
  errorText,
  humanize,
  money,
  rowsOf,
  usePropertyOptions,
} from "@/modules/property/components/property-ui";
import { Panel } from "@/modules/shared/charts/primitives";
import { useTranslation } from "@/store/use-translation";

type Tab = "meters" | "tariffs" | "types";
type DialogKind = "type" | "tariff" | "meter" | "reading" | { reverse: any } | null;

export default function UtilitiesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState<Tab>("meters");
  const [dialog, setDialog] = React.useState<DialogKind>(null);
  const [meter, setMeter] = React.useState<any | null>(null);
  const [billPreview, setBillPreview] = React.useState<{ reading: any; data: any } | null>(null);
  const { options: propertyOptions } = usePropertyOptions();

  const typesQuery = useQuery({
    queryKey: ["property", "utility-types"],
    queryFn: () => propertyApi.listUtilityTypes().then((res) => res.data),
  });
  const tariffsQuery = useQuery({
    queryKey: ["property", "utility-tariffs"],
    queryFn: () => propertyApi.listTariffs({ per_page: 100 }).then((res) => res.data),
    enabled: tab === "tariffs",
  });
  const metersQuery = useQuery({
    queryKey: ["property", "utility-meters"],
    queryFn: () => propertyApi.listMeters({ per_page: 200 }).then((res) => res.data),
    enabled: tab === "meters",
  });
  const readingsQuery = useQuery({
    queryKey: ["property", "utility-readings", meter?.id],
    queryFn: () => propertyApi.listReadings(meter.id).then((res) => res.data),
    enabled: Boolean(meter),
  });

  const unitsQuery = useQuery({
    queryKey: ["property", "meter-units"],
    queryFn: () => propertyApi.listUnits({ per_page: 200 }).then((res) => res.data),
    enabled: dialog === "meter",
  });
  const unitOptions = rowsOf<any>(unitsQuery.data).map((u) => ({
    value: u.id,
    label: `${u.unit_code}${u.property?.name ? ` · ${u.property.name}` : ""}`,
  }));

  const types = rowsOf<any>(typesQuery.data);
  const typeOptions = types.map((type) => ({ value: type.id, label: `${type.name} (${type.unit_of_measure})` }));
  const typeName = (id: number) => types.find((type) => type.id === id)?.name ?? "—";

  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      toast.success("Saved.");
      setDialog(null);
      setBillPreview(null);
      queryClient.invalidateQueries({ queryKey: ["property"] });
    },
    onError: (error) => toast.error(errorText(error, "That did not work.")),
  });

  const previewBill = async (reading: any) => {
    try {
      const res = await propertyApi.previewReadingBill(reading.id);
      setBillPreview({ reading, data: res.data });
    } catch (error) {
      toast.error(errorText(error, "Could not preview the bill."));
    }
  };

  let config: { title: string; description?: string; fields: FormField[]; initial?: FormValues; submit: (v: FormValues) => Promise<unknown> } | null = null;
  if (dialog === "type") {
    config = {
      title: "Add utility type",
      fields: [
        { name: "code", label: "Code", required: true, placeholder: "e.g. ELEC" },
        { name: "name", label: "Name", required: true, placeholder: "e.g. Electricity" },
        { name: "unit_of_measure", label: "Unit", required: true, placeholder: "e.g. kWh, m³" },
      ],
      submit: (v) => propertyApi.createUtilityType({ ...v, is_active: true }),
    };
  } else if (dialog === "tariff") {
    config = {
      title: "Add tariff",
      description: "Stepped tariffs are set up through the API for now; flat and per-unit rates are entered here.",
      fields: [
        { name: "utility_type_id", label: "Utility", type: "select", options: typeOptions, required: true },
        {
          name: "structure",
          label: "Structure",
          type: "select",
          required: true,
          options: [
            { value: "per_unit", label: "Per unit consumed" },
            { value: "flat", label: "Flat charge" },
          ],
        },
        { name: "rate", label: "Rate", type: "number", min: 0, required: true },
        { name: "fixed_monthly_charge", label: "Fixed monthly charge", type: "number", min: 0 },
        { name: "minimum_charge", label: "Minimum charge", type: "number", min: 0 },
        { name: "effective_from", label: "Effective from", type: "date", required: true },
        { name: "effective_to", label: "Effective to", type: "date" },
      ],
      initial: { structure: "per_unit" },
      submit: (v) => propertyApi.createTariff(v),
    };
  } else if (dialog === "meter") {
    config = {
      title: "Add meter",
      fields: [
        { name: "utility_type_id", label: "Utility", type: "select", options: typeOptions, required: true },
        { name: "property_id", label: "Property", type: "select", options: propertyOptions, required: true },
        { name: "meter_number", label: "Meter number", required: true },
        { name: "serial_number", label: "Serial number" },
        { name: "unit_id", label: "Unit (sub-meter)", type: "select", options: unitOptions, help: "Leave empty for a property's main meter." },
        { name: "multiplier", label: "Multiplier", type: "number", min: 0, step: "0.0001" },
        { name: "initial_reading", label: "Initial reading", type: "number", min: 0 },
        { name: "installed_on", label: "Installed on", type: "date" },
      ],
      submit: (v) => propertyApi.createMeter(v),
    };
  } else if (dialog === "reading" && meter) {
    config = {
      title: `Record reading · ${meter.meter_number}`,
      fields: [
        { name: "reading_date", label: "Reading date", type: "date", required: true },
        { name: "current_reading", label: "Reading", type: "number", required: true },
        {
          name: "method",
          label: "Method",
          type: "select",
          options: [
            { value: "manual", label: "Manual" },
            { value: "photo", label: "Photo" },
            { value: "estimated", label: "Estimated" },
          ],
        },
        { name: "is_estimated", label: "Estimated reading", type: "checkbox" },
        { name: "allow_reset", label: "Meter was reset / replaced", type: "checkbox" },
        { name: "notes", label: "Notes", type: "textarea" },
      ],
      initial: { reading_date: new Date().toISOString().slice(0, 10), method: "manual" },
      submit: (v) => propertyApi.createReading(meter.id, v),
    };
  } else if (dialog && typeof dialog === "object") {
    const reading = dialog.reverse;
    config = {
      title: "Reverse reading",
      description: "A wrong reading is reversed with a reason, never deleted.",
      fields: [{ name: "reason", label: "Reason", type: "textarea", required: true }],
      submit: (v) => propertyApi.reverseReading(reading.id, v.reason),
    };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("property.utilities.title", "Utilities")}
        subtitle={t("property.utilities.subtitle", "Meters, readings and tariffs. A reading is previewed, then billed to the unit's occupier through Finance.")}
        actions={
          <Button
            className="rounded-full px-5"
            onClick={() => setDialog(tab === "types" ? "type" : tab === "tariffs" ? "tariff" : "meter")}
          >
            <Plus className="mr-2 h-4 w-4" /> {tab === "types" ? "Utility type" : tab === "tariffs" ? "Tariff" : "Meter"}
          </Button>
        }
      />

      <SectionTabs<Tab>
        tabs={[
          { id: "meters", label: "Meters & readings" },
          { id: "tariffs", label: "Tariffs" },
          { id: "types", label: "Utility types" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "types" ? (
        <Panel title="Utility types">
          <SimpleTable
            loading={typesQuery.isLoading}
            rows={types}
            empty="Add electricity, water or gas to start metering."
            columns={[
              { key: "code", label: "Code" },
              { key: "name", label: "Name" },
              { key: "unit_of_measure", label: "Unit" },
              {
                key: "actions",
                label: "",
                className: "text-right",
                render: (row) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    aria-label="Delete"
                    onClick={() => {
                      if (window.confirm(`Delete ${row.name}?`)) run.mutate(() => propertyApi.deleteUtilityType(row.id));
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ),
              },
            ]}
          />
        </Panel>
      ) : null}

      {tab === "tariffs" ? (
        <Panel title="Tariffs">
          <SimpleTable
            loading={tariffsQuery.isLoading}
            rows={rowsOf<any>(tariffsQuery.data)}
            empty="No tariffs yet."
            columns={[
              { key: "utility_type_id", label: "Utility", render: (row) => row.utility_type?.name ?? typeName(row.utility_type_id) },
              { key: "structure", label: "Structure" },
              { key: "rate", label: "Rate", render: (row) => (row.rate !== null && row.rate !== undefined ? money(row.rate) : "Stepped") },
              { key: "fixed_monthly_charge", label: "Fixed / month", render: (row) => money(row.fixed_monthly_charge) },
              { key: "effective_from", label: "From", render: (row) => dateOnly(row.effective_from) },
              { key: "effective_to", label: "To", render: (row) => dateOnly(row.effective_to) },
            ]}
          />
        </Panel>
      ) : null}

      {tab === "meters" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Meters">
            <SimpleTable
              loading={metersQuery.isLoading}
              rows={rowsOf<any>(metersQuery.data)}
              empty="No meters yet."
              columns={[
                {
                  key: "meter_number",
                  label: "Meter",
                  render: (row) => (
                    <button
                      type="button"
                      onClick={() => {
                        setMeter(row);
                        setBillPreview(null);
                      }}
                      className={`text-left font-semibold ${meter?.id === row.id ? "text-primary" : "hover:underline"}`}
                    >
                      {row.meter_number}
                    </button>
                  ),
                },
                { key: "utility_type_id", label: "Utility", render: (row) => row.utility_type?.name ?? typeName(row.utility_type_id) },
                { key: "property", label: "Property", render: (row) => row.property?.name ?? "—" },
                { key: "unit", label: "Unit", render: (row) => row.unit?.unit_code ?? "Main" },
              ]}
            />
          </Panel>

          <Panel
            title={meter ? `Readings · ${meter.meter_number}` : "Readings"}
            description={meter ? undefined : "Pick a meter to see and record readings."}
            action={
              <Button size="sm" variant="outline" disabled={!meter} onClick={() => setDialog("reading")}>
                <Plus className="mr-1 h-4 w-4" /> Reading
              </Button>
            }
          >
            {billPreview ? (
              <div className="mb-4 rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">
                <p className="font-semibold">Bill preview for the {dateOnly(billPreview.reading.reading_date)} reading</p>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                  {Object.entries(billPreview.data ?? {})
                    .filter(([, value]) => typeof value !== "object")
                    .map(([key, value]) => `${humanize(key)}: ${value}`)
                    .join("\n")}
                </pre>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" disabled={run.isPending} onClick={() => run.mutate(() => propertyApi.billReading(billPreview.reading.id))}>
                    Raise invoice
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setBillPreview(null)}>
                    Close
                  </Button>
                </div>
              </div>
            ) : null}
            <SimpleTable
              loading={readingsQuery.isLoading && Boolean(meter)}
              rows={rowsOf<any>(readingsQuery.data)}
              empty={meter ? "No readings yet." : "No meter selected."}
              columns={[
                { key: "reading_date", label: "Date", render: (row) => dateOnly(row.reading_date) },
                { key: "current_reading", label: "Reading" },
                { key: "consumption", label: "Used" },
                {
                  key: "state",
                  label: "",
                  render: (row) =>
                    row.reversed_at ? (
                      <span className="text-xs text-destructive">Reversed</span>
                    ) : row.is_billed ? (
                      <span className="text-xs text-muted-foreground">Billed</span>
                    ) : row.is_estimated ? (
                      <span className="text-xs text-amber-600">Estimated</span>
                    ) : null,
                },
                {
                  key: "actions",
                  label: "",
                  className: "text-right",
                  render: (row) =>
                    row.reversed_at || row.is_billed ? null : (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => previewBill(row)}>
                          Bill
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDialog({ reverse: row })}>
                          Reverse
                        </Button>
                      </div>
                    ),
                },
              ]}
            />
          </Panel>
        </div>
      ) : null}

      {config ? (
        <FormDialog
          open
          onOpenChange={(open) => !open && setDialog(null)}
          title={config.title}
          description={config.description}
          fields={config.fields}
          initial={config.initial}
          submitting={run.isPending}
          onSubmit={(values) => run.mutate(() => config!.submit(values))}
        />
      ) : null}
    </div>
  );
}
