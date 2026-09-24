"use client";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  ClipboardCheck,
  Download,
  ExternalLink,
  Eye,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuthHeaders, getBackendApiRoot } from "@/lib/runtime-context";
import { CommitteeReviewPanel } from "./committee-review-panel";
import {
  AssessmentAttemptReview,
  attemptDisplayScore,
  attemptIntegrityEvents,
  attemptSimilarityPercent,
  type AssessmentAttempt,
} from "./assessment-attempt-review";

type Posting = {
  id: number;
  title: string;
  code: string;
  status: string;
  location: string;
  vacancies_count: number;
  public_id?: string;
  is_public?: boolean;
};
type Applicant = {
  id: number;
  candidate_name: string;
  email: string;
  phone?: string | null;
  stage: string;
  cover_letter?: string | null;
  answers?: Record<string, unknown> | null;
  applied_at?: string | null;
  has_resume?: boolean;
  job_posting?: Posting;
  reviews?: CandidateReview[];
};
type CandidateReview = {
  id: number;
  reviewer_id: number;
  score: number;
  recommendation: string;
  strengths?: string | null;
  concerns?: string | null;
};
type Assessment = {
  id: number;
  title: string;
  status: string;
  duration_minutes: number;
  pass_mark?: number;
  job_posting?: Posting;
  questions?: unknown[];
};
type Attempt = AssessmentAttempt;
type QuestionDraft = {
  type: string;
  prompt: string;
  options: string;
  correct_answer: string;
  points: number;
  language: string;
  starter_code: string;
};

const emptyQuestion = (): QuestionDraft => ({
  type: "single_choice",
  prompt: "",
  options: "",
  correct_answer: "",
  points: 10,
  language: "typescript",
  starter_code: "",
});

/** Full hiring pipeline after apply → shortlist → exam. */
const PIPELINE_STAGES = [
  { code: "applied", label: "Applied" },
  { code: "shortlisted", label: "Shortlisted" },
  { code: "written_exam", label: "Written exam" },
  { code: "interview", label: "Interview" },
  { code: "offer_sent", label: "Offer sent" },
  { code: "hired", label: "Hired" },
] as const;

function nextPipelineStage(stage: string): string | null {
  const index = PIPELINE_STAGES.findIndex((s) => s.code === stage);
  if (index < 0 || index >= PIPELINE_STAGES.length - 1) return null;
  return PIPELINE_STAGES[index + 1].code;
}

const RECOMMENDATION_LABEL: Record<string, string> = {
  strong_yes: "Strong yes",
  yes: "Yes",
  hold: "Hold",
  no: "No",
};

function summarizeReviews(reviews: CandidateReview[] | undefined) {
  if (!reviews?.length) return null;
  const counts = { strong_yes: 0, yes: 0, hold: 0, no: 0 };
  let scoreSum = 0;
  for (const review of reviews) {
    if (review.recommendation in counts) {
      counts[review.recommendation as keyof typeof counts] += 1;
    }
    scoreSum += Number(review.score);
  }
  const tone = counts.no
    ? "no"
    : counts.hold
      ? "hold"
      : counts.strong_yes >= counts.yes
        ? "strong_yes"
        : "yes";
  return {
    count: reviews.length,
    avg: Math.round(scoreSum / reviews.length),
    counts,
    tone,
    latest: reviews[0],
  };
}

function reviewToneClass(tone: string) {
  if (tone === "no") return "bg-rose-100 text-rose-950";
  if (tone === "hold") return "bg-amber-100 text-amber-950";
  if (tone === "strong_yes") return "bg-emerald-100 text-emerald-950";
  return "bg-sky-100 text-sky-950";
}

