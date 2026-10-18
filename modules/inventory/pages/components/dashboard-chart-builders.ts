import type { ChartOption, ChartTheme } from "@/modules/shared/charts/echarts";
import {
  areaGradient,
  categoricalBars,
  compactNumber,
  donutSeries,
  dotLegend,
  gradient,
  valueLegend,
  withAlpha,
  type CategoricalBucket,
  type DonutSlice,
} from "@/modules/shared/charts/chart-style";
import type { InventoryAnalytics } from "@/modules/inventory/api";

/**
 * Pure option builders for the Inventory dashboard. Each returns a
 * `(theme) => option` so the same chart renders in the live theme on screen
 * and in the print theme when exported.
 */
type Builder = (theme: ChartTheme) => ChartOption;

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const axisTooltip = { trigger: "axis" as const, axisPointer: { type: "shadow" as const }, valueFormatter: (v: unknown) => compactNumber(v) };

// ------------------------------------------------------------------ donuts

export type ThemedSlice = { name: string; value: number; color: (theme: ChartTheme) => string };

export function donutChart(slices: ThemedSlice[], caption: string): Builder {
  return (theme) => {
    const resolved: DonutSlice[] = slices.map((s) => ({ name: s.name, value: s.value, color: s.color(theme) }));
    return {
      tooltip: { trigger: "item", valueFormatter: (v) => compactNumber(v) },
      legend: valueLegend(resolved),
      series: [donutSeries(resolved, caption, theme)],
    };
  };
}

/** Categories beyond the four validated tokens reuse them at reduced strength instead of inventing new hues. */
export const paletteAt = (theme: ChartTheme, index: number) =>
  index < 4 ? theme.categorical[index] : withAlpha(theme.categorical[index % 4], 0.55);

// ------------------------------------------------------------ bar families

export type ThemedBucket = { name: string; value: number; color: (theme: ChartTheme) => string };

export function categoricalBarChart(
  buckets: ThemedBucket[],
  horizontal = false,
  grid: Record<string, number> = {},
  options: { wholeNumbers?: boolean } = {}
): Builder {
  return (theme) => {
    const resolved: CategoricalBucket[] = buckets.map((b) => ({ name: b.name, value: b.value, color: b.color(theme) }));
    const left = grid.left ?? (horizontal ? 110 : 44);
    const categories = { type: "category" as const, data: resolved.map((b) => b.name), axisLabel: { interval: 0, rotate: horizontal ? 0 : 16 } };
    const values = {
      type: "value" as const,
      splitNumber: 4,
      minInterval: options.wholeNumbers ? 1 : undefined,
      axisLabel: { formatter: (v: number) => compactNumber(v) },
    };
    return {
      grid: { left, right: horizontal ? 48 : 16, top: 24, bottom: horizontal ? 36 : 64, ...grid },
      tooltip: { ...axisTooltip, trigger: "item" },
      legend: dotLegend(),
      xAxis: horizontal ? values : categories,
      yAxis: horizontal
        ? { ...categories, inverse: true, axisLabel: { interval: 0, width: left - 14, overflow: "truncate" as const } }
        : values,
      series: categoricalBars(resolved, theme, horizontal),
    };
  };
}

export type CoverageRow = {
  name: string;
  severity: "out_of_stock" | "critical" | "reorder";
  available: number;
  reorder: number;
  uom: string | null;
};

/**
 * Stock as a percentage of each item's own reorder point. Raw quantities can't
 * share an axis (8,000 preforms vs 10 bags of detergent); a percentage can. One
 * series per severity so each legend dot isolates that severity.
 */
