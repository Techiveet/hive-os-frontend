"use client";

import Link from "next/link";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  announcementApi,
  type LmsAnnouncement,
  type LmsAnnouncementAudience,
  type LmsAnnouncementPayload,
  type LmsAnnouncementVariant,
} from "@/modules/Lms/api/announcements";
import { LMS_TOKENS, useLmsPublicBrand } from "@/modules/Lms/components/lms-site";
import {
  LmsDashboardShell,
  LmsPanel,
  LmsStatCard,
  useLmsCopy,
} from "@/modules/Lms/components/lms-dashboard-shell";
import { useLmsRole } from "@/modules/Lms/hooks/use-lms-role";

/*
 * The English here is the fallback passed to t(), not the label itself — every
 * one of these has a row under lms.admin.announcements.* so the screen reads in
 * the reader's language. The swatches stay literal because the bar is painted
 * in these colours on both a light and a dark header.
 */
const VARIANTS: { value: LmsAnnouncementVariant; en: string; swatch: string }[] = [
  { value: "promo", en: "Promotion", swatch: "#6440FB" },
  { value: "info", en: "Information", swatch: "#2B1C55" },
  { value: "success", en: "Good news", swatch: "#04D697" },
  { value: "warning", en: "Attention", swatch: "#E59819" },
];

const AUDIENCES: { value: LmsAnnouncementAudience; en: string; enHint: string }[] = [
  { value: "everyone", en: "Everyone", enHint: "The course site and inside the dashboard." },
  { value: "public", en: "Visitors", enHint: "The course site only, before anyone signs in." },
  {
    value: "learners",
    en: "Learners",
    enHint: "Inside the dashboard only, for people already on a course.",
  },
];

const STATUS_STYLES: Record<string, { en: string; bg: string; color: string }> = {
  live: { en: "Live", bg: "#E6FBF3", color: "#04785A" },
  scheduled: { en: "Scheduled", bg: "#EBEAFE", color: "#4B2FD1" },
  ended: { en: "Ended", bg: "#F1F1F4", color: "#5A5A6E" },
  off: { en: "Off", bg: "#FDECEC", color: "#DC2626" },
};

type Draft = {
  message: string;
  link_url: string;
  link_label: string;
  variant: LmsAnnouncementVariant;
  audience: LmsAnnouncementAudience;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  is_dismissible: boolean;
  sort_order: number;
};

const BLANK: Draft = {
  message: "",
  link_url: "",
  link_label: "",
  variant: "promo",
  audience: "everyone",
  starts_at: "",
  ends_at: "",
  is_active: true,
  is_dismissible: true,
  sort_order: 0,
};

/** datetime-local wants "YYYY-MM-DDTHH:mm"; the API sends ISO with a zone. */
const toLocalInput = (value?: string | null) => (value ? value.slice(0, 16) : "");

function toDraft(announcement: LmsAnnouncement): Draft {
  return {
    message: announcement.message,
    link_url: announcement.link_url ?? "",
    link_label: announcement.link_label ?? "",
    variant: announcement.variant,
    audience: announcement.audience,
    starts_at: toLocalInput(announcement.starts_at),
    ends_at: toLocalInput(announcement.ends_at),
    is_active: announcement.is_active,
    is_dismissible: announcement.is_dismissible,
    sort_order: announcement.sort_order,
  };
}

function toPayload(draft: Draft): LmsAnnouncementPayload {
  return {
    message: draft.message.trim(),
    link_url: draft.link_url.trim() || null,
    link_label: draft.link_label.trim() || null,
    variant: draft.variant,
    audience: draft.audience,
    starts_at: draft.starts_at || null,
    ends_at: draft.ends_at || null,
    is_active: draft.is_active,
    is_dismissible: draft.is_dismissible,
    sort_order: Number(draft.sort_order) || 0,
  };
}

function apiMessage(error: unknown, fallback: string) {
  const response = (error as { response?: { data?: { message?: string } } })?.response?.data;
  return response?.message ?? fallback;
}

/**
 * The screen that writes the strip above the navigation.
 *
 * The preview at the top is the point: an announcement is one line of copy in a
 * coloured bar, and the only way to know whether it reads well is to see it at
 * the size it will actually be.
 */
