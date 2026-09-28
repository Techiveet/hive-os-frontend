"use client";

import React, { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { dailyReportApi } from "@/modules/daily-reports/api";
import { DailyReportForm } from "@/modules/daily-reports/components/daily-report-form";

export default function EditDailyReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const reportId = parseInt(resolvedParams.id, 10);

  const { data, isLoading, error } = useQuery({
    queryKey: ["daily-report", reportId],
    queryFn: () => dailyReportApi.getReport(reportId),
    enabled: !isNaN(reportId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <Card className="p-6">
          <CardContent className="space-y-4">
            <h3 className="text-lg font-bold text-destructive">Report Not Found</h3>
            <p className="text-sm text-muted-foreground">
              This daily report may have been deleted or you do not have permission to view it.
            </p>
            <Button asChild variant="outline">
              <Link href="/dashboard/daily-reports">Return to Daily Reports</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const report = data.data;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 border-b border-border/60 pb-4">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/dashboard/daily-reports">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Edit Daily Report</h1>
          <p className="text-xs text-muted-foreground">
            {report.report_date} • {report.status.toUpperCase()}
          </p>
        </div>
      </div>

      <DailyReportForm initialData={report} />
    </div>
  );
}