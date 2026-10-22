"use client";

import * as React from "react";
import { Download, X } from "lucide-react";
import * as echarts from "echarts/core";
import { BarChart, PieChart, LineChart, TreemapChart, GaugeChart, FunnelChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DatasetComponent,
  DataZoomComponent,
  MarkLineComponent,
  GraphicComponent,
} from "echarts/components";
import { CanvasRenderer, SVGRenderer } from "echarts/renderers";
import type { ComposeOption } from "echarts/core";
import type {
  BarSeriesOption,
  PieSeriesOption,
  LineSeriesOption,
  TreemapSeriesOption,
  GaugeSeriesOption,
  FunnelSeriesOption,
} from "echarts/charts";
import type {
  TitleComponentOption,
  TooltipComponentOption,
  GridComponentOption,
  LegendComponentOption,
  DatasetComponentOption,
  DataZoomComponentOption,
  MarkLineComponentOption,
  GraphicComponentOption,
} from "echarts/components";
import { cn } from "@/lib/utils";

/**
 * Shared ECharts runtime for module dashboards. Series colours come from the
 * app's validated categorical/severity tokens, never a library default palette.
 * Only the chart/component types actually used are registered (tree-shaken via
 * echarts/core), so a new chart form means adding its import here once.
 */
echarts.use([
  BarChart,
  PieChart,
  LineChart,
  TreemapChart,
  GaugeChart,
  FunnelChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DatasetComponent,
  DataZoomComponent,
  MarkLineComponent,
  GraphicComponent,
  CanvasRenderer,
  SVGRenderer,
]);

export type ChartOption = ComposeOption<
  | BarSeriesOption
  | PieSeriesOption
  | LineSeriesOption
  | TreemapSeriesOption
  | GaugeSeriesOption
  | FunnelSeriesOption
  | TitleComponentOption
  | TooltipComponentOption
  | GridComponentOption
  | LegendComponentOption
  | DatasetComponentOption
  | DataZoomComponentOption
  | MarkLineComponentOption
  | GraphicComponentOption
>;

export interface ChartTheme {
  /** --chart-1..4, fixed categorical order — never cycled arbitrarily. */
  categorical: string[];
  severity: { critical: string; warning: string; caution: string; good: string };
  foreground: string;
  mutedForeground: string;
  border: string;
  card: string;
}

/**
 * Pass a builder instead of a static option and the chart can be re-rendered
 * against a different theme — the export pipeline uses that to produce a
 * print-friendly light version regardless of the theme on screen.
 */
export type ChartOptionInput = ChartOption | ((theme: ChartTheme) => ChartOption);

const FALLBACK_THEME: ChartTheme = {
  categorical: ["#059669", "#0284c7", "#d97706", "#8b5cf6"],
  severity: { critical: "#e11d48", warning: "#ea580c", caution: "#a16207", good: "#15803d" },
  foreground: "hsl(240 10% 3.9%)",
  mutedForeground: "hsl(240 3.8% 46.1%)",
  border: "hsl(240 5.9% 90%)",
  card: "hsl(0 0% 100%)",
};

/** Light surface for exported files: documents, slides and email all assume white paper. */
export const PRINT_THEME: ChartTheme = {
  categorical: ["#059669", "#0284c7", "#d97706", "#8b5cf6"],
  severity: { critical: "#e11d48", warning: "#ea580c", caution: "#a16207", good: "#15803d" },
  foreground: "#0f172a",
  mutedForeground: "#475569",
  border: "#e2e8f0",
  card: "#ffffff",
};

function readVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function readHsl(name: string): string {
  const value = readVar(name);
  return value ? `hsl(${value})` : "";
}

function readTheme(): ChartTheme {
  const categorical = ["--chart-1", "--chart-2", "--chart-3", "--chart-4"].map(
    (name, index) => readVar(name) || FALLBACK_THEME.categorical[index]
  );

  return {
    categorical,
    severity: {
      critical: readVar("--sc-critical") || FALLBACK_THEME.severity.critical,
      warning: readVar("--sc-warning") || FALLBACK_THEME.severity.warning,
      caution: readVar("--sc-caution") || FALLBACK_THEME.severity.caution,
      good: readVar("--sc-good") || FALLBACK_THEME.severity.good,
    },
    foreground: readHsl("--foreground") || FALLBACK_THEME.foreground,
    mutedForeground: readHsl("--muted-foreground") || FALLBACK_THEME.mutedForeground,
    border: readHsl("--border") || FALLBACK_THEME.border,
    card: readHsl("--card") || FALLBACK_THEME.card,
  };
}

