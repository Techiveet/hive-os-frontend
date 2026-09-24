"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

import { propertyApi } from "@/modules/property/api";
import { PageHeader, humanize, money } from "@/modules/property/components/property-ui";
import { EmptyPanel, LoadingPanel, Panel, StatTile } from "@/modules/shared/charts/primitives";
import { ColumnChart, RankedBarChart } from "@/modules/shared/charts/charts";
import { useTranslation } from "@/store/use-translation";

const n = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const SEVERITY_CLASS: Record<string, string> = {
  high: "border-rose-500/40 bg-rose-500/5",
  medium: "border-amber-500/40 bg-amber-500/5",
  low: "border-border/60",
};

export default function PropertyOverviewPage() {
  const { t } = useTranslation();

  const overviewQuery = useQuery({
    queryKey: ["property", "overview"],
    queryFn: () => propertyApi.overview().then((res) => res.data),
  });
  const alertsQuery = useQuery({
    queryKey: ["property", "alerts"],
    queryFn: () => propertyApi.alerts().then((res) => res.data),
  });

  const cards = overviewQuery.data?.cards;
  const charts = overviewQuery.data?.charts;
  const alerts: any[] = alertsQuery.data?.alerts ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("property.overview.title", "Property Overview")}
        subtitle={t(
          "property.overview.subtitle",
          "Occupancy, rent billed against rent collected, leases coming up for renewal and anything that needs attention today.",
        )}
      />

      {overviewQuery.isLoading ? (
        <LoadingPanel label={t("property.common.loading", "Loading portfolio…")} />
      ) : !cards ? (
        <EmptyPanel label={t("property.overview.unavailable", "Portfolio figures are not available right now.")} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label={t("property.overview.occupancy", "Occupancy")}
              value={`${n(cards.occupancy_percent)}%`}
              meta={`${n(cards.occupied_units)} of ${n(cards.units)} units occupied`}
              href="/dashboard/property/units"
            />
            <StatTile
              label={t("property.overview.available", "Available units")}
              value={n(cards.available_units).toLocaleString()}
              meta={`${n(cards.properties)} properties · ${n(cards.buildings)} buildings`}
              href="/dashboard/property/units?status=available"
            />
            <StatTile
              label={t("property.overview.active_leases", "Active leases")}
              value={n(cards.active_leases).toLocaleString()}
              meta={`${n(cards.leases_expiring)} expiring soon`}
              alert={n(cards.leases_expiring) > 0}
              href="/dashboard/property/leases"
            />
            <StatTile
              label={t("property.overview.outstanding", "Outstanding rent")}
              value={money(cards.outstanding_rent)}
              meta={`Billed ${money(cards.monthly_billed_rent)} · collected ${money(cards.rent_collected)} this month`}
              alert={n(cards.outstanding_rent) > 0}
              href="/dashboard/property/reports"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ColumnChart
              title={t("property.overview.billed_vs_collected", "Rent collected, last six months")}
              description={t("property.overview.billed_desc", "Collected per month; the table view also lists what was billed.")}
              rows={(charts?.billed_vs_collected ?? []).map((row: any) => ({
                key: row.month,
                label: row.month,
                value: n(row.collected),
                meta: `billed ${money(row.billed)}`,
              }))}
              valueLabel={t("property.overview.collected", "Collected (ETB)")}
              emptyLabel={t("property.overview.no_billing", "No rent billed yet.")}
            />
            <RankedBarChart
              title={t("property.overview.income_by_property", "Income by property")}
              rows={(charts?.income_by_property ?? []).map((row: any) => ({
                key: String(row.property_id),
                label: row.property_name,
                value: n(row.income),
                href: `/dashboard/property/properties/${row.property_id}`,
              }))}
              valueLabel={t("property.overview.income", "Income (ETB)")}
              emptyLabel={t("property.overview.no_income", "No income recorded yet.")}
            />
            <RankedBarChart
              title={t("property.overview.units_by_status", "Units by status")}
              rows={(charts?.occupancy_trend ?? []).map((row: any) => ({
                key: row.status,
                label: humanize(row.status),
                value: n(row.count),
                href: `/dashboard/property/units?status=${row.status}`,
              }))}
              valueLabel={t("property.overview.units", "Units")}
              emptyLabel={t("property.overview.no_units", "No units yet.")}
            />
            <ColumnChart
              title={t("property.overview.lease_expiries", "Lease expiries by month")}
              rows={(charts?.lease_expiries ?? []).map((row: any) => ({
                key: row.month,
                label: row.month,
                value: n(row.count),
              }))}
              valueLabel={t("property.overview.leases", "Leases")}
              emptyLabel={t("property.overview.no_expiries", "No leases expiring.")}
            />
          </div>
        </>
      )}

      <Panel
        title={t("property.overview.alerts", "Needs attention")}
        description={t("property.overview.alerts_desc", "Leases about to expire, overdue invoices and units vacant too long.")}
      >
        {alertsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">{t("property.common.loading_short", "Loading…")}</p>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("property.overview.no_alerts", "Nothing needs attention right now.")}</p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert, index) => (
              <li
                key={`${alert.type}-${alert.record_id}-${index}`}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${SEVERITY_CLASS[alert.severity] ?? SEVERITY_CLASS.low}`}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{alert.message}</p>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    {humanize(alert.type)} · {alert.severity}
                  </p>
                </div>
                {alert.url ? (
                  <Link href={alert.url} className="text-xs font-semibold text-primary hover:underline">
                    {t("property.common.open", "Open")}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
