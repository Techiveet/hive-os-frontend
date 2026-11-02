"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Calendar,
  CreditCard,
  DollarSign,
  Printer,
  RefreshCw,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parkingApi } from "@/modules/parking/api";
import {
  PageHeader,
  StatCard,
  formatCurrency,
  formatDuration,
} from "@/modules/parking/components/parking-ui";
import { cn } from "@/lib/utils";

function paymentLabel(method: string): string {
  const labels: Record<string, string> = {
    telebirr: "Telebirr",
    cbe_birr: "CBE Birr",
    cash: "Cash / Gate Kiosk",
    card: "Debit / Credit Card",
    waived: "Waived",
    unspecified: "Unspecified",
  };
  return labels[method] ?? method.replaceAll("_", " ");
}

export default function ParkingReportsPage() {
  const [range, setRange] = React.useState("today");

  const { data: revData, isLoading: revLoading, refetch: refetchRev } = useQuery({
    queryKey: ["parking", "reports", "revenue", range],
    queryFn: () => parkingApi.revenueReport({ range }).then((res) => res.data.data),
  });

  const { data: occData, isLoading: occLoading, refetch: refetchOcc } = useQuery({
    queryKey: ["parking", "reports", "occupancy", range],
    queryFn: () => parkingApi.occupancyTrends({ range }).then((res) => res.data.data),
  });

  const totalRev = Number(revData?.total_revenue ?? revData?.total_revenue_etb ?? 0);
  const totalTickets = Number(revData?.total_tickets ?? revData?.total_completed_sessions ?? 0);
  const avgDuration = Number(revData?.average_duration_minutes ?? 0);
  const peakRate = Number(occData?.peak_occupancy_rate ?? 0);
  const peakHour = occData?.peak_hour as string | undefined;
  const peakConcurrent = Number(occData?.peak_concurrent_vehicles ?? 0);
  const totalBays = Number(occData?.total_bays ?? 0);

  const hourlyTraffic = (occData?.hourly_traffic_24h ?? []) as Array<{
    hour: string;
    entries: number;
    occupancy?: number;
  }>;
  const maxHourlyEntries = Math.max(1, ...hourlyTraffic.map((slot) => Number(slot.entries || 0)));
  const busiestHour = hourlyTraffic.reduce<{ hour: string; entries: number } | null>((best, slot) => {
    if (!best || Number(slot.entries) > best.entries) {
      return { hour: slot.hour, entries: Number(slot.entries) };
    }
    return best;
  }, null);

  const paymentBreakdown = (revData?.by_payment_method ?? revData?.revenue_by_payment_method ?? []).map(
    (item: { method?: string; payment_method?: string; amount?: number; total?: number; count?: number }) => ({
      method: item.method ?? item.payment_method ?? "unspecified",
      amount: Number(item.amount ?? item.total ?? 0),
      count: Number(item.count ?? 0),
    })
  );

  const isLoading = revLoading || occLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue & Parking Analytics"
        subtitle="Financial auditing, multi-channel payment reconciliation (Telebirr & CBE Birr), peak hourly traffic, and occupancy yields."
        badge="Audited Analytics"
      >
        <div className="flex items-center gap-2">
          <Tabs value={range} onValueChange={setRange}>
            <TabsList className="h-9">
              <TabsTrigger value="today" className="text-xs">Today</TabsTrigger>
              <TabsTrigger value="week" className="text-xs">This Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs">This Month</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchRev();
              refetchOcc();
            }}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 bg-primary text-primary-foreground"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Period Revenue"
          value={formatCurrency(totalRev)}
          subtitle="Paid gate tickets this period"
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          title="Tickets Processed"
          value={totalTickets}
          subtitle="Completed parking sessions"
          icon={TrendingUp}
          variant="info"
        />
        <StatCard
          title="Average Stay Time"
          value={formatDuration(avgDuration)}
          subtitle="Per completed session"
          icon={Calendar}
          variant="default"
        />
        <StatCard
          title="Peak Occupancy"
          value={`${peakRate}%`}
          subtitle={
            peakHour
              ? `Peak ${peakConcurrent}/${totalBays || "?"} bays at ${peakHour}`
              : "Maximum bays occupied"
          }
          icon={BarChart3}
          variant={peakRate > 85 ? "danger" : "default"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Revenue by Payment Channel
            </CardTitle>
            <CardDescription>
              Settled ticket payments across Ethiopian payment rails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No paid tickets in this period yet.
              </p>
            ) : (
              paymentBreakdown.map((item) => {
                const pct = totalRev > 0 ? Math.round((Number(item.amount) / totalRev) * 100) : 0;
                const isTelebirr = item.method === "telebirr";
                const isCbe = item.method === "cbe_birr";

                return (
                  <div key={item.method} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold flex items-center gap-2">
                        {isTelebirr && <Zap className="h-4 w-4 text-sky-500" />}
                        {isCbe && <CreditCard className="h-4 w-4 text-purple-500" />}
                        {paymentLabel(item.method)}
                        <span className="text-xs text-muted-foreground font-normal">
                          ({item.count} tickets)
                        </span>
                      </span>
                      <span className="font-mono font-bold">
                        {formatCurrency(item.amount)} ({pct}%)
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Hourly Traffic & Peak Hours
            </CardTitle>
            <CardDescription>
              {busiestHour && busiestHour.entries > 0
                ? `Busiest hour ${busiestHour.hour} with ${busiestHour.entries} entries`
                : "Vehicle entries across the selected period"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hourlyTraffic.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No traffic data for this period.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-end gap-1.5 h-40 rounded-xl border border-border/50 bg-muted/20 px-3 pt-4 pb-2">
                  {hourlyTraffic.map((slot) => {
                    const entries = Number(slot.entries || 0);
                    const height = Math.max(entries > 0 ? 8 : 2, Math.round((entries / maxHourlyEntries) * 100));
                    const isPeak = busiestHour?.hour === slot.hour && entries > 0;
                    return (
                      <div key={slot.hour} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1 h-full">
                        <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                          {entries > 0 ? entries : ""}
                        </span>
                        <div
                          className={cn(
                            "w-full rounded-t-md transition-all",
                            isPeak ? "bg-primary" : entries > 0 ? "bg-primary/60" : "bg-muted-foreground/15"
                          )}
                          style={{ height: `${height}%` }}
                          title={`${slot.hour}: ${entries} entries`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground px-1">
                  <span>{hourlyTraffic[0]?.hour}</span>
                  <span>{hourlyTraffic[Math.floor(hourlyTraffic.length / 2)]?.hour}</span>
                  <span>{hourlyTraffic[hourlyTraffic.length - 1]?.hour}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
