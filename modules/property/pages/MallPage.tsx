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
  PropertyPicker,
  SectionTabs,
  SimpleTable,
  StatusBadge,
  dateOnly,
  errorText,
  money,
  optionsFrom,
  rowsOf,
} from "@/modules/property/components/property-ui";
import { Panel } from "@/modules/shared/charts/primitives";
import { useTranslation } from "@/store/use-translation";

type Tab = "sales" | "footfall" | "promotions" | "advertising";

const PROMOTION_TYPES = ["campaign", "event", "promotion", "holiday_campaign"] as const;
const AD_SPACE_TYPES = ["billboard", "digital_screen", "banner", "atrium", "escalator_panel", "elevator", "event_space"] as const;

type DialogKind = "footfall" | "promotion" | "ad-space" | "ad-booking" | { reject: any } | null;

export default function MallPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState<Tab>("sales");
  const [propertyId, setPropertyId] = React.useState("");
  const [salesStatus, setSalesStatus] = React.useState("pending");
  const [space, setSpace] = React.useState<any | null>(null);
  const [dialog, setDialog] = React.useState<DialogKind>(null);

  const salesQuery = useQuery({
    queryKey: ["property", "mall-sales", salesStatus],
    queryFn: () => propertyApi.listSalesReports({ approval_status: salesStatus || undefined, per_page: 100 }).then((res) => res.data),
    enabled: tab === "sales",
  });
  const footfallQuery = useQuery({
    queryKey: ["property", "footfall", propertyId],
    queryFn: () => propertyApi.listFootfall(propertyId, { per_page: 60 }).then((res) => res.data),
    enabled: tab === "footfall" && Boolean(propertyId),
  });
  const promotionsQuery = useQuery({
    queryKey: ["property", "promotions", propertyId],
    queryFn: () => propertyApi.listPromotions(propertyId).then((res) => res.data),
    enabled: tab === "promotions" && Boolean(propertyId),
  });
  const spacesQuery = useQuery({
    queryKey: ["property", "ad-spaces", propertyId],
    queryFn: () => propertyApi.listAdvertisingSpaces({ property_id: propertyId, per_page: 100 }).then((res) => res.data),
    enabled: tab === "advertising" && Boolean(propertyId),
  });
  const bookingsQuery = useQuery({
    queryKey: ["property", "ad-bookings", space?.id],
    queryFn: () => propertyApi.listAdvertisingBookings(space.id).then((res) => res.data),
    enabled: Boolean(space),
  });

  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      toast.success("Done.");
      setDialog(null);
      queryClient.invalidateQueries({ queryKey: ["property"] });
    },
    onError: (error) => toast.error(errorText(error, "That did not work.")),
  });

  let config: { title: string; fields: FormField[]; initial?: FormValues; submit: (v: FormValues) => Promise<unknown> } | null = null;
  if (dialog === "footfall") {
    config = {
      title: "Record footfall",
      fields: [
        { name: "recorded_date", label: "Date", type: "date", required: true },
        { name: "visitor_count", label: "Visitors", type: "number", min: 0, required: true },
        { name: "entrance", label: "Entrance", placeholder: "e.g. North gate" },
        { name: "interval_start", label: "From", type: "time" },
        { name: "interval_end", label: "To", type: "time" },
      ],
      initial: { recorded_date: new Date().toISOString().slice(0, 10) },
      submit: (v) => propertyApi.recordFootfall(propertyId, { ...v, source: "manual" }),
    };
  } else if (dialog === "promotion") {
    config = {
      title: "New promotion",
      fields: [
        { name: "name", label: "Name", required: true },
        { name: "promotion_type", label: "Type", type: "select", options: optionsFrom(PROMOTION_TYPES) },
        { name: "start_date", label: "Starts", type: "date", required: true },
        { name: "end_date", label: "Ends", type: "date", required: true },
        { name: "location", label: "Location" },
        { name: "organizer", label: "Organizer" },
        { name: "cost", label: "Cost", type: "number", min: 0 },
        { name: "description", label: "Description", type: "textarea" },
      ],
      initial: { promotion_type: "campaign" },
      submit: (v) => propertyApi.createPromotion(propertyId, v),
    };
  } else if (dialog === "ad-space") {
    config = {
      title: "New advertising space",
      fields: [
        { name: "code", label: "Code", required: true },
        { name: "name", label: "Name", required: true },
        { name: "space_type", label: "Type", type: "select", options: optionsFrom(AD_SPACE_TYPES), required: true },
        { name: "rate_amount", label: "Rate", type: "number", min: 0, required: true },
        {
          name: "rate_period",
          label: "Per",
          type: "select",
          options: [
            { value: "daily", label: "Day" },
            { value: "weekly", label: "Week" },
            { value: "monthly", label: "Month" },
          ],
        },
        { name: "location_description", label: "Location", type: "textarea" },
      ],
      initial: { rate_period: "monthly" },
      submit: (v) => propertyApi.createAdvertisingSpace(propertyId, v),
    };
  } else if (dialog === "ad-booking" && space) {
    config = {
      title: `Book ${space.name}`,
      fields: [
        { name: "advertiser_name", label: "Advertiser", required: true },
        { name: "start_date", label: "From", type: "date", required: true },
        { name: "end_date", label: "To", type: "date", required: true },
        { name: "amount", label: "Amount", type: "number", min: 0, required: true },
        { name: "notes", label: "Notes", type: "textarea" },
      ],
      initial: { amount: space.rate_amount },
      submit: (v) => propertyApi.createAdvertisingBooking(space.id, v),
    };
  } else if (dialog && typeof dialog === "object") {
    const report = dialog.reject;
    config = {
      title: "Reject sales report",
      fields: [{ name: "reason", label: "Reason", type: "textarea" }],
      submit: (v) => propertyApi.rejectSalesReport(report.id, v.reason),
    };
  }

  const needsProperty = tab !== "sales";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("property.mall.title", "Mall operations")}
        subtitle={t(
          "property.mall.subtitle",
          "Approve tenants' sales reports for turnover rent, track footfall, run promotions and let advertising spaces.",
        )}
        actions={
          tab === "footfall" ? (
            <Button className="rounded-full px-5" disabled={!propertyId} onClick={() => setDialog("footfall")}>
              <Plus className="mr-2 h-4 w-4" /> Footfall
            </Button>
          ) : tab === "promotions" ? (
            <Button className="rounded-full px-5" disabled={!propertyId} onClick={() => setDialog("promotion")}>
              <Plus className="mr-2 h-4 w-4" /> Promotion
            </Button>
          ) : tab === "advertising" ? (
            <Button className="rounded-full px-5" disabled={!propertyId} onClick={() => setDialog("ad-space")}>
              <Plus className="mr-2 h-4 w-4" /> Advertising space
            </Button>
          ) : null
        }
      />

      <SectionTabs<Tab>
        tabs={[
          { id: "sales", label: "Sales reports" },
          { id: "footfall", label: "Footfall" },
          { id: "promotions", label: "Promotions" },
          { id: "advertising", label: "Advertising" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {needsProperty ? (
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <PropertyPicker value={propertyId} onChange={(v) => { setPropertyId(v); setSpace(null); }} />
        </div>
      ) : null}

      {tab === "sales" ? (
        <Panel
          title="Sales reports"
          description="Occupiers' reported sales. Approving one calculates the turnover rent due. Reports are submitted from each lease's Turnover tab."
          action={
            <select
              aria-label="Filter by status"
              value={salesStatus}
              onChange={(e) => setSalesStatus(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="">All</option>
            </select>
          }
        >
          <SimpleTable
            loading={salesQuery.isLoading}
            rows={rowsOf<any>(salesQuery.data)}
            empty="No sales reports."
            columns={[
              { key: "lease", label: "Lease", render: (row) => row.lease?.lease_number ?? `#${row.lease_id}` },
              { key: "unit", label: "Unit", render: (row) => row.unit?.unit_code ?? "—" },
              { key: "period", label: "Period", render: (row) => `${dateOnly(row.period_start)} → ${dateOnly(row.period_end)}` },
              { key: "gross_sales", label: "Gross", render: (row) => money(row.gross_sales) },
              { key: "net_sales", label: "Net", render: (row) => money(row.net_sales) },
              { key: "calculated_turnover_rent", label: "Turnover rent", render: (row) => (row.calculated_turnover_rent ? money(row.calculated_turnover_rent) : "—") },
              { key: "approval_status", label: "Status", render: (row) => <StatusBadge status={row.approval_status} /> },
              {
                key: "actions",
                label: "",
                className: "text-right",
                render: (row) =>
                  row.approval_status === "pending" ? (
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => run.mutate(() => propertyApi.approveSalesReport(row.id))}>
                        Approve
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDialog({ reject: row })}>
                        Reject
                      </Button>
                    </div>
                  ) : null,
              },
            ]}
          />
        </Panel>
      ) : null}

      {tab === "footfall" && propertyId ? (
        <Panel title="Footfall">
          <SimpleTable
            loading={footfallQuery.isLoading}
            rows={rowsOf<any>(footfallQuery.data)}
            empty="No footfall recorded."
            columns={[
              { key: "recorded_date", label: "Date", render: (row) => dateOnly(row.recorded_date) },
              { key: "entrance", label: "Entrance" },
              { key: "interval", label: "Time", render: (row) => (row.interval_start ? `${row.interval_start}–${row.interval_end ?? ""}` : "All day") },
              { key: "visitor_count", label: "Visitors", render: (row) => Number(row.visitor_count).toLocaleString() },
              { key: "source", label: "Source" },
            ]}
          />
        </Panel>
      ) : null}

      {tab === "promotions" && propertyId ? (
        <Panel title="Promotions">
          <SimpleTable
            loading={promotionsQuery.isLoading}
            rows={rowsOf<any>(promotionsQuery.data)}
            empty="No promotions."
            columns={[
              { key: "name", label: "Promotion", render: (row) => <span className="font-medium">{row.name}</span> },
              { key: "promotion_type", label: "Type" },
              { key: "dates", label: "Dates", render: (row) => `${dateOnly(row.start_date)} → ${dateOnly(row.end_date)}` },
              { key: "participants", label: "Participants", render: (row) => String(row.participants?.length ?? 0) },
              { key: "cost", label: "Cost", render: (row) => money(row.cost) },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
              {
                key: "actions",
                label: "",
                className: "text-right",
                render: (row) =>
                  ["draft", "submitted"].includes(row.status) ? (
                    <Button size="sm" variant="ghost" onClick={() => run.mutate(() => propertyApi.approvePromotion(row.id))}>
                      Approve
                    </Button>
                  ) : null,
              },
            ]}
          />
        </Panel>
      ) : null}

      {tab === "advertising" && propertyId ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Advertising spaces">
            <SimpleTable
              loading={spacesQuery.isLoading}
              rows={rowsOf<any>(spacesQuery.data)}
              empty="No advertising spaces."
              columns={[
                {
                  key: "name",
                  label: "Space",
                  render: (row) => (
                    <button
                      type="button"
                      onClick={() => setSpace(row)}
                      className={`text-left font-semibold ${space?.id === row.id ? "text-primary" : "hover:underline"}`}
                    >
                      {row.name}
                    </button>
                  ),
                },
                { key: "space_type", label: "Type" },
                { key: "rate_amount", label: "Rate", render: (row) => `${money(row.rate_amount)} / ${row.rate_period ?? "period"}` },
                { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
              ]}
            />
          </Panel>
          <Panel
            title={space ? `Bookings · ${space.name}` : "Bookings"}
            description={space ? undefined : "Pick a space to see and add bookings."}
            action={
              <Button size="sm" variant="outline" disabled={!space} onClick={() => setDialog("ad-booking")}>
                <Plus className="mr-1 h-4 w-4" /> Booking
              </Button>
            }
          >
            <SimpleTable
              loading={bookingsQuery.isLoading && Boolean(space)}
              rows={rowsOf<any>(bookingsQuery.data)}
              empty={space ? "No bookings." : "No space selected."}
              columns={[
                { key: "advertiser_name", label: "Advertiser" },
                { key: "dates", label: "Dates", render: (row) => `${dateOnly(row.start_date)} → ${dateOnly(row.end_date)}` },
                { key: "amount", label: "Amount", render: (row) => money(row.amount) },
                { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
                {
                  key: "actions",
                  label: "",
                  className: "text-right",
                  render: (row) =>
                    ["completed", "cancelled"].includes(row.status) ? null : (
                      <div className="flex justify-end gap-1">
                        {!row.finance_document_id ? (
                          <Button size="sm" variant="ghost" onClick={() => run.mutate(() => propertyApi.advertisingBookingAction(row.id, "bill"))}>
                            Invoice
                          </Button>
                        ) : null}
                        <Button size="sm" variant="ghost" onClick={() => run.mutate(() => propertyApi.advertisingBookingAction(row.id, "complete"))}>
                          Complete
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => run.mutate(() => propertyApi.advertisingBookingAction(row.id, "cancel"))}>
                          Cancel
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
          fields={config.fields}
          initial={config.initial}
          submitting={run.isPending}
          onSubmit={(values) => run.mutate(() => config!.submit(values))}
        />
      ) : null}
    </div>
  );
}
