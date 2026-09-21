"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { reviewApi, type LmsCourseReview } from "@/modules/Lms/api/reviews";
import { LMS_TOKENS } from "@/modules/Lms/components/lms-site";

/** Read-only star row. */
export function StarRow({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className="shrink-0"
          style={{
            width: size,
            height: size,
            color: LMS_TOKENS.starYellow,
            fill: star <= Math.round(value) ? "#E59819" : "transparent",
          }}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

/** The clickable star input used when writing a review. */
function StarPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [hover, setHover] = React.useState(0);
  const shown = hover || value;

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="p-0.5 transition hover:scale-110"
        >
          <Star
            className="size-7"
            style={{
              color: LMS_TOKENS.starYellow,
              fill: star <= shown ? "#E59819" : "transparent",
            }}
          />
        </button>
      ))}
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/**
 * Ratings and reviews for one course: the average with a star breakdown, the
 * published reviews, and — for a learner enrolled on the course — a form to
 * leave or update their own.
 */
export function CourseReviews({ courseId, className }: { courseId: string; className?: string }) {
  const queryClient = useQueryClient();

  const reviews = useQuery({
    queryKey: ["lms", "reviews", courseId],
    queryFn: () => reviewApi.forCourse(courseId),
    enabled: Boolean(courseId),
    retry: false,
  });

  const meta = reviews.data?.meta;
  const rows: LmsCourseReview[] = reviews.data?.data ?? [];

  const [rating, setRating] = React.useState(0);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const seeded = React.useRef(false);

  // Seed once from the caller's existing review, so editing starts from what
  // they wrote rather than a blank form.
  React.useEffect(() => {
    if (!meta || seeded.current) return;
    seeded.current = true;
    if (meta.mine) {
      setRating(meta.mine.rating);
      setTitle(meta.mine.title ?? "");
      setBody(meta.mine.body ?? "");
    }
  }, [meta]);

  const submit = useMutation({
    mutationFn: () =>
      reviewApi.submit(courseId, { rating, title: title.trim() || null, body: body.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms", "reviews", courseId] });
      queryClient.invalidateQueries({ queryKey: ["publicLmsCourse", courseId] });
      toast.success(meta?.mine ? "Review updated." : "Thanks for your review.");
    },
    onError: (error: unknown) =>
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Your review could not be saved.",
      ),
  });

  const remove = useMutation({
    mutationFn: (id: string) => reviewApi.remove(id),
    onSuccess: () => {
      seeded.current = false;
      setRating(0);
      setTitle("");
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["lms", "reviews", courseId] });
      toast.success("Review removed.");
    },
    onError: () => toast.error("The review could not be removed."),
  });

  // Nothing to show and nothing to write: stay out of the way entirely.
  if (reviews.isError || (!reviews.isPending && rows.length === 0 && !meta?.can_review)) {
    return null;
  }

  const average = meta?.average ?? 0;
  const count = meta?.count ?? 0;

  return (
    <section className={cn("", className)} aria-label="Reviews">
      <h2 className="text-2xl font-bold tracking-tight" style={{ color: LMS_TOKENS.navy }}>
        Ratings &amp; reviews
      </h2>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="shrink-0 text-center lg:w-48">
          <div className="text-5xl font-bold leading-none" style={{ color: LMS_TOKENS.navy }}>
            {count ? average.toFixed(1) : "—"}
          </div>
          <div className="mt-3 flex justify-center">
            <StarRow value={average} size={18} />
          </div>
          <div className="mt-2 text-[14px]" style={{ color: LMS_TOKENS.muted }}>
            {count} review{count === 1 ? "" : "s"}
          </div>
        </div>

        <ul className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const value = meta?.breakdown?.[String(star)] ?? 0;
            const percent = count ? (value / count) * 100 : 0;
            return (
              <li key={star} className="flex items-center gap-3 text-[14px]">
                <span className="w-10 shrink-0" style={{ color: LMS_TOKENS.muted }}>
                  {star} ★
                </span>
                <span
                  className="h-2 flex-1 overflow-hidden rounded-full"
                  style={{ backgroundColor: LMS_TOKENS.lavender }}
                >
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${percent}%`, backgroundColor: LMS_TOKENS.starYellow }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right" style={{ color: LMS_TOKENS.muted }}>
                  {value}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {meta?.can_review ? (
        <div
          className="mt-8 rounded-2xl border p-6"
          style={{ borderColor: LMS_TOKENS.border }}
        >
          <h3 className="text-[17px] font-medium" style={{ color: LMS_TOKENS.navy }}>
            {meta.mine ? "Update your review" : "Write a review"}
          </h3>

          <div className="mt-4">
            <Label className="mb-2 block">Your rating</Label>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          <div className="mt-5">
            <Label htmlFor="review-title">Headline (optional)</Label>
            <Input
              id="review-title"
              className="mt-2"
              placeholder="What stood out?"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="mt-4">
            <Label htmlFor="review-body">Your review (optional)</Label>
            <Textarea
              id="review-body"
              rows={4}
              className="mt-2"
              placeholder="What would you tell someone thinking of taking this course?"
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              disabled={rating < 1 || submit.isPending}
              onClick={() => submit.mutate()}
              style={{ backgroundColor: LMS_TOKENS.purple }}
            >
              {submit.isPending ? "Saving…" : meta.mine ? "Update review" : "Post review"}
            </Button>
            {meta.mine ? (
              <Button
                variant="ghost"
                disabled={remove.isPending}
                onClick={() => remove.mutate(meta.mine!.id)}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            ) : null}
            {rating < 1 ? (
              <span className="text-[13px]" style={{ color: LMS_TOKENS.muted }}>
                Pick a star rating to post.
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <ul className="mt-8 space-y-6">
          {rows.map((review) => (
            <li
              key={review.id}
              className="border-t pt-6 first:border-t-0 first:pt-0"
              style={{ borderColor: LMS_TOKENS.border }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[15px] font-medium" style={{ color: LMS_TOKENS.navy }}>
                  {review.author.name}
                </span>
                <span className="text-[13px]" style={{ color: LMS_TOKENS.muted }}>
                  {formatDate(review.created_at)}
                </span>
              </div>
              <div className="mt-2">
                <StarRow value={review.rating} />
              </div>
              {review.title ? (
                <p className="mt-3 text-[16px] font-medium" style={{ color: LMS_TOKENS.navy }}>
                  {review.title}
                </p>
              ) : null}
              {review.body ? (
                <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed" style={{ color: LMS_TOKENS.muted }}>
                  {review.body}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-[15px]" style={{ color: LMS_TOKENS.muted }}>
          No reviews yet.
        </p>
      )}
    </section>
  );
}
