"use client";

import * as React from "react";
import {
  BookOpenCheck,
  GraduationCap,
  Medal,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";

import { LMS_TOKENS } from "./lms-site";

/* ============================================================================
 * Shared "form page" visual — the dark navy composition panel lifted from the
 * lms2 (Educrat) login/signup templates: a navy backdrop, a soft radial glow
 * and floating course-themed cards that drift with the mouse (parallax).
 * Used by both the student login and registration pages so they match the LMS
 * landing template.
 * ==========================================================================*/

/**
 * The proof points, in flow beneath the headline.
 *
 * These used to be five absolutely-positioned cards scattered across the whole
 * panel with the headline layered over them at z-10. At the panel's real width
 * they overlapped each other and the text: "Course completed" was sliced in
 * half by "Top learner badge", and the eyebrow pill landed on top of a card.
 * Laying them out properly is the fix — the panel keeps its depth from the
 * glows and the two corner accents below, not from stacking content on content.
 */
const PROOF_POINTS = [
  {
    icon: BookOpenCheck,
    label: "Track every lesson",
    caption: "Progress saved as you go",
    accent: LMS_TOKENS.green,
  },
  {
    icon: Trophy,
    label: "Earn certificates",
    caption: "Proof of what you finished",
    accent: LMS_TOKENS.greenDark,
  },
  {
    icon: Star,
    label: "Learn from the best",
    caption: "Rated by learners like you",
    accent: "#E59819",
  },
];

/**
 * Two decorative cards, pinned to corners the text column never reaches, with
 * a little parallax so the panel still feels alive.
 */
const CORNER_ACCENTS = [
  {
    icon: GraduationCap,
    label: "New lesson available",
    accent: LMS_TOKENS.purple,
    className: "right-6 top-8 w-48",
    depth: 34,
    delay: "0s",
  },
  {
    icon: Medal,
    label: "Top learner this week",
    accent: "#00E5CC",
    className: "right-10 bottom-10 w-48",
    depth: 48,
    delay: "1.4s",
  },
];

/** The "join thousands of learners" row. Colour and initial in one place. */
const AVATARS = [
  { color: "#6440FB", initial: "A" },
  { color: "#00FF84", initial: "S" },
  { color: "#E59819", initial: "L" },
  { color: "#00E5CC", initial: "M" },
];

const useParallax = () => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let frame = 0;
    const onMove = (event: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
      const y = (event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setOffset({ x, y }));
    };

    element.addEventListener("mousemove", onMove);
    return () => {
      element.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return { ref, offset };
};

export function LmsFormPanelVisual({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
}) {
  const { ref, offset } = useParallax();

  return (
    <div
      ref={ref}
      className="relative hidden h-full min-h-[640px] overflow-hidden lg:block"
      style={{ backgroundColor: LMS_TOKENS.navySolid }}
    >
      {/* Radial glow */}
      <div
        className="pointer-events-none absolute -left-24 -top-24 h-[480px] w-[480px] rounded-full opacity-40 blur-3xl"
        style={{ background: `radial-gradient(circle, ${LMS_TOKENS.purple}66 0%, transparent 70%)` }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-20 h-[460px] w-[460px] rounded-full opacity-30 blur-3xl"
        style={{ background: `radial-gradient(circle, ${LMS_TOKENS.green}55 0%, transparent 70%)` }}
      />

      {/* Grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/*
        Decorative accents, in the corners only, and only once the panel is
        genuinely wide. Below 2xl it is a narrow column and anything pinned
        beside the text crowds it — which is exactly how the old layout ended
        up unreadable.
      */}
      {CORNER_ACCENTS.map((item) => {
        const x = offset.x * item.depth;
        const y = offset.y * item.depth;

        return (
          <div
            key={item.label}
            aria-hidden="true"
            className={`absolute hidden ${item.className} animate-[lms-form-float_7s_ease-in-out_infinite] rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-md 2xl:block`}
            style={{
              animationDelay: item.delay,
              transform: `translate(${x}px, ${y}px)`,
              transition: "transform 0.2s ease-out",
              boxShadow: "0 24px 48px -16px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-xl"
                style={{ backgroundColor: `${item.accent}26`, color: item.accent }}
              >
                <item.icon className="size-4.5" />
              </span>
              <p className="text-[13px] font-semibold leading-snug text-white">{item.label}</p>
            </div>
          </div>
        );
      })}

      {/* The column: everything readable, in flow, nothing on top of anything. */}
      <div className="relative z-10 flex min-h-full max-w-xl flex-col justify-center px-14 py-16 xl:px-20">
        <span
          className="inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white"
          style={{ backgroundColor: `${LMS_TOKENS.purple}66`, border: `1px solid ${LMS_TOKENS.purple}` }}
        >
          <Sparkles className="size-3.5" aria-hidden="true" style={{ color: LMS_TOKENS.green }} />
          {eyebrow}
        </span>

        <h2 className="mt-7 max-w-md text-[2.75rem] font-bold leading-[1.08] tracking-tight text-white xl:text-[3.2rem]">
          {title}
        </h2>
        <p className="mt-5 max-w-sm text-base leading-7 text-white/70">{subtitle}</p>

        <ul className="mt-9 flex max-w-sm flex-col gap-3.5">
          {PROOF_POINTS.map((point) => (
            <li
              key={point.label}
              className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-md"
            >
              <span
                className="grid size-10 shrink-0 place-items-center rounded-xl"
                style={{ backgroundColor: `${point.accent}26`, color: point.accent }}
              >
                <point.icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">{point.label}</span>
                <span className="block text-xs text-white/55">{point.caption}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-9 flex items-center gap-3">
          <div className="flex -space-x-2.5">
            {AVATARS.map((avatar) => (
              <span
                key={avatar.initial}
                className="grid size-9 place-items-center rounded-full border-2 text-[10px] font-black text-white"
                style={{ backgroundColor: avatar.color, borderColor: LMS_TOKENS.navy }}
              >
                {avatar.initial}
              </span>
            ))}
          </div>
          <p className="text-sm text-white/60">
            Join thousands of learners <span className="text-white">on the platform</span>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes lms-form-float {
          0%, 100% { margin-top: 0; }
          50% { margin-top: -10px; }
        }
      `}</style>
    </div>
  );
}

export function LmsFormShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col" style={{ backgroundColor: LMS_TOKENS.beige }}>
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[0.9fr_1.1fr]">
        <LmsFormPanelVisual
          eyebrow="Learning management"
          title={
            <>
              Learn anything, <span style={{ color: LMS_TOKENS.green }}>anytime</span>, from anywhere.
            </>
          }
          subtitle="Your courses, lessons and certificates — all in one beautiful place built for the way you learn."
        />
        <div className="relative flex flex-1 items-center justify-center px-4 py-12 sm:px-10 lg:py-16">
          {children}
        </div>
      </div>
    </main>
  );
}
