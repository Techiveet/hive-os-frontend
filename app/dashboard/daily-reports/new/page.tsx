"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DailyReportForm } from "@/modules/daily-reports/components/daily-report-form";

export default function NewDailyReportPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 border-b border-border/60 pb-4">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href="/dashboard/daily-reports">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Submit Daily Report</h1>
          <p className="text-xs text-muted-foreground">
            Document your day's work, milestones, blockers, and tomorrow's targets.
          </p>
        </div>
      </div>

      <DailyReportForm />
    </div>
  );
}