/**
 * ECharts paints on canvas, so it can't inherit CSS custom properties the way
 * SVG does. This resolves the app's tokens to literal colours once, and again
 * whenever the `dark` class flips, so charts repaint on theme toggle.
 */
export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = React.useState<ChartTheme>(FALLBACK_THEME);

  React.useEffect(() => {
    setTheme(readTheme());
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

type AnyRecord = Record<string, unknown>;

function axisWithTheme(axis: unknown, theme: ChartTheme): unknown {
  const apply = (single: AnyRecord) => ({
    axisLine: { lineStyle: { color: theme.border } },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: theme.border, opacity: 0.6, type: "dashed" } },
    axisLabel: { color: theme.mutedForeground, fontSize: 10 },
    ...single,
  });

  if (Array.isArray(axis)) return axis.map((single) => apply(single as AnyRecord));
  if (axis && typeof axis === "object") return apply(axis as AnyRecord);
  return axis;
}

function mergeThemeDefaults(option: ChartOption, theme: ChartTheme): ChartOption {
  const raw = option as AnyRecord;
  const merged: AnyRecord = {
    color: theme.categorical,
    backgroundColor: "transparent",
    textStyle: { color: theme.foreground, fontFamily: "inherit" },
    animationDuration: 700,
    animationEasing: "cubicOut",
    ...raw,
  };

  merged.tooltip = {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    textStyle: { color: theme.foreground, fontSize: 12 },
    extraCssText: "border-radius:0.75rem;box-shadow:0 10px 30px rgba(0,0,0,.18);padding:10px 12px;",
    ...(raw.tooltip as AnyRecord | undefined),
  };

  if (raw.legend) {
    merged.legend = {
      textStyle: { color: theme.mutedForeground, fontSize: 11 },
      pageTextStyle: { color: theme.mutedForeground },
      inactiveColor: theme.border,
      ...(raw.legend as AnyRecord),
    };
  }
  if (raw.xAxis) merged.xAxis = axisWithTheme(raw.xAxis, theme);
  if (raw.yAxis) merged.yAxis = axisWithTheme(raw.yAxis, theme);

  return merged as ChartOption;
}

const resolveOption = (input: ChartOptionInput, theme: ChartTheme): ChartOption =>
  typeof input === "function" ? input(theme) : input;

// ---------------------------------------------------------------- export

const EXPORT_WIDTH = 1200;
const EXPORT_HEIGHT = 700;

function slugify(label: string): string {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "chart"
  );
}

