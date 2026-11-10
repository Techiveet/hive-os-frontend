"use client";

import Link from "next/link";
import { AlignLeft, Clock3, Copy, Globe2, Hourglass, MicOff, Pencil, ShieldCheck, Video, XCircle } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  canGuestJoinBeforeHost,
  formatDuration,
  formatInZone,
  getDisplayState,
  initials,
  relativeStart,
  browserTimeZone,
  STATE_LABEL,
  type MeetingDisplayState,
  type VideoMeeting,
} from "../lib/meeting-utils";

const stateBadgeClass: Partial<Record<MeetingDisplayState, string>> = {
  live: "bg-emerald-600 text-white hover:bg-emerald-600",
  ready: "bg-primary text-primary-foreground",
  soon: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  missed: "bg-destructive/10 text-destructive",
};

interface Props {
  meeting: VideoMeeting;
  now: number;
  onEdit: (meeting: VideoMeeting) => void;
  onCancel: (meeting: VideoMeeting) => void;
  onCopy: (meeting: VideoMeeting) => void;
}

export function MeetingCard({ meeting, now, onEdit, onCancel, onCopy }: Props) {
  const state = getDisplayState(meeting, now);
  const relative = relativeStart(meeting, now);
  const showLocalTime = meeting.timezone !== browserTimeZone();
  const editable = meeting.is_host && meeting.status === "scheduled";
  const cancellable = meeting.is_host && (meeting.status === "scheduled" || meeting.status === "live");
  const guestMissed = !meeting.is_host && state === "missed";
  const guestMustWait =
    !meeting.is_host &&
    !guestMissed &&
    meeting.status === "scheduled" &&
    !canGuestJoinBeforeHost(meeting);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="truncate text-lg">{meeting.title}</CardTitle>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{formatInZone(meeting.starts_at, meeting.timezone)} · {formatDuration(meeting.duration_minutes)}</span>
            </p>
            <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Globe2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {meeting.timezone.replace(/_/g, " ")}
              {showLocalTime ? <span>· {formatInZone(meeting.starts_at, browserTimeZone(), { timeStyle: "short" })} your time</span> : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge variant="secondary" className={stateBadgeClass[state]}>{STATE_LABEL[state]}</Badge>
            {relative && state !== "missed" ? <span className="text-xs text-muted-foreground">{relative}</span> : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        {meeting.agenda ? (
          <p className="flex gap-2 text-sm leading-6 text-muted-foreground">
            <AlignLeft className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="line-clamp-3 whitespace-pre-line">{meeting.agenda}</span>
          </p>
        ) : null}

        {state === "missed" ? (
          <p role="status" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            The scheduled time passed and this meeting never started. {meeting.is_host ? "Start it now, edit the time, or cancel it." : "Ask the host to reschedule."}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="gap-1.5"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />E2EE</Badge>
          {meeting.waiting_room ? <Badge variant="outline" className="gap-1.5"><Hourglass className="h-3.5 w-3.5" aria-hidden="true" />Waiting room</Badge> : null}
          {meeting.mute_on_entry ? <Badge variant="outline" className="gap-1.5"><MicOff className="h-3.5 w-3.5" aria-hidden="true" />Mute on entry</Badge> : null}
          {canGuestJoinBeforeHost(meeting) ? <Badge variant="outline">Join before host</Badge> : null}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex -space-x-2" role="group" aria-label={`${meeting.participants.length} participants`}>
            {meeting.participants.slice(0, 5).map((participant) => (
              <Avatar key={participant.id} className="h-9 w-9 border-2 border-card" title={participant.name}>
                <AvatarImage src={participant.avatar_url ?? undefined} alt="" />
                <AvatarFallback>{initials(participant.name)}</AvatarFallback>
              </Avatar>
            ))}
            {meeting.participants.length > 5 ? (
              <span className="grid h-9 min-w-9 place-items-center rounded-full border-2 border-card bg-muted px-1 text-xs">
                +{meeting.participants.length - 5}
              </span>
            ) : null}
          </div>
          <span className="truncate text-xs text-muted-foreground">
            Host: {meeting.is_host ? "You" : meeting.host.name}
          </span>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          <Button type="button" size="sm" variant="outline" className="min-h-10 gap-2" onClick={() => onCopy(meeting)}>
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copy invite
          </Button>
          {editable ? (
            <Button type="button" size="sm" variant="outline" className="min-h-10 gap-2" onClick={() => onEdit(meeting)}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
          ) : null}
          {cancellable ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="min-h-10 gap-2 text-destructive hover:text-destructive"
              onClick={() => onCancel(meeting)}
            >
              <XCircle className="h-4 w-4" aria-hidden="true" />
              {meeting.status === "live" ? "End & cancel" : "Cancel"}
            </Button>
          ) : null}
          {guestMissed ? (
            <Button size="sm" className="min-h-10 gap-2" disabled>
              Meeting missed
            </Button>
          ) : guestMustWait ? (
            <Button size="sm" className="min-h-10 gap-2" disabled>
              <Hourglass className="h-4 w-4" aria-hidden="true" />
              Waiting for host
            </Button>
          ) : (
            <Button size="sm" className="min-h-10 gap-2" asChild>
              <Link href={meeting.join_href}>
                <Video className="h-4 w-4" aria-hidden="true" />
                {meeting.status === "live" ? "Join now" : meeting.is_host ? "Start" : "Join"}
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