const root = () => getBackendApiRoot() + "/hr/recruitment";

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(root() + path, {
    ...options,
    headers: {
      ...getAuthHeaders({ "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || "Request failed.");
  return payload;
}

export function VacancyManagementClient() {
  const [postings, setPostings] = useState<Posting[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishingAssessment, setPublishingAssessment] = useState(false);
  const [shortlistingId, setShortlistingId] = useState<number | null>(null);
  const [advancingId, setAdvancingId] = useState<number | null>(null);
  const [hiringId, setHiringId] = useState<number | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const [resultsFilter, setResultsFilter] = useState<"all" | "review_required" | "submitted" | "graded">("all");
  const [downloadingResume, setDownloadingResume] = useState(false);
  const [loadingApplicantReviews, setLoadingApplicantReviews] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion()]);
  const [advanceConfirmOpen, setAdvanceConfirmOpen] = useState(false);
  const [applicantToAdvance, setApplicantToAdvance] = useState<Applicant | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const refreshInFlight = useRef(false);

  async function refresh(options?: { quiet?: boolean }) {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      const [p, a, s, t] = await Promise.all([
        api("/job-postings"),
        api("/applicants"),
        api("/assessments"),
        api("/assessment-attempts"),
      ]);
      setPostings(p.data || []);
      setApplicants(a.data || []);
      setAssessments(s.data || []);
      setAttempts(t.data || []);
      setSelectedAttempt((current) => {
        if (!current) return null;
        const next = (t.data || []).find((row: Attempt) => row.id === current.id);
        return next || null;
      });
      setSelectedApplicant((current) => {
        if (!current) return null;
        const next = (a.data || []).find((row: Applicant) => row.id === current.id);
        return next || null;
      });
      if (!options?.quiet) setError("");
    } catch (e) {
      if (!options?.quiet) {
        setError(e instanceof Error ? e.message : "Unable to load recruitment workspace.");
      }
    } finally {
      refreshInFlight.current = false;
    }
  }

  useEffect(() => {
    refresh()
      .finally(() => setLoading(false));
  }, []);

  // Keep the pipeline fresh when candidates apply from /careers without a manual refresh.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") {
        void refresh({ quiet: true });
      }
    };
    const interval = window.setInterval(tick, 8000);
    const onFocus = () => void refresh({ quiet: true });
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  useEffect(() => {
    if (!(status || error)) return;
    alertRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [status, error]);

  function flash(ok: string) {
    setError("");
    setStatus(ok);
  }

  async function submitPosting(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (publishing) return;
    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setPublishing(true);
    setError("");
    setStatus("");
    try {
      await api("/job-postings", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          vacancies_count: Number(values.vacancies_count),
          is_public: true,
          status: "published",
        }),
      });
      form.reset();
      flash("Vacancy published to the tenant careers page.");
      await refresh();
    } catch (x) {
      setError(x instanceof Error ? x.message : "Vacancy was not created.");
    } finally {
      setPublishing(false);
    }
  }

  async function submitAssessment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (publishingAssessment) return;
    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setPublishingAssessment(true);
    setError("");
    setStatus("");
    try {
      await api("/assessments", {
        method: "POST",
        body: JSON.stringify({
          job_posting_id: Number(values.job_posting_id),
          title: values.title,
          instructions: values.instructions,
          duration_minutes: Number(values.duration_minutes),
          pass_mark: Number(values.pass_mark),
          shuffle_questions: true,
          require_fullscreen: Boolean(values.require_fullscreen),
          integrity_monitoring_enabled: true,
          status: "published",
          questions: questions.map((q, index) => ({
            type: q.type,
            prompt: q.prompt,
            options: q.options ? q.options.split("\n").filter(Boolean) : undefined,
            correct_answer: q.correct_answer ? [q.correct_answer] : undefined,
            coding_config:
              q.type === "coding"
                ? {
                    language: q.language,
                    filename:
                      "solution." +
                      ({ typescript: "ts", javascript: "js", python: "py", java: "java" }[q.language] || "txt"),
                    starter_code: q.starter_code,
                  }
                : undefined,
            points: Number(q.points),
            sort_order: index + 1,
          })),
        }),
      });
      form.reset();
      setQuestions([emptyQuestion()]);
      flash("Assessment published. Shortlist a candidate from the pipeline to email them the test link.");
      await refresh();
    } catch (x) {
      setError(x instanceof Error ? x.message : "Assessment was not created.");
    } finally {
      setPublishingAssessment(false);
    }
  }

  async function shortlist(applicantId: number, assessmentId: number) {
    if (shortlistingId) return;
    setShortlistingId(applicantId);
    setError("");
    setStatus("");
    try {
      await api("/applicants/" + applicantId + "/shortlist", {
        method: "POST",
        body: JSON.stringify({
          assessment_id: assessmentId,
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        }),
      });
      flash(
        "Candidate moved to Shortlisted. An email with their assessment link was queued (expires in 7 days).",
      );
      await refresh();
    } catch (x) {
      setError(x instanceof Error ? x.message : "Could not shortlist applicant.");
    } finally {
      setShortlistingId(null);
    }
  }

  function advanceApplicant(applicant: Applicant) {
    const next = nextPipelineStage(applicant.stage);
    if (!next || advancingId || hiringId) return;
    // Offer → hired must create an employee record.
    if (next === "hired") {
      hireApplicant(applicant);
      return;
    }
    setApplicantToAdvance(applicant);
    setAdvanceConfirmOpen(true);
  }

  async function confirmAdvance() {
    const applicant = applicantToAdvance;
    if (!applicant || advancingId || hiringId) return;
    const next = nextPipelineStage(applicant.stage);
    if (!next) return;

    setAdvancingId(applicant.id);
    setError("");
    setStatus("");
    setAdvanceConfirmOpen(false);
    try {
      await api("/applicants/" + applicant.id + "/stage", {
        method: "PATCH",
        body: JSON.stringify({ stage: next }),
      });
      const label = PIPELINE_STAGES.find((s) => s.code === next)?.label || next;
      flash(applicant.candidate_name + " moved to " + label + ".");
      await refresh();
    } catch (x) {
      setError(x instanceof Error ? x.message : "Could not advance applicant.");
    } finally {
      setAdvancingId(null);
      setApplicantToAdvance(null);
    }
  }

  async function hireApplicant(applicant: Applicant) {
    if (hiringId || advancingId) return;
    const summary = summarizeReviews(applicant.reviews);
    if (summary && summary.counts.no > 0) {
      const ok = window.confirm(
        applicant.candidate_name +
          " has " +
          summary.counts.no +
          " committee recommendation(s) of No. Hire anyway? Reviews do not block hiring.",
      );
      if (!ok) return;
    }
    setHiringId(applicant.id);
    setError("");
    setStatus("");
    try {
      await api("/applicants/" + applicant.id + "/hire", { method: "POST" });
      flash(applicant.candidate_name + " hired and added to the employee directory.");
      await refresh();
    } catch (x) {
      setError(x instanceof Error ? x.message : "Could not hire applicant.");
    } finally {
      setHiringId(null);
    }
  }

  async function openApplicant(applicant: Applicant) {
    setSelectedApplicant(applicant);
    setLoadingApplicantReviews(true);
    try {
      const payload = await api("/applicants/" + applicant.id + "/reviews");
      const reviews = (payload.data || []) as CandidateReview[];
      setSelectedApplicant((current) =>
        current && current.id === applicant.id ? { ...current, reviews } : current,
      );
      setApplicants((rows) =>
        rows.map((row) => (row.id === applicant.id ? { ...row, reviews } : row)),
      );
    } catch (x) {
      setError(x instanceof Error ? x.message : "Unable to load committee reviews.");
    } finally {
      setLoadingApplicantReviews(false);
    }
  }

  async function downloadResume(applicant: Applicant) {
    if (downloadingResume) return;
    setDownloadingResume(true);
    setError("");
    try {
      const response = await fetch(root() + "/applicants/" + applicant.id + "/resume", {
        headers: { ...getAuthHeaders(), Accept: "*/*" },
      });
      if (!response.ok) {
        let message = "Resume could not be downloaded.";
        try {
          const payload = await response.json();
          message = payload.message || message;
        } catch {
          /* binary or empty error body */
        }
        throw new Error(message);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
      link.href = url;
      link.download = match?.[1] || `${applicant.candidate_name.replace(/\s+/g, "-")}-resume`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (x) {
      setError(x instanceof Error ? x.message : "Resume could not be downloaded.");
    } finally {
      setDownloadingResume(false);
    }
  }

  const busyButton =
    "disabled:bg-slate-300 disabled:text-slate-600 disabled:opacity-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-300";

  if (loading) {
    return (
      <main className="grid min-h-[40vh] place-items-center">
        <p className="inline-flex items-center gap-2 text-muted-foreground">
          <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
          Loading recruitment workspace…
        </p>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border border-emerald-900/30 bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900 p-6 text-white sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.25em] text-emerald-300">Talent acquisition command</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black sm:text-4xl">Vacancy & Assessment Management</h1>
            <p className="mt-2 max-w-3xl text-slate-300">
              Publish openings, manage applicants, run professional online tests, review integrity signals, and combine
              committee decisions.
            </p>
          </div>
          <a
            href="/careers"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-400 px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Open careers page
            <ExternalLink aria-hidden className="h-4 w-4" />
          </a>
        </div>
      </header>

      <div ref={alertRef} className="scroll-mt-4 space-y-3">
        {error && (
          <p role="alert" className="rounded-xl border border-red-500 bg-red-50 p-4 text-red-800">
            {error}
          </p>
        )}
        {status && (
          <p role="status" className="rounded-xl border border-emerald-600 bg-emerald-50 p-4 text-emerald-900">
            {status}
          </p>
        )}
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList className="h-auto min-h-11 flex-wrap justify-start">
          <TabsTrigger value="pipeline">
            <UsersRound aria-hidden className="mr-2 h-4 w-4" />
            Candidate pipeline
          </TabsTrigger>
          <TabsTrigger value="vacancies">
            <BriefcaseBusiness aria-hidden className="mr-2 h-4 w-4" />
            Vacancies
          </TabsTrigger>
          <TabsTrigger value="tests">
            <ClipboardCheck aria-hidden className="mr-2 h-4 w-4" />
            Test builder
          </TabsTrigger>
          <TabsTrigger value="results">
            <ShieldCheck aria-hidden className="mr-2 h-4 w-4" />
            Results & integrity
          </TabsTrigger>
          <TabsTrigger value="committee">
            <UserRoundCheck aria-hidden className="mr-2 h-4 w-4" />
            Committee & grading
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {PIPELINE_STAGES.map(({ code: stage, label }) => (
              <section key={stage} className="rounded-2xl border bg-card p-4">
                <h2 className="font-black">
                  {label}{" "}
                  <span className="ml-1 text-sm text-muted-foreground">
                    ({applicants.filter((a) => a.stage === stage).length})
                  </span>
                </h2>
                <div className="mt-4 space-y-3">
                  {applicants.filter((a) => a.stage === stage).length === 0 && (
                    <p className="text-sm text-muted-foreground">No candidates in this stage.</p>
                  )}
                  {applicants
                    .filter((a) => a.stage === stage)
                    .map((a) => {
                      const next = nextPipelineStage(a.stage);
                      const busy = advancingId === a.id || hiringId === a.id;
                      const reviewInfo = summarizeReviews(a.reviews);
                      return (
                      <article key={a.id} className="rounded-xl border p-4">
                        <h3 className="font-bold">{a.candidate_name}</h3>
                        <p className="text-sm text-muted-foreground">{a.email}</p>
                        <p className="mt-1 text-xs">{a.job_posting?.title}</p>
                        {reviewInfo ? (
                          <p
                            className={
                              "mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold " +
                              reviewToneClass(reviewInfo.tone)
                            }
                            title="Committee panel notes — do not auto-advance the pipeline"
                          >
                            Panel avg {reviewInfo.avg} ·{" "}
                            {RECOMMENDATION_LABEL[reviewInfo.latest.recommendation] ||
                              reviewInfo.latest.recommendation}{" "}
                            · {reviewInfo.count} review{reviewInfo.count === 1 ? "" : "s"}
                          </p>
                        ) : (
                          a.stage !== "applied" && (
                            <p className="mt-2 text-[11px] text-muted-foreground">No panel reviews yet</p>
                          )
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => void openApplicant(a)}
                        >
                          <Eye aria-hidden className="mr-1.5 h-3.5 w-3.5" />
                          View application
                        </Button>
                        {a.stage === "applied" && (
                          <label className="mt-3 block text-sm">
                            <span className="font-semibold">Invite to assessment</span>
                            <select
                              aria-label={"Assessment for " + a.candidate_name}
                              className="mt-1 min-h-11 w-full rounded-md border bg-background p-2 disabled:opacity-60"
                              defaultValue=""
                              disabled={shortlistingId === a.id}
                              onChange={(e) => {
                                if (e.target.value) {
                                  shortlist(a.id, Number(e.target.value));
                                  e.target.value = "";
                                }
                              }}
                            >
                              <option value="">
                                {shortlistingId === a.id ? "Sending invitation…" : "Choose assessment…"}
                              </option>
                              {assessments
                                .filter((s) => s.job_posting?.id === a.job_posting?.id)
                                .map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.title}
                                  </option>
                                ))}
                            </select>
                            {shortlistingId === a.id && (
                              <span className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                                Queuing assessment email…
                              </span>
                            )}
                          </label>
                        )}
                        {a.stage !== "applied" && a.stage !== "hired" && next && (
                          <Button
                            type="button"
                            size="sm"
                            className="mt-3 w-full text-xs"
                            disabled={busy}
                            onClick={() => void advanceApplicant(a)}
                          >
                            {busy ? (
                              <>
                                <Loader2 aria-hidden className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                {a.stage === "offer_sent" ? "Hiring…" : "Advancing…"}
                              </>
                            ) : a.stage === "offer_sent" ? (
                              "Hire candidate"
                            ) : (
                              <>
                                Advance to{" "}
                                {PIPELINE_STAGES.find((s) => s.code === next)?.label || next}
                                <ArrowRight aria-hidden className="ml-1.5 h-3.5 w-3.5" />
                              </>
                            )}
                          </Button>
                        )}
                      </article>
                      );
                    })}
                </div>
              </section>
            ))}
          </div>

          <Dialog open={Boolean(selectedApplicant)} onOpenChange={(open) => !open && setSelectedApplicant(null)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
              {selectedApplicant && (
                <>
                  <DialogHeader>
                    <DialogTitle>{selectedApplicant.candidate_name}</DialogTitle>
                    <DialogDescription>
                      Application for {selectedApplicant.job_posting?.title || "this vacancy"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 text-sm">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</p>
                        <p className="mt-1 break-all">{selectedApplicant.email}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</p>
                        <p className="mt-1">{selectedApplicant.phone || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stage</p>
                        <p className="mt-1 capitalize">{selectedApplicant.stage.replaceAll("_", " ")}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Applied</p>
                        <p className="mt-1">
                          {selectedApplicant.applied_at
                            ? new Date(selectedApplicant.applied_at).toLocaleString()
                            : "Unknown"}
                        </p>
                      </div>
                    </div>
                    {(() => {
                      const reviewInfo = summarizeReviews(selectedApplicant.reviews);
                      return (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Committee panel notes
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            For the hiring record only — recommendations do not advance or hire
                            candidates automatically.
                          </p>
                          {loadingApplicantReviews ? (
                            <p className="mt-2 inline-flex items-center gap-2 text-muted-foreground">
                              <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                              Loading panel notes…
                            </p>
                          ) : !reviewInfo ? (
                            <p className="mt-2 text-muted-foreground">No committee reviews yet.</p>
                          ) : (
                            <div className="mt-2 space-y-2">
                              <p
                                className={
                                  "inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold " +
                                  reviewToneClass(reviewInfo.tone)
                                }
                              >
                                Avg {reviewInfo.avg} ·{" "}
                                {RECOMMENDATION_LABEL[reviewInfo.latest.recommendation] ||
                                  reviewInfo.latest.recommendation}{" "}
                                · {reviewInfo.count} review{reviewInfo.count === 1 ? "" : "s"}
                              </p>
                              <ul className="space-y-2">
                                {(selectedApplicant.reviews || []).map((review) => (
                                  <li key={review.id} className="rounded-lg border bg-muted/20 p-3">
                                    <p className="font-semibold">
                                      Score {review.score} ·{" "}
                                      {RECOMMENDATION_LABEL[review.recommendation] ||
                                        review.recommendation}
                                    </p>
                                    {review.strengths && (
                                      <p className="mt-1 text-muted-foreground">
                                        Strengths: {review.strengths}
                                      </p>
                                    )}
                                    {review.concerns && (
                                      <p className="mt-1 text-muted-foreground">
                                        Concerns: {review.concerns}
                                      </p>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Cover letter / interest
                      </p>
                      <p className="mt-2 whitespace-pre-wrap rounded-lg border bg-muted/30 p-3">
                        {selectedApplicant.cover_letter?.trim() || "No cover letter provided."}
                      </p>
                    </div>
                    {selectedApplicant.answers && Object.keys(selectedApplicant.answers).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Application answers
                        </p>
                        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-xs">
                          {JSON.stringify(selectedApplicant.answers, null, 2)}
                        </pre>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resume</p>
                      {selectedApplicant.has_resume ? (
                        <Button
                          type="button"
                          className="mt-2"
                          disabled={downloadingResume}
                          onClick={() => downloadResume(selectedApplicant)}
                        >
                          {downloadingResume ? (
                            <>
                              <Loader2 aria-hidden className="mr-2 h-4 w-4 animate-spin" />
                              Downloading…
                            </>
                          ) : (
                            <>
                              <Download aria-hidden className="mr-2 h-4 w-4" />
                              Download resume
                            </>
                          )}
                        </Button>
                      ) : (
                        <p className="mt-2 text-muted-foreground">No resume was uploaded with this application.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>

        <AlertDialog open={advanceConfirmOpen} onOpenChange={setAdvanceConfirmOpen}>
          <AlertDialogContent className="rounded-[2rem] border-border/60 bg-background/95 backdrop-blur-xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {(() => {
                  const summary = applicantToAdvance ? summarizeReviews(applicantToAdvance.reviews) : null;
                  const hasNegativeReviews = summary && (summary.counts.no > 0 || summary.counts.hold > 0);
                  return hasNegativeReviews ? (
                    <>
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      Advance candidate anyway?
                    </>
                  ) : (
                    "Advance candidate?"
                  );
                })()}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {applicantToAdvance && (
                  <>
                    {(() => {
                      const next = nextPipelineStage(applicantToAdvance.stage);
                      const summary = summarizeReviews(applicantToAdvance.reviews);
                      const hasNegativeReviews = summary && (summary.counts.no > 0 || summary.counts.hold > 0);
                      const parts = [
                        summary?.counts.no ? summary.counts.no + " No" : null,
                        summary?.counts.hold ? summary.counts.hold + " Hold" : null,
                      ].filter(Boolean);
                      return (
                        <>
                          {hasNegativeReviews ? (
                            <p className="font-semibold text-amber-600">
                              {applicantToAdvance.candidate_name} has committee reviews with {parts.join(" and ")}.
                            </p>
                          ) : (
                            <p>
                              Advance {applicantToAdvance.candidate_name} to{" "}
                              {PIPELINE_STAGES.find((s) => s.code === next)?.label || next}?
                            </p>
                          )}
                          {hasNegativeReviews && (
                            <p className="mt-2 text-sm text-muted-foreground">
                              Reviews do not block the pipeline.
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmAdvance}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
              >
                Confirm advance
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </TabsContent>

        <TabsContent value="vacancies" className="mt-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
          <form onSubmit={submitPosting} className="space-y-4 rounded-2xl border bg-card p-6">
            <h2 className="text-xl font-black">Publish a vacancy</h2>
            <div>
              <Label htmlFor="title">Job title</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="vacancies_count">Open positions</Label>
                <Input id="vacancies_count" name="vacancies_count" type="number" min={1} step={1} defaultValue={1} required />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" defaultValue="Addis Ababa" />
              </div>
            </div>
            <div>
              <Label htmlFor="workplace_type">Workplace type</Label>
              <select id="workplace_type" name="workplace_type" className="min-h-11 w-full rounded-md border bg-background px-3">
                <option value="on_site">On site</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            </div>
            <div>
              <Label htmlFor="description">Role description</Label>
              <textarea id="description" name="description" required rows={5} className="w-full rounded-md border bg-background p-3" />
            </div>
            <div>
              <Label htmlFor="requirements">Requirements</Label>
              <textarea id="requirements" name="requirements" rows={5} className="w-full rounded-md border bg-background p-3" />
            </div>
            <div>
              <Label htmlFor="deadline">Application deadline</Label>
              <Input id="deadline" name="deadline" type="date" />
            </div>
            <Button type="submit" disabled={publishing} className={busyButton}>
              {publishing ? (
                <>
                  <Loader2 aria-hidden className="mr-2 h-4 w-4 animate-spin" />
                  Publishing…
                </>
              ) : (
                <>
                  <Plus aria-hidden className="mr-2 h-4 w-4" />
                  Publish vacancy
                </>
              )}
            </Button>
          </form>
          <section className="rounded-2xl border bg-card p-6">
            <h2 className="text-xl font-black">Published vacancies</h2>
            <div className="mt-4 space-y-3">
              {postings.length === 0 && <p className="text-sm text-muted-foreground">No published vacancies yet.</p>}
              {postings.map((p) => (
                <article key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                  <div>
                    <h3 className="font-bold">{p.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {p.code} · {p.location} · {p.vacancies_count} opening(s)
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">{p.status}</span>
                </article>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="tests" className="mt-6">
          <form onSubmit={submitAssessment} className="space-y-6 rounded-2xl border bg-card p-6">
            <h2 className="text-xl font-black">Build an online assessment</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="job_posting_id">Vacancy</Label>
                <select id="job_posting_id" name="job_posting_id" required className="min-h-11 w-full rounded-md border bg-background px-3">
                  <option value="">Choose vacancy…</option>
                  {postings.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="assessment-title">Assessment title</Label>
                <Input id="assessment-title" name="title" required />
              </div>
              <div>
                <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                <Input id="duration_minutes" name="duration_minutes" type="number" min={5} step={1} defaultValue={60} required />
              </div>
              <div>
                <Label htmlFor="pass_mark">Pass mark (%)</Label>
                <Input id="pass_mark" name="pass_mark" type="number" min={0} max={100} step={1} defaultValue={60} required />
              </div>
            </div>
            <div>
              <Label htmlFor="instructions">Candidate instructions</Label>
              <textarea id="instructions" name="instructions" rows={3} className="w-full rounded-md border bg-background p-3" />
            </div>
            <label className="flex gap-3">
              <input type="checkbox" name="require_fullscreen" className="h-5 w-5" />
              <span>Request fullscreen mode (exits are logged, never auto-rejected)</span>
            </label>

            <section aria-labelledby="questions-heading">
              <div className="flex items-center justify-between gap-3">
                <h3 id="questions-heading" className="text-lg font-black">
                  Questions
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuestions((q) => [...q, emptyQuestion()])}
                >
                  <Plus aria-hidden className="mr-2 h-4 w-4" />
                  Add question
                </Button>
              </div>
              <div className="mt-4 space-y-4">
                {questions.map((q, i) => (
                  <fieldset key={i} className="rounded-xl border p-4">
                    <legend className="flex items-center gap-2 px-2 font-bold">
                      Question {i + 1}
                      {questions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-700 hover:bg-red-50 hover:text-red-800"
                          aria-label={"Remove question " + (i + 1)}
                          onClick={() => setQuestions((all) => all.filter((_, n) => n !== i))}
                        >
                          <Trash2 aria-hidden className="mr-1 h-3.5 w-3.5" />
                          Remove
                        </Button>
                      )}
                    </legend>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor={"type-" + i}>Question type</Label>
                        <select
                          id={"type-" + i}
                          value={q.type}
                          onChange={(e) =>
                            setQuestions((all) => all.map((x, n) => (n === i ? { ...x, type: e.target.value } : x)))
                          }
                          className="min-h-11 w-full rounded-md border bg-background px-3"
                        >
                          <option value="single_choice">Single choice</option>
                          <option value="multiple_choice">Multiple choice</option>
                          <option value="true_false">True / false</option>
                          <option value="short_text">Short text</option>
                          <option value="long_text">Long text</option>
                          <option value="coding">Coding</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor={"points-" + i}>Points</Label>
                        <Input
                          id={"points-" + i}
                          type="number"
                          min={1}
                          step={1}
                          value={q.points}
                          onChange={(e) =>
                            setQuestions((all) =>
                              all.map((x, n) => (n === i ? { ...x, points: Number(e.target.value) || 1 } : x)),
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Label htmlFor={"prompt-" + i}>Prompt</Label>
                      <textarea
                        id={"prompt-" + i}
                        value={q.prompt}
                        onChange={(e) =>
                          setQuestions((all) => all.map((x, n) => (n === i ? { ...x, prompt: e.target.value } : x)))
                        }
                        required
                        rows={3}
                        className="w-full rounded-md border bg-background p-3"
                      />
                    </div>
                    {["single_choice", "multiple_choice"].includes(q.type) && (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor={"options-" + i}>Options (one per line)</Label>
                          <textarea
                            id={"options-" + i}
                            value={q.options}
                            onChange={(e) =>
                              setQuestions((all) => all.map((x, n) => (n === i ? { ...x, options: e.target.value } : x)))
                            }
                            rows={4}
                            className="w-full rounded-md border bg-background p-3"
                          />
                        </div>
                        <div>
                          <Label htmlFor={"correct-" + i}>Correct option</Label>
                          <Input
                            id={"correct-" + i}
                            value={q.correct_answer}
                            onChange={(e) =>
                              setQuestions((all) =>
                                all.map((x, n) => (n === i ? { ...x, correct_answer: e.target.value } : x)),
                              )
                            }
                          />
                        </div>
                      </div>
                    )}
                    {q.type === "coding" && (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor={"language-" + i}>Language</Label>
                          <select
                            id={"language-" + i}
                            value={q.language}
                            onChange={(e) =>
                              setQuestions((all) =>
                                all.map((x, n) => (n === i ? { ...x, language: e.target.value } : x)),
                              )
                            }
                            className="min-h-11 w-full rounded-md border bg-background px-3"
                          >
                            <option value="typescript">TypeScript</option>
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="java">Java</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor={"starter-" + i}>Starter code</Label>
                          <textarea
                            id={"starter-" + i}
                            value={q.starter_code}
                            onChange={(e) =>
                              setQuestions((all) =>
                                all.map((x, n) => (n === i ? { ...x, starter_code: e.target.value } : x)),
                              )
                            }
                            rows={5}
                            className="w-full rounded-md border bg-slate-950 p-3 font-mono text-slate-100"
                          />
                        </div>
                      </div>
                    )}
                  </fieldset>
                ))}
              </div>
            </section>
            <Button type="submit" disabled={publishingAssessment} className={busyButton}>
              {publishingAssessment ? (
                <>
                  <Loader2 aria-hidden className="mr-2 h-4 w-4 animate-spin" />
                  Publishing assessment…
                </>
              ) : (
                <>
                  <ClipboardCheck aria-hidden className="mr-2 h-4 w-4" />
                  Publish assessment
                </>
              )}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          <section className="rounded-2xl border bg-card p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Assessment results & integrity review</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open an attempt for answer-level grading, integrity event timeline, and answer-similarity
                  analysis. Risk signals never auto-reject candidates.
                </p>
              </div>
              <label className="text-sm">
                <span className="sr-only">Filter attempts</span>
                <select
                  className="min-h-11 rounded-md border bg-background px-3"
                  value={resultsFilter}
                  onChange={(e) =>
                    setResultsFilter(e.target.value as typeof resultsFilter)
                  }
                >
                  <option value="all">All attempts</option>
                  <option value="review_required">Integrity review required</option>
                  <option value="submitted">Awaiting grading</option>
                  <option value="graded">Graded</option>
                </select>
              </label>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Submitted candidate assessment results</caption>
                <thead>
                  <tr className="border-b">
                    <th scope="col" className="p-3">
                      Candidate
                    </th>
                    <th scope="col" className="p-3">
                      Assessment
                    </th>
                    <th scope="col" className="p-3">
                      Status
                    </th>
                    <th scope="col" className="p-3">
                      Score
                    </th>
                    <th scope="col" className="p-3">
                      Similarity
                    </th>
                    <th scope="col" className="p-3">
                      Integrity
                    </th>
                    <th scope="col" className="p-3">
                      Review
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.filter((a) => {
                    if (resultsFilter === "all") return true;
                    if (resultsFilter === "review_required") {
                      return a.integrity_status === "review_required";
                    }
                    return a.status === resultsFilter;
                  }).length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-3 text-muted-foreground">
                        No assessment attempts match this filter.
                      </td>
                    </tr>
                  )}
                  {attempts
                    .filter((a) => {
                      if (resultsFilter === "all") return true;
                      if (resultsFilter === "review_required") {
                        return a.integrity_status === "review_required";
                      }
                      return a.status === resultsFilter;
                    })
                    .map((a) => {
                      const similarity = attemptSimilarityPercent(a);
                      const eventCount =
                        a.integrity_summary?.event_count ??
                        attemptIntegrityEvents(a).length;
                      return (
                        <tr key={a.id} className="border-b align-top">
                          <td className="p-3">
                            <div className="font-semibold">
                              {a.invitation.applicant.candidate_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {a.invitation.applicant.job_posting?.title ||
                                a.invitation.applicant.email}
                            </div>
                          </td>
                          <td className="p-3">{a.invitation.assessment.title}</td>
                          <td className="p-3 capitalize">{a.status.replaceAll("_", " ")}</td>
                          <td className="p-3">
                            <div>{attemptDisplayScore(a)}</div>
                            {a.invitation.assessment.pass_mark != null && (
                              <div className="text-xs text-muted-foreground">
                                Pass mark {a.invitation.assessment.pass_mark}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={
                                similarity >= 40
                                  ? "font-bold text-amber-800"
                                  : "text-muted-foreground"
                              }
                            >
                              {similarity}%
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={
                                "rounded-full px-2 py-1 text-xs font-bold " +
                                (a.integrity_status === "review_required"
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-emerald-100 text-emerald-900")
                              }
                            >
                              {a.integrity_risk}/100 ·{" "}
                              {a.integrity_status.replaceAll("_", " ")}
                            </span>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {eventCount} event{eventCount === 1 ? "" : "s"}
                            </div>
                          </td>
                          <td className="p-3">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedAttempt(a)}
                            >
                              <Eye aria-hidden className="mr-1.5 h-3.5 w-3.5" />
                              Open review
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>

          <AssessmentAttemptReview
            attempt={selectedAttempt}
            open={Boolean(selectedAttempt)}
            onOpenChange={(open) => !open && setSelectedAttempt(null)}
            api={api}
            refresh={refresh}
            onStatus={flash}
            onError={setError}
          />
        </TabsContent>

        <TabsContent value="committee" className="mt-6">
          <CommitteeReviewPanel
            postings={postings}
            applicants={applicants}
            attempts={attempts}
            api={api}
            refresh={refresh}
            setStatus={flash}
            setError={setError}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
