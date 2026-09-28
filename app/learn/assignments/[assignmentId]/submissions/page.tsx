"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { Paperclip } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { assignmentApi, type LmsSubmission } from "@/modules/Lms/api/assignments";
import { LMS_TOKENS, useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import { LmsDashboardShell, LmsPanel } from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** "Time remaining" from the template's grading summary. */
function timeRemaining(due?: string | null) {
  if (!due) return "No deadline";
  const ms = new Date(due).getTime() - Date.now();
  if (Number.isNaN(ms)) return "No deadline";
  if (ms <= 0) return "Assignment is due";

  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} ${hours} hr`;
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours} hr ${minutes} min`;
}

export default function AssignmentSubmissionsPage() {
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = params.assignmentId;
  const queryClient = useQueryClient();
  const { brandSettings, brandName } = useLmsPublicBrand();
  const { canGrade } = useLmsRole();

  const [assignment, submissions] = useQueries({
    queries: [
      {
        queryKey: ["lms", "assignment", assignmentId],
        queryFn: () => assignmentApi.get(assignmentId),
        enabled: Boolean(assignmentId),
      },
      {
        queryKey: ["lms", "assignment-submissions", assignmentId],
        queryFn: () => assignmentApi.submissions(assignmentId),
        enabled: Boolean(assignmentId),
      },
    ],
  });

  const rows: LmsSubmission[] = submissions.data?.data ?? [];
  const meta = submissions.data?.meta;

  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Open on work that needs a human.
  React.useEffect(() => {
    if (selectedId || rows.length === 0) return;
    setSelectedId((rows.find((row) => row.status === "submitted") ?? rows[0]).id);
  }, [rows, selectedId]);

  const selected = rows.find((row) => row.id === selectedId) ?? null;

  const [score, setScore] = React.useState("");
  const [feedback, setFeedback] = React.useState("");

  // Keyed on the submission id, not the object, so a background refetch cannot
  // discard a mark the instructor has typed but not saved.
  const seededFor = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!selected || seededFor.current === selected.id) return;
    seededFor.current = selected.id;
    setScore(selected.score != null ? String(selected.score) : "");
    setFeedback(selected.feedback ?? "");
  }, [selected]);

  const grade = useMutation({
    mutationFn: (submissionId: string) =>
      assignmentApi.grade(submissionId, {
        score: Number(score),
        feedback: feedback.trim() || undefined,
      }),
    onSuccess: () => {
      seededFor.current = null;
      queryClient.invalidateQueries({ queryKey: ["lms", "assignment-submissions", assignmentId] });
      queryClient.invalidateQueries({ queryKey: ["lms", "assignments"] });
      toast.success("Mark saved.");
    },
    onError: (error: unknown) =>
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "The mark could not be saved.",
      ),
  });

  const title = assignment.data?.title ?? "Assignment";
  const points = meta?.points ?? Number(assignment.data?.points ?? 0);

  return (
    <LmsDashboardShell
      role="instructor"
      brandSettings={brandSettings}
      brandName={brandName}
      title={`Marking — ${title}`}
      subtitle={
        meta?.needs_grading
          ? `${meta.needs_grading} submission${meta.needs_grading === 1 ? "" : "s"} waiting on a mark.`
          : "Nothing is waiting on a mark."
      }
      breadcrumbs={[
        { label: "Dashboard", href: "/learn" },
        { label: "Assignments", href: "/learn/assignments" },
        { label: "Marking" },
      ]}
      actions={
        <Button asChild variant="outline">
          <Link href={`/learn/assignments/${assignmentId}/edit`}>Edit assignment</Link>
        </Button>
      }
    >
      <div className="grid gap-7 xl:grid-cols-3">
        <div className="flex flex-col gap-7">
          {/* The template's grading summary block. */}
          <LmsPanel title="Grading summary">
            <dl className="flex flex-col gap-4 text-[15px]">
              <div className="flex justify-between gap-4">
                <dt style={{ color: LMS_TOKENS.muted }}>Participants</dt>
                <dd style={{ color: LMS_TOKENS.navy }}>{meta?.participants ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt style={{ color: LMS_TOKENS.muted }}>Submitted</dt>
                <dd style={{ color: LMS_TOKENS.navy }}>{meta?.submitted ?? 0}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt style={{ color: LMS_TOKENS.muted }}>Needs grading</dt>
                <dd style={{ color: LMS_TOKENS.navy }}>{meta?.needs_grading ?? 0}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt style={{ color: LMS_TOKENS.muted }}>Due date</dt>
                <dd className="text-right" style={{ color: LMS_TOKENS.navy }}>
                  {formatDate(meta?.due_at) ?? "No deadline"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt style={{ color: LMS_TOKENS.muted }}>Time remaining</dt>
                <dd style={{ color: LMS_TOKENS.navy }}>{timeRemaining(meta?.due_at)}</dd>
              </div>
            </dl>
          </LmsPanel>

          <LmsPanel title="Submissions" bodyClassName="px-0 py-0">
            {submissions.isPending ? (
              <p className="px-7 py-7" style={{ color: LMS_TOKENS.muted }}>
                Loading submissions…
              </p>
            ) : rows.length === 0 ? (
              <p className="px-7 py-7" style={{ color: LMS_TOKENS.muted }}>
                Nobody has handed anything in yet.
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
                          {row.learner?.name ?? "Learner"}
                        </span>
                        <span className="text-[13px]" style={{ color: LMS_TOKENS.muted }}>
                          {row.status === "submitted" ? "Needs marking" : `Marked · ${row.score ?? 0}/${points}`}
                          {row.is_late ? " · late" : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </LmsPanel>
        </div>

        <div className="xl:col-span-2">
          {!selected ? (
            <LmsPanel>
              <p style={{ color: LMS_TOKENS.muted }}>Pick a submission to mark.</p>
            </LmsPanel>
          ) : (
            <LmsPanel
              title={selected.learner?.name ?? "Learner"}
              action={
                <span className="text-[14px]" style={{ color: LMS_TOKENS.muted }}>
                  {formatDate(selected.submitted_at) ?? "Not submitted"}
                  {selected.is_late ? " · late" : ""}
                </span>
              }
            >
              <p className="whitespace-pre-wrap text-[16px] leading-relaxed" style={{ color: LMS_TOKENS.navy }}>
                {selected.content || "No written answer."}
              </p>

              {selected.attachments?.length ? (
                <ul className="mt-6 flex flex-col gap-2">
                  {selected.attachments.map((file, index) => (
                    <li key={`${file.url}-${index}`}>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-[15px] underline"
                        style={{ color: LMS_TOKENS.purple }}
                      >
                        <Paperclip className="size-4" />
                        {file.name}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div
                className="mt-8 grid gap-4 border-t pt-7 sm:grid-cols-[8rem_1fr]"
                style={{ borderColor: LMS_TOKENS.border }}
              >
                <div>
                  <Label htmlFor="assignment-score">Score</Label>
                  <Input
                    id="assignment-score"
                    type="number"
                    min={0}
                    max={points}
                    step="0.5"
                    className="mt-2"
                    disabled={!canGrade}
                    value={score}
                    onChange={(event) => setScore(event.target.value)}
                  />
                  <p className="mt-1.5 text-[13px]" style={{ color: LMS_TOKENS.muted }}>
                    out of {points}
                  </p>
                </div>
                <div>
                  <Label htmlFor="assignment-feedback">Feedback</Label>
                  <Textarea
                    id="assignment-feedback"
                    rows={4}
                    className="mt-2"
                    placeholder="Shown to the learner with their mark."
                    disabled={!canGrade}
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                  />
                </div>
              </div>

              {canGrade ? (
                <Button
                  className="mt-7"
                  disabled={grade.isPending || score.trim() === ""}
                  onClick={() => grade.mutate(selected.id)}
                  style={{ backgroundColor: LMS_TOKENS.purple }}
                >
                  {grade.isPending ? "Saving…" : "Save mark"}
                </Button>
              ) : (
                <p className="mt-7 text-[14px]" style={{ color: LMS_TOKENS.muted }}>
                  You can read this submission but not mark it.
                </p>
              )}
            </LmsPanel>
          )}
        </div>
      </div>
    </LmsDashboardShell>
  );
}
