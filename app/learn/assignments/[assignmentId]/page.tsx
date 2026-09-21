"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LmsResourceField } from "@/modules/Lms/components/lms-resource-field";
import {
  myAssignmentApi,
  type LmsAssignmentAttachment,
} from "@/modules/Lms/api/assignments";
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

export default function MyAssignmentPage() {
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = params.assignmentId;
  const queryClient = useQueryClient();
  const { brandSettings, brandName } = useLmsPublicBrand();
  const { role } = useLmsRole();

  const assignment = useQuery({
    queryKey: ["lms", "my-assignment", assignmentId],
    queryFn: () => myAssignmentApi.get(assignmentId),
    enabled: Boolean(assignmentId),
  });

  const data = assignment.data;
  const submission = data?.submission ?? null;
  const locked = submission?.status === "graded";

  const [content, setContent] = React.useState("");
  const [attachments, setAttachments] = React.useState<LmsAssignmentAttachment[]>([]);
  const [pendingUrl, setPendingUrl] = React.useState("");
  const [pendingName, setPendingName] = React.useState("");
  const seeded = React.useRef<string | null>(null);

  // Seed once per assignment, not on every refetch, so a background
  // revalidation cannot wipe what the learner is part-way through typing.
  React.useEffect(() => {
    if (!data || seeded.current === data.id) return;
    seeded.current = data.id;
    setContent(data.submission?.content ?? "");
    setAttachments(data.submission?.attachments ?? []);
  }, [data]);

  const save = useMutation({
    mutationFn: (submit: boolean) =>
      myAssignmentApi.save(assignmentId, {
        content: content.trim() || null,
        attachments: attachments.length ? attachments : null,
        submit,
      }),
    onSuccess: (result, submit) => {
      queryClient.setQueryData(["lms", "my-assignment", assignmentId], result);
      queryClient.invalidateQueries({ queryKey: ["lms", "my-assignments"] });
      toast.success(submit ? "Handed in." : "Draft saved.");
    },
    onError: (error: unknown) =>
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Your work could not be saved.",
      ),
  });

  const addAttachment = () => {
    const url = pendingUrl.trim();
    if (!url) return;
    setAttachments((current) => [
      ...current,
      { name: pendingName.trim() || url.split("/").pop() || "Attachment", url },
    ]);
    setPendingUrl("");
    setPendingName("");
  };

  const title = data?.title ?? "Assignment";

  return (
    <LmsDashboardShell
      role={role}
      brandSettings={brandSettings}
      brandName={brandName}
      title={title}
      subtitle={data?.course?.title}
      breadcrumbs={[
        { label: "Dashboard", href: "/learn" },
        { label: "Assignments", href: "/learn/assignments" },
        { label: title },
      ]}
    >
      {assignment.isPending ? (
        <LmsPanel>
          <p style={{ color: LMS_TOKENS.muted }}>Loading assignment…</p>
        </LmsPanel>
      ) : assignment.isError || !data ? (
        <LmsPanel>
          <p style={{ color: LMS_TOKENS.muted }}>
            This assignment could not be loaded. It may not be open to you.
          </p>
          <Button asChild className="mt-5" variant="outline">
            <Link href="/learn/assignments">Back to assignments</Link>
          </Button>
        </LmsPanel>
      ) : (
        <div className="grid gap-7 xl:grid-cols-3">
          <div className="flex flex-col gap-7 xl:col-span-2">
            {data.instructions ? (
              <LmsPanel title="Instructions">
                <p className="whitespace-pre-wrap text-[16px] leading-relaxed" style={{ color: LMS_TOKENS.muted }}>
                  {data.instructions}
                </p>
              </LmsPanel>
            ) : null}

            <LmsPanel title={locked ? "Your submission" : "Your work"}>
              {locked ? (
                <>
                  <p className="whitespace-pre-wrap text-[16px]" style={{ color: LMS_TOKENS.navy }}>
                    {submission?.content || "No written answer."}
                  </p>
                  <p className="mt-6 text-[14px]" style={{ color: LMS_TOKENS.muted }}>
                    Marked on {formatDate(submission?.graded_at)} — this can no longer be changed.
                  </p>
                </>
              ) : (
                <>
                  <Label htmlFor="assignment-content">Written answer</Label>
                  <Textarea
                    id="assignment-content"
                    rows={10}
                    className="mt-2"
                    placeholder="Type your answer, or attach a file below."
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                  />

                  <div className="mt-7">
                    <Label>Attachments</Label>
                    {attachments.length ? (
                      <ul className="mt-3 flex flex-col gap-2">
                        {attachments.map((file, index) => (
                          <li
                            key={`${file.url}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5"
                            style={{ borderColor: LMS_TOKENS.border }}
                          >
                            <span className="inline-flex min-w-0 items-center gap-2 text-[15px]" style={{ color: LMS_TOKENS.navy }}>
                              <Paperclip className="size-4 shrink-0" />
                              <span className="truncate">{file.name}</span>
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove ${file.name}`}
                              onClick={() =>
                                setAttachments((current) => current.filter((_, i) => i !== index))
                              }
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                      <div className="flex flex-col gap-3">
                        <LmsResourceField value={pendingUrl} onChange={setPendingUrl} />
                        <Input
                          placeholder="Display name (optional)"
                          aria-label="Attachment display name"
                          value={pendingName}
                          onChange={(event) => setPendingName(event.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="self-start"
                        disabled={!pendingUrl.trim()}
                        onClick={addAttachment}
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      disabled={save.isPending}
                      onClick={() => save.mutate(false)}
                    >
                      Save draft
                    </Button>
                    <Button
                      disabled={save.isPending || !data.accepts_submissions}
                      onClick={() => save.mutate(true)}
                      style={{ backgroundColor: LMS_TOKENS.purple }}
                    >
                      {save.isPending ? "Saving…" : submission?.status === "submitted" ? "Re-submit" : "Hand in"}
                    </Button>
                  </div>

                  {!data.accepts_submissions ? (
                    <p className="mt-4 text-[14px]" style={{ color: "#DC2626" }}>
                      The deadline has passed and late hand-ins are not accepted.
                    </p>
                  ) : null}
                </>
              )}
            </LmsPanel>
          </div>

          <div className="flex flex-col gap-7">
            <LmsPanel title="Status">
              <dl className="flex flex-col gap-4 text-[15px]">
                <div className="flex justify-between gap-4">
                  <dt style={{ color: LMS_TOKENS.muted }}>Points</dt>
                  <dd style={{ color: LMS_TOKENS.navy }}>{data.points}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt style={{ color: LMS_TOKENS.muted }}>Due</dt>
                  <dd style={{ color: data.is_overdue ? "#DC2626" : LMS_TOKENS.navy }}>
                    {formatDate(data.due_at) ?? "No deadline"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt style={{ color: LMS_TOKENS.muted }}>Submission</dt>
                  <dd style={{ color: LMS_TOKENS.navy }}>
                    {submission
                      ? submission.status === "graded"
                        ? "Marked"
                        : submission.status === "submitted"
                          ? "Handed in"
                          : "Draft"
                      : "Not started"}
                  </dd>
                </div>
                {submission?.submitted_at ? (
                  <div className="flex justify-between gap-4">
                    <dt style={{ color: LMS_TOKENS.muted }}>Handed in</dt>
                    <dd style={{ color: LMS_TOKENS.navy }}>{formatDate(submission.submitted_at)}</dd>
                  </div>
                ) : null}
              </dl>

              {data.due_at && !data.is_overdue ? (
                <p className="mt-6 inline-flex items-center gap-2 text-[14px]" style={{ color: LMS_TOKENS.muted }}>
                  <Clock3 className="size-4" />
                  Time remaining until the deadline
                </p>
              ) : null}
            </LmsPanel>

            {submission?.status === "graded" ? (
              <LmsPanel title="Result">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-7" style={{ color: LMS_TOKENS.greenDark }} />
                  <div className="text-[22px] font-bold" style={{ color: LMS_TOKENS.navy }}>
                    {submission.score ?? 0} / {data.points}
                    {submission.percent !== null && submission.percent !== undefined ? (
                      <span className="ml-2 text-[15px] font-normal" style={{ color: LMS_TOKENS.muted }}>
                        ({submission.percent}%)
                      </span>
                    ) : null}
                  </div>
                </div>
                {submission.feedback ? (
                  <p className="mt-5 whitespace-pre-wrap text-[15px]" style={{ color: LMS_TOKENS.muted }}>
                    {submission.feedback}
                  </p>
                ) : null}
              </LmsPanel>
            ) : null}
          </div>
        </div>
      )}
    </LmsDashboardShell>
  );
}
