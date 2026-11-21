"use client";

import { useEffect } from "react";

const buildCursorSvg = (color: string, filled: boolean) => {
  const fill = filled ? `${color}33` : "none";

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
  <polygon points="16,2 25,7 30,16 25,25 16,30 7,25 2,16 7,7" fill="${fill}" stroke="${color}" stroke-width="2.4"/>
  <circle cx="16" cy="16" r="3.2" fill="${color}"/>
</svg>`.trim();
};

const toCursorUrl = (svg: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(svg)}") 16 16`;

export default function BrandCursor() {
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia("(pointer: fine)").matches) {
      return;
    }

    const root = document.documentElement;
    let lastPrimary = "";
    let rafId: number | null = null;

    const updateCursorTokens = () => {
      rafId = null;
      const inlinePrimary = root.style.getPropertyValue("--primary").trim();
      const primary = inlinePrimary || getComputedStyle(root).getPropertyValue("--primary").trim();
      if (primary === lastPrimary && root.style.getPropertyValue("--cursor-default")) {
        return;
      }
      lastPrimary = primary;
      const color = primary ? `hsl(${primary})` : "#FFC21A";

      root.style.setProperty("--cursor-default", `${toCursorUrl(buildCursorSvg(color, false))}, auto`);
      root.style.setProperty("--cursor-pointer", `${toCursorUrl(buildCursorSvg(color, true))}, pointer`);
    };

    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(updateCursorTokens);
    };

    scheduleUpdate();

    const observer = new MutationObserver(scheduleUpdate);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  return null;
}
