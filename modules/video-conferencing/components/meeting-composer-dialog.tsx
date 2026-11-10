"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Check, Globe2, Loader2, Search, ShieldCheck, UserPlus, Video, X } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { bootstrapConversationEncryption, ensureChatEncryptionIdentity } from "@/lib/chat-e2ee";
import { getErrorMessage } from "@/lib/errors";
import type { ChatEncryptionConfig } from "@/store/chat-store";
import { useChatStore } from "@/store/chat-store";
import {
  browserTimeZone,
  DURATION_OPTIONS,
  formatDuration,
  getTimeZones,
  initials,
  timeZoneLabel,
  utcToZonedWallTime,
  zonedWallTimeToUtc,
  type MeetingUser,
  type VideoMeeting,
} from "../lib/meeting-utils";

export type ComposerMode = "instant" | "scheduled" | "edit";

interface Props {
  open: boolean;
  mode: ComposerMode;
  meeting?: VideoMeeting | null;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful create/update. */
  onSaved: (result: { mode: ComposerMode; meeting: VideoMeeting }) => void;
}

type Errors = Partial<Record<"title" | "startsAt" | "timezone" | "agenda", string>>;

const MAX_INVITEES = 100;
const selectClass =
  "flex min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

const defaultStart = (zone: string) => {
  const value = new Date(Date.now() + 60 * 60 * 1000);
  value.setMinutes(Math.ceil(value.getMinutes() / 15) * 15, 0, 0);
  return utcToZonedWallTime(value, zone);
};

