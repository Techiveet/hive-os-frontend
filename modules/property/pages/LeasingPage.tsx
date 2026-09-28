"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
  StatusBadge,
  dateOnly,
  dateTime,
  errorText,
  money,
  rowsOf,
  useOccupierOptions,
} from "@/modules/property/components/property-ui";
import { Panel } from "@/modules/shared/charts/primitives";
import { useTranslation } from "@/store/use-translation";

type Tab = "viewings" | "reservations";

export default function LeasingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState<Tab>("viewings");
  const [dialog, setDialog] = React.useState<"viewing" | "reservation" | { feedbackFor: any } | null>(null);
  const occupierOptions = useOccupierOptions();

  const viewingsQuery = useQuery({
    queryKey: ["property", "viewings"],
    queryFn: () => propertyApi.listViewings({ per_page: 100 }).then((res) => res.data),
    enabled: tab === "viewings",
  });
  const reservationsQuery = useQuery({
    queryKey: ["property", "reservations"],
    queryFn: () => propertyApi.listReservations({ per_page: 100 }).then((res) => res.data),
    enabled: tab === "reservations",
  });
  // Units a prospect can still view or reserve.
  const unitsQuery = useQuery({
    queryKey: ["property", "leasable-units"],
    queryFn: () => propertyApi.listUnits({ per_page: 200 }).then((res) => res.data),
    enabled: dialog === "viewing" || dialog === "reservation",
  });
  const unitOptions = rowsOf<any>(unitsQuery.data)
    .filter((u) => ["available", "reserved", "under_negotiation"].includes(u.status))
    .map((u) => ({ value: u.id, label: `${u.unit_code}${u.property?.name ? ` · ${u.property.name}` : ""}` }));

  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      toast.success("Saved.");
      setDialog(null);
      queryClient.invalidateQueries({ queryKey: ["property"] });
    },
    onError: (error) => toast.error(errorText(error, "Could not save it.")),
  });

  const prospectFields: FormField[] = [
    { name: "unit_id", label: "Unit", type: "select", options: unitOptions, required: true },
    { name: "prospect_property_tenant_id", label: "Existing occupier", type: "select", options: occupierOptions, help: "Or fill in the prospect below." },
    { name: "prospect_name", label: "Prospect name" },
    { name: "prospect_phone", label: "Phone" },
    { name: "prospect_email", label: "Email", type: "email" },
  ];

  let config: { title: string; fields: FormField[]; initial?: FormValues; submit: (v: FormValues) => Promise<unknown> } | null = null;
  if (dialog === "viewing") {
    config = {
      title: "Book a viewing",
      fields: [...prospectFields, { name: "scheduled_at", label: "When", type: "datetime-local", required: true }],
      submit: (v) => propertyApi.createViewing(v),
    };
  } else if (dialog === "reservation") {
    config = {
      title: "Reserve a unit",
      fields: [
        ...prospectFields,
        { name: "reservation_date", label: "Reserved on", type: "date", required: true },
        { name: "expires_at", label: "Hold until", type: "date", required: true },
        { name: "deposit_amount", label: "Reservation deposit", type: "number", min: 0 },
        { name: "quoted_rent", label: "Quoted rent", type: "number", min: 0 },
        { name: "conditions", label: "Conditions", type: "textarea" },
      ],
      initial: { reservation_date: new Date().toISOString().slice(0, 10) },
      submit: (v) => propertyApi.createReservation(v),
    };
  } else if (dialog && typeof dialog === "object") {
    const viewing = dialog.feedbackFor;
    config = {
      title: "Record viewing outcome",
      fields: [
        {
          name: "status",
          label: "Outcome",
          type: "select",
          required: true,
          options: [
            { value: "completed", label: "Completed" },
            { value: "no_show", label: "No show" },
            { value: "cancelled", label: "Cancelled" },
          ],
        },
        { name: "feedback", label: "Feedback", type: "textarea" },
        { name: "follow_up_at", label: "Follow up on", type: "date" },
      ],
      initial: { status: "completed" },
      submit: (v) => propertyApi.updateViewing(viewing.id, v),
    };
  }

  const prospect = (row: any) => row.prospect_name || row.prospect?.name || row.prospect_tenant?.name || "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("property.leasing.title", "Leasing pipeline")}
        subtitle={t("property.leasing.subtitle", "Book viewings for prospects, hold units with a reservation, then draft the lease.")}
        actions={
          <>
            <Button variant="outline" className="rounded-full" onClick={() => setDialog("viewing")}>
              <Plus className="mr-2 h-4 w-4" /> Viewing
            </Button>
            <Button className="rounded-full" onClick={() => setDialog("reservation")}>
              <Plus className="mr-2 h-4 w-4" /> Reservation
            </Button>
          </>
        }
      />

      <SectionTabs<Tab>
        tabs={[
          { id: "viewings", label: "Viewings" },
          { id: "reservations", label: "Reservations" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "viewings" ? (
        <Panel title="Viewings">
          <SimpleTable
            loading={viewingsQuery.isLoading}
            rows={rowsOf<any>(viewingsQuery.data)}
            empty="No viewings booked."
            columns={[
              { key: "scheduled_at", label: "When", render: (row) => dateTime(row.scheduled_at) },
              { key: "unit", label: "Unit", render: (row) => row.unit?.unit_code ?? "—" },
              { key: "prospect", label: "Prospect", render: prospect },
              { key: "prospect_phone", label: "Phone" },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
              { key: "feedback", label: "Feedback" },
              {
                key: "actions",
                label: "",
                className: "text-right",
                render: (row) =>
                  row.status === "scheduled" ? (
                    <Button size="sm" variant="ghost" onClick={() => setDialog({ feedbackFor: row })}>
                      Record outcome
                    </Button>
                  ) : null,
              },
            ]}
          />
        </Panel>
      ) : (
        <Panel title="Reservations">
          <SimpleTable
            loading={reservationsQuery.isLoading}
            rows={rowsOf<any>(reservationsQuery.data)}
            empty="No reservations."
            columns={[
              { key: "reservation_number", label: "Reservation", render: (row) => <span className="font-mono text-xs">{row.reservation_number}</span> },
              { key: "unit", label: "Unit", render: (row) => row.unit?.unit_code ?? "—" },
              { key: "prospect", label: "Prospect", render: prospect },
              { key: "expires_at", label: "Held until", render: (row) => dateOnly(row.expires_at) },
              { key: "quoted_rent", label: "Quoted rent", render: (row) => (row.quoted_rent ? money(row.quoted_rent, row.currency || "ETB") : "—") },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
              {
                key: "actions",
                label: "",
                className: "text-right",
                render: (row) =>
                  !["cancelled", "converted", "expired"].includes(row.status) ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm("Cancel this reservation and release the unit?")) run.mutate(() => propertyApi.cancelReservation(row.id));
                      }}
                    >
                      Cancel
                    </Button>
                  ) : null,
              },
            ]}
          />
        </Panel>
      )}

      {config ? (
        <FormDialog
          open
          onOpenChange={(open) => !open && setDialog(null)}
          title={config.title}
          fields={config.fields}
          initial={config.initial}
          submitting={run.isPending}
          onSubmit={(values) => run.mutate(() => config!.submit(values))}
        />
      ) : null}
    </div>
  );
}
