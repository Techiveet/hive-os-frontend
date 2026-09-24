"use client";

import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  Focus,
  Fullscreen,
  Loader2,
  Network,
  ClipboardPaste,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type IntegrityEvent = {
  id: number;
  event_type: string;
  severity: number;
  metadata?: Record<string, unknown> | null;
  occurred_at?: string | null;
};

export type AttemptAnswer = {
  id: number;
  question_id: number;
  answer: unknown;
  auto_score?: number | null;
  manual_score?: number | null;
  review_note?: string | null;
  question?: {
    id: number;
    type: string;
    prompt: string;
    options?: string[] | null;
    correct_answer?: unknown;
    points?: number;
  };
};

export type IntegritySummary = {
  risk_score?: number;
  event_count?: number;
  highest_answer_similarity?: number;
  signals?: Record<string, number>;
  decision_policy?: string;
  analysis?: string;
};

export type AssessmentAttempt = {
  id: number;
  status: string;
  started_at?: string | null;
  submitted_at?: string | null;
  expires_at?: string | null;
  auto_score?: number | null;
  manual_score?: number | null;
  final_score?: number | null;
  integrity_risk: number;
  integrity_status: string;
  integrity_summary?: IntegritySummary | null;
  /** Laravel snake-cases relation names in JSON. */
  integrity_events?: IntegrityEvent[];
  integrityEvents?: IntegrityEvent[];
  answers?: AttemptAnswer[];
  invitation: {
    applicant: {
      id: number;
      candidate_name: string;
      email: string;
      stage?: string;
      job_posting?: { id: number; title: string };
    };
    assessment: {
      id: number;
      title: string;
      pass_mark?: number;
      duration_minutes?: number;
    };
  };
};

/** Prefer snake_case (API JSON); fall back to camelCase. */
export function attemptIntegrityEvents(attempt: AssessmentAttempt | null | undefined): IntegrityEvent[] {
  if (!attempt) return [];
  return attempt.integrity_events || attempt.integrityEvents || [];
}

const OBJECTIVE = new Set(["single_choice", "multiple_choice", "true_false"]);

const EVENT_META: Record<
  string,
  { label: string; icon: typeof Focus; hint: string }
> = {
  focus_lost: {
    label: "Focus lost",
    icon: Focus,
    hint: "Left the assessment tab or window",
  },
  copy: {
    label: "Copy",
    icon: Copy,
    hint: "Copied content from a question",
  },
  paste: {
    label: "Paste",
    icon: ClipboardPaste,
    hint: "Pasted content into an answer",
  },
  fullscreen_exit: {
    label: "Fullscreen exit",
    icon: Fullscreen,
    hint: "Left fullscreen mode",
  },
  network_disconnect: {
    label: "Network disconnect",
    icon: Network,
    hint: "Browser reported a connectivity drop",
  },
};

function formatAnswer(value: unknown): string {
  if (value == null) return "No answer";
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.every((item) => typeof item === "string" || typeof item === "number")) {
    return value.join(", ");
  }
  return JSON.stringify(value, null, 2);
}

function scoreLabel(attempt: AssessmentAttempt): string {
  if (attempt.final_score != null) return String(attempt.final_score);
  if (attempt.auto_score != null) return `Auto ${attempt.auto_score}`;
  return "Pending";
}

function passState(attempt: AssessmentAttempt): "pass" | "fail" | "pending" {
  const mark = attempt.invitation.assessment.pass_mark;
  const score = attempt.final_score ?? attempt.auto_score;
  if (mark == null || score == null) return "pending";
  return Number(score) >= Number(mark) ? "pass" : "fail";
}

function similarityPercent(attempt: AssessmentAttempt): number {
  const raw = attempt.integrity_summary?.highest_answer_similarity ?? 0;
  return Math.round(Number(raw) * 1000) / 10;
}

type Props = {
  attempt: AssessmentAttempt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: (path: string, options?: RequestInit) => Promise<any>;
  refresh: () => Promise<void>;
  onStatus: (message: string) => void;
  onError: (message: string) => void;
};