export function MeetingComposerDialog({ open, mode, meeting, onOpenChange, onSaved }: Props) {
  const appendConversation = useChatStore((state) => state.appendConversation);
  const setEncryptionConfig = useChatStore((state) => state.setEncryptionConfig);

  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [timezone, setTimezone] = useState(browserTimeZone);
  const [startsAt, setStartsAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [waitingRoom, setWaitingRoom] = useState(true);
  const [muteOnEntry, setMuteOnEntry] = useState(true);
  const [allowJoinBeforeHost, setAllowJoinBeforeHost] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<MeetingUser[]>([]);
  const [selected, setSelected] = useState<MeetingUser[]>([]);
  const titleRef = useRef<HTMLInputElement>(null);

  const isEdit = mode === "edit";
  const isInstant = mode === "instant";

  // Initialise the form every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSearch("");
    setResults([]);
    setSelected([]);
    setSaving(false);

    if (isEdit && meeting) {
      setTitle(meeting.title);
      setAgenda(meeting.agenda ?? "");
      setTimezone(meeting.timezone);
      setStartsAt(utcToZonedWallTime(meeting.starts_at, meeting.timezone));
      setDuration(String(meeting.duration_minutes));
      setWaitingRoom(meeting.waiting_room);
      setMuteOnEntry(meeting.mute_on_entry);
      setAllowJoinBeforeHost(meeting.allow_join_before_host);
    } else {
      const zone = browserTimeZone();
      setTitle(isInstant ? "Instant team meeting" : "");
      setAgenda("");
      setTimezone(zone);
      setStartsAt(defaultStart(zone));
      setDuration("60");
      setWaitingRoom(true);
      setMuteOnEntry(true);
      setAllowJoinBeforeHost(false);
    }
  }, [open, isEdit, isInstant, meeting]);

  // Invitee search (create only).
  useEffect(() => {
    const query = search.trim();
    if (!open || isEdit || query.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let alive = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await api.get("/video-meetings/users", { params: { q: query } });
        if (alive) setResults(response.data?.data ?? []);
      } catch (error) {
        if (alive) toast.error(getErrorMessage(error, "Could not search registered users"));
      } finally {
        if (alive) setSearching(false);
      }
    }, 300);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [open, isEdit, search]);

  const zones = useMemo(() => getTimeZones(meeting ? [meeting.timezone] : []), [meeting]);
  const minStart = useMemo(() => utcToZonedWallTime(new Date(), timezone), [timezone, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const startPreview = useMemo(() => {
    const instant = zonedWallTimeToUtc(startsAt, timezone);
    if (!instant || isInstant) return null;
    const local = new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(instant);
    return timezone === browserTimeZone() ? null : `That is ${local} in your time zone.`;
  }, [startsAt, timezone, isInstant]);

  const toggleUser = (user: MeetingUser) => {
    if (!user.chat_encryption_public_key) return;
    setSelected((current) => {
      if (current.some((item) => item.id === user.id)) return current.filter((item) => item.id !== user.id);
      if (current.length >= MAX_INVITEES) {
        toast.error(`You can invite up to ${MAX_INVITEES} people`);
        return current;
      }
      return [...current, user];
    });
  };

  const validate = (): Date | null => {
    const next: Errors = {};
    if (!title.trim()) next.title = "Enter a meeting title.";
    if (agenda.length > 5000) next.agenda = "The agenda is limited to 5,000 characters.";
    if (!timezone) next.timezone = "Choose a time zone.";

    let instant: Date | null = new Date();
    if (!isInstant) {
      instant = zonedWallTimeToUtc(startsAt, timezone);
      if (!instant || Number.isNaN(instant.getTime())) {
        next.startsAt = "Choose a valid date and time.";
      } else {
        const changed = !isEdit || !meeting || Math.abs(instant.getTime() - new Date(meeting.starts_at).getTime()) > 30_000;
        if (changed && instant.getTime() < Date.now() - 60_000) next.startsAt = "The start time must be in the future.";
      }
    }
    setErrors(next);
    if (next.title) titleRef.current?.focus();
    return Object.keys(next).length ? null : instant;
  };

  const save = async () => {
    const instant = validate();
    if (!instant) return;

    // The backend only honours "join before host" when the waiting room is off.
    const settings = {
      waiting_room: waitingRoom,
      mute_on_entry: muteOnEntry,
      allow_join_before_host: waitingRoom ? false : allowJoinBeforeHost,
    };

    setSaving(true);
    try {
      if (isEdit && meeting) {
        const response = await api.patch(`/video-meetings/${meeting.uuid}`, {
          title: title.trim(),
          agenda: agenda.trim() || null,
          starts_at: instant.toISOString(),
          duration_minutes: Number(duration),
          timezone,
          ...settings,
        });
        onSaved({ mode, meeting: response.data?.data as VideoMeeting });
        toast.success("Meeting updated");
        return;
      }

      const configResponse = await api.get("/chat/config");
      const encryption = configResponse.data?.encryption as ChatEncryptionConfig;
      if (!encryption?.enabled) throw new Error("End-to-end encryption is required for video meetings.");
      setEncryptionConfig(encryption);
      await ensureChatEncryptionIdentity(encryption);

      const response = await api.post("/video-meetings", {
        title: title.trim(),
        agenda: agenda.trim() || null,
        starts_at: instant.toISOString(),
        duration_minutes: Number(duration),
        timezone,
        user_ids: selected.map((user) => user.id),
        ...settings,
      });
      const created = response.data?.data as VideoMeeting;
      appendConversation(await bootstrapConversationEncryption(response.data?.conversation));
      onSaved({ mode, meeting: created });
      toast.success(isInstant ? "Encrypted meeting ready" : "Meeting scheduled");
    } catch (error) {
      toast.error(getErrorMessage(error, isEdit ? "Could not update the meeting" : "Could not create the meeting"));
    } finally {
      setSaving(false);
    }
  };

  const toggles = [
    {
      id: "meeting-waiting-room",
      label: "Waiting room",
      description: "Guests cannot get a call token until you start the meeting from Chat.",
      checked: waitingRoom,
      change: setWaitingRoom,
      disabled: false,
    },
    {
      id: "meeting-mute-on-entry",
      label: "Mute on entry",
      description: "Guests join with their microphone forced off (they can unmute later).",
      checked: muteOnEntry,
      change: setMuteOnEntry,
      disabled: false,
    },
    {
      id: "meeting-join-before-host",
      label: "Allow join before host",
      description: waitingRoom
        ? "Turn the waiting room off to let guests join before you."
        : "Guests can enter the call before you start it.",
      checked: waitingRoom ? false : allowJoinBeforeHost,
      change: setAllowJoinBeforeHost,
      disabled: waitingRoom,
    },
  ];

  const heading = isEdit ? "Edit meeting" : isInstant ? "Start an encrypted meeting" : "Schedule an encrypted meeting";

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="video-conferencing max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Changes apply to everyone invited. Only meetings that have not started can be edited."
              : `Invite up to ${MAX_INVITEES} registered users. Duration is enforced after the host starts. Invite links only work for people you invite.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="grid gap-2">
            <Label htmlFor="meeting-title">Meeting title</Label>
            <Input
              ref={titleRef}
              id="meeting-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setErrors((current) => ({ ...current, title: undefined }));
              }}
              maxLength={255}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "meeting-title-error" : undefined}
              autoFocus
            />
            {errors.title ? <p id="meeting-title-error" role="alert" className="text-sm font-medium text-destructive">{errors.title}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="meeting-agenda">
              Agenda <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="meeting-agenda"
              value={agenda}
              onChange={(event) => setAgenda(event.target.value)}
              rows={3}
              maxLength={5000}
              placeholder="Topics, decisions needed, links to share…"
            />
            <p className="text-right text-xs text-muted-foreground tabular-nums">{agenda.length}/5000</p>
            {errors.agenda ? <p role="alert" className="text-sm font-medium text-destructive">{errors.agenda}</p> : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {!isInstant ? (
              <div className="grid gap-2">
                <Label htmlFor="meeting-start">Date and time</Label>
                <Input
                  id="meeting-start"
                  type="datetime-local"
                  value={startsAt}
                  min={isEdit ? undefined : minStart}
                  onChange={(event) => {
                    setStartsAt(event.target.value);
                    setErrors((current) => ({ ...current, startsAt: undefined }));
                  }}
                  aria-invalid={Boolean(errors.startsAt)}
                  aria-describedby="meeting-start-help"
                />
                <p id="meeting-start-help" className="text-xs text-muted-foreground">
                  {errors.startsAt ? (
                    <span role="alert" className="font-medium text-destructive">{errors.startsAt}</span>
                  ) : (
                    startPreview ?? "Entered in the time zone selected on the right."
                  )}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="text-sm font-medium">Starts immediately</p>
                <p className="mt-1 text-xs text-muted-foreground">The room opens after secure keys are prepared.</p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="meeting-duration">Duration</Label>
              <select id="meeting-duration" value={duration} onChange={(event) => setDuration(event.target.value)} className={selectClass}>
                {DURATION_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>{formatDuration(minutes)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="meeting-timezone" className="gap-1.5">
              <Globe2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Time zone
            </Label>
            <select
              id="meeting-timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className={selectClass}
              aria-invalid={Boolean(errors.timezone)}
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>{timeZoneLabel(zone)}</option>
              ))}
            </select>
            {errors.timezone ? <p role="alert" className="text-sm font-medium text-destructive">{errors.timezone}</p> : null}
          </div>

          <fieldset className="grid gap-4 rounded-2xl border p-4">
            <legend className="px-1 text-sm font-medium">Host controls</legend>
            {toggles.map((option) => (
              <div key={option.id} className="flex items-start justify-between gap-4">
                <Label htmlFor={option.id} className={`flex-1 font-normal ${option.disabled ? "opacity-60" : "cursor-pointer"}`}>
                  <span className="block font-medium text-foreground">{option.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{option.description}</span>
                </Label>
                <Switch
                  id={option.id}
                  checked={option.checked}
                  disabled={option.disabled}
                  onCheckedChange={(checked) => option.change(checked)}
                  className="mt-0.5"
                />
              </div>
            ))}
          </fieldset>

          {isEdit && meeting ? (
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="text-sm font-medium">{meeting.participants.length} participants</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {meeting.participants.map((participant) => participant.name).join(", ")}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">The guest list can’t be changed while editing a meeting.</p>
            </div>
          ) : (
            <fieldset className="grid gap-3">
              <legend className="text-sm font-medium">
                Invite registered users{" "}
                <span className="font-normal text-muted-foreground">({selected.length} selected)</span>
              </legend>
              {selected.length > 0 ? (
                <div className="flex flex-wrap gap-2" aria-label="Selected invitees">
                  {selected.map((user) => (
                    <span key={user.id} className="inline-flex min-h-9 items-center gap-2 rounded-full border bg-muted/40 pl-3 pr-1 text-sm">
                      {user.name}
                      <button
                        type="button"
                        className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => toggleUser(user)}
                        aria-label={`Remove ${user.name}`}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name or email"
                  aria-label="Search registered users"
                  className="pl-9"
                />
                {searching ? <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
              </div>
              {search.trim().length > 0 && search.trim().length < 2 ? (
                <p className="text-xs text-muted-foreground">Enter at least two characters.</p>
              ) : null}
              {!searching && search.trim().length >= 2 && results.length === 0 ? (
                <p className="text-xs text-muted-foreground">No registered users found.</p>
              ) : null}
              {results.length > 0 ? (
                <div className="max-h-56 divide-y overflow-y-auto rounded-xl border" aria-live="polite">
                  {results.map((user) => {
                    const isSelected = selected.some((item) => item.id === user.id);
                    const secure = Boolean(user.chat_encryption_public_key);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        disabled={!secure}
                        onClick={() => toggleUser(user)}
                        className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-55"
                        aria-pressed={isSelected}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatar_url ?? undefined} alt="" />
                          <AvatarFallback>{initials(user.name)}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{user.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {secure ? user.email : "Open secure Chat or Mail once to enable invitations"}
                          </span>
                        </span>
                        {isSelected ? (
                          <Check className="h-4 w-4 text-[hsl(var(--primary-readable))]" aria-hidden="true" />
                        ) : (
                          <UserPlus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </fieldset>
          )}

          <div className="flex items-start gap-3 rounded-2xl border border-[hsl(var(--primary-readable))] bg-primary/5 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--primary-readable))]" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">End-to-end encryption is required</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Hive creates the shared key in this browser and wraps it separately for every invited user. The server stores wrapped keys and cannot decrypt the meeting.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" disabled={saving || !title.trim()} onClick={() => void save()} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : isInstant ? (
              <Video className="h-4 w-4" aria-hidden="true" />
            ) : (
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
            )}
            {isEdit ? "Save changes" : isInstant ? "Start meeting" : "Schedule meeting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