export function coverageChart(rows: CoverageRow[], labels: Record<CoverageRow["severity"], string>, reorderLabel: string): Builder {
  return (theme) => {
    const colors: Record<CoverageRow["severity"], string> = {
      out_of_stock: theme.severity.critical,
      critical: theme.severity.warning,
      reorder: theme.severity.caution,
    };
    const pct = (r: CoverageRow) => (r.reorder > 0 ? Math.round((Math.max(r.available, 0) / r.reorder) * 100) : 0);
    const severities = (["out_of_stock", "critical", "reorder"] as const).filter((s) => rows.some((r) => r.severity === s));

    return {
      grid: { left: 150, right: 110, top: 16, bottom: 40 },
      tooltip: {
        trigger: "item",
        formatter: (p: unknown) => {
          const row = rows[(p as { dataIndex: number }).dataIndex];
          return `<b>${row.name}</b><br/>${compactNumber(row.available)} / ${compactNumber(row.reorder)} ${row.uom ?? ""} · ${pct(row)}%`;
        },
      },
      legend: dotLegend(),
      xAxis: {
        type: "value",
        max: (extent: { max: number }) => Math.max(100, Math.ceil(extent.max / 10) * 10),
        axisLabel: { formatter: (v: number) => `${v}%` },
      },
      yAxis: { type: "category", inverse: true, data: rows.map((r) => r.name), axisLabel: { width: 136, overflow: "truncate" } },
      series: severities.map((severity, index) => ({
        name: labels[severity],
        type: "bar" as const,
        stack: "coverage",
        barMaxWidth: 18,
        data: rows.map((r) => (r.severity === severity ? Math.max(pct(r), 1.5) : null)),
        itemStyle: { color: gradient(colors[severity], true), borderRadius: [0, 6, 6, 0] },
        emphasis: { focus: "series" as const },
        label: {
          show: true,
          position: "right" as const,
          fontSize: 10,
          color: theme.foreground,
          formatter: (p: { dataIndex: number; value?: unknown }) => {
            if (p.value == null) return "";
            const row = rows[p.dataIndex];
            return `${pct(row)}%  ${compactNumber(row.available)}/${compactNumber(row.reorder)} ${row.uom ?? ""}`;
          },
        },
        markLine:
          index === 0
            ? {
                silent: true,
                symbol: "none",
                lineStyle: { color: theme.mutedForeground, type: "dashed" as const },
                label: { color: theme.mutedForeground, fontSize: 10, formatter: reorderLabel },
                data: [{ xAxis: 100 }],
              }
            : undefined,
      })),
    };
  };
}

/**
 * How many days current stock lasts at recent usage. Unit-independent, so a
 * roll of film and a box of caps are finally on the same scale; colour marks
 * the risk band.
 */
export function daysOfCoverChart(rows: Array<{ name: string; days: number }>, seriesName: string): Builder {
  return (theme) => {
    const colorFor = (d: number) => (d < 7 ? theme.severity.critical : d < 14 ? theme.severity.caution : theme.severity.good);
    return {
      grid: { left: 150, right: 48, top: 12, bottom: 28 },
      tooltip: { trigger: "item", formatter: (p: unknown) => `<b>${(p as { name: string }).name}</b><br/>${Number((p as { value: number }).value).toFixed(1)} days` },
      xAxis: { type: "value", axisLabel: { formatter: (v: number) => `${v}d` } },
      yAxis: { type: "category", inverse: true, data: rows.map((r) => r.name), axisLabel: { width: 136, overflow: "truncate" } },
      series: [
        {
          name: seriesName,
          type: "bar",
          barMaxWidth: 16,
          data: rows.map((r) => ({ value: Math.round(r.days * 10) / 10, itemStyle: { color: gradient(colorFor(r.days), true), borderRadius: [0, 6, 6, 0] } })),
          label: { show: true, position: "right", fontSize: 10, fontWeight: 700, color: theme.foreground, formatter: (p: { value?: unknown }) => `${Number(p.value).toFixed(1)}d` },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { color: theme.severity.critical, type: "dashed", opacity: 0.6 },
            label: { color: theme.severity.critical, fontSize: 10, formatter: "7d" },
            data: [{ xAxis: 7 }],
          },
        },
      ],
    };
  };
}

// ---------------------------------------------------------------- analytics

