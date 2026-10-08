"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { HIVE_INTRO_SEEN_KEY as SEEN_KEY } from "../intro-gate";
import { HiveMark } from "./hive-mark";

/** Upper bound if animationend never arrives (2.2s hold + 0.85s collapse, plus slack). */
const FALLBACK_MS = 4000;

const HONEYCOMB_TILE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='97' viewBox='0 0 56 97'%3E%3Cpath d='M28 0l28 16.2v32.4L28 64.8 0 48.6V16.2zM28 64.8l28 16.2v32.4M28 64.8L0 81v32.4' fill='none' stroke='%232563eb' stroke-opacity='.35' stroke-width='1'/%3E%3C/svg%3E\")";

/**
 * One-per-session logo reveal: the hexagon traces itself, the H and honey
 * chevron assemble, the wordmark rises, then the curtain collapses into a
 * hexagon and hands over to the hero.
 *
 * Every frame of it is CSS (globals.css: .hive-intro, .hi-*, .hm-*), so it
 * plays from the very first paint and ends on its own clock even if hydration
 * is slow or never happens. React only adds skip (click / any key) and removes
 * the node once its collapse animation has ended.
 */
export function HiveIntro() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(true);
  const [skipping, setSkipping] = React.useState(false);

  React.useEffect(() => {
    // Full page loads: the gate script in app/layout.tsx has already decided.
    // Client-side navigations back to "/": sessionStorage decides.
    let seen = document.documentElement.getAttribute("data-hive-intro") === "seen";
    try {
      seen ||= Boolean(sessionStorage.getItem(SEEN_KEY));
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {}

    // Already played out before hydration (slow load): computed visibility is
    // the end state of hive-intro-out, and its animationend has been missed.
    const finished = ref.current && getComputedStyle(ref.current).visibility === "hidden";
    if (seen || finished) {
      setMounted(false);
      return;
    }

    const timer = window.setTimeout(() => setMounted(false), FALLBACK_MS);
    const onKey = () => setSkipping(true);
    window.addEventListener("keydown", onKey, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Once finished, the curtain is gone for the session.
  React.useEffect(() => {
    if (!mounted) document.documentElement.setAttribute("data-hive-intro", "seen");
  }, [mounted]);

  if (!mounted) return null;

  return (
    <>
      <div
        ref={ref}
        role="presentation"
        onClick={() => setSkipping(true)}
        // Both the natural end and the skip run hive-intro-out; whichever
        // finishes unmounts the curtain. Children's own keyframes bubble here
        // too, hence the name check.
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && event.animationName === "hive-intro-out") setMounted(false);
        }}
        className={cn(
          "hive-intro fixed inset-0 z-[200] flex cursor-pointer items-center justify-center overflow-hidden bg-[#03060f]",
          skipping && "hive-intro--skip",
        )}
      >
        <div
          aria-hidden
          className="hi-fade absolute inset-0 opacity-60 [mask-image:radial-gradient(circle_at_50%_50%,black_0%,transparent_55%)]"
          style={{ backgroundImage: HONEYCOMB_TILE, animationDuration: "1.8s" }}
        />
        <div
          aria-hidden
          className="hi-bloom absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/25 blur-[120px]"
        />
        <div
          aria-hidden
          className="hi-fade absolute left-1/2 top-[42%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/25 blur-[70px]"
          style={{ animationDelay: "1.1s", animationDuration: "0.9s" }}
        />

        <div className="hive-intro__stage relative flex flex-col items-center">
          <HiveMark
            animate="css"
            delay={0.1}
            className="h-28 w-28 drop-shadow-[0_0_40px_rgba(37,99,235,0.55)] md:h-36 md:w-36"
          />

          <div className="mt-7 overflow-hidden pb-1">
            <div
              className="hi-rise font-space text-4xl font-black tracking-[-0.03em] text-white md:text-5xl"
              style={{ animationDelay: "1.2s" }}
            >
              HIVE
              <span className="ml-2 bg-gradient-to-r from-sky-400 to-blue-600 bg-clip-text text-transparent">
                OS
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <span
              className="hi-grow-x h-px w-10 origin-right bg-gradient-to-l from-amber-400 to-transparent"
              style={{ animationDelay: "1.5s" }}
            />
            <span
              className="hi-track font-mono text-[11px] font-bold uppercase tracking-[0.45em] text-slate-300"
              style={{ animationDelay: "1.4s" }}
            >
              ERP System
            </span>
            <span
              className="hi-grow-x h-px w-10 origin-left bg-gradient-to-r from-amber-400 to-transparent"
              style={{ animationDelay: "1.5s" }}
            />
          </div>
        </div>

        <span
          className="hi-fade absolute bottom-8 font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500"
          style={{ animationDelay: "0.8s" }}
        >
          Click or press any key to skip
        </span>
      </div>
    </>
  );
}
