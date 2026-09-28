import api from "@/modules/shared/api/http";

const LMS_PREFIX = "/learning-management";

export type LmsReviewStatus = "published" | "hidden";

export type LmsCourseReview = {
  id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  status: LmsReviewStatus;
  created_at?: string;
  author: { id: number | null; name: string; avatar_path?: string | null };
  /** Present on the staff-wide listing. */
  course?: { id: string; title: string };
};

export type LmsReviewSummary = {
  data: LmsCourseReview[];
  meta: {
    average: number | null;
    count: number;
    /** Star value → number of reviews, 5 down to 1. */
    breakdown: Record<string, number>;
    mine: LmsCourseReview | null;
    can_review: boolean;
  };
};

export const reviewApi = {
  /** Published reviews for a course, plus the caller's own. */
  forCourse: (courseId: string) =>
    api
      .get<LmsReviewSummary>(`${LMS_PREFIX}/courses/${courseId}/reviews`)
      .then((r) => r.data),
  /** Creates or replaces the caller's review — one per learner per course. */
  submit: (
    courseId: string,
    data: { rating: number; title?: string | null; body?: string | null },
  ) =>
    api
      .post<{ data: LmsCourseReview }>(`${LMS_PREFIX}/courses/${courseId}/reviews`, data)
      .then((r) => r.data.data),
  remove: (reviewId: string) => api.delete(`${LMS_PREFIX}/reviews/${reviewId}`),

  /** Staff: every review in the tenant. */
  all: (params?: { course_id?: string; status?: LmsReviewStatus }) =>
    api
      .get<{ data: LmsCourseReview[] }>(`${LMS_PREFIX}/reviews`, { params })
      .then((r) => r.data.data),
  moderate: (reviewId: string, status: LmsReviewStatus) =>
    api
      .post<{ data: LmsCourseReview }>(`${LMS_PREFIX}/reviews/${reviewId}/moderate`, { status })
      .then((r) => r.data.data),
};
