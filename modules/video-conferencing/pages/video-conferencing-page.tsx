"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Copy, History, Loader2, LockKeyhole, MessageSquare, Users, Video } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useChatStore } from "@/store/chat-store";
import { MeetingCard } from "../components/meeting-card";
import { MeetingComposerDialog, type ComposerMode } from "../components/meeting-composer-dialog";
import { formatDuration, formatInZone, type VideoMeeting } from "../lib/meeting-utils";

const REFRESH_MS = 60_000;
const TICK_MS = 30_000;

export function VideoConferencingPage() {
  const router = useRouter();
  const conversationSignal = useChatStore((state) =>
    state.conversations.map((conversation) => `${conversation.id}:${conversation.updated_at}`).join("|"),
  );

  const [upcoming, setUpcoming] = useState<VideoMeeting[]>([]);
  const [history, setHistory] = useState<VideoMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState("upcoming");

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>("scheduled");
  const [editing, setEditing] = useState<VideoMeeting | null>(null);

  const [cancelTarget, setCancelTarget] = useState<VideoMeeting | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [createdMeeting, setCreatedMeeting] = useState<VideoMeeting | null>(null);

  const loadMeetings = useCallback(async (options: { spinner?: boolean; silent?: boolean } = {}) => {
    if (options.spinner) setLoading(true);
    try {
      const [upcomingResponse, historyResponse] = await Promise.all([
        api.get("/video-meetings", { params: { scope: "upcoming" } }),
        api.get("/video-meetings", { params: { scope: "history" } }),
      ]);
      setUpcoming(upcomingResponse.data?.data ?? []);
      setHistory(historyResponse.data?.data ?? []);
      setLoadFailed(false);
      setNow(Date.now());
    } catch (error) {
      setLoadFailed(true);
      if (!options.silent) toast.error(getErrorMessage(error, "Could not load video meetings"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMeetings({ spinner: true });
  }, [loadMeetings]);

  // Deep-link from Chat: /dashboard/video-conferencing?compose=instant|scheduled
  useEffect(() => {
    const compose = new URLSearchParams(window.location.search).get("compose");
    if (compose !== "instant" && compose !== "scheduled") return;
    setComposerMode(compose);
    setEditing(null);
    setComposerOpen(true);
    router.replace("/dashboard/video-conferencing", { scroll: false });
  }, [router]);

  // New chat activity (e.g. an invite or a call ending) can change meeting state.
  useEffect(() => {
    if (conversationSignal) void loadMeetings({ silent: true });
  }, [conversationSignal, loadMeetings]);

  // Keep countdowns fresh and re-sync statuses (scheduled → live → ended).
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), TICK_MS);
    const refresh = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadMeetings({ silent: true });
    }, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadMeetings({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadMeetings]);

  const openComposer = (mode: ComposerMode, meeting: VideoMeeting | null = null) => {
    setComposerMode(mode);
    setEditing(meeting);
    setComposerOpen(true);
  };

  const inviteUrl = (meeting: VideoMeeting) =>
    new URL(meeting.join_href, window.location.origin).toString();

  const copyInvite = async (meeting: VideoMeeting) => {
    const url = inviteUrl(meeting);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied", {
        description: meeting.invite_note ?? "Only invited Hive users can join this encrypted meeting.",
      });
    } catch {
      toast.error("Could not copy automatically", { description: url });
    }
  };

  const handleSaved = async ({ mode, meeting }: { mode: ComposerMode; meeting: VideoMeeting }) => {
    setComposerOpen(false);
    setEditing(null);
    await loadMeetings({ silent: true });
    if (mode === "edit") return;
    setCreatedMeeting(meeting);
    if (mode === "scheduled") setTab("upcoming");
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.post(`/video-meetings/${cancelTarget.uuid}/cancel`);
      toast.success("Meeting cancelled");
      setCancelTarget(null);
      await loadMeetings({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not cancel the meeting"));
    } finally {
      setCancelling(false);
    }
  };

  const liveCount = upcoming.filter((meeting) => meeting.status === "live").length;
  const invitedCount = upcoming.reduce((total, meeting) => total + Math.max(0, meeting.participants.length - 1), 0);

  return (
    <main className="video-conferencing mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <section aria-labelledby="video-conferencing-title" className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4 gap-1.5 rounded-full px-3 py-1">
              <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
              End-to-end encrypted
            </Badge>
            <h1 id="video-conferencing-title" className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Video conferencing
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Schedule and manage encrypted meetings here. Invitations land in Chat, where everyone joins the call.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" className="min-h-11 gap-2" asChild>
              <Link href="/dashboard/chat">
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                Open Chat
              </Link>
            </Button>
            <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => openComposer("scheduled")}>
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              Schedule
            </Button>
            <Button type="button" className="min-h-11 gap-2" onClick={() => openComposer("instant")}>
              <Video className="h-4 w-4" aria-hidden="true" />
              New meeting
            </Button>
          </div>
        </div>
      </section>

      <section aria-label="Meeting summary" className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Live now", value: liveCount, icon: Video },
          { label: "Upcoming", value: upcoming.length, icon: CalendarClock },
          { label: "People invited", value: invitedCount, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-[hsl(var(--primary-readable))]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="upcoming" className="gap-2">
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            Upcoming
            <span className="tabular-nums text-muted-foreground">{upcoming.length}</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" aria-hidden="true" />
            History
            <span className="tabular-nums text-muted-foreground">{history.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {loading ? (
            <Card>
              <CardContent className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground" role="status">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                Loading meetings
              </CardContent>
            </Card>
          ) : loadFailed && upcoming.length === 0 ? (
            <Card>
              <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-muted-foreground">We couldn’t load your meetings.</p>
                <Button type="button" variant="outline" onClick={() => void loadMeetings({ spinner: true })}>Try again</Button>
              </CardContent>
            </Card>
          ) : upcoming.length === 0 ? (
            <Card>
              <CardContent className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-muted">
                  <CalendarClock className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-semibold">No meetings scheduled</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Create an instant encrypted room or schedule time with your team.
                </p>
                <Button type="button" className="mt-5 min-h-11" onClick={() => openComposer("scheduled")}>
                  Schedule a meeting
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {upcoming.map((meeting) => (
                <MeetingCard
                  key={meeting.uuid}
                  meeting={meeting}
                  now={now}
                  onEdit={(item) => openComposer("edit", item)}
                  onCancel={setCancelTarget}
                  onCopy={(item) => void copyInvite(item)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {history.length === 0 ? (
            <Card>
              <CardContent className="flex min-h-40 items-center justify-center p-8 text-center text-sm text-muted-foreground">
                Ended and cancelled meetings will appear here.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="divide-y p-0">
                {history.map((meeting) => (
                  <div key={meeting.uuid} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{meeting.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatInZone(meeting.starts_at, meeting.timezone)} · {formatDuration(meeting.duration_minutes)} ·{" "}
                        {meeting.participants.length} participant{meeting.participants.length === 1 ? "" : "s"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Host: {meeting.is_host ? "You" : meeting.host.name}
                        {meeting.ended_at ? ` · ${meeting.status === "cancelled" ? "Cancelled" : "Ended"} ${formatInZone(meeting.ended_at, meeting.timezone)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={meeting.status === "cancelled" ? "destructive" : "outline"} className="capitalize">
                        {meeting.status}
                      </Badge>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/dashboard/chat?conversation=${meeting.conversation_id}`}>
                          <MessageSquare className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only sm:not-sr-only sm:ml-2">Open chat</span>
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <MeetingComposerDialog
        open={composerOpen}
        mode={composerMode}
        meeting={editing}
        onOpenChange={(open) => {
          setComposerOpen(open);
          if (!open) setEditing(null);
        }}
        onSaved={(result) => void handleSaved(result)}
      />

      <Dialog open={Boolean(createdMeeting)} onOpenChange={(open) => !open && setCreatedMeeting(null)}>
        <DialogContent className="video-conferencing sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Meeting ready</DialogTitle>
            <DialogDescription>
              “{createdMeeting?.title}” is saved here. Copy the invite link before you join — Chat is only where the call happens.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-2xl border bg-muted/30 p-4 text-sm">
            <p className="break-all font-mono text-xs text-muted-foreground">
              {createdMeeting ? inviteUrl(createdMeeting) : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {createdMeeting?.invite_note ?? "Only invited Hive users can join. Uninvited people with the link cannot enter."}
            </p>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 gap-2"
              onClick={() => createdMeeting && void copyInvite(createdMeeting)}
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy invite link
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={() => setCreatedMeeting(null)}>
                Stay here
              </Button>
              {createdMeeting ? (
                <Button type="button" className="min-h-11 gap-2" asChild>
                  <Link href={createdMeeting.join_href} onClick={() => setCreatedMeeting(null)}>
                    <Video className="h-4 w-4" aria-hidden="true" />
                    {createdMeeting.is_host ? "Start in Chat" : "Join in Chat"}
                  </Link>
                </Button>
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(cancelTarget)} onOpenChange={(open) => !open && !cancelling && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {cancelTarget?.status === "live" ? "End and cancel this meeting?" : "Cancel this meeting?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              “{cancelTarget?.title}” will be marked as cancelled and nobody will be able to join it. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep meeting</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={cancelling} onClick={() => void confirmCancel()} className="gap-2">
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Cancel meeting
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
