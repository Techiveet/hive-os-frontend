import api from "@/modules/shared/api/http";

const LMS_PREFIX = "/learning-management";

export type LmsQuizQuestionType =
  | "single_choice"
  | "multiple_choice"
  | "true_false"
  | "short_text"
  | "long_text"
  | "coding"
  | "numeric"
  | "fill_blank"
  | "matching"
  | "ordering";

/** Types the server marks on submit. Anything else waits for an instructor. */
export const AUTO_GRADED_TYPES: LmsQuizQuestionType[] = [
  "single_choice",
  "multiple_choice",
  "true_false",
  "numeric",
  "fill_blank",
  "matching",
  "ordering",
];

/**
 * Types made of several independent parts, where partial credit is coherent.
 * A single_choice question is right or wrong; a matching question with four
 * pairs can be three-quarters right.
 */
export const MULTI_PART_TYPES: LmsQuizQuestionType[] = [
  "multiple_choice",
  "fill_blank",
  "matching",
  "ordering",
];

/** What each type is called on screen, and the one-line hint under it. */
export const QUESTION_TYPE_LABELS: Record<LmsQuizQuestionType, { label: string; hint: string }> = {
  single_choice: { label: "Single choice", hint: "One right option." },
  multiple_choice: { label: "Multiple choice", hint: "Several right options." },
  true_false: { label: "True or false", hint: "A statement to judge." },
  short_text: { label: "Short answer", hint: "A line or two, marked by a person." },
  long_text: { label: "Essay", hint: "A longer answer, marked by a person." },
  coding: { label: "Coding", hint: "Code in an editor, marked by a person." },
  numeric: { label: "Numeric", hint: "A number, judged within a tolerance." },
  fill_blank: { label: "Fill the blanks", hint: "Gaps in a sentence, each with accepted spellings." },
  matching: { label: "Matching", hint: "Pair each item on the left with one on the right." },
  ordering: { label: "Ordering", hint: "Put the items in the right sequence." },
};

/**
 * Per-type configuration. Never sent to a learner while they sit the quiz —
 * a tolerance tells you where the answer is even if not exactly what it is.
 */
export type LmsQuizQuestionSettings = {
  /** numeric: how far from the expected value still counts. */
  tolerance?: number;
  /** fill_blank: whether "Const" and "const" are different answers. */
  case_sensitive?: boolean;
  /** matching: the right-hand column the learner picks from. */
  targets?: string[];
};

export type LmsQuizQuestion = {
  id: string;
  quiz_id: string;
  type: LmsQuizQuestionType;
  prompt: string;
  options?: string[] | null;
  points: number | string;
  sort_order: number;
  partial_credit?: boolean;
  /** Only present on authoring responses, or on results when the quiz
   *  opts into show_correct_answers. Never sent while sitting a quiz. */
  correct_answer?: string[] | Record<string, string> | null;
  explanation?: string | null;
  coding_config?: Record<string, unknown> | null;
  settings?: LmsQuizQuestionSettings | null;
  /**
   * Matching only: the shuffled right-hand column a learner picks partners
   * from. Safe to send — it is the pool of possible answers, the way options
   * are for a choice question. Which one goes where stays in correct_answer.
   */
  match_targets?: string[];
};

export type LmsQuizAttemptStatus = "in_progress" | "submitted" | "graded";

export type LmsQuiz = {
  id: string;
  course_id: string;
  lesson_id?: string | null;
  title: string;
  instructions?: string | null;
  duration_minutes: number;
  pass_mark: number | string;
  max_attempts?: number | null;
  shuffle_questions: boolean;
  shuffle_options?: boolean;
  /** Draw this many questions from the bank. Null means ask them all. */
  question_count?: number | null;
  allow_backtracking?: boolean;
  require_fullscreen?: boolean;
  block_copy_paste?: boolean;
  /** Hand the paper in after this many tab departures. Null never auto-submits. */
  max_focus_loss?: number | null;
  /** "course" = anyone enrolled. "selected" = only the named learners. */
  audience?: "course" | "selected";
  show_correct_answers: boolean;
  status: "draft" | "published";
  /** Optional window. Null on both means the quiz is open whenever published. */
  available_from?: string | null;
  due_at?: string | null;
  sort_order: number;
  questions?: LmsQuizQuestion[];
  questions_count?: number;
  attempts_count?: number;
  assignees_count?: number;
  attempts?: LmsQuizAttempt[];
  course?: { id: string; title: string };
  /** Attached to the sitting view so the runner knows which rules to apply. */
  proctoring?: LmsProctoringRules;
};

/** The rules a runner must enforce, in one shape. */
export type LmsProctoringRules = {
  require_fullscreen: boolean;
  block_copy_paste: boolean;
  max_focus_loss: number | null;
  allow_backtracking: boolean;
};

/** What a runner is allowed to report. Everything else is server-stamped. */
export type LmsProctorEventType =
  | "focus_lost"
  | "focus_regained"
  | "copy"
  | "paste"
  | "fullscreen_enter"
  | "fullscreen_exit";

