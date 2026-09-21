"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  Plus, 
  Save, 
  Send, 
  Sparkles,
  Trash2, 
  XCircle 
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dailyReportApi } from "../api";
import type { CreateDailyReportPayload, DailyReport, DailyReportItem, DailyReportSentiment } from "../types";

interface DailyReportFormProps {
  initialData?: DailyReport;
  onSuccess?: (report: DailyReport) => void;
  onCancel?: () => void;
}

export function DailyReportForm({ initialData, onSuccess, onCancel }: DailyReportFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  const [reportDate, setReportDate] = useState(initialData?.report_date || todayStr);
  const [title, setTitle] = useState(initialData?.title || `Daily Report - ${reportDate}`);
  const [summary, setSummary] = useState(initialData?.summary || "");
  const [hoursWorked, setHoursWorked] = useState<number>(initialData?.hours_worked ?? 8);
  const [sentiment, setSentiment] = useState<DailyReportSentiment>(initialData?.sentiment || "on_track");
  const [blockers, setBlockers] = useState(initialData?.blockers || "");
  const [plansTomorrow, setPlansTomorrow] = useState(initialData?.plans_tomorrow || "");

  const [items, setItems] = useState<DailyReportItem[]>(
    initialData?.items && initialData.items.length > 0
      ? initialData.items
      : [
          {
            title: "",
            category: "feature",
            time_spent_minutes: 120,
            status: "completed",
            notes: "",
          },
        ]
  );

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        title: "",
        category: "general",
        time_spent_minutes: 60,
        status: "completed",
        notes: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof DailyReportItem, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const calculateTotalMinutes = () => {
    return items.reduce((acc, curr) => acc + (Number(curr.time_spent_minutes) || 0), 0);
  };

  const handleAutoPopulateTasks = async () => {
    try {
      setIsLoadingTasks(true);
      const res = await dailyReportApi.getTasksToday(reportDate);
      const suggestions = res.data || [];
      if (suggestions.length === 0) {
        toast.info("No tasks or time logs found for this date in Project Management.");
        return;
      }

      const importedItems: DailyReportItem[] = suggestions.map((s) => ({
        title: s.project_name ? `[${s.project_name}] ${s.title}` : s.title,
        category: s.category || "development",
        time_spent_minutes: s.time_spent_minutes || 60,
        status: s.status || "completed",
        notes: s.notes || null,
      }));

      // Filter out initial empty item if it has no title
      setItems((prev) => {
        const cleaned = prev.filter((item) => item.title.trim() !== "");
        return [...cleaned, ...importedItems];
      });

      // Calculate and update total hours
      const totalMinutes = importedItems.reduce((acc, curr) => acc + (curr.time_spent_minutes || 0), 0);
      const additionalHours = Math.round((totalMinutes / 60) * 10) / 10;
      setHoursWorked((prev) => Math.round((prev + additionalHours) * 10) / 10);

      toast.success(`Imported ${suggestions.length} task(s) from Project Management!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to import tasks from Project Management.");
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleSubmit = async (submitForReview: boolean) => {
    if (!title.trim()) {
      toast.error("Please enter a report title.");
      return;
    }

    const validItems = items.filter((item) => item.title.trim() !== "");
    if (validItems.length === 0 && !summary.trim()) {
      toast.error("Please provide at least one work item or an executive summary.");
      return;
    }

    const payload: CreateDailyReportPayload = {
      report_date: reportDate,
      title,
      summary,
      hours_worked: Number(hoursWorked) || 0,
      blockers,
      plans_tomorrow: plansTomorrow,
      sentiment,
      status: submitForReview ? "submitted" : "draft",
      items: validItems,
    };

    try {
      setIsSubmitting(true);
      let res;
      if (initialData?.id) {
        res = await dailyReportApi.updateReport(initialData.id, payload);
        toast.success(
          submitForReview
            ? "Daily report submitted for review!"
            : "Daily report updated successfully."
        );
      } else {
        res = await dailyReportApi.createReport(payload);
        toast.success(
          submitForReview
            ? "Daily report submitted for review!"
            : "Daily report draft saved successfully."
        );
      }

      if (onSuccess) {
        onSuccess(res.data);
      } else {
        router.push("/dashboard/daily-reports");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to save daily report. Please check required fields.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="border-border/60 shadow-md">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-xl font-bold">
                {initialData?.id ? "Edit Daily Report" : "Create Daily Report"}
              </CardTitle>
              <CardDescription>
                Record your work accomplishments, logged hours, challenges, and next plans.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Report Date:</Label>
              <Input
                type="date"
                value={reportDate}
                onChange={(e) => {
                  setReportDate(e.target.value);
                  if (!initialData) setTitle(`Daily Report - ${e.target.value}`);
                }}
                className="w-auto h-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Header Info: Title, Total Hours, Sentiment */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Report Title</Label>
              <Input
                id="title"
                placeholder="e.g. Daily Progress - Frontend components"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hoursWorked">Total Hours Worked</Label>
              <div className="relative">
                <Input
                  id="hoursWorked"
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(parseFloat(e.target.value) || 0)}
                  className="pr-8"
                />
                <Clock className="h-4 w-4 text-muted-foreground absolute right-2.5 top-3" />
              </div>
            </div>
          </div>

          {/* Sentiment / Pace Selector */}
          <div className="space-y-2">
            <Label>Overall Day Pace & Sentiment</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSentiment("on_track")}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                  sentiment === "on_track"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold ring-2 ring-emerald-500/20"
                    : "border-border/60 hover:bg-muted/50"
                }`}
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>On Track</span>
              </button>

              <button
                type="button"
                onClick={() => setSentiment("needs_help")}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                  sentiment === "needs_help"
                    ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold ring-2 ring-amber-500/20"
                    : "border-border/60 hover:bg-muted/50"
                }`}
              >
                <HelpCircle className="h-4 w-4 text-amber-500" />
                <span>Needs Help</span>
              </button>

              <button
                type="button"
                onClick={() => setSentiment("blocked")}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                  sentiment === "blocked"
                    ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold ring-2 ring-rose-500/20"
                    : "border-border/60 hover:bg-muted/50"
                }`}
              >
                <XCircle className="h-4 w-4 text-rose-500" />
                <span>Blocked</span>
              </button>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">Today's Executive Summary</Label>
            <Textarea
              id="summary"
              rows={3}
              placeholder="Brief summary of what was accomplished today..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>

          {/* Detailed Work Items */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold">Work & Task Breakdown</h4>
                <p className="text-xs text-muted-foreground">
                  Logged breakdown: {Math.floor(calculateTotalMinutes() / 60)}h {calculateTotalMinutes() % 60}m
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoPopulateTasks}
                  disabled={isLoadingTasks}
                  className="flex items-center gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {isLoadingTasks ? "Importing..." : "Auto-Populate from PM Tasks"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="flex items-center gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg border border-border/60 bg-card/50 space-y-3 relative group"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-6">
                      <Label className="text-xs text-muted-foreground mb-1 block">Work Item Title</Label>
                      <Input
                        placeholder="Task or feature worked on..."
                        value={item.title}
                        onChange={(e) => handleItemChange(idx, "title", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-xs text-muted-foreground mb-1 block">Category</Label>
                      <Select
                        value={item.category || "general"}
                        onValueChange={(val) => handleItemChange(idx, "category", val)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="feature">Feature</SelectItem>
                          <SelectItem value="bugfix">Bugfix</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="code_review">Review</SelectItem>
                          <SelectItem value="design">Design</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-xs text-muted-foreground mb-1 block">Minutes</Label>
                      <Input
                        type="number"
                        step="15"
                        min="0"
                        placeholder="Mins"
                        value={item.time_spent_minutes || ""}
                        onChange={(e) =>
                          handleItemChange(idx, "time_spent_minutes", parseInt(e.target.value) || 0)
                        }
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center gap-2">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
                        <Select
                          value={item.status}
                          onValueChange={(val: any) => handleItemChange(idx, "status", val)}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="delayed">Delayed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(idx)}
                          className="h-9 w-9 text-muted-foreground hover:text-destructive self-end"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <Input
                      placeholder="Optional notes, PR link, or details for this item..."
                      value={item.notes || ""}
                      onChange={(e) => handleItemChange(idx, "notes", e.target.value)}
                      className="h-8 text-xs bg-background/50"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blockers & Next Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-4 w-4" />
                <Label htmlFor="blockers" className="cursor-pointer">
                  Blockers or Roadblocks
                </Label>
              </div>
              <Textarea
                id="blockers"
                rows={3}
                placeholder="Describe any issues preventing progress, missing access, or dependencies..."
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                className="border-rose-200 dark:border-rose-950 focus-visible:ring-rose-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <Clock className="h-4 w-4 text-primary" />
                <Label htmlFor="plansTomorrow" className="cursor-pointer">
                  Plans & Focus for Tomorrow
                </Label>
              </div>
              <Textarea
                id="plansTomorrow"
                rows={3}
                placeholder="Key goals, tickets, or meetings scheduled for tomorrow..."
                value={plansTomorrow}
                onChange={(e) => setPlansTomorrow(e.target.value)}
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/40 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel || (() => router.push("/dashboard/daily-reports"))}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial gap-1.5"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </Button>

            <Button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <Send className="h-4 w-4" />
              Submit Report
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}