export function AssessmentAttemptReview({
  attempt,
  open,
  onOpenChange,
  api,
  refresh,
  onStatus,
  onError,
}: Props) {
  const [grading, setGrading] = useState(false);
  const events = attemptIntegrityEvents(attempt);
  const summary = attempt?.integrity_summary;
  const signals = summary?.signals || {};
  const similarity = attempt ? similarityPercent(attempt) : 0;
  const pass = attempt ? passState(attempt) : "pending";

  async function grade(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!attempt || grading) return;
    const form = new FormData(e.currentTarget);
    const answers = (attempt.answers || []).map((answer) => ({
      question_id: answer.question_id,
      score: Number(form.get("score-" + answer.question_id) || 0),
      review_note: String(form.get("note-" + answer.question_id) || ""),
    }));
    setGrading(true);
    try {
      await api("/assessment-attempts/" + attempt.id + "/grade", {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
      onStatus("Grades saved. Integrity analysis was re-run.");
      await refresh();
      onOpenChange(false);
    } catch (x) {
      onError(x instanceof Error ? x.message : "Grades were not saved.");
    } finally {
      setGrading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        {!attempt ? null : (
          <>
            <DialogHeader>
              <DialogTitle>
                {attempt.invitation.applicant.candidate_name} ·{" "}
                {attempt.invitation.assessment.title}
              </DialogTitle>
              <DialogDescription>
                {attempt.invitation.applicant.job_posting?.title || "Vacancy"} ·{" "}
                {attempt.invitation.applicant.email}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Status"
                value={attempt.status.replaceAll("_", " ")}
              />
              <Metric
                label="Scores"
                value={`Auto ${attempt.auto_score ?? "—"} · Manual ${attempt.manual_score ?? "—"} · Final ${attempt.final_score ?? "—"}`}
              />
              <Metric
                label="Pass mark"
                value={
                  attempt.invitation.assessment.pass_mark != null
                    ? `${attempt.invitation.assessment.pass_mark}% · ${
                        pass === "pending" ? "pending" : pass
                      }`
                    : "Not set"
                }
              />
              <Metric
                label="Submitted"
                value={
                  attempt.submitted_at
                    ? new Date(attempt.submitted_at).toLocaleString()
                    : "Not submitted"
                }
              />
            </div>

            <section className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-black">Integrity & similarity</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {summary?.decision_policy ||
                      "Human review required; integrity signals never auto-reject a candidate."}
                  </p>
                </div>
                <span
                  className={
                    "rounded-full px-3 py-1 text-xs font-bold " +
                    (attempt.integrity_status === "review_required"
                      ? "bg-amber-100 text-amber-950"
                      : "bg-emerald-100 text-emerald-950")
                  }
                >
                  Risk {attempt.integrity_risk}/100 ·{" "}
                  {attempt.integrity_status.replaceAll("_", " ")}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Events
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {summary?.event_count ?? events.length}
                  </p>
                </div>
                <div
                  className={
                    "rounded-lg border p-3 " +
                    (similarity >= 40 ? "border-amber-300 bg-amber-50" : "bg-muted/30")
                  }
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Highest answer similarity
                  </p>
                  <p className="mt-1 text-2xl font-black">{similarity}%</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tenant-local Jaccard overlap vs other candidates on the same
                    questions (long answers only).
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Signal counts
                  </p>
                  {Object.keys(signals).length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">No signals recorded.</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm">
                      {Object.entries(signals).map(([type, count]) => (
                        <li key={type} className="flex justify-between gap-2">
                          <span>{EVENT_META[type]?.label || type}</span>
                          <span className="font-semibold">{count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {similarity >= 40 && (
                <p className="mt-3 inline-flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                  <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                  Elevated similarity — compare free-text / coding answers manually
                  before advancing this candidate.
                </p>
              )}

              <div className="mt-4">
                <h4 className="text-sm font-bold">Integrity event timeline</h4>
                {events.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No integrity events were recorded for this attempt.
                  </p>
                ) : (
                  <ol className="mt-3 space-y-2">
                    {[...events]
                      .sort(
                        (a, b) =>
                          new Date(a.occurred_at || 0).getTime() -
                          new Date(b.occurred_at || 0).getTime(),
                      )
                      .map((event) => {
                        const meta = EVENT_META[event.event_type];
                        const Icon = meta?.icon || Clock3;
                        return (
                          <li
                            key={event.id}
                            className="flex gap-3 rounded-lg border p-3 text-sm"
                          >
                            <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold">
                                  {meta?.label || event.event_type}
                                </span>
                                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                                  severity {event.severity}
                                </span>
                              </div>
                              <p className="text-muted-foreground">
                                {meta?.hint || "Integrity signal"}
                                {event.metadata?.question_id != null
                                  ? ` · question #${event.metadata.question_id}`
                                  : ""}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {event.occurred_at
                                  ? new Date(event.occurred_at).toLocaleString()
                                  : "Unknown time"}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                  </ol>
                )}
              </div>
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="font-black">Answers & manual grading</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Objective items keep auto-scores. Enter or override scores for essays,
                code, and other subjective answers, then save.
              </p>

              {(attempt.status === "submitted" || attempt.status === "graded") &&
              (attempt.answers || []).length > 0 ? (
                <form onSubmit={grade} className="mt-4 space-y-4">
                  {(attempt.answers || []).map((answer) => {
                    const type = answer.question?.type || "unknown";
                    const objective = OBJECTIVE.has(type);
                    const maxPoints = Number(answer.question?.points || 100);
                    return (
                      <fieldset key={answer.id} className="rounded-lg border p-4">
                        <legend className="px-2 text-sm font-semibold">
                          {answer.question?.prompt || "Question"}
                          <span className="ml-2 font-normal text-muted-foreground">
                            ({type.replaceAll("_", " ")} · {maxPoints} pts
                            {objective ? " · objective" : " · manual"})
                          </span>
                        </legend>

                        {answer.question?.correct_answer != null && objective && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Correct answer: {formatAnswer(answer.question.correct_answer)}
                          </p>
                        )}

                        <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                          {formatAnswer(answer.answer)}
                        </pre>

                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>Auto score: {answer.auto_score ?? "—"}</span>
                          <span>Manual score: {answer.manual_score ?? "—"}</span>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label htmlFor={"score-" + attempt.id + "-" + answer.question_id}>
                              Awarded score
                            </Label>
                            <Input
                              id={"score-" + attempt.id + "-" + answer.question_id}
                              name={"score-" + answer.question_id}
                              type="number"
                              min={0}
                              max={maxPoints}
                              step={0.1}
                              defaultValue={
                                answer.manual_score ?? answer.auto_score ?? 0
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor={"note-" + attempt.id + "-" + answer.question_id}>
                              Review note
                            </Label>
                            <Input
                              id={"note-" + attempt.id + "-" + answer.question_id}
                              name={"note-" + answer.question_id}
                              defaultValue={answer.review_note || ""}
                              placeholder={objective ? "Optional override note" : "Required feedback"}
                            />
                          </div>
                        </div>
                      </fieldset>
                    );
                  })}
                  <Button type="submit" disabled={grading}>
                    {grading ? (
                      <>
                        <Loader2 aria-hidden className="mr-2 h-4 w-4 animate-spin" />
                        Saving grades…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 aria-hidden className="mr-2 h-4 w-4" />
                        Save grades
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  {attempt.status === "in_progress"
                    ? "Candidate has not submitted yet."
                    : "No answers recorded for this attempt."}
                </p>
              )}
            </section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}

export function attemptDisplayScore(attempt: AssessmentAttempt): string {
  return scoreLabel(attempt);
}

export function attemptSimilarityPercent(attempt: AssessmentAttempt): number {
  return similarityPercent(attempt);
}
