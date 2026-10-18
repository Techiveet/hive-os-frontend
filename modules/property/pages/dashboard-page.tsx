"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "@/store/use-translation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { fetchDashboardAlerts, fetchDashboardOverview } from "@/modules/property/api";

const incomeConfig = { income: { label: "Income", color: "var(--chart-1)" } } satisfies ChartConfig;
const billingConfig = {
  billed: { label: "Billed", color: "var(--chart-1)" },
  collected: { label: "Collected", color: "var(--chart-2)" },
} satisfies ChartConfig;

function Card1({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-black">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function PropertyDashboardPage() {
  const { t } = useTranslation();

  const overviewQuery = useQuery({ queryKey: ["property", "dashboard", "overview"], queryFn: fetchDashboardOverview });
  const alertsQuery = useQuery({ queryKey: ["property", "dashboard", "alerts"], queryFn: fetchDashboardAlerts });

  const cards = overviewQuery.data?.cards;
  const charts = overviewQuery.data?.charts;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{t("property.dashboard.title", "Dashboard")}</h1>
        <p className="text-sm text-muted-foreground">{t("property.dashboard.subtitle", "Portfolio health at a glance.")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card1 label={t("property.dashboard.properties", "Properties")} value={cards?.properties ?? "—"} />
        <Card1 label={t("property.dashboard.units", "Units")} value={cards?.units ?? "—"} />
        <Card1 label={t("property.dashboard.occupancy", "Occupancy")} value={cards ? `${cards.occupancy_percent}%` : "—"} />
        <Card1 label={t("property.dashboard.active_leases", "Active Leases")} value={cards?.active_leases ?? "—"} />
        <Card1 label={t("property.dashboard.leases_expiring", "Expiring (30d)")} value={cards?.leases_expiring ?? "—"} />
        <Card1 label={t("property.dashboard.billed", "Billed (month)")} value={cards ? cards.monthly_billed_rent : "—"} />
        <Card1 label={t("property.dashboard.collected", "Collected (month)")} value={cards ? cards.rent_collected : "—"} />
        <Card1 label={t("property.dashboard.outstanding", "Outstanding")} value={cards ? cards.outstanding_rent : "—"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("property.dashboard.income_by_property", "Income by Property")}</CardTitle>
            <CardDescription>{t("property.dashboard.income_by_property_desc", "Top 10 properties by posted invoice total.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={incomeConfig} className="h-64 w-full">
              <BarChart data={charts?.income_by_property ?? []}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="property_name" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="income" fill="var(--color-income)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("property.dashboard.billed_vs_collected", "Billed vs Collected")}</CardTitle>
            <CardDescription>{t("property.dashboard.billed_vs_collected_desc", "Last 6 months.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={billingConfig} className="h-64 w-full">
              <LineChart data={charts?.billed_vs_collected ?? []}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="billed" stroke="var(--color-billed)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="collected" stroke="var(--color-collected)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("property.dashboard.alerts", "Alerts")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(alertsQuery.data?.alerts ?? []).map((alert, index) => (
            <Link
              key={`${alert.record_type}-${alert.record_id}-${index}`}
              href={alert.url}
              className="flex items-center gap-3 rounded-xl border border-border/50 px-4 py-3 text-sm hover:bg-muted/40"
            >
              <AlertTriangle className={`h-4 w-4 shrink-0 ${alert.severity === "high" ? "text-destructive" : "text-amber-500"}`} />
              <span className="flex-1">{alert.message}</span>
              <Badge variant={alert.severity === "high" ? "destructive" : "secondary"}>{alert.severity}</Badge>
            </Link>
          ))}
          {alertsQuery.data?.alerts?.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("property.dashboard.no_alerts", "No alerts right now.")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
