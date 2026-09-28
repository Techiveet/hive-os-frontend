"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, Flag, Pencil, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCorrectAnswer, myQuizApi, type LmsQuizAttempt } from "@/modules/Lms/api/quizzes";
import { LMS_HEX, LMS_TOKENS, useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import {
  LMS_CARD,
  LmsDashboardShell,
  LmsPanel,
  LmsProgressBar,
} from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";
import { QuizQuestionField } from "@/modules/Lms/components/quiz-question-field";
import { useQuizProctor, useServerCountdown } from "@/modules/Lms/hooks/use-quiz-proctor";

/**
 * What "no answer" looks like for a given question type, so Clear my choice
 * round-trips to the server as an empty answer rather than as a stale one.
 */
function clearedValue(type: string): unknown {
  if (type === "coding") return { files: [] };
  if (type === "short_text" || type === "long_text") return "";
  return [];
}


export default function QuizAttemptPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const queryClient = useQueryClient();
  const { brandSettings, brandName } = useLmsPublicBrand();
  const { role } = useLmsRole();

  const attemptQuery = useQuery({
    queryKey: ["lms", "quiz-attempt", attemptId],
    queryFn: () => myQuizApi.attempt(attemptId),
    enabled: Boolean(attemptId),
  });

  const attempt: LmsQuizAttempt | undefined = attemptQuery.data;
  const isOpen = attempt?.status === "in_progress";

  // Local answer state, seeded from the server once the attempt loads.
  const [answers, setAnswers] = React.useState<Record<string, unknown>>({});
  const seeded = React.useRef(false);

  React.useEffect(() => {
    if (!attempt || seeded.current) return;
    const next: Record<string, unknown> = {};
    for (const answer of attempt.answers ?? []) next[answer.question_id] = answer.answer;
    setAnswers(next);
    seeded.current = true;
  }, [attempt]);

  // "Flag question" from the template. Purely a bookmark for the learner while
  // they work, so it lives in the page rather than on the attempt record.
  const [flags, setFlags] = React.useState<Set<string>>(new Set());
  const toggleFlag = React.useCallback((questionId: string) => {
    setFlags((current) => {
      const next = new Set(current);
      if (!next.delete(questionId)) next.add(questionId);
      return next;
    });
  }, []);

  const submit = useMutation({
    mutationFn: () => myQuizApi.submit(attemptId),
    onSuccess: (result) => {
      queryClient.setQueryData(["lms", "quiz-attempt", attemptId], result);
      queryClient.invalidateQueries({ queryKey: ["lms", "my-quizzes"] });
    },
  });

  // The paper is closed the moment it is handed in, however that happened —
  // the learner pressing submit, the clock, or a proctoring rule. Held in a ref
  // so the callbacks below never fire a second submit into a closed attempt.
  const submitted = submit.isPending || submit.isSuccess;
  const submittedRef = React.useRef(submitted);
  submittedRef.current = submitted;

  const closeAttempt = React.useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    submit.mutate();
  }, [submit]);

  /**
   * The clock is the server's. The local countdown is only there to make the
   * number move; every heartbeat and every answer save restates the truth, so
   * a wrong device clock or a sleeping laptop cannot buy time.
   */
  const countdown = useServerCountdown({
    attemptId,
    initialSeconds: attempt?.seconds_remaining,
    active: Boolean(isOpen) && !submitted,
    onExpired: () => {
      // Already closed server-side; refetching shows the marked result rather
      // than a paper the learner can still type into.
      submittedRef.current = true;
      queryClient.invalidateQueries({ queryKey: ["lms", "quiz-attempt", attemptId] });
    },
  });

  const proctor = useQuizProctor({
    attemptId,
    rules: attempt?.quiz?.proctoring,
    active: Boolean(isOpen) && !submitted,
    onAutoSubmit: () => {
      submittedRef.current = true;
      queryClient.invalidateQueries({ queryKey: ["lms", "quiz-attempt", attemptId] });
    },
  });

  const save = useMutation({
    mutationFn: ({ questionId, value }: { questionId: string; value: unknown }) =>
      myQuizApi.saveAnswer(attemptId, questionId, value),
    // Every save carries the server's own view of the clock back with it, so
    // the display corrects itself between heartbeats.
    onSuccess: (result) => countdown.sync(result.meta.seconds_remaining),
  });

  // Autosave: one debounced write per question, so a slow typist does not
  // generate a request per keystroke but nothing is lost on submit either.
  const timers = React.useRef<Record<string, number>>({});
  const handleChange = React.useCallback(
    (questionId: string, value: unknown) => {
      setAnswers((current) => ({ ...current, [questionId]: value }));
      window.clearTimeout(timers.current[questionId]);
      timers.current[questionId] = window.setTimeout(() => {
        save.mutate({ questionId, value });
      }, 600);
    },
    [save],
  );

  // Hard stop when the local countdown reaches zero. The server enforces this
  // too — and is the one that decides — but submitting from the client turns a
  // silent timeout into a result the learner sees immediately.
  React.useEffect(() => {
    if (isOpen && countdown.seconds === 0) {
      closeAttempt();
    }
  }, [isOpen, countdown.seconds, closeAttempt]);

  const questions = attempt?.questions ?? [];
  const answeredCount = questions.filter(
    (q) => answers[q.id] !== undefined && answers[q.id] !== "" &&
      !(Array.isArray(answers[q.id]) && (answers[q.id] as unknown[]).length === 0),
  ).length;

  const shell = (children: React.ReactNode, title: string) => (
    <LmsDashboardShell
      role={role}
      brandSettings={brandSettings}
      brandName={brandName}
      title={title}
      breadcrumbs={[
        { label: "Dashboard", href: "/learn" },
        { label: "Quizzes", href: "/learn/quizzes" },
        { label: title },
      ]}
    >
      {children}
    </LmsDashboardShell>
  );

  if (attemptQuery.isPending) {
    return shell(
      <LmsPanel>
        <p style={{ color: LMS_TOKENS.muted }}>Loading attempt…</p>
      </LmsPanel>,
      "Quiz",
    );
  }

  if (attemptQuery.isError || !attempt) {
    return shell(
      <LmsPanel>
        <p style={{ color: LMS_TOKENS.muted }}>
          This attempt could not be loaded. It may belong to another learner.
        </p>
        <Button asChild className="mt-5">
          <Link href="/learn/quizzes">Back to quizzes</Link>
        </Button>
      </LmsPanel>,
      "Quiz",
    );
  }

  const quizTitle = attempt.quiz?.title ?? "Quiz";

  /* ----------------------------- results view ---------------------------- */
  if (!isOpen) {
    const percent = attempt.score_percent ?? 0;
    const passed = attempt.passed;

    return shell(
      <div className="grid gap-7 xl:grid-cols-3">
        <LmsPanel title="Result" className="xl:col-span-2">
          <div className="flex flex-wrap items-center gap-4">
            {passed === null ? (
              <Clock3 className="size-8" style={{ color: LMS_TOKENS.muted }} />
            ) : passed ? (
              <CheckCircle2 className="size-8" style={{ color: LMS_TOKENS.greenDark }} />
            ) : (
              <XCircle className="size-8" style={{ color: "#DC2626" }} />
            )}
            <div>
              <div className="text-[24px] font-bold" style={{ color: LMS_TOKENS.navy }}>
                {Number(attempt.final_score ?? 0)} / {Number(attempt.max_score ?? 0)} ({percent}%)
              </div>
              <div className="text-[14px]" style={{ color: LMS_TOKENS.muted }}>
                {attempt.status === "submitted"
                  ? "Submitted — some answers still need marking by your instructor."
                  : passed
                    ? "Passed"
                    : "Did not reach the pass mark"}
              </div>
            </div>
          </div>

          <LmsProgressBar percent={percent} className="mt-6" />

          <ul className="mt-8 flex flex-col gap-6">
            {questions.map((question, index) => {
              const answer = attempt.answers?.find((a) => a.question_id === question.id);
              return (
                <li key={question.id} className="border-t pt-6 first:border-t-0 first:pt-0"
                    style={{ borderColor: LMS_TOKENS.border }}>
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-[15px] font-medium" style={{ color: LMS_TOKENS.navy }}>
                      {index + 1}. {question.prompt}
                    </p>
                    <span className="shrink-0 text-[14px]" style={{ color: LMS_TOKENS.muted }}>
                      {answer?.awarded ?? 0} / {Number(question.points)}
                    </span>
                  </div>
                  {formatCorrectAnswer(question.correct_answer) ? (
                    <p className="mt-2 text-[14px]" style={{ color: LMS_TOKENS.greenDark }}>
                      Correct answer: {formatCorrectAnswer(question.correct_answer)}
                    </p>
                  ) : null}
                  {question.explanation ? (
                    <p className="mt-1.5 text-[14px]" style={{ color: LMS_TOKENS.muted }}>
                      {question.explanation}
                    </p>
                  ) : null}
                  {answer?.review_note ? (
                    <p className="mt-1.5 text-[14px]" style={{ color: LMS_TOKENS.muted }}>
                      Instructor note: {answer.review_note}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </LmsPanel>

        <LmsPanel title="Attempt">
          <dl className="flex flex-col gap-4 text-[15px]">
            <div className="flex justify-between">
              <dt style={{ color: LMS_TOKENS.muted }}>Quiz</dt>
              <dd style={{ color: LMS_TOKENS.navy }}>{quizTitle}</dd>
            </div>
            <div className="flex justify-between">
              <dt style={{ color: LMS_TOKENS.muted }}>Attempt</dt>
              <dd style={{ color: LMS_TOKENS.navy }}>#{attempt.attempt_number}</dd>
            </div>
            <div className="flex justify-between">
              <dt style={{ color: LMS_TOKENS.muted }}>Pass mark</dt>
              <dd style={{ color: LMS_TOKENS.navy }}>{Number(attempt.quiz?.pass_mark ?? 0)}%</dd>
            </div>
          </dl>
          <Button asChild className="mt-7 w-full">
            <Link href="/learn/quizzes">Back to quizzes</Link>
          </Button>
        </LmsPanel>
      </div>,
      quizTitle,
    );
  }

  /* ----------------------------- sitting view ---------------------------- */
  const isAnswered = (questionId: string) => {
    const value = answers[questionId];
    if (value === undefined || value === "" || value === null) return false;
    return !(Array.isArray(value) && value.length === 0);
  };

  return shell(
    <div className="grid gap-7 xl:grid-cols-4">
      <div className="flex flex-col gap-7 xl:col-span-3">
        {/*
          The proctoring notices. Both are deliberately in the learner's way
          rather than silent: telling someone the rule as they break it is
          fairer than only telling their instructor afterwards, and a rule that
          is enforced invisibly reads as a broken quiz.
        */}
        {proctor.needsFullscreen ? (
          <div
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5"
            style={{ borderColor: "#E59819", backgroundColor: "#FDF3E4" }}
          >
            <p className="text-[15px]" style={{ color: LMS_TOKENS.navy }}>
              This quiz should be taken in fullscreen. Leaving it is recorded for your instructor.
            </p>
            <Button size="sm" onClick={proctor.requestFullscreen}>
              Enter fullscreen
            </Button>
          </div>
        ) : null}

        {proctor.warning ? (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5"
            style={{ borderColor: "#DC2626", backgroundColor: "#FDECEC" }}
          >
            <p className="text-[15px]" style={{ color: "#991B1B" }}>
              {proctor.warning}
            </p>
            <Button size="sm" variant="outline" onClick={proctor.dismissWarning}>
              Dismiss
            </Button>
          </div>
        ) : null}
        {questions.map((question, index) => {
          const answered = isAnswered(question.id);
          const flagged = flags.has(question.id);

          return (
            <section
              key={question.id}
              id={`question-${index + 1}`}
              className={cn(LMS_CARD, "scroll-mt-28 overflow-hidden")}
            >
              {/* dshb-quiz.html: the question header is a dark band carrying
                  the number, the flag/edit affordances and the mark state. */}
              <header
                className="px-7 py-8 text-white sm:px-10"
                style={{ backgroundColor: LMS_TOKENS.dark5 }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <h2 className="text-[18px] font-medium leading-none">Question {index + 1}</h2>
                  <div className="flex items-center gap-8">
                    <button
                      type="button"
                      onClick={() => toggleFlag(question.id)}
                      aria-pressed={flagged}
                      className="flex items-center gap-2.5 text-[14px] transition hover:opacity-80"
                      style={{ color: flagged ? LMS_TOKENS.green : "#FFFFFF" }}
                    >
                      <Flag className="size-4" fill={flagged ? LMS_HEX.green : "none"} />
                      {flagged ? "Flagged" : "Flag question"}
                    </button>
                    <a
                      href={`#question-${index + 1}`}
                      className="flex items-center gap-2.5 text-[14px] transition hover:opacity-80"
                    >
                      <Pencil className="size-4" />
                      Answer
                    </a>
                  </div>
                </div>

                <div className="flex flex-wrap gap-12 pt-4 text-[15px]">
                  <span>{answered ? "Answer saved" : "Not yet answered"}</span>
                  <span>Marked out of {Number(question.points).toFixed(2)}</span>
                </div>

                <p className="mt-4 text-[20px] leading-snug">{question.prompt}</p>
              </header>

              <div className="px-7 py-8 sm:px-10">
                <div className="mb-5 text-[15px]" style={{ color: LMS_TOKENS.muted }}>
                  {question.type === "multiple_choice"
                    ? "Select all that apply:"
                    : question.type === "single_choice" || question.type === "true_false"
                      ? "Select one:"
                      : "Your answer:"}
                </div>

                <QuizQuestionField
                  question={question}
                  value={answers[question.id]}
                  onChange={(value) => handleChange(question.id, value)}
                />

                {answered ? (
                  <button
                    type="button"
                    onClick={() => handleChange(question.id, clearedValue(question.type))}
                    className="mt-5 block text-[15px] font-medium underline"
                    style={{ color: LMS_TOKENS.purple }}
                  >
                    Clear my choice
                  </button>
                ) : null}
              </div>
            </section>
          );
        })}

        <div className="flex justify-end">
          <Button
            size="lg"
            disabled={submit.isPending}
            onClick={closeAttempt}
            style={{ backgroundColor: LMS_TOKENS.navySolid }}
          >
            {submit.isPending ? "Submitting…" : "Finish"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-7">
        <LmsPanel title="Quiz Complete">
          {countdown.seconds !== null ? (
            <div
              className="mb-5 flex items-center gap-2 text-[17px] font-semibold"
              style={{ color: countdown.seconds < 60 ? "#DC2626" : LMS_TOKENS.navy }}
            >
              <Clock3 className="size-5" />
              {String(Math.floor(countdown.seconds / 60)).padStart(2, "0")}:
              {String(countdown.seconds % 60).padStart(2, "0")}
            </div>
          ) : null}

          {proctor.focusLosses > 0 ? (
            <p className="mb-5 text-[13px]" style={{ color: proctor.flagged ? "#DC2626" : LMS_TOKENS.muted }}>
              Left the quiz {proctor.focusLosses} {proctor.focusLosses === 1 ? "time" : "times"}
              {attempt.quiz?.proctoring?.max_focus_loss
                ? ` of ${attempt.quiz.proctoring.max_focus_loss} allowed`
                : ""}
              .
            </p>
          ) : null}

          <div className="flex items-center gap-4">
            <LmsProgressBar
              percent={questions.length ? (answeredCount / questions.length) * 100 : 0}
              className="flex-1"
            />
            <span className="shrink-0 text-[15px]" style={{ color: LMS_TOKENS.navy }}>
              {answeredCount}/{questions.length}
            </span>
          </div>

          {save.isError ? (
            <p className="mt-4 text-[13px]" style={{ color: "#DC2626" }}>
              An answer failed to save. Check your connection before finishing.
            </p>
          ) : null}
        </LmsPanel>

        {/* dshb-quiz.html's numbered jump grid, with the template's plain tile
            given three states so it also reports where the learner is up to. */}
        <LmsPanel title="Quiz Navigation">
          <ol className="flex flex-wrap gap-2.5">
            {questions.map((question, index) => {
              const answered = isAnswered(question.id);
              const flagged = flags.has(question.id);

              return (
                <li key={question.id}>
                  <a
                    href={`#question-${index + 1}`}
                    aria-label={`Question ${index + 1}${answered ? ", answered" : ""}${
                      flagged ? ", flagged" : ""
                    }`}
                    className="flex size-9 items-center justify-center rounded-lg text-[15px] font-medium leading-none transition"
                    style={{
                      backgroundColor: answered ? LMS_TOKENS.purple : LMS_TOKENS.light3,
                      color: answered ? "#FFFFFF" : LMS_TOKENS.navy,
                      outline: flagged ? `2px solid ${LMS_TOKENS.starYellow}` : undefined,
                      outlineOffset: flagged ? "2px" : undefined,
                    }}
                  >
                    {index + 1}
                  </a>
                </li>
              );
            })}
          </ol>

          <Button
            className="mt-7 w-full"
            disabled={submit.isPending}
            onClick={closeAttempt}
            style={{ backgroundColor: LMS_TOKENS.navySolid }}
          >
            {submit.isPending ? "Submitting…" : "Finish"}
          </Button>
        </LmsPanel>
      </div>
    </div>,
    quizTitle,
  );
}