export function movementTrendChart(
  trend: InventoryAnalytics["movement_trend"],
  labels: { inbound: string; outbound: string; transfers: string }
): Builder {
  return (theme) => {
    const line = (name: string, key: "inbound" | "outbound" | "transfers", color: string, area: boolean) => ({
      name,
      type: "line" as const,
      smooth: true,
      showSymbol: false,
      symbolSize: 7,
      data: trend.map((d) => d[key]),
      lineStyle: { width: area ? 2.5 : 2, color, type: area ? ("solid" as const) : ("dashed" as const) },
      itemStyle: { color },
      areaStyle: area ? { color: areaGradient(color) } : undefined,
      emphasis: { focus: "series" as const },
    });

    return {
      grid: { left: 48, right: 16, top: 24, bottom: 76 },
      tooltip: { trigger: "axis", valueFormatter: (v) => compactNumber(v) },
      legend: dotLegend(),
      dataZoom: [
        { type: "inside", start: 0, end: 100 },
        {
          type: "slider",
          height: 14,
          bottom: 30,
          borderColor: "transparent",
          fillerColor: withAlpha(theme.categorical[1], 0.18),
          handleStyle: { color: theme.categorical[1] },
          textStyle: { color: theme.mutedForeground, fontSize: 9 },
          showDetail: false,
        },
      ],
      xAxis: { type: "category", boundaryGap: false, data: trend.map((d) => shortDate(d.date)) },
      yAxis: { type: "value", axisLabel: { formatter: (v: number) => compactNumber(v) } },
      series: [
        line(labels.inbound, "inbound", theme.categorical[0], true),
        line(labels.outbound, "outbound", theme.categorical[1], true),
        line(labels.transfers, "transfers", theme.categorical[2], false),
      ],
    };
  };
}

export function valueTrendChart(series: NonNullable<InventoryAnalytics["value_trend"]>, label: string): Builder {
  return (theme) => {
    const color = theme.categorical[3];
    const values = series.map((d) => d.value);
    return {
      grid: { left: 60, right: 16, top: 28, bottom: 32 },
      tooltip: { trigger: "axis", valueFormatter: (v) => Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 }) },
      xAxis: { type: "category", boundaryGap: false, data: series.map((d) => shortDate(d.date)) },
      yAxis: { type: "value", scale: true, axisLabel: { formatter: (v: number) => compactNumber(v) } },
      series: [
        {
          name: label,
          type: "line",
          smooth: true,
          showSymbol: false,
          data: values,
          lineStyle: { width: 3, color },
          itemStyle: { color },
          areaStyle: { color: areaGradient(color) },
          markLine: values.length
            ? {
                silent: true,
                symbol: "none",
                lineStyle: { color: theme.mutedForeground, type: "dashed", width: 1 },
                label: { color: theme.mutedForeground, fontSize: 10, formatter: (p) => `avg ${compactNumber(p.value)}` },
                data: [{ type: "average", name: "avg" }],
              }
            : undefined,
        },
      ],
    };
  };
}

export function warehouseChart(
  rows: InventoryAnalytics["stock_by_warehouse"],
  labels: { sellable: string; held: string; reserved: string }
): Builder {
  return (theme) => {
    const segment = (name: string, key: "sellable" | "held" | "reserved", color: string) => ({
      name,
      type: "bar" as const,
      stack: key === "reserved" ? "reserved" : "stock",
      barMaxWidth: 22,
      data: rows.map((r) => r[key]),
      itemStyle: { color: gradient(color, true), borderRadius: key === "sellable" ? [0, 0, 0, 0] : [0, 6, 6, 0] },
      emphasis: { focus: "series" as const },
      label: {
        show: true,
        position: key === "reserved" ? ("right" as const) : ("insideRight" as const),
        fontSize: 10,
        fontWeight: 700,
        color: key === "reserved" ? theme.foreground : "#fff",
        formatter: (p: { value?: unknown }) => (Number(p.value) > 0 ? compactNumber(p.value) : ""),
      },
    });
    return {
      grid: { left: 130, right: 48, top: 16, bottom: 36 },
      tooltip: axisTooltip,
      legend: dotLegend(),
      xAxis: { type: "value", axisLabel: { formatter: (v: number) => compactNumber(v) } },
      yAxis: { type: "category", inverse: true, data: rows.map((r) => r.name), axisLabel: { width: 120, overflow: "truncate" } },
      series: [
        segment(labels.sellable, "sellable", theme.categorical[0]),
        segment(labels.held, "held", theme.severity.warning),
        segment(labels.reserved, "reserved", theme.categorical[1]),
      ],
    };
  };
}

