"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, HelpCircle, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTour } from "@/components/providers/tour-provider";
import { dailyReportApi } from "@/modules/daily-reports/api";
import { DailyReportStatsCard } from "@/modules/daily-reports/components/daily-report-stats-card";
import { DailyReportList } from "@/modules/daily-reports/components/daily-report-list";

const DAILY_REPORT_TOUR_STEPS = [
  {
    target: "#daily-report-kpis",
    content: "Review key performance metrics: submission status for today, weekly logged hours, active blockers, and pending manager sign-offs.",
    disableBeacon: true,
  },
  {
    target: "#daily-report-actions",
    content: "Search reports, filter by status or sentiment, toggle between your reports and the team feed, download XLSX/CSV/PDF exports, or manage the Trash Bin.",
  },
  {
    target: "#daily-report-list",
    content: "Inspect, review, evaluate with star ratings, add comments, and track the full audit history of all submitted daily reports.",
  },
];

export default function DailyReportsPage() {
  const { startTour } = useTour();

  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ["daily-report-stats"],
    queryFn: () => dailyReportApi.getStats(),
  });

  const stats = statsData?.data;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <FileText className="h-7 w-7 text-primary" />
            Daily Report Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track daily work accomplishments, logged hours, bottlenecks, and team review workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => startTour(DAILY_REPORT_TOUR_STEPS)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground h-9"
          >
            <HelpCircle className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">Product Tour</span>
          </Button>

          <Button asChild className="flex items-center gap-2 h-9 bg-primary text-primary-foreground shadow-sm">
            <Link href="/dashboard/daily-reports/new">
              <Plus className="h-4 w-4" />
              Submit Daily Report
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div id="daily-report-kpis">
        <DailyReportStatsCard stats={stats} isLoading={isStatsLoading} />
      </div>

      {/* Reports Feed & Management */}
      <DailyReportList />
    </div>
  );
}