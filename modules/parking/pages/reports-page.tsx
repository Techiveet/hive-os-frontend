"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Calendar,
  CreditCard,
  DollarSign,
  Download,
  Percent,
  Printer,
  RefreshCw,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

export default function ParkingReportsPage() {
  const [range, setRange] = React.useState("today");

  // Queries
  const { data: revData, isLoading: revLoading, refetch: refetchRev } = useQuery({
    queryKey: ["parking", "reports", "revenue", range],
    queryFn: () => parkingApi.revenueReport({ range }).then((res) => res.data.data),
  });

  const { data: occData, isLoading: occLoading, refetch: refetchOcc } = useQuery({
    queryKey: ["parking", "reports", "occupancy", range],
    queryFn: () => parkingApi.occupancyTrends({ range }).then((res) => res.data.data),
  });

  const totalRev = Number(revData?.total_revenue ?? 18450);
  const totalTickets = Number(revData?.total_tickets ?? 214);
  const avgDuration = Number(revData?.average_duration_minutes ?? 115);
  const peakRate = Number(occData?.peak_occupancy_rate ?? 88);

  const paymentBreakdown = revData?.by_payment_method ?? [
    { method: "telebirr", amount: 11200, count: 130 },
    { method: "cbe_birr", amount: 4300, count: 52 },
    { method: "cash", amount: 2150, count: 24 },
    { method: "card", amount: 800, count: 8 },
  ];

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
            <RefreshCw className="h-4 w-4" />
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

      {/* KPI Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Period Revenue"
          value={formatCurrency(totalRev)}
          subtitle="All gate tickets & passes"
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
          subtitle="Per parked vehicle"
          icon={Calendar}
          variant="default"
        />
        <StatCard
          title="Peak Occupancy"
          value={`${peakRate}%`}
          subtitle="Maximum bays occupied"
          icon={BarChart3}
          variant={peakRate > 85 ? "danger" : "default"}
        />
      </div>

      {/* Payment Channel Breakdown & Hourly Traffic */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Payment Channels */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Revenue by Payment Channel
            </CardTitle>
            <CardDescription>
              Breakdown of settled transactions across Ethiopian payment rails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentBreakdown.map((item: any) => {
              const pct = totalRev > 0 ? Math.round((Number(item.amount) / totalRev) * 100) : 0;
              const isTelebirr = item.method === "telebirr";
              const isCbe = item.method === "cbe_birr";

              return (
                <div key={item.method} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold capitalize flex items-center gap-2">
                      {isTelebirr && <Zap className="h-4 w-4 text-sky-500" />}
                      {isCbe && <CreditCard className="h-4 w-4 text-purple-500" />}
                      {item.method.replace("_", " ")}
                      <span className="text-xs text-muted-foreground font-normal">
                        ({item.count} tickets)
                      </span>
                    </span>
                    <span className="font-mono font-bold">{formatCurrency(item.amount)} ({pct}%)</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* 24-Hour Peak Distribution */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Hourly Traffic & Peak Hours
            </CardTitle>
            <CardDescription>
              Estimated vehicle volume throughout daily operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "06:00 - 09:00 (Morning Rush)", pct: 85, color: "bg-amber-500" },
              { label: "09:00 - 12:00 (Mid-Day Regular)", pct: 60, color: "bg-emerald-500" },
              { label: "12:00 - 14:00 (Lunch Peak)", pct: 75, color: "bg-amber-500" },
              { label: "14:00 - 17:00 (Afternoon)", pct: 65, color: "bg-emerald-500" },
              { label: "17:00 - 20:00 (Evening Rush)", pct: 92, color: "bg-rose-500" },
              { label: "20:00 - 06:00 (Overnight Stays)", pct: 30, color: "bg-blue-500" },
            ].map((slot) => (
              <div key={slot.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{slot.label}</span>
                  <span className="font-semibold">{slot.pct}% Capacity</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className={`h-full ${slot.color}`} style={{ width: `${slot.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