export function pairedBarChart(
  rows: Array<{ name: string; a: number; b: number; c?: number }>,
  labels: { a: string; b: string; c?: string },
  colors: (theme: ChartTheme) => { a: string; b: string; c?: string }
): Builder {
  return (theme) => {
    const palette = colors(theme);
    const bar = (name: string, key: "a" | "b" | "c", color: string) => ({
      name,
      type: "bar" as const,
      barMaxWidth: 14,
      barGap: "30%",
      data: rows.map((r) => r[key] ?? 0),
      itemStyle: { color: gradient(color, true), borderRadius: [0, 5, 5, 0] },
      emphasis: { focus: "series" as const },
      label: {
        show: true,
        position: "right" as const,
        fontSize: 9,
        color: theme.foreground,
        formatter: (p: { value?: unknown }) => compactNumber(p.value),
      },
    });
    const series = [bar(labels.a, "a", palette.a), bar(labels.b, "b", palette.b)];
    if (labels.c && palette.c) series.push(bar(labels.c, "c", palette.c));

    return {
      grid: { left: 130, right: 52, top: 12, bottom: 36 },
      tooltip: axisTooltip,
      legend: dotLegend(),
      xAxis: { type: "value", axisLabel: { formatter: (v: number) => compactNumber(v) } },
      yAxis: { type: "category", inverse: true, data: rows.map((r) => r.name), axisLabel: { width: 120, overflow: "truncate" } },
      series,
    };
  };
}

export function singleBarChart(rows: Array<{ name: string; value: number }>, seriesName: string, colorOf: (theme: ChartTheme) => string): Builder {
  return (theme) => {
    const color = colorOf(theme);
    return {
      grid: { left: 40, right: 12, top: 28, bottom: 56 },
      tooltip: axisTooltip,
      xAxis: { type: "category", data: rows.map((r) => r.name), axisLabel: { interval: 0, rotate: 16 } },
      yAxis: { type: "value", minInterval: 1 },
      series: [
        {
          name: seriesName,
          type: "bar",
          barMaxWidth: 40,
          data: rows.map((r) => r.value),
          itemStyle: { color: gradient(color), borderRadius: [6, 6, 0, 0] },
          label: { show: true, position: "top", fontSize: 10, fontWeight: 700, color: theme.foreground },
        },
      ],
    };
  };
}

export function treemapChart(rows: Array<{ name: string; value: number; method: string }>): Builder {
  return (theme) => ({
    tooltip: {
      trigger: "item",
      formatter: (p: unknown) => {
        const item = p as { name: string; value: number; data?: { method?: string } };
        return `<b>${item.name}</b><br/>${Number(item.value).toLocaleString()} · ${(item.data?.method ?? "").toUpperCase()}`;
      },
    },
    series: [
      {
        type: "treemap",
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: {
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          formatter: (p: unknown) => {
            const item = p as { name: string; value: number };
            return `${item.name}\n${compactNumber(item.value)}`;
          },
        },
        upperLabel: { show: false },
        itemStyle: { borderColor: theme.card, borderWidth: 3, gapWidth: 3, borderRadius: 6 },
        data: rows.map((d) => ({
          name: d.name,
          value: d.value,
          method: d.method,
          itemStyle: { color: gradient(d.method === "standard" ? theme.categorical[1] : theme.categorical[0], false, 0.75) },
        })),
      },
    ],
  });
}

export function reconciliationChart(
  rows: Array<{ label: string; subledger: number; gl: number; reconciled: boolean }>,
  labels: { subledger: string; gl: string }
): Builder {
  return (theme) => {
    const label = { show: true, position: "top" as const, fontSize: 9, color: theme.foreground, formatter: (p: { value?: unknown }) => compactNumber(p.value) };
    return {
      grid: { left: 56, right: 12, top: 28, bottom: 44 },
      tooltip: { ...axisTooltip, valueFormatter: (v) => Number(v ?? 0).toLocaleString() },
      legend: dotLegend(),
      xAxis: { type: "category", data: rows.map((r) => r.label) },
      yAxis: { type: "value", axisLabel: { formatter: (v: number) => compactNumber(v) } },
      series: [
        {
          name: labels.subledger,
          type: "bar",
          barMaxWidth: 34,
          itemStyle: { color: gradient(theme.categorical[0]), borderRadius: [6, 6, 0, 0] },
          data: rows.map((r) => r.subledger),
          label,
        },
        {
          name: labels.gl,
          type: "bar",
          barMaxWidth: 34,
          itemStyle: { color: gradient(theme.categorical[1]), borderRadius: [6, 6, 0, 0] },
          data: rows.map((r) =>
            r.reconciled ? r.gl : { value: r.gl, itemStyle: { color: gradient(theme.severity.critical), borderRadius: [6, 6, 0, 0] } }
          ),
          label,
        },
      ],
    };
  };
}
