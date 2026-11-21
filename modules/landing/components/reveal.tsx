"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { useInViewOnce, usePrefersReducedMotion } from "./use-landing-motion";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** `up` for copy, `scale` for cards and panels. */
  variant?: "up" | "scale";
  delay?: number;
  as?: "div" | "section" | "li" | "article";
};

const RevealGroupContext = React.createContext<{
  visible: boolean;
  reduced: boolean;
} | null>(null);

/** Single-element scroll entrance using GPU-composited CSS transitions. */
export function Reveal({
  children,
  className,
  variant = "up",
  delay = 0,
  as = "div",
}: RevealProps) {
  const ref = React.useRef<HTMLElement>(null);
  const visible = useInViewOnce(ref, { rootMargin: "-10% 0px -8% 0px" });
  const reduced = usePrefersReducedMotion();
  const Component = as as React.ElementType;

  return (
    <Component
      ref={ref}
      style={delay > 0 && !reduced ? { transitionDelay: `${delay}s` } : undefined}
      className={cn(
        !reduced &&
          (variant === "scale"
            ? "transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            : "transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"),
        !reduced && !visible
          ? variant === "scale"
            ? "opacity-0 translate-y-4 scale-[0.97]"
            : "opacity-0 translate-y-6"
          : "opacity-100 translate-y-0 scale-100",
        className,
      )}
    >
      {children}
    </Component>
  );
}

/**
 * Parent orchestrator — pair with `RevealItem` children.
 */
export function RevealGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  step?: number;
  delay?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const visible = useInViewOnce(ref, { rootMargin: "-10% 0px -8% 0px" });
  const reduced = usePrefersReducedMotion();
  const ctx = React.useMemo(() => ({ visible, reduced }), [visible, reduced]);

  return (
    <RevealGroupContext.Provider value={ctx}>
      <div ref={ref} className={className}>
        {children}
      </div>
    </RevealGroupContext.Provider>
  );
}

export function RevealItem({
  children,
  className,
  variant = "up",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "up" | "scale";
}) {
  const group = React.useContext(RevealGroupContext);
  const reduced = group?.reduced ?? false;
  const visible = group?.visible ?? true;

  return (
    <div
      className={cn(
        !reduced &&
          (variant === "scale"
            ? "transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            : "transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"),
        !reduced && !visible
          ? variant === "scale"
            ? "opacity-0 translate-y-4 scale-[0.97]"
            : "opacity-0 translate-y-6"
          : "opacity-100 translate-y-0 scale-100",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Bento/pricing tile wrapper: adds the cursor-tracked spotlight declared in
 * globals.css. Writes CSS custom properties directly rather than through React
 * state so pointer movement never triggers a re-render.
 */
export function SpotlightCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  const handlePointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    el.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }, []);

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      className={cn("spotlight-tile relative", className)}
    >
      {children}
    </div>
  );
}
