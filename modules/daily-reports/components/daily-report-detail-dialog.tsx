"use client";

import React, { useState, useEffect } from "react";
import { 
  AlertCircle, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  History,
  MessageSquare, 
  Send, 
  Star, 
  User, 
  XCircle 
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dailyReportApi } from "../api";
import type { ActivityLog, DailyReport, ReviewDailyReportPayload } from "../types";

interface DailyReportDetailDialogProps {
  report: DailyReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportUpdated?: (updated: DailyReport) => void;
  canReview?: boolean;
}

export function DailyReportDetailDialog({
  report,
  open,
  onOpenChange,
  onReportUpdated,
  canReview = true,
}: DailyReportDetailDialogProps) {
  const [activeReport, setActiveReport] = useState<DailyReport | null>(report);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Review Form state
  const [rating, setRating] = useState<number>(report?.rating || 5);
  const [feedback, setFeedback] = useState<string>(report?.manager_feedback || "");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Activity logs state
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(report?.activity_logs || []);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    setActiveReport(report);
    setRating(report?.rating || 5);
    setFeedback(report?.manager_feedback || "");

    if (report?.id) {
      if (report.activity_logs && report.activity_logs.length > 0) {
        setActivityLogs(report.activity_logs);
      } else {
        setIsLoadingLogs(true);
        dailyReportApi
          .getActivityLogs(report.id)
          .then((res) => setActivityLogs(res.data || []))
          .catch(() => setActivityLogs([]))
          .finally(() => setIsLoadingLogs(false));
      }
    }
  }, [report]);

  if (!activeReport) return null;

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setIsSubmittingComment(true);
      const res = await dailyReportApi.addComment(activeReport.id, commentText);
      toast.success("Comment added successfully.");
      setCommentText("");

      const updated = {
        ...activeReport,
        comments: [...(activeReport.comments || []), res.data],
      };
      setActiveReport(updated);
      if (onReportUpdated) onReportUpdated(updated);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleReview = async (status: "reviewed" | "revision_requested") => {
    try {
      setIsSubmittingReview(true);
      const payload: ReviewDailyReportPayload = {
        status,
        manager_feedback: feedback,
        rating: status === "reviewed" ? rating : undefined,
      };

      const res = await dailyReportApi.reviewReport(activeReport.id, payload);
      toast.success(
        status === "reviewed"
          ? "Daily report approved and rated."
          : "Revision requested from author."
      );

      setActiveReport(res.data);
      if (onReportUpdated) onReportUpdated(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to review report.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case "on_track":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1">
            <CheckCircle2 className="h-3 w-3" /> On Track
          </Badge>
        );
      case "needs_help":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 gap-1">
            <HelpCircle className="h-3 w-3" /> Needs Help
          </Badge>
        );
      case "blocked":
        return (
          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 gap-1">
            <XCircle className="h-3 w-3" /> Blocked
          </Badge>
        );
      default:
        return <Badge variant="outline">{sentiment}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
      case "reviewed":
        return <Badge className="bg-emerald-600 text-white font-medium">Approved</Badge>;
      case "submitted":
        return <Badge className="bg-blue-600 text-white font-medium">Submitted</Badge>;
      case "revision_requested":
        return <Badge variant="destructive">Revision Requested</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pr-6">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <span>{activeReport.title || "Daily Report"}</span>
                {getStatusBadge(activeReport.status)}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-4 text-xs mt-1">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {activeReport.user?.name || "Unknown Author"}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {activeReport.report_date}
                </span>
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  {activeReport.hours_worked}h logged
                </span>
              </DialogDescription>
            </div>
            <div>{getSentimentBadge(activeReport.sentiment)}</div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Executive Summary */}
          {activeReport.summary && (
            <div className="rounded-lg bg-muted/40 p-3.5 border border-border/40 space-y-1">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Executive Summary
              </h4>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {activeReport.summary}
              </p>
            </div>
          )}

          {/* Work Breakdown Table */}
          {activeReport.items && activeReport.items.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Work & Task Breakdown
              </h4>
              <div className="divide-y divide-border/40 rounded-lg border border-border/60 overflow-hidden">
                {activeReport.items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-card/40 flex items-start justify-between gap-3 text-sm">
                    <div className="space-y-1">
                      <div className="font-medium flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.category && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                            {item.category}
                          </Badge>
                        )}
                      </div>
                      {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground font-mono">
                        {item.time_spent_minutes}m
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          item.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : item.status === "delayed"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blockers & Next Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeReport.blockers && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                  <AlertCircle className="h-3.5 w-3.5" /> Blockers & Roadblocks
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{activeReport.blockers}</p>
              </div>
            )}

            {activeReport.plans_tomorrow && (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Plans for Tomorrow
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{activeReport.plans_tomorrow}</p>
              </div>
            )}
          </div>

          {/* Manager Review Status / Display */}
          {activeReport.reviewer && (
            <Card className="border-border/60 bg-muted/20">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
                  <span>Manager Review & Evaluation</span>
                  {activeReport.rating && (
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3.5 w-3.5 ${
                            star <= (activeReport.rating || 0)
                              ? "fill-amber-500 text-amber-500"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-4 space-y-1 text-sm">
                <div className="text-xs text-muted-foreground">
                  Reviewed by <span className="font-semibold text-foreground">{activeReport.reviewer.name}</span> on{" "}
                  {activeReport.reviewed_at ? new Date(activeReport.reviewed_at).toLocaleDateString() : ""}
                </div>
                {activeReport.manager_feedback && (
                  <p className="text-sm italic text-foreground/90 pt-1">
                    &ldquo;{activeReport.manager_feedback}&rdquo;
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Manager Review Action Form (if canReview & submitted/pending) */}
          {canReview && activeReport.status === "submitted" && (
            <Card className="border-primary/40 bg-primary/5 shadow-sm">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold text-primary">
                  Review & Sign-Off Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 py-2 px-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Performance Rating</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`h-5 w-5 ${
                            star <= rating
                              ? "fill-amber-500 text-amber-500"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs text-muted-foreground ml-2 font-medium">
                      {rating} of 5 stars
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Manager Feedback / Guidance</label>
                  <Textarea
                    rows={2}
                    placeholder="Provide constructive feedback, acknowledgments, or guidance..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="text-sm bg-background/80"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleReview("revision_requested")}
                    disabled={isSubmittingReview}
                    className="text-xs text-rose-600 hover:text-rose-700"
                  >
                    Request Revision
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleReview("reviewed")}
                    disabled={isSubmittingReview}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Approve & Rate
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity & Audit Trail */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-primary" /> Activity Log & Audit Trail
            </h4>

            {isLoadingLogs ? (
              <div className="text-xs text-muted-foreground py-2">Loading audit history...</div>
            ) : activityLogs.length === 0 ? (
              <div className="text-xs text-muted-foreground italic py-1">
                No state change logs recorded yet for this report.
              </div>
            ) : (
              <div className="space-y-2 border-l-2 border-primary/20 pl-3 ml-1">
                {activityLogs.map((log) => (
                  <div key={log.id} className="text-xs space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {log.causer?.name || "System"}
                      </span>
                      <span className="text-muted-foreground">
                        {log.description}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments & Discussion */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Comments & Discussion
            </h4>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activeReport.comments && activeReport.comments.length > 0 ? (
                activeReport.comments.map((comment) => (
                  <div key={comment.id} className="rounded-lg bg-muted/40 p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {comment.user?.name || "User"}
                      </span>
                      <span className="text-[10px]">
                        {new Date(comment.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-foreground/90">{comment.comment}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No comments yet. Start a discussion or provide updates.
                </p>
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2">
              <Textarea
                rows={1}
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="text-xs min-h-[36px] max-h-24"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingComment || !commentText.trim()}
                className="shrink-0 gap-1 h-9"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}