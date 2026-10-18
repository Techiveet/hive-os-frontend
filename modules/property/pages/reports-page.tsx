"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/store/use-translation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchDepositLiabilityReport,
  fetchLeaseExpiryReport,
  fetchMallFootfallReport,
  fetchMallTenantSalesReport,
  fetchOccupancyReport,
  fetchOwnerStatement,
  fetchOwners,
  fetchParkingAllocationReport,
  fetchPortfolioReport,
  fetchRentCollectionReport,
  fetchRentRollReport,
  fetchTurnoverRentReport,
} from "@/modules/property/api";

const REPORT_TYPES = [
  "portfolio", "occupancy", "rent_roll", "lease_expiry", "rent_collection",
  "deposit_liability", "owner_statement", "mall_tenant_sales", "turnover_rent",
  "mall_footfall", "parking_allocation",
] as const;
type ReportType = (typeof REPORT_TYPES)[number];

function JsonTable({ rows }: { rows: unknown }) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) return <p className="text-sm text-muted-foreground">No data for this report.</p>;

  const columns = Object.keys(list[0] as Record<string, unknown>);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 text-left text-xs uppercase text-muted-foreground">
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 font-medium">{col.replace(/_/g, " ")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map((row, i) => (
            <tr key={i} className="border-b border-border/30">
              {columns.map((col) => (
                <td key={col} className="px-3 py-2">{String((row as Record<string, unknown>)[col] ?? "—")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const [type, setType] = React.useState<ReportType>("portfolio");
  const [periodStart, setPeriodStart] = React.useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [ownerId, setOwnerId] = React.useState("");

  const ownersQuery = useQuery({ queryKey: ["property", "owners", "picker"], queryFn: () => fetchOwners({ per_page: 200 }), enabled: type === "owner_statement" });

  const reportQuery = useQuery({
    queryKey: ["property", "reports", type, periodStart, periodEnd, ownerId],
    queryFn: async () => {
      switch (type) {
        case "portfolio": return fetchPortfolioReport();
        case "occupancy": return fetchOccupancyReport();
        case "rent_roll": return fetchRentRollReport();
        case "lease_expiry": return fetchLeaseExpiryReport();
        case "rent_collection": return fetchRentCollectionReport();
        case "deposit_liability": return fetchDepositLiabilityReport();
        case "owner_statement": return ownerId ? fetchOwnerStatement(Number(ownerId), periodStart, periodEnd) : null;
        case "mall_tenant_sales": return fetchMallTenantSalesReport(periodStart, periodEnd);
        case "turnover_rent": return fetchTurnoverRentReport(periodStart, periodEnd);
        case "mall_footfall": return fetchMallFootfallReport(periodStart, periodEnd);
        case "parking_allocation": return fetchParkingAllocationReport();
        default: return null;
      }
    },
  });

  const needsPeriod = ["mall_tenant_sales", "turnover_rent", "mall_footfall", "owner_statement"].includes(type);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{t("property.reports.title", "Reports")}</h1>
        <p className="text-sm text-muted-foreground">{t("property.reports.subtitle", "Portfolio, leasing, financial and mall reports.")}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/50 p-4">
        <div className="space-y-1">
          <Label>{t("property.reports.type", "Report")}</Label>
          <select className="h-10 w-64 rounded-md border border-input bg-background px-3 text-sm" value={type} onChange={(e) => setType(e.target.value as ReportType)}>
            {REPORT_TYPES.map((rt) => (
              <option key={rt} value={rt}>
                {rt.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        {type === "owner_statement" && (
          <div className="space-y-1">
            <Label>{t("property.reports.owner", "Owner")}</Label>
            <select className="h-10 w-56 rounded-md border border-input bg-background px-3 text-sm" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              <option value="">{t("property.mall.select_property", "Select...")}</option>
              {(ownersQuery.data?.data ?? []).map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {needsPeriod && (
          <>
            <div className="space-y-1">
              <Label>{t("property.mall.start_date", "Start")}</Label>
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{t("property.mall.end_date", "End")}</Label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          {reportQuery.isLoading && <p className="text-sm text-muted-foreground">{t("property.common.loading", "Loading...")}</p>}

          {type === "rent_collection" && reportQuery.data && (
            <div className="mb-4 flex flex-wrap gap-2">
              {Object.entries((reportQuery.data as unknown as { aging_buckets: Record<string, string> }).aging_buckets).map(([bucket, amount]) => (
                <Badge key={bucket} variant="outline">
                  {bucket.replace(/_/g, "-")}: {amount}
                </Badge>
              ))}
            </div>
          )}

          {type === "deposit_liability" && reportQuery.data && (
            <p className="mb-4 text-sm font-semibold">
              {t("property.reports.total_held", "Total held")}: {(reportQuery.data as unknown as { total_held: string }).total_held}
            </p>
          )}

          {type === "turnover_rent" && reportQuery.data && (
            <p className="mb-4 text-sm font-semibold">
              {t("property.reports.total_turnover_rent", "Total turnover rent")}: {(reportQuery.data as unknown as { total_turnover_rent: string }).total_turnover_rent}
            </p>
          )}

          {type === "owner_statement" && reportQuery.data && (
            <div className="mb-4 space-y-1 text-sm">
              <p>{t("property.reports.gross_revenue", "Gross revenue")}: <strong>{(reportQuery.data as unknown as { gross_revenue: string }).gross_revenue}</strong></p>
              <p>{t("property.reports.management_fee", "Management fee")}: <strong>{(reportQuery.data as unknown as { management_fee: string }).management_fee}</strong></p>
              <p>{t("property.reports.net_payable", "Net payable")}: <strong>{(reportQuery.data as unknown as { net_payable: string }).net_payable}</strong></p>
            </div>
          )}

          {type === "occupancy" && reportQuery.data && <JsonTable rows={(reportQuery.data as unknown as { by_property: unknown[] }).by_property} />}
          {type === "rent_collection" && reportQuery.data && <JsonTable rows={(reportQuery.data as unknown as { invoices: unknown[] }).invoices} />}
          {type === "deposit_liability" && reportQuery.data && <JsonTable rows={(reportQuery.data as unknown as { deposits: unknown[] }).deposits} />}
          {type === "owner_statement" && reportQuery.data && <JsonTable rows={(reportQuery.data as unknown as { lines: unknown[] }).lines} />}
          {type === "turnover_rent" && reportQuery.data && <JsonTable rows={(reportQuery.data as unknown as { lines: unknown[] }).lines} />}
          {["portfolio", "rent_roll", "lease_expiry", "mall_tenant_sales", "mall_footfall"].includes(type) && <JsonTable rows={reportQuery.data} />}
          {type === "parking_allocation" && reportQuery.data && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold">{t("property.reports.by_status", "By status")}</p>
                {Object.entries((reportQuery.data as unknown as { by_status: Record<string, number> }).by_status).map(([k, v]) => (
                  <p key={k}>{k}: {v}</p>
                ))}
              </div>
              <div>
                <p className="font-semibold">{t("property.reports.by_type", "By type")}</p>
                {Object.entries((reportQuery.data as unknown as { by_type: Record<string, number> }).by_type).map(([k, v]) => (
                  <p key={k}>{k}: {v}</p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
