"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AUTO_GRADED_TYPES,
  formatCorrectAnswer,
  quizApi,
  type LmsQuizAttempt,
} from "@/modules/Lms/api/quizzes";
import { LMS_TOKENS, useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import { LmsDashboardShell, LmsPanel } from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";

type Mark = { manual_score: string; review_note: string };

/** Renders whatever a learner submitted, whichever question type it came from. */
function AnswerBody({ answer }: { answer: unknown }) {
  if (answer == null || answer === "") {
    return (
      <p className="italic" style={{ color: LMS_TOKENS.muted }}>
        Left blank.
      </p>
    );
  }

  if (Array.isArray(answer)) {
    return <p style={{ color: LMS_TOKENS.navy }}>{answer.join(", ")}</p>;
  }

  const files = (answer as { files?: { name: string; content: string }[] }).files;
  if (files?.length) {
    return (
      <div className="flex flex-col gap-4">
        {files.map((file) => (
          <div key={file.name}>
            <div className="text-[13px] font-medium" style={{ color: LMS_TOKENS.muted }}>
              {file.name}
            </div>
            <pre
              className="mt-1.5 overflow-x-auto rounded-xl p-4 text-[13px]"
              style={{ backgroundColor: LMS_TOKENS.lightBg, color: LMS_TOKENS.navy }}
            >
              {file.content}
            </pre>
          </div>
        ))}
      </div>
    );
  }

  return (
    <p className="whitespace-pre-wrap" style={{ color: LMS_TOKENS.navy }}>
      {String(answer)}
    </p>
  );
}

export default function QuizAttemptsPage() {
  const params = useParams<{ quizId: string }>();
  const quizId = params.quizId;
  const queryClient = useQueryClient();
  const { brandSettings, brandName } = useLmsPublicBrand();
  const { canGrade } = useLmsRole();

  const [quiz, attempts] = useQueries({
    queries: [
      { queryKey: ["lms", "quiz", quizId], queryFn: () => quizApi.get(quizId), enabled: Boolean(quizId) },
      {
        queryKey: ["lms", "quiz-attempts", quizId],
        queryFn: () => quizApi.attempts(quizId),
        enabled: Boolean(quizId),
      },
    ],
  });

  const rows: LmsQuizAttempt[] = (attempts.data as { data?: LmsQuizAttempt[] } | undefined)?.data ?? [];
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Default to whatever is waiting on a human, so the queue opens on work.
  React.useEffect(() => {
    if (selectedId || rows.length === 0) return;
    setSelectedId((rows.find((row) => row.status === "submitted") ?? rows[0]).id);
  }, [rows, selectedId]);

  const selected = rows.find((row) => row.id === selectedId) ?? null;

  const [marks, setMarks] = React.useState<Record<string, Mark>>({});

  // Seeded when the marker opens a different attempt — deliberately keyed on
  // the id and not on `selected`, whose identity changes on every background
  // refetch. Keying it on the object threw away marks that were typed but not
  // yet saved, the moment React Query revalidated.
  const seededFor = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!selected || seededFor.current === selected.id) return;
    seededFor.current = selected.id;

    const next: Record<string, Mark> = {};
    for (const answer of selected.answers ?? []) {
      next[answer.id] = {
        // Only a human's mark prefills the box. `awarded` falls back to 0 for
        // an unmarked essay, which reads as "already given nothing".
        manual_score: answer.manual_score != null ? String(answer.manual_score) : "",
        review_note: answer.review_note ?? "",
      };
    }
    setMarks(next);
  }, [selected]);

  const grade = useMutation({
    mutationFn: (attemptId: string) =>
      quizApi.grade(
        attemptId,
        Object.entries(marks)
          .filter(([, mark]) => mark.manual_score.trim() !== "")
          .map(([answerId, mark]) => ({
            answer_id: answerId,
            manual_score: Number(mark.manual_score),
            review_note: mark.review_note.trim() || undefined,
          })),
      ),
    onSuccess: () => {
      // Re-seed from the server on the way back: it caps a mark at the
      // question's points, so what was typed is not always what was stored.
      seededFor.current = null;
      queryClient.invalidateQueries({ queryKey: ["lms", "quiz-attempts", quizId] });
      toast.success("Marks saved.");
    },
    onError: (error: unknown) =>
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "The marks could not be saved.",
      ),
  });

  const waiting = rows.filter((row) => row.status === "submitted").length;

  return (
    <LmsDashboardShell
      role="instructor"
      brandSettings={brandSettings}
      brandName={brandName}
      title={quiz.data?.title ? `Marking — ${quiz.data.title}` : "Marking"}
      subtitle={
        waiting > 0
          ? `${waiting} attempt${waiting === 1 ? "" : "s"} waiting on a human mark.`
          : "Nothing is waiting on a mark."
      }
      breadcrumbs={[
        { label: "Dashboard", href: "/learn" },
        { label: "Quizzes", href: "/learn/quizzes" },
        { label: "Marking" },
      ]}
      actions={
        <Button asChild variant="outline">
          <Link href={`/learn/quizzes/${quizId}/edit`}>Edit quiz</Link>
        </Button>
      }
    >
      <div className="grid gap-7 xl:grid-cols-3">
        <LmsPanel title="Attempts" bodyClassName="px-0 py-0">
          {attempts.isPending ? (
            <p className="px-7 py-7" style={{ color: LMS_TOKENS.muted }}>
              Loading attempts…
            </p>
          ) : rows.length === 0 ? (
            <p className="px-7 py-7" style={{ color: LMS_TOKENS.muted }}>
              No one has sat this quiz yet.
            </p>
          ) : (
            <ul>
              {rows.map((row) => {
                const active = row.id === selectedId;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      aria-current={active ? "true" : undefined}
                      className="flex w-full flex-col items-start gap-1 border-b px-7 py-4 text-left transition"
                      style={{
                        borderColor: LMS_TOKENS.border,
                        backgroundColor: active ? LMS_TOKENS.lavender : "transparent",
                      }}
                    >
                      <span className="text-[15px] font-medium" style={{ color: LMS_TOKENS.navy }}>
                        {row.user?.name ?? "Learner"}
                      </span>
                      <span className="text-[13px]" style={{ color: LMS_TOKENS.muted }}>
                        Attempt #{row.attempt_number} ·{" "}
                        {row.status === "submitted" ? "Needs marking" : "Graded"}
                        {row.score_percent != null ? ` · ${row.score_percent}%` : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </LmsPanel>

        <div className="xl:col-span-2">
          {!selected ? (
            <LmsPanel>
              <p style={{ color: LMS_TOKENS.muted }}>Pick an attempt to mark.</p>
            </LmsPanel>
          ) : (
            <LmsPanel
              title={`${selected.user?.name ?? "Learner"} — attempt #${selected.attempt_number}`}
              action={
                <span className="text-[14px]" style={{ color: LMS_TOKENS.muted }}>
                  {Number(selected.final_score ?? 0)} / {Number(selected.max_score ?? 0)}
                </span>
              }
            >
              <ul className="flex flex-col gap-7">
                {(selected.answers ?? []).map((answer, index) => {
                  const question = answer.question;
                  const auto = question ? AUTO_GRADED_TYPES.includes(question.type) : false;
                  const mark = marks[answer.id] ?? { manual_score: "", review_note: "" };

                  return (
                    <li
                      key={answer.id}
                      className="border-t pt-7 first:border-t-0 first:pt-0"
                      style={{ borderColor: LMS_TOKENS.border }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-[15px] font-medium" style={{ color: LMS_TOKENS.navy }}>
                          {index + 1}. {question?.prompt ?? "Question"}
                        </p>
                        <span className="shrink-0 text-[14px]" style={{ color: LMS_TOKENS.muted }}>
                          worth {Number(question?.points ?? 0)}
                        </span>
                      </div>

                      <div className="mt-3">
                        <AnswerBody answer={answer.answer} />
                      </div>

                      {formatCorrectAnswer(question?.correct_answer) ? (
                        <p className="mt-3 text-[14px]" style={{ color: LMS_TOKENS.greenDark }}>
                          Key: {formatCorrectAnswer(question?.correct_answer)}
                        </p>
                      ) : null}

                      {auto ? (
                        <p className="mt-3 text-[14px]" style={{ color: LMS_TOKENS.muted }}>
                          Marked automatically — {answer.awarded ?? 0} of{" "}
                          {Number(question?.points ?? 0)}.
                        </p>
                      ) : (
                        <div className="mt-4 grid gap-4 sm:grid-cols-[8rem_1fr]">
                          <div>
                            <Label htmlFor={`score-${answer.id}`}>Score</Label>
                            <Input
                              id={`score-${answer.id}`}
                              type="number"
                              min={0}
                              max={Number(question?.points ?? 0)}
                              step="0.5"
                              className="mt-2"
                              disabled={!canGrade}
                              value={mark.manual_score}
                              onChange={(event) =>
                                setMarks((current) => ({
                                  ...current,
                                  [answer.id]: { ...mark, manual_score: event.target.value },
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor={`note-${answer.id}`}>Feedback</Label>
                            <Textarea
                              id={`note-${answer.id}`}
                              rows={2}
                              className="mt-2"
                              placeholder="Shown to the learner with their result."
                              disabled={!canGrade}
                              value={mark.review_note}
                              onChange={(event) =>
                                setMarks((current) => ({
                                  ...current,
                                  [answer.id]: { ...mark, review_note: event.target.value },
                                }))
                              }
                            />
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {canGrade ? (
                <Button
                  className="mt-8"
                  disabled={grade.isPending}
                  onClick={() => grade.mutate(selected.id)}
                  style={{ backgroundColor: LMS_TOKENS.purple }}
                >
                  {grade.isPending ? "Saving…" : "Save marks"}
                </Button>
              ) : (
                <p className="mt-8 text-[14px]" style={{ color: LMS_TOKENS.muted }}>
                  You can read this attempt but not mark it.
                </p>
              )}
            </LmsPanel>
          )}
        </div>
      </div>
    </LmsDashboardShell>
  );
}
