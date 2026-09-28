"use client";

import Link from "next/link";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, MessageSquareQuote, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { reviewApi, type LmsCourseReview, type LmsReviewStatus } from "@/modules/Lms/api/reviews";
import { StarRow } from "@/modules/Lms/components/course-reviews";
import { LMS_TOKENS, useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import {
  LmsDashboardShell,
  useLmsCopy,
  LmsPanel,
  LmsStatCard,
} from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";

type Filter = "all" | LmsReviewStatus;

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/**
 * Staff view of every review in the tenant, with the moderation controls.
 *
 * Hiding is deliberately reversible and never deletes: a review stays on record
 * and can be restored, it just drops out of the public list and the average.
 */
export default function LearnReviewsPage() {
  const { brandSettings, brandName } = useLmsPublicBrand();
  const lms = useLmsCopy();
  // Marking work and deciding what the public sees are different jobs: a
  // teaching assistant reads this screen, a teacher moderates on it.
  const { role, isStaff, canModerate } = useLmsRole();
  const queryClient = useQueryClient();

  const [filter, setFilter] = React.useState<Filter>("all");

  const reviews = useQuery({
    queryKey: ["lms", "reviews", "all"],
    queryFn: () => reviewApi.all(),
    enabled: isStaff,
  });

  const moderate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LmsReviewStatus }) =>
      reviewApi.moderate(id, status),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lms", "reviews"] });
      toast.success(variables.status === "hidden" ? "Review hidden." : "Review published.");
    },
    onError: (error: unknown) =>
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "The review could not be updated.",
      ),
  });

  const all: LmsCourseReview[] = reviews.data ?? [];
  const rows = filter === "all" ? all : all.filter((review) => review.status === filter);

  const published = all.filter((review) => review.status === "published");
  const average = published.length
    ? published.reduce((sum, review) => sum + review.rating, 0) / published.length
    : null;

  if (!isStaff) {
    return (
      <LmsDashboardShell
        role={role}
        brandSettings={brandSettings}
        brandName={brandName}
        title="Reviews"
        breadcrumbs={[{ label: lms("common.dashboard", "Dashboard"), href: "/learn" }, { label: lms("nav.reviews", "Reviews") }]}
      >
        <LmsPanel>
          <p style={{ color: LMS_TOKENS.muted }}>
            You do not have permission to moderate reviews. You can rate a course from its own page.
          </p>
          <Button asChild className="mt-5" variant="outline">
            <Link href="/learn/courses">Go to my courses</Link>
          </Button>
        </LmsPanel>
      </LmsDashboardShell>
    );
  }

  return (
    <LmsDashboardShell
      role={role}
      brandSettings={brandSettings}
      brandName={brandName}
      title={lms("page.reviews.title", "Reviews")}
      subtitle={
        canModerate
          ? lms("page.reviews.subtitle_moderator", "What learners are saying, and what shows publicly.")
          : lms("page.reviews.subtitle_marker", "What learners are saying about your courses.")
      }
      breadcrumbs={[{ label: lms("common.dashboard", "Dashboard"), href: "/learn" }, { label: lms("nav.reviews", "Reviews") }]}
      actions={
        <Select value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All reviews</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
        <LmsStatCard label="Reviews" value={all.length} icon={MessageSquareQuote} />
        <LmsStatCard
          label="Average rating"
          value={average === null ? "—" : average.toFixed(1)}
          icon={Star}
        />
        <LmsStatCard label="Hidden" value={all.length - published.length} icon={EyeOff} />
      </div>

      <LmsPanel title={lms("page.reviews.panel", "All reviews")} className="mt-7" bodyClassName="px-0 py-0">
        {reviews.isPending ? (
          <p className="px-7 py-7" style={{ color: LMS_TOKENS.muted }}>
            Loading reviews…
          </p>
        ) : rows.length === 0 ? (
          <div className="px-7 py-12 text-center">
            <MessageSquareQuote className="mx-auto size-8" style={{ color: LMS_TOKENS.muted }} />
            <p className="mt-4" style={{ color: LMS_TOKENS.muted }}>
              {all.length === 0
                ? "No reviews yet. They appear here once learners rate a course."
                : `No ${filter} reviews.`}
            </p>
          </div>
        ) : (
          <ul>
            {rows.map((review) => {
              const hidden = review.status === "hidden";
              return (
                <li
                  key={review.id}
                  className="flex flex-wrap items-start justify-between gap-4 border-b px-7 py-5 last:border-b-0"
                  style={{ borderColor: LMS_TOKENS.border, opacity: hidden ? 0.6 : 1 }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <StarRow value={review.rating} />
                      <span className="text-[15px] font-medium" style={{ color: LMS_TOKENS.navy }}>
                        {review.author.name}
                      </span>
                      {review.course ? (
                        <Link
                          href={`/learn/courses/${review.course.id}`}
                          className="text-[14px] hover:underline"
                          style={{ color: LMS_TOKENS.purple }}
                        >
                          {review.course.title}
                        </Link>
                      ) : null}
                      <span className="text-[13px]" style={{ color: LMS_TOKENS.muted }}>
                        {formatDate(review.created_at)}
                      </span>
                      {hidden ? (
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[12px] font-medium"
                          style={{ backgroundColor: "#FDECEC", color: "#DC2626" }}
                        >
                          Hidden
                        </span>
                      ) : null}
                    </div>

                    {review.title ? (
                      <p className="mt-2 text-[16px] font-medium" style={{ color: LMS_TOKENS.navy }}>
                        {review.title}
                      </p>
                    ) : null}
                    {review.body ? (
                      <p
                        className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed"
                        style={{ color: LMS_TOKENS.muted }}
                      >
                        {review.body}
                      </p>
                    ) : null}
                  </div>

                  {canModerate ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={moderate.isPending}
                      onClick={() =>
                        moderate.mutate({ id: review.id, status: hidden ? "published" : "hidden" })
                      }
                    >
                      {hidden ? (
                        <>
                          <Eye className="size-4" />
                          Publish
                        </>
                      ) : (
                        <>
                          <EyeOff className="size-4" />
                          Hide
                        </>
                      )}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </LmsPanel>
    </LmsDashboardShell>
  );
}
