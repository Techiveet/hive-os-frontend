"use client";

import { useEffect, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthHeaders, getBackendApiRoot } from "@/lib/runtime-context";
import {
  AssessmentAttemptReview,
  attemptDisplayScore,
  attemptSimilarityPercent,
  type AssessmentAttempt,
} from "./assessment-attempt-review";

type TenantUser = { id: number; name: string; email?: string };
type CommitteeMember = {
  id: number;
  user_id: number;
  role: string;
  weight: number;
};
type CandidateReviewRow = {
  id: number;
  reviewer_id: number;
  score: number;
  strengths?: string | null;
  concerns?: string | null;
  recommendation: string;
  updated_at?: string;
};

type Props = {
  postings: any[];
  applicants: any[];
  attempts: AssessmentAttempt[];
  api: (path: string, options?: RequestInit) => Promise<any>;
  refresh: () => Promise<void>;
  setStatus: (v: string) => void;
  setError: (v: string) => void;
};

const RECOMMENDATION_LABEL: Record<string, string> = {
  strong_yes: "Strong yes",
  yes: "Yes",
  hold: "Hold",
  no: "No",
};

export function CommitteeReviewPanel({
  postings,
  applicants,
  attempts,
  api,
  refresh,
  setStatus,
  setError,
}: Props) {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [memberRoles, setMemberRoles] = useState<Record<number, string>>({});
  const [memberWeights, setMemberWeights] = useState<Record<number, number>>({});
  const [savedMembers, setSavedMembers] = useState<CommitteeMember[]>([]);
  const [loadingCommittee, setLoadingCommittee] = useState(false);
  const [savingCommittee, setSavingCommittee] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [reviewApplicantId, setReviewApplicantId] = useState("");
  const [reviews, setReviews] = useState<CandidateReviewRow[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<AssessmentAttempt | null>(null);

  useEffect(() => {
    fetch(getBackendApiRoot() + "/directory/users", {
      headers: { Accept: "application/json", ...getAuthHeaders() },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Unable to load users.");
        return r.json();
      })
      .then((payload) => {
        const list = Array.isArray(payload) ? payload : payload.data || [];
        setUsers(
          list.map((u: any) => ({
            id: Number(u.id),
            name: u.name || u.full_name || "User " + u.id,
            email: u.email,
          })),
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load users."))
      .finally(() => setUsersLoading(false));
  }, [setError]);

  useEffect(() => {
    if (!selectedJobId) {
      setSavedMembers([]);
      setSelectedUserIds([]);
      setMemberRoles({});
      setMemberWeights({});
      return;
    }
    let cancelled = false;
    setLoadingCommittee(true);
    api("/job-postings/" + selectedJobId + "/committee")
      .then((payload) => {
        if (cancelled) return;
        const members: CommitteeMember[] = payload.data || [];
        setSavedMembers(members);
        setSelectedUserIds(members.map((m) => m.user_id));
        setMemberRoles(
          Object.fromEntries(members.map((m) => [m.user_id, m.role || "assessor"])),
        );
        setMemberWeights(
          Object.fromEntries(members.map((m) => [m.user_id, Number(m.weight ?? 1)])),
        );
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unable to load committee.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCommittee(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedJobId, api, setError]);

  useEffect(() => {
    if (!reviewApplicantId) {
      setReviews([]);
      return;
    }
    let cancelled = false;
    setLoadingReviews(true);
    api("/applicants/" + reviewApplicantId + "/reviews")
      .then((payload) => {
        if (!cancelled) setReviews(payload.data || []);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unable to load reviews.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingReviews(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reviewApplicantId, api, setError]);

  useEffect(() => {
    setSelectedAttempt((current) => {
      if (!current) return null;
      return attempts.find((row) => row.id === current.id) || null;
    });
  }, [attempts]);

  function toggleUser(id: number) {
    setSelectedUserIds((current) => {
      if (current.includes(id)) {
        setMemberRoles((roles) => {
          const next = { ...roles };
          delete next[id];
          return next;
        });
        setMemberWeights((weights) => {
          const next = { ...weights };
          delete next[id];
          return next;
        });
        return current.filter((x) => x !== id);
      }
      setMemberRoles((roles) => ({
        ...roles,
        [id]: current.length === 0 ? "chair" : "assessor",
      }));
      setMemberWeights((weights) => ({ ...weights, [id]: 1 }));
      return [...current, id];
    });
  }

  async function committee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (savingCommittee || !selectedJobId) return;
    if (selectedUserIds.length === 0) {
      setError("Select at least one committee member.");
      return;
    }
    const members = selectedUserIds.map((user_id) => ({
      user_id,
      role: memberRoles[user_id] || "assessor",
      weight: Number(memberWeights[user_id] ?? 1),
    }));
    setSavingCommittee(true);
    try {
      const payload = await api("/job-postings/" + selectedJobId + "/committee", {
        method: "PUT",
        body: JSON.stringify({ members }),
      });
      setSavedMembers(payload.data || []);
      setStatus("Recruitment committee saved.");
    } catch (x) {
      setError(x instanceof Error ? x.message : "Committee was not saved.");
    } finally {
      setSavingCommittee(false);
    }
  }

  async function review(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (savingReview) return;
    const form = e.currentTarget;
    const v = Object.fromEntries(new FormData(form));
    setSavingReview(true);
    try {
      await api("/applicants/" + v.applicant_id + "/review", {
        method: "PUT",
        body: JSON.stringify({
          score: Number(v.score),
          strengths: v.strengths,
          concerns: v.concerns,
          recommendation: v.recommendation,
        }),
      });
      setStatus("Your candidate review was saved.");
      form.reset();
      setReviewApplicantId(String(v.applicant_id));
      const payload = await api("/applicants/" + v.applicant_id + "/reviews");
      setReviews(payload.data || []);
      await refresh();
    } catch (x) {
      setError(x instanceof Error ? x.message : "Review was not saved.");
    } finally {
      setSavingReview(false);
    }
  }

  function userName(id: number) {
    return users.find((u) => u.id === id)?.name || "User " + id;
  }

  const gradeable = attempts.filter(
    (a) => a.status === "submitted" || a.status === "graded",
  );

  const busy =
    "disabled:bg-slate-300 disabled:text-slate-600 disabled:opacity-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-300";

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-6">
        <form onSubmit={committee} className="space-y-4 rounded-2xl border bg-card p-6">
          <h2 className="text-xl font-black">Recruitment committee</h2>
          <p className="text-sm text-muted-foreground">
            Who can leave panel notes on candidates for this vacancy. Role labels are for your
            roster only — they do not change permissions or scoring yet. Weight is stored for
            future use and is not applied to averages.
          </p>
          <div>
            <Label htmlFor="committee-job">Vacancy</Label>
            <select
              id="committee-job"
              name="job_posting_id"
              required
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="min-h-11 w-full rounded-md border bg-background px-3"
            >
              <option value="">Choose vacancy…</option>
              {postings.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {loadingCommittee && selectedJobId && (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              Loading saved committee…
            </p>
          )}

          {savedMembers.length > 0 && (
            <div className="rounded-lg border bg-muted/20 p-3 text-sm">
              <p className="font-semibold">Currently saved</p>
              <ul className="mt-2 space-y-1">
                {savedMembers.map((m) => (
                  <li key={m.id} className="flex justify-between gap-2">
                    <span>{userName(m.user_id)}</span>
                    <span className="text-muted-foreground capitalize">
                      {m.role} · weight {m.weight}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Committee members</legend>
            {usersLoading ? (
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                Loading users…
              </p>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tenant users found.</p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border p-3">
                {users.map((user) => {
                  const checked = selectedUserIds.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      className="rounded-md border border-transparent px-2 py-2 hover:bg-muted/60"
                    >
                      <label className="flex min-h-11 cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleUser(user.id)}
                          className="h-4 w-4"
                        />
                        <span className="flex-1">
                          <span className="font-medium">{user.name}</span>
                          {user.email && (
                            <span className="ml-2 text-xs text-muted-foreground">{user.email}</span>
                          )}
                        </span>
                      </label>
                      {checked && (
                        <div className="ml-7 mt-2 grid gap-2 sm:grid-cols-2">
                          <div>
                            <Label htmlFor={"role-" + user.id}>Role label</Label>
                            <select
                              id={"role-" + user.id}
                              className="min-h-10 w-full rounded-md border bg-background px-2 text-sm"
                              value={memberRoles[user.id] || "assessor"}
                              onChange={(e) =>
                                setMemberRoles((roles) => ({
                                  ...roles,
                                  [user.id]: e.target.value,
                                }))
                              }
                            >
                              <option value="chair">Chair</option>
                              <option value="assessor">Assessor</option>
                              <option value="observer">Observer</option>
                            </select>
                          </div>
                          <div>
                            <Label htmlFor={"weight-" + user.id}>Weight (unused)</Label>
                            <Input
                              id={"weight-" + user.id}
                              type="number"
                              min={0}
                              max={10}
                              step={0.1}
                              value={memberWeights[user.id] ?? 1}
                              onChange={(e) =>
                                setMemberWeights((weights) => ({
                                  ...weights,
                                  [user.id]: Number(e.target.value),
                                }))
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </fieldset>
          <Button
            type="submit"
            disabled={savingCommittee || usersLoading || !selectedJobId}
            className={busy}
          >
            {savingCommittee ? (
              <>
                <Loader2 aria-hidden className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save committee"
            )}
          </Button>
        </form>

        <form onSubmit={review} className="space-y-4 rounded-2xl border bg-card p-6">
          <h2 className="text-xl font-black">Committee candidate review</h2>
          <p className="text-sm text-muted-foreground">
            Structured panel notes (score + recommendation). These stay on the hiring record and
            show on the pipeline — they do not advance or hire the candidate by themselves.
          </p>
          <div>
            <Label htmlFor="review-applicant">Candidate</Label>
            <select
              id="review-applicant"
              name="applicant_id"
              required
              value={reviewApplicantId}
              onChange={(e) => setReviewApplicantId(e.target.value)}
              className="min-h-11 w-full rounded-md border bg-background px-3"
            >
              <option value="">Choose candidate…</option>
              {applicants.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.candidate_name} — {a.job_posting?.title}
                </option>
              ))}
            </select>
          </div>

          {loadingReviews && (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              Loading existing reviews…
            </p>
          )}

          {reviews.length > 0 && (
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <p className="text-sm font-semibold">Saved reviews</p>
              {reviews.map((row) => (
                <article key={row.id} className="rounded-md border bg-card p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium">{userName(row.reviewer_id)}</span>
                    <span>
                      Score {row.score} ·{" "}
                      {RECOMMENDATION_LABEL[row.recommendation] || row.recommendation}
                    </span>
                  </div>
                  {row.strengths && (
                    <p className="mt-2 text-muted-foreground">
                      <span className="font-semibold text-foreground">Strengths:</span>{" "}
                      {row.strengths}
                    </p>
                  )}
                  {row.concerns && (
                    <p className="mt-1 text-muted-foreground">
                      <span className="font-semibold text-foreground">Concerns:</span>{" "}
                      {row.concerns}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="review-score">Score out of 100</Label>
              <Input id="review-score" name="score" type="number" min={0} max={100} step={1} required />
            </div>
            <div>
              <Label htmlFor="review-recommendation">Recommendation</Label>
              <select
                id="review-recommendation"
                name="recommendation"
                required
                className="min-h-11 w-full rounded-md border bg-background px-3"
              >
                <option value="strong_yes">Strong yes</option>
                <option value="yes">Yes</option>
                <option value="hold">Hold</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="review-strengths">Strengths</Label>
            <textarea
              id="review-strengths"
              name="strengths"
              rows={3}
              className="w-full rounded-md border bg-background p-3"
            />
          </div>
          <div>
            <Label htmlFor="review-concerns">Concerns</Label>
            <textarea
              id="review-concerns"
              name="concerns"
              rows={3}
              className="w-full rounded-md border bg-background p-3"
            />
          </div>
          <Button type="submit" disabled={savingReview} className={busy}>
            {savingReview ? (
              <>
                <Loader2 aria-hidden className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save my review"
            )}
          </Button>
        </form>
      </div>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-black">Assessment grading queue</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Open an attempt to grade answers and inspect integrity events / similarity (same reviewer as
          Results &amp; integrity).
        </p>
        <div className="mt-5 space-y-3">
          {gradeable.length === 0 && (
            <p className="text-sm text-muted-foreground">No submitted assessments to grade yet.</p>
          )}
          {gradeable.map((attempt) => {
            const similarity = attemptSimilarityPercent(attempt);
            return (
              <article
                key={attempt.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <div>
                  <p className="font-bold">{attempt.invitation.applicant.candidate_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {attempt.invitation.assessment.title} · {attemptDisplayScore(attempt)} ·{" "}
                    similarity {similarity}%
                  </p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {attempt.status.replaceAll("_", " ")} · risk {attempt.integrity_risk}/100 ·{" "}
                    {attempt.integrity_status.replaceAll("_", " ")}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedAttempt(attempt)}>
                  <Eye aria-hidden className="mr-1.5 h-3.5 w-3.5" />
                  Review &amp; grade
                </Button>
              </article>
            );
          })}
        </div>
      </section>

      <AssessmentAttemptReview
        attempt={selectedAttempt}
        open={Boolean(selectedAttempt)}
        onOpenChange={(open) => !open && setSelectedAttempt(null)}
        api={api}
        refresh={async () => {
          await refresh();
        }}
        onStatus={setStatus}
        onError={setError}
      />
    </div>
  );
}
