import api from "@/modules/shared/api/http";

const LMS_PREFIX = "/learning-management";
const PUBLIC_PREFIX = "/public/lms";

/** Colour intent. The tenant's palette decides what each one looks like. */
export type LmsAnnouncementVariant = "promo" | "info" | "warning" | "success";

/**
 * public   — the course site, before anyone signs in
 * learners — inside /learn, where the audience is already enrolled
 * everyone — both
 */
export type LmsAnnouncementAudience = "public" | "learners" | "everyone";

/** What the bar itself draws. The public endpoint returns only these fields. */
export type LmsAnnouncementBarItem = {
  id: string;
  message: string;
  link_url?: string | null;
  link_label?: string | null;
  variant: LmsAnnouncementVariant;
  is_dismissible: boolean;
};

/** The fuller shape, for the screen that writes them. */
export type LmsAnnouncement = LmsAnnouncementBarItem & {
  audience: LmsAnnouncementAudience;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  author?: { id: number; name: string } | null;
  /** Why it is or is not showing: live | scheduled | ended | off. */
  status?: "live" | "scheduled" | "ended" | "off";
};

export type LmsAnnouncementPayload = {
  message?: string;
  link_url?: string | null;
  link_label?: string | null;
  variant?: LmsAnnouncementVariant;
  audience?: LmsAnnouncementAudience;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active?: boolean;
  is_dismissible?: boolean;
  sort_order?: number;
};

export const announcementApi = {
  /** The course site's bar. No auth — it renders on a public page. */
  publicList: () =>
    api
      .get<{ data: LmsAnnouncementBarItem[] }>(`${PUBLIC_PREFIX}/announcements`)
      .then((r) => r.data.data),

  /** The bar inside /learn, for people already on a course. */
  mine: () =>
    api
      .get<{ data: LmsAnnouncementBarItem[] }>(`${LMS_PREFIX}/my-announcements`)
      .then((r) => r.data.data),

  /** Everything, live or not, for the managing screen. */
  list: (params?: { audience?: LmsAnnouncementAudience }) =>
    api
      .get<{ data: LmsAnnouncement[] }>(`${LMS_PREFIX}/announcements`, { params })
      .then((r) => r.data.data),

  create: (data: LmsAnnouncementPayload) =>
    api
      .post<{ data: LmsAnnouncement }>(`${LMS_PREFIX}/announcements`, data)
      .then((r) => r.data.data),

  update: (id: string, data: LmsAnnouncementPayload) =>
    api
      .put<{ data: LmsAnnouncement }>(`${LMS_PREFIX}/announcements/${id}`, data)
      .then((r) => r.data.data),

  remove: (id: string) => api.delete(`${LMS_PREFIX}/announcements/${id}`),
};