export type LmsAttemptEvent = {
  id: string;
  type: string;
  occurred_at: string;
  ip_address?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type LmsQuizAnswer = {
  id: string;
  question_id: string;
  answer: unknown;
  is_correct?: boolean | null;
  auto_score?: number | string | null;
  manual_score?: number | string | null;
  awarded?: number;
  review_note?: string | null;
  /** Attached on the marking queue, where the key is deliberately revealed. */
  question?: LmsQuizQuestion;
};

export type LmsQuizAttempt = {
  id: string;
  quiz?: Partial<LmsQuiz>;
  /** Present on the instructor marking queue, absent on a learner's own view. */
  user?: { id: number; name: string; email?: string; avatar_path?: string | null };
  attempt_number: number;
  status: LmsQuizAttemptStatus;
  started_at?: string | null;
  expires_at?: string | null;
  submitted_at?: string | null;
  /**
   * How long is left, according to the server. The runner counts down from
   * this rather than from expires_at, so a wrong device clock cannot buy time.
   * Null means the quiz is untimed; zero means it is over.
   */
  seconds_remaining?: number | null;
  focus_loss_count?: number;
  flagged?: boolean;
  flag_reason?: string | null;
  auto_score?: number | string | null;
  manual_score?: number | string | null;
  final_score?: number | string | null;
  max_score?: number | string | null;
  score_percent?: number;
  passed?: boolean | null;
  questions?: LmsQuizQuestion[];
  answers?: LmsQuizAnswer[];
};

export type LmsQuizPayload = {
  course_id?: string;
  lesson_id?: string | null;
  title?: string;
  instructions?: string | null;
  duration_minutes?: number;
  pass_mark?: number;
  max_attempts?: number | null;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  question_count?: number | null;
  allow_backtracking?: boolean;
  require_fullscreen?: boolean;
  block_copy_paste?: boolean;
  max_focus_loss?: number | null;
  audience?: "course" | "selected";
  show_correct_answers?: boolean;
  status?: "draft" | "published";
  available_from?: string | null;
  due_at?: string | null;
  questions?: Array<{
    /** Present on a question that already exists, absent on a new one.
     *  Carrying it is what keeps learners' answers attached across an edit. */
    id?: string | null;
    type: LmsQuizQuestionType;
    prompt: string;
    explanation?: string | null;
    options?: string[] | null;
    correct_answer?: string[] | Record<string, string> | null;
    settings?: LmsQuizQuestionSettings | null;
    partial_credit?: boolean;
    points?: number;
  }>;
};

/** Authoring — requires course-management permissions. */
export const quizApi = {
  list: (params?: { course_id?: string; status?: string; per_page?: number }) =>
    api.get<{ data: LmsQuiz[] }>(`${LMS_PREFIX}/quizzes`, { params }).then((r) => r.data),
  get: (id: string) =>
    api.get<{ data: LmsQuiz }>(`${LMS_PREFIX}/quizzes/${id}`).then((r) => r.data.data),
  create: (data: LmsQuizPayload) =>
    api.post<{ data: LmsQuiz }>(`${LMS_PREFIX}/quizzes`, data).then((r) => r.data.data),
  update: (id: string, data: LmsQuizPayload) =>
    api.put<{ data: LmsQuiz }>(`${LMS_PREFIX}/quizzes/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete(`${LMS_PREFIX}/quizzes/${id}`),
  publish: (id: string) =>
    api.post<{ data: LmsQuiz }>(`${LMS_PREFIX}/quizzes/${id}/publish`).then((r) => r.data.data),
  attempts: (id: string, params?: { status?: string; flagged_only?: boolean }) =>
    api.get<{ data: LmsQuizAttempt[] }>(`${LMS_PREFIX}/quizzes/${id}/attempts`, { params })
      .then((r) => r.data),
  /** The proctoring trail for one sitting — only interesting once flagged. */
  attemptEvents: (quizId: string, attemptId: string) =>
    api.get<{
      data: LmsAttemptEvent[];
      meta: {
        flagged: boolean;
        flag_reason: string | null;
        focus_loss_count: number;
        ip_address: string | null;
        user_agent: string | null;
        started_at: string | null;
        submitted_at: string | null;
        last_seen_at: string | null;
        suspicious_count: number;
      };
    }>(`${LMS_PREFIX}/quizzes/${quizId}/attempts/${attemptId}/events`).then((r) => r.data),
  assignees: (quizId: string) =>
    api.get<{
      data: Array<{ id: string; user_id: number; learner?: { id: number; name: string; email?: string } }>;
      meta: { audience: "course" | "selected" };
    }>(`${LMS_PREFIX}/quizzes/${quizId}/assignees`).then((r) => r.data),
  syncAssignees: (quizId: string, userIds: number[]) =>
    api.put(`${LMS_PREFIX}/quizzes/${quizId}/assignees`, { user_ids: userIds }).then((r) => r.data),
  grade: (
    attemptId: string,
    answers: Array<{ answer_id: string; manual_score: number; review_note?: string }>,
  ) =>
    api.post<{ data: LmsQuizAttempt }>(`${LMS_PREFIX}/quiz-attempts/${attemptId}/grade`, { answers })
      .then((r) => r.data.data),
};

/**
 * The model answer as a line of text.
 *
 * correct_answer is a list for most types but a left→right map for matching,
 * so anything showing it to a human has to handle both. Returns null when there
 * is no key to show — a human-marked question, or a quiz that keeps its
 * answers hidden.
 */
export function formatCorrectAnswer(
  correct: LmsQuizQuestion["correct_answer"],
): string | null {
  if (!correct) return null;

  if (Array.isArray(correct)) {
    return correct.length ? correct.join(", ") : null;
  }

  const pairs = Object.entries(correct);

  return pairs.length ? pairs.map(([left, right]) => `${left} → ${right}`).join(", ") : null;
}

/** Sitting a quiz — scoped to the signed-in learner by the server. */
export const myQuizApi = {
  list: (params?: { course_id?: string }) =>
    api.get<{ data: LmsQuiz[] }>(`${LMS_PREFIX}/my-quizzes`, { params }).then((r) => r.data.data),
  start: (quizId: string) =>
    api.post<{ data: LmsQuizAttempt }>(`${LMS_PREFIX}/my-quizzes/${quizId}/start`)
      .then((r) => r.data.data),
  attempt: (attemptId: string) =>
    api.get<{ data: LmsQuizAttempt }>(`${LMS_PREFIX}/quiz-attempts/${attemptId}`)
      .then((r) => r.data.data),
  saveAnswer: (attemptId: string, questionId: string, answer: unknown) =>
    api.put<{ data: LmsQuizAnswer; meta: { seconds_remaining: number | null } }>(
      `${LMS_PREFIX}/quiz-attempts/${attemptId}/answer`,
      { question_id: questionId, answer },
    ).then((r) => r.data),
  submit: (attemptId: string) =>
    api.post<{ data: LmsQuizAttempt }>(`${LMS_PREFIX}/quiz-attempts/${attemptId}/submit`)
      .then((r) => r.data.data),
  /**
   * Tell the server the learner is still here, and be told how long is left.
   * Also what closes an attempt whose owner walked away.
   */
  heartbeat: (attemptId: string) =>
    api.post<{
      data: {
        status: LmsQuizAttemptStatus;
        seconds_remaining: number | null;
        expired: boolean;
        flagged?: boolean;
        focus_loss_count?: number;
      };
    }>(`${LMS_PREFIX}/quiz-attempts/${attemptId}/heartbeat`).then((r) => r.data.data),
  /** Report what the runner saw. Fire-and-forget: never block the learner. */
  recordEvent: (attemptId: string, type: LmsProctorEventType, metadata?: Record<string, unknown>) =>
    api.post<{
      data: {
        recorded: boolean;
        focus_loss_count: number;
        flagged: boolean;
        auto_submitted: boolean;
        status: LmsQuizAttemptStatus;
      };
    }>(`${LMS_PREFIX}/quiz-attempts/${attemptId}/events`, { type, metadata })
      .then((r) => r.data.data),
};

/* ------------------------------ grader report ----------------------------- */

export type LmsGradeCell =
  | { status: "not_attempted" }
  | {
      status: "graded" | "awaiting_marking";
      attempt_id: string;
      score: number;
      max: number;
      percent: number;
      passed: boolean | null;
    };

export type LmsGradeRow = {
  user: { id: number | null; name: string; email?: string | null; avatar_path?: string | null };
  progress_percent: number;
  cells: Record<string, LmsGradeCell>;
  total: { score: number; max: number; percent: number | null };
};

export type LmsGradebook = {
  course: { id: string; title: string } | null;
  courses: { id: string; title: string }[];
  columns: { id: string; title: string; points: number; pass_mark: number }[];
  rows: LmsGradeRow[];
  /** "cohort" when the caller may see every learner, "self" when scoped to them. */
  scope?: "cohort" | "self";
};

export const gradebookApi = {
  get: (params?: { course_id?: string }) =>
    api
      .get<{ data: LmsGradebook }>(`${LMS_PREFIX}/gradebook`, { params })
      .then((r) => r.data.data),
};

/* -------------------------------- bookmarks ------------------------------- */

export type LmsBookmark = {
  id: string;
  course_id: string;
  lesson_id?: string | null;
  note?: string | null;
  created_at?: string;
  course?: { id: string; title: string; category?: string | null; duration_minutes?: number };
  lesson?: { id: string; title: string; content_type?: string; duration_minutes?: number };
};

export const bookmarkApi = {
  list: () =>
    api.get<{ data: LmsBookmark[] }>(`${LMS_PREFIX}/bookmarks`).then((r) => r.data.data),
  /** Adds when absent, removes when present. Returns the resulting state. */
  toggle: (payload: { course_id: string; lesson_id?: string | null; note?: string | null }) =>
    api
      .post<{ data: { bookmarked: boolean; bookmark?: LmsBookmark } }>(
        `${LMS_PREFIX}/bookmarks/toggle`,
        payload,
      )
      .then((r) => r.data.data),
  remove: (id: string) => api.delete(`${LMS_PREFIX}/bookmarks/${id}`),
};
