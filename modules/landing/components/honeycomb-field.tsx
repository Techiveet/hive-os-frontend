"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * Living honeycomb behind the hero.
 *
 * A tessellated grid of hex cells: the cursor carries a cobalt light that wakes
 * the cells around it, and individual cells catch a honey glow at random — the
 * "activity in the hive". Replaces the old floating-hexagon canvas, whose
 * requestAnimationFrame loop was never cancelled, so every theme toggle stacked
 * another loop on top of the last.
 *
 * Pauses whenever the hero is off-screen or the tab is hidden, and draws a
 * single still frame under prefers-reduced-motion.
 */

type Cell = { x: number; y: number; honey: number; honeyDecay: number };

const SIZE = 30; // hex radius in CSS px
const LIGHT_RADIUS = 220;

export function HoneycombField({ className }: { className?: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let cells: Cell[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let running = false;
    let onScreen = true;
    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999 };

    const palette = () => {
      const dark = document.documentElement.classList.contains("dark");
      return dark
        ? { line: "96,165,250", lineAlpha: 0.07, light: "59,130,246", honey: "251,191,36" }
        : { line: "37,99,235", lineAlpha: 0.08, light: "37,99,235", honey: "245,158,11" };
    };
    let colors = palette();

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Pointy-top tessellation: columns √3·r apart, rows 1.5·r apart,
      // odd rows shifted half a column.
      const colStep = Math.sqrt(3) * SIZE;
      const rowStep = 1.5 * SIZE;
      cells = [];
      for (let row = -1; row * rowStep < height + SIZE * 2; row++) {
        const offset = row % 2 ? colStep / 2 : 0;
        for (let col = -1; col * colStep < width + colStep; col++) {
          cells.push({ x: col * colStep + offset, y: row * rowStep, honey: 0, honeyDecay: 0 });
        }
      }
    };

    const hexPath = (x: number, y: number, r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const px = x + r * Math.cos(angle);
        const py = y + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Ease the light toward the pointer so it trails like a lantern.
      pointer.x += (pointer.tx - pointer.x) * 0.12;
      pointer.y += (pointer.ty - pointer.y) * 0.12;

      // Spark a few honey cells per second.
      if (!reduced && Math.random() < 0.06 && cells.length) {
        const cell = cells[Math.floor(Math.random() * cells.length)];
        cell.honey = 1;
        cell.honeyDecay = 0.006 + Math.random() * 0.01;
      }

      ctx.lineWidth = 1;
      for (const cell of cells) {
        const dx = cell.x - pointer.x;
        const dy = cell.y - pointer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const lit = Math.max(0, 1 - dist / LIGHT_RADIUS);
        // A slow diagonal swell so the field is never fully static.
        const wave = reduced ? 0 : (Math.sin(time * 0.0006 + (cell.x + cell.y) * 0.004) + 1) * 0.5;

        hexPath(cell.x, cell.y, SIZE - 2);
        ctx.strokeStyle = `rgba(${colors.line},${colors.lineAlpha + wave * 0.035 + lit * 0.45})`;
        ctx.stroke();

        if (lit > 0.02) {
          ctx.fillStyle = `rgba(${colors.light},${lit * lit * 0.14})`;
          ctx.fill();
        }

        if (cell.honey > 0.01) {
          hexPath(cell.x, cell.y, SIZE - 5);
          ctx.fillStyle = `rgba(${colors.honey},${cell.honey * 0.16})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(${colors.honey},${cell.honey * 0.55})`;
          ctx.stroke();
          cell.honey -= cell.honeyDecay;
        }
      }
    };

    const loop = (time: number) => {
      draw(time);
      frame = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || reduced || !onScreen || document.hidden) return;
      running = true;
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    layout();
    draw(0);
    start();

    const resizeObserver = new ResizeObserver(() => {
      layout();
      if (!running) draw(0);
    });
    resizeObserver.observe(canvas);

    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) start();
      else stop();
    });
    visibility.observe(canvas);

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    // Listen on window: the canvas is pointer-events:none under the hero copy.
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.tx = event.clientX - rect.left;
      pointer.ty = event.clientY - rect.top;
      if (pointer.x < -5000) {
        pointer.x = pointer.tx;
        pointer.y = pointer.ty;
      }
    };
    const onPointerLeave = () => {
      pointer.tx = -9999;
      pointer.ty = -9999;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);

    // Re-read the palette when the theme class flips on <html>.
    const themeObserver = new MutationObserver(() => {
      colors = palette();
      if (!running) draw(0);
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      stop();
      resizeObserver.disconnect();
      visibility.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full [mask-image:radial-gradient(ellipse_at_50%_40%,black_20%,transparent_75%)]",
        className,
      )}
    />
  );
}
