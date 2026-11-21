"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { useInViewOnce, usePrefersReducedMotion } from "./use-landing-motion";

const OUTER = "50,4 89.84,27 89.84,73 50,96 10.16,73 10.16,27";
const INNER = "50,12.5 82.48,31.25 82.48,68.75 50,87.5 17.52,68.75 17.52,31.25";
const ROOF = "37,50 50,40 63,50 63,58.5 50,48.5 37,58.5";
const CHEVRON = "39,35 50,26 61,35 61,41.5 50,32.5 39,41.5";
const BARS = [
  { x: 41.5, h: 6 },
  { x: 47.5, h: 10.5 },
  { x: 53.5, h: 15 },
];

type Props = {
  className?: string;
  animate?: "draw" | "css" | "static";
  delay?: number;
  title?: string;
  decorative?: boolean;
};

export function HiveMark({
  className,
  animate = "static",
  delay = 0,
  title = "Hive OS",
  decorative = false,
}: Props) {
  const reduced = usePrefersReducedMotion();
  const id = React.useId().replace(/:/g, "");
  const css = (animate === "css" || animate === "draw") && !reduced;

  const part = (keyframes: string, offset: number) =>
    css ? { className: `hm-part ${keyframes}`, style: { animationDelay: `${delay + offset}s` } } : {};

  return (
    <svg
      viewBox="0 0 100 100"
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": title })}
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="55%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id={`${id}-core`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1638" />
          <stop offset="100%" stopColor="#050a1f" />
        </linearGradient>
        <linearGradient id={`${id}-honey`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd34d" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id={`${id}-bar`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id={`${id}-glyph`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>

      <polygon
        points={OUTER}
        fill={`url(#${id}-rim)`}
        {...part("hm-fade", 0.55)}
      />
      {css && (
        <polygon
          points={OUTER}
          pathLength={1}
          fill="none"
          stroke="#60a5fa"
          strokeWidth={2}
          strokeLinejoin="round"
          className="hm-trace"
          style={{ animationDelay: `${delay}s` }}
        />
      )}
      <polygon
        points={INNER}
        fill={`url(#${id}-core)`}
        {...part("hm-pop", 0.6)}
      />

      <rect
        x={27}
        y={30}
        width={10}
        height={44}
        rx={1.2}
        fill={`url(#${id}-glyph)`}
        {...part("hm-grow", 0.8)}
      />
      <rect
        x={63}
        y={30}
        width={10}
        height={44}
        rx={1.2}
        fill={`url(#${id}-glyph)`}
        {...part("hm-grow", 0.88)}
      />
      <polygon
        points={ROOF}
        fill={`url(#${id}-glyph)`}
        {...part("hm-drop", 1.05)}
      />

      <polygon
        points={CHEVRON}
        fill={`url(#${id}-honey)`}
        {...part("hm-chevron", 1.3)}
      />

      {BARS.map((bar, index) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={72 - bar.h}
          width={4.4}
          height={bar.h}
          rx={0.6}
          fill={`url(#${id}-bar)`}
          {...part("hm-grow", 1.15 + index * 0.08)}
        />
      ))}
    </svg>
  );
}

export function HiveLockup({
  className,
  markClassName,
  showTagline = false,
}: {
  className?: string;
  markClassName?: string;
  showTagline?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <HiveMark className={cn("h-8 w-8 transition-transform duration-500 group-hover:rotate-[30deg]", markClassName)} />
      <span className="flex flex-col leading-none">
        <span className="font-space text-[1.15rem] font-black tracking-tight">
          <span className="text-foreground">HIVE</span>
          <span className="ml-1 bg-gradient-to-r from-sky-400 to-blue-600 bg-clip-text text-transparent">
            OS
          </span>
        </span>
        {showTagline && (
          <span className="mt-1 font-mono text-[8.5px] font-bold uppercase tracking-[0.32em] text-muted-foreground">
            ERP System
          </span>
        )}
      </span>
    </span>
  );
}

export function HiveBeacon({ className }: { className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInViewOnce(ref, { threshold: 0.6 });

  return (
    <div ref={ref} className={cn("relative mx-auto h-44 w-44", className)}>
      <div
        aria-hidden
        className="absolute inset-6 rounded-full bg-amber-400/25 blur-2xl [animation:honey-pulse_4s_ease-in-out_infinite]"
      />
      <svg aria-hidden viewBox="0 0 200 200" className="absolute inset-0 h-full w-full [animation:hex-orbit_28s_linear_infinite]">
        <polygon
          points="100,8 179.7,54 179.7,146 100,192 20.3,146 20.3,54"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeOpacity={0.35}
          strokeDasharray="4 7"
        />
        <polygon points="100,2 106,5.5 106,12.5 100,16 94,12.5 94,5.5" fill="#fbbf24" />
        <polygon points="20.3,140 26.3,143.5 26.3,150.5 20.3,154 14.3,150.5 14.3,143.5" fill="hsl(var(--primary))" />
      </svg>
      <svg
        aria-hidden
        viewBox="0 0 200 200"
        className="absolute inset-5 h-[calc(100%-2.5rem)] w-[calc(100%-2.5rem)] [animation:hex-orbit_18s_linear_infinite_reverse]"
      >
        <polygon
          points="100,10 177.9,55 177.9,145 100,190 22.1,145 22.1,55"
          fill="none"
          stroke="#fbbf24"
          strokeOpacity={0.3}
        />
        <polygon points="177.9,49 183.9,52.5 183.9,59.5 177.9,63 171.9,59.5 171.9,52.5" fill="#fbbf24" fillOpacity={0.8} />
      </svg>
      <div className="absolute inset-10">
        {inView ? (
          <HiveMark animate="draw" className="h-full w-full drop-shadow-[0_0_30px_rgba(37,99,235,0.45)]" />
        ) : (
          <HiveMark className="h-full w-full opacity-0" />
        )}
      </div>
    </div>
  );
}