function downloadUrl(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

const numeric = (value: unknown, fallback: number) => (typeof value === "number" ? value : fallback);

function scaleRadius(radius: unknown, factor: number): unknown {
  const scale = (r: unknown) =>
    typeof r === "string" && r.endsWith("%") ? `${Math.round(parseFloat(r) * factor)}%` : typeof r === "number" ? r * factor : r;
  return Array.isArray(radius) ? radius.map(scale) : scale(radius ?? "70%");
}

/**
 * Re-lay a chart for a fixed-size export: room for a title block and footer,
 * animation off (an animated chart captured on its first frame shows empty
 * bars and a zero-degree pie), a solid background, and the viewer's current
 * legend selection so the file shows exactly what they isolated.
 */
function decorateForExport(
  option: ChartOption,
  theme: ChartTheme,
  meta: { title: string; subtitle?: string; selected?: Record<string, boolean> }
): ChartOption {
  const o = { ...(mergeThemeDefaults(option, theme) as AnyRecord) };

  o.animation = false;
  o.backgroundColor = theme.card;
  o.title = [
    {
      text: meta.title,
      subtext: meta.subtitle ?? "",
      left: 32,
      top: 24,
      textStyle: { fontSize: 22, fontWeight: 800, color: theme.foreground },
      subtextStyle: { fontSize: 13, color: theme.mutedForeground },
    },
  ];

  const stamp = new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  const existingGraphic = Array.isArray(o.graphic) ? (o.graphic as unknown[]) : o.graphic ? [o.graphic] : [];
  o.graphic = [
    ...existingGraphic,
    {
      type: "text",
      right: 32,
      bottom: 16,
      style: { text: `Hive OS · exported ${stamp}`, fill: theme.mutedForeground, fontSize: 11 },
    },
    { type: "rect", left: 32, top: 92, shape: { width: EXPORT_WIDTH - 64, height: 1 }, style: { fill: theme.border } },
  ];

  const shiftGrid = (g: AnyRecord) => ({
    ...g,
    top: numeric(g.top, 30) + 88,
    bottom: numeric(g.bottom, 30) + 40,
    left: Math.max(numeric(g.left, 48), 56),
    right: Math.max(numeric(g.right, 24), 40),
    containLabel: true,
  });
  if (o.grid) o.grid = Array.isArray(o.grid) ? (o.grid as AnyRecord[]).map(shiftGrid) : shiftGrid(o.grid as AnyRecord);

  if (Array.isArray(o.series)) {
    o.series = (o.series as AnyRecord[]).map((s) => {
      if (s.type === "pie") return { ...s, center: ["50%", "54%"], radius: scaleRadius(s.radius, 0.78) };
      if (s.type === "treemap") return { ...s, top: 108, bottom: 56, left: 32, right: 32 };
      return s;
    });
  }

  if (o.legend) {
    o.legend = { ...(o.legend as AnyRecord), bottom: 42, top: undefined, selected: meta.selected };
  }

  if (o.dataZoom) {
    const zooms = (Array.isArray(o.dataZoom) ? o.dataZoom : [o.dataZoom]) as AnyRecord[];
    o.dataZoom = zooms.filter((z) => z.type !== "slider");
  }

  return o as ChartOption;
}

function renderOffscreen(option: ChartOption, renderer: "canvas" | "svg", theme: ChartTheme) {
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-99999px;top:0;width:${EXPORT_WIDTH}px;height:${EXPORT_HEIGHT}px;`;
  document.body.appendChild(host);
  const chart = echarts.init(host, undefined, { renderer, width: EXPORT_WIDTH, height: EXPORT_HEIGHT });
  chart.setOption(option, { notMerge: true });

  const result =
    renderer === "svg"
      ? chart.renderToSVGString()
      : chart.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: theme.card });

  chart.dispose();
  host.remove();
  return result;
}

async function exportChart(
  format: "png" | "svg" | "pdf",
  input: ChartOptionInput,
  live: echarts.ECharts,
  screenTheme: ChartTheme,
  meta: { title: string; subtitle?: string; filename: string }
) {
  // Builders re-render on white paper; a static option keeps the screen theme
  // (its colours were only validated against that surface).
  const theme = typeof input === "function" ? PRINT_THEME : screenTheme;
  const liveLegend = (live.getOption() as AnyRecord).legend as AnyRecord[] | undefined;
  const selected = liveLegend?.[0]?.selected as Record<string, boolean> | undefined;
  const option = decorateForExport(resolveOption(input, theme), theme, { ...meta, selected });

  if (format === "svg") {
    const svg = renderOffscreen(option, "svg", theme);
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    downloadUrl(url, `${meta.filename}.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const png = renderOffscreen(option, "canvas", theme);
  if (format === "png") {
    downloadUrl(png, `${meta.filename}.png`);
    return;
  }

  // A real A4 landscape page in points — jsPDF's "px" unit mis-scales by
  // 72/96 unless hot-fixed, which is what cropped the chart before.
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 28;
  const width = pageWidth - margin * 2;
  const height = (width * EXPORT_HEIGHT) / EXPORT_WIDTH;
  doc.addImage(png, "PNG", margin, Math.max(margin, (pageHeight - height) / 2), width, height, undefined, "FAST");
  doc.setProperties({ title: meta.title, subject: meta.subtitle ?? "", creator: "Hive OS" });
  doc.save(`${meta.filename}.pdf`);
}

function ExportMenu({ onExport }: { onExport: (format: "png" | "svg" | "pdf") => void | Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const options: Array<{ format: "png" | "svg" | "pdf"; label: string }> = [
    { format: "png", label: "Image (PNG)" },
    { format: "svg", label: "Vector (SVG)" },
    { format: "pdf", label: "Document (PDF)" },
  ];

  return (
    <div ref={rootRef} className="absolute right-1 top-1 z-10">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Export chart"
        title="Export chart"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-card/80 text-muted-foreground opacity-0 backdrop-blur transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Download className={cn("h-3.5 w-3.5", busy && "animate-pulse")} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-8 min-w-[9rem] overflow-hidden rounded-xl border border-border/60 bg-popover shadow-lg"
        >
          {options.map((opt) => (
            <button
              key={opt.format}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setBusy(true);
                Promise.resolve(onExport(opt.format)).finally(() => setBusy(false));
              }}
              className="block w-full px-3 py-2 text-left text-xs font-medium text-popover-foreground transition-colors hover:bg-muted"
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ chart

export function EChart({
  option,
  height = 260,
  ariaLabel,
  title,
  subtitle,
  empty,
  emptyLabel,
  dimmed,
  className,
  exportFilename,
  disableExport,
  isolateOnLegendClick = true,
}: {
  option: ChartOptionInput;
  height?: number;
  ariaLabel: string;
  /** Printed at the top of exported files. Defaults to `ariaLabel`. */
  title?: string;
  subtitle?: string;
  /** Skip mounting the chart entirely and show a text placeholder instead. */
  empty?: boolean;
  emptyLabel?: string;
  /** Reduced opacity while a refetch is in flight, without unmounting. */
  dimmed?: boolean;
  className?: string;
  /** Defaults to a slug of the title. */
  exportFilename?: string;
  /** Opt out of the export menu for a chart that shouldn't leave the screen. */
  disableExport?: boolean;
  /**
   * Clicking a legend dot shows ONLY that series/slice; clicking the isolated
   * dot again (or the reset pill) brings everything back. Never leaves the
   * chart empty, unlike ECharts' default toggle-off behaviour.
   */
  isolateOnLegendClick?: boolean;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const chartRef = React.useRef<echarts.ECharts | null>(null);
  const theme = useChartTheme();
  const [isolated, setIsolated] = React.useState<string | null>(null);
  const isolateRef = React.useRef(isolateOnLegendClick);
  isolateRef.current = isolateOnLegendClick;

  React.useEffect(() => {
    if (empty || !containerRef.current) return;

    const chart = echarts.init(containerRef.current, undefined, { renderer: "canvas" });
    chartRef.current = chart;

    chart.on("legendselectchanged", (event: unknown) => {
      if (!isolateRef.current) return;
      const { name, selected } = event as { name: string; selected: Record<string, boolean> };
      const names = Object.keys(selected);
      // `selected` is already the post-toggle state; rebuild what it was before.
      const before: Record<string, boolean> = { ...selected, [name]: !selected[name] };
      const wasIsolated = names.every((n) => before[n] === (n === name));
      const next = Object.fromEntries(names.map((n) => [n, wasIsolated || n === name]));
      chart.setOption({ legend: { selected: next } });
      setIsolated(wasIsolated ? null : name);
    });

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [empty]);

  React.useEffect(() => {
    if (!chartRef.current) return;
    // Merge mode (not notMerge): a live dashboard refetches on realtime events,
    // and notMerge would rebuild the instance and silently undo a legend
    // isolation the viewer just made.
    chartRef.current.setOption(mergeThemeDefaults(resolveOption(option, theme), theme));
  }, [option, theme]);

  const resetIsolation = () => {
    const chart = chartRef.current;
    if (!chart) return;
    const legend = (chart.getOption() as AnyRecord).legend as AnyRecord[] | undefined;
    const selected = (legend?.[0]?.selected ?? {}) as Record<string, boolean>;
    chart.setOption({ legend: { selected: Object.fromEntries(Object.keys(selected).map((n) => [n, true])) } });
    setIsolated(null);
  };

  if (empty) {
    return <p className="py-16 text-center text-sm italic text-muted-foreground">{emptyLabel}</p>;
  }

  const exportTitle = title ?? ariaLabel;
  const filename = exportFilename ?? slugify(exportTitle);

  const handleExport = async (format: "png" | "svg" | "pdf") => {
    const chart = chartRef.current;
    if (!chart) return;
    const suffix = isolated ? ` — ${isolated}` : "";
    await exportChart(format, option, chart, theme, {
      title: `${exportTitle}${suffix}`,
      subtitle,
      filename: isolated ? `${filename}-${slugify(isolated)}` : filename,
    });
  };

  return (
    <div className="group relative w-full" style={{ height }}>
      <div
        ref={containerRef}
        role="img"
        aria-label={ariaLabel}
        style={{ height }}
        className={cn("w-full transition-opacity", dimmed && "opacity-50", className)}
      />
      {isolated ? (
        <button
          type="button"
          onClick={resetIsolation}
          className="absolute left-1.5 top-1 z-10 flex max-w-[70%] items-center gap-1.5 rounded-full border border-primary/40 bg-card/95 px-2.5 py-1 text-[11px] font-bold text-primary shadow-sm backdrop-blur-md transition-all hover:bg-card hover:border-primary active:scale-95"
          title="Show all data again"
        >
          <span className="truncate">Only: {isolated}</span>
          <X className="h-3 w-3 shrink-0" />
        </button>
      ) : null}
      {disableExport ? null : <ExportMenu onExport={handleExport} />}
    </div>
  );
}
