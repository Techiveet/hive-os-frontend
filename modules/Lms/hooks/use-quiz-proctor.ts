"use client";

import * as React from "react";

import { myQuizApi, type LmsProctorEventType, type LmsProctoringRules } from "@/modules/Lms/api/quizzes";

/**
 * Watches a sitting and reports what it sees.
 *
 * Two honest limits, worth stating because they shape what this is for:
 *
 * Only the learner's own tab can observe that it lost focus, so this is
 * cooperative. Someone who patches the client can stay silent, which is why the
 * trail is evidence a human reads rather than an automatic verdict. What it
 * catches reliably is the ordinary case — a second tab with the answers in it.
 *
 * And the browser will not let a page force fullscreen on its own; the learner
 * has to press something. So require_fullscreen is enforced by *asking*, and by
 * recording the answer, not by making it impossible to leave.
 *
 * Nothing here blocks the learner. Every report is fire-and-forget: if the
 * network is down the quiz keeps working and the event is simply lost, which is
 * the right trade when the alternative is an exam that stops mid-answer.
 */
export function useQuizProctor({
  attemptId,
  rules,
  active,
  onAutoSubmit,
}: {
  attemptId: string;
  rules?: LmsProctoringRules | null;
  /** False once the paper is handed in, so a results page reports nothing. */
  active: boolean;
  onAutoSubmit: () => void;
}) {
  const [focusLosses, setFocusLosses] = React.useState(0);
  const [flagged, setFlagged] = React.useState(false);
  /** The most recent thing worth telling the learner about, or null. */
  const [warning, setWarning] = React.useState<string | null>(null);

  // Held in a ref so the listeners below never have to be torn down and
  // rebuilt as counts change — re-registering them mid-quiz would drop events.
  const activeRef = React.useRef(active);
  activeRef.current = active;
  const autoSubmitRef = React.useRef(onAutoSubmit);
  autoSubmitRef.current = onAutoSubmit;
  const rulesRef = React.useRef(rules);
  rulesRef.current = rules;

  const report = React.useCallback(
    (type: LmsProctorEventType, metadata?: Record<string, unknown>) => {
      if (!activeRef.current || !attemptId) return;

      myQuizApi
        .recordEvent(attemptId, type, metadata)
        .then((result) => {
          if (!result.recorded) return;

          setFocusLosses(result.focus_loss_count);
          setFlagged(result.flagged);

          if (result.auto_submitted) {
            setWarning("You left the quiz too many times, so it has been handed in.");
            autoSubmitRef.current();
            return;
          }

          if (type === "focus_lost") {
            const limit = rulesRef.current?.max_focus_loss ?? null;
            setWarning(
              limit
                ? `You left the quiz. ${Math.max(0, limit - result.focus_loss_count)} more and it will be handed in automatically.`
                : "You left the quiz. This has been recorded for your instructor.",
            );
          }

          if (type === "paste" || type === "copy") {
            setWarning("Copying and pasting is not allowed in this quiz, and has been recorded.");
          }

          if (type === "fullscreen_exit") {
            setWarning("This quiz should be taken in fullscreen. Leaving it has been recorded.");
          }
        })
        .catch(() => {
          /* Never let proctoring break the exam. */
        });
    },
    [attemptId],
  );

  // Tab and window departures. visibilitychange covers switching tab or
  // minimising; blur covers moving to another window on the same screen. They
  // overlap, so blur only counts when the page is still visible — otherwise a
  // single alt-tab would be reported twice.
  React.useEffect(() => {
    if (!active) return;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        report("focus_lost", { via: "visibility" });
      } else {
        report("focus_regained", { via: "visibility" });
      }
    };

    const onBlur = () => {
      if (document.visibilityState === "visible") {
        report("focus_lost", { via: "blur" });
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, [active, report]);

  // Copy and paste. Blocking the event stops the ordinary case; the report is
  // what survives someone who knows their way around it.
  React.useEffect(() => {
    if (!active || !rules?.block_copy_paste) return;

    const onCopy = (event: ClipboardEvent) => {
      event.preventDefault();
      report("copy");
    };
    const onPaste = (event: ClipboardEvent) => {
      event.preventDefault();
      report("paste");
    };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();

    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);

    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, [active, rules?.block_copy_paste, report]);

  // Fullscreen, when the quiz asks for it.
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    if (!active || !rules?.require_fullscreen) return;

    const onChange = () => {
      const now = Boolean(document.fullscreenElement);
      setIsFullscreen(now);
      report(now ? "fullscreen_enter" : "fullscreen_exit");
    };

    document.addEventListener("fullscreenchange", onChange);
    setIsFullscreen(Boolean(document.fullscreenElement));

    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [active, rules?.require_fullscreen, report]);

  const requestFullscreen = React.useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Denied or unsupported — the warning banner stays up, which is the
      // whole enforcement a browser allows.
    }
  }, []);

  return {
    focusLosses,
    flagged,
    warning,
    dismissWarning: React.useCallback(() => setWarning(null), []),
    isFullscreen,
    requestFullscreen,
    needsFullscreen: Boolean(rules?.require_fullscreen) && active && !isFullscreen,
  };
}

/**
 * The countdown, owned by the server.
 *
 * The local timer only makes the number move once a second; the truth arrives
 * from every heartbeat and every answer save. That is what stops a learner
 * buying time by changing the device clock, and what closes an attempt whose
 * owner shut the laptop instead of submitting.
 */
export function useServerCountdown({
  attemptId,
  initialSeconds,
  active,
  onExpired,
  intervalMs = 30_000,
}: {
  attemptId: string;
  initialSeconds: number | null | undefined;
  active: boolean;
  onExpired: () => void;
  intervalMs?: number;
}) {
  const [seconds, setSeconds] = React.useState<number | null>(initialSeconds ?? null);
  const onExpiredRef = React.useRef(onExpired);
  onExpiredRef.current = onExpired;

  // Seed once the attempt loads, and whenever the server restates it.
  React.useEffect(() => {
    if (initialSeconds === undefined) return;
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  // Local tick, purely cosmetic.
  React.useEffect(() => {
    if (!active || seconds === null) return;

    const id = window.setInterval(() => {
      setSeconds((current) => (current === null ? null : Math.max(0, current - 1)));
    }, 1000);

    return () => window.clearInterval(id);
  }, [active, seconds === null]);

  // The authoritative half. Also the keep-alive that tells the server somebody
  // is still sitting here.
  React.useEffect(() => {
    if (!active || !attemptId) return;

    let cancelled = false;

    const beat = () => {
      myQuizApi
        .heartbeat(attemptId)
        .then((result) => {
          if (cancelled) return;

          setSeconds(result.seconds_remaining);

          if (result.expired || result.status !== "in_progress") {
            onExpiredRef.current();
          }
        })
        .catch(() => {
          /* A missed beat is not worth interrupting the exam over. */
        });
    };

    beat();
    const id = window.setInterval(beat, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [active, attemptId, intervalMs]);

  return {
    seconds,
    /** Correct the local clock from an answer-save response. */
    sync: React.useCallback((value: number | null) => setSeconds(value), []),
  };
}
