import http from "../shared/api/http";
import type {
  ActivityLog,
  CreateDailyReportPayload,
  DailyReport,
  DailyReportComment,
  DailyReportFilterParams,
  DailyReportStats,
  ReviewDailyReportPayload,
  TaskSuggestion,
} from "./types";

const BASE_URL = "daily-reports";

export const dailyReportApi = {
  getStats: async (): Promise<{ data: DailyReportStats }> => {
    const res = await http.get(`${BASE_URL}/stats/overview`);
    return res.data;
  },

  listReports: async (params?: DailyReportFilterParams) => {
    const res = await http.get(`${BASE_URL}`, { params });
    return res.data;
  },

  getReport: async (id: number): Promise<{ data: DailyReport }> => {
    const res = await http.get(`${BASE_URL}/${id}`);
    return res.data;
  },

  createReport: async (data: CreateDailyReportPayload): Promise<{ data: DailyReport; message: string }> => {
    const res = await http.post(`${BASE_URL}`, data);
    return res.data;
  },

  updateReport: async (
    id: number,
    data: Partial<CreateDailyReportPayload>
  ): Promise<{ data: DailyReport; message: string }> => {
    const res = await http.put(`${BASE_URL}/${id}`, data);
    return res.data;
  },

  deleteReport: async (id: number): Promise<{ message: string }> => {
    const res = await http.delete(`${BASE_URL}/${id}`);
    return res.data;
  },

  submitReport: async (id: number): Promise<{ data: DailyReport; message: string }> => {
    const res = await http.post(`${BASE_URL}/${id}/submit`);
    return res.data;
  },

  reviewReport: async (
    id: number,
    data: ReviewDailyReportPayload
  ): Promise<{ data: DailyReport; message: string }> => {
    const res = await http.post(`${BASE_URL}/${id}/review`, data);
    return res.data;
  },

  addComment: async (
    id: number,
    comment: string
  ): Promise<{ data: DailyReportComment; message: string }> => {
    const res = await http.post(`${BASE_URL}/${id}/comments`, { comment });
    return res.data;
  },

  getTasksToday: async (date?: string): Promise<{ data: TaskSuggestion[] }> => {
    const res = await http.get(`${BASE_URL}/tasks-today`, { params: { date } });
    return res.data;
  },

  exportReports: async (type: "xlsx" | "csv" | "pdf", params?: DailyReportFilterParams): Promise<Blob> => {
    const res = await http.get(`${BASE_URL}/export`, {
      params: { ...params, type },
      responseType: "blob",
    });
    return res.data;
  },

  getTrash: async (params?: { page?: number; per_page?: number; search?: string; only_mine?: boolean | string }) => {
    const res = await http.get(`${BASE_URL}/trash`, { params });
    return res.data;
  },

  restoreReport: async (id: number): Promise<{ message: string; data: DailyReport }> => {
    const res = await http.post(`${BASE_URL}/trash/${id}/restore`);
    return res.data;
  },

  forceDeleteReport: async (id: number): Promise<{ message: string }> => {
    const res = await http.delete(`${BASE_URL}/trash/${id}/force`);
    return res.data;
  },

  getActivityLogs: async (id: number): Promise<{ data: ActivityLog[] }> => {
    const res = await http.get(`${BASE_URL}/${id}/activity-logs`);
    return res.data;
  },
};

export default dailyReportApi;