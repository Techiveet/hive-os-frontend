"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  AlertCircle, 
  ArchiveRestore,
  Calendar, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Download,
  Edit3, 
  Eye, 
  FileDown,
  FilePlus, 
  FileSpreadsheet,
  FileText,
  Filter, 
  HelpCircle, 
  Plus, 
  RotateCcw,
  Search, 
  Send, 
  Trash2, 
  User, 
  Users, 
  XCircle 
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dailyReportApi } from "../api";
import { DailyReportDetailDialog } from "./daily-report-detail-dialog";
import type { DailyReport, DailyReportFilterParams } from "../types";

export function DailyReportList() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [onlyMine, setOnlyMine] = useState(false);
  const [dateFilter, setDateFilter] = useState("");

  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Trash Bin Dialog State
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [trashPage, setTrashPage] = useState(1);
  const [trashSearch, setTrashSearch] = useState("");

  const queryParams: DailyReportFilterParams = {
    page,
    per_page: 10,
    search: searchTerm || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    sentiment: sentimentFilter !== "all" ? sentimentFilter : undefined,
    only_mine: onlyMine ? true : undefined,
    date: dateFilter || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["daily-reports", queryParams],
    queryFn: () => dailyReportApi.listReports(queryParams),
  });

  const reports: DailyReport[] = data?.data || [];
  const meta = data?.meta || { current_page: page, last_page: 1, total: 0 };

  // Trash query
  const { data: trashData, isLoading: isLoadingTrash, refetch: refetchTrash } = useQuery({
    queryKey: ["daily-reports-trash", trashPage, trashSearch],
    queryFn: () => dailyReportApi.getTrash({ page: trashPage, per_page: 10, search: trashSearch }),
    enabled: isTrashOpen,
  });

  const trashReports: DailyReport[] = trashData?.data || [];
  const trashMeta = trashData?.meta || { current_page: trashPage, last_page: 1, total: 0 };

  // Mutations
  const submitMutation = useMutation({
    mutationFn: (id: number) => dailyReportApi.submitReport(id),
    onSuccess: () => {
      toast.success("Daily report submitted for review.");
      queryClient.invalidateQueries({ queryKey: ["daily-reports"] });
      queryClient.invalidateQueries({ queryKey: ["daily-reports-stats"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to submit report.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => dailyReportApi.deleteReport(id),
    onSuccess: () => {
      toast.success("Daily report moved to trash.");
      queryClient.invalidateQueries({ queryKey: ["daily-reports"] });
      queryClient.invalidateQueries({ queryKey: ["daily-reports-stats"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete report.");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => dailyReportApi.restoreReport(id),
    onSuccess: () => {
      toast.success("Daily report restored from trash.");
      queryClient.invalidateQueries({ queryKey: ["daily-reports"] });
      queryClient.invalidateQueries({ queryKey: ["daily-reports-trash"] });
      queryClient.invalidateQueries({ queryKey: ["daily-reports-stats"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to restore report.");
    },
  });

  const forceDeleteMutation = useMutation({
    mutationFn: (id: number) => dailyReportApi.forceDeleteReport(id),
    onSuccess: () => {
      toast.success("Daily report permanently purged.");
      queryClient.invalidateQueries({ queryKey: ["daily-reports-trash"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to purge report.");
    },
  });

  const handleExport = async (format: "xlsx" | "csv" | "pdf") => {
    try {
      setIsExporting(true);
      toast.info(`Generating ${format.toUpperCase()} export...`);
      const blob = await dailyReportApi.exportReports(format, queryParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `daily_reports_${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} export downloaded successfully!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to export reports as ${format.toUpperCase()}.`);
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
      case "reviewed":
        return <Badge className="bg-emerald-600 text-white text-xs">Approved</Badge>;
      case "submitted":
        return <Badge className="bg-blue-600 text-white text-xs">Submitted</Badge>;
      case "revision_requested":
        return <Badge variant="destructive" className="text-xs">Revision Requested</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Draft</Badge>;
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "on_track":
        return <span title="On Track"><CheckCircle2 className="h-4 w-4 text-emerald-500" /></span>;
      case "needs_help":
        return <span title="Needs Help"><HelpCircle className="h-4 w-4 text-amber-500" /></span>;
      case "blocked":
        return <span title="Blocked"><XCircle className="h-4 w-4 text-rose-500" /></span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <Card id="daily-report-actions" className="border-border/60 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
              <Input
                placeholder="Search reports by title, summary, or blockers..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={onlyMine ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setOnlyMine(!onlyMine);
                  setPage(1);
                }}
                className="gap-1.5 text-xs h-9"
              >
                <Users className="h-3.5 w-3.5" />
                {onlyMine ? "My Reports" : "All Team"}
              </Button>

              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isExporting} className="gap-1.5 text-xs h-9">
                    <Download className="h-3.5 w-3.5" />
                    {isExporting ? "Exporting..." : "Export"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport("xlsx")} className="gap-2 text-xs">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    Export Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-2 text-xs">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Export CSV (.csv)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-2 text-xs">
                    <FileDown className="h-4 w-4 text-rose-600" />
                    Export PDF (.pdf)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Trash Bin Trigger */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTrashOpen(true)}
                className="gap-1.5 text-xs h-9 text-muted-foreground hover:text-foreground"
                title="Trash Bin"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Trash</span>
              </Button>

              <Button asChild size="sm" className="gap-1.5 text-xs h-9 bg-primary text-primary-foreground shadow-sm">
                <Link href="/dashboard/daily-reports/new">
                  <Plus className="h-3.5 w-3.5" />
                  New Report
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="w-36">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="reviewed">Approved</SelectItem>
                  <SelectItem value="revision_requested">Revision</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-36">
              <Select
                value={sentimentFilter}
                onValueChange={(val) => {
                  setSentimentFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Sentiment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sentiments</SelectItem>
                  <SelectItem value="on_track">On Track</SelectItem>
                  <SelectItem value="needs_help">Needs Help</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setPage(1);
                }}
                className="h-8 text-xs"
              />
            </div>

            {(searchTerm || statusFilter !== "all" || sentimentFilter !== "all" || dateFilter || onlyMine) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setSentimentFilter("all");
                  setDateFilter("");
                  setOnlyMine(false);
                  setPage(1);
                }}
                className="h-8 text-xs text-muted-foreground"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reports Feed List */}
      <div id="daily-report-list">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse bg-muted/40 h-24" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <Card className="border-dashed border-2 p-12 text-center">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="p-3 bg-muted rounded-full">
                <FilePlus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg">No Daily Reports Found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {searchTerm || dateFilter || statusFilter !== "all"
                  ? "Try adjusting your filters or search keywords."
                  : "No reports have been submitted for this period. Create today's report to start tracking."}
              </p>
              <Button asChild size="sm" className="mt-2">
                <Link href="/dashboard/daily-reports/new">Submit Today's Report</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <Card
                key={report.id}
                className="border-border/60 hover:border-border transition-all hover:shadow-sm"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left: Author & Title */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-base truncate">
                          {report.title || `Daily Report - ${report.report_date}`}
                        </span>
                        {getStatusBadge(report.status)}
                        <div className="flex items-center gap-1">
                          {getSentimentIcon(report.sentiment)}
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {report.summary || report.plans_tomorrow || "No summary provided"}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {report.user?.name || "Employee"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {report.report_date}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Clock className="h-3 w-3 text-primary" />
                          {report.hours_worked}h
                        </span>
                        {report.blockers && (
                          <span className="flex items-center gap-1 text-rose-500 font-medium">
                            <AlertCircle className="h-3 w-3" />
                            Has Blockers
                          </span>
                        )}
                        {report.items && report.items.length > 0 && (
                          <span className="text-muted-foreground">
                            {report.items.length} tasks
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedReport(report);
                          setIsDetailOpen(true);
                        }}
                        className="gap-1 text-xs h-8"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </Button>

                      {report.status === "draft" && (
                        <>
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <Link href={`/dashboard/daily-reports/${report.id}`}>
                              <Edit3 className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => submitMutation.mutate(report.id)}
                            disabled={submitMutation.isPending}
                            className="gap-1 text-xs h-8 text-primary border-primary/30"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Submit
                          </Button>
                        </>
                      )}

                      {report.status !== "reviewed" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Move this daily report to the trash?")) {
                              deleteMutation.mutate(report.id);
                            }
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Delete Report"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Pagination Controls */}
            {meta.last_page > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  Showing Page {meta.current_page} of {meta.last_page} ({meta.total} total reports)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="h-8 text-xs gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                    disabled={page >= meta.last_page}
                    className="h-8 text-xs gap-1"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail & Review Modal Dialog */}
      <DailyReportDetailDialog
        report={selectedReport}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onReportUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ["daily-reports"] });
          queryClient.invalidateQueries({ queryKey: ["daily-reports-stats"] });
        }}
      />

      {/* Trash Bin Modal Dialog */}
      <Dialog open={isTrashOpen} onOpenChange={setIsTrashOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-500" />
              Daily Reports Trash Bin
            </DialogTitle>
            <DialogDescription className="text-xs">
              View, restore, or permanently purge soft-deleted daily reports.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="relative">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
              <Input
                placeholder="Search trashed reports..."
                value={trashSearch}
                onChange={(e) => {
                  setTrashSearch(e.target.value);
                  setTrashPage(1);
                }}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {isLoadingTrash ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse bg-muted/40 h-16" />
                ))}
              </div>
            ) : trashReports.length === 0 ? (
              <div className="text-center py-10 border border-dashed rounded-lg">
                <ArchiveRestore className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Trash Bin is Empty</p>
                <p className="text-xs text-muted-foreground">No soft-deleted daily reports found.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {trashReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-3.5 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold">{report.title || `Report #${report.id}`}</div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Author: {report.user?.name || "Unknown"}</span>
                        <span>Date: {report.report_date}</span>
                        {report.deleted_at && (
                          <span className="text-rose-500 font-mono">
                            Deleted {new Date(report.deleted_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => restoreMutation.mutate(report.id)}
                        disabled={restoreMutation.isPending}
                        className="h-8 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Permanently purge this daily report? This action cannot be undone.")) {
                            forceDeleteMutation.mutate(report.id);
                          }
                        }}
                        disabled={forceDeleteMutation.isPending}
                        className="h-8 text-xs gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Purge
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}