export type DailyReportSentiment = "on_track" | "blocked" | "needs_help";

export type DailyReportStatus = "draft" | "submitted" | "reviewed" | "revision_requested";

export type DailyReportItemStatus = "completed" | "in_progress" | "delayed";

export interface DailyReportItem {
  id?: number;
  daily_report_id?: number;
  title: string;
  category?: string;
  time_spent_minutes?: number;
  status: DailyReportItemStatus;
  notes?: string | null;
  sort_order?: number;
}

export interface DailyReportUser {
  id: number;
  name: string;
  email: string;
}

export interface DailyReportComment {
  id: number;
  daily_report_id: number;
  user_id: number;
  comment: string;
  created_at: string;
  user?: DailyReportUser;
}

export interface ActivityLog {
  id: number;
  log_name: string;
  description: string;
  subject_type: string;
  subject_id: number;
  causer?: {
    id: number;
    name: string;
    email: string;
  } | null;
  properties?: Record<string, any>;
  created_at: string;
}

export interface DailyReport {
  id: number;
  tenant_id?: string;
  user_id: number;
  report_date: string;
  title: string | null;
  summary: string | null;
  hours_worked: number;
  blockers: string | null;
  plans_tomorrow: string | null;
  sentiment: DailyReportSentiment;
  status: DailyReportStatus;
  submitted_at: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  manager_feedback: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  user?: DailyReportUser;
  reviewer?: DailyReportUser;
  items?: DailyReportItem[];
  comments?: DailyReportComment[];
  activity_logs?: ActivityLog[];
}

export interface DailyReportStats {
  has_submitted_today: boolean;
  today_report_status: string;
  today_report_id: number | null;
  submitted_this_week: number;
  pending_reviews: number;
  blockers_active: number;
  total_hours_this_week: number;
}

export interface DailyReportFilterParams {
  page?: number;
  per_page?: number;
  date?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  sentiment?: string;
  user_id?: number;
  only_mine?: boolean | string;
  search?: string;
}

export interface CreateDailyReportPayload {
  report_date?: string;
  title?: string;
  summary?: string;
  hours_worked?: number;
  blockers?: string;
  plans_tomorrow?: string;
  sentiment?: DailyReportSentiment;
  status?: DailyReportStatus;
  items?: DailyReportItem[];
}

export interface ReviewDailyReportPayload {
  status: "reviewed" | "revision_requested";
  manager_feedback?: string;
  rating?: number;
}

export interface TaskSuggestion {
  task_id?: number | string;
  title: string;
  project_name?: string | null;
  category: string;
  time_spent_minutes: number;
  status: DailyReportItemStatus;
  notes?: string | null;
}