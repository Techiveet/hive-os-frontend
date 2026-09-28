"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { propertyApi } from "@/modules/property/api";
import { PageHeader, SimpleTable, errorText, humanize, rowsOf } from "@/modules/property/components/property-ui";
import { EmptyPanel, LoadingPanel, Panel, StatTile } from "@/modules/shared/charts/primitives";
import { useTranslation } from "@/store/use-translation";

type ReportDef = {
  id: string;
  label: string;
  description: string;
  params?: "period" | "days" | "owner";
};

const REPORTS: ReportDef[] = [
  { id: "portfolio", label: "Portfolio summary", description: "Every property with its buildings and units." },
  { id: "occupancy", label: "Occupancy", description: "Occupied and available units per property." },
  { id: "rent-roll", label: "Rent roll", description: "Active leases with rent, frequency and term." },
  { id: "lease-expiry", label: "Lease expiry", description: "Leases ending within the chosen number of days.", params: "days" },
  { id: "rent-collection", label: "Rent collection & aging", description: "Unpaid rent invoices by how overdue they are." },
  { id: "deposit-liability", label: "Deposit liability", description: "Security deposits held and owed back." },
  { id: "owner-statement", label: "Owner statement", description: "Income, management fee and net payable for one owner.", params: "owner" },
  { id: "mall-tenant-sales", label: "Mall tenant sales", description: "Reported sales per occupier.", params: "period" },
  { id: "turnover-rent", label: "Turnover rent", description: "Turnover rent calculated from approved sales.", params: "period" },
  { id: "mall-footfall", label: "Mall footfall", description: "Visitor counts for the period.", params: "period" },
  { id: "parking-allocation", label: "Parking allocation", description: "Parking spaces and who holds them." },
];

const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

const isScalar = (value: unknown) => value === null || ["string", "number", "boolean"].includes(typeof value);

function TableOf({ rows }: { rows: Record<string, any>[] }) {
  const keySet = new Set<string>();
  rows.forEach((row) =>
    Object.entries(row).forEach(([key, value]) => {
      if (isScalar(value) || Array.isArray(value)) keySet.add(key);
    }),
  );
  const keys = Array.from(keySet);

  return (
    <SimpleTable
      rows={rows}
      rowKey={(row) => JSON.stringify(row).slice(0, 200)}
      empty="Nothing to report."
      columns={keys.map((key) => ({
        key,
        label: humanize(key),
        render: (row: Record<string, any>) => {
          const value = row[key];
          if (Array.isArray(value)) return value.join(", ") || "—";
          if (typeof value === "boolean") return value ? "Yes" : "No";
          return humanize(value);
        },
      }))}
    />
  );
}

/** Renders any report body: arrays as tables, scalars as tiles, nested lists as sub-tables. */
function ReportBody({ data }: { data: unknown }) {
  if (Array.isArray(data)) return <TableOf rows={data as Record<string, any>[]} />;
  if (!data || typeof data !== "object") return <EmptyPanel label="No data." />;

  const entries = Object.entries(data as Record<string, unknown>);
  const scalars = entries.filter(([, value]) => isScalar(value));
  const lists = entries.filter(([, value]) => Array.isArray(value));
  const maps = entries.filter(([, value]) => value && typeof value === "object" && !Array.isArray(value));

  return (
    <div className="space-y-4">
      {scalars.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {scalars.map(([key, value]) => (
            <StatTile key={key} label={humanize(key)} value={humanize(value)} />
          ))}
        </div>
      ) : null}
      {maps.map(([key, value]) => (
        <Panel key={key} title={humanize(key)}>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border/60 p-3">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{humanize(k)}</p>
                <p className="text-lg font-black tabular-nums">{isScalar(v) ? humanize(v) : "—"}</p>
              </div>
            ))}
          </div>
        </Panel>
      ))}
      {lists.map(([key, value]) => (
        <Panel key={key} title={humanize(key)}>
          <TableOf rows={value as Record<string, any>[]} />
        </Panel>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const [reportId, setReportId] = React.useState("occupancy");
  const [periodStart, setPeriodStart] = React.useState(firstOfMonth());
  const [periodEnd, setPeriodEnd] = React.useState(today());
  const [days, setDays] = React.useState("90");
  const [ownerId, setOwnerId] = React.useState("");

  const report = REPORTS.find((r) => r.id === reportId) ?? REPORTS[0];

  const ownersQuery = useQuery({
    queryKey: ["property", "owner-options"],
    queryFn: () => propertyApi.listOwners({ per_page: 200 }).then((res) => res.data),
    enabled: report.params === "owner",
  });

  const ready = report.params !== "owner" || Boolean(ownerId);

  const reportQuery = useQuery({
    queryKey: ["property", "report", reportId, periodStart, periodEnd, days, ownerId],
    queryFn: () => {
      const period = { period_start: periodStart, period_end: periodEnd };
      if (report.id === "owner-statement") return propertyApi.ownerStatement(ownerId, period).then((res) => res.data);
      const params = report.params === "period" ? period : report.params === "days" ? { days: Number(days) || 90 } : undefined;
      return propertyApi.report(report.id, params).then((res) => res.data);
    },
    enabled: ready,
    retry: false,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("property.reports.title", "Property reports")}
        subtitle={t("property.reports.subtitle", "Occupancy, rent roll, collections, deposits, owner statements and mall performance.")}
      />

      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <nav className="space-y-1" aria-label="Reports">
          {REPORTS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setReportId(r.id)}
              aria-current={r.id === reportId}
              className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                r.id === reportId ? "bg-primary/15 font-semibold text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
        </nav>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="text-lg font-black tracking-tight">{report.label}</h2>
            <p className="text-sm text-muted-foreground">{report.description}</p>

            {report.params ? (
              <div className="mt-4 flex flex-wrap items-end gap-3">
                {report.params === "owner" ? (
                  <div className="space-y-1">
                    <Label htmlFor="report-owner" className="text-xs">Owner</Label>
                    <select
                      id="report-owner"
                      value={ownerId}
                      onChange={(e) => setOwnerId(e.target.value)}
                      className="h-9 min-w-[14rem] rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Select…</option>
                      {rowsOf<any>(ownersQuery.data).map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
                {report.params === "period" || report.params === "owner" ? (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="report-from" className="text-xs">From</Label>
                      <Input id="report-from" type="date" value={periodStart} max={periodEnd} onChange={(e) => setPeriodStart(e.target.value)} className="h-9 w-[10rem]" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="report-to" className="text-xs">To</Label>
                      <Input id="report-to" type="date" value={periodEnd} min={periodStart} onChange={(e) => setPeriodEnd(e.target.value)} className="h-9 w-[10rem]" />
                    </div>
                  </>
                ) : null}
                {report.params === "days" ? (
                  <div className="space-y-1">
                    <Label htmlFor="report-days" className="text-xs">Within (days)</Label>
                    <Input id="report-days" type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} className="h-9 w-[8rem]" />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {!ready ? (
            <EmptyPanel label="Choose an owner to build the statement." />
          ) : reportQuery.isLoading ? (
            <LoadingPanel label="Building report…" />
          ) : reportQuery.isError ? (
            <EmptyPanel label={errorText(reportQuery.error, "This report could not be built.")} />
          ) : (
            <ReportBody data={reportQuery.data} />
          )}
        </div>
      </div>
    </div>
  );
}
