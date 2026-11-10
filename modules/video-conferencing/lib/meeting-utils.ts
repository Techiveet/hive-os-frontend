export type MeetingStatus = "scheduled" | "live" | "ended" | "cancelled";

export interface MeetingUser {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  chat_encryption_public_key?: string | null;
}

export interface VideoMeeting {
  id: number;
  uuid: string;
  conversation_id: number;
  title: string;
  agenda?: string | null;
  starts_at: string;
  duration_minutes: number;
  timezone: string;
  waiting_room: boolean;
  mute_on_entry: boolean;
  allow_join_before_host: boolean;
  status: MeetingStatus;
  started_at?: string | null;
  ended_at?: string | null;
  is_host: boolean;
  host: MeetingUser;
  participants: MeetingUser[];
  join_href: string;
  invite_note?: string;
}

/** What the UI shows. Derived from backend status + the clock. */
export type MeetingDisplayState =
  | "live"
  | "ready" // start time reached, host has not started yet
  | "soon" // starts within 15 minutes
  | "scheduled"
  | "missed" // scheduled window passed without the host starting
  | "ended"
  | "cancelled";

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240] as const;
const MINUTE = 60_000;

export const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};

export function getDisplayState(meeting: VideoMeeting, now = Date.now()): MeetingDisplayState {
  if (meeting.status === "live") return "live";
  if (meeting.status === "ended") return "ended";
  if (meeting.status === "cancelled") return "cancelled";

  const start = new Date(meeting.starts_at).getTime();
  const end = start + meeting.duration_minutes * MINUTE;
  if (now > end) return "missed";
  if (now >= start) return "ready";
  if (start - now <= 15 * MINUTE) return "soon";
  return "scheduled";
}

export const STATE_LABEL: Record<MeetingDisplayState, string> = {
  live: "Live",
  ready: "Ready to start",
  soon: "Starting soon",
  scheduled: "Scheduled",
  missed: "Missed",
  ended: "Ended",
  cancelled: "Cancelled",
};

export function relativeStart(meeting: VideoMeeting, now = Date.now()): string | null {
  if (meeting.status !== "scheduled") return null;
  const diff = new Date(meeting.starts_at).getTime() - now;
  const abs = Math.abs(diff);
  const mins = Math.round(abs / MINUTE);
  const text =
    mins < 1 ? "less than a minute"
    : mins < 60 ? `${mins} min`
    : mins < 60 * 24 ? `${Math.floor(mins / 60)} h${mins % 60 ? ` ${mins % 60} min` : ""}`
    : `${Math.round(mins / (60 * 24))} d`;
  if (mins < 1) return "Starting now";
  return diff >= 0 ? `Starts in ${text}` : `Started ${text} ago`;
}

/**
 * Mirrors the backend rule in VideoCallController::enforceScheduledMeetingAccess:
 * a non-host may only enter before the meeting is live when the waiting room
 * is OFF and "allow join before host" is ON.
 */
export function canGuestJoinBeforeHost(meeting: VideoMeeting) {
  return !meeting.waiting_room && meeting.allow_join_before_host;
}

// ---------------------------------------------------------------- time zones

const FALLBACK_ZONES = [
  "UTC", "Africa/Addis_Ababa", "Africa/Cairo", "Africa/Johannesburg", "Africa/Lagos", "Africa/Nairobi",
  "America/Chicago", "America/Denver", "America/Los_Angeles", "America/New_York", "America/Sao_Paulo",
  "America/Toronto", "Asia/Dubai", "Asia/Hong_Kong", "Asia/Kolkata", "Asia/Shanghai", "Asia/Singapore",
  "Asia/Tokyo", "Australia/Sydney", "Europe/Berlin", "Europe/London", "Europe/Moscow", "Europe/Paris",
  "Pacific/Auckland",
];

export const browserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export function getTimeZones(extra: string[] = []): string[] {
  let zones: string[] = [];
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    zones = supported ? supported("timeZone") : [];
  } catch {
    zones = [];
  }
  if (zones.length === 0) zones = FALLBACK_ZONES;
  return Array.from(new Set(["UTC", browserTimeZone(), ...extra, ...zones])).sort((a, b) =>
    a === "UTC" ? -1 : b === "UTC" ? 1 : a.localeCompare(b),
  );
}

export function timeZoneLabel(zone: string, at = new Date()) {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" })
      .formatToParts(at)
      .find((item) => item.type === "timeZoneName")?.value;
    return `${zone.replace(/_/g, " ")}${part ? ` (${part})` : ""}`;
  } catch {
    return zone;
  }
}

function zonedParts(ms: number, zone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(ms))
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;
  return parts;
}

function zoneOffsetMs(ms: number, zone: string) {
  const p = zonedParts(ms, zone);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** "2026-11-10T14:30" typed in `zone` -> the real instant (UTC). */
export function zonedWallTimeToUtc(local: string, zone: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return null;
  try {
    const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    let guess = wall - zoneOffsetMs(wall, zone);
    guess = wall - zoneOffsetMs(guess, zone); // second pass handles DST edges
    return new Date(guess);
  } catch {
    return null;
  }
}

/** A real instant -> "YYYY-MM-DDTHH:mm" as seen on the wall clock in `zone`. */
export function utcToZonedWallTime(value: string | Date, zone: string): string {
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  const p = zonedParts(ms, zone);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function formatInZone(iso: string, zone: string, options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }) {
  try {
    return new Intl.DateTimeFormat(undefined, { ...options, timeZone: zone }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat(undefined, options).format(new Date(iso));
  }
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