export default function AnnouncementsPage() {
  const { brandSettings, brandName } = useLmsPublicBrand();
  const lms = useLmsCopy();
  const { role, isStaff, canAuthor } = useLmsRole();
  const queryClient = useQueryClient();

  const [draft, setDraft] = React.useState<Draft>(BLANK);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const announcements = useQuery({
    queryKey: ["lms", "announcements", "all"],
    queryFn: () => announcementApi.list(),
    enabled: isStaff,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["lms", "announcements"] });
    setDraft(BLANK);
    setEditingId(null);
  };

  const save = useMutation({
    mutationFn: () =>
      editingId
        ? announcementApi.update(editingId, toPayload(draft))
        : announcementApi.create(toPayload(draft)),
    onSuccess: () => {
      toast.success(
        editingId
          ? lms("admin.announcements.toast.updated", "Announcement updated.")
          : lms("admin.announcements.toast.created", "Announcement published."),
      );
      invalidate();
    },
    onError: (error) =>
      toast.error(
        apiMessage(
          error,
          lms("admin.announcements.toast.save_failed", "The announcement could not be saved."),
        ),
      ),
  });

  const remove = useMutation({
    mutationFn: (id: string) => announcementApi.remove(id),
    onSuccess: () => {
      toast.success(lms("admin.announcements.toast.removed", "Announcement removed."));
      invalidate();
    },
    onError: (error) =>
      toast.error(
        apiMessage(
          error,
          lms("admin.announcements.toast.remove_failed", "The announcement could not be removed."),
        ),
      ),
  });

  const rows = announcements.data ?? [];
  const liveCount = rows.filter((row) => row.status === "live").length;
  const scheduledCount = rows.filter((row) => row.status === "scheduled").length;
  const variant = VARIANTS.find((entry) => entry.value === draft.variant) ?? VARIANTS[0];

  const title = lms("admin.announcements.title", "Announcements");
  const optional = lms("admin.announcements.optional", "(optional)");
  const learnMore = lms("admin.announcements.learn_more", "Learn more");

  const breadcrumbs = [
    { label: lms("common.dashboard", "Dashboard"), href: "/learn" },
    { label: title },
  ];

  if (!isStaff || !canAuthor) {
    return (
      <LmsDashboardShell
        role={role}
        brandSettings={brandSettings}
        brandName={brandName}
        title={title}
        breadcrumbs={breadcrumbs}
      >
        <LmsPanel>
          <p style={{ color: LMS_TOKENS.muted }}>
            {lms(
              "admin.announcements.no_permission",
              "You do not have permission to write announcements.",
            )}
          </p>
          <Button asChild className="mt-5" variant="outline">
            <Link href="/learn">{lms("admin.announcements.back", "Back to dashboard")}</Link>
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
      title={title}
      subtitle={lms(
        "admin.announcements.subtitle",
        "The strip above the navigation, on the course site and inside the dashboard.",
      )}
      breadcrumbs={breadcrumbs}
    >
      <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
        <LmsStatCard
          label={lms("admin.announcements.stat_total", "Announcements")}
          value={rows.length}
          icon={Megaphone}
        />
        <LmsStatCard
          label={lms("admin.announcements.stat_live", "Showing now")}
          value={liveCount}
          icon={Megaphone}
        />
        <LmsStatCard
          label={lms("admin.announcements.stat_scheduled", "Scheduled")}
          value={scheduledCount}
          icon={Megaphone}
        />
      </div>

      <div className="mt-7 grid gap-7 xl:grid-cols-[1.15fr_0.85fr]">
        {/* ------------------------------- the list ------------------------------ */}
        <LmsPanel
          title={lms("admin.announcements.list_title", "All announcements")}
          bodyClassName="px-0 py-0"
        >
          {announcements.isPending ? (
            <p className="px-7 py-7" style={{ color: LMS_TOKENS.muted }}>
              {lms("admin.announcements.loading", "Loading announcements…")}
            </p>
          ) : rows.length === 0 ? (
            <div className="px-7 py-12 text-center">
              <Megaphone className="mx-auto size-8" style={{ color: LMS_TOKENS.muted }} />
              <p className="mt-4" style={{ color: LMS_TOKENS.muted }}>
                {lms(
                  "admin.announcements.empty",
                  "Nothing announced yet. Write one on the right and it appears above the navigation.",
                )}
              </p>
            </div>
          ) : (
            <ul>
              {rows.map((row) => {
                const status = STATUS_STYLES[row.status ?? "off"] ?? STATUS_STYLES.off;
                const audience = AUDIENCES.find((entry) => entry.value === row.audience);

                return (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-start justify-between gap-4 border-b px-7 py-5 last:border-b-0"
                    style={{ borderColor: LMS_TOKENS.border }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              VARIANTS.find((entry) => entry.value === row.variant)?.swatch ??
                              "#6440FB",
                          }}
                        />
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[12px] font-medium"
                          style={{ backgroundColor: status.bg, color: status.color }}
                        >
                          {lms(
                            `admin.announcements.status.${row.status ?? "off"}`,
                            status.en,
                          )}
                        </span>
                        <span className="text-[13px]" style={{ color: LMS_TOKENS.muted }}>
                          {audience
                            ? lms(
                                `admin.announcements.audience_option.${audience.value}`,
                                audience.en,
                              )
                            : null}
                        </span>
                      </div>

                      <p
                        className="mt-2 text-[15px] leading-relaxed"
                        style={{ color: LMS_TOKENS.navy }}
                      >
                        {row.message}
                      </p>

                      {row.link_url ? (
                        <p className="mt-1 text-[13px]" style={{ color: LMS_TOKENS.purple }}>
                          {row.link_label || learnMore} → {row.link_url}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDraft(toDraft(row));
                          setEditingId(row.id);
                        }}
                      >
                        <Pencil className="size-4" />
                        {lms("admin.announcements.edit", "Edit")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={lms(
                          "admin.announcements.remove",
                          `Remove announcement: ${row.message}`,
                          { message: row.message },
                        )}
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(row.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </LmsPanel>

        {/* ------------------------------ the writer ----------------------------- */}
        <LmsPanel
          title={
            editingId
              ? lms("admin.announcements.form_edit", "Edit announcement")
              : lms("admin.announcements.form_new", "Write an announcement")
          }
        >
          {/* Exactly what the bar will look like, at the size it will be. */}
          <div
            className="flex items-center justify-center rounded-xl px-4 py-2.5 text-center"
            style={{
              backgroundColor: variant.swatch,
              color: draft.variant === "success" || draft.variant === "warning" ? "#1A1A1A" : "#FFFFFF",
            }}
          >
            <p className="text-xs font-medium">
              {draft.message.trim() ||
                lms("admin.announcements.preview_placeholder", "Your announcement appears here.")}
              {draft.link_url.trim() ? (
                <span className="ml-2 font-bold underline underline-offset-4">
                  {draft.link_label.trim() || learnMore} →
                </span>
              ) : null}
            </p>
          </div>

          <form
            className="mt-6 flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <div>
              <Label htmlFor="announcement-message">
                {lms("admin.announcements.message", "Message")}
              </Label>
              <Textarea
                id="announcement-message"
                rows={3}
                maxLength={500}
                className="mt-2"
                placeholder={lms(
                  "admin.announcements.message_placeholder",
                  "Enrolment for the autumn cohort closes on Friday.",
                )}
                value={draft.message}
                onChange={(event) => setDraft({ ...draft, message: event.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="announcement-link">
                  {lms("admin.announcements.link", "Link")}{" "}
                  <span style={{ color: LMS_TOKENS.muted }}>{optional}</span>
                </Label>
                <Input
                  id="announcement-link"
                  className="mt-2"
                  placeholder={lms("admin.announcements.link_placeholder", "/courses")}
                  value={draft.link_url}
                  onChange={(event) => setDraft({ ...draft, link_url: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="announcement-link-label">
                  {lms("admin.announcements.link_label", "Link text")}
                </Label>
                <Input
                  id="announcement-link-label"
                  className="mt-2"
                  placeholder={lms("admin.announcements.link_label_placeholder", "Browse courses")}
                  value={draft.link_label}
                  onChange={(event) => setDraft({ ...draft, link_label: event.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="announcement-variant">
                  {lms("admin.announcements.colour", "Colour")}
                </Label>
                <Select
                  value={draft.variant}
                  onValueChange={(value) =>
                    setDraft({ ...draft, variant: value as LmsAnnouncementVariant })
                  }
                >
                  <SelectTrigger id="announcement-variant" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VARIANTS.map((entry) => (
                      <SelectItem key={entry.value} value={entry.value}>
                        {lms(`admin.announcements.variant.${entry.value}`, entry.en)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="announcement-audience">
                  {lms("admin.announcements.audience", "Who sees it")}
                </Label>
                <Select
                  value={draft.audience}
                  onValueChange={(value) =>
                    setDraft({ ...draft, audience: value as LmsAnnouncementAudience })
                  }
                >
                  <SelectTrigger id="announcement-audience" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map((entry) => (
                      <SelectItem key={entry.value} value={entry.value}>
                        {lms(`admin.announcements.audience_option.${entry.value}`, entry.en)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-[13px]" style={{ color: LMS_TOKENS.muted }}>
                  {lms(
                    `admin.announcements.audience_hint.${draft.audience}`,
                    AUDIENCES.find((entry) => entry.value === draft.audience)?.enHint ?? "",
                  )}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="announcement-start">
                  {lms("admin.announcements.starts", "Starts")}{" "}
                  <span style={{ color: LMS_TOKENS.muted }}>{optional}</span>
                </Label>
                <Input
                  id="announcement-start"
                  type="datetime-local"
                  className="mt-2"
                  value={draft.starts_at}
                  onChange={(event) => setDraft({ ...draft, starts_at: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="announcement-end">
                  {lms("admin.announcements.ends", "Ends")}{" "}
                  <span style={{ color: LMS_TOKENS.muted }}>{optional}</span>
                </Label>
                <Input
                  id="announcement-end"
                  type="datetime-local"
                  className="mt-2"
                  value={draft.ends_at}
                  onChange={(event) => setDraft({ ...draft, ends_at: event.target.value })}
                />
              </div>
            </div>
            <p className="-mt-2 text-[13px]" style={{ color: LMS_TOKENS.muted }}>
              {lms(
                "admin.announcements.schedule_hint",
                "Leave both blank to run it until you turn it off. Set a start to schedule it for later.",
              )}
            </p>

            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="announcement-active" className="font-normal">
                {lms("admin.announcements.active", "Switched on")}
              </Label>
              <Switch
                id="announcement-active"
                checked={draft.is_active}
                onCheckedChange={(checked) => setDraft({ ...draft, is_active: checked })}
              />
            </div>

            <div className="flex items-start justify-between gap-4">
              <Label htmlFor="announcement-dismissible" className="font-normal">
                {lms("admin.announcements.dismissible", "Readers can close it")}
                <span className="block text-[13px]" style={{ color: LMS_TOKENS.muted }}>
                  {lms(
                    "admin.announcements.dismissible_hint",
                    "Turn off for something nobody should be able to hide.",
                  )}
                </span>
              </Label>
              <Switch
                id="announcement-dismissible"
                checked={draft.is_dismissible}
                onCheckedChange={(checked) => setDraft({ ...draft, is_dismissible: checked })}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={save.isPending || !draft.message.trim()}
                style={{ backgroundColor: LMS_TOKENS.purple }}
              >
                {editingId ? <Pencil className="size-4" /> : <Plus className="size-4" />}
                {save.isPending
                  ? lms("admin.announcements.saving", "Saving…")
                  : editingId
                    ? lms("admin.announcements.save_changes", "Save changes")
                    : lms("admin.announcements.publish", "Publish announcement")}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDraft(BLANK);
                    setEditingId(null);
                  }}
                >
                  {lms("admin.announcements.cancel", "Cancel")}
                </Button>
              ) : null}
            </div>
          </form>
        </LmsPanel>
      </div>
    </LmsDashboardShell>
  );
}
