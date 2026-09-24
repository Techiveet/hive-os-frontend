import type { ChartTheme } from "@/modules/shared/charts/echarts";

/**
 * Pure option builders shared by every ECharts dashboard, so charts across
 * modules look and behave the same: gradient fills, rounded marks, an on-canvas
 * donut total (so it survives export), and categorical bars that carry a legend
 * — every colored dot is clickable to isolate its data.
 */

const HEX = /^#([0-9a-f]{6})$/i;

export function withAlpha(color: string, alpha: number): string {
  if (!HEX.test(color)) return color;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${color}${a}`;
}

/** Top-to-bottom (or left-to-right) fill that fades the mark toward its base. */
export function gradient(color: string, horizontal = false, fade = 0.55) {
  return {
    type: "linear" as const,
    x: 0,
    y: 0,
    x2: horizontal ? 1 : 0,
    y2: horizontal ? 0 : 1,
    colorStops: horizontal
      ? [
          { offset: 0, color: withAlpha(color, fade) },
          { offset: 1, color },
        ]
      : [
          { offset: 0, color },
          { offset: 1, color: withAlpha(color, fade) },
        ],
  };
}

/** Soft wash under a line series. */
export function areaGradient(color: string) {
  return {
    type: "linear" as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: withAlpha(color, 0.32) },
      { offset: 1, color: withAlpha(color, 0.02) },
    ],
  };
}

export const compactNumber = (value: unknown): string => {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 10_000) return `${(n / 1000).toFixed(0)}k`;
  if (abs >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 1 });
};

export type DonutSlice = { name: string; value: number; color: string };

/**
 * Donut whose total sits in the middle as a real chart label (not an HTML
 * overlay), so it is part of every PNG/SVG/PDF export. When a legend click
 * isolates one slice, that slice is 100% of what is visible and the centre
 * switches to its own value and name; hovering a slice does the same.
 */
export function donutSeries(slices: DonutSlice[], caption: string, theme: ChartTheme) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const rich = {
    v: { fontSize: 26, fontWeight: 800, color: theme.foreground, lineHeight: 32 },
    c: { fontSize: 10, fontWeight: 700, color: theme.mutedForeground, padding: [2, 0, 0, 0] },
  };

  return {
    type: "pie" as const,
    radius: ["58%", "80%"],
    center: ["50%", "44%"],
    padAngle: 2,
    avoidLabelOverlap: false,
    itemStyle: { borderRadius: 6, borderColor: theme.card, borderWidth: 2 },
    label: {
      show: true,
      position: "center" as const,
      formatter: (p: { percent?: number; value?: unknown; name?: string }) =>
        (p.percent ?? 0) >= 99.99
          ? `{v|${compactNumber(p.value)}}\n{c|${String(p.name ?? "").toUpperCase()}}`
          : `{v|${compactNumber(total)}}\n{c|${caption.toUpperCase()}}`,
      rich,
    },
    labelLine: { show: false },
    emphasis: {
      focus: "self" as const,
      scale: true,
      scaleSize: 6,
      label: {
        show: true,
        formatter: (p: { value?: unknown; name?: string }) => `{v|${compactNumber(p.value)}}\n{c|${String(p.name ?? "").toUpperCase()}}`,
        rich,
      },
    },
    blur: { label: { show: false }, itemStyle: { opacity: 0.35 } },
    data: slices.map((s) => ({ name: s.name, value: s.value, itemStyle: { color: s.color } })),
  };
}

/** Legend for a donut that reads "Name: value" so counts are on-canvas too. */
export function valueLegend(slices: Array<{ name: string; value: number }>, extra: Record<string, unknown> = {}) {
  return {
    bottom: 0,
    type: "scroll" as const,
    itemWidth: 10,
    itemHeight: 10,
    icon: "circle",
    formatter: (name: string) => {
      const slice = slices.find((s) => s.name === name);
      return slice ? `${name}: ${compactNumber(slice.value)}` : name;
    },
    ...extra,
  };
}

export type CategoricalBucket = { name: string; value: number; color: string };

/**
 * One series per category, stacked into its own slot, so a bar chart of
 * differently-coloured categories gets a real legend — each colored dot
 * isolates its own bar.
 */
export function categoricalBars(buckets: CategoricalBucket[], theme: ChartTheme, horizontal = false) {
  return buckets.map((bucket, index) => ({
    name: bucket.name,
    type: "bar" as const,
    stack: "category",
    barMaxWidth: horizontal ? 22 : 46,
    data: buckets.map((_, i) => (i === index ? bucket.value : null)),
    itemStyle: {
      color: gradient(bucket.color, horizontal),
      borderRadius: horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0],
    },
    emphasis: { focus: "series" as const },
    label: {
      show: true,
      position: horizontal ? ("right" as const) : ("top" as const),
      fontSize: 10,
      fontWeight: 700,
      color: theme.foreground,
      formatter: (p: { value?: unknown }) => (p.value == null ? "" : compactNumber(p.value)),
    },
  }));
}

export function dotLegend(extra: Record<string, unknown> = {}) {
  return { bottom: 0, type: "scroll" as const, itemWidth: 10, itemHeight: 10, icon: "circle", ...extra };
}
