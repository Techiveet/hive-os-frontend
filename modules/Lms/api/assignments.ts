import api from "@/modules/shared/api/http";

const LMS_PREFIX = "/learning-management";

export type LmsAssignmentStatus = "draft" | "published";
export type LmsSubmissionStatus = "draft" | "submitted" | "graded";

export type LmsAssignmentAttachment = { name: string; url: string };

/** The authoring/marking shape. */
export type LmsAssignment = {
  id: string;
  course_id: string;
  lesson_id?: string | null;
  title: string;
  instructions?: string | null;
  points: number | string;
  available_from?: string | null;
  due_at?: string | null;
  allow_late: boolean;
  status: LmsAssignmentStatus;
  sort_order: number;
  course?: { id: string; title: string };
  submissions_count?: number;
  needs_grading_count?: number;
  participants?: number;
};

/** One learner's submission, as the marker sees it. */
export type LmsSubmission = {
  id: string;
  assignment_id: string;
  user_id: number;
  content?: string | null;
  attachments?: LmsAssignmentAttachment[] | null;
  status: LmsSubmissionStatus;
  submitted_at?: string | null;
  is_late: boolean;
  score?: number | string | null;
  feedback?: string | null;
  graded_at?: string | null;
  learner?: { id: number; name: string; email?: string; avatar_path?: string | null };
};

/** The learner's own view: the assignment with their submission folded in. */
export type LmsMyAssignment = {
  id: string;
  course_id: string;
  course?: { id: string; title: string };
  title: string;
  instructions?: string | null;
  points: number;
  available_from?: string | null;
  due_at?: string | null;
  allow_late: boolean;
  is_overdue: boolean;
  accepts_submissions: boolean;
  submission: {
    id: string;
    content?: string | null;
    attachments?: LmsAssignmentAttachment[] | null;
    status: LmsSubmissionStatus;
    submitted_at?: string | null;
    is_late: boolean;
    score?: number | null;
    percent?: number | null;
    feedback?: string | null;
    graded_at?: string | null;
  } | null;
};

export type LmsAssignmentPayload = {
  course_id?: string;
  lesson_id?: string | null;
  title?: string;
  instructions?: string | null;
  points?: number;
  available_from?: string | null;
  due_at?: string | null;
  allow_late?: boolean;
  status?: LmsAssignmentStatus;
};

export type LmsSubmissionsResponse = {
  data: LmsSubmission[];
  meta: {
    participants: number;
    submitted: number;
    needs_grading: number;
    points: number;
    due_at?: string | null;
  };
};

/** Authoring and marking — course-management / grading permissions. */
export const assignmentApi = {
  list: (params?: { course_id?: string; status?: string }) =>
    api
      .get<{ data: LmsAssignment[] }>(`${LMS_PREFIX}/assignments`, { params })
      .then((r) => r.data.data),
  get: (id: string) =>
    api.get<{ data: LmsAssignment }>(`${LMS_PREFIX}/assignments/${id}`).then((r) => r.data.data),
  create: (data: LmsAssignmentPayload) =>
    api.post<{ data: LmsAssignment }>(`${LMS_PREFIX}/assignments`, data).then((r) => r.data.data),
  update: (id: string, data: LmsAssignmentPayload) =>
    api.put<{ data: LmsAssignment }>(`${LMS_PREFIX}/assignments/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete(`${LMS_PREFIX}/assignments/${id}`),
  publish: (id: string) =>
    api
      .post<{ data: LmsAssignment }>(`${LMS_PREFIX}/assignments/${id}/publish`)
      .then((r) => r.data.data),
  submissions: (id: string, params?: { status?: string }) =>
    api
      .get<LmsSubmissionsResponse>(`${LMS_PREFIX}/assignments/${id}/submissions`, { params })
      .then((r) => r.data),
  grade: (submissionId: string, data: { score: number; feedback?: string }) =>
    api
      .post<{ data: LmsSubmission }>(
        `${LMS_PREFIX}/assignment-submissions/${submissionId}/grade`,
        data,
      )
      .then((r) => r.data.data),
};

/** The learner's own assignments — scoped to enrolled courses by the server. */
export const myAssignmentApi = {
  list: (params?: { course_id?: string }) =>
    api
      .get<{ data: LmsMyAssignment[] }>(`${LMS_PREFIX}/my-assignments`, { params })
      .then((r) => r.data.data),
  get: (id: string) =>
    api
      .get<{ data: LmsMyAssignment }>(`${LMS_PREFIX}/my-assignments/${id}`)
      .then((r) => r.data.data),
  /** `submit: false` keeps it a draft the learner can keep editing. */
  save: (
    id: string,
    data: {
      content?: string | null;
      attachments?: LmsAssignmentAttachment[] | null;
      submit?: boolean;
    },
  ) =>
    api
      .post<{ data: LmsMyAssignment }>(`${LMS_PREFIX}/my-assignments/${id}/submit`, data)
      .then((r) => r.data.data),
};
