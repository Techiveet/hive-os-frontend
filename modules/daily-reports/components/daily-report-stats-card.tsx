"use client";

import React from "react";
import { AlertCircle, CheckCircle2, Clock, FileCheck2, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DailyReportStats } from "../types";

interface DailyReportStatsCardProps {
  stats: DailyReportStats | null | undefined;
  isLoading?: boolean;
}

export function DailyReportStatsCard({ stats, isLoading }: DailyReportStatsCardProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse bg-muted/40">
            <CardHeader className="h-16" />
            <CardContent className="h-12" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Today's Submission Status */}
      <Card className="border-border/60 shadow-sm transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Today's Submission
          </CardTitle>
          {stats.has_submitted_today ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {stats.has_submitted_today ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs uppercase font-semibold">
                Submitted
              </Badge>
            ) : stats.today_report_status === "draft" ? (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs uppercase font-semibold">
                Draft Saved
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs uppercase font-semibold">
                Pending Today
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.has_submitted_today
              ? "Your report for today has been recorded"
              : "Don't forget to submit your report before end of day"}
          </p>
        </CardContent>
      </Card>

      {/* Submitted This Week */}
      <Card className="border-border/60 shadow-sm transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Reports This Week
          </CardTitle>
          <FileCheck2 className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.submitted_this_week}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Total verified submissions
          </p>
        </CardContent>
      </Card>

      {/* Hours Logged This Week */}
      <Card className="border-border/60 shadow-sm transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Logged Hours (Week)
          </CardTitle>
          <Clock className="h-5 w-5 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_hours_this_week.toFixed(1)}h</div>
          <p className="text-xs text-muted-foreground mt-1">
            Tracked working hours
          </p>
        </CardContent>
      </Card>

      {/* Active Blockers / Pending */}
      <Card className="border-border/60 shadow-sm transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Active Blockers
          </CardTitle>
          <Flame className={`h-5 w-5 ${stats.blockers_active > 0 ? "text-rose-500" : "text-muted-foreground"}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${stats.blockers_active > 0 ? "text-rose-600" : ""}`}>
            {stats.blockers_active}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.blockers_active > 0 ? "Requires manager assistance" : "No active blockers reported"